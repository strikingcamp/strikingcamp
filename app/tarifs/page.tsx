import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/server";
import PricingSection, { type PublicPlan } from "@/components/sections/PricingSection";

export const metadata: Metadata = {
  title: "Tarifs et Formules de Boxe à Marseille (13010)",
  description:
    "Découvrez les tarifs et formules d'abonnement au Striking Camp Marseille (13010) : Small Group et Cours Privés (8 séances/mois). Sans engagement ou annuel.",
  alternates: {
    canonical: "https://www.strikingcamp.com/tarifs",
  },
  openGraph: {
    title: "Tarifs et Formules de Boxe à Marseille (13010) | Striking Camp",
    description:
      "Découvrez les tarifs et formules d'abonnement au Striking Camp Marseille (13010) : Small Group et Cours Privés.",
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
      "Découvrez les tarifs et formules d'abonnement au Striking Camp Marseille (13010) : Small Group et Cours Privés.",
    images: ["https://www.strikingcamp.com/sacSalle.jpg"],
  },
};

export const dynamic = "force-dynamic";

export default async function TarifsPage() {
  let isSmallGroupActive = true;
  let isPrivateActive = true;
  let initialPlans: PublicPlan[] = [];

  try {
    const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createAdminClient()
      : createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
        );

    const [settingsRes, plansRes] = await Promise.all([
      supabase.from("service_settings").select("service_key, is_active"),
      supabase
        .from("plans")
        .select("id, name, code, type, commitment, price_cents, private_sessions_per_period, is_active, display_order")
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .order("name", { ascending: true }),
    ]);

    if (settingsRes.data && settingsRes.data.length > 0) {
      for (const s of settingsRes.data) {
        if (s.service_key === "small_group") isSmallGroupActive = Boolean(s.is_active);
        if (s.service_key === "private") isPrivateActive = Boolean(s.is_active);
      }
    }

    if (plansRes.data && plansRes.data.length > 0) {
      initialPlans = plansRes.data.map((p) => ({
        id: p.id as string,
        name: (p.name as string) || "Formule",
        code: (p.code as string) || null,
        type: ((p.type as string) || "").toLowerCase(),
        commitment: (p.commitment as "monthly" | "annual" | null) || "monthly",
        price_cents: typeof p.price_cents === "number" ? p.price_cents : 0,
        private_sessions_per_period: typeof p.private_sessions_per_period === "number" ? p.private_sessions_per_period : null,
        is_active: p.is_active !== false,
      }));
    }
  } catch (err) {
    console.warn("[TarifsPage] Erreur récupération Supabase :", err);
  }

  return (
    <div className="pt-20 bg-transparent min-h-screen">
      <PricingSection
        isSmallGroupActive={isSmallGroupActive}
        isPrivateActive={isPrivateActive}
        initialPlans={initialPlans}
      />
    </div>
  );
}

