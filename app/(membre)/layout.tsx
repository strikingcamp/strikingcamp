import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { MemberProvider } from "@/components/membre/MemberContext";
import MemberBottomNav from "@/components/membre/MemberBottomNav";
import MemberHeader from "@/components/membre/MemberHeader";
import QuickActionModal from "@/components/membre/modals/QuickActionModal";
import BookingConfirmModal from "@/components/membre/modals/BookingConfirmModal";
import BookingCancelModal from "@/components/membre/modals/BookingCancelModal";

export const metadata: Metadata = {
  title: "Espace Membre — Striking Camp",
  robots: { index: false, follow: false },
};

/**
 * Layout de l'espace membre — /membre/*
 *
 * 1. Vérifie l'authentification côté serveur à chaque requête.
 * 2. Fournit le MemberProvider avec les modals globaux.
 * 3. Affiche le MemberHeader en haut et le MemberBottomNav fixe en bas.
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

  const meta = user.user_metadata || {};
  const firstName = meta.first_name || "";
  const lastName = meta.last_name || "";
  const role = meta.role || "Membre";

  return (
    <MemberProvider>
      <div className="min-h-screen bg-[#070c16] text-brand-white flex flex-col font-sans relative selection:bg-brand-blue selection:text-brand-black">
        {/* Header Membre */}
        <MemberHeader firstName={firstName} lastName={lastName} role={role} />

        {/* Contenu principal avec padding en bas pour la barre de navigation */}
        <main className="flex-1 pb-28 pt-4">
          {children}
        </main>

        {/* Navigation basse mobile fixe avec bouton + au centre */}
        <MemberBottomNav />

        {/* Modals globaux */}
        <QuickActionModal />
        <BookingConfirmModal />
        <BookingCancelModal />
      </div>
    </MemberProvider>
  );
}
