import { createClient } from "@/lib/supabase/server";
import AdminPlanningView from "@/components/admin/AdminPlanningView";
import type { RecurringTemplateItem, AdminDatedSessionItem } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Planning & Cours | Administration Striking Camp",
};

export default async function AdminPlanningPage() {
  const supabase = await createClient();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 28);

  // 1. & 2. Récupération parallèle des modèles récurrents et des séances physiques datées
  const [templatesRes, sessionsRes] = await Promise.all([
    supabase
      .from("recurring_schedule_templates")
      .select("*")
      .in("type", ["small_group", "collective"])
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true }),
    supabase
      .from("class_sessions")
      .select("id, template_id, type, discipline, level, starts_at, ends_at, max_capacity, is_active")
      .in("type", ["small_group", "collective"])
      .gte("starts_at", startDate.toISOString())
      .lte("starts_at", endDate.toISOString())
      .order("starts_at", { ascending: true }),
  ]);

  let initialTemplates: RecurringTemplateItem[] = [];
  if (templatesRes.data && !templatesRes.error) {
    initialTemplates = templatesRes.data as RecurringTemplateItem[];
  }

  if (sessionsRes.error) {
    console.error("[AdminPlanningPage] Erreur chargement séances :", sessionsRes.error.message);
  }

  const rawSessions = sessionsRes.data || [];
  const sessionIds = rawSessions.map((s) => s.id);

  // 3. Récupération parallèle des réservations confirmées associées (membres + essais)
  const countsMap = new Map<string, number>();
  if (sessionIds.length > 0) {
    const [bookingsRes, trialBookingsRes] = await Promise.all([
      supabase
        .from("bookings")
        .select("id, class_session_id")
        .in("class_session_id", sessionIds)
        .eq("status", "confirmed"),
      supabase
        .from("trial_bookings")
        .select("id, class_session_id")
        .in("class_session_id", sessionIds)
        .eq("status", "confirmed"),
    ]);

    if (bookingsRes.data) {
      for (const b of bookingsRes.data) {
        if (b.class_session_id) {
          countsMap.set(b.class_session_id, (countsMap.get(b.class_session_id) || 0) + 1);
        }
      }
    }

    if (trialBookingsRes.data) {
      for (const tb of trialBookingsRes.data) {
        if (tb.class_session_id) {
          countsMap.set(tb.class_session_id, (countsMap.get(tb.class_session_id) || 0) + 1);
        }
      }
    }
  }

  const initialSessions: AdminDatedSessionItem[] = rawSessions.map((s) => ({
    id: s.id,
    template_id: s.template_id,
    type: (s.type || "small_group") as any,
    discipline: s.discipline,
    level: s.level || "Tous niveaux",
    starts_at: s.starts_at,
    ends_at: s.ends_at || s.starts_at,
    max_capacity: s.max_capacity || (s.type === "collective" ? 50 : s.type === "private" ? 1 : 12),
    is_active: s.is_active ?? true,
    bookedCount: countsMap.get(s.id) || 0,
  }));

  return (
    <AdminPlanningView
      initialTemplates={initialTemplates}
      initialSessions={initialSessions}
    />
  );
}
