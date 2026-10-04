import { NextResponse } from "next/server";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import webpush from "web-push";
import {
  evaluateAllReminders,
  getZonedTimeDetails,
  type ReminderDecision,
  type ReminderEvaluationContext,
  type ClubBookingItem,
  type FoodLogItem,
  type SessionCompletionItem,
} from "@/lib/notifications/reminder-engine";
import {
  createNotificationLogServer,
  removePushSubscription,
  type NotificationLog,
  type NotificationPreferences,
  type UserPushSubscription,
} from "@/lib/supabase/notifications";

export const dynamic = "force-dynamic";

/**
 * Interface pour le résultat d'évaluation d'un rappel en mode simulation (Dry-Run)
 */
export interface SanitizedReminderPreview {
  userId: string;
  category: string;
  title: string;
  body: string;
  actionUrl: string;
  reason: string;
}

/**
 * GET /api/cron/send-reminders
 *
 * Scheduler périodique d'évaluation et de dispatch des rappels Striking Camp.
 * Sécurité : Requiert le header `Authorization: Bearer <CRON_SECRET>`.
 * Mode par défaut : DRY-RUN (activé via REMINDER_DISPATCH_DRY_RUN !== "false").
 */
export async function GET(request: Request) {
  const startTime = Date.now();
  try {
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 1. SÉCURITÉ FAIL-CLOSED : VÉRIFICATION DE L'AUTORISATION CRON
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Non autorisé — secret Cron invalide ou manquant" },
        { status: 401 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Configuration Supabase serveur manquante" },
        { status: 500 }
      );
    }

    // Client Supabase privilégié (Service Role) strictement réservé au serveur
    const adminSupabase = createSupabaseClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 2. CONTRÔLE DU MODE DRY-RUN
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const url = new URL(request.url);
    const queryDryRun = url.searchParams.get("dryRun");
    const envDryRun = process.env.REMINDER_DISPATCH_DRY_RUN;

    // Prudence absolue : Dry-run activé par défaut sauf configuration explicite "false"
    const isDryRun =
      queryDryRun !== null
        ? queryDryRun !== "false"
        : envDryRun !== "false";

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 3. CONFIGURATION VAPID (UNIQUEMENT SI ENVOI RÉEL)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    let vapidConfigured = false;
    if (!isDryRun) {
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
      const vapidSubject = process.env.VAPID_SUBJECT || "mailto:contact@strikingcamp.fr";

      if (vapidPublicKey && vapidPrivateKey) {
        try {
          webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
          vapidConfigured = true;
        } catch (vapidErr) {
          console.error("[send-reminders] Erreur configuration VAPID :", vapidErr);
        }
      } else {
        console.warn("[send-reminders] Clés VAPID manquantes pour l'envoi réel.");
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 4. RÉCUPÉRATION GROUPÉE (BATCH) DES UTILISATEURS ACTIFS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const now = new Date();

    // A. Préférences des utilisateurs ayant les notifications globales activées
    const { data: activePreferencesData, error: prefError } = await adminSupabase
      .from("user_notification_preferences")
      .select("*")
      .eq("enabled_global", true);

    if (prefError) {
      console.error("[send-reminders] Erreur chargement préférences :", prefError.message);
      return NextResponse.json(
        { success: false, error: prefError.message },
        { status: 500 }
      );
    }

    const activePreferences = (activePreferencesData as NotificationPreferences[]) || [];
    if (activePreferences.length === 0) {
      return NextResponse.json({
        success: true,
        dryRun: isDryRun,
        executedAt: now.toISOString(),
        stats: {
          evaluatedUsers: 0,
          eligibleReminders: 0,
          sentPushCount: 0,
          failedPushCount: 0,
          staleSubscriptionsCleaned: 0,
          skippedAlreadyCompleted: 0,
          skippedOutsideWindow: 0,
          skippedDisabled: 0,
          skippedDuplicate: 0,
        },
        wouldSend: [],
      });
    }

    const userIds = activePreferences.map((p) => p.user_id);

    // Calcul de la date locale de référence (fuseau Europe/Paris par défaut)
    const zonedNow = getZonedTimeDetails(now, "Europe/Paris");
    const todayDateStr = zonedNow.dateStr;
    const tomorrowDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowDateStr = getZonedTimeDetails(tomorrowDate, "Europe/Paris").dateStr;

    // B. Requêtes groupées en parallèle pour tous les utilisateurs actifs
    const [
      foodLogsRes,
      sessionCompletionsRes,
      fitnessProfilesRes,
      bookingsRes,
      todayLogsRes,
      pushSubscriptionsRes,
    ] = await Promise.all([
      // Repas logués aujourd'hui
      adminSupabase
        .from("user_daily_food_logs")
        .select("user_id, meal_type, log_date")
        .in("user_id", userIds)
        .eq("log_date", todayDateStr),

      // Séances digitales terminées aujourd'hui
      adminSupabase
        .from("user_session_completions")
        .select("user_id, completed_at, program_session_id")
        .in("user_id", userIds)
        .gte("completed_at", `${todayDateStr}T00:00:00Z`),

      // Profils de fitness (fréquence cible d'entraînement)
      adminSupabase
        .from("user_fitness_profiles")
        .select("user_id, target_workouts_per_week, primary_goal")
        .in("user_id", userIds),

      // Réservations de cours physiques au club pour aujourd'hui et demain
      adminSupabase
        .from("bookings")
        .select("id, user_id, class_session_id, status, class_sessions:class_sessions!inner(id, starts_at, ends_at, discipline)")
        .in("user_id", userIds)
        .eq("status", "confirmed")
        .gte("class_sessions.starts_at", `${todayDateStr}T00:00:00Z`)
        .lte("class_sessions.starts_at", `${tomorrowDateStr}T23:59:59Z`),

      // Logs de notifications déjà envoyées aujourd'hui (anti-doublon)
      adminSupabase
        .from("notification_logs")
        .select("id, user_id, category, channel, title, body, action_url, scheduled_date, sent_at")
        .in("user_id", userIds)
        .eq("scheduled_date", todayDateStr),

      // Abonnements Web Push enregistrés
      adminSupabase
        .from("user_push_subscriptions")
        .select("id, user_id, endpoint, p256dh_key, auth_key, user_agent, created_at, last_used_at")
        .in("user_id", userIds),
    ]);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 5. INDEXATION EN MÉMOIRE DES DONNÉES PAR UTILISATEUR
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const foodLogsByUser = new Map<string, FoodLogItem[]>();
    for (const row of foodLogsRes.data || []) {
      const list = foodLogsByUser.get(row.user_id) || [];
      list.push({ meal_type: row.meal_type, log_date: row.log_date });
      foodLogsByUser.set(row.user_id, list);
    }

    const completionsByUser = new Map<string, SessionCompletionItem[]>();
    for (const row of sessionCompletionsRes.data || []) {
      const list = completionsByUser.get(row.user_id) || [];
      list.push({ completed_at: row.completed_at, program_session_id: row.program_session_id });
      completionsByUser.set(row.user_id, list);
    }

    const fitnessProfilesByUser = new Map<string, any>();
    for (const row of fitnessProfilesRes.data || []) {
      fitnessProfilesByUser.set(row.user_id, row);
    }

    const clubBookingsByUser = new Map<string, ClubBookingItem[]>();
    for (const row of bookingsRes.data || []) {
      const list = clubBookingsByUser.get(row.user_id) || [];
      const session = Array.isArray(row.class_sessions) ? row.class_sessions[0] : row.class_sessions;
      if (session) {
        list.push({
          id: row.id,
          class_session_id: row.class_session_id,
          starts_at: session.starts_at,
          ends_at: session.ends_at,
          discipline: session.discipline,
          status: row.status,
        });
      }
      clubBookingsByUser.set(row.user_id, list);
    }

    const logsByUser = new Map<string, NotificationLog[]>();
    for (const row of todayLogsRes.data || []) {
      const list = logsByUser.get(row.user_id) || [];
      list.push(row as NotificationLog);
      logsByUser.set(row.user_id, list);
    }

    const pushSubsByUser = new Map<string, UserPushSubscription[]>();
    for (const row of pushSubscriptionsRes.data || []) {
      const list = pushSubsByUser.get(row.user_id) || [];
      list.push(row as UserPushSubscription);
      pushSubsByUser.set(row.user_id, list);
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 6. ÉVALUATION ET DISPATCH DES RAPPELS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const stats = {
      evaluatedUsers: activePreferences.length,
      eligibleReminders: 0,
      sentPushCount: 0,
      failedPushCount: 0,
      staleSubscriptionsCleaned: 0,
      skippedAlreadyCompleted: 0,
      skippedOutsideWindow: 0,
      skippedDisabled: 0,
      skippedDuplicate: 0,
    };

    const wouldSend: SanitizedReminderPreview[] = [];

    for (const userPref of activePreferences) {
      const uid = userPref.user_id;

      const userContext: ReminderEvaluationContext = {
        userId: uid,
        currentTime: now,
        preferences: userPref,
        dailyFoodLogsToday: foodLogsByUser.get(uid) || [],
        fitnessProfile: fitnessProfilesByUser.get(uid) || null,
        sessionCompletionsToday: completionsByUser.get(uid) || [],
        todayClubBookings: clubBookingsByUser.get(uid) || [],
        recentLogsToday: logsByUser.get(uid) || [],
      };

      let decisions: ReminderDecision[] = [];
      try {
        decisions = evaluateAllReminders(userContext);
      } catch (evalErr) {
        console.error(`[send-reminders] Erreur évaluation utilisateur ${uid} :`, evalErr);
        continue;
      }

      for (const decision of decisions) {
        if (!decision.shouldSend) {
          // Classification fine des motifs d'exclusion pour la télémétrie
          const reasonLower = decision.reason.toLowerCase();
          if (reasonLower.includes("déjà") || reasonLower.includes("complétée") || reasonLower.includes("enregistré")) {
            if (reasonLower.includes("envoyé")) {
              stats.skippedDuplicate++;
            } else {
              stats.skippedAlreadyCompleted++;
            }
          } else if (reasonLower.includes("fenêtre") || reasonLower.includes("pas encore") || reasonLower.includes("passé") || reasonLower.includes("tôt")) {
            stats.skippedOutsideWindow++;
          } else if (reasonLower.includes("désactivé")) {
            stats.skippedDisabled++;
          }
          continue;
        }

        // Rappel éligible
        stats.eligibleReminders++;

        // Mode DRY-RUN : enregistrement dans la liste de simulation sans aucun envoi
        if (isDryRun) {
          wouldSend.push({
            userId: uid,
            category: decision.category,
            title: decision.title,
            body: decision.body,
            actionUrl: decision.actionUrl,
            reason: decision.reason,
          });
          continue;
        }

        // Mode RÉEL : envoi Web Push et insertion dans notification_logs
        if (!vapidConfigured) {
          console.warn(`[send-reminders] VAPID non configuré, envoi ignoré pour ${uid}`);
          continue;
        }

        const userSubscriptions = pushSubsByUser.get(uid) || [];
        let pushSentSuccessfully = false;

        const payload = JSON.stringify({
          title: decision.title,
          body: decision.body,
          icon: "/logo-sc.png",
          badge: "/logo-sc.png",
          action_url: decision.actionUrl,
        });

        for (const sub of userSubscriptions) {
          try {
            await webpush.sendNotification(
              {
                endpoint: sub.endpoint,
                keys: {
                  p256dh: sub.p256dh_key,
                  auth: sub.auth_key,
                },
              },
              payload
            );
            stats.sentPushCount++;
            pushSentSuccessfully = true;
          } catch (pushErr: any) {
            stats.failedPushCount++;
            const statusCode = pushErr?.statusCode;

            // Détection des abonnements expirés (404 Not Found ou 410 Gone)
            if (statusCode === 404 || statusCode === 410) {
              console.log(`[send-reminders] Nettoyage souscription expirée : ${sub.id}`);
              await removePushSubscription(adminSupabase, uid, sub.endpoint);
              stats.staleSubscriptionsCleaned++;
            } else {
              console.error(`[send-reminders] Échec envoi push (status: ${statusCode || "erreur"}) pour l'utilisateur ${uid}`);
            }
          }
        }

        // Création du log de notification uniquement si l'envoi a réussi
        if (pushSentSuccessfully) {
          try {
            const createdLog = await createNotificationLogServer(adminSupabase, {
              user_id: uid,
              category: decision.category,
              channel: "web_push",
              title: decision.title,
              body: decision.body,
              action_url: decision.actionUrl,
              scheduled_date: todayDateStr,
            });

            // Mise à jour immédiate de l'historique en mémoire pour la session actuelle
            const currentLogs = logsByUser.get(uid) || [];
            currentLogs.push(createdLog);
            logsByUser.set(uid, currentLogs);
          } catch (logErr) {
            console.error(`[send-reminders] Erreur création notification_logs pour ${uid} :`, logErr);
          }
        }
      }
    }

    const durationMs = Date.now() - startTime;
    console.log(
      `[send-reminders] Terminé en ${durationMs}ms — dryRun: ${isDryRun}, évalués: ${stats.evaluatedUsers}, éligibles: ${stats.eligibleReminders}, push envoyés: ${stats.sentPushCount}, échecs: ${stats.failedPushCount}, souscriptions nettoyées: ${stats.staleSubscriptionsCleaned}`
    );

    return NextResponse.json({
      success: true,
      dryRun: isDryRun,
      durationMs,
      executedAt: now.toISOString(),
      stats,
      wouldSend,
    });
  } catch (err: any) {
    console.error("[GET /api/cron/send-reminders] Exception serveur :", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Erreur interne" },
      { status: 500 }
    );
  }
}
