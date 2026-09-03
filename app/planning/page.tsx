import { createClient } from "@supabase/supabase-js";
import PlanningSection from "@/components/sections/PlanningSection";
import {
  type PlanningCategory,
  type DayName,
  type ScheduleCourse,
  DAYS_ORDER,
  publicScheduleData,
} from "@/data/planning";

export const metadata = {
  title: "Planning des Cours de Boxe et Sports de Combat à Marseille | Striking Camp",
  description:
    "Consultez les horaires et le planning des cours au Striking Camp Marseille (13010) : Boxe Anglaise, Kick Boxing, Muay Thaï, Lady Striking, Small Group et cours privés du lundi au samedi.",
};

export const revalidate = 3600; // Revalidation ISR toutes les heures + à la demande via revalidatePath

export default async function PlanningPage() {
  let scheduleData: Record<PlanningCategory, Record<DayName, ScheduleCourse[]>> = publicScheduleData;

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );

    const { data: templates, error } = await supabase
      .from("recurring_schedule_templates")
      .select("day_of_week, start_time, end_time, type, discipline, level, max_capacity, is_active")
      .eq("is_active", true)
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true });

    if (!error && templates && templates.length > 0) {
      const dynamicSchedule: Record<PlanningCategory, Record<DayName, ScheduleCourse[]>> = {
        "Small Group": {
          Lundi: [],
          Mardi: [],
          Mercredi: [],
          Jeudi: [],
          Vendredi: [],
          Samedi: [],
        },
        Collectifs: {
          Lundi: [],
          Mardi: [],
          Mercredi: [],
          Jeudi: [],
          Vendredi: [],
          Samedi: [],
        },
      };

      for (const t of templates) {
        const day = DAYS_ORDER[t.day_of_week];
        if (!day) continue;

        const cat: PlanningCategory = t.type === "collective" ? "Collectifs" : "Small Group";
        dynamicSchedule[cat][day].push({
          name: t.discipline,
          level: t.level,
          time: t.start_time.slice(0, 5),
        });
      }

      scheduleData = dynamicSchedule;
    }
  } catch (err) {
    console.warn("[PlanningPage] Utilisation du planning de référence (fallback) :", err);
  }

  return (
    <div className="pt-20 bg-transparent min-h-screen">
      <PlanningSection initialScheduleData={scheduleData} />
    </div>
  );
}
