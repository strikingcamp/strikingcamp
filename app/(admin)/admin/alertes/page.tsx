import type { Metadata } from "next";
import AdminAlertesView from "@/components/admin/AdminAlertesView";

export const metadata: Metadata = {
  title: "Gestion des Alertes | Administration Striking Camp",
  robots: { index: false, follow: false },
};

export default function AdminAlertesPage() {
  return <AdminAlertesView />;
}
