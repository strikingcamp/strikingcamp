import { SupabaseClient } from "@supabase/supabase-js";
import {
  computeBillingCycle,
  computePrivateQuotaBalance,
  type PrivateQuotaBalance,
  type PrivateBookingLike,
} from "@/lib/access-control";

export interface MemberPrivateQuotaStatus {
  success: boolean;
  hasActivePrivatePlan: boolean;
  quotaTotal: number;
  sessionsConsumed: number;
  sessionsRemaining: number;
  cycleStart: string | null;
  cycleEnd: string | null;
  error?: string;
}

export interface BookPrivateSessionResult {
  success: boolean;
  bookingId?: string;
  remainingSessions?: number;
  error?: string;
  code?: string;
  message?: string;
}

export interface CancelPrivateSessionResult {
  success: boolean;
  isLateCancellation?: boolean;
  message?: string;
  error?: string;
  code?: string;
}

export interface GenerateDailyPrivateSlotsResult {
  success: boolean;
  slotsCreated?: number;
  targetDate?: string;
  message?: string;
  error?: string;
}

/**
 * Récupère le statut du quota privé du membre connecté via la RPC get_member_private_quota_status
 * (avec calcul de secours déterministe via TypeScript si la RPC n'est pas disponible)
 */
export async function getMemberPrivateQuotaStatus(
  supabase: SupabaseClient
): Promise<MemberPrivateQuotaStatus> {
  try {
    const { data, error } = await supabase.rpc("get_member_private_quota_status");

    if (!error && data && typeof data === "object") {
      const raw = data as Record<string, unknown>;
      return {
        success: raw.success !== false,
        hasActivePrivatePlan: Boolean(raw.has_active_private_plan),
        quotaTotal: Number(raw.quota_total) || 0,
        sessionsConsumed: Number(raw.sessions_consumed) || 0,
        sessionsRemaining: Number(raw.sessions_remaining) || 0,
        cycleStart: (raw.cycle_start as string) || null,
        cycleEnd: (raw.cycle_end as string) || null,
      };
    }

    if (error) {
      console.warn("[getMemberPrivateQuotaStatus] Fallback TS suite à erreur RPC :", error.message);
    }

    // Fallback TS robuste si la RPC n'est pas encore déployée dans la base
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        hasActivePrivatePlan: false,
        quotaTotal: 0,
        sessionsConsumed: 0,
        sessionsRemaining: 0,
        cycleStart: null,
        cycleEnd: null,
        error: "Non authentifié",
      };
    }

    // 1. Récupération de l'abonnement
    const { data: subData } = await supabase
      .from("subscriptions")
      .select("id, started_at, ends_at, status, private_sessions_quota, plan:plans(id, name, type, allows_private)")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!subData) {
      return {
        success: true,
        hasActivePrivatePlan: false,
        quotaTotal: 0,
        sessionsConsumed: 0,
        sessionsRemaining: 0,
        cycleStart: null,
        cycleEnd: null,
      };
    }

    const rawPlan = Array.isArray(subData.plan) ? subData.plan[0] : subData.plan;
    const isPrivate =
      rawPlan?.allows_private === true ||
      rawPlan?.type === "private" ||
      (rawPlan?.name || "").toLowerCase().includes("privé") ||
      (rawPlan?.name || "").toLowerCase().includes("prive");

    if (!isPrivate) {
      return {
        success: true,
        hasActivePrivatePlan: false,
        quotaTotal: 0,
        sessionsConsumed: 0,
        sessionsRemaining: 0,
        cycleStart: null,
        cycleEnd: null,
      };
    }

    const quotaTotal = subData.private_sessions_quota || 8;
    const { cycleStart, cycleEnd } = computeBillingCycle(subData.started_at || new Date());

    // 2. Récupération des réservations privées
    const { data: bookingsData } = await supabase
      .from("bookings")
      .select("id, status, is_late_cancellation, session:class_sessions(type, starts_at)")
      .eq("user_id", user.id);

    const privateBookings: PrivateBookingLike[] = (bookingsData || [])
      .filter((b: Record<string, unknown>) => {
        const s = Array.isArray(b.session) ? b.session[0] : (b.session as Record<string, unknown> | null);
        return s?.type === "private";
      })
      .map((b: Record<string, unknown>) => {
        const s = Array.isArray(b.session) ? b.session[0] : (b.session as Record<string, unknown> | null);
        return {
          id: b.id as string,
          status: b.status as string,
          is_late_cancellation: Boolean(b.is_late_cancellation),
          starts_at: s?.starts_at as string,
        };
      });

    const balance: PrivateQuotaBalance = computePrivateQuotaBalance(
      quotaTotal,
      cycleStart,
      cycleEnd,
      privateBookings,
      true
    );

    return {
      success: true,
      hasActivePrivatePlan: true,
      quotaTotal: balance.quotaTotal,
      sessionsConsumed: balance.sessionsConsumed,
      sessionsRemaining: balance.sessionsRemaining,
      cycleStart: cycleStart.toISOString(),
      cycleEnd: cycleEnd.toISOString(),
    };
  } catch (err) {
    console.error("[getMemberPrivateQuotaStatus] Exception :", err);
    return {
      success: false,
      hasActivePrivatePlan: false,
      quotaTotal: 0,
      sessionsConsumed: 0,
      sessionsRemaining: 0,
      cycleStart: null,
      cycleEnd: null,
      error: (err as Error).message || "Erreur inconnue",
    };
  }
}

/**
 * Réserve un cours privé via la RPC sécurisée create_private_booking
 */
export async function bookPrivateSession(
  supabase: SupabaseClient,
  classSessionId: string
): Promise<BookPrivateSessionResult> {
  try {
    const { data, error } = await supabase.rpc("create_private_booking", {
      p_class_session_id: classSessionId,
    });

    if (error) {
      console.error("[bookPrivateSession] Erreur RPC create_private_booking :", error);
      return {
        success: false,
        error: error.message || "Impossible d'effectuer la réservation du cours privé.",
        code: (error as { code?: string })?.code,
      };
    }

    if (data && typeof data === "object") {
      const raw = data as Record<string, unknown>;
      if (raw.success === false) {
        return {
          success: false,
          error: (raw.message as string) || (raw.error as string) || "Réservation refusée.",
          code: raw.error as string,
        };
      }

      return {
        success: true,
        bookingId: raw.booking_id as string,
        remainingSessions: typeof raw.remaining_sessions === "number" ? raw.remaining_sessions : undefined,
        message: raw.message as string,
      };
    }

    return {
      success: false,
      error: "Réponse inattendue du serveur.",
    };
  } catch (err) {
    console.error("[bookPrivateSession] Exception :", err);
    return {
      success: false,
      error: (err as Error).message || "Erreur lors de la réservation.",
    };
  }
}

/**
 * Annule un cours privé selon la règle stricte des 24h via la RPC cancel_private_booking
 */
export async function cancelPrivateSession(
  supabase: SupabaseClient,
  bookingId: string
): Promise<CancelPrivateSessionResult> {
  try {
    const { data, error } = await supabase.rpc("cancel_private_booking", {
      p_booking_id: bookingId,
    });

    if (error) {
      console.error("[cancelPrivateSession] Erreur RPC cancel_private_booking :", error);
      return {
        success: false,
        error: error.message || "Impossible d'annuler le cours privé.",
        code: (error as { code?: string })?.code,
      };
    }

    if (data && typeof data === "object") {
      const raw = data as Record<string, unknown>;
      if (raw.success === false) {
        return {
          success: false,
          error: (raw.message as string) || (raw.error as string) || "Annulation refusée.",
          code: raw.error as string,
        };
      }

      return {
        success: true,
        isLateCancellation: Boolean(raw.isLateCancellation),
        message: raw.message as string,
      };
    }

    return {
      success: false,
      error: "Réponse inattendue du serveur.",
    };
  } catch (err) {
    console.error("[cancelPrivateSession] Exception :", err);
    return {
      success: false,
      error: (err as Error).message || "Erreur lors de l'annulation.",
    };
  }
}

/**
 * Génère les 6 créneaux privés standards de 50 min pour une journée donnée (Admin uniquement)
 */
export async function adminGenerateDailyPrivateSlots(
  supabase: SupabaseClient,
  targetDate: string
): Promise<GenerateDailyPrivateSlotsResult> {
  try {
    const { data, error } = await supabase.rpc("admin_generate_daily_private_slots", {
      p_date: targetDate,
    });

    if (error) {
      console.error("[adminGenerateDailyPrivateSlots] Erreur RPC :", error);
      return {
        success: false,
        error: error.message,
      };
    }

    if (data && typeof data === "object") {
      const raw = data as Record<string, unknown>;
      if (raw.success === false) {
        return {
          success: false,
          error: (raw.message as string) || (raw.error as string) || "Erreur génération.",
        };
      }

      return {
        success: true,
        slotsCreated: Number(raw.slots_created) || 0,
        targetDate: raw.target_date as string,
        message: raw.message as string,
      };
    }

    return {
      success: false,
      error: "Réponse inattendue du serveur.",
    };
  } catch (err) {
    console.error("[adminGenerateDailyPrivateSlots] Exception :", err);
    return {
      success: false,
      error: (err as Error).message || "Erreur lors de la génération des créneaux.",
    };
  }
}
