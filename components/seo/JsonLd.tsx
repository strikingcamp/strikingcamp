import React from "react";

export interface FaqItem {
  question: string;
  answer: string;
}

export const defaultFaqItems: FaqItem[] = [
  {
    question: "Peut-on commencer la boxe sans aucune expérience préalable ?",
    answer:
      "Absolument. Striking Camp accueille tous les niveaux, du grand débutant n'ayant jamais mis les gants jusqu'au combattant confirmé. Chaque séance intègre un apprentissage pas-à-pas des fondamentaux : déplacements, garde, posture et frappes de base.",
  },
  {
    question: "Les débutants sont-ils acceptés dans tous les cours ?",
    answer:
      "Oui. Nos séances en Small Group (4 à 6 personnes max) et nos cours collectifs sont structurés de façon progressive. Le coach Mahfoud adapte les consignes et l'intensité selon le niveau individuel de chaque pratiquant.",
  },
  {
    question: "Quels sports de combat sont proposés au Striking Camp à Marseille ?",
    answer:
      "Nous enseignons la Boxe Anglaise, le Kick Boxing, la Boxe Thaï (Muay Thaï), le Striking orienté MMA (pieds-poings, clinch, transitions), le Boxing Bag (frappe au sac), le KB Shred (conditionnement physique aux kettlebells) ainsi que le Lady Striking.",
  },
  {
    question: "Où se trouve le club Striking Camp à Marseille ?",
    answer:
      "Le club est situé au 268 avenue de la Capelette, 13010 Marseille. Il est facilement accessible depuis les arrondissements limitrophes (13008, 13009, 13005, 13006) et dispose de solutions de transport en commun et de stationnement à proximité.",
  },
  {
    question: "Faut-il déjà être très sportif ou en forme pour s'inscrire ?",
    answer:
      "Non, la condition physique se développe au fur et à mesure des entraînements. L'objectif de Striking Camp est justement de vous accompagner dans votre transformation physique et technique, quel que soit votre point de départ.",
  },
  {
    question: "Existe-t-il des cours exclusivement réservés aux femmes ?",
    answer:
      "Oui, nous proposons le cours Lady Striking, une section 100 % féminine conçue pour apprendre les sports de combat dans une ambiance bienveillante, dynamique et motivante, avec un travail complet de technique, cardio et renforcement.",
  },
  {
    question: "Qu'est-ce que le Lady Striking ?",
    answer:
      "Le Lady Striking est un programme d'entraînement exclusif combinant les techniques de percussion (pieds, poings, coudes, genoux), le travail au sac de frappe et le renforcement musculaire. Il permet de se dépenser, d'apprendre à frapper avec puissance et précision sans subir d'impact violent.",
  },
  {
    question: "Peut-on pratiquer la boxe sans faire de combat dur ou de sparring appuyé ?",
    answer:
      "Tout à fait. La sécurité et l'intégrité physique de nos adhérents sont prioritaires. Le travail se fait principalement aux paos, sacs de frappe, pattes d'ours et drills techniques. Les sparrings éventuels sont toujours guidés, à touche et facultatifs.",
  },
  {
    question: "Quels sont les créneaux horaires des entraînements ?",
    answer:
      "Striking Camp propose des créneaux adaptés à tous les rythmes de vie : le matin dès 07h00 (Morning Bag), le midi à 12h15 (pause déjeuner), en fin d'après-midi et en soirée jusqu'à 21h30 du lundi au vendredi, ainsi que le samedi matin.",
  },
  {
    question: "Comment choisir sa formule d'entraînement (Collectif, Small Group, Cours Privés) ?",
    answer:
      "Selon vos objectifs et votre budget : les Cours Collectifs pour la dynamique de groupe, les Small Group (4 à 6 personnes) pour un suivi technique rapproché et semi-personnalisé, et les Cours Privés (coaching individuel avec le coach Mahfoud) pour une progression maximale sur-mesure.",
  },
];

export default function JsonLd() {
  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": ["SportsActivityLocation", "ExerciseGym"],
    "@id": "https://strikingcamp.com/#organization",
    name: "Striking Camp",
    alternateName: ["Striking Camp Marseille", "Striking Camp 13010"],
    description:
      "Club de référence à Marseille (13010) pour les sports de combat : Boxe Anglaise, Kick Boxing, Muay Thaï, Striking et cours Lady 100% femmes. Coaching individuel et Small Group par Mahfoud Mohamed.",
    url: "https://strikingcamp.com",
    telephone: "+33614958849",
    email: "strikingcamp13@gmail.com",
    priceRange: "€€",
    image: "https://strikingcamp.com/icon.png",
    logo: "https://strikingcamp.com/icon.png",
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
      "Striking MMA",
      "Lady Striking",
      "Boxing Bag",
      "KB Shred",
      "Coaching Privé",
      "Small Group Training",
    ],
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: defaultFaqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </>
  );
}
