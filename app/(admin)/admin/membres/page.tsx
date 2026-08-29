import { createClient } from "@/lib/supabase/server";
import { getAdminMembersData } from "@/lib/supabase/admin";
import AdminMembersView from "@/components/admin/AdminMembersView";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Gestion des Membres | Administration Striking Camp",
};

export default async function AdminMembresPage() {
  const supabase = await createClient();
  const data = await getAdminMembersData(supabase);

  return <AdminMembersView initialData={data} />;
}

