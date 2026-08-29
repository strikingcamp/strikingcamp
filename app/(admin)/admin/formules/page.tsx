import { createClient } from "@/lib/supabase/server";
import { getAdminPlansData } from "@/lib/supabase/admin";
import AdminFormulesView from "@/components/admin/AdminFormulesView";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Gestion des Formules | Administration Striking Camp",
};

export default async function AdminFormulesPage() {
  const supabase = await createClient();
  const plans = await getAdminPlansData(supabase);

  return <AdminFormulesView initialPlans={plans} />;
}

