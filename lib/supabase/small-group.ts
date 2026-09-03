import { SupabaseClient } from "@supabase/supabase-js";
import { computeCumulativeAccess, type CumulativeMemberAccess } from "@/lib/access-control";

export interface MemberPlanAccess {
  hasActiveSubscription: boolean;
  hasSmallGroupAccess: boolean;
  hasCollectiveAccess: boolean;
  hasPrivateAccess: boolean;
  privateSessionsQuota?: number | null;
  planName?: string;
  planType?: string;
  activePlanNames?: string[];
  validSubscriptionsCount?: number;
}

export interface ClassSession {
  id: string;
  template_id?: string | null;
  discipline: string;
  type?: string | null;
  level?: string | null;
  starts_at: string;
  ends_at?: string | null;
  max_capacity?: number | null;
  is_active?: boolean | null;
  created_at?: string | null;
}

export interface SmallGroupBooking {
  id: string;
  user_id: string;
  class_session_id?: string | null;
  classSessionId?: string | null;
  discipline: string;
  sessionType: "Cours Privé" | "Small Group" | "Collectifs";
  day: string;
  time: string;
  level?: string;
  status: string;
  date?: string;
  created_at?: string;
  class_session?: ClassSession | null;
}

const DAY_NAMES_FR = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
];

const MONTH_NAMES_FR = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

/**
 * Récupère l'ensemble des abonnements actifs du membre pour déterminer ses droits d'accès cumulés.
 */
export async function getMemberPlanAccess(
  supabase: SupabaseClient,
  userId: string
): Promise<MemberPlanAccess> {
  const { data: subscriptionsData, error } = await supabase
    .from("subscriptions")
    .select(
      "id, status, started_at, ends_at, private_sessions_quota, plan:plans(id, name, type, commitment, allows_private, allows_small_group, allows_collective)"
    )
    .eq("user_id", userId)
    .eq("status", "active")
    .order("started_at", { ascending: false });

  if (error) {
    console.error("Erreur récupération formule membre :", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return {
      hasActiveSubscription: false,
      hasSmallGroupAccess: false,
      hasCollectiveAccess: false,
      hasPrivateAccess: false,
      privateSessionsQuota: null,
      activePlanNames: [],
      validSubscriptionsCount: 0,
    };
  }

  const cumulative: CumulativeMemberAccess = computeCumulativeAccess(subscriptionsData || []);

  const primaryPlanName =
    cumulative.activePlanNames.length > 0
      ? cumulative.activePlanNames.join(" + ")
      : undefined;

  return {
    hasActiveSubscription: cumulative.hasActiveSubscription,
    hasSmallGroupAccess: cumulative.hasSmallGroupAccess,
    hasCollectiveAccess: cumulative.hasCollectiveAccess,
    hasPrivateAccess: cumulative.hasPrivateAccess,
    privateSessionsQuota: cumulative.privateSessionsQuota,
    planName: primaryPlanName,
    activePlanNames: cumulative.activePlanNames,
    validSubscriptionsCount: cumulative.validSubscriptionsCount,
  };
}

/**
 * Récupère les réservations Small Group confirmées de l'utilisateur depuis public.bookings
 */
export async function getMemberUpcomingBookings(
  supabase: SupabaseClient,
  userId: string
): Promise<SmallGroupBooking[]> {
  // 1. Récupération des réservations réelles de l'utilisateur sur la table bookings
  const { data: bookings, error: bookingsError } = await supabase
    .from("bookings")
    .select("id, user_id, class_session_id, status, created_at")
    .eq("user_id", userId)
    .eq("status", "confirmed")
    .not("class_session_id", "is", null)
    .order("created_at", { ascending: false });

  if (bookingsError) {
    console.error("Erreur récupération réservations Small Group :", {
      message: bookingsError.message,
      code: bookingsError.code,
      details: bookingsError.details,
      hint: bookingsError.hint,
    });
    return [];
  }

  if (!bookings || bookings.length === 0) {
    return [];
  }

  // 2. Récupération des détails de chaque session depuis class_sessions
  const sessionIds = Array.from(
    new Set(
      bookings
        .map((b) => b.class_session_id as string)
        .filter((id): id is string => typeof id === "string" && id.length > 0)
    )
  );

  const sessionsMap = new Map<string, ClassSession>();

  if (sessionIds.length > 0) {
    const { data: sessions, error: sessionsError } = await supabase
      .from("class_sessions")
      .select("id, discipline, type, level, starts_at, ends_at, max_capacity, is_active")
      .in("id", sessionIds);

    if (sessionsError) {
      console.warn("Informations class_sessions :", {
        message: sessionsError.message,
        code: sessionsError.code,
      });
    } else if (sessions) {
      for (const s of sessions) {
        sessionsMap.set(s.id, s);
      }
    }
  }

  // 3. Formatage pour affichage
  const result: SmallGroupBooking[] = [];

  for (const b of bookings) {
    const session = b.class_session_id ? sessionsMap.get(b.class_session_id) : undefined;

    let dayFormatted = "Séance réservée";
    let timeFormatted = "";
    let dateFormatted = "";

    if (session?.starts_at) {
      const start = new Date(session.starts_at);
      const end = session.ends_at ? new Date(session.ends_at) : null;
      dayFormatted = DAY_NAMES_FR[start.getDay()];
      dateFormatted = `${start.getDate()} ${MONTH_NAMES_FR[start.getMonth()]}`;

      const sHours = String(start.getHours()).padStart(2, "0");
      const sMins = String(start.getMinutes()).padStart(2, "0");
      if (end) {
        const eHours = String(end.getHours()).padStart(2, "0");
        const eMins = String(end.getMinutes()).padStart(2, "0");
        timeFormatted = `${sHours}:${sMins} – ${eHours}:${eMins}`;
      } else {
        timeFormatted = `${sHours}:${sMins}`;
      }
    }

    const rawType = (session?.type || "").toLowerCase().trim();
    const isPrivate =
      rawType === "private" ||
      rawType === "prive" ||
      (session?.discipline || "").toLowerCase().includes("privé") ||
      (session?.discipline || "").toLowerCase().includes("prive");
    const isCollective = rawType === "collective" || rawType === "collectif";
    const sessionType: "Cours Privé" | "Small Group" | "Collectifs" = isPrivate
      ? "Cours Privé"
      : isCollective
      ? "Collectifs"
      : "Small Group";

    result.push({
      id: b.id,
      user_id: b.user_id,
      class_session_id: b.class_session_id,
      classSessionId: b.class_session_id,
      discipline: session?.discipline || (isPrivate ? "Cours Privé" : "Small Group"),
      sessionType,
      day: dayFormatted,
      time: timeFormatted,
      date: dateFormatted,
      level: session?.level || "Tous niveaux",
      status: "Réservation confirmée",
      created_at: b.created_at,
      class_session: session || null,
    });
  }

  return result;
}

/**
 * Récupère les sessions actives de cours depuis public.class_sessions
 */
export async function getActiveClassSessions(
  supabase: SupabaseClient
): Promise<ClassSession[]> {
  const { data, error } = await supabase
    .from("class_sessions")
    .select("id, template_id, discipline, type, level, starts_at, ends_at, max_capacity, is_active, created_at")
    .order("starts_at", { ascending: true });

  if (error) {
    console.error("Erreur récupération class_sessions :", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return [];
  }

  return data || [];
}

/**
 * Effectue la réservation d'une séance Small Group via la RPC create_small_group_booking
 */
export async function bookSmallGroupSession(
  supabase: SupabaseClient,
  classSessionId: string
): Promise<{ success: boolean; error?: string; bookingId?: string }> {
  console.log("--> [bookSmallGroupSession] class_session_id envoyé :", classSessionId);

  const { data, error } = await supabase.rpc("create_small_group_booking", {
    p_class_session_id: classSessionId,
  });

  console.log("--> [bookSmallGroupSession] Résultat RPC Supabase :", {
    data,
    error_message: error?.message,
    error_code: error?.code,
    error_details: error?.details,
  });

  if (error) {
    console.error("Erreur RPC create_small_group_booking :", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return {
      success: false,
      error: error.message || "Erreur lors de la réservation.",
    };
  }

  if (data && typeof data === "object") {
    const res = data as Record<string, unknown>;
    if (res.success === false) {
      return {
        success: false,
        error: (res.message as string) || (res.error as string) || "Impossible de réserver ce cours.",
      };
    }

    return {
      success: true,
      bookingId: (res.booking_id as string) || undefined,
    };
  }

  return {
    success: false,
    error: "Réponse inattendue du serveur.",
  };
}

/**
 * Annule une réservation Small Group via la RPC cancel_small_group_booking
 */
export async function cancelSmallGroupSession(
  supabase: SupabaseClient,
  bookingId: string
): Promise<{ success: boolean; error?: string }> {
  console.log("--> [cancelSmallGroupSession] booking_id envoyé :", bookingId);

  const { data, error } = await supabase.rpc("cancel_small_group_booking", {
    p_booking_id: bookingId,
  });

  console.log("--> [cancelSmallGroupSession] Résultat RPC Supabase :", {
    data,
    error_message: error?.message,
    error_code: error?.code,
    error_details: error?.details,
  });

  if (error) {
    console.error("Erreur RPC cancel_small_group_booking :", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return {
      success: false,
      error: error.message || "Erreur lors de l'annulation.",
    };
  }

  if (data && typeof data === "object") {
    const res = data as Record<string, unknown>;
    if (res.success === false) {
      return {
        success: false,
        error: (res.message as string) || (res.error as string) || "Impossible d'annuler ce cours.",
      };
    }

    return {
      success: true,
    };
  }

  return {
    success: false,
    error: "Réponse inattendue du serveur.",
  };
}
