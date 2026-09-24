import { SupabaseClient } from "@supabase/supabase-js";
import { formatToParisDate, formatToParisTime } from "@/lib/supabase/admin";

export interface TrialBookingPayload {
  classSessionId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  consentContact: boolean;
  honeypot?: string;
}

export interface TrialBookingResult {
  success: boolean;
  bookingId?: string;
  discipline?: string;
  startsAt?: string;
  endsAt?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  message?: string;
  error?: string;
}

export interface TrialSessionOption {
  id: string;
  discipline: string;
  type: "small_group" | "private";
  level?: string | null;
  starts_at: string;
  ends_at?: string | null;
  dayName: string;
  dateStr: string;
  dateFormatted: string;
  timeFormatted: string;
  placesAvailable: number;
  maxCapacity: number;
  isAvailable: boolean;
}

export interface TrialDisciplineOption {
  name: string;
  description?: string;
  availableCount: number;
}

/**
 * Vérifie si le service Small Group est actif dans public.service_settings.
 * Source unique de vérité pour la disponibilité du Small Group.
 */
export async function isSmallGroupServiceActive(
  supabase: SupabaseClient
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("service_settings")
      .select("is_active")
      .eq("service_key", "small_group")
      .maybeSingle();

    if (error || !data) {
      return false;
    }

    return Boolean(data.is_active);
  } catch (err) {
    console.error("[isSmallGroupServiceActive] Erreur lecture service_settings :", err);
    return false;
  }
}

/**
 * Vérifie si le service Cours Privés est actif dans public.service_settings.
 */
export async function isPrivateServiceActive(
  supabase: SupabaseClient
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("service_settings")
      .select("is_active")
      .eq("service_key", "private")
      .maybeSingle();

    if (error || !data) {
      return true; // Actif par défaut si non spécifié
    }

    return Boolean(data.is_active);
  } catch (err) {
    console.error("[isPrivateServiceActive] Erreur lecture service_settings :", err);
    return true;
  }
}

/**
 * Récupère l'ensemble des créneaux réels futurs éligibles aux cours d'essai Small Group.
 * - Filtre strict : futures (starts_at > NOW()), actives (is_active = true), type = 'small_group'.
 * - Trois créneaux officiels d'essai :
 *   1. Mardi à 18:00 → Kick Boxing (Small Group)
 *   2. Vendredi à 18:00 → Boxe Thaï (Small Group)
 *   3. Samedi à 09:00 → Boxe Anglaise (Small Group)
 * - Calcule les places restantes réelles (capacité 12 max - bookings confirmés - trial_bookings confirmés).
 * - Utilise strictement le fuseau Europe/Paris pour le formatage.
 */
export async function getAvailableTrialSessions(
  supabase: SupabaseClient
): Promise<TrialSessionOption[]> {
  try {
    const nowIso = new Date().toISOString();

    // 0. Vérification du statut du service Small Group dans service_settings
    const smallGroupActive = await isSmallGroupServiceActive(supabase);
    if (!smallGroupActive) {
      return [];
    }

    // 1. Récupération des séances Small Group futures pour Kick Boxing, Boxe Thaï et Boxe anglaise
    const { data: sessions, error: sessionsErr } = await supabase
      .from("class_sessions")
      .select("id, discipline, type, level, starts_at, ends_at, max_capacity, is_active")
      .eq("type", "small_group")
      .in("discipline", ["Kick Boxing", "Boxe Thaï", "Boxe Anglaise", "Boxe anglaise", "Boxing"])
      .eq("is_active", true)
      .gt("starts_at", nowIso)
      .order("starts_at", { ascending: true })
      .limit(90);

    if (sessionsErr || !sessions) {
      console.error("[getAvailableTrialSessions] Erreur lecture class_sessions :", sessionsErr);
      return [];
    }

    if (sessions.length === 0) {
      return [];
    }

    // 2. Filtrage strict sur les 3 créneaux d'essai officiels en heure de Paris :
    // - Mardi 18:00 Kick Boxing
    // - Vendredi 18:00 Boxe Thaï
    // - Samedi 09:00 Boxe Anglaise
    const trialSessions = sessions.filter((s) => {
      const sDate = new Date(s.starts_at);
      const dayOfWeekStr = new Intl.DateTimeFormat("en-US", {
        timeZone: "Europe/Paris",
        weekday: "short",
      }).format(sDate); // 'Tue', 'Fri', 'Sat'
      const timeStr = formatToParisTime(s.starts_at); // '18:00', '09:00'
      const disc = (s.discipline || "").trim();

      const isTuesdayKickBoxing =
        dayOfWeekStr === "Tue" && timeStr === "18:00" && disc.toLowerCase() === "kick boxing";
      const isFridayBoxeThai =
        dayOfWeekStr === "Fri" && timeStr === "18:00" && disc.toLowerCase() === "boxe thaï";
      const isSaturdayBoxeAnglaise =
        dayOfWeekStr === "Sat" &&
        timeStr === "09:00" &&
        (disc.toLowerCase() === "boxe anglaise" || disc.toLowerCase() === "boxing");

      return isTuesdayKickBoxing || isFridayBoxeThai || isSaturdayBoxeAnglaise;
    });

    if (trialSessions.length === 0) {
      return [];
    }

    const sessionIds = trialSessions.map((s) => s.id);

    // 3. Récupération des réservations membres confirmées
    const { data: memberBookings } = await supabase
      .from("bookings")
      .select("id, class_session_id")
      .in("class_session_id", sessionIds)
      .eq("status", "confirmed");

    const memberCounts = new Map<string, number>();
    for (const b of memberBookings || []) {
      if (b.class_session_id) {
        memberCounts.set(b.class_session_id, (memberCounts.get(b.class_session_id) || 0) + 1);
      }
    }

    // 4. Récupération des réservations d'essai confirmées
    const { data: trialBookings } = await supabase
      .from("trial_bookings")
      .select("id, class_session_id")
      .in("class_session_id", sessionIds)
      .eq("status", "confirmed");

    const trialCounts = new Map<string, number>();
    for (const tb of trialBookings || []) {
      if (tb.class_session_id) {
        trialCounts.set(tb.class_session_id, (trialCounts.get(tb.class_session_id) || 0) + 1);
      }
    }

    // 5. Construction des options formatées
    const result: TrialSessionOption[] = [];

    for (const s of trialSessions) {
      const disc = (s.discipline || "").trim();
      let normalizedDisc = disc;
      if (disc.toLowerCase() === "boxing" || disc.toLowerCase() === "boxe anglaise") {
        normalizedDisc = "Boxe anglaise";
      } else if (disc.toLowerCase() === "kick boxing" || disc.toLowerCase() === "kickboxing") {
        normalizedDisc = "Kick Boxing";
      } else if (disc.toLowerCase() === "boxe thaï" || disc.toLowerCase() === "boxe thai") {
        normalizedDisc = "Boxe Thaï";
      }

      const maxCap = s.max_capacity ?? 12;
      const bookedM = memberCounts.get(s.id) || 0;
      const bookedT = trialCounts.get(s.id) || 0;
      const placesOccupied = bookedM + bookedT;
      const placesRemaining = Math.max(0, maxCap - placesOccupied);

      // Calcul des dates et heures en fuseau Europe/Paris
      const dateStr = formatToParisDate(s.starts_at);
      const startTime = formatToParisTime(s.starts_at);
      let endTime = "";
      if (s.ends_at) {
        endTime = formatToParisTime(s.ends_at);
      } else {
        const sDate = new Date(s.starts_at);
        const eDate = new Date(sDate.getTime() + 60 * 60 * 1000);
        endTime = formatToParisTime(eDate);
      }

      const sDateObj = new Date(s.starts_at);
      const dayNameRaw = new Intl.DateTimeFormat("fr-FR", {
        timeZone: "Europe/Paris",
        weekday: "long",
      }).format(sDateObj);
      const dayName = dayNameRaw.charAt(0).toUpperCase() + dayNameRaw.slice(1);

      const dayNum = new Intl.DateTimeFormat("fr-FR", {
        timeZone: "Europe/Paris",
        day: "numeric",
      }).format(sDateObj);

      const monthName = new Intl.DateTimeFormat("fr-FR", {
        timeZone: "Europe/Paris",
        month: "long",
      }).format(sDateObj);

      const dateFormatted = `${dayName} ${dayNum} ${monthName}`;
      const timeFormatted = `${startTime} → ${endTime}`;

      result.push({
        id: s.id,
        discipline: normalizedDisc,
        type: "small_group",
        level: s.level || "Fondamentaux",
        starts_at: s.starts_at,
        ends_at: s.ends_at,
        dayName,
        dateStr,
        dateFormatted,
        timeFormatted,
        placesAvailable: placesRemaining,
        maxCapacity: maxCap,
        isAvailable: placesRemaining > 0,
      });
    }

    return result;
  } catch (err) {
    console.error("[getAvailableTrialSessions] Exception :", err);
    return [];
  }
}

/**
 * Appelle la RPC sécurisée create_trial_booking pour enregistrer le cours d'essai.
 */
export async function executeTrialBookingRpc(
  supabase: SupabaseClient,
  payload: TrialBookingPayload
): Promise<TrialBookingResult> {
  try {
    const { data, error } = await supabase.rpc("create_trial_booking", {
      p_class_session_id: payload.classSessionId,
      p_first_name: payload.firstName,
      p_last_name: payload.lastName,
      p_email: payload.email,
      p_phone: payload.phone,
      p_consent: payload.consentContact,
    });

    if (error) {
      console.error("[executeTrialBookingRpc] Erreur Supabase RPC :", error);
      return {
        success: false,
        error: error.message || "Erreur lors de la réservation.",
        message: error.message,
      };
    }

    if (data && typeof data === "object") {
      const res = data as Record<string, unknown>;
      if (res.success === false) {
        return {
          success: false,
          error: (res.error as string) || "RESERVATION_FAILED",
          message: (res.message as string) || "Impossible de réserver ce cours d'essai.",
        };
      }

      return {
        success: true,
        bookingId: res.booking_id as string,
        discipline: res.discipline as string,
        startsAt: res.starts_at as string,
        endsAt: res.ends_at as string,
        firstName: res.first_name as string,
        lastName: res.last_name as string,
        email: res.email as string,
        phone: res.phone as string,
        message: (res.message as string) || "Votre cours d'essai a été réservé avec succès.",
      };
    }

    return {
      success: false,
      error: "UNEXPECTED_RESPONSE",
      message: "Réponse inattendue du serveur.",
    };
  } catch (err) {
    console.error("[executeTrialBookingRpc] Exception :", err);
    return {
      success: false,
      error: "SERVER_EXCEPTION",
      message: (err as Error).message || "Une erreur inattendue est survenue.",
    };
  }
}
