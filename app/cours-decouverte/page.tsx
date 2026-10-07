import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/server";
import DiscoveryPageView, { type PublicPlan } from "@/components/sections/DiscoveryPageView";

export const metadata: Metadata = {
  title: "Cours Découverte — Boxe & Sports de Combat à Marseille (13010)",
  description:
    "Commencez par une offre découverte au Striking Camp Marseille (13010). Testez le club en groupe réduit de 12 personnes max : 1 séance (20 €), 1 mois découverte illimité (89 €) ou 3 séances (49 €).",
  alternates: {
    canonical: "https://www.strikingcamp.com/cours-decouverte",
  },
  openGraph: {
    title: "Cours Découverte de Boxe à Marseille (13010) | Striking Camp",
    description:
      "Découvrez l'univers Striking Camp, entraînez-vous en groupe réduit et trouvez la discipline qui vous correspond. 1 séance (20 €), 1 mois découverte illimité (89 €) ou 3 séances (49 €).",
    url: "https://www.strikingcamp.com/cours-decouverte",
    siteName: "Striking Camp",
    locale: "fr_FR",
    type: "website",
    images: [
      {
        url: "https://www.strikingcamp.com/sacSalle.jpg",
        width: 1200,
        height: 630,
        alt: "Cours Découverte Striking Camp Marseille 13010",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cours Découverte de Boxe à Marseille (13010) | Striking Camp",
    description:
      "Offres découverte en groupe réduit au Striking Camp Marseille (13010) : 1 séance (20 €), 1 mois découverte (89 €) et 3 séances (49 €).",
    images: ["https://www.strikingcamp.com/sacSalle.jpg"],
  },
};

export const dynamic = "force-dynamic";

export default async function CoursDecouvertePage() {
  let isSmallGroupActive = true;
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
        .select("id, name, code, type, tier, commitment, price_cents, private_sessions_per_period, is_active, is_digital_plan, badge_text, features, display_order")
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .order("name", { ascending: true }),
    ]);

    if (settingsRes.data && settingsRes.data.length > 0) {
      for (const s of settingsRes.data) {
        if (s.service_key === "small_group") isSmallGroupActive = Boolean(s.is_active);
      }
    }

    if (plansRes.data && plansRes.data.length > 0) {
      initialPlans = plansRes.data.map((p) => ({
        id: p.id as string,
        name: (p.name as string) || "Formule",
        code: (p.code as string) || null,
        type: ((p.type as string) || "").toLowerCase(),
        tier: (p.tier as string) || null,
        commitment: (p.commitment as "monthly" | "annual" | null) || "monthly",
        price_cents: typeof p.price_cents === "number" ? p.price_cents : 0,
        private_sessions_per_period: typeof p.private_sessions_per_period === "number" ? p.private_sessions_per_period : null,
        is_active: p.is_active !== false,
        is_digital_plan: Boolean(p.is_digital_plan),
        badge_text: (p.badge_text as string) || null,
        features: Array.isArray(p.features) ? p.features : null,
      }));
    }
  } catch (err) {
    console.warn("[CoursDecouvertePage] Erreur récupération Supabase :", err);
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsActivityLocation",
    name: "Striking Camp - Cours Découverte",
    description: "Séances découverte de boxe anglaise, kickboxing et boxe thaï en groupe réduit à Marseille 13010.",
    url: "https://www.strikingcamp.com/cours-decouverte",
    telephone: "06 14 95 88 49",
    address: {
      "@type": "PostalAddress",
      streetAddress: "268 avenue de la Capelette",
      addressLocality: "Marseille",
      postalCode: "13010",
      addressCountry: "FR",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 43.2798,
      longitude: 5.4011,
    },
    offers: [
      {
        "@type": "Offer",
        name: "Découverte — 1 Séance",
        price: "20.00",
        priceCurrency: "EUR",
        description: "1 séance découverte en groupe réduit",
        url: "https://www.strikingcamp.com/cours-decouverte#offres",
      },
      {
        "@type": "Offer",
        name: "1 Mois Découverte",
        price: "89.00",
        priceCurrency: "EUR",
        description: "Accès illimité aux cours adultes pendant 30 jours",
        url: "https://www.strikingcamp.com/cours-decouverte#offres",
      },
      {
        "@type": "Offer",
        name: "Découverte — 3 Séances",
        price: "49.00",
        priceCurrency: "EUR",
        description: "3 séances découverte en groupe réduit",
        url: "https://www.strikingcamp.com/cours-decouverte#offres",
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="pt-20 bg-transparent min-h-screen">
        <DiscoveryPageView
          isSmallGroupActive={isSmallGroupActive}
          initialPlans={initialPlans}
        />
      </div>
    </>
  );
}
