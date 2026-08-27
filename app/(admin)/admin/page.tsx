import { createClient } from "@/lib/supabase/server";
import { getAdminDashboardData } from "@/lib/supabase/admin";
import AdminDashboardView from "@/components/admin/AdminDashboardView";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const dashboardData = await getAdminDashboardData(supabase);

  return <AdminDashboardView initialData={dashboardData} />;
}
