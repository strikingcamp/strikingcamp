import { SupabaseClient } from "@supabase/supabase-js";

export interface MemberPlanAccess {
  hasActiveSubscription: boolean;
  hasSmallGroupAccess: boolean;
  hasCollectiveAccess: boolean;
  planName?: string;
  planType?: string;
}

export interface ClassSession {
  id: string;
  name: string;
  type?: string | null;
  level?: string | null;
  starts_at: string;
  ends_at?: string | null;
  capacity?: number | null;
  is_active?: boolean | null;
}

export interface SmallGroupBooking {
  id: string;
  user_id: string;
  class_session_id?: string | null;
  discipline: string;
  sessionType: "Small Group" | "Collectifs";
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

function unwrapSingle<T>(val: T | T[] | null | undefined): T | null {
  if (!val) return null;
  if (Array.isArray(val)) return val.length > 0 ? val[0] : null;
  return val;
}

/**
 * Récupère le type d'abonnement actif du membre pour déterminer ses droits d'accès
 */
export async function getMemberPlanAccess(
  supabase: SupabaseClient,
  userId: string
): Promise<MemberPlanAccess> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("id, status, started_at, plan:plans(id, name, code, type, is_active)")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

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
    };
  }

  if (!data || !data.plan) {
    return {
      hasActiveSubscription: false,
      hasSmallGroupAccess: false,
      hasCollectiveAccess: false,
    };
  }

  const rawPlan = unwrapSingle(data.plan);
  const planType = (rawPlan?.type || "").toLowerCase();
  const planName = rawPlan?.name || "";

  // Un membre small_group a accès aux Small Group ET aux Collectifs
  const isSmallGroup = planType === "small_group" || planName.toLowerCase().includes("small group");
  // Tout abonnement actif donne accès aux cours Collectifs
  const isCollective = isSmallGroup || planType === "collective" || planName.toLowerCase().includes("collectif");

  return {
    hasActiveSubscription: true,
    hasSmallGroupAccess: isSmallGroup,
    hasCollectiveAccess: isCollective,
    planName,
    planType,
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
      .select("id, name, type, level, starts_at, ends_at, capacity, is_active")
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

    result.push({
      id: b.id,
      user_id: b.user_id,
      class_session_id: b.class_session_id,
      discipline: session?.name || "Small Group",
      sessionType: "Small Group",
      day: dayFormatted,
      time: timeFormatted,
      date: dateFormatted,
      level: session?.level || "Fondamentaux",
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
    .select("id, name, type, level, starts_at, ends_at, capacity, is_active")
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
    if (!data.success) {
      return {
        success: false,
        error: (data.error as string) || "Impossible de réserver ce cours.",
      };
    }

    return {
      success: true,
      bookingId: data.booking_id as string,
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
    if (!data.success) {
      return {
        success: false,
        error: (data.error as string) || "Impossible d'annuler ce cours.",
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
