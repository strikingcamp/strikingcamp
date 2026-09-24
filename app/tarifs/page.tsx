import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import PricingSection from "@/components/sections/PricingSection";

export const metadata: Metadata = {
  title: "Tarifs et Formules de Boxe à Marseille (13010)",
  description:
    "Découvrez les tarifs et formules d'abonnement au Striking Camp Marseille (13010) : Cours Collectifs, Small Group et Cours Privés (8 séances/mois). Sans engagement ou annuel.",
  alternates: {
    canonical: "https://www.strikingcamp.com/tarifs",
  },
  openGraph: {
    title: "Tarifs et Formules de Boxe à Marseille (13010) | Striking Camp",
    description:
      "Découvrez les tarifs et formules d'abonnement au Striking Camp Marseille (13010) : Cours Collectifs, Small Group et Cours Privés.",
    url: "https://www.strikingcamp.com/tarifs",
    siteName: "Striking Camp",
    locale: "fr_FR",
    type: "website",
    images: [
      {
        url: "https://www.strikingcamp.com/sacSalle.jpg",
        width: 1200,
        height: 630,
        alt: "Tarifs et Formules Striking Camp Marseille 13010",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tarifs et Formules de Boxe à Marseille (13010) | Striking Camp",
    description:
      "Découvrez les tarifs et formules d'abonnement au Striking Camp Marseille (13010) : Cours Collectifs, Small Group et Cours Privés.",
    images: ["https://www.strikingcamp.com/sacSalle.jpg"],
  },
};

export const dynamic = "force-dynamic";

export default async function TarifsPage() {
  let isSmallGroupActive = false;
  let isCollectiveActive = true;
  let isPrivateActive = true;

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );

    const { data: settings } = await supabase
      .from("service_settings")
      .select("service_key, is_active");

    if (settings && settings.length > 0) {
      for (const s of settings) {
        if (s.service_key === "small_group") isSmallGroupActive = Boolean(s.is_active);
        if (s.service_key === "collective") isCollectiveActive = Boolean(s.is_active);
        if (s.service_key === "private") isPrivateActive = Boolean(s.is_active);
      }
    }
  } catch (err) {
    console.warn("[TarifsPage] Erreur lecture service_settings (fallback par défaut) :", err);
  }

  return (
    <div className="pt-20 bg-transparent min-h-screen">
      <PricingSection
        isSmallGroupActive={isSmallGroupActive}
        isCollectiveActive={isCollectiveActive}
        isPrivateActive={isPrivateActive}
      />
    </div>
  );
}

