import { SupabaseClient } from "@supabase/supabase-js";
import { clubEvents, type ClubEvent } from "@/data/events";

export interface AdminDashboardStats {
  totalMembers: number;
  activeSubscriptionsCount: number;
  smallGroupSubscriptionsCount: number;
  collectiveSubscriptionsCount: number;
  todayBookingsCount: number;
  upcomingSessionsToday: AdminClassSessionSummary[];
  recentBookings: AdminBookingSummary[];
  featuredEvents: ClubEvent[];
}

export interface AdminClassSessionSummary {
  id: string;
  discipline: string;
  type: string;
  level?: string | null;
  starts_at: string;
  ends_at?: string | null;
  max_capacity: number;
  bookedCount: number;
  is_active: boolean;
}

export interface AdminBookingParticipant {
  bookingId: string;
  userId: string;
  memberName: string;
  phone: string;
  planName: string;
  status: string; // 'confirmed' | 'cancelled'
  attendanceStatus: "pending" | "present" | "absent";
  attendedAt?: string | null;
  createdAt: string;
  cancellationReason?: string | null;
  isLateCancellation?: boolean;
}

export interface AdminSessionReservationsData {
  session: AdminClassSessionSummary | null;
  participants: AdminBookingParticipant[];
  allSessionsList: AdminClassSessionSummary[];
}

export interface AdminWeeklyReservationsData {
  weekMonday: string;
  weekSaturday: string;
  smallGroupSessions: AdminClassSessionSummary[];
  privateSessions: AdminClassSessionSummary[];
  bookingsBySessionId: Record<string, AdminBookingParticipant[]>;
}

export interface AdminBookingSummary {
  id: string;
  memberName: string;
  sessionName: string;
  sessionDate: string;
  sessionTime: string;
  status: string;
  created_at: string;
}

export interface AdminSessionFormData {
  discipline: string;
  type: "small_group" | "collective";
  level?: string;
  starts_at: string;
  ends_at: string;
  max_capacity: number;
  is_active?: boolean;
}

export interface AdminPlanItem {
  id: string;
  name: string;
  code?: string | null;
  type: string;
  commitment?: "monthly" | "annual" | string | null;
  price_cents: number;
  private_sessions_per_period?: number | null;
  allows_private?: boolean | null;
  allows_small_group?: boolean | null;
  allows_collective?: boolean | null;
  is_active: boolean;
  display_order?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface UpdatePlanPayload {
  name?: string;
  price_cents?: number;
  commitment?: "monthly" | "annual";
  private_sessions_per_period?: number | null;
  is_active?: boolean;
}

export interface AdminMemberOption {
  id: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
}

export interface AdminSubscriptionItem {
  id: string;
  userId: string;
  memberName: string;
  firstName: string;
  lastName: string;
  phone: string;
  planId: string;
  planName: string;
  planType: string;
  status: "active" | "paused" | "expired" | "cancelled";
  started_at: string;
  ends_at?: string | null;
  created_at: string;
}

export interface AdminSubscriptionsData {
  subscriptions: AdminSubscriptionItem[];
  plans: AdminPlanItem[];
  members: AdminMemberOption[];
  stats: {
    totalCount: number;
    activeSmallGroupCount: number;
    activeCollectiveCount: number;
    pausedCount: number;
    suspendedCount: number;
    expiredCount: number;
  };
}

export interface CreateSubscriptionPayload {
  userId: string;
  planId: string;
  status: "active" | "paused" | "expired";
  started_at: string;
  ends_at?: string | null;
}

export interface UpdateSubscriptionPayload {
  planId?: string;
  status?: "active" | "paused" | "expired" | "cancelled";
  started_at?: string;
  ends_at?: string | null;
}

export interface AdminMemberDetail {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone?: string | null;
  created_at?: string;
  updated_at?: string;
  activeSubscription?: {
    id: string;
    planId: string;
    planName: string;
    planType: string;
    status: "active" | "paused" | "expired" | "cancelled";
    started_at: string;
    ends_at?: string | null;
    private_sessions_quota?: number | null;
  } | null;
  subscriptions: Array<{
    id: string;
    planId: string;
    planName: string;
    planType: string;
    status: "active" | "paused" | "expired" | "cancelled";
    started_at: string;
    ends_at?: string | null;
    private_sessions_quota?: number | null;
    created_at: string;
  }>;
  bookings: Array<{
    id: string;
    discipline: string;
    sessionType: string;
    starts_at: string;
    ends_at?: string | null;
    status: string;
    created_at: string;
  }>;
  bookingsCount: number;
}

export interface AdminMembersPageData {
  members: AdminMemberDetail[];
  plans: AdminPlanItem[];
  stats: {
    totalMembers: number;
    withActiveSubscription: number;
    withoutSubscription: number;
    smallGroupMembers: number;
    collectiveMembers: number;
    privateMembers: number;
  };
}

export interface CreateMemberPayload {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password?: string;
  planId: string;
  subscriptionStartDate?: string;
  subscriptionEndDate?: string | null;
  subscriptionStatus?: "active" | "paused" | "expired";
  redirectTo?: string;
}

export interface UpdateMemberPayload {
  firstName?: string;
  lastName?: string;
  phone?: string;
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

function formatFrDate(isoString: string): string {
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;
  const dayName = DAY_NAMES_FR[d.getDay()];
  const day = d.getDate();
  const month = MONTH_NAMES_FR[d.getMonth()];
  return `${dayName} ${day} ${month}`;
}

function formatFrTime(isoString: string): string {
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function unwrapSingle<T>(val: T | T[] | null | undefined): T | null {
  if (!val) return null;
  if (Array.isArray(val)) return val.length > 0 ? val[0] : null;
  return val;
};

/**
 * Récupère l'ensemble des données du Dashboard Admin
 */
export async function getAdminDashboardData(
  supabase: SupabaseClient
): Promise<AdminDashboardStats> {
  try {
    // 1. Nombre total de profils membres
    const { count: totalMembersCount, error: membersError } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    if (membersError) {
      console.warn("Erreur comptage profiles :", membersError.message);
    }

    // 2. Abonnements actifs
    const { data: subscriptionsData, error: subError } = await supabase
      .from("subscriptions")
      .select("id, status, plan:plans(id, name, type)")
      .eq("status", "active");

    let smallGroupCount = 0;
    let collectiveCount = 0;

    if (!subError && subscriptionsData) {
      for (const sub of subscriptionsData) {
        const rawPlan = Array.isArray(sub.plan) ? sub.plan[0] : sub.plan;
        const pType = (rawPlan?.type || "").toLowerCase();
        if (pType === "small_group" || (rawPlan?.name || "").toLowerCase().includes("small group")) {
          smallGroupCount++;
        } else if (pType === "collective" || (rawPlan?.name || "").toLowerCase().includes("collectif")) {
          collectiveCount++;
        }
      }
    }

    // 3. Séances du jour
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const { data: todaySessions, error: sessionsError } = await supabase
      .from("class_sessions")
      .select("id, discipline, type, level, starts_at, ends_at, max_capacity, is_active")
      .gte("starts_at", startOfToday.toISOString())
      .lte("starts_at", endOfToday.toISOString())
      .order("starts_at", { ascending: true });

    const upcomingSessionsToday: AdminClassSessionSummary[] = [];
    let todayBookingsTotal = 0;

    if (!sessionsError && todaySessions && todaySessions.length > 0) {
      const sessionIds = todaySessions.map((s) => s.id);

      const { data: sessionBookings } = await supabase
        .from("bookings")
        .select("id, class_session_id")
        .in("class_session_id", sessionIds)
        .eq("status", "confirmed");

      const bookingCountsBySession = new Map<string, number>();
      if (sessionBookings) {
        for (const b of sessionBookings) {
          if (b.class_session_id) {
            bookingCountsBySession.set(
              b.class_session_id,
              (bookingCountsBySession.get(b.class_session_id) || 0) + 1
            );
          }
        }
      }

      for (const s of todaySessions) {
        const count = bookingCountsBySession.get(s.id) || 0;
        todayBookingsTotal += count;

        upcomingSessionsToday.push({
          id: s.id,
          discipline: s.discipline,
          type: s.type || "small_group",
          level: s.level,
          starts_at: s.starts_at,
          ends_at: s.ends_at,
          max_capacity: s.max_capacity || 20,
          bookedCount: count,
          is_active: s.is_active ?? true,
        });
      }
    }

    // 4. Dernières réservations enregistrées
    const { data: recentBookingsData } = await supabase
      .from("bookings")
      .select("id, user_id, class_session_id, status, created_at, profile:profiles(first_name, last_name), session:class_sessions(discipline, starts_at, ends_at)")
      .eq("status", "confirmed")
      .order("created_at", { ascending: false })
      .limit(6);

    const recentBookings: AdminBookingSummary[] = [];

    if (recentBookingsData) {
      for (const b of recentBookingsData as Record<string, unknown>[]) {
        const rawProf = Array.isArray(b.profile) ? b.profile[0] : (b.profile as Record<string, string> | null);
        const rawSess = Array.isArray(b.session) ? b.session[0] : (b.session as Record<string, string> | null);

        const memberName = rawProf
          ? `${rawProf.first_name || ""} ${rawProf.last_name || ""}`.trim() || "Membre"
          : "Membre";

        let sessionDate = "—";
        let sessionTime = "—";

        if (rawSess?.starts_at) {
          const d = new Date(rawSess.starts_at);
          sessionDate = `${DAY_NAMES_FR[d.getDay()]} ${d.getDate()} ${MONTH_NAMES_FR[d.getMonth()]}`;
          const h = String(d.getHours()).padStart(2, "0");
          const m = String(d.getMinutes()).padStart(2, "0");
          sessionTime = `${h}:${m}`;
        }

        recentBookings.push({
          id: b.id as string,
          memberName,
          sessionName: rawSess?.discipline || "Small Group",
          sessionDate,
          sessionTime,
          status: (b.status as string) || "confirmé",
          created_at: b.created_at as string,
        });
      }
    }

    // 5. Événements à venir (Supabase en priorité, repli gracieux sur clubEvents)
    let featuredEvents: ClubEvent[] = [];
    try {
      const { data: dbEvents, error: eventsErr } = await supabase
        .from("events")
        .select("*")
        .in("status", ["published", "confirmed"])
        .order("is_featured", { ascending: false })
        .order("starts_at", { ascending: true, nullsFirst: false })
        .limit(3);

      if (!eventsErr && dbEvents && dbEvents.length > 0) {
        const { mapDbEventToClubEvent } = await import("./events");
        featuredEvents = dbEvents.map(mapDbEventToClubEvent);
      } else {
        featuredEvents = clubEvents
          .filter((e) => e.status === "published" || e.status === "confirmed")
          .slice(0, 3);
      }
    } catch {
      featuredEvents = clubEvents
        .filter((e) => e.status === "published" || e.status === "confirmed")
        .slice(0, 3);
    }

    return {
      totalMembers: totalMembersCount || 0,
      activeSubscriptionsCount: subscriptionsData?.length || 0,
      smallGroupSubscriptionsCount: smallGroupCount,
      collectiveSubscriptionsCount: collectiveCount,
      todayBookingsCount: todayBookingsTotal,
      upcomingSessionsToday,
      recentBookings,
      featuredEvents,
    };
  } catch (err) {
    console.error("Erreur récupération données Admin Dashboard :", err);
    return {
      totalMembers: 0,
      activeSubscriptionsCount: 0,
      smallGroupSubscriptionsCount: 0,
      collectiveSubscriptionsCount: 0,
      todayBookingsCount: 0,
      upcomingSessionsToday: [],
      recentBookings: [],
      featuredEvents: clubEvents.slice(0, 3),
    };
  }
}

/**
 * Récupère toutes les séances de la semaine avec le nombre réel d'inscrits pour l'Admin
 */
export async function getAdminWeeklyPlanning(
  supabase: SupabaseClient,
  startDateISO: string,
  endDateISO: string
): Promise<AdminClassSessionSummary[]> {
  const { data: sessions, error } = await supabase
    .from("class_sessions")
    .select("id, discipline, type, level, starts_at, ends_at, max_capacity, is_active")
    .gte("starts_at", startDateISO)
    .lte("starts_at", endDateISO)
    .order("starts_at", { ascending: true });

  if (error) {
    console.error("Erreur récupération planning admin :", {
      message: error.message,
      code: error.code,
    });
    return [];
  }

  if (!sessions || sessions.length === 0) {
    return [];
  }

  const sessionIds = sessions.map((s) => s.id);

  const { data: sessionBookings, error: bookingsError } = await supabase
    .from("bookings")
    .select("id, class_session_id")
    .in("class_session_id", sessionIds)
    .eq("status", "confirmed");

  if (bookingsError) {
    console.warn("Erreur récupération bookings pour planning admin :", bookingsError.message);
  }

  const bookingCountsMap = new Map<string, number>();
  if (sessionBookings) {
    for (const b of sessionBookings) {
      if (b.class_session_id) {
        bookingCountsMap.set(
          b.class_session_id,
          (bookingCountsMap.get(b.class_session_id) || 0) + 1
        );
      }
    }
  }

  return sessions.map((s) => ({
    id: s.id,
    discipline: s.discipline,
    type: s.type || "small_group",
    level: s.level,
    starts_at: s.starts_at,
    ends_at: s.ends_at,
    max_capacity: s.max_capacity || (s.type === "collective" ? 50 : 20),
    bookedCount: bookingCountsMap.get(s.id) || 0,
    is_active: s.is_active ?? true,
  }));
}

/**
 * Récupère les réservations réelles et l'émargement d'une séance spécifique pour l'Admin
 */
export async function getAdminSessionReservations(
  supabase: SupabaseClient,
  sessionId?: string | null
): Promise<AdminSessionReservationsData> {
  try {
    // 1. Récupération de toutes les séances disponibles pour le sélecteur
    const { data: allSessionsRaw, error: allSessErr } = await supabase
      .from("class_sessions")
      .select("id, discipline, type, level, starts_at, ends_at, max_capacity, is_active")
      .order("starts_at", { ascending: true });

    if (allSessErr) {
      console.error("Erreur chargement liste séances pour réservations :", allSessErr);
    }

    const allSessions = allSessionsRaw || [];
    const allSessionIds = allSessions.map((s) => s.id);

    // Comptage des réservations confirmées par séance
    const { data: allBookingsCount } = await supabase
      .from("bookings")
      .select("id, class_session_id")
      .in("class_session_id", allSessionIds)
      .eq("status", "confirmed");

    const countsMap = new Map<string, number>();
    if (allBookingsCount) {
      for (const b of allBookingsCount) {
        if (b.class_session_id) {
          countsMap.set(
            b.class_session_id,
            (countsMap.get(b.class_session_id) || 0) + 1
          );
        }
      }
    }

    const allSessionsList: AdminClassSessionSummary[] = allSessions.map((s) => ({
      id: s.id,
      discipline: s.discipline,
      type: s.type || "small_group",
      level: s.level,
      starts_at: s.starts_at,
      ends_at: s.ends_at,
      max_capacity: s.max_capacity || 20,
      bookedCount: countsMap.get(s.id) || 0,
      is_active: s.is_active ?? true,
    }));

    // 2. Déterminer la séance active (celle fournie en paramètre ou la première par défaut)
    let activeSessionRaw = allSessions.find((s) => s.id === sessionId);
    if (!activeSessionRaw && allSessions.length > 0) {
      activeSessionRaw = allSessions[0];
    }

    if (!activeSessionRaw) {
      return {
        session: null,
        participants: [],
        allSessionsList,
      };
    }

    const activeSession: AdminClassSessionSummary = {
      id: activeSessionRaw.id,
      discipline: activeSessionRaw.discipline,
      type: activeSessionRaw.type || "small_group",
      level: activeSessionRaw.level,
      starts_at: activeSessionRaw.starts_at,
      ends_at: activeSessionRaw.ends_at,
      max_capacity: activeSessionRaw.max_capacity || 20,
      bookedCount: countsMap.get(activeSessionRaw.id) || 0,
      is_active: activeSessionRaw.is_active ?? true,
    };

    // 3. Récupérer toutes les réservations de cette séance spécifique
    const { data: bookingsData, error: bError } = await supabase
      .from("bookings")
      .select("id, user_id, class_session_id, status, attendance_status, attended_at, created_at")
      .eq("class_session_id", activeSession.id)
      .order("created_at", { ascending: true });

    if (bError) {
      console.error("Erreur récupération réservations séance :", bError);
      return {
        session: activeSession,
        participants: [],
        allSessionsList,
      };
    }

    const bookings = bookingsData || [];
    if (bookings.length === 0) {
      return {
        session: activeSession,
        participants: [],
        allSessionsList,
      };
    }

    const userIds = Array.from(new Set(bookings.map((b) => b.user_id)));

    // 4. Récupérer les profils des participants
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, phone")
      .in("id", userIds);

    const profilesMap = new Map<string, { first_name?: string; last_name?: string; phone?: string }>();
    if (profilesData) {
      for (const p of profilesData) {
        profilesMap.set(p.id, p);
      }
    }

    // 5. Récupérer les abonnements actifs des participants
    const { data: subsData } = await supabase
      .from("subscriptions")
      .select("id, user_id, status, plan:plans(name, type)")
      .in("user_id", userIds)
      .eq("status", "active");

    const subsMap = new Map<string, string>();
    if (subsData) {
      for (const sub of subsData) {
        const rawPlan = Array.isArray(sub.plan) ? sub.plan[0] : sub.plan;
        if (rawPlan?.name) {
          subsMap.set(sub.user_id, rawPlan.name);
        }
      }
    }

    // 6. Assembler la liste des participants avec l'émargement réel
    const participants: AdminBookingParticipant[] = bookings.map((b) => {
      const prof = profilesMap.get(b.user_id);
      const memberName = prof
        ? `${prof.first_name || ""} ${rawProf(prof.first_name, prof.last_name)}`.trim() || "Membre"
        : "Membre";

      const phone = prof?.phone || "—";
      const planName = subsMap.get(b.user_id) || "Formule Active";

      let formattedDate = "—";
      if (b.created_at) {
        const d = new Date(b.created_at);
        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const hours = String(d.getHours()).padStart(2, "0");
        const mins = String(d.getMinutes()).padStart(2, "0");
        formattedDate = `${day}/${month}/${d.getFullYear()} à ${hours}:${mins}`;
      }

      let formattedAttendedAt: string | null = null;
      if (b.attended_at) {
        const ad = new Date(b.attended_at);
        const ah = String(ad.getHours()).padStart(2, "0");
        const am = String(ad.getMinutes()).padStart(2, "0");
        formattedAttendedAt = `${ah}:${am}`;
      }

      const rawAttStatus = (b.attendance_status as "pending" | "present" | "absent") || "pending";

      return {
        bookingId: b.id,
        userId: b.user_id,
        memberName: prof ? `${prof.first_name || ""} ${prof.last_name || ""}`.trim() : "Membre",
        phone,
        planName,
        status: b.status || "confirmed",
        attendanceStatus: rawAttStatus,
        attendedAt: formattedAttendedAt,
        createdAt: formattedDate,
      };
    });

    return {
      session: activeSession,
      participants,
      allSessionsList,
    };
  } catch (err) {
    console.error("Erreur getAdminSessionReservations :", err);
    return {
      session: null,
      participants: [],
      allSessionsList: [],
    };
  }
}

function rawProf(first?: string, last?: string): string {
  return `${last || ""}`.trim();
}

/**
 * Convertit un timestamp ISO ou objet Date en YYYY-MM-DD strict en heure de Paris
 */
export function formatToParisDate(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  return new Intl.DateTimeFormat("fr-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/**
 * Convertit un timestamp ISO ou objet Date en HH:MM strict en heure de Paris
 */
export function formatToParisTime(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

/**
 * Récupère toutes les séances (Small Group & Privées) et toutes les réservations d'une semaine.
 * SOURCE DE VÉRITÉ : Le planning officiel est défini par `recurring_schedule_templates`.
 * Les réservations réelles proviennent de `class_sessions` -> `bookings`.
 * Protection absolue des séances ayant des réservations réelles existantes.
 */
export async function getAdminWeeklyReservationsData(
  supabase: SupabaseClient,
  mondayStr: string,
  saturdayStr: string
): Promise<AdminWeeklyReservationsData> {
  try {
    // Calcul précis des dates du Lundi au Samedi (index 0 à 5)
    const mondayParts = mondayStr.split("-").map(Number);
    const dayDateStrings: string[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(Date.UTC(mondayParts[0], mondayParts[1] - 1, mondayParts[2] + i, 12, 0, 0));
      const yyyy = d.getUTCFullYear();
      const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
      const dd = String(d.getUTCDate()).padStart(2, "0");
      dayDateStrings.push(`${yyyy}-${mm}-${dd}`);
    }

    // 1. Récupération des templates récurrents officiels Small Group (SOURCE DE VÉRITÉ)
    const { data: rawTemplates, error: tmplErr } = await supabase
      .from("recurring_schedule_templates")
      .select("id, day_of_week, start_time, end_time, type, discipline, level, max_capacity, is_active")
      .eq("is_active", true)
      .eq("type", "small_group")
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true });

    if (tmplErr) {
      console.error("[getAdminWeeklyReservationsData] Erreur templates récurrents :", tmplErr);
    }

    // 2. Récupération des séances physiques de la plage (avec marge 1 jour avant/après pour UTC)
    const rangeStart = new Date(`${mondayStr}T00:00:00Z`);
    rangeStart.setDate(rangeStart.getDate() - 1);
    const rangeEnd = new Date(`${saturdayStr}T23:59:59Z`);
    rangeEnd.setDate(rangeEnd.getDate() + 2);

    const { data: rawSessions, error: sessErr } = await supabase
      .from("class_sessions")
      .select("id, template_id, discipline, type, level, starts_at, ends_at, max_capacity, is_active")
      .gte("starts_at", rangeStart.toISOString())
      .lte("starts_at", rangeEnd.toISOString())
      .order("starts_at", { ascending: true });

    if (sessErr) {
      console.error("[getAdminWeeklyReservationsData] Erreur sessions :", sessErr);
    }

    // Filtrage déterministe en fuseau horaire Europe/Paris
    const weekSessions = (rawSessions || []).filter((s) => {
      const pDate = formatToParisDate(s.starts_at);
      return pDate >= mondayStr && pDate <= saturdayStr;
    });

    const sessionIds = weekSessions.map((s) => s.id);

    // 3. Récupération des réservations réelles associées
    let allBookings: any[] = [];
    if (sessionIds.length > 0) {
      const { data: bData, error: bErr } = await supabase
        .from("bookings")
        .select("id, user_id, class_session_id, status, attendance_status, attended_at, is_late_cancellation, cancellation_reason, created_at")
        .in("class_session_id", sessionIds)
        .order("created_at", { ascending: true });

      if (bErr) {
        console.error("[getAdminWeeklyReservationsData] Erreur bookings :", bErr);
      } else {
        allBookings = bData || [];
      }
    }

    // 4. Récupération des profils et abonnements des membres
    const userIds = Array.from(new Set(allBookings.map((b) => b.user_id)));
    const profilesMap = new Map<string, { first_name?: string; last_name?: string; phone?: string }>();
    const subsMap = new Map<string, string>();

    if (userIds.length > 0) {
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, phone")
        .in("id", userIds);

      if (profilesData) {
        for (const p of profilesData) {
          profilesMap.set(p.id, p);
        }
      }

      const { data: subsData } = await supabase
        .from("subscriptions")
        .select("id, user_id, status, plan:plans(name, type)")
        .in("user_id", userIds)
        .eq("status", "active");

      if (subsData) {
        for (const sub of subsData) {
          const rawPlan = Array.isArray(sub.plan) ? sub.plan[0] : sub.plan;
          if (rawPlan?.name) {
            subsMap.set(sub.user_id, rawPlan.name);
          }
        }
      }
    }

    // 5. Indexation des réservations par class_session_id
    const bookingsBySessionId: Record<string, AdminBookingParticipant[]> = {};
    const confirmedCountsMap = new Map<string, number>();

    for (const b of allBookings) {
      const prof = profilesMap.get(b.user_id);
      const memberName = prof
        ? `${prof.first_name || ""} ${rawProf(prof.first_name, prof.last_name)}`.trim() || "Membre"
        : "Membre";

      const phone = prof?.phone || "—";
      const planName = subsMap.get(b.user_id) || "Formule Active";

      let formattedDate = "—";
      if (b.created_at) {
        const d = new Date(b.created_at);
        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const hours = String(d.getHours()).padStart(2, "0");
        const mins = String(d.getMinutes()).padStart(2, "0");
        formattedDate = `${day}/${month}/${d.getFullYear()} à ${hours}:${mins}`;
      }

      let formattedAttendedAt: string | null = null;
      if (b.attended_at) {
        const ad = new Date(b.attended_at);
        const ah = String(ad.getHours()).padStart(2, "0");
        const am = String(ad.getMinutes()).padStart(2, "0");
        formattedAttendedAt = `${ah}:${am}`;
      }

      const participant: AdminBookingParticipant = {
        bookingId: b.id,
        userId: b.user_id,
        memberName,
        phone,
        planName,
        status: b.status || "confirmed",
        attendanceStatus: (b.attendance_status as "pending" | "present" | "absent") || "pending",
        attendedAt: formattedAttendedAt,
        createdAt: formattedDate,
        cancellationReason: b.cancellation_reason || null,
        isLateCancellation: Boolean(b.is_late_cancellation),
      };

      if (!bookingsBySessionId[b.class_session_id]) {
        bookingsBySessionId[b.class_session_id] = [];
      }
      bookingsBySessionId[b.class_session_id].push(participant);

      if (b.status === "confirmed") {
        confirmedCountsMap.set(
          b.class_session_id,
          (confirmedCountsMap.get(b.class_session_id) || 0) + 1
        );
      }
    }

    // 6. Extraction des Cours Privés (max_capacity = 1)
    const privateSessions: AdminClassSessionSummary[] = [];
    for (const s of weekSessions) {
      const rawType = (s.type || "").toLowerCase().trim();
      const isPriv =
        rawType === "private" ||
        rawType === "prive" ||
        (s.discipline || "").toLowerCase().includes("privé") ||
        (s.discipline || "").toLowerCase().includes("prive");

      if (isPriv) {
        privateSessions.push({
          id: s.id,
          discipline: s.discipline,
          type: "private",
          level: s.level || "Individuel",
          starts_at: s.starts_at,
          ends_at: s.ends_at,
          max_capacity: s.max_capacity || 1,
          bookedCount: confirmedCountsMap.get(s.id) || 0,
          is_active: s.is_active ?? true,
        });
      }
    }

    // 7. Construction du planning officiel SMALL GROUP
    // On exclut les cours collectifs (type = 'collective') et les cours privés
    const physicalSmallGroupSessions = weekSessions.filter((s) => {
      const rawType = (s.type || "").toLowerCase().trim();
      const isPriv =
        rawType === "private" ||
        rawType === "prive" ||
        (s.discipline || "").toLowerCase().includes("privé") ||
        (s.discipline || "").toLowerCase().includes("prive");
      const isCol = rawType === "collective";
      return !isPriv && !isCol;
    });

    const smallGroupSessions: AdminClassSessionSummary[] = [];
    const matchedPhysicalSessionIds = new Set<string>();

    // Étape A : Pour chaque jour (Lundi = 0 ... Samedi = 5), projeter les templates officiels
    for (let dayIdx = 0; dayIdx < 6; dayIdx++) {
      const dayDateStr = dayDateStrings[dayIdx];
      const dayTemplates = (rawTemplates || []).filter((t) => t.day_of_week === dayIdx);

      for (const t of dayTemplates) {
        const tmplStartHm = t.start_time.slice(0, 5);
        const tmplEndHm = t.end_time.slice(0, 5);

        // Recherche d'une session physique correspondante sur cette date
        const match = physicalSmallGroupSessions.find((ps) => {
          if (matchedPhysicalSessionIds.has(ps.id)) return false;
          const pDate = formatToParisDate(ps.starts_at);
          if (pDate !== dayDateStr) return false;

          // Correspondance par template_id prioritaire
          if (ps.template_id && ps.template_id === t.id) return true;

          // Ou correspondance par heure locale Paris + discipline
          const pTime = formatToParisTime(ps.starts_at);
          if (pTime === tmplStartHm && (ps.discipline.toLowerCase() === t.discipline.toLowerCase() || ps.template_id === t.id)) {
            return true;
          }
          return false;
        });

        if (match) {
          matchedPhysicalSessionIds.add(match.id);
          smallGroupSessions.push({
            id: match.id,
            discipline: t.discipline,
            type: "small_group",
            level: t.level || match.level || "Tous niveaux",
            starts_at: match.starts_at,
            ends_at: match.ends_at,
            max_capacity: t.max_capacity || match.max_capacity || 20,
            bookedCount: confirmedCountsMap.get(match.id) || 0,
            is_active: match.is_active ?? true,
          });
        } else {
          // Créneau officiel non encore matérialisé dans class_sessions :
          // Affichage officiel obligatoire avec 0 / 20 inscrits
          const virtualId = `tmpl_${t.id}_${dayDateStr}`;
          const virtualStartIso = `${dayDateStr}T${tmplStartHm}:00+02:00`;
          const virtualEndIso = `${dayDateStr}T${tmplEndHm}:00+02:00`;

          smallGroupSessions.push({
            id: virtualId,
            discipline: t.discipline,
            type: "small_group",
            level: t.level || "Tous niveaux",
            starts_at: virtualStartIso,
            ends_at: virtualEndIso,
            max_capacity: t.max_capacity || 20,
            bookedCount: 0,
            is_active: true,
          });
        }
      }
    }

    // Étape B : Protection absolue des séances ayant des réservations existantes !
    // Si une session physique possède au moins une réservation confirmée mais n'a pas été
    // rattachée à un template officiel (séance ponctuelle ou historique), elle est préservée.
    for (const ps of physicalSmallGroupSessions) {
      if (!matchedPhysicalSessionIds.has(ps.id)) {
        const count = confirmedCountsMap.get(ps.id) || 0;
        if (count > 0) {
          smallGroupSessions.push({
            id: ps.id,
            discipline: ps.discipline,
            type: "small_group",
            level: ps.level || "Session exceptionnelle",
            starts_at: ps.starts_at,
            ends_at: ps.ends_at,
            max_capacity: ps.max_capacity || 20,
            bookedCount: count,
            is_active: ps.is_active ?? true,
          });
        }
      }
    }

    // Tri chronologique des séances Small Group
    smallGroupSessions.sort(
      (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
    );

    return {
      weekMonday: mondayStr,
      weekSaturday: saturdayStr,
      smallGroupSessions,
      privateSessions,
      bookingsBySessionId,
    };
  } catch (err) {
    console.error("[getAdminWeeklyReservationsData] Exception :", err);
    return {
      weekMonday: mondayStr,
      weekSaturday: saturdayStr,
      smallGroupSessions: [],
      privateSessions: [],
      bookingsBySessionId: {},
    };
  }
}

/**
 * Pointe la présence d'un membre à une séance via la RPC admin_mark_attendance (Admin uniquement)
 */
export async function markAttendanceAdmin(
  supabase: SupabaseClient,
  bookingId: string,
  status: "pending" | "present" | "absent"
): Promise<{ success: boolean; error?: string; attendanceStatus?: string; attendedAt?: string | null }> {
  const { data, error } = await supabase.rpc("admin_mark_attendance", {
    p_booking_id: bookingId,
    p_status: status,
  });

  if (error) {
    console.error("Erreur RPC admin_mark_attendance :", error);
    return { success: false, error: error.message };
  }

  if (data && typeof data === "object") {
    if (!data.success) {
      return {
        success: false,
        error: (data.error as string) || "Impossible d'enregistrer l'émargement.",
      };
    }

    return {
      success: true,
      attendanceStatus: data.attendance_status as string,
      attendedAt: data.attended_at as string | null,
    };
  }

  return { success: false, error: "Réponse inattendue du serveur." };
}

/**
 * Créer une nouvelle séance dans public.class_sessions (Admin uniquement)
 */
export async function createClassSessionAdmin(
  supabase: SupabaseClient,
  formData: AdminSessionFormData
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const { data, error } = await supabase
    .from("class_sessions")
    .insert([
      {
        discipline: formData.discipline.trim(),
        type: formData.type,
        level: formData.level?.trim() || null,
        starts_at: formData.starts_at,
        ends_at: formData.ends_at,
        max_capacity: formData.max_capacity || (formData.type === "collective" ? 50 : 20),
        is_active: formData.is_active ?? true,
      },
    ])
    .select("id")
    .single();

  if (error) {
    console.error("Erreur création class_sessions par admin :", error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Mettre à jour une séance existante dans public.class_sessions (Admin uniquement)
 */
export async function updateClassSessionAdmin(
  supabase: SupabaseClient,
  sessionId: string,
  formData: Partial<AdminSessionFormData>
): Promise<{ success: boolean; error?: string }> {
  const payload: Record<string, unknown> = {};
  if (formData.discipline !== undefined) payload.discipline = formData.discipline.trim();
  if (formData.type !== undefined) payload.type = formData.type;
  if (formData.level !== undefined) payload.level = formData.level?.trim() || null;
  if (formData.starts_at !== undefined) payload.starts_at = formData.starts_at;
  if (formData.ends_at !== undefined) payload.ends_at = formData.ends_at;
  if (formData.max_capacity !== undefined) payload.max_capacity = formData.max_capacity;
  if (formData.is_active !== undefined) payload.is_active = formData.is_active;

  const { error } = await supabase
    .from("class_sessions")
    .update(payload)
    .eq("id", sessionId);

  if (error) {
    console.error("Erreur modification class_sessions par admin :", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Activer ou désactiver une séance (Admin uniquement)
 */
export async function toggleClassSessionActiveAdmin(
  supabase: SupabaseClient,
  sessionId: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from("class_sessions")
    .update({ is_active: isActive })
    .eq("id", sessionId);

  if (error) {
    console.error("Erreur changement statut class_sessions par admin :", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Récupère l'ensemble des abonnements, formules et membres pour la gestion Admin
 */
export async function getAdminSubscriptionsData(
  supabase: SupabaseClient
): Promise<AdminSubscriptionsData> {
  try {
    // DIAGNOSTIC TEMPORAIRE AUTH
    const { data: authUser, error: authUserError } = await supabase.auth.getUser();
    const userRole = authUser?.user?.app_metadata?.role;
    console.log("DIAGNOSTIC AUTH ADMIN >>>", {
      userId: authUser?.user?.id ?? "N/A",
      email: authUser?.user?.email ?? "N/A",
      app_metadata_role: userRole ?? "AUCUN_ROLE",
      user_metadata_role: authUser?.user?.user_metadata?.role ?? "N/A",
      auth_error: authUserError?.message ?? null,
    });

    // 1. Récupérer toutes les formules depuis public.plans (diagnostic exhaustif select *)
    const { data: plansData, error: plansError } = await supabase
      .from("plans")
      .select("*")
      .order("name", { ascending: true });

    console.log("DIAGNOSTIC PLANS COMPLET >>>", {
      count: plansData?.length ?? 0,
      raw_rows: plansData ?? [],
      error: plansError
        ? `message=${plansError.message} | code=${plansError.code} | details=${plansError.details} | hint=${plansError.hint}`
        : null,
    });

    const plans: AdminPlanItem[] = (plansData || []).map((p: Record<string, unknown>) => ({
      id: (p.id as string) || "",
      name: (p.name as string) || (p.title as string) || "Formule",
      code: (p.code as string) || null,
      type: (((p.type as string) || (p.category as string) || "small_group") as string).toLowerCase(),
      commitment: (p.commitment as "monthly" | "annual" | null) || "monthly",
      price_cents: typeof p.price_cents === "number" ? p.price_cents : 0,
      private_sessions_per_period: typeof p.private_sessions_per_period === "number" ? p.private_sessions_per_period : null,
      allows_private: typeof p.allows_private === "boolean" ? p.allows_private : null,
      allows_small_group: typeof p.allows_small_group === "boolean" ? p.allows_small_group : null,
      allows_collective: typeof p.allows_collective === "boolean" ? p.allows_collective : null,
      is_active: p.is_active !== false,
      display_order: typeof p.display_order === "number" ? p.display_order : 0,
    }));

    // 2. Récupérer tous les membres depuis public.profiles (diagnostic exhaustif select *)
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("*");

    console.log("DIAGNOSTIC PROFILES COMPLET >>>", {
      count: profilesData?.length ?? 0,
      columns_found: profilesData && profilesData.length > 0 ? Object.keys(profilesData[0]) : [],
      raw_rows: profilesData ?? [],
      error: profilesError
        ? `message=${profilesError.message} | code=${profilesError.code} | details=${profilesError.details} | hint=${profilesError.hint}`
        : null,
    });

    const members: AdminMemberOption[] = (profilesData || []).map((p: Record<string, unknown>) => ({
      id: (p.id as string) || "",
      first_name: (p.first_name as string) || (p.firstname as string) || (p.name as string) || "",
      last_name: (p.last_name as string) || (p.lastname as string) || "",
      phone: (p.phone as string) || (p.telephone as string) || null,
    }));

    const profilesMap = new Map<string, { first_name: string; last_name: string; phone: string }>();
    for (const m of members) {
      profilesMap.set(m.id, {
        first_name: m.first_name,
        last_name: m.last_name,
        phone: m.phone || "—",
      });
    }

    const plansMap = new Map<string, AdminPlanItem>();
    for (const p of plans) {
      plansMap.set(p.id, p);
    }

    // 3. Récupérer tous les abonnements depuis public.subscriptions
    const { data: subsData, error: subsError } = await supabase
      .from("subscriptions")
      .select(
        "id, user_id, plan_id, status, started_at, ends_at, created_at, plan:plans(id, name, type, commitment, allows_private, allows_small_group, allows_collective)"
      )
      .order("created_at", { ascending: false });

    if (subsError) {
      const errorDetails = [
        `message=${subsError.message ?? "N/A"}`,
        `code=${subsError.code ?? "N/A"}`,
        `details=${subsError.details ?? "N/A"}`,
        `hint=${subsError.hint ?? "N/A"}`,
      ].join(" | ");

      console.error("ERREUR SUPABASE SUBSCRIPTIONS >>> " + errorDetails);
    }

    let activeSmallGroupCount = 0;
    let activeCollectiveCount = 0;
    let pausedCount = 0;
    let expiredCount = 0;

    const subscriptions: AdminSubscriptionItem[] = [];

    if (subsData) {
      for (const s of subsData as Record<string, unknown>[]) {
        const rawPlan = Array.isArray(s.plan) ? s.plan[0] : (s.plan as Record<string, unknown> | null);
        const planId = (s.plan_id as string) || (rawPlan?.id as string) || "";
        const fallbackPlan = plansMap.get(planId);

        const planName = (rawPlan?.name as string) || fallbackPlan?.name || "Formule non définie";
        const planType = ((rawPlan?.type as string) || fallbackPlan?.type || "small_group").toLowerCase();

        const prof = profilesMap.get(s.user_id as string);
        const firstName = prof?.first_name || "";
        const lastName = prof?.last_name || "";
        const memberName = `${firstName} ${lastName}`.trim() || "Membre";
        const phone = prof?.phone || "—";

        const rawStatus = (s.status as string) || "active";
        let status: "active" | "paused" | "expired" | "cancelled" = "active";
        if (rawStatus === "suspended" || rawStatus === "paused") {
          status = "paused";
          pausedCount++;
        } else if (rawStatus === "expired") {
          status = "expired";
          expiredCount++;
        } else if (rawStatus === "cancelled") {
          status = "cancelled";
        } else {
          status = "active";
          if (planType === "small_group" || planName.toLowerCase().includes("small group")) {
            activeSmallGroupCount++;
          } else if (planType === "collective" || planName.toLowerCase().includes("collectif")) {
            activeCollectiveCount++;
          }
        }

        subscriptions.push({
          id: s.id as string,
          userId: s.user_id as string,
          memberName,
          firstName,
          lastName,
          phone,
          planId,
          planName,
          planType,
          status,
          started_at: (s.started_at as string) || (s.created_at as string) || new Date().toISOString(),
          ends_at: (s.ends_at as string) || null,
          created_at: (s.created_at as string) || new Date().toISOString(),
        });
      }
    }

    return {
      subscriptions,
      plans,
      members,
      stats: {
        totalCount: subscriptions.length,
        activeSmallGroupCount,
        activeCollectiveCount,
        pausedCount,
        suspendedCount: pausedCount,
        expiredCount,
      },
    };
  } catch (err) {
    console.error("Erreur getAdminSubscriptionsData :", err);
    return {
      subscriptions: [],
      plans: [],
      members: [],
      stats: {
        totalCount: 0,
        activeSmallGroupCount: 0,
        activeCollectiveCount: 0,
        pausedCount: 0,
        suspendedCount: 0,
        expiredCount: 0,
      },
    };
  }
}

/**
 * Créer / Attribuer un abonnement à un membre (Admin uniquement)
 */
export async function createSubscriptionAdmin(
  supabase: SupabaseClient,
  payload: CreateSubscriptionPayload
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    if (!payload.userId) {
      return { success: false, error: "Veuillez sélectionner un membre." };
    }
    if (!payload.planId) {
      return { success: false, error: "Veuillez sélectionner une formule." };
    }
    if (!payload.started_at) {
      return { success: false, error: "Veuillez renseigner une date de début." };
    }

    if (payload.ends_at) {
      const startMs = new Date(payload.started_at).getTime();
      const endMs = new Date(payload.ends_at).getTime();
      if (endMs <= startMs) {
        return { success: false, error: "La date de fin doit être postérieure à la date de début." };
      }
    }

    const rawStatus = payload.status || "active";
    const dbStatus = rawStatus === ("suspended" as string) ? "paused" : rawStatus;

    const insertData: Record<string, unknown> = {
      user_id: payload.userId,
      plan_id: payload.planId,
      status: dbStatus,
      started_at: payload.started_at,
      ends_at: payload.ends_at || null,
    };

    const { data, error } = await supabase
      .from("subscriptions")
      .insert([insertData])
      .select("id")
      .single();

    if (error) {
      console.error("Erreur création abonnement :", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    console.error("Erreur createSubscriptionAdmin :", err);
    return { success: false, error: (err as Error).message || "Erreur inconnue." };
  }
}

/**
 * Modifier un abonnement existant (Admin uniquement)
 */
export async function updateSubscriptionAdmin(
  supabase: SupabaseClient,
  subscriptionId: string,
  payload: UpdateSubscriptionPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!subscriptionId) {
      return { success: false, error: "Identifiant d'abonnement manquant." };
    }

    if (payload.started_at && payload.ends_at) {
      const startMs = new Date(payload.started_at).getTime();
      const endMs = new Date(payload.ends_at).getTime();
      if (endMs <= startMs) {
        return { success: false, error: "La date de fin doit être postérieure à la date de début." };
      }
    }

    const updateData: Record<string, unknown> = {};
    if (payload.planId !== undefined) updateData.plan_id = payload.planId;
    if (payload.status !== undefined) {
      updateData.status = payload.status === ("suspended" as string) ? "paused" : payload.status;
    }
    if (payload.started_at !== undefined) updateData.started_at = payload.started_at;
    if (payload.ends_at !== undefined) updateData.ends_at = payload.ends_at;

    const { error } = await supabase
      .from("subscriptions")
      .update(updateData)
      .eq("id", subscriptionId);

    if (error) {
      console.error("Erreur modification abonnement :", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("Erreur updateSubscriptionAdmin :", err);
    return { success: false, error: (err as Error).message || "Erreur inconnue." };
  }
}

/**
 * Changer le statut d'un abonnement (Admin uniquement)
 */
export async function toggleSubscriptionStatusAdmin(
  supabase: SupabaseClient,
  subscriptionId: string,
  newStatus: "active" | "paused" | "expired" | "cancelled"
): Promise<{ success: boolean; error?: string }> {
  try {
    const dbStatus = newStatus === ("suspended" as string) ? "paused" : newStatus;
    const { error } = await supabase
      .from("subscriptions")
      .update({ status: dbStatus })
      .eq("id", subscriptionId);

    if (error) {
      console.error("Erreur changement statut abonnement :", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("Erreur toggleSubscriptionStatusAdmin :", err);
    return { success: false, error: (err as Error).message || "Erreur inconnue." };
  }
}

/**
 * Récupère la liste complète des formules pour l'administration (/admin/formules)
 */
export async function getAdminPlansData(
  supabase: SupabaseClient
): Promise<AdminPlanItem[]> {
  try {
    const { data, error } = await supabase
      .from("plans")
      .select("id, name, code, type, commitment, price_cents, private_sessions_per_period, is_active, display_order, created_at, updated_at")
      .order("display_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      console.error("Erreur getAdminPlansData :", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      return [];
    }

    return (data || []).map((p: Record<string, unknown>) => ({
      id: (p.id as string) || "",
      name: (p.name as string) || "Formule",
      code: (p.code as string) || null,
      type: (((p.type as string) || "small_group") as string).toLowerCase(),
      commitment: (p.commitment as "monthly" | "annual" | null) || "monthly",
      price_cents: typeof p.price_cents === "number" ? p.price_cents : 0,
      private_sessions_per_period: typeof p.private_sessions_per_period === "number" ? p.private_sessions_per_period : null,
      is_active: p.is_active !== false,
      display_order: typeof p.display_order === "number" ? p.display_order : 0,
      created_at: (p.created_at as string) || undefined,
      updated_at: (p.updated_at as string) || undefined,
    }));
  } catch (err) {
    console.error("Erreur getAdminPlansData :", err);
    return [];
  }
}

/**
 * Modifier une formule existante (Admin uniquement)
 */
export async function updatePlanAdmin(
  supabase: SupabaseClient,
  planId: string,
  payload: UpdatePlanPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!planId) {
      return { success: false, error: "Identifiant de la formule manquant." };
    }

    if (payload.price_cents !== undefined && payload.price_cents < 0) {
      return { success: false, error: "Le tarif mensuel ne peut pas être négatif." };
    }

    if (payload.private_sessions_per_period !== undefined && payload.private_sessions_per_period !== null) {
      if (payload.private_sessions_per_period !== 8) {
        return { success: false, error: "Le nombre de séances privées doit être strictement de 8." };
      }
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (payload.name !== undefined) updateData.name = payload.name.trim();
    if (payload.price_cents !== undefined) updateData.price_cents = Math.round(payload.price_cents);
    if (payload.commitment !== undefined) updateData.commitment = payload.commitment;
    if (payload.private_sessions_per_period !== undefined) updateData.private_sessions_per_period = payload.private_sessions_per_period;
    if (payload.is_active !== undefined) updateData.is_active = payload.is_active;

    const { error } = await supabase
      .from("plans")
      .update(updateData)
      .eq("id", planId);

    if (error) {
      console.error("Erreur modification formule :", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("Erreur updatePlanAdmin :", err);
    return { success: false, error: (err as Error).message || "Erreur inconnue." };
  }
}

/**
 * Activer ou Désactiver une formule (Admin uniquement)
 */
export async function togglePlanStatusAdmin(
  supabase: SupabaseClient,
  planId: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!planId) {
      return { success: false, error: "Identifiant de la formule manquant." };
    }

    const { error } = await supabase
      .from("plans")
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", planId);

    if (error) {
      console.error("Erreur toggle statut formule :", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("Erreur togglePlanStatusAdmin :", err);
    return { success: false, error: (err as Error).message || "Erreur inconnue." };
  }
}

/**
 * Récupère l'ensemble des membres, leurs abonnements et leurs réservations pour /admin/membres
 */
export async function getAdminMembersData(
  supabase: SupabaseClient
): Promise<AdminMembersPageData> {
  try {
    // 1. Récupérer les profils membres
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, phone, created_at, updated_at")
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true });

    if (profilesError) {
      console.error("Erreur getAdminMembersData (profiles) :", profilesError);
    }

    // 2. Récupérer tous les abonnements avec jointure sur plans
    const { data: subscriptionsData, error: subError } = await supabase
      .from("subscriptions")
      .select(
        "id, user_id, plan_id, status, started_at, ends_at, private_sessions_quota, created_at, plan:plans(id, name, type, price_cents, commitment, private_sessions_per_period, allows_private, allows_small_group, allows_collective)"
      )
      .order("created_at", { ascending: false });

    if (subError) {
      console.error("Erreur getAdminMembersData (subscriptions) :", subError);
    }

    // 3. Récupérer toutes les réservations avec jointure sur class_sessions
    const { data: bookingsData, error: bookingsError } = await supabase
      .from("bookings")
      .select("id, user_id, class_session_id, status, created_at, class_session:class_sessions(id, discipline, type, starts_at, ends_at)")
      .order("created_at", { ascending: false });

    if (bookingsError) {
      console.error("Erreur getAdminMembersData (bookings) :", bookingsError);
    }

    // 4. Récupérer les formules actives
    const { data: plansData, error: plansError } = await supabase
      .from("plans")
      .select("id, name, code, type, commitment, price_cents, private_sessions_per_period, allows_private, allows_small_group, allows_collective, is_active, display_order")
      .order("display_order", { ascending: true });

    if (plansError) {
      console.error("Erreur getAdminMembersData (plans) :", plansError);
    }

    const plans: AdminPlanItem[] = (plansData || []).map((p: Record<string, unknown>) => ({
      id: (p.id as string) || "",
      name: (p.name as string) || "Formule",
      code: (p.code as string) || null,
      type: (((p.type as string) || "small_group") as string).toLowerCase(),
      commitment: (p.commitment as "monthly" | "annual" | null) || "monthly",
      price_cents: typeof p.price_cents === "number" ? p.price_cents : 0,
      private_sessions_per_period: typeof p.private_sessions_per_period === "number" ? p.private_sessions_per_period : null,
      allows_private: typeof p.allows_private === "boolean" ? p.allows_private : null,
      allows_small_group: typeof p.allows_small_group === "boolean" ? p.allows_small_group : null,
      allows_collective: typeof p.allows_collective === "boolean" ? p.allows_collective : null,
      is_active: p.is_active !== false,
      display_order: typeof p.display_order === "number" ? p.display_order : 0,
    }));

    // Indexer les abonnements par user_id
    const subsByUser: Record<string, AdminMemberDetail["subscriptions"]> = {};
    const activeSubByUser: Record<string, AdminMemberDetail["activeSubscription"]> = {};

    for (const sub of subscriptionsData || []) {
      const uId = sub.user_id;
      if (!uId) continue;

      const rawPlan = Array.isArray(sub.plan) ? sub.plan[0] : sub.plan;
      const rawStatus = (sub.status as string) || "active";
      const subStatus: "active" | "paused" | "expired" | "cancelled" =
        rawStatus === "suspended" || rawStatus === "paused" ? "paused" : (rawStatus as any);

      const subItem = {
        id: sub.id,
        planId: sub.plan_id || rawPlan?.id || "",
        planName: rawPlan?.name || "Formule Inconnue",
        planType: (rawPlan?.type || "small_group").toLowerCase(),
        status: subStatus,
        started_at: sub.started_at,
        ends_at: sub.ends_at || null,
        private_sessions_quota: typeof sub.private_sessions_quota === "number" ? sub.private_sessions_quota : null,
        created_at: sub.created_at || sub.started_at,
      };

      if (!subsByUser[uId]) {
        subsByUser[uId] = [];
      }
      subsByUser[uId].push(subItem);

      if (subItem.status === "active" && !activeSubByUser[uId]) {
        activeSubByUser[uId] = subItem;
      }
    }

    // Indexer les réservations par user_id
    const bookingsByUser: Record<string, AdminMemberDetail["bookings"]> = {};

    for (const b of bookingsData || []) {
      const uId = b.user_id;
      if (!uId) continue;

      const rawSession = Array.isArray(b.class_session) ? b.class_session[0] : b.class_session;
      const bItem = {
        id: b.id,
        discipline: rawSession?.discipline || "Séance",
        sessionType: rawSession?.type || "small_group",
        starts_at: rawSession?.starts_at || b.created_at,
        ends_at: rawSession?.ends_at || null,
        status: b.status || "confirmed",
        created_at: b.created_at,
      };

      if (!bookingsByUser[uId]) {
        bookingsByUser[uId] = [];
      }
      bookingsByUser[uId].push(bItem);
    }

    // Assembler la liste des membres
    const members: AdminMemberDetail[] = (profilesData || []).map((p) => {
      const fName = (p.first_name || "").trim();
      const lName = (p.last_name || "").trim();
      let fullName = `${lName} ${fName}`.trim();
      if (!fullName) {
        fullName = `Membre #${p.id.slice(0, 6)}`;
      }

      const userSubs = subsByUser[p.id] || [];
      const activeSub = activeSubByUser[p.id] || null;
      const userBookings = bookingsByUser[p.id] || [];

      return {
        id: p.id,
        firstName: fName,
        lastName: lName,
        fullName,
        phone: p.phone || null,
        created_at: p.created_at,
        updated_at: p.updated_at,
        activeSubscription: activeSub,
        subscriptions: userSubs,
        bookings: userBookings,
        bookingsCount: userBookings.length,
      };
    });

    // Statistiques globales
    const stats = {
      totalMembers: members.length,
      withActiveSubscription: members.filter((m) => !!m.activeSubscription).length,
      withoutSubscription: members.filter((m) => !m.activeSubscription).length,
      smallGroupMembers: members.filter((m) => m.activeSubscription?.planType === "small_group").length,
      collectiveMembers: members.filter((m) => m.activeSubscription?.planType === "collective").length,
      privateMembers: members.filter((m) => m.activeSubscription?.planType === "private").length,
    };

    return {
      members,
      plans,
      stats,
    };
  } catch (err) {
    console.error("Erreur getAdminMembersData :", err);
    return {
      members: [],
      plans: [],
      stats: {
        totalMembers: 0,
        withActiveSubscription: 0,
        withoutSubscription: 0,
        smallGroupMembers: 0,
        collectiveMembers: 0,
        privateMembers: 0,
      },
    };
  }
}



/**
 * Détermine l'URL canonique absolue pour les redirections d'authentification.
 * - En local : http://localhost:3000
 * - En production : https://strikingcamp.com (ou NEXT_PUBLIC_SITE_URL sur Vercel)
 */
import { getAuthRedirectUrl } from "@/lib/auth-helpers";
export { getAuthRedirectUrl };

/**
 * Crée un nouveau membre orchestré (Auth -> Profile -> Subscription)
 * Côté serveur avec privilèges administrateur (service_role).
 */
export async function createMemberAdmin(
  supabase: SupabaseClient,
  payload: CreateMemberPayload
): Promise<{ success: boolean; data?: { id: string; subscriptionId?: string }; error?: string }> {
  try {
    // 1. VÉRIFICATION STRICTE DE L'EXISTENCE ET DU STATUT DE LA FORMULE DANS public.plans
    const cleanPlanId = payload.planId.trim();

    const { data: allPlans, error: allPlansError } = await supabase
      .from("plans")
      .select("id, name, type, commitment, price_cents, is_active, private_sessions_per_period");

    const selectedPlan = allPlans?.find((p) => p.id === cleanPlanId);

    if (allPlansError || !selectedPlan || selectedPlan.is_active === false) {
      return {
        success: false,
        error: `La formule sélectionnée est introuvable ou inactive (ID: ${cleanPlanId}).`,
      };
    }

    const planData = selectedPlan;

    // 2. CRÉATION DU COMPTE AVEC ENVOI D'INVITATION PAR EMAIL DANS auth.users
    const memberEmail = payload.email.trim().toLowerCase();
    const resetRedirectTo = getAuthRedirectUrl("/reset-password");

    console.log("--> [createMemberAdmin] Envoi invitation à :", memberEmail);
    console.log("--> [createMemberAdmin] URL redirectTo :", resetRedirectTo);

    const { data: authData, error: authError } = await supabase.auth.admin.inviteUserByEmail(
      memberEmail,
      {
        data: {
          first_name: payload.firstName.trim(),
          last_name: payload.lastName.trim(),
          phone: payload.phone.trim(),
          role: "CLIENT",
        },
        redirectTo: resetRedirectTo,
      }
    );

    if (authError) {
      console.log("MESSAGE:", authError?.message);
      console.log("CODE:", (authError as { code?: string })?.code || "AUTH_ERROR");
      console.log("DETAILS:", (authError as { details?: string })?.details || null);
      console.log("HINT:", (authError as { hint?: string })?.hint || null);
      console.log("ERROR KEYS:", Object.keys(authError || {}));
      console.error("DIAGNOSTIC SUPABASE AUTH ADMIN INVITE USER >>>", authError);

      const isDuplicate =
        authError.message?.toLowerCase().includes("already registered") ||
        authError.message?.toLowerCase().includes("already exists");

      return {
        success: false,
        error: isDuplicate
          ? "Un compte existe déjà avec cette adresse email."
          : `[Auth Invitation] ${authError.message}`,
      };
    }

    const authUserId = authData.user?.id;
    if (!authUserId) {
      return { success: false, error: "Identifiant utilisateur Auth introuvable après création." };
    }

    // Assurer la présence du rôle CLIENT dans app_metadata
    try {
      await supabase.auth.admin.updateUserById(authUserId, {
        app_metadata: {
          role: "CLIENT",
        },
      });
    } catch (roleErr) {
      console.warn("Mise à jour app_metadata non bloquante :", roleErr);
    }

    // 3. CRÉATION / MISE À JOUR DU PROFIL DANS public.profiles (sans colonne email)
    const profilePayload: Record<string, unknown> = {
      id: authUserId,
      first_name: payload.firstName.trim(),
      last_name: payload.lastName.trim(),
      phone: payload.phone.trim(),
      updated_at: new Date().toISOString(),
    };

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .upsert(profilePayload, { onConflict: "id" })
      .select("id")
      .maybeSingle();

    if (profileError) {
      console.log("MESSAGE:", profileError?.message);
      console.log("CODE:", profileError?.code);
      console.log("DETAILS:", profileError?.details);
      console.log("HINT:", profileError?.hint);
      console.log("ERROR KEYS:", Object.keys(profileError || {}));
      console.error("DIAGNOSTIC COMPLET UPSERT PROFILES >>>", profileError);

      // ROLLBACK COMPENSATOIRE 1 : Supprimer l'utilisateur Auth créé
      try {
        await supabase.auth.admin.deleteUser(authUserId);
      } catch (cleanupErr) {
        console.warn("Rollback deleteUser failed:", cleanupErr);
      }

      const formattedError = `[Profil: Code ${profileError.code || "N/A"}] ${profileError.message || "Erreur création profil"}${
        profileError.details ? ` | Détails: ${profileError.details}` : ""
      }${profileError.hint ? ` | Hint: ${profileError.hint}` : ""}`;

      return { success: false, error: formattedError };
    }

    // 4. CALCUL DES DATES ET DU QUOTA POUR L'ABONNEMENT
    const startDateObj = payload.subscriptionStartDate
      ? new Date(payload.subscriptionStartDate)
      : new Date();
    const startedAtIso = startDateObj.toISOString();

    let endsAtIso: string | null = null;
    if (payload.subscriptionEndDate) {
      endsAtIso = new Date(payload.subscriptionEndDate).toISOString();
    } else if (planData.commitment === "annual") {
      const annualEnd = new Date(startDateObj);
      annualEnd.setFullYear(annualEnd.getFullYear() + 1);
      endsAtIso = annualEnd.toISOString();
    } else if (planData.commitment === "monthly") {
      const monthlyEnd = new Date(startDateObj);
      monthlyEnd.setMonth(monthlyEnd.getMonth() + 1);
      endsAtIso = monthlyEnd.toISOString();
    }

    const quota =
      typeof planData.private_sessions_per_period === "number" &&
      planData.private_sessions_per_period > 0
        ? planData.private_sessions_per_period
        : null;

    const rawSubStatus = payload.subscriptionStatus || "active";
    const dbSubStatus = rawSubStatus === ("suspended" as string) ? "paused" : rawSubStatus;

    const subscriptionPayload: Record<string, unknown> = {
      user_id: authUserId,
      plan_id: payload.planId,
      status: dbSubStatus,
      started_at: startedAtIso,
      ends_at: endsAtIso,
      private_sessions_quota: quota,
    };

    // 5. CRÉATION DE L'ABONNEMENT DANS public.subscriptions
    const { data: subData, error: subError } = await supabase
      .from("subscriptions")
      .insert([subscriptionPayload])
      .select("id")
      .maybeSingle();

    if (subError) {
      console.log("MESSAGE:", subError?.message);
      console.log("CODE:", subError?.code);
      console.log("DETAILS:", subError?.details);
      console.log("HINT:", subError?.hint);
      console.log("ERROR KEYS:", Object.keys(subError || {}));
      console.error("DIAGNOSTIC INSERT SUBSCRIPTIONS ERROR >>>", subError);

      // ROLLBACK COMPENSATOIRE 2 : Supprimer Profile puis Auth User
      try {
        await supabase.from("profiles").delete().eq("id", authUserId);
      } catch (profCleanupErr) {
        console.warn("Rollback delete profile failed:", profCleanupErr);
      }

      try {
        await supabase.auth.admin.deleteUser(authUserId);
      } catch (authCleanupErr) {
        console.warn("Rollback deleteUser failed:", authCleanupErr);
      }

      const formattedError = `[Abonnement: Code ${subError.code || "N/A"}] ${subError.message || "Erreur création abonnement"}${
        subError.details ? ` | Détails: ${subError.details}` : ""
      }${subError.hint ? ` | Hint: ${subError.hint}` : ""}`;

      return { success: false, error: formattedError };
    }

    return {
      success: true,
      data: {
        id: profileData?.id || authUserId,
        subscriptionId: subData?.id || undefined,
      },
    };
  } catch (err) {
    const errObj = (err || {}) as Record<string, unknown>;
    const error = err as { message?: string; code?: string; details?: string; hint?: string };

    console.log("MESSAGE:", error?.message || (err as Error)?.message);
    console.log("CODE:", error?.code || "EXCEPTION");
    console.log("DETAILS:", error?.details || null);
    console.log("HINT:", error?.hint || null);
    console.log("ERROR KEYS:", Object.keys(errObj));
    console.error("DIAGNOSTIC EXCEPTION createMemberAdmin >>>", {
      message: error?.message || (err as Error)?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
      raw: err,
    });

    const formattedError = `[Code ${error?.code || "EXCEPTION"}] ${error?.message || (err as Error).message || "Erreur inconnue."}${
      error?.details ? ` | Détails: ${error.details}` : ""
    }${error?.hint ? ` | Hint: ${error.hint}` : ""}`;

    return { success: false, error: formattedError };
  }
}

/**
 * Modifier les informations d'un profil membre (Admin uniquement)
 */
export async function updateMemberAdmin(
  supabase: SupabaseClient,
  memberId: string,
  payload: UpdateMemberPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!memberId) {
      return { success: false, error: "Identifiant du membre manquant." };
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (payload.firstName !== undefined) updateData.first_name = payload.firstName.trim();
    if (payload.lastName !== undefined) updateData.last_name = payload.lastName.trim();
    if (payload.phone !== undefined) updateData.phone = payload.phone.trim() || null;

    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", memberId);

    if (error) {
      console.error("DIAGNOSTIC COMPLET UPDATE PROFILES >>>", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      const formattedError = `[Code ${error.code || "N/A"}] ${error.message || "Erreur Supabase"}${
        error.details ? ` | Détails: ${error.details}` : ""
      }${error.hint ? ` | Hint: ${error.hint}` : ""}`;
      return { success: false, error: formattedError };
    }

    return { success: true };
  } catch (err) {
    const errObj = err as Record<string, unknown>;
    const message = (errObj?.message as string) || (err as Error)?.message || "Erreur inconnue.";
    const code = (errObj?.code as string) || "EXCEPTION";
    const details = (errObj?.details as string) || null;
    const hint = (errObj?.hint as string) || null;

    console.error("DIAGNOSTIC EXCEPTION updateMemberAdmin >>>", {
      message,
      code,
      details,
      hint,
      raw: err,
    });
    const formattedError = `[Code ${code}] ${message}${details ? ` | Détails: ${details}` : ""}${hint ? ` | Hint: ${hint}` : ""}`;
    return { success: false, error: formattedError };
  }
}

/**
 * Récupère l'ensemble des événements du club pour l'administration.
 * Tente d'abord Supabase, avec fallback résilient sur clubEvents.
 */
export async function getAdminEventsData(supabase: SupabaseClient): Promise<ClubEvent[]> {
  try {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !data || data.length === 0) {
      if (error) {
        console.warn("[getAdminEventsData] Repli sur clubEvents statiques :", error.message);
      }
      return clubEvents;
    }

    const { mapDbEventToClubEvent } = await import("./events");
    return data.map(mapDbEventToClubEvent);
  } catch (err) {
    console.warn("[getAdminEventsData] Exception, repli sur clubEvents :", err);
    return clubEvents;
  }
}
