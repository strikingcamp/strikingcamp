export interface FaqItemDetailed {
  category: "debuter" | "disciplines" | "lady" | "formules" | "pratique";
  question: string;
  answer: string;
}

export const faqCategories = [
  { id: "all", label: "Toutes les questions" },
  { id: "debuter", label: "Débuter & Inscription" },
  { id: "disciplines", label: "Disciplines & Entraînement" },
  { id: "lady", label: "Lady Striking (100% Femmes)" },
  { id: "formules", label: "Formules & Organisation" },
  { id: "pratique", label: "Informations pratiques" },
] as const;

export const allFaqItems: FaqItemDetailed[] = [
  // 1. Débuter & Inscription
  {
    category: "debuter",
    question: "Peut-on débuter la boxe sans aucune expérience préalable ?",
    answer:
      "Oui, parfaitement. Le Striking Camp accueille aussi bien les personnes qui n'ont jamais pratiqué de sport de combat que les pratiquants plus expérimentés. L'apprentissage des bases (posture, garde, déplacements et frappes) se fait de manière progressive et encadrée.",
  },
  {
    category: "debuter",
    question: "Faut-il déjà avoir une bonne condition physique pour s'inscrire ?",
    answer:
      "Non, la condition physique se construit et progresse au fil des séances. Les entraînements sont pensés pour permettre à chacun d'évoluer à son rythme, selon son niveau de départ et ses objectifs personnels.",
  },
  {
    category: "debuter",
    question: "Quel équipement doit-on apporter pour les premiers entraînements ?",
    answer:
      "Pour vos premières séances, prévoyez une tenue de sport confortable (short ou legging, t-shirt), des chaussures propres réservées à la salle, une serviette et une bouteille d'eau. Pour le matériel spécifique (gants, bandages, protège-tibias), le coach pourra vous conseiller pour vous équiper progressivement.",
  },
  {
    category: "debuter",
    question: "Comment s'inscrire ou réserver son premier cours ?",
    answer:
      "Vous pouvez nous contacter via la page Contact ou créer votre compte directement sur notre site pour découvrir nos formules et rejoindre les entraînements.",
  },

  // 2. Disciplines & Entraînement
  {
    category: "disciplines",
    question: "Quels sports de combat sont enseignés au Striking Camp ?",
    answer:
      "Le club propose des cours de Boxe Anglaise, Kick Boxing, Boxe Thaï (Muay Thaï), Striking (combat debout complet), Boxing Bag (travail au sac), KB Shred (renforcement fonctionnel) et Lady Striking (section féminine).",
  },
  {
    category: "disciplines",
    question: "Y a-t-il un risque de blessure ou de coups violents ?",
    answer:
      "L'encadrement et la maîtrise technique sont au cœur de notre méthode. Les séances reposent essentiellement sur le travail aux paos, sacs de frappe, pattes d'ours et drills à deux. Lorsque des mises de gants sont proposées, elles sont encadrées, réalisées à la touche avec contrôle de la puissance et adaptées au niveau des participants.",
  },
  {
    category: "disciplines",
    question: "Quelle est la différence entre la Boxe Anglaise, le Kick Boxing et la Boxe Thaï ?",
    answer:
      "La Boxe Anglaise se concentre sur les frappes avec les poings, les esquives et le jeu de jambes. Le Kick Boxing combine les poings et les coups de pied. La Boxe Thaï (Muay Thaï) intègre en plus les frappes de coudes, de genoux et le travail au corps-à-corps (clinch).",
  },
  {
    category: "disciplines",
    question: "En quoi consiste la discipline du Striking ?",
    answer:
      "Le Striking est une discipline qui mélange les sports de combat debout : boxe anglaise, kick boxing et boxe thaï, avec le contrôle de la cage, le clinch et des techniques de lutte gréco-romaine adaptées au travail debout.",
  },
  {
    category: "disciplines",
    question: "Qu'est-ce que le Boxing Bag et le KB Shred ?",
    answer:
      "Le Boxing Bag est une séance dynamique axée sur le travail au sac de frappe, combinant intensité cardiovasculaire et répétitions techniques sans opposition directe. Le KB Shred est un entraînement de préparation physique utilisant des kettlebells et des mouvements fonctionnels pour développer l'endurance et la puissance.",
  },

  // 3. Lady Striking (100% Femmes)
  {
    category: "lady",
    question: "Qu'est-ce que le programme Lady Striking ?",
    answer:
      "Le Lady Striking est un créneau exclusivement réservé aux femmes, conçu pour s'entraîner aux sports de combat dans une ambiance motivante, conviviale et accessible à toutes.",
  },
  {
    category: "lady",
    question: "Les débutantes peuvent-elles participer au Lady Striking ?",
    answer:
      "Oui, ce cours est ouvert à tous les niveaux, y compris aux personnes qui découvrent la discipline. Il permet d'acquérir les gestes techniques, de se dépenser et de travailler sa condition physique de manière progressive.",
  },
  {
    category: "lady",
    question: "Y a-t-il des combats ou des sparrings durs en Lady Striking ?",
    answer:
      "Non, le cours est axé sur l'apprentissage technique, le travail aux paos, la frappe au sac et le renforcement musculaire. Les exercices sont pensés pour progresser techniquement et physiquement dans un cadre maîtrisé et sécurisant.",
  },
  {
    category: "lady",
    question: "Quels sont les créneaux dédiés au Lady Striking dans le planning ?",
    answer:
      "Le Lady Striking propose 3 séances hebdomadaires : le mardi de 17:00 à 18:00, le jeudi de 17:30 à 18:30 et le samedi de 12:30 à 13:30. Vous pouvez retrouver la grille complète sur la page Planning.",
  },

  // 4. Formules & Organisation
  {
    category: "formules",
    question: "Quelles sont les formules d'entraînement proposées ?",
    answer:
      "Striking Camp propose plusieurs formules d'adhésion : les Cours Adultes (Essentiel à 499 € / an ou All Access illimité à 890 € / an), la formule dédiée Lady Striking (499 € / an, 100% féminin, 3 séances / sem), le Kid Boxing pour enfants de 5 à 13 ans (349 € / saison, accès aux événements et stages), et les Cours Privés (coaching individuel 1-on-1) avec le coach Mahfoud.",
  },
  {
    category: "formules",
    question: "Quel est le tarif et le fonctionnement de l'offre Lady Striking ?",
    answer:
      "La formule Lady Striking est proposée au tarif de 499 € / an (frais d'adhésion : 90 €, accès aux événements et stages inclus). Elle donne un accès à 3 séances par semaine sur les créneaux 100 % féminins du club, encadrés par le coach Mahfoud, combinant apprentissage technique, frappe au sac, renforcement musculaire et cardio-combat.",
  },
  {
    category: "formules",
    question: "Comment fonctionnent les cours de Kid Boxing pour enfants ?",
    answer:
      "Le Kid Boxing accueille les enfants de 5 à 13 ans, répartis en deux groupes d'âge adaptés : 5–8 ans (éveil, motricité et jeux éducatifs) et 9–13 ans (technique, coordination et discipline). L'adhésion est de 349 € pour l'ensemble de la saison (frais d'adhésion : 90 €, accès aux événements et stages inclus).",
  },
  {
    category: "formules",
    question: "Qu'est-ce que le format Cours Adulte ?",
    answer:
      "Le format Cours Adulte est un entraînement technique et physique de haut niveau dispensé en petit groupe encadré par le coach Mahfoud. Deux formules sont disponibles : Essentiel (3 séances par semaine sur créneaux dédiés) et All Access (accès illimité à tous les créneaux adultes).",
  },
  {
    category: "formules",
    question: "Les formules sont-elles avec ou sans engagement ?",
    answer:
      "Les formules Cours Adultes et Lady Striking sont proposées avec engagement annuel, le Kid Boxing pour la saison, et les Cours Privés sont disponibles au choix en formule mensuelle ou annuelle. Le détail complet de chaque offre est consultable sur la page Tarifs.",
  },

  // 5. Informations pratiques
  {
    category: "pratique",
    question: "Où se situe la salle de Striking Camp à Marseille ?",
    answer:
      "Le club Striking Camp est situé au 268 avenue de la Capelette, 13010 Marseille, dans le 10e arrondissement.",
  },
  {
    category: "pratique",
    question: "Quels sont les horaires généraux des entraînements ?",
    answer:
      "Des séances sont organisées du lundi au samedi sur plusieurs créneaux : le matin dès 07h00, à la pause de midi (12h15), en fin de journée (entre 17h00 et 21h30), ainsi que le samedi en fin de matinée.",
  },
  {
    category: "pratique",
    question: "Comment contacter le club pour une question ou un renseignement ?",
    answer:
      "Vous pouvez nous joindre par téléphone au 06.14.95.88.49, par email à strikingcamp13@gmail.com ou via le formulaire disponible sur notre page Contact.",
  },
];
