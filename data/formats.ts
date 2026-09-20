import type { TrialSessionType } from "@/lib/trial-pricing";

export interface FormatSectionItem {
  title: string;
  badge?: string;
  description: string;
  points?: string[];
}

export interface FormatDetail {
  slug: string;
  title: string;
  h1: string;
  subtitle: string;
  category: string;
  image: string;
  alt: string;
  shortDescription: string;
  intro: string[];
  targetAudience: {
    title: string;
    description: string;
    items: string[];
  };
  sessionFlow: {
    title: string;
    steps: {
      number: string;
      title: string;
      description: string;
    }[];
  };
  sections: FormatSectionItem[];
  benefits: string[];
  metaTitle: string;
  metaDescription: string;
  preselectedType?: TrialSessionType;
}

export const formatsData: Record<string, FormatDetail> = {
  "coaching-prive": {
    slug: "coaching-prive",
    title: "COACHING PRIVÉ",
    h1: "Coaching privé",
    subtitle: "Un accompagnement personnalisé pour progresser avec précision et efficacité.",
    category: "Accompagnement Sur-Mesure",
    image: "/coach-parcours.jpg",
    alt: "Séance de Coaching Privé de Boxe à Marseille 13010 - Striking Camp",
    shortDescription: "Un accompagnement personnalisé avec un coach, adapté à votre niveau, vos objectifs et votre progression.",
    intro: [
      "Le coaching privé au Striking Camp est la formule d'entraînement la plus individualisée et la plus efficace pour progresser à votre propre rythme.",
      "Aux côtés du coach Mahfoud Mohamed, vous bénéficiez d'une attention exclusive et d'un programme 100 % sur-mesure, qu'il s'agisse d'apprendre les bases techniques de la boxe, de perfectionner votre coup d'œil, ou d'optimiser votre condition physique dans un cadre privé et exigeant."
    ],
    targetAudience: {
      title: "Pour quel public ?",
      description: "Le coaching privé s'adapte précisément à votre profil, vos contraintes d'horaires et vos attentes sportives :",
      items: [
        "Débutants souhaitant acquérir des bases techniques parfaites en toute sérénité",
        "Pratiquants confirmés désirant affiner leurs combinaisons, leurs feintes et leur timing",
        "Combattants et compétiteurs préparant des échéances sportives spécifiques",
        "Sportifs cherchant un entraînement sur-mesure combinant frappe, cardio et renforcement fonctionnel"
      ]
    },
    sessionFlow: {
      title: "Comment se déroule une séance ?",
      steps: [
        {
          number: "01",
          title: "Échauffement & Préparation articulaire",
          description: "Mise en route personnalisée selon vos capacités, activation musculaire et mobilité spécifique aux sports de percussion."
        },
        {
          number: "02",
          title: "Travail technique & Précision aux cibles",
          description: "Répétition des gestes, footwork, corrections instantanées et leçons aux paos et pattes d'ours avec le coach."
        },
        {
          number: "03",
          title: "Conditionnement & Mises en situation",
          description: "Exercices d'impact au sac, drills de réaction et ateliers cardio-combat adaptés à vos objectifs."
        },
        {
          number: "04",
          title: "Retour au calme & Bilan de progression",
          description: "Étirements ciblés, débriefing de la séance et ajustement des objectifs pour les séances suivantes."
        }
      ]
    },
    sections: [
      {
        title: "ANALYSE DU NIVEAU ET DES OBJECTIFS",
        badge: "Diagnostic Initial",
        description: "Chaque accompagnement démarre par une écoute attentive de vos besoins et une évaluation technique initiale :",
        points: [
          "Identification de votre niveau, de vos antécédents sportifs et de vos objectifs",
          "Mise en place d'un plan de progression technique et athlétique individualisé",
          "Adaptation continue du contenu des séances selon votre évolution et vos sensations"
        ]
      },
      {
        title: "TRAVAIL TECHNIQUE ET CORRECTIONS INDIVIDUALISÉES",
        badge: "Précision & Posture",
        description: "Un regard d'expert focalisé sur chaque détail de votre gestuelle :",
        points: [
          "Correction millimétrée de la posture, de la garde et de la protection du menton",
          "Perfectionnement des trajectoires de frappe (Boxe Anglaise, Kick Boxing, Muay Thaï, Striking)",
          "Déplacements fluides, transferts d'appuis et maîtrise de la distance",
          "Travail intensif aux pattes d’ours et aux paos en interaction directe avec le coach"
        ]
      },
      {
        title: "PRÉPARATION PHYSIQUE ET SUIVI CONTINU",
        badge: "Conditionnement",
        description: "Un travail athlétique ciblé pour booster votre endurance et votre explosivité :",
        points: [
          "Exercices de renforcement musculaire fonctionnel au poids du corps et kettlebells",
          "Développement du cardio, du souffle et de la vitesse de réaction",
          "Suivi régulier de vos progrès séance après séance dans un climat motivant"
        ]
      }
    ],
    benefits: [
      "100% personnalisé avec le coach",
      "Horaires flexibles sur réservation",
      "Progression accélérée et mesurable",
      "Corrections techniques instantanées"
    ],
    metaTitle: "Coaching Privé de Boxe à Marseille 13010 | Striking Camp",
    metaDescription: "Bénéficiez d'un coaching privé sur-mesure au Striking Camp Marseille : cours particulier avec le coach Mahfoud, technique, pattes d'ours et progression garantie.",
    preselectedType: "private"
  },

  "small-group": {
    slug: "small-group",
    title: "SMALL GROUP",
    h1: "Small Group",
    subtitle: "L’équilibre entre accompagnement technique et énergie du groupe.",
    category: "Groupe Réduit (12 max)",
    image: "/sacSalle.jpg",
    alt: "Entraînement en Small Group au Striking Camp Marseille",
    shortDescription: "Un entraînement en petit groupe pour bénéficier d’un suivi technique tout en profitant de la dynamique du collectif.",
    intro: [
      "Le Small Group est le format idéal pour celles et ceux qui souhaitent concilier la précision d'un accompagnement personnalisé et la dynamique stimulante de l'entraînement à plusieurs.",
      "En limitant volontairement le nombre de participants par créneau, le coach Mahfoud Mohamed peut observer, guider et corriger chaque pratiquant en temps réel, tout en créant une véritable émulation de groupe."
    ],
    targetAudience: {
      title: "Pour quel public ?",
      description: "Le Small Group est conçu pour tous les pratiquants recherchant un cadre d'apprentissage privilégié :",
      items: [
        "Débutants souhaitant apprendre les bons gestes avec un suivi attentif du coach",
        "Pratiquants intermédiaires désireux de franchir un cap technique et tactique",
        "Confirmés recherchant des partenaires réguliers et des drills de haute intensité",
        "Sportifs appréciant la convivialité et la motivation d'un petit groupe soudé"
      ]
    },
    sessionFlow: {
      title: "Comment se déroule une séance ?",
      steps: [
        {
          number: "01",
          title: "Échauffement structuré en groupe",
          description: "Préparation cardiovasculaire, gammes de déplacements au sol et activation motrice spécifique."
        },
        {
          number: "02",
          title: "Ateliers techniques & Drills supervisés",
          description: "Travail par binômes, leçons aux paos et pattes d'ours avec corrections individuelles constantes."
        },
        {
          number: "03",
          title: "Mises en situation & Répétitions au sac",
          description: "Combinaisons ciblées, travail de la distance, du cadrage et de la précision d'impact."
        },
        {
          number: "04",
          title: "Défi cardio-combat & Clôture",
          description: "Circuit de renforcement collectif pour terminer sur un effort intense et gratifiant."
        }
      ]
    },
    sections: [
      {
        title: "SUIVI TECHNIQUE ET CORRECTIONS RÉGULIÈRES",
        badge: "Qualité d'Encadrement",
        description: "Un format en effectif restreint qui garantit une vraie attention portée à chacun :",
        points: [
          "Corrections individuelles fréquentes sur la posture, la garde et les frappes",
          "Répétition guidée des gestes techniques pour éviter l'ancrage de mauvaises habitudes",
          "Conseils personnalisés sur le placement du corps et la respiration"
        ]
      },
      {
        title: "DRILLS PAR BINÔMES ET TRAVAIL AUX CIBLES",
        badge: "Pratique Dynamique",
        description: "Une alternance rythmée d'ateliers variés pour développer l'ensemble des qualités martiales :",
        points: [
          "Exercices à deux pour aiguiser le sens du timing, le coup d'œil et les réflexes",
          "Passages réguliers aux pattes d'ours et aux paos thaï",
          "Travail des enchaînements, des changements de niveau et des feintes",
          "Mises en situation thématiques encadrées en toute sécurité"
        ]
      },
      {
        title: "ÉMULATION COLLECTIVE ET CONVIVIALITÉ",
        badge: "Motivation",
        description: "L'énergie stimulante du collectif pour repousser ses limites :",
        points: [
          "Ambiance d'entraide, de respect mutuel et de dépassement de soi",
          "Partenaires réguliers favorisant une progression technique commune",
          "Séances dynamiques et motivantes où chacun donne le meilleur"
        ]
      }
    ],
    benefits: [
      "Effectif réduit (12 places max)",
      "Suivi technique individualisé",
      "Dynamique de groupe motivante",
      "Accès aux disciplines du club"
    ],
    metaTitle: "Cours de Boxe en Small Group à Marseille 13010 | Striking Camp",
    metaDescription: "Entraînez-vous en Small Group au Striking Camp Marseille : effectif réduit (12 max), suivi personnalisé, drills techniques et émulation collective.",
    preselectedType: "small_group"
  },

  "collectifs": {
    slug: "collectifs",
    title: "COURS COLLECTIFS",
    h1: "Cours collectifs",
    subtitle: "Apprendre, progresser et pratiquer les sports de combat debout dans une dynamique de groupe.",
    category: "Dynamique Collective",
    image: "/kickboxing.jpg",
    alt: "Cours Collectifs de Boxe et Kick Boxing à Marseille - Striking Camp",
    shortDescription: "Des séances accessibles à tous pour apprendre, progresser et développer sa technique dans une dynamique de groupe.",
    intro: [
      "Les cours collectifs incarnent l'énergie et la culture sportive du Striking Camp à Marseille (13010). Ils offrent à chacun l'opportunité de s'entraîner avec intensité, d'apprendre des techniques authentiques et de partager la passion du combat debout.",
      "Structurés par cycles et disciplines (Boxe Anglaise, Kick Boxing, Boxe Thaï, Striking, Lady Striking, Kid Boxing), nos cours collectifs sont conçus pour allier exigence technique, dépense physique complète et convivialité."
    ],
    targetAudience: {
      title: "Pour quel public ?",
      description: "Les cours collectifs accueillent tous les profils de pratiquants dans un cadre structuré et sécurisé :",
      items: [
        "Tous les niveaux : du grand débutant au pratiquant régulier et confirmé",
        "Personnes recherchant un entraînement complet combinant cardio intense et technique",
        "Passionnés souhaitant pratiquer régulièrement avec une grande variété de partenaires",
        "Sportifs motivés par l'énergie collective, le partage et la culture du club"
      ]
    },
    sessionFlow: {
      title: "Comment se déroule une séance ?",
      steps: [
        {
          number: "01",
          title: "Échauffement martial & Cardio",
          description: "Montée progressive en fréquence cardiaque, footwork, corde à sauter et mobilité articulaire."
        },
        {
          number: "02",
          title: "Apprentissage technique & Démonstration",
          description: "Explication détaillée des combinaisons du jour par le coach et décomposition des mouvements."
        },
        {
          number: "03",
          title: "Drills, Sac de frappe & Paos",
          description: "Répétition intensive par binômes, travail de percussion aux sacs lourds et paos."
        },
        {
          number: "04",
          title: "Mises en situation & Renforcement",
          description: "Sparring guidé à la touche légère (selon niveau) et circuit de renforcement musculaire final."
        }
      ]
    },
    sections: [
      {
        title: "APPRENTISSAGE DES FONDAMENTAUX ET DRILLS",
        badge: "Répétition & Technique",
        description: "Une progression pas-à-pas pour maîtriser l'ensemble des composantes du combat debout :",
        points: [
          "Apprentissage rigoureux des fondamentaux : posture, garde, équilibre et déplacements",
          "Travail de la distance, du cadrage et de la vision globale",
          "Répétitions techniques d'enchaînements poings et pieds-poings",
          "Frappes au sac lourd et travail aux pattes d'ours / paos thaï"
        ]
      },
      {
        title: "DÉPENSE CARDIO ET RENFORCEMENT COMBAT",
        badge: "Condition Physique",
        description: "Des séances rythmées qui forgent le physique et le mental :",
        points: [
          "Développement de l'endurance musculaire et du souffle",
          "Exercices fractionnés au sac et circuits fonctionnels",
          "Amélioration de l'explosivité, de la réactivité et du tonus postural"
        ]
      },
      {
        title: "MISES EN SITUATION ET SPARRING GUIDÉ",
        badge: "Application Contrôlée",
        description: "L'opportunité de tester ses réflexes en toute sécurité :",
        points: [
          "Exercices d'opposition à thème sous la supervision attentive du coach",
          "Sparring guidé à la touche légère, basé sur le respect et l'apprentissage mutuel",
          "Progression adaptée selon l'expérience et le rythme de chacun"
        ]
      }
    ],
    benefits: [
      "Ambiance collective et stimulante",
      "Toutes disciplines debout enseignées",
      "Dépense physique et cardio élevé",
      "Créneaux matin, midi et soir"
    ],
    metaTitle: "Cours Collectifs de Boxe à Marseille 13010 | Striking Camp",
    metaDescription: "Rejoignez les cours collectifs du Striking Camp à Marseille : Boxe Anglaise, Kick Boxing, Boxe Thaï et Striking dans une ambiance dynamique et motivante.",
    preselectedType: "collective"
  }
};

export const publicFormatList = [
  formatsData["coaching-prive"],
  formatsData["small-group"],
  formatsData["collectifs"]
];

export function getFormatBySlug(slug: string): FormatDetail | undefined {
  return formatsData[slug];
}

export function getAllFormatSlugs(): string[] {
  return Object.keys(formatsData);
}
