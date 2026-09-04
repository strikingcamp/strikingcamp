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
  type: "small_group" | "collective";
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
 * Récupère l'ensemble des créneaux réels futurs éligibles aux cours d'essai.
 * - Filtre strict : futures (starts_at > NOW()), actives (is_active = true), collectives ou small group (pas de cours privés).
 * - Calcule les places restantes réelles (capacité - bookings confirmés - trial_bookings confirmés).
 * - Utilise strictement le fuseau Europe/Paris pour le formatage.
 */
export async function getAvailableTrialSessions(
  supabase: SupabaseClient
): Promise<TrialSessionOption[]> {
  try {
    const nowIso = new Date().toISOString();

    // 1. Récupération des séances futures collectives et small group
    const { data: sessions, error: sessionsErr } = await supabase
      .from("class_sessions")
      .select("id, discipline, type, level, starts_at, ends_at, max_capacity, is_active")
      .in("type", ["collective", "small_group"])
      .eq("is_active", true)
      .gt("starts_at", nowIso)
      .order("starts_at", { ascending: true })
      .limit(60);

    if (sessionsErr || !sessions) {
      console.error("[getAvailableTrialSessions] Erreur lecture class_sessions :", sessionsErr);
      return [];
    }

    if (sessions.length === 0) {
      return [];
    }

    const sessionIds = sessions.map((s) => s.id);

    // 2. Récupération des réservations membres confirmées
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

    // 3. Récupération des réservations d'essai confirmées
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

    // 4. Construction des options formatées
    const result: TrialSessionOption[] = [];

    for (const s of sessions) {
      const disc = (s.discipline || "").trim();
      const rawType = (s.type || "").toLowerCase().trim();

      // Exclusion de sécurité absolue pour les cours privés
      if (
        rawType === "private" ||
        disc.toLowerCase().includes("privé") ||
        disc.toLowerCase().includes("prive")
      ) {
        continue;
      }

      const maxCap = s.max_capacity ?? (rawType === "collective" ? 35 : 20);
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
        const eDate = new Date(sDate.getTime() + 50 * 60 * 1000);
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
      const timeFormatted = `${startTime} – ${endTime}`;

      result.push({
        id: s.id,
        discipline: disc,
        type: rawType === "collective" ? "collective" : "small_group",
        level: s.level,
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
