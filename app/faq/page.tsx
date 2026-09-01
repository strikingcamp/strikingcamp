import type { Metadata } from "next";
import FaqPageView from "@/components/sections/FaqPageView";
import { allFaqItems } from "@/data/faq";

export const metadata: Metadata = {
  title: "FAQ Boxe & Sports de Combat à Marseille | Striking Camp 13010",
  description:
    "Toutes les réponses à vos questions sur les cours de Boxe Anglaise, Kick Boxing, Muay Thaï, Lady Striking (100% femmes), Small Group et cours privés au Striking Camp Marseille.",
  alternates: {
    canonical: "/faq",
  },
  openGraph: {
    title: "FAQ Boxe & Sports de Combat à Marseille | Striking Camp 13010",
    description:
      "Toutes les réponses à vos questions sur les cours de Boxe Anglaise, Kick Boxing, Muay Thaï, Lady Striking (100% femmes), Small Group et cours privés au Striking Camp Marseille.",
    url: "https://strikingcamp.com/faq",
    siteName: "Striking Camp",
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FAQ Boxe & Sports de Combat à Marseille | Striking Camp 13010",
    description:
      "Toutes les réponses à vos questions sur les cours de Boxe Anglaise, Kick Boxing, Muay Thaï, Lady Striking et cours privés au Striking Camp Marseille.",
  },
};

export default function FaqPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: allFaqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Accueil",
        item: "https://strikingcamp.com",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "FAQ",
        item: "https://strikingcamp.com/faq",
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <div className="pt-20 bg-transparent min-h-screen">
        <FaqPageView />
      </div>
    </>
  );
}
