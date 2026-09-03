import { createClient } from "@/lib/supabase/server";
import { getAdminEventsData } from "@/lib/supabase/admin";
import AdminEvenementsView from "@/components/admin/AdminEvenementsView";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Gestion des Événements | Administration Striking Camp",
  description: "Création, modification et gestion des stages et masterclasses du Striking Camp.",
};

export default async function AdminEvenementsPage() {
  const supabase = await createClient();
  const events = await getAdminEventsData(supabase);

  return <AdminEvenementsView initialEvents={events} />;
}
