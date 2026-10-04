/**
 * DATA ACCESS LAYER — SYSTÈME DE NOTIFICATIONS ET RAPPELS STRIKING CAMP (V1)
 *
 * Principes & Sécurité :
 * 1. Isolation stricte : toutes les requêtes sont filtrées par `userId` / `auth.uid()`.
 * 2. Immutabilité des logs côté client : l'utilisateur ne peut modifier que `is_read` et `action_completed`.
 * 3. Typage strict des préférences, abonnements push et historiques de notifications.
 * 4. Jamais de clé service_role exposée au client (les fonctions réservées au serveur l'indiquent explicitement).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. TYPES & INTERFACES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type NotificationCategory =
  | "meal_breakfast"
  | "meal_lunch"
  | "meal_dinner"
  | "meal_snack"
  | "workout_digital"
  | "workout_club"
  | "general";

export type NotificationChannel =
  | "in_app"
  | "web_push"
  | "mobile_push"
  | "email";

export interface NotificationPreferences {
  id: string;
  user_id: string;
  enabled_global: boolean;
  enabled_meals: boolean;
  enabled_workouts: boolean;
  enabled_hydration: boolean;
  reminder_breakfast_time: string;
  reminder_lunch_time: string;
  reminder_dinner_time: string;
  reminder_snack_time: string;
  reminder_workout_time: string;
  timezone: string;
  created_at?: string;
  updated_at?: string;
}

export type NotificationPreferencesUpdate = Partial<
  Omit<NotificationPreferences, "id" | "user_id" | "created_at" | "updated_at">
>;

export const DEFAULT_NOTIFICATION_PREFERENCES: Omit<
  NotificationPreferences,
  "id" | "user_id" | "created_at" | "updated_at"
> = {
  enabled_global: true,
  enabled_meals: true,
  enabled_workouts: true,
  enabled_hydration: false,
  reminder_breakfast_time: "08:00:00",
  reminder_lunch_time: "12:30:00",
  reminder_dinner_time: "19:30:00",
  reminder_snack_time: "16:30:00",
  reminder_workout_time: "18:00:00",
  timezone: "Europe/Paris",
};

export interface PushSubscriptionInput {
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
  user_agent?: string | null;
}

export interface UserPushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
  user_agent?: string | null;
  created_at: string;
  last_used_at: string;
}

export interface NotificationLog {
  id: string;
  user_id: string;
  category: NotificationCategory;
  channel: NotificationChannel;
  title: string;
  body: string;
  action_url?: string | null;
  is_read: boolean;
  action_completed: boolean;
  scheduled_date: string;
  sent_at: string;
}

export interface CreateNotificationLogInput {
  user_id: string;
  category: NotificationCategory;
  channel: NotificationChannel;
  title: string;
  body: string;
  action_url?: string | null;
  scheduled_date?: string;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. PRÉFÉRENCES DE NOTIFICATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Récupère les préférences de rappel d'un utilisateur
 */
export async function getNotificationPreferences(
  supabase: SupabaseClient,
  userId: string
): Promise<NotificationPreferences | null> {
  try {
    const { data, error } = await supabase
      .from("user_notification_preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("[getNotificationPreferences] Erreur :", error.message);
      return null;
    }

    return (data as NotificationPreferences) || null;
  } catch (err) {
    console.error("[getNotificationPreferences] Exception :", err);
    return null;
  }
}

/**
 * Récupère les préférences de l'utilisateur ou initialise les valeurs par défaut
 */
export async function getOrCreateNotificationPreferences(
  supabase: SupabaseClient,
  userId: string
): Promise<NotificationPreferences> {
  const existing = await getNotificationPreferences(supabase, userId);
  if (existing) {
    return existing;
  }

  try {
    const payload = {
      user_id: userId,
      ...DEFAULT_NOTIFICATION_PREFERENCES,
    };

    const { data, error } = await supabase
      .from("user_notification_preferences")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      // En cas de course concurrente où la ligne vient d'être créée
      const retry = await getNotificationPreferences(supabase, userId);
      if (retry) return retry;
      throw new Error(`Impossible d'initialiser les préférences : ${error.message}`);
    }

    return data as NotificationPreferences;
  } catch (err: any) {
    console.error("[getOrCreateNotificationPreferences] Exception :", err);
    throw err;
  }
}

/**
 * Met à jour les préférences de notification d'un utilisateur (strictement typé, user_id immuable)
 */
export async function updateNotificationPreferences(
  supabase: SupabaseClient,
  userId: string,
  updates: NotificationPreferencesUpdate
): Promise<NotificationPreferences> {
  try {
    // S'assurer que la ligne existe d'abord
    await getOrCreateNotificationPreferences(supabase, userId);

    // Filtrer les champs pour interdire toute altération des identifiants
    const sanitizedUpdates: NotificationPreferencesUpdate = {};
    if (typeof updates.enabled_global === "boolean") sanitizedUpdates.enabled_global = updates.enabled_global;
    if (typeof updates.enabled_meals === "boolean") sanitizedUpdates.enabled_meals = updates.enabled_meals;
    if (typeof updates.enabled_workouts === "boolean") sanitizedUpdates.enabled_workouts = updates.enabled_workouts;
    if (typeof updates.enabled_hydration === "boolean") sanitizedUpdates.enabled_hydration = updates.enabled_hydration;
    if (updates.reminder_breakfast_time) sanitizedUpdates.reminder_breakfast_time = updates.reminder_breakfast_time;
    if (updates.reminder_lunch_time) sanitizedUpdates.reminder_lunch_time = updates.reminder_lunch_time;
    if (updates.reminder_dinner_time) sanitizedUpdates.reminder_dinner_time = updates.reminder_dinner_time;
    if (updates.reminder_snack_time) sanitizedUpdates.reminder_snack_time = updates.reminder_snack_time;
    if (updates.reminder_workout_time) sanitizedUpdates.reminder_workout_time = updates.reminder_workout_time;
    if (updates.timezone) sanitizedUpdates.timezone = updates.timezone;

    const { data, error } = await supabase
      .from("user_notification_preferences")
      .update(sanitizedUpdates)
      .eq("user_id", userId)
      .select("*")
      .single();

    if (error) {
      console.error("[updateNotificationPreferences] Erreur :", error.message);
      throw new Error(`Erreur mise à jour préférences : ${error.message}`);
    }

    return data as NotificationPreferences;
  } catch (err: any) {
    console.error("[updateNotificationPreferences] Exception :", err);
    throw err;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. SOUSCRIPTIONS PUSH (WEB PUSH / TERMINAUX)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Récupère l'ensemble des abonnements Web Push actifs d'un utilisateur
 */
export async function getPushSubscriptions(
  supabase: SupabaseClient,
  userId: string
): Promise<UserPushSubscription[]> {
  try {
    const { data, error } = await supabase
      .from("user_push_subscriptions")
      .select("*")
      .eq("user_id", userId)
      .order("last_used_at", { ascending: false });

    if (error) {
      console.error("[getPushSubscriptions] Erreur :", error.message);
      return [];
    }

    return (data as UserPushSubscription[]) || [];
  } catch (err) {
    console.error("[getPushSubscriptions] Exception :", err);
    return [];
  }
}

/**
 * Ajoute ou met à jour une souscription Web Push pour un appareil de l'utilisateur
 */
export async function addPushSubscription(
  supabase: SupabaseClient,
  userId: string,
  subscription: PushSubscriptionInput
): Promise<UserPushSubscription> {
  try {
    const payload = {
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh_key: subscription.p256dh_key,
      auth_key: subscription.auth_key,
      user_agent: subscription.user_agent || null,
      last_used_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("user_push_subscriptions")
      .upsert(payload, { onConflict: "endpoint" })
      .select("*")
      .single();

    if (error) {
      console.error("[addPushSubscription] Erreur :", error.message);
      throw new Error(`Erreur enregistrement souscription push : ${error.message}`);
    }

    return data as UserPushSubscription;
  } catch (err: any) {
    console.error("[addPushSubscription] Exception :", err);
    throw err;
  }
}

/**
 * Supprime une souscription Web Push par son endpoint (ex: lors de la désactivation ou déconnexion)
 */
export async function removePushSubscription(
  supabase: SupabaseClient,
  userId: string,
  endpoint: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("user_push_subscriptions")
      .delete()
      .eq("user_id", userId)
      .eq("endpoint", endpoint);

    if (error) {
      console.error("[removePushSubscription] Erreur :", error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[removePushSubscription] Exception :", err);
    return false;
  }
}

/**
 * Met à jour la date de dernière utilisation (last_used_at) d'un endpoint push
 */
export async function touchPushSubscription(
  supabase: SupabaseClient,
  userId: string,
  endpoint: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("user_push_subscriptions")
      .update({ last_used_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("endpoint", endpoint);

    if (error) {
      console.error("[touchPushSubscription] Erreur :", error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[touchPushSubscription] Exception :", err);
    return false;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. HISTORIQUE & LOGS DE NOTIFICATIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Récupère la liste des notifications d'un utilisateur (triées par date d'envoi décroissante)
 */
export async function getNotifications(
  supabase: SupabaseClient,
  userId: string,
  limit: number = 50
): Promise<NotificationLog[]> {
  try {
    const { data, error } = await supabase
      .from("notification_logs")
      .select("*")
      .eq("user_id", userId)
      .order("sent_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[getNotifications] Erreur :", error.message);
      return [];
    }

    return (data as NotificationLog[]) || [];
  } catch (err) {
    console.error("[getNotifications] Exception :", err);
    return [];
  }
}

/**
 * Récupère les notifications non lues d'un utilisateur
 */
export async function getUnreadNotifications(
  supabase: SupabaseClient,
  userId: string
): Promise<NotificationLog[]> {
  try {
    const { data, error } = await supabase
      .from("notification_logs")
      .select("*")
      .eq("user_id", userId)
      .eq("is_read", false)
      .order("sent_at", { ascending: false });

    if (error) {
      console.error("[getUnreadNotifications] Erreur :", error.message);
      return [];
    }

    return (data as NotificationLog[]) || [];
  } catch (err) {
    console.error("[getUnreadNotifications] Exception :", err);
    return [];
  }
}

/**
 * Marque une notification comme lue par son identifiant (l'utilisateur ne modifie QUE is_read)
 */
export async function markNotificationAsRead(
  supabase: SupabaseClient,
  userId: string,
  notificationId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("notification_logs")
      .update({ is_read: true })
      .eq("id", notificationId)
      .eq("user_id", userId);

    if (error) {
      console.error("[markNotificationAsRead] Erreur :", error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[markNotificationAsRead] Exception :", err);
    return false;
  }
}

/**
 * Marque l'action d'une notification comme effectuée (l'utilisateur ne modifie QUE action_completed)
 */
export async function markNotificationActionCompleted(
  supabase: SupabaseClient,
  userId: string,
  notificationId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("notification_logs")
      .update({ action_completed: true })
      .eq("id", notificationId)
      .eq("user_id", userId);

    if (error) {
      console.error("[markNotificationActionCompleted] Erreur :", error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[markNotificationActionCompleted] Exception :", err);
    return false;
  }
}

/**
 * Marque l'ensemble des notifications non lues d'un utilisateur comme lues
 */
export async function markAllNotificationsAsRead(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("notification_logs")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (error) {
      console.error("[markAllNotificationsAsRead] Erreur :", error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[markAllNotificationsAsRead] Exception :", err);
    return false;
  }
}

/**
 * Récupère le nombre total de notifications non lues pour un utilisateur
 */
export async function getUnreadNotificationsCount(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  try {
    const { count, error } = await supabase
      .from("notification_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (error) {
      console.error("[getUnreadNotificationsCount] Erreur :", error.message);
      return 0;
    }

    return count || 0;
  } catch (err) {
    console.error("[getUnreadNotificationsCount] Exception :", err);
    return 0;
  }
}

/**
 * Crée un log de notification côté SERVEUR (réservé aux tâches planifiées / Cron / Service Role)
 * ⚠️ STRICTEMENT SERVEUR : nécessite une instance Supabase admin (service_role).
 */
export async function createNotificationLogServer(
  adminSupabase: SupabaseClient,
  logInput: CreateNotificationLogInput
): Promise<NotificationLog> {
  try {
    const payload = {
      user_id: logInput.user_id,
      category: logInput.category,
      channel: logInput.channel,
      title: logInput.title,
      body: logInput.body,
      action_url: logInput.action_url || null,
      scheduled_date: logInput.scheduled_date || new Date().toISOString().split("T")[0],
      is_read: false,
      action_completed: false,
      sent_at: new Date().toISOString(),
    };

    const { data, error } = await adminSupabase
      .from("notification_logs")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      // Protection anti-doublon SQL (Code 23505 : Unique Violation)
      if (error.code === "23505") {
        console.warn(
          `[createNotificationLogServer] Doublon intercepté par la contrainte SQL unique pour ${logInput.user_id} (${logInput.category})`
        );
        let query = adminSupabase
          .from("notification_logs")
          .select("*")
          .eq("user_id", logInput.user_id)
          .eq("scheduled_date", payload.scheduled_date)
          .eq("category", logInput.category);

        if (logInput.category === "workout_club" && payload.action_url) {
          query = query.eq("action_url", payload.action_url);
        }

        const { data: existing } = await query
          .order("sent_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existing) {
          return existing as NotificationLog;
        }
      }

      console.error("[createNotificationLogServer] Erreur :", error.message);
      throw new Error(`Échec création log notification : ${error.message}`);
    }

    return data as NotificationLog;
  } catch (err: any) {
    console.error("[createNotificationLogServer] Exception :", err);
    throw err;
  }
}
