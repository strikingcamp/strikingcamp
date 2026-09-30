export type DayName = "Lundi" | "Mardi" | "Mercredi" | "Jeudi" | "Vendredi" | "Samedi";
export type PlanningCategory = "Cours Adulte" | "Lady Striking" | "Kid Boxing";

export interface ScheduleCourse {
  name: string;
  level?: string;
  time: string;
  places?: string;
  category?: string;
  ageGroup?: string;
}

export interface SmallGroupScheduleItem {
  id: string;
  day: DayName;
  startTime: string;
  endTime: string;
  discipline: string;
  category?: "cours_adulte" | "lady_striking" | "kid_boxing";
  targetAgeGroup?: "all" | "5_8" | "9_13";
  level: string;
  maxCapacity: number;
  isActive?: boolean;
}

export const DAYS_ORDER: DayName[] = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DISCIPLINES ET NIVEAUX OFFICIELS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const SMALL_GROUP_DISCIPLINES = [
  "Boxe anglaise",
  "Kick Boxing",
  "Boxe Thaï",
  "Striking",
  "Lady Striking",
  "Kid Boxing",
  "Boxing Bag",
  "KB Shred",
] as const;

export type SmallGroupDiscipline = (typeof SMALL_GROUP_DISCIPLINES)[number];

export const SMALL_GROUP_LEVELS = [
  "Fondamentaux",
  "Drills",
  "Performance",
  "Elite",
  "Cardio",
  "5–8 ans",
  "9–13 ans",
  "Tous niveaux",
] as const;

export type SmallGroupStandardLevel = (typeof SMALL_GROUP_LEVELS)[number];
export type SmallGroupLevel = SmallGroupStandardLevel | "100% féminin";

/**
 * Retourne le niveau standard associé à une discipline.
 * Règle stricte : Lady Striking => "100% féminin".
 */
export function getStandardLevelForDiscipline(
  discipline: string,
  currentLevel?: string
): SmallGroupLevel {
  if (discipline === "Lady Striking") {
    return "100% féminin";
  }
  if (discipline === "Kid Boxing") {
    if (currentLevel === "5–8 ans" || currentLevel === "9–13 ans") {
      return currentLevel as SmallGroupLevel;
    }
    return "5–8 ans";
  }
  if (currentLevel === "100% féminin" || !currentLevel) {
    return "Fondamentaux";
  }
  return currentLevel as SmallGroupLevel;
}

/**
 * Retourne les classes CSS Tailwind unifiées pour les badges de niveaux.
 */
export function getLevelBadgeClasses(level?: string, discipline?: string): string {
  const disc = (discipline || "").toLowerCase().trim();
  const lvl = (level || "").toLowerCase().trim();

  // 1. Règle Lady Striking / 100% féminin (Rose)
  if (
    disc === "lady striking" ||
    lvl.includes("100% féminin") ||
    lvl.includes("100% feminin") ||
    lvl.includes("féminin") ||
    lvl.includes("feminin") ||
    lvl.includes("femme") ||
    lvl.includes("lady")
  ) {
    return "bg-pink-500/15 text-pink-400 border-pink-500/30";
  }

  // 2. Kid Boxing (Cyan / Brand Blue)
  if (disc === "kid boxing" || lvl.includes("ans") || lvl.includes("kid")) {
    return "bg-[#00d8ff]/15 text-[#00d8ff] border-[#00d8ff]/30";
  }

  // 3. Fondamentaux (Vert)
  if (lvl.includes("fondament") || lvl.includes("débutant") || lvl.includes("debutant")) {
    return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
  }

  // 4. Drills (Bleu cyan)
  if (lvl.includes("drill") || lvl.includes("intermédiaire") || lvl.includes("intermediaire")) {
    return "bg-[#00d8ff]/15 text-[#00d8ff] border-[#00d8ff]/30";
  }

  // 5. Performance (Orange)
  if (lvl.includes("performance")) {
    return "bg-amber-500/15 text-amber-400 border-amber-500/30";
  }

  // 6. Elite (Rouge)
  if (
    lvl.includes("elite") ||
    lvl.includes("élite") ||
    lvl.includes("sparring") ||
    lvl.includes("confirmé") ||
    lvl.includes("confirme")
  ) {
    return "bg-red-500/15 text-red-400 border-red-500/30";
  }

  // 7. Cardio (Violet)
  if (lvl.includes("cardio")) {
    return "bg-purple-500/15 text-purple-400 border-purple-500/30";
  }

  // 8. Tous niveaux / Neutre
  return "bg-brand-white/10 text-brand-white/70 border-brand-white/20";
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PLANNING OFFICIEL — SOURCE DE VÉRITÉ
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const OFFICIAL_SCHEDULE_SESSIONS: SmallGroupScheduleItem[] = [
  // LUNDI (Cours Adulte)
  { id: "ad_1", day: "Lundi", startTime: "07:00", endTime: "08:00", discipline: "Boxing Bag", category: "cours_adulte", targetAgeGroup: "all", level: "Fondamentaux", maxCapacity: 12, isActive: true },
  { id: "ad_2", day: "Lundi", startTime: "11:00", endTime: "12:00", discipline: "Boxe anglaise", category: "cours_adulte", targetAgeGroup: "all", level: "Fondamentaux", maxCapacity: 12, isActive: true },
  { id: "ad_3", day: "Lundi", startTime: "12:15", endTime: "13:15", discipline: "KB Shred", category: "cours_adulte", targetAgeGroup: "all", level: "Drills", maxCapacity: 12, isActive: true },

  // MARDI
  { id: "ad_4", day: "Mardi", startTime: "11:00", endTime: "11:50", discipline: "KB Shred", category: "cours_adulte", targetAgeGroup: "all", level: "Cardio", maxCapacity: 12, isActive: true },
  { id: "ad_5", day: "Mardi", startTime: "12:15", endTime: "13:05", discipline: "Boxing Bag", category: "cours_adulte", targetAgeGroup: "all", level: "Cardio", maxCapacity: 12, isActive: true },
  { id: "ls_1", day: "Mardi", startTime: "17:00", endTime: "18:00", discipline: "Lady Striking", category: "lady_striking", targetAgeGroup: "all", level: "100% féminin", maxCapacity: 12, isActive: true },
  { id: "ad_6", day: "Mardi", startTime: "18:00", endTime: "19:00", discipline: "Kick Boxing", category: "cours_adulte", targetAgeGroup: "all", level: "Fondamentaux", maxCapacity: 12, isActive: true },

  // MERCREDI
  { id: "ad_7", day: "Mercredi", startTime: "07:00", endTime: "08:00", discipline: "Boxing Bag", category: "cours_adulte", targetAgeGroup: "all", level: "Drills", maxCapacity: 12, isActive: true },
  { id: "kb_1", day: "Mercredi", startTime: "10:00", endTime: "11:00", discipline: "Kid Boxing", category: "kid_boxing", targetAgeGroup: "9_13", level: "9–13 ans", maxCapacity: 12, isActive: true },
  { id: "kb_2", day: "Mercredi", startTime: "11:00", endTime: "12:00", discipline: "Kid Boxing", category: "kid_boxing", targetAgeGroup: "5_8", level: "5–8 ans", maxCapacity: 12, isActive: true },
  { id: "ad_8", day: "Mercredi", startTime: "11:00", endTime: "12:00", discipline: "Kick Boxing", category: "cours_adulte", targetAgeGroup: "all", level: "Fondamentaux", maxCapacity: 12, isActive: true },
  { id: "ad_9", day: "Mercredi", startTime: "12:15", endTime: "13:15", discipline: "KB Shred", category: "cours_adulte", targetAgeGroup: "all", level: "Drills", maxCapacity: 12, isActive: true },
  { id: "ad_10", day: "Mercredi", startTime: "17:30", endTime: "18:30", discipline: "Striking", category: "cours_adulte", targetAgeGroup: "all", level: "Drills", maxCapacity: 12, isActive: true },
  { id: "ad_11", day: "Mercredi", startTime: "19:30", endTime: "20:30", discipline: "Boxe Thaï", category: "cours_adulte", targetAgeGroup: "all", level: "Fondamentaux", maxCapacity: 12, isActive: true },
  { id: "ad_12", day: "Mercredi", startTime: "20:30", endTime: "21:30", discipline: "Kick Boxing", category: "cours_adulte", targetAgeGroup: "all", level: "Drills", maxCapacity: 12, isActive: true },

  // JEUDI
  { id: "ad_13", day: "Jeudi", startTime: "11:00", endTime: "12:00", discipline: "KB Shred", category: "cours_adulte", targetAgeGroup: "all", level: "Drills", maxCapacity: 12, isActive: true },
  { id: "ad_14", day: "Jeudi", startTime: "12:15", endTime: "13:15", discipline: "Striking", category: "cours_adulte", targetAgeGroup: "all", level: "Drills", maxCapacity: 12, isActive: true },
  { id: "ls_2", day: "Jeudi", startTime: "17:30", endTime: "18:30", discipline: "Lady Striking", category: "lady_striking", targetAgeGroup: "all", level: "100% féminin", maxCapacity: 12, isActive: true },
  { id: "ad_15", day: "Jeudi", startTime: "19:30", endTime: "20:30", discipline: "Kick Boxing", category: "cours_adulte", targetAgeGroup: "all", level: "Fondamentaux", maxCapacity: 12, isActive: true },
  { id: "ad_16", day: "Jeudi", startTime: "20:30", endTime: "21:30", discipline: "Boxe Thaï", category: "cours_adulte", targetAgeGroup: "all", level: "Elite", maxCapacity: 12, isActive: true },

  // VENDREDI
  { id: "ad_17", day: "Vendredi", startTime: "07:00", endTime: "08:00", discipline: "Boxing Bag", category: "cours_adulte", targetAgeGroup: "all", level: "Fondamentaux", maxCapacity: 12, isActive: true },
  { id: "kb_3", day: "Vendredi", startTime: "17:00", endTime: "18:00", discipline: "Kid Boxing", category: "kid_boxing", targetAgeGroup: "5_8", level: "5–8 ans", maxCapacity: 12, isActive: true },
  { id: "ad_18", day: "Vendredi", startTime: "17:00", endTime: "18:00", discipline: "Boxe Thaï", category: "cours_adulte", targetAgeGroup: "all", level: "Fondamentaux", maxCapacity: 12, isActive: true },
  { id: "ad_19", day: "Vendredi", startTime: "18:00", endTime: "19:00", discipline: "Boxe Thaï", category: "cours_adulte", targetAgeGroup: "all", level: "Fondamentaux", maxCapacity: 12, isActive: true },
  { id: "ad_20", day: "Vendredi", startTime: "19:30", endTime: "20:30", discipline: "Striking", category: "cours_adulte", targetAgeGroup: "all", level: "Drills", maxCapacity: 12, isActive: true },

  // SAMEDI
  { id: "ad_21", day: "Samedi", startTime: "09:00", endTime: "10:00", discipline: "Boxe anglaise", category: "cours_adulte", targetAgeGroup: "all", level: "Fondamentaux", maxCapacity: 12, isActive: true },
  { id: "kb_4", day: "Samedi", startTime: "10:00", endTime: "11:00", discipline: "Kid Boxing", category: "kid_boxing", targetAgeGroup: "9_13", level: "9–13 ans", maxCapacity: 12, isActive: true },
  { id: "ad_22", day: "Samedi", startTime: "10:00", endTime: "11:00", discipline: "Kick Boxing", category: "cours_adulte", targetAgeGroup: "all", level: "Elite", maxCapacity: 12, isActive: true },
  { id: "ls_3", day: "Samedi", startTime: "12:30", endTime: "13:30", discipline: "Lady Striking", category: "lady_striking", targetAgeGroup: "all", level: "100% féminin", maxCapacity: 12, isActive: true },
];

export const OFFICIAL_SMALL_GROUP_SESSIONS = OFFICIAL_SCHEDULE_SESSIONS;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CRÉNEAUX PAR DÉFAUT DES FORMULES À ACCÈS STRUCTURÉ
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const DEFAULT_LADY_STRIKING_SLOTS: string[] = [
  "Mardi : 17:00 – 18:00",
  "Jeudi : 17:30 – 18:30",
  "Samedi : 12:30 – 13:30",
];

export const KID_BOXING_SLOTS_5_8: string[] = [
  "Mercredi : 11:00 – 12:00",
  "Vendredi : 17:00 – 18:00",
];

export const KID_BOXING_SLOTS_9_13: string[] = [
  "Mercredi : 10:00 – 11:00",
  "Samedi : 10:00 – 11:00",
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FORMATAGE POUR L'AFFICHAGE DU PLANNING PUBLIC (3 CATÉGORIES)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function buildCategorySchedule(categoryKey: "cours_adulte" | "lady_striking" | "kid_boxing"): Record<DayName, ScheduleCourse[]> {
  return DAYS_ORDER.reduce((acc, day) => {
    acc[day] = OFFICIAL_SCHEDULE_SESSIONS
      .filter((s) => s.day === day && s.isActive !== false && s.category === categoryKey)
      .map((s) => ({
        name: s.discipline,
        level: s.level,
        time: s.endTime ? `${s.startTime} → ${s.endTime}` : s.startTime,
        places: "",
        category: s.category,
        ageGroup: s.targetAgeGroup,
      }));
    return acc;
  }, {} as Record<DayName, ScheduleCourse[]>);
}

export const publicScheduleData: Record<PlanningCategory, Record<DayName, ScheduleCourse[]>> = {
  "Cours Adulte": buildCategorySchedule("cours_adulte"),
  "Lady Striking": buildCategorySchedule("lady_striking"),
  "Kid Boxing": buildCategorySchedule("kid_boxing"),
};
