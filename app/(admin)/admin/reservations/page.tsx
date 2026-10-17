import { createClient, createAdminClient } from "@/lib/supabase/server";
import AdminReservationsView from "@/components/admin/AdminReservationsView";
import { getAdminWeeklyReservationsData, formatToParisDate } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Réservations & Émargement | Administration Striking Camp",
};

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function getMondayOfCurrentWeek(): Date {
  const parisTodayStr = formatToParisDate(new Date());
  const [year, month, day] = parisTodayStr.split("-").map(Number);
  const d = new Date(year, month - 1, day, 12, 0, 0);
  const dayOfWeek = d.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default async function AdminReservationsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  let weekParam = typeof params.week === "string" ? parseInt(params.week, 10) : 0;
  let weekOffset = isNaN(weekParam) ? 0 : weekParam;

  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    supabase = await createClient();
  }

  const sessionParam =
    typeof params.session === "string" && params.session.trim()
      ? params.session.trim()
      : undefined;

  let initialTargetSessionId: string | undefined = undefined;
  let targetSessionDateStr: string | undefined = undefined;
  let targetSessionType: string | undefined = undefined;

  if (sessionParam) {
    if (sessionParam.startsWith("tmpl_")) {
      // Séance récurrente virtuelle (tmpl_{templateId}_{YYYY-MM-DD}) non matérialisée en base
      const dateMatch = sessionParam.match(/(\d{4}-\d{2}-\d{2})$/);
      if (dateMatch) {
        initialTargetSessionId = sessionParam;
        targetSessionDateStr = dateMatch[1];
        targetSessionType = "small_group";

        // Calculer le lundi de cette séance spécifique pour caler la semaine
        const [sYear, sMonth, sDay] = targetSessionDateStr.split("-").map(Number);
        const sessMonday = new Date(sYear, sMonth - 1, sDay, 12, 0, 0);
        const sDayOfWeek = sessMonday.getDay();
        const sDiff = sDayOfWeek === 0 ? -6 : 1 - sDayOfWeek;
        sessMonday.setDate(sessMonday.getDate() + sDiff);
        sessMonday.setHours(0, 0, 0, 0);

        // Calcul de l'écart en semaines par rapport au lundi de base actuel
        const baseMonday = getMondayOfCurrentWeek();
        const diffMs = sessMonday.getTime() - baseMonday.getTime();
        const diffWeeks = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));
        if (!isNaN(diffWeeks) && typeof params.week !== "string") {
          weekOffset = diffWeeks;
        }
      }
    } else {
      const { data: targetSess } = await supabase
        .from("class_sessions")
        .select("id, starts_at, type, discipline")
        .eq("id", sessionParam)
        .maybeSingle();

      if (targetSess?.starts_at) {
        initialTargetSessionId = targetSess.id;
        targetSessionDateStr = formatToParisDate(targetSess.starts_at);
        targetSessionType = targetSess.type || "small_group";

        // Calculer le lundi de cette séance spécifique pour caler la semaine
        const [sYear, sMonth, sDay] = targetSessionDateStr.split("-").map(Number);
        const sessMonday = new Date(sYear, sMonth - 1, sDay, 12, 0, 0);
        const sDayOfWeek = sessMonday.getDay();
        const sDiff = sDayOfWeek === 0 ? -6 : 1 - sDayOfWeek;
        sessMonday.setDate(sessMonday.getDate() + sDiff);
        sessMonday.setHours(0, 0, 0, 0);

        // Calcul de l'écart en semaines par rapport au lundi de base actuel
        const baseMonday = getMondayOfCurrentWeek();
        const diffMs = sessMonday.getTime() - baseMonday.getTime();
        const diffWeeks = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));
        if (!isNaN(diffWeeks) && typeof params.week !== "string") {
          weekOffset = diffWeeks;
        }
      }
    }
  }

  const currentMonday = getMondayOfCurrentWeek();
  currentMonday.setDate(currentMonday.getDate() + weekOffset * 7);

  const currentSaturday = new Date(currentMonday);
  currentSaturday.setDate(currentSaturday.getDate() + 5);

  const mondayStr = formatToParisDate(currentMonday);
  const saturdayStr = formatToParisDate(currentSaturday);

  const tabParam =
    params.tab === "private"
      ? "private"
      : params.tab === "trial"
      ? "trial"
      : params.tab === "small_group"
      ? "small_group"
      : targetSessionType === "private"
      ? "private"
      : "small_group";

  const modeParam = params.mode === "week" ? "week" : "day";
  const dayParam =
    typeof params.day === "string"
      ? params.day
      : targetSessionDateStr || undefined;

  const weeklyData = await getAdminWeeklyReservationsData(
    supabase,
    mondayStr,
    saturdayStr
  );

  return (
    <AdminReservationsView
      weeklyData={weeklyData}
      initialWeekOffset={weekOffset}
      initialTab={tabParam}
      initialViewMode={modeParam}
      initialSelectedDateStr={dayParam}
      initialTargetSessionId={initialTargetSessionId}
    />
  );
}
