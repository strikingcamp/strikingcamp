import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import PricingSection from "@/components/sections/PricingSection";

export const metadata: Metadata = {
  title: "Tarifs et Formules de Boxe à Marseille | Striking Camp",
  description:
    "Découvrez les tarifs et formules d'abonnement au Striking Camp Marseille (13010) : Cours Collectifs, Small Group et Cours Privés (8 séances/mois). Sans engagement ou annuel.",
};

export const dynamic = "force-dynamic";

export default async function TarifsPage() {
  let isSmallGroupActive = false;

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );

    const { data: setting } = await supabase
      .from("service_settings")
      .select("is_active")
      .eq("service_key", "small_group")
      .maybeSingle();

    if (setting) {
      isSmallGroupActive = Boolean(setting.is_active);
    }
  } catch (err) {
    console.warn("[TarifsPage] Erreur lecture service_settings (fallback désactivé) :", err);
  }

  return (
    <div className="pt-20 bg-transparent min-h-screen">
      <PricingSection isSmallGroupActive={isSmallGroupActive} />
    </div>
  );
}

