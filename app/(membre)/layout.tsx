import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Espace Membre — Striking Camp",
  robots: { index: false, follow: false },
};

/**
 * Layout de l'espace membre — /membre/*
 *
 * Vérifie l'authentification côté serveur à chaque requête.
 * Si l'utilisateur n'est pas connecté, redirige vers /connexion.
 *
 * ⚠️ Le proxy (proxy.ts) effectue déjà cette vérification, mais
 * la double-vérification ici est une bonne pratique de sécurité
 * (le proxy ne protège pas les Server Actions).
 */
export default async function MembreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/connexion");
  }

  return <>{children}</>;
}
