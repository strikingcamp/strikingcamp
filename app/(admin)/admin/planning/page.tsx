import { createClient } from "@/lib/supabase/server";
import AdminPlanningView from "@/components/admin/AdminPlanningView";
import type { AdminClassSessionSummary } from "@/lib/supabase/admin";

export const metadata = {
  title: "Planning & Cours | Administration Striking Camp",
};

export default async function AdminPlanningPage() {
  const supabase = await createClient();

  // 1. Récupération de toutes les séances depuis public.class_sessions
  const { data: sessions, error } = await supabase
    .from("class_sessions")
    .select("id, discipline, type, level, starts_at, ends_at, max_capacity, is_active")
    .order("starts_at", { ascending: true });

  if (error) {
    console.error(
      "Erreur chargement séances admin :",
      JSON.stringify(
        {
          message: error?.message,
          code: error?.code,
          details: error?.details,
          hint: error?.hint,
        },
        null,
        2
      )
    );
  }

  const initialSessions: AdminClassSessionSummary[] = [];

  if (sessions && sessions.length > 0) {
    const sessionIds = sessions.map((s) => s.id);

    // 2. Récupération des réservations confirmées associées
    const { data: bookings } = await supabase
      .from("bookings")
      .select("id, class_session_id")
      .in("class_session_id", sessionIds)
      .eq("status", "confirmed");

    const countsMap = new Map<string, number>();
    if (bookings) {
      for (const b of bookings) {
        if (b.class_session_id) {
          countsMap.set(
            b.class_session_id,
            (countsMap.get(b.class_session_id) || 0) + 1
          );
        }
      }
    }

    for (const s of sessions) {
      initialSessions.push({
        id: s.id,
        discipline: s.discipline,
        type: s.type || "small_group",
        level: s.level,
        starts_at: s.starts_at,
        ends_at: s.ends_at,
        max_capacity: s.max_capacity || 20,
        bookedCount: countsMap.get(s.id) || 0,
        is_active: s.is_active ?? true,
      });
    }
  }

  return <AdminPlanningView initialSessions={initialSessions} />;
}
