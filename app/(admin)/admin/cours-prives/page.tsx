import { createAdminClient } from "@/lib/supabase/server";
import AdminPrivateCoachingView from "@/components/admin/AdminPrivateCoachingView";
import type {
  RecurringTemplateItem,
  AdminDatedSessionItem,
  AdminDatedSessionParticipant,
} from "@/app/(admin)/admin/planning/actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Cours Individuels | Administration Striking Camp",
};

export default async function AdminPrivateCoachingPage() {
  const supabase = createAdminClient();

  // 1. Récupération des modèles récurrents (semaine type - Cours Individuels)
  let initialTemplates: RecurringTemplateItem[] = [];
  const { data: templatesData, error: tmplError } = await supabase
    .from("recurring_schedule_templates")
    .select("*")
    .eq("type", "private")
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });

  if (templatesData && !tmplError) {
    initialTemplates = templatesData as RecurringTemplateItem[];
  }

  // 2. Récupération des séances physiques datées (horizon 4 semaines - Cours Individuels)
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 28);

  const { data: sessionsData, error: sessionsError } = await supabase
    .from("class_sessions")
    .select("id, template_id, type, discipline, level, starts_at, ends_at, max_capacity, is_active")
    .eq("type", "private")
    .gte("starts_at", startDate.toISOString())
    .lte("starts_at", endDate.toISOString())
    .order("starts_at", { ascending: true });

  if (sessionsError) {
    console.error("[AdminPrivateCoachingPage] Erreur chargement séances individuelles :", sessionsError.message);
  }

  const rawSessions = sessionsData || [];
  const sessionIds = rawSessions.map((s) => s.id);

  // 3. Récupération des réservations confirmées et des coordonnées des inscrits
  const participantsMap = new Map<string, AdminDatedSessionParticipant[]>();
  if (sessionIds.length > 0) {
    const { data: bookingsData, error: bError } = await supabase
      .from("bookings")
      .select("id, user_id, class_session_id, status, attendance_status, created_at")
      .in("class_session_id", sessionIds)
      .eq("status", "confirmed")
      .order("created_at", { ascending: true });

    if (bError) {
      console.error("[AdminPrivateCoachingPage] Erreur bookings :", bError.message);
    }

    const rawBookings = bookingsData || [];
    const userIds = Array.from(new Set(rawBookings.map((b) => b.user_id)));

    const profilesMap = new Map<string, { first_name?: string | null; last_name?: string | null; phone?: string | null }>();
    const authMap = new Map<string, { email?: string; first_name?: string; last_name?: string; phone?: string }>();
    const planNameMap = new Map<string, string>();

    if (userIds.length > 0) {
      const authAdmin = (supabase as any).auth?.admin;
      const hasAuthAdmin = authAdmin && typeof authAdmin.listUsers === "function";

      const [profilesRes, authListRes, subsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, first_name, last_name, phone")
          .in("id", userIds),
        hasAuthAdmin ? authAdmin.listUsers() : Promise.resolve({ data: null }),
        supabase
          .from("subscriptions")
          .select("id, user_id, status, started_at, plan:plans(name, type, allows_private)")
          .in("user_id", userIds)
          .order("started_at", { ascending: false }),
      ]);

      if (profilesRes.data) {
        for (const p of profilesRes.data) {
          profilesMap.set(p.id, p);
        }
      }

      if (authListRes?.data?.users) {
        for (const u of authListRes.data.users) {
          if (userIds.includes(u.id)) {
            authMap.set(u.id, {
              email: u.email,
              first_name: u.user_metadata?.first_name,
              last_name: u.user_metadata?.last_name,
              phone: u.user_metadata?.phone || u.phone,
            });
          }
        }
      }

      if (subsRes.data) {
        for (const s of subsRes.data) {
          if (!planNameMap.has(s.user_id)) {
            const plan = (s as any).plan;
            const pName = Array.isArray(plan) ? plan[0]?.name : plan?.name;
            planNameMap.set(s.user_id, pName || "Abonnement Actif");
          }
        }
      }
    }

    for (const b of rawBookings) {
      if (!b.class_session_id) continue;
      const prof = profilesMap.get(b.user_id);
      const auth = authMap.get(b.user_id);

      const fName = prof?.first_name || auth?.first_name || "Membre";
      const lName = prof?.last_name || auth?.last_name || "";
      const memberName = `${fName} ${lName}`.trim();
      const phone = prof?.phone || auth?.phone || "—";
      const email = auth?.email || undefined;
      const planName = planNameMap.get(b.user_id) || "Adhérent";

      const part: AdminDatedSessionParticipant = {
        bookingId: b.id,
        userId: b.user_id,
        memberName,
        phone,
        email,
        planName,
        status: b.status,
        attendanceStatus: (b.attendance_status as any) || "pending",
        createdAt: b.created_at,
      };

      const list = participantsMap.get(b.class_session_id) || [];
      list.push(part);
      participantsMap.set(b.class_session_id, list);
    }
  }

  const initialSessions: AdminDatedSessionItem[] = rawSessions.map((s) => {
    const sessionParticipants = participantsMap.get(s.id) || [];
    return {
      id: s.id,
      template_id: s.template_id,
      type: "private",
      discipline: s.discipline,
      level: s.level || "Individuel (50 min)",
      starts_at: s.starts_at,
      ends_at: s.ends_at || s.starts_at,
      max_capacity: s.max_capacity || 6,
      is_active: s.is_active ?? true,
      bookedCount: sessionParticipants.length,
      participants: sessionParticipants,
    };
  });

  return (
    <AdminPrivateCoachingView
      initialTemplates={initialTemplates}
      initialSessions={initialSessions}
    />
  );
}
