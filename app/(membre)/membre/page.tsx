import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import MemberHomeView from "@/components/membre/MemberHomeView";

export const metadata: Metadata = {
  title: "Accueil Membre — Striking Camp",
  robots: { index: false, follow: false },
};

/**
 * Page d'accueil de l'espace membre — /membre
 *
 * Accessible uniquement aux utilisateurs connectés.
 * Récupère le prénom et les métadonnées de l'utilisateur pour un affichage dynamique.
 */
export default async function MembrePage() {
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
  const email = user.email || "";
  const role = meta.role || "Membre";

  return (
    <MemberHomeView
      firstName={firstName}
      lastName={lastName}
      email={email}
      role={role}
    />
  );
}
