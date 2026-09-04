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
  const weekParam = typeof params.week === "string" ? parseInt(params.week, 10) : 0;
  const weekOffset = isNaN(weekParam) ? 0 : weekParam;

  const currentMonday = getMondayOfCurrentWeek();
  currentMonday.setDate(currentMonday.getDate() + weekOffset * 7);

  const currentSaturday = new Date(currentMonday);
  currentSaturday.setDate(currentSaturday.getDate() + 5);

  const mondayStr = formatToParisDate(currentMonday);
  const saturdayStr = formatToParisDate(currentSaturday);

  const tabParam =
    params.tab === "private"
      ? "private"
      : params.tab === "small_group"
      ? "small_group"
      : "trial";
  const modeParam = params.mode === "week" ? "week" : "day";
  const dayParam = typeof params.day === "string" ? params.day : undefined;

  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    supabase = await createClient();
  }

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
    />
  );
}
