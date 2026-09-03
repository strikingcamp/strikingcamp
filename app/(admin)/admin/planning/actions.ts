"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=Lundi, 5=Samedi
export type SessionType = "small_group" | "collective" | "private";

export interface RecurringTemplateItem {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  type: SessionType;
  discipline: string;
  level: string;
  max_capacity: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AdminDatedSessionItem {
  id: string;
  template_id?: string | null;
  type: SessionType;
  discipline: string;
  level: string;
  starts_at: string;
  ends_at: string;
  max_capacity: number;
  is_active: boolean;
  bookedCount: number;
}

export interface AdminPlanningDataResult {
  success: boolean;
  templates: RecurringTemplateItem[];
  sessions: AdminDatedSessionItem[];
  error?: string;
}

export interface MutationResult {
  success: boolean;
  data?: any;
  error?: string;
  hasBookings?: boolean;
  bookingsCount?: number;
  message?: string;
}

/**
 * Vérifie l'authentification et le rôle ADMIN côté serveur via les cookies de session.
 */
async function verifyAdminAuth() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Session invalide ou expirée. Veuillez vous reconnecter.");
  }

  const role = (user.app_metadata?.role || user.user_metadata?.role || "").toUpperCase();
  if (role !== "ADMIN") {
    throw new Error("Accès refusé. Privilèges administrateur requis.");
  }

  return user;
}

/**
 * Récupère les données complètes de planning pour l'administration :
 * - Les modèles récurrents (semaine type)
 * - Les séances physiques datées avec décompte des réservations
 */
export async function getAdminPlanningDataServerAction(): Promise<AdminPlanningDataResult> {
  try {
    await verifyAdminAuth();
    const adminSupabase = createAdminClient();

    // 1. Récupération des templates récurrents
    let templates: RecurringTemplateItem[] = [];
    const { data: tmplData, error: tmplError } = await adminSupabase
      .from("recurring_schedule_templates")
      .select("*")
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true });

    if (tmplError) {
      console.warn("[getAdminPlanningDataServerAction] Note sur templates récurrents :", tmplError.message);
    } else if (tmplData) {
      templates = tmplData as RecurringTemplateItem[];
    }

    // 2. Récupération des séances datées (horizon 4 semaines autour d'aujourd'hui pour l'admin)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7); // 1 semaine en arrière
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 28); // 4 semaines en avant

    const { data: sessionsData, error: sessionsError } = await adminSupabase
      .from("class_sessions")
      .select("id, template_id, type, discipline, level, starts_at, ends_at, max_capacity, is_active")
      .gte("starts_at", startDate.toISOString())
      .lte("starts_at", endDate.toISOString())
      .order("starts_at", { ascending: true });

    if (sessionsError) {
      console.error("[getAdminPlanningDataServerAction] Erreur sessions :", sessionsError.message);
    }

    const rawSessions = sessionsData || [];
    const sessionIds = rawSessions.map((s) => s.id);

    // 3. Récupération des réservations confirmées associées
    const countsMap = new Map<string, number>();
    if (sessionIds.length > 0) {
      const { data: bookingsData } = await adminSupabase
        .from("bookings")
        .select("id, class_session_id")
        .in("class_session_id", sessionIds)
        .eq("status", "confirmed");

      if (bookingsData) {
        for (const b of bookingsData) {
          if (b.class_session_id) {
            countsMap.set(b.class_session_id, (countsMap.get(b.class_session_id) || 0) + 1);
          }
        }
      }
    }

    const sessions: AdminDatedSessionItem[] = rawSessions.map((s) => ({
      id: s.id,
      template_id: s.template_id,
      type: (s.type || "small_group") as SessionType,
      discipline: s.discipline,
      level: s.level || "Tous niveaux",
      starts_at: s.starts_at,
      ends_at: s.ends_at || s.starts_at,
      max_capacity: s.max_capacity || 20,
      is_active: s.is_active ?? true,
      bookedCount: countsMap.get(s.id) || 0,
    }));

    return {
      success: true,
      templates,
      sessions,
    };
  } catch (err: any) {
    console.error("[getAdminPlanningDataServerAction] Exception :", err);
    return {
      success: false,
      templates: [],
      sessions: [],
      error: err?.message || "Erreur lors du chargement du planning administrateur.",
    };
  }
}

/**
 * Crée un nouveau modèle récurrent dans recurring_schedule_templates
 * et instancie automatiquement les séances physiques correspondantes sur les 12 semaines futures.
 */
export async function createRecurringTemplateServerAction(payload: {
  day_of_week: number;
  start_time: string;
  end_time: string;
  type: SessionType;
  discipline: string;
  level: string;
  max_capacity: number;
}): Promise<MutationResult> {
  try {
    await verifyAdminAuth();
    const adminSupabase = createAdminClient();

    // 1. Insertion dans recurring_schedule_templates
    const { data: newTmpl, error: insertError } = await adminSupabase
      .from("recurring_schedule_templates")
      .insert({
        day_of_week: payload.day_of_week,
        start_time: payload.start_time,
        end_time: payload.end_time,
        type: payload.type,
        discipline: payload.discipline,
        level: payload.level,
        max_capacity: payload.max_capacity,
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (insertError || !newTmpl) {
      console.error("[createRecurringTemplateServerAction] Erreur insert template :", insertError);
      return {
        success: false,
        error: insertError?.message || "Impossible de créer ce créneau récurrent.",
      };
    }

    // 2. Déclenchement de la génération immédiate sur l'horizon pour instancier les séances
    try {
      await adminSupabase.rpc("generate_recurring_schedule", {
        p_start_date: getCurrentWeekMondayIso(),
        p_weeks_count: 12,
      });
    } catch (genErr) {
      console.warn("[createRecurringTemplateServerAction] Note génération immédiate :", genErr);
    }

    revalidatePath("/planning");
    revalidatePath("/admin/planning");
    revalidatePath("/membre/planning");

    return {
      success: true,
      data: newTmpl,
      message: `Créneau récurrent ${payload.discipline} (${payload.start_time}) créé et planifié.`,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erreur serveur inattendue." };
  }
}

/**
 * Met à jour un modèle récurrent dans recurring_schedule_templates.
 * Si cascadeFutureSessions === true, répercute sur les séances futures qui n'ont AUCUNE réservation confirmée.
 */
export async function updateRecurringTemplateServerAction(
  templateId: string,
  payload: {
    day_of_week?: number;
    start_time?: string;
    end_time?: string;
    type?: SessionType;
    discipline?: string;
    level?: string;
    max_capacity?: number;
    is_active?: boolean;
  },
  forceCascade = false
): Promise<MutationResult> {
  try {
    await verifyAdminAuth();
    const adminSupabase = createAdminClient();

    // 1. Récupération du template actuel pour détecter les changements d'horaire, de jour ou de discipline
    const { data: oldTmpl } = await adminSupabase
      .from("recurring_schedule_templates")
      .select("*")
      .eq("id", templateId)
      .single();

    const isScheduleOrDisciplineChanged = Boolean(
      oldTmpl && (
        (payload.day_of_week !== undefined && payload.day_of_week !== oldTmpl.day_of_week) ||
        (payload.start_time && payload.start_time.slice(0, 5) !== oldTmpl.start_time.slice(0, 5)) ||
        (payload.end_time && payload.end_time.slice(0, 5) !== oldTmpl.end_time.slice(0, 5)) ||
        (payload.discipline && payload.discipline !== oldTmpl.discipline)
      )
    );

    // 2. Vérification des réservations sur les séances de la semaine courante et futures liées à ce template
    const currentWeekMondayIso = `${getCurrentWeekMondayIso()}T00:00:00.000Z`;
    const { data: futureSessions } = await adminSupabase
      .from("class_sessions")
      .select("id")
      .eq("template_id", templateId)
      .gte("starts_at", currentWeekMondayIso);

    const futureSessionIds = (futureSessions || []).map((s) => s.id);
    let totalBookings = 0;

    if (futureSessionIds.length > 0) {
      const { count } = await adminSupabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .in("class_session_id", futureSessionIds)
        .eq("status", "confirmed");

      totalBookings = count || 0;
    }

    // Si des réservations existent et que l'administrateur n'a pas encore explicitement forcé l'action
    if (totalBookings > 0 && !forceCascade) {
      return {
        success: false,
        hasBookings: true,
        bookingsCount: totalBookings,
        message: `Attention : ${totalBookings} réservation(s) confirmée(s) existent déjà sur les séances futures de ce créneau. Confirmez-vous la modification récurrente ?`,
      };
    }

    // Identifier les séances qui ONT des réservations (strictement préservées) et celles NON réservées
    let unbookedSessionIds: string[] = [];
    if (futureSessionIds.length > 0) {
      const { data: bookedSessionRows } = await adminSupabase
        .from("bookings")
        .select("class_session_id")
        .in("class_session_id", futureSessionIds)
        .eq("status", "confirmed");

      const bookedIdsSet = new Set((bookedSessionRows || []).map((b) => b.class_session_id));
      unbookedSessionIds = futureSessionIds.filter((id) => !bookedIdsSet.has(id));
    }

    // 3. Mise à jour du template
    const { data: updatedTmpl, error: tmplErr } = await adminSupabase
      .from("recurring_schedule_templates")
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq("id", templateId)
      .select("*")
      .single();

    if (tmplErr) {
      return { success: false, error: tmplErr.message };
    }

    // 4. Synchronisation des séances physiques
    if (isScheduleOrDisciplineChanged) {
      // Cas A : L'horaire, le jour ou la discipline a changé.
      // -> Supprimer les futures occurrences NON réservées à l'ancien horaire (évite tout doublon)
      if (unbookedSessionIds.length > 0) {
        await adminSupabase
          .from("class_sessions")
          .delete()
          .in("id", unbookedSessionIds);
      }

      // -> Régénérer immédiatement les nouvelles occurrences au nouvel horaire pour les 12 prochaines semaines
      try {
        await adminSupabase.rpc("generate_recurring_schedule", {
          p_start_date: getCurrentWeekMondayIso(),
          p_weeks_count: 12,
        });
      } catch (genErr) {
        console.warn("[updateRecurringTemplateServerAction] Note régénération :", genErr);
      }
    } else {
      // Cas B : Changement simple (niveau, capacité, is_active)
      // -> Mise à jour in situ des futures séances non réservées
      if (unbookedSessionIds.length > 0) {
        const sessionPatch: any = {};
        if (payload.level) sessionPatch.level = payload.level;
        if (payload.max_capacity) sessionPatch.max_capacity = payload.max_capacity;
        if (typeof payload.is_active === "boolean") sessionPatch.is_active = payload.is_active;

        if (Object.keys(sessionPatch).length > 0) {
          await adminSupabase
            .from("class_sessions")
            .update(sessionPatch)
            .in("id", unbookedSessionIds);
        }
      }
    }

    revalidatePath("/planning");
    revalidatePath("/admin/planning");
    revalidatePath("/membre/planning");

    return {
      success: true,
      data: updatedTmpl,
      message: isScheduleOrDisciplineChanged
        ? "Créneau repositionné et futures séances synchronisées au nouvel horaire."
        : "Modèle récurrent et séances futures synchronisés avec succès.",
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erreur lors de la modification." };
  }
}

/**
 * Active ou désactive un modèle récurrent
 */
export async function toggleRecurringTemplateStatusServerAction(
  templateId: string,
  isActive: boolean
): Promise<MutationResult> {
  return updateRecurringTemplateServerAction(templateId, { is_active: isActive }, true);
}

/**
 * Supprime un modèle récurrent (ou le désactive si des séances avec historique existent)
 */
export async function deleteRecurringTemplateServerAction(templateId: string): Promise<MutationResult> {
  try {
    await verifyAdminAuth();
    const adminSupabase = createAdminClient();

    // Vérifier si des réservations existent sur les séances associées
    const { data: sessions } = await adminSupabase
      .from("class_sessions")
      .select("id")
      .eq("template_id", templateId);

    const sIds = (sessions || []).map((s) => s.id);
    let bookingsCount = 0;
    if (sIds.length > 0) {
      const { count } = await adminSupabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .in("class_session_id", sIds);
      bookingsCount = count || 0;
    }

    if (bookingsCount > 0) {
      // Protection stricte : ne pas supprimer le template pour préserver l'intégrité historique, désactivation à la place
      await adminSupabase
        .from("recurring_schedule_templates")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", templateId);

      // Désactiver les séances non réservées de la semaine courante et futures
      const currentWeekMondayIso = `${getCurrentWeekMondayIso()}T00:00:00.000Z`;
      await adminSupabase
        .from("class_sessions")
        .update({ is_active: false })
        .eq("template_id", templateId)
        .gte("starts_at", currentWeekMondayIso);

      revalidatePath("/planning");
      revalidatePath("/admin/planning");

      return {
        success: true,
        message: "Le créneau comporte un historique de réservations : il a été désactivé sans perte de données.",
      };
    }

    // Si aucune réservation n'existe : suppression propre
    await adminSupabase.from("class_sessions").delete().eq("template_id", templateId);
    await adminSupabase.from("recurring_schedule_templates").delete().eq("id", templateId);

    revalidatePath("/planning");
    revalidatePath("/admin/planning");
    revalidatePath("/membre/planning");

    return {
      success: true,
      message: "Créneau récurrent supprimé avec succès.",
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erreur lors de la suppression." };
  }
}

/**
 * Modifie UNIQUEMENT une séance physique datée précise dans class_sessions.
 * N'altère PAS le modèle récurrent pour les autres semaines.
 */
export async function updateSingleDatedSessionServerAction(
  sessionId: string,
  payload: {
    discipline?: string;
    level?: string;
    starts_at?: string;
    ends_at?: string;
    max_capacity?: number;
    is_active?: boolean;
  }
): Promise<MutationResult> {
  try {
    await verifyAdminAuth();
    const adminSupabase = createAdminClient();

    const { data: updatedSession, error: updateError } = await adminSupabase
      .from("class_sessions")
      .update(payload)
      .eq("id", sessionId)
      .select("*")
      .single();

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    revalidatePath("/admin/planning");
    revalidatePath("/membre/planning");

    return {
      success: true,
      data: updatedSession,
      message: "Séance ponctuelle mise à jour avec succès.",
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erreur lors de la mise à jour." };
  }
}

/**
 * Active / désactive une séance physique datée
 */
export async function toggleSingleSessionStatusServerAction(
  sessionId: string,
  isActive: boolean
): Promise<MutationResult> {
  return updateSingleDatedSessionServerAction(sessionId, { is_active: isActive });
}

/**
 * Déclenche manuellement la prolongation / maintenance de l'horizon de planning (12 semaines).
 */
export async function triggerScheduleGenerationServerAction(): Promise<MutationResult> {
  try {
    await verifyAdminAuth();
    const adminSupabase = createAdminClient();

    const { data, error } = await adminSupabase.rpc("maintain_schedule_horizon", {
      p_target_weeks_ahead: 12,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/planning");
    revalidatePath("/admin/planning");
    revalidatePath("/membre/planning");

    return {
      success: true,
      data,
      message: "Génération et maintien de l'horizon de 12 semaines terminés avec succès.",
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erreur lors de la génération." };
  }
}

/**
 * Calcule la date du lundi de la semaine en cours au format YYYY-MM-DD
 */
function getCurrentWeekMondayIso(): string {
  const d = new Date();
  const day = d.getDay();
  // Dimanche = 0 (décalage de -6 jours), sinon (1 - day) jours pour atteindre Lundi
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  return d.toISOString().slice(0, 10);
}
