import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getNotifications, type NotificationLog } from "@/lib/supabase/notifications";
import MemberAlertsView from "@/components/membre/MemberAlertsView";

export const metadata: Metadata = {
  title: "Notifications & Alertes — Espace Membre Striking Camp",
  robots: { index: false, follow: false },
};

/**
 * Page Alertes de l'espace membre — /membre/alertes
 * Charge les notifications du membre connecté côté serveur (SSR) sans latence.
 */
export default async function MembreAlertesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/connexion");
  }

  let initialNotifications: NotificationLog[] = [];
  try {
    initialNotifications = await getNotifications(supabase, user.id, 50);
  } catch (err) {
    console.error("[MembreAlertesPage] Erreur chargement initial :", err);
  }

  return <MemberAlertsView initialNotifications={initialNotifications} />;
}
