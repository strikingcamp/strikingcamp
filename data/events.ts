export type EventCategory = "stage" | "camp" | "special" | "passe";

export type EventStatus = "draft" | "confirmed" | "published" | "archived";

export interface ClubEvent {
  id: string;
  title: string;
  slug: string;
  category: EventCategory;
  categoryLabel: string;
  status: EventStatus;
  isFeatured?: boolean;
  date: string;
  time: string;
  location: string;
  coach: string;
  price: string;
  spots?: string;
  description: string;
  highlights: string[];
  recap?: string;
}

export const clubEvents: ClubEvent[] = [
  {
    id: "evt-1",
    title: "Stage Technique Muay Thaï & Corps-à-Corps",
    slug: "stage-muay-thai-avril-2026",
    category: "stage",
    categoryLabel: "Stage Technique",
    status: "published",
    isFeatured: true,
    date: "Samedi 18 Avril 2026",
    time: "14:00 – 17:30",
    location: "Striking Camp Marseille (Salle Principale)",
    coach: "Mahfoud Mohamed",
    price: "45€ (Membres) / 60€ (Externes)",
    spots: "20 places max",
    description: "Une masterclass intensive de 3h30 dédiée à la maîtrise du clinch (clinch thaï), aux techniques de coudes, genoux et à la gestion du timing en phase rapprochée.",
    highlights: [
      "Perfectionnement des saisies et des verrous de clinch",
      "Sorties d'axe et déséquilibres en corps-à-corps",
      "Combinaisons coudes/genoux avec protections spécifiques",
      "Mises en situation sous forme de sparring à thèmes",
    ],
  },
  {
    id: "evt-2",
    title: "Striking Summer Camp — 5 Jours d'Immersion",
    slug: "striking-summer-camp-2026",
    category: "camp",
    categoryLabel: "Camp Intensif",
    status: "published",
    isFeatured: false,
    date: "Du 13 au 17 Juillet 2026",
    time: "09:00 – 17:00 (Tous les jours)",
    location: "Striking Camp Marseille & Extérieurs",
    coach: "Mahfoud Mohamed + Coachs Invités",
    price: "290€ la semaine",
    spots: "15 places limitées",
    description: "Le stage de référence de l'été : 5 jours d'entraînement complet combinant préparation physique, perfectionnement technique pieds-poings, sparring dirigé et récupération sportive.",
    highlights: [
      "Préparation physique matinale et travail athlétique",
      "Technique pieds-poings avancée l'après-midi",
      "Nutrition sportive & protocoles de récupération",
      "Ambiance d'équipe et esprit combat Striking Camp",
    ],
  },
  {
    id: "evt-3",
    title: "Soirée Inter-Clubs & Sparring Dirigé",
    slug: "inter-clubs-sparring-mai-2026",
    category: "special",
    categoryLabel: "Événement Spécial",
    status: "published",
    isFeatured: false,
    date: "Vendredi 29 Mai 2026",
    time: "19:00 – 22:00",
    location: "Striking Camp Marseille",
    coach: "Staff Striking Camp",
    price: "Gratuit pour les membres",
    spots: "Sur inscription préalable",
    description: "Une rencontre conviviale et encadrée réunissant plusieurs clubs partenaires de la région marseillaise pour des rounds d'opposition technique et un moment de partage.",
    highlights: [
      "Sparrings contrôlés par niveaux avec arbitres officiels",
      "Échanges d'expérience entre pratiquants de différents horizons",
      "Collation et moment de convivialité offert après la session",
    ],
  },
  {
    id: "evt-4",
    title: "Masterclass Lady Striking & Self-Défense",
    slug: "masterclass-lady-striking",
    category: "stage",
    categoryLabel: "Stage 100% Féminin",
    status: "published",
    isFeatured: false,
    date: "Samedi 6 Juin 2026",
    time: "10:00 – 13:00",
    location: "Striking Camp Marseille",
    coach: "Mahfoud Mohamed",
    price: "35€",
    spots: "16 places",
    description: "Session 100% femmes axée sur la puissance de frappe, les réflexes de défense et le renforcement du mental dans un cadre bienveillant et stimulant.",
    highlights: [
      "Techniques de percussion directes et puissantes",
      "Gestion de la distance et désamorçage de situations d'agression",
      "Circuit cardio-boxing haute intensité",
    ],
  },
  {
    id: "evt-past-1",
    title: "Stage Hivernal : Puissance & Timing en Kick Boxing",
    slug: "stage-hiver-2026",
    category: "passe",
    categoryLabel: "Événement Passé",
    status: "archived",
    isFeatured: false,
    date: "Février 2026",
    time: "Terminé",
    location: "Striking Camp Marseille",
    coach: "Mahfoud Mohamed",
    price: "Complet",
    description: "Retour sur un week-end intensif qui a réuni 25 participants autour des stratégies de contre-attaque en K1 et kick-boxing.",
    highlights: [
      "25 participants certifiés",
      "3 heures d'analyse vidéo et mise en pratique",
      "Édition couronnée de succès",
    ],
    recap: "Une énergie incroyable et un niveau d'engagement exceptionnel de l'ensemble des boxeurs.",
  },
];
