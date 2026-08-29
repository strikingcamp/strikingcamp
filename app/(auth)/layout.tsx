import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Striking Camp — Espace membres",
  robots: { index: false, follow: false },
};

/**
 * Layout partagé pour les pages d'authentification.
 * Utilise le layout racine (Navbar/Footer inclus via app/layout.tsx).
 * Ce groupe de routes (auth) n'ajoute aucun wrapper supplémentaire.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
