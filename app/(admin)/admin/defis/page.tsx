import type { Metadata } from "next";
import AdminDefisView from "@/components/admin/AdminDefisView";

export const metadata: Metadata = {
  title: "Gestion des Défis | Administration Striking Camp",
  robots: { index: false, follow: false },
};

export default function AdminDefisPage() {
  return <AdminDefisView />;
}
