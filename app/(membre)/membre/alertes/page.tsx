import type { Metadata } from "next";
import MemberAlertsView from "@/components/membre/MemberAlertsView";

export const metadata: Metadata = {
  title: "Alertes — Espace Membre Striking Camp",
  robots: { index: false, follow: false },
};

/**
 * Page Alertes de l'espace membre — /membre/alertes
 */
export default function MembreAlertesPage() {
  return <MemberAlertsView />;
}
