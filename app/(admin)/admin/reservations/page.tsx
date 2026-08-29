import { createClient } from "@/lib/supabase/server";
import AdminReservationsView from "@/components/admin/AdminReservationsView";
import { getAdminSessionReservations } from "@/lib/supabase/admin";

export const metadata = {
  title: "Réservations & Émargement | Administration Striking Camp",
};

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AdminReservationsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const sessionId = typeof params.session === "string" ? params.session : undefined;

  const supabase = await createClient();
  const { session, participants, allSessionsList } = await getAdminSessionReservations(
    supabase,
    sessionId
  );

  return (
    <AdminReservationsView
      session={session}
      participants={participants}
      allSessionsList={allSessionsList}
    />
  );
}
