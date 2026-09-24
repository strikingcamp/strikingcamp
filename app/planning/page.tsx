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
  title: "Planning des Cours de Boxe et Sports de Combat à Marseille (13010)",
  description:
    "Consultez les horaires et le planning des cours au Striking Camp Marseille (13010) : Boxe Anglaise, Kick Boxing, Muay Thaï, Lady Striking, Small Group et cours privés du lundi au samedi.",
  alternates: {
    canonical: "https://www.strikingcamp.com/planning",
  },
  openGraph: {
    title: "Planning des Cours de Boxe à Marseille (13010) | Striking Camp",
    description:
      "Consultez les horaires et le planning des cours au Striking Camp Marseille (13010) : Boxe Anglaise, Kick Boxing, Muay Thaï, Lady Striking, Small Group et cours privés.",
    url: "https://www.strikingcamp.com/planning",
    siteName: "Striking Camp",
    locale: "fr_FR",
    type: "website",
    images: [
      {
        url: "https://www.strikingcamp.com/sacSalle.jpg",
        width: 1200,
        height: 630,
        alt: "Planning et Horaires des Cours Striking Camp Marseille 13010",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Planning des Cours de Boxe à Marseille (13010) | Striking Camp",
    description:
      "Consultez les horaires et le planning des cours au Striking Camp Marseille (13010) : Boxe Anglaise, Kick Boxing, Muay Thaï, Lady Striking, Small Group et cours privés.",
    images: ["https://www.strikingcamp.com/sacSalle.jpg"],
  },
};

export const dynamic = "force-dynamic";

export default async function PlanningPage() {
  let scheduleData: Record<PlanningCategory, Record<DayName, ScheduleCourse[]>> = publicScheduleData;
  let isSmallGroupActive = false;
  let isCollectiveActive = true;

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );

    // 1. & 2. Lecture parallèle du statut des services et des créneaux récurrents actifs
    const [settingsRes, templatesRes] = await Promise.all([
      supabase
        .from("service_settings")
        .select("service_key, is_active"),
      supabase
        .from("recurring_schedule_templates")
        .select("day_of_week, start_time, end_time, type, discipline, level, max_capacity, is_active")
        .eq("is_active", true)
        .in("type", ["small_group", "collective"])
        .order("day_of_week", { ascending: true })
        .order("start_time", { ascending: true }),
    ]);

    if (settingsRes.data) {
      for (const s of settingsRes.data) {
        if (s.service_key === "small_group") isSmallGroupActive = Boolean(s.is_active);
        if (s.service_key === "collective") isCollectiveActive = Boolean(s.is_active);
      }
    }

    const { data: templates, error } = templatesRes;

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
        const timeFormatted = t.end_time
          ? `${t.start_time.slice(0, 5)} → ${t.end_time.slice(0, 5)}`
          : t.start_time.slice(0, 5);

        dynamicSchedule[cat][day].push({
          name: t.discipline,
          level: t.level,
          time: timeFormatted,
          places: t.type === "small_group" ? String(t.max_capacity || 12) : undefined,
        });
      }

      scheduleData = dynamicSchedule;
    }
  } catch (err) {
    console.warn("[PlanningPage] Utilisation du planning de référence (fallback) :", err);
  }

  return (
    <div className="pt-20 bg-transparent min-h-screen">
      <PlanningSection
        initialScheduleData={scheduleData}
        isSmallGroupActive={isSmallGroupActive}
        isCollectiveActive={isCollectiveActive}
      />
    </div>
  );
}
