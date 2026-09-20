export interface DisciplineSection {
  title: string;
  badge?: string;
  description: string;
  points?: string[];
}

export interface DisciplineDetail {
  slug: string;
  title: string;
  h1: string;
  subtitle: string;
  category: string;
  image: string;
  alt: string;
  shortDescription: string;
  intro: string[];
  sections: DisciplineSection[];
  highlights: string[];
  metaTitle: string;
  metaDescription: string;
  preselectedDiscipline: string;
}

export const disciplinesData: Record<string, DisciplineDetail> = {
  "boxe-anglaise": {
    slug: "boxe-anglaise",
    title: "BOXE ANGLAISE",
    h1: "Boxe anglaise",
    subtitle: "L'art du noble art : précision des poings, science des esquives et maîtrise du timing.",
    category: "Le Noble Art",
    image: "/boxe.webp",
    alt: "Cours de Boxe Anglaise à Marseille 13010 - Striking Camp",
    shortDescription: "Discipline basée sur les techniques de poings, les déplacements, la gestion de la distance, la défense et le timing.",
    intro: [
      "La Boxe Anglaise, souvent surnommée le noble art, est une discipline exigeante axée exclusivement sur les techniques de frappe aux poings, le coup d'œil, les déplacements et la stratégie défensive.",
      "Au Striking Camp à Marseille (13010), l'apprentissage de la boxe anglaise est conçu pour forger des bases techniques solides tout en développant l'explosivité, la coordination et la réactivité face à l'adversaire."
    ],
    sections: [
      {
        title: "FONDAMENTAUX",
        badge: "Bases & Posture",
        description: "L'apprentissage rigoureux des bases indispensables pour maîtriser la gestuelle et les trajectoires de frappe :",
        points: [
          "Posture et équilibre dynamique sur les appuis",
          "Positionnement de la garde et protection active du menton",
          "Déplacements et footwork : glissements, pivots et transferts de poids",
          "Gestion précise de la distance et du timing",
          "Maîtrise du jab (bras avant) comme arme de contrôle et de cadrage",
          "Déplacements latéraux et circulaires autour de l'adversaire",
          "Système défensif complet : esquives rotatives, axiales, blocages et parades",
          "Coordination motrice avec répétitions techniques au sol, cerceaux et déplacements guidés"
        ]
      },
      {
        title: "DRILLS",
        badge: "Précision & Vitesse",
        description: "Des exercices rythmés et ciblés pour automatiser les enchaînements et aiguiser le timing :",
        points: [
          "Travail d'enchaînements poings (directs, crochets, uppercuts) avec fluidité",
          "Développement de la précision d'impact et de la vitesse d'exécution",
          "Répétition technique intensive aux paos et aux pattes d'ours avec le coach",
          "Frappe au sac lourd pour la puissance, le souffle et le calibrage de l'effort",
          "Ateliers à deux pour travailler les réactions en miroir et les contre-attaques"
        ]
      },
      {
        title: "SPARRING GUIDÉ",
        badge: "Opposition Maîtrisée",
        description: "Une mise en pratique progressive et sécurisée des acquis techniques dans un cadre encadré :",
        points: [
          "Thèmes et contraintes pédagogiques fixés par le coach (vitesse modérée, touche contrôlée)",
          "Application des esquives et des contre-attaques en situation réelle",
          "Gestion du stress, de la respiration et de la lucidité sur le ring",
          "Progression adaptée au niveau de chaque pratiquant, du débutant au confirmé"
        ]
      }
    ],
    highlights: [
      "Frappe aux poings exclusive",
      "Footwork & Cerceaux",
      "Pattes d'ours & Paos",
      "Opposition progressive encadrée"
    ],
    metaTitle: "Cours de Boxe Anglaise à Marseille 13010 | Striking Camp",
    metaDescription: "Découvrez les cours de Boxe Anglaise au Striking Camp à Marseille : travail des poings, déplacements, footwork, drills aux pattes d'ours et sparring guidé.",
    preselectedDiscipline: "Boxe Anglaise"
  },

  "kick-boxing": {
    slug: "kick-boxing",
    title: "KICK BOXING",
    h1: "Kick Boxing",
    subtitle: "La fluidité des enchaînements pieds-poings, puissance et condition physique athlétique.",
    category: "Pieds-Poings",
    image: "/kickboxing.jpg",
    alt: "Entraînement de Kick Boxing à Marseille - Striking Camp",
    shortDescription: "Discipline combinant les techniques de poings et de jambes avec un travail important sur les déplacements, la distance et le timing.",
    intro: [
      "Le Kick Boxing est un sport de combat dynamique combinant harmonieusement la puissance des frappes de poings et la variété des coups de pied sous toutes leurs formes.",
      "Au club Striking Camp de Marseille, notre pédagogie met l'accent sur la fluidité des combinaisons, la précision des trajectoires et le développement d'un cardio combat complet."
    ],
    sections: [
      {
        title: "FONDAMENTAUX",
        badge: "Pieds & Poings",
        description: "La construction des fondamentaux indispensables pour lier les segments hauts et bas :",
        points: [
          "Posture d'équilibre et garde adaptée aux attaques pieds-poings",
          "Déplacements vifs, replacement après frappe et gestion de la distance",
          "Cadrage de l'adversaire et occupation du centre de l'espace",
          "Utilisation du jab pour préparer les attaques en jambes",
          "Techniques complètes de poings : directs, crochets et uppercuts",
          "Techniques de coups de pied : low kicks, middle kicks, high kicks et front kicks",
          "Premières combinaisons de liaison poings-pieds et pieds-poings"
        ]
      },
      {
        title: "DRILLS",
        badge: "Enchaînements & Rythme",
        description: "Des ateliers ciblés pour développer la puissance explosive et la fluidité motrice :",
        points: [
          "Enchaînements dynamiques pieds-poings avec variations de hauteur et de rythme",
          "Recherche de la précision d'impact et de l'accélération sur le dernier coup",
          "Travail aux paos thaï et pattes d'ours pour encaisser et restituer l'énergie",
          "Séries au sac de frappe pour forger le cardio et l'endurance musculaire",
          "Exercices par binômes pour développer le coup d'œil et le sens du timing"
        ]
      },
      {
        title: "SPARRING GUIDÉ",
        badge: "Application & Décision",
        description: "Une mise en application progressive des combinaisons dans un environnement bienveillant :",
        points: [
          "Opposition encadrée avec consignes précises données par le coach",
          "Travail spécifique de la distance de frappe et des angles d'attaque",
          "Prise de décision rapide sous pression modérée",
          "Respect mutuel et contrôle strict de la puissance pour progresser sans blessure"
        ]
      }
    ],
    highlights: [
      "Enchaînements pieds-poings",
      "Low, middle & high kicks",
      "Travail aux paos & sac",
      "Cardio combat & timing"
    ],
    metaTitle: "Cours de Kick Boxing à Marseille 13010 | Striking Camp",
    metaDescription: "Apprenez le Kick Boxing à Marseille au Striking Camp : combinaisons pieds-poings, drills techniques, paos, sac et sparring guidé par le coach Mahfoud.",
    preselectedDiscipline: "Kick Boxing"
  },

  "boxe-thai": {
    slug: "boxe-thai",
    title: "BOXE THAÏ",
    h1: "Boxe Thaï",
    subtitle: "L'art des 8 membres : poings, pieds, genoux, coudes et maîtrise du corps-à-corps.",
    category: "Art des 8 membres",
    image: "/muaythai.jpg",
    alt: "Cours de Boxe Thaï et Muay Thaï à Marseille 10e - Striking Camp",
    shortDescription: "Discipline complète utilisant les poings, pieds, genoux, coudes et le clinch (corps-à-corps).",
    intro: [
      "La Boxe Thaïlandaise, ou Muay Thaï, est un art martial séculaire réputé pour son efficacité redoutable et la richesse de son arsenal offensif et défensif.",
      "Au Striking Camp, nous enseignons le Muay Thaï authentique : maîtrise des percussions aux 8 membres, travail de saisie au corps-à-corps (clinch) et conditionnement martial respectueux de l'intégrité de chacun."
    ],
    sections: [
      {
        title: "FONDAMENTAUX",
        badge: "Arsenal Complet",
        description: "L'apprentissage des frappes spécifiques du Muay Thaï et de l'équilibre traditionnel :",
        points: [
          "Posture thaï, répartition du poids et stabilité sur la jambe arrière",
          "Garde haute adaptée aux frappes de coudes et aux saisies",
          "Déplacements rythmés et gestion des distances courtes, moyennes et longues",
          "Frappes de poings précises et coups de tibia puissants (roundhouse kicks)",
          "Techniques de coups de genoux (directs, sautés, latéraux)",
          "Techniques de coudes (circulaires, descendants, piquants)",
          "Bases du clinch : saisies à la nuque, contrôle du haut du corps et déséquilibres"
        ]
      },
      {
        title: "DRILLS",
        badge: "Paos & Répétitions",
        description: "L'art de la répétition technique aux paos traditionnels :",
        points: [
          "Travail aux paos thaï pour perfectionner l'impact du tibia et des genoux",
          "Drills combinés poings-coudes et liaisons percussions-saisies",
          "Répétitions techniques avec partenaire pour intégrer les parades et blocages",
          "Ateliers au sac lourd pour renforcer la résistance et la puissance de frappe",
          "Enchaînements avec changements de niveaux et travail de pressing"
        ]
      },
      {
        title: "SPARRING GUIDÉ",
        badge: "Clinch & Maîtrise",
        description: "Une mise en pratique progressive de l'ensemble des armes du Muay Thaï :",
        points: [
          "Opposition contrôlée avec protections adéquates",
          "Attention particulière portée à la gestion du timing et de la distance",
          "Mises en situation spécifiques de corps-à-corps (clinch et sorties de saisie)",
          "Encadrement vigilant du coach pour assurer la sécurité de tous les partenaires"
        ]
      }
    ],
    highlights: [
      "Art des 8 membres",
      "Genoux & Coudes",
      "Clinch & Saisies",
      "Paos thaïlandais authentiques"
    ],
    metaTitle: "Cours de Boxe Thaï (Muay Thaï) à Marseille 13010 | Striking Camp",
    metaDescription: "Cours de Boxe Thaï à Marseille au Striking Camp : travail complet des poings, pieds, coudes, genoux, clinch et paos thaïlandais encadrés par le coach.",
    preselectedDiscipline: "Boxe Thaï"
  },

  "striking": {
    slug: "striking",
    title: "STRIKING",
    h1: "Striking",
    subtitle: "Le travail des sports de combat debout adapté aux exigences du MMA.",
    category: "Combat Debout & MMA",
    image: "/striking.jpg",
    alt: "Cours de Striking adapté au MMA à Marseille - Striking Camp",
    shortDescription: "Le travail des sports de combat debout (Anglaise, Kick, Thaï) intégrant les contraintes spécifiques du MMA, le contrôle de cage et le clinch.",
    intro: [
      "Le Striking est une approche moderne des sports de combat debout qui rassemble les techniques les plus efficaces de la Boxe Anglaise, du Kick Boxing et de la Boxe Thaï, tout en intégrant les contraintes et réalités spécifiques du MMA.",
      "Le travail ne se limite donc pas aux frappes : le pratiquant apprend également à contrôler l'espace et la cage, à gérer le clinch et à intégrer des techniques de lutte, notamment issues de la lutte gréco-romaine, afin de comprendre comment les différentes phases de combat s'enchaînent avec fluidité."
    ],
    sections: [
      {
        title: "FONDAMENTAUX",
        badge: "Postures & Cadrage",
        description: "Les bases du combat debout adaptées aux distances et menaces du MMA :",
        points: [
          "Posture hybride et centre de gravité stable pour réagir aux tentatives d'amenée au sol",
          "Garde active et vision périphérique large",
          "Déplacements dynamiques et changements d'angles rapides",
          "Gestion de la distance longue, intermédiaire et de contact",
          "Cadrage intelligent pour couper la trajectoire de fuite de l'adversaire",
          "Combinaisons de poings de boxe anglaise adaptées aux gants de frappe réduits",
          "Coups de pied et de genoux de Kick et Thaï intégrés sans perte d'équilibre",
          "Positionnement spécifique et gestion des repères spatiaux de la cage"
        ]
      },
      {
        title: "DRILLS",
        badge: "Transitions & Timing",
        description: "Des exercices rythmés pour automatiser les transitions et les changements de distance :",
        points: [
          "Enchaînements de frappes suivis immédiatement de replacement ou d'entrée en saisie",
          "Travail du timing sur les entrées explosives et les sorties sécurisées",
          "Développement de la précision sur cibles mobiles",
          "Exercices de feintes pour ouvrir des opportunités d'impact ou de contrôle",
          "Combinaisons adaptées au contexte MMA avec paos, pattes d'ours, sac et partenaire"
        ]
      },
      {
        title: "CLINCH & CONTRÔLE DE LA CAGE",
        badge: "Section Spécifique",
        description: "La maîtrise essentielle des phases de contact rapproché et de gestion de la cage :",
        points: [
          "Contrôle de la cage : utilisation des surfaces pour coincer et neutraliser l'adversaire",
          "Positionnement du corps, de la tête et des appuis contre le grillage",
          "Maintien de la pression physique et gestion de l'énergie",
          "Travail offensif et défensif en clinch (underhooks, overhooks, head control)",
          "Gestion des phases de transition entre frappe à distance et combat collé à la cage"
        ]
      },
      {
        title: "LUTTE",
        badge: "Contrôles & Gréco-Romaine",
        description: "L'introduction méthodique des techniques de lutte indispensables au Striking complet :",
        points: [
          "Introduction de techniques de préhension adaptées au travail Striking / MMA",
          "Contrôles du haut du corps et verrouillages issus de la lutte gréco-romaine",
          "Utilisation du pummeling pour gagner la position dominante au contact",
          "Défense active contre les projections et maintien de la posture debout",
          "Enchaînement fluide entre phases de frappes et phases de contrôle au corps"
        ]
      },
      {
        title: "SPARRING GUIDÉ",
        badge: "Opposition & Scénarios",
        description: "Une mise en pratique encadrée permettant d'intégrer toutes les composantes du combat :",
        points: [
          "Mise en situation d'opposition contrôlée avec consignes et objectifs fixés par le coach",
          "Travail par scénarios ciblés : gestion de la distance, timing, déplacements",
          "Exercices thématiques de contrôle contre la cage et de clinch imposé",
          "Fluidité des transitions entre la frappe, la saisie et le replacement"
        ]
      }
    ],
    highlights: [
      "Debout adapté aux exigences MMA",
      "Clinch & Contrôle de la cage",
      "Techniques de lutte gréco-romaine",
      "Transitions frappes-contrôles"
    ],
    metaTitle: "Cours de Striking MMA à Marseille 13010 | Striking Camp",
    metaDescription: "Perfectionnez votre Striking au Striking Camp à Marseille : frappes debout adaptées au MMA, clinch, contrôle de cage et notions de lutte avec le coach.",
    preselectedDiscipline: "Striking"
  },

  "lady-striking": {
    slug: "lady-striking",
    title: "LADY STRIKING",
    h1: "Lady Striking",
    subtitle: "Un entraînement 100 % féminin alliant technique, cardio combat et confiance en soi.",
    category: "100% Féminin",
    image: "/fille.jpg",
    alt: "Cours de Boxe et Striking 100% Femmes à Marseille - Lady Striking",
    shortDescription: "Programme 100 % féminin accessible à toutes pour apprendre la boxe, se défouler au sac, sculpter sa condition physique et gagner en assurance.",
    intro: [
      "Le Lady Striking est une pratique sportive 100 % féminine conçue pour découvrir et maîtriser l'univers des sports de combat debout dans un environnement motivant, stimulant et bienveillant.",
      "Nos séances permettent de combiner l'apprentissage technique (boxe anglaise et pieds-poings), le travail au sac de frappe, le renforcement musculaire et le dépassement de soi, sans aucun prérequis sportif nécessaire."
    ],
    sections: [
      {
        title: "FONDAMENTAUX",
        badge: "Apprentissage Sans Prérequis",
        description: "L'apprentissage progressif des gestes justes pour pratiquer en toute sécurité :",
        points: [
          "Posture stable, équilibre et acquisition des bons réflexes de garde",
          "Apprentissage des trajectoires de frappe : directs, crochets, coups de pied de base",
          "Travail du footwork, des déplacements et du transfert d'énergie",
          "Gestion de la distance et repérage dans l'espace",
          "Développement de la coordination générale et du gainage postural"
        ]
      },
      {
        title: "DRILLS",
        badge: "Défoulement & Cardio",
        description: "Des sessions dynamiques pour dépenser un maximum d'énergie et progresser techniquement :",
        points: [
          "Enchaînements rythmés au sac de frappe pour relâcher le stress et brûler des calories",
          "Travail de précision et de timing aux paos et pattes d'ours avec le coach et entre partenaires",
          "Répétitions techniques guidées pour affiner la vitesse et la fluidité",
          "Intervalles de cardio combat pour sculpter l'endurance et le tonus musculaire",
          "Ambiance d'entraide, de bienveillance et de motivation collective"
        ]
      },
      {
        title: "SPARRING GUIDÉ",
        badge: "Optionnel & Progressif",
        description: "Une mise en pratique encadrée pour celles qui souhaitent tester leurs réflexes :",
        points: [
          "Mise en opposition progressive, à la touche légère et strictement contrôlée",
          "Exercice non obligatoire, réservé aux pratiquantes qui le désirent selon le format de séance",
          "Cadre sécurisant sous la supervision constante du coach",
          "Développement de la confiance en soi, de la réactivité et du sang-froid"
        ]
      }
    ],
    highlights: [
      "100% réservé aux femmes",
      "Accessible à tous les niveaux",
      "Cardio-boxing & Renforcement",
      "Défoulement & Confiance en soi"
    ],
    metaTitle: "Cours Lady Striking 100% Femmes à Marseille | Striking Camp",
    metaDescription: "Cours de boxe et striking 100% femmes à Marseille au Striking Camp : technique, cardio, sac de frappe et confiance en soi dans une ambiance bienveillante.",
    preselectedDiscipline: "Lady Striking"
  },

  "kid-boxing": {
    slug: "kid-boxing",
    title: "KID BOXING",
    h1: "Kid Boxing",
    subtitle: "Le Kick Boxing adapté aux enfants : motricité, coordination, respect et apprentissage ludique.",
    category: "Enfants & Juniors",
    image: "/kickboxing.jpg",
    alt: "Cours de Kid Boxing pour enfants à Marseille - Striking Camp",
    shortDescription: "Approche du Kick Boxing adaptée aux enfants : développement de la motricité, de la coordination, de l'équilibre et du respect à travers des jeux éducatifs.",
    intro: [
      "Le Kid Boxing est une approche pédagogique du Kick Boxing spécialement pensée et conçue pour les enfants et les jeunes pratiquants.",
      "Loin de toute notion de combat violent ou de préparation compétitive prématurée, l'objectif fondamental est l'éveil corporel, le développement de la motricité, l'apprentissage de la discipline martiale et le plaisir du jeu sportif dans un cadre sécurisant."
    ],
    sections: [
      {
        title: "DÉVELOPPEMENT TECHNIQUE",
        badge: "Apprentissage Pas-à-Pas",
        description: "Une découverte structurée et sécurisée des bases de la boxe et du Kick Boxing :",
        points: [
          "Apprentissage des positions stables et de la bonne tenue de la garde",
          "Découverte progressive des gestes techniques : frappes de poings guidées et kicks éducatifs",
          "Assimilation des premières notions d'équilibre, de trajectoire et de contrôle du geste",
          "Sensibilisation au respect des règles, des consignes et du partenaire de pratique"
        ]
      },
      {
        title: "MOTRICITÉ & COORDINATION",
        badge: "Éveil & Équilibre",
        description: "Des exercices ciblés pour développer les capacités physiques et motrices de l'enfant :",
        points: [
          "Exercices de motricité globale : sauts, déplacements multidirectionnels, parcours au sol",
          "Travail de la coordination bras-jambes et de la synchronisation motrice",
          "Amélioration de l'équilibre dynamique et de la souplesse naturelle",
          "Prise de conscience du corps et développement de l'aisance gestuelle"
        ]
      },
      {
        title: "GESTION DE L'ESPACE",
        badge: "Repérage & Distance",
        description: "L'apprentissage du placement et de la perception de l'environnement :",
        points: [
          "Exercices de déplacements rythmés dans la salle",
          "Compréhension des notions de distance de sécurité et de contact maîtrisé",
          "Développement du coup d'œil, de la vigilance et de l'anticipation",
          "Apprentissage du partage de l'espace avec les camarades"
        ]
      },
      {
        title: "JEUX ÉDUCATIFS",
        badge: "Plaisir & Progression",
        description: "Une pédagogie ludique pour progresser avec enthousiasme et fierté :",
        points: [
          "Intégration des apprentissages techniques au sein de jeux collectifs motivants",
          "Défis ludiques adaptés à l'âge et au rythme de développement de chaque enfant",
          "Valorisation de l'effort, de la persévérance et de la progression personnelle",
          "Création d'un climat d'encouragement mutuel, de camaraderie et de confiance"
        ]
      }
    ],
    highlights: [
      "Kick Boxing adapté aux enfants",
      "Parcours de motricité & équilibre",
      "Jeux éducatifs & ludiques",
      "Respect, discipline & sécurité"
    ],
    metaTitle: "Cours de Boxe Enfant (Kid Boxing) à Marseille 13010 | Striking Camp",
    metaDescription: "Cours de Kid Boxing pour enfants à Marseille au Striking Camp : motricité, coordination, équilibre et apprentissage ludique dans un cadre sécurisant.",
    preselectedDiscipline: "Kick Boxing"
  }
};

export const publicDisciplineList = [
  disciplinesData["boxe-anglaise"],
  disciplinesData["kick-boxing"],
  disciplinesData["boxe-thai"],
  disciplinesData["striking"],
  disciplinesData["lady-striking"],
  disciplinesData["kid-boxing"]
];

export function getDisciplineBySlug(slug: string): DisciplineDetail | undefined {
  return disciplinesData[slug];
}

export function getAllDisciplineSlugs(): string[] {
  return Object.keys(disciplinesData);
}
