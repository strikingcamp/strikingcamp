import { createClient } from "@/lib/supabase/server";
import { getAdminSubscriptionsData } from "@/lib/supabase/admin";
import AdminSubscriptionsView from "@/components/admin/AdminSubscriptionsView";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Suivi des Abonnements | Administration Striking Camp",
};

export default async function AdminAbonnementsPage() {
  const supabase = await createClient();
  const initialData = await getAdminSubscriptionsData(supabase);

  return <AdminSubscriptionsView initialData={initialData} />;
}
