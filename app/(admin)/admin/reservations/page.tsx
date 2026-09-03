import { createClient } from "@/lib/supabase/server";
import AdminReservationsView from "@/components/admin/AdminReservationsView";
import { getAdminWeeklyReservationsData } from "@/lib/supabase/admin";

export const metadata = {
  title: "Réservations & Émargement | Administration Striking Camp",
};

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function getMondayOfCurrentWeek(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff, 0, 0, 0, 0);
  return monday;
}

function formatDateToIso(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default async function AdminReservationsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const weekParam = typeof params.week === "string" ? parseInt(params.week, 10) : 0;
  const weekOffset = isNaN(weekParam) ? 0 : weekParam;

  const currentMonday = getMondayOfCurrentWeek();
  currentMonday.setDate(currentMonday.getDate() + weekOffset * 7);

  const currentSaturday = new Date(currentMonday);
  currentSaturday.setDate(currentSaturday.getDate() + 5);

  const mondayStr = formatDateToIso(currentMonday);
  const saturdayStr = formatDateToIso(currentSaturday);

  const tabParam = params.tab === "private" ? "private" : "small_group";
  const dayParam = typeof params.day === "string" ? params.day : undefined;

  const supabase = await createClient();
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
      initialSelectedDateStr={dayParam}
    />
  );
}
