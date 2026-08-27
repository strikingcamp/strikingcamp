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
  name: string;
  type: string;
  level?: string | null;
  starts_at: string;
  ends_at?: string | null;
  capacity: number;
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
}

export interface AdminSessionReservationsData {
  session: AdminClassSessionSummary | null;
  participants: AdminBookingParticipant[];
  allSessionsList: AdminClassSessionSummary[];
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
  name: string;
  type: "small_group" | "collective";
  level?: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  is_active?: boolean;
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
      .select("id, name, type, level, starts_at, ends_at, capacity, is_active")
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
          name: s.name,
          type: s.type || "small_group",
          level: s.level,
          starts_at: s.starts_at,
          ends_at: s.ends_at,
          capacity: s.capacity || 20,
          bookedCount: count,
          is_active: s.is_active ?? true,
        });
      }
    }

    // 4. Dernières réservations enregistrées
    const { data: recentBookingsData } = await supabase
      .from("bookings")
      .select("id, user_id, class_session_id, status, created_at, profile:profiles(first_name, last_name), session:class_sessions(name, starts_at, ends_at)")
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
          sessionName: rawSess?.name || "Small Group",
          sessionDate,
          sessionTime,
          status: (b.status as string) || "confirmé",
          created_at: b.created_at as string,
        });
      }
    }

    // 5. Événements à venir (issus des données officielles data/events.ts)
    const featuredEvents = clubEvents
      .filter((e) => e.status === "published" || e.status === "confirmed")
      .slice(0, 3);

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
    .select("id, name, type, level, starts_at, ends_at, capacity, is_active")
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
    name: s.name,
    type: s.type || "small_group",
    level: s.level,
    starts_at: s.starts_at,
    ends_at: s.ends_at,
    capacity: s.capacity || (s.type === "collective" ? 50 : 20),
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
      .select("id, name, type, level, starts_at, ends_at, capacity, is_active")
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
      name: s.name,
      type: s.type || "small_group",
      level: s.level,
      starts_at: s.starts_at,
      ends_at: s.ends_at,
      capacity: s.capacity || 20,
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
      name: activeSessionRaw.name,
      type: activeSessionRaw.type || "small_group",
      level: activeSessionRaw.level,
      starts_at: activeSessionRaw.starts_at,
      ends_at: activeSessionRaw.ends_at,
      capacity: activeSessionRaw.capacity || 20,
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
        name: formData.name.trim(),
        type: formData.type,
        level: formData.level?.trim() || null,
        starts_at: formData.starts_at,
        ends_at: formData.ends_at,
        capacity: formData.capacity || (formData.type === "collective" ? 50 : 20),
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
  if (formData.name !== undefined) payload.name = formData.name.trim();
  if (formData.type !== undefined) payload.type = formData.type;
  if (formData.level !== undefined) payload.level = formData.level?.trim() || null;
  if (formData.starts_at !== undefined) payload.starts_at = formData.starts_at;
  if (formData.ends_at !== undefined) payload.ends_at = formData.ends_at;
  if (formData.capacity !== undefined) payload.capacity = formData.capacity;
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
