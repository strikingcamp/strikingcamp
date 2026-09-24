import React from "react";

export default function JsonLd() {
  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": ["SportsActivityLocation", "ExerciseGym"],
    "@id": "https://www.strikingcamp.com/#organization",
    name: "Striking Camp",
    alternateName: ["Striking Camp Marseille", "Striking Camp 13010"],
    description:
      "Club de référence à Marseille (13010) pour les sports de combat : Boxe Anglaise, Kick Boxing, Muay Thaï, Striking et cours Lady 100% femmes. Coaching individuel et Small Group par Mahfoud Mohamed.",
    url: "https://www.strikingcamp.com",
    telephone: "+33614958849",
    email: "strikingcamp13@gmail.com",
    priceRange: "€€",
    image: "https://www.strikingcamp.com/icon.png",
    logo: "https://www.strikingcamp.com/icon.png",
    address: {
      "@type": "PostalAddress",
      streetAddress: "268 avenue de la Capelette",
      addressLocality: "Marseille",
      postalCode: "13010",
      addressRegion: "Provence-Alpes-Côte d'Azur",
      addressCountry: "FR",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 43.2783,
      longitude: 5.4026,
    },
    hasMap: "https://maps.google.com/?q=268+Avenue+de+la+Capelette+13010+Marseille",
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "07:00",
        closes: "21:30",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Saturday"],
        opens: "10:00",
        closes: "14:00",
      },
    ],
    founder: {
      "@type": "Person",
      name: "Mahfoud Mohamed",
      jobTitle: "Coach & Fondateur",
      description:
        "Originaire de Marseille, Mahfoud Mohamed pratique les sports de combat depuis l'âge de 6 ans (Karaté traditionnel, Aïkido, Jiu-Jitsu japonais, Kick Boxing et Boxe Thaï).",
    },
    knowsAbout: [
      "Boxe Anglaise",
      "Kick Boxing",
      "Boxe Thaï",
      "Muay Thaï",
      "Striking",
      "Lady Striking",
      "Boxing Bag",
      "KB Shred",
      "Coaching Privé",
      "Small Group Training",
    ],
    sameAs: [
      "https://www.instagram.com/strikingcamp/",
      "https://www.youtube.com/@strikingcamp",
    ],
  };

  const webSiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": "https://www.strikingcamp.com/#website",
    url: "https://www.strikingcamp.com",
    name: "Striking Camp",
    description: "Club de Boxe & Sports de Combat à Marseille (13010)",
    publisher: {
      "@id": "https://www.strikingcamp.com/#organization",
    },
    inLanguage: "fr-FR",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteSchema) }}
      />
    </>
  );
}
