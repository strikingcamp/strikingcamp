import { createClient } from "@/lib/supabase/server";
import AdminPrivateCoachingView from "@/components/admin/AdminPrivateCoachingView";
import type { RecurringTemplateItem, AdminDatedSessionItem } from "@/app/(admin)/admin/planning/actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Cours Privés | Administration Striking Camp",
};

export default async function AdminPrivateCoachingPage() {
  const supabase = await createClient();

  // 1. Récupération des modèles récurrents (semaine type - Cours Privés)
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

  // 2. Récupération des séances physiques datées (horizon 4 semaines - Cours Privés)
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
    console.error("[AdminPrivateCoachingPage] Erreur chargement séances privées :", sessionsError.message);
  }

  const rawSessions = sessionsData || [];
  const sessionIds = rawSessions.map((s) => s.id);

  // 3. Récupération des réservations confirmées associées
  const countsMap = new Map<string, number>();
  if (sessionIds.length > 0) {
    const { data: bookingsData } = await supabase
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

  const initialSessions: AdminDatedSessionItem[] = rawSessions.map((s) => ({
    id: s.id,
    template_id: s.template_id,
    type: "private",
    discipline: s.discipline,
    level: s.level || "Individuel (50 min)",
    starts_at: s.starts_at,
    ends_at: s.ends_at || s.starts_at,
    max_capacity: s.max_capacity || 1,
    is_active: s.is_active ?? true,
    bookedCount: countsMap.get(s.id) || 0,
  }));

  return (
    <AdminPrivateCoachingView
      initialTemplates={initialTemplates}
      initialSessions={initialSessions}
    />
  );
}
