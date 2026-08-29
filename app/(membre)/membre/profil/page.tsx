import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import MemberProfileView from "@/components/membre/MemberProfileView";

export const metadata: Metadata = {
  title: "Mon Profil — Espace Membre Striking Camp",
  robots: { index: false, follow: false },
};

/**
 * Page Profil de l'espace membre — /membre/profil
 *
 * Affiche les informations de l'utilisateur connecté et permet la déconnexion.
 */
export default async function MembreProfilPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/connexion");
  }

  const meta = user.user_metadata || {};
  const firstName = meta.first_name || "";
  const lastName = meta.last_name || "";
  const phone = meta.phone || "";
  const role = meta.role || "Membre";

  return (
    <MemberProfileView
      initialUser={{
        id: user.id,
        email: user.email || "",
        firstName,
        lastName,
        phone,
        role,
        createdAt: user.created_at,
      }}
    />
  );
}
