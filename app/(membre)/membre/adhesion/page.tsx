import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import MembershipOnboardingView from "@/components/membre/MembershipOnboardingView";

export const metadata: Metadata = {
  title: "Adhésion & Formules — Striking Camp",
  robots: { index: false, follow: false },
};

/**
 * Page de choix de formule et de suivi de demande d'adhésion — /membre/adhesion
 */
export default async function AdhesionPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/connexion?next=/membre/adhesion");
  }

  return <MembershipOnboardingView />;
}
