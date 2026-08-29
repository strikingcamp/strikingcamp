import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminLayoutClient from "@/components/admin/AdminLayoutClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Administration | Striking Camp Marseille",
  description: "Espace d'administration et de gestion du club Striking Camp.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // 1. Validation de l'authentification côté serveur
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/connexion?next=/admin");
  }

  // 2. Validation stricte du rôle ADMIN côté serveur
  const userRole = (user.app_metadata?.role || user.user_metadata?.role || "").toUpperCase();
  if (userRole !== "ADMIN") {
    redirect("/membre");
  }

  const meta = user.user_metadata || {};
  const adminName =
    meta.first_name || meta.last_name
      ? `${meta.first_name || ""} ${meta.last_name || ""}`.trim()
      : "Administrateur";

  return (
    <AdminLayoutClient adminName={adminName}>
      {children}
    </AdminLayoutClient>
  );
}
