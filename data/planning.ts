export type DayName = "Lundi" | "Mardi" | "Mercredi" | "Jeudi" | "Vendredi" | "Samedi";
export type PlanningCategory = "Small Group";

export interface ScheduleCourse {
  name: string;
  level?: string;
  time: string;
  places?: string;
}

export interface SmallGroupScheduleItem {
  id: string;
  day: DayName;
  startTime: string;
  endTime: string;
  discipline: string;
  level: string;
  maxCapacity: number;
  isActive?: boolean;
}

export const DAYS_ORDER: DayName[] = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DISCIPLINES ET NIVEAUX OFFICIELS SMALL GROUP
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const SMALL_GROUP_DISCIPLINES = [
  "Boxe anglaise",
  "Kick Boxing",
  "Boxe Thaï",
  "Striking",
  "Lady Striking",
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
  "Tous niveaux",
] as const;

export type SmallGroupStandardLevel = (typeof SMALL_GROUP_LEVELS)[number];
export type SmallGroupLevel = SmallGroupStandardLevel | "100% féminin";

/**
 * Retourne le niveau standard associé à une discipline.
 * Règle stricte : Lady Striking => "100% féminin".
 * Toute autre discipline => le niveau sélectionné (ou "Fondamentaux" si "100% féminin" était sélectionné).
 */
export function getStandardLevelForDiscipline(
  discipline: string,
  currentLevel?: string
): SmallGroupLevel {
  if (discipline === "Lady Striking") {
    return "100% féminin";
  }
  if (currentLevel === "100% féminin" || !currentLevel) {
    return "Fondamentaux";
  }
  return currentLevel as SmallGroupLevel;
}

/**
 * Retourne les classes CSS Tailwind unifiées pour les badges de niveaux.
 * - 100% féminin (Lady Striking) => Rose
 * - Fondamentaux => Vert
 * - Drills => Bleu cyan
 * - Performance => Orange
 * - Elite (et rétrocompatibilité Sparring) => Rouge
 * - Cardio => Violet
 * - Tous niveaux / Neutre => Blanc-gris
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

  // 2. Fondamentaux (Vert)
  if (lvl.includes("fondament") || lvl.includes("débutant") || lvl.includes("debutant")) {
    return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
  }

  // 3. Drills (Bleu cyan)
  if (lvl.includes("drill") || lvl.includes("intermédiaire") || lvl.includes("intermediaire")) {
    return "bg-[#00d8ff]/15 text-[#00d8ff] border-[#00d8ff]/30";
  }

  // 4. Performance (Orange)
  if (lvl.includes("performance")) {
    return "bg-amber-500/15 text-amber-400 border-amber-500/30";
  }

  // 5. Elite (Rouge - avec gestion de rétro-compatibilité pour l'ancien libellé Sparring)
  if (
    lvl.includes("elite") ||
    lvl.includes("élite") ||
    lvl.includes("sparring") ||
    lvl.includes("confirmé") ||
    lvl.includes("confirme")
  ) {
    return "bg-red-500/15 text-red-400 border-red-500/30";
  }

  // 6. Cardio (Violet)
  if (lvl.includes("cardio")) {
    return "bg-purple-500/15 text-purple-400 border-purple-500/30";
  }

  // 7. Tous niveaux / Neutre
  return "bg-brand-white/10 text-brand-white/70 border-brand-white/20";
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PLANNING OFFICIEL SMALL GROUP — SOURCE DE VÉRITÉ
// (60 MIN PAR DÉFAUT, 50 MIN UNIQUEMENT POUR CARDIO)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const OFFICIAL_SMALL_GROUP_SESSIONS: SmallGroupScheduleItem[] = [
  // LUNDI (3 cours)
  { id: "sg_1", day: "Lundi", startTime: "07:00", endTime: "08:00", discipline: "Boxing Bag", level: "Fondamentaux", maxCapacity: 12, isActive: true },
  { id: "sg_2", day: "Lundi", startTime: "11:00", endTime: "12:00", discipline: "Boxe anglaise", level: "Fondamentaux", maxCapacity: 12, isActive: true },
  { id: "sg_3", day: "Lundi", startTime: "12:15", endTime: "13:15", discipline: "KB Shred", level: "Drills", maxCapacity: 12, isActive: true },

  // MARDI (4 cours dont Cardio à 50 min et essai Kick Boxing 18:00 → 19:00)
  { id: "sg_4", day: "Mardi", startTime: "11:00", endTime: "11:50", discipline: "KB Shred", level: "Cardio", maxCapacity: 12, isActive: true },
  { id: "sg_5", day: "Mardi", startTime: "12:15", endTime: "13:05", discipline: "Boxing Bag", level: "Cardio", maxCapacity: 12, isActive: true },
  { id: "sg_6", day: "Mardi", startTime: "17:00", endTime: "18:00", discipline: "Lady Striking", level: "100% féminin", maxCapacity: 12, isActive: true },
  { id: "sg_7", day: "Mardi", startTime: "18:00", endTime: "19:00", discipline: "Kick Boxing", level: "Fondamentaux", maxCapacity: 12, isActive: true },

  // MERCREDI (6 cours)
  { id: "sg_8", day: "Mercredi", startTime: "07:00", endTime: "08:00", discipline: "Boxing Bag", level: "Drills", maxCapacity: 12, isActive: true },
  { id: "sg_9", day: "Mercredi", startTime: "11:00", endTime: "12:00", discipline: "Kick Boxing", level: "Fondamentaux", maxCapacity: 12, isActive: true },
  { id: "sg_10", day: "Mercredi", startTime: "12:15", endTime: "13:15", discipline: "KB Shred", level: "Drills", maxCapacity: 12, isActive: true },
  { id: "sg_11", day: "Mercredi", startTime: "17:30", endTime: "18:30", discipline: "Striking", level: "Drills", maxCapacity: 12, isActive: true },
  { id: "sg_12", day: "Mercredi", startTime: "19:30", endTime: "20:30", discipline: "Boxe Thaï", level: "Fondamentaux", maxCapacity: 12, isActive: true },
  { id: "sg_13", day: "Mercredi", startTime: "20:30", endTime: "21:30", discipline: "Kick Boxing", level: "Drills", maxCapacity: 12, isActive: true },

  // JEUDI (5 cours)
  { id: "sg_14", day: "Jeudi", startTime: "11:00", endTime: "12:00", discipline: "KB Shred", level: "Drills", maxCapacity: 12, isActive: true },
  { id: "sg_15", day: "Jeudi", startTime: "12:15", endTime: "13:15", discipline: "Striking", level: "Drills", maxCapacity: 12, isActive: true },
  { id: "sg_16", day: "Jeudi", startTime: "17:30", endTime: "18:30", discipline: "Lady Striking", level: "100% féminin", maxCapacity: 12, isActive: true },
  { id: "sg_17", day: "Jeudi", startTime: "19:30", endTime: "20:30", discipline: "Kick Boxing", level: "Fondamentaux", maxCapacity: 12, isActive: true },
  { id: "sg_18", day: "Jeudi", startTime: "20:30", endTime: "21:30", discipline: "Boxe Thaï", level: "Elite", maxCapacity: 12, isActive: true },

  // VENDREDI (4 cours dont essai Boxe Thaï 18:00 → 19:00)
  { id: "sg_19", day: "Vendredi", startTime: "07:00", endTime: "08:00", discipline: "Boxing Bag", level: "Fondamentaux", maxCapacity: 12, isActive: true },
  { id: "sg_20", day: "Vendredi", startTime: "17:00", endTime: "18:00", discipline: "Boxe Thaï", level: "Fondamentaux", maxCapacity: 12, isActive: true },
  { id: "sg_trial_v", day: "Vendredi", startTime: "18:00", endTime: "19:00", discipline: "Boxe Thaï", level: "Fondamentaux", maxCapacity: 12, isActive: true },
  { id: "sg_21", day: "Vendredi", startTime: "19:30", endTime: "20:30", discipline: "Striking", level: "Drills", maxCapacity: 12, isActive: true },

  // SAMEDI (3 cours dont essai Boxe anglaise 09:00 → 10:00)
  { id: "sg_trial_s", day: "Samedi", startTime: "09:00", endTime: "10:00", discipline: "Boxe anglaise", level: "Fondamentaux", maxCapacity: 12, isActive: true },
  { id: "sg_22", day: "Samedi", startTime: "11:00", endTime: "12:00", discipline: "Kick Boxing", level: "Elite", maxCapacity: 12, isActive: true },
  { id: "sg_23", day: "Samedi", startTime: "12:00", endTime: "13:00", discipline: "Lady Striking", level: "100% féminin", maxCapacity: 12, isActive: true },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FORMATAGE POUR L'AFFICHAGE DU PLANNING PUBLIC
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const publicScheduleData: Record<PlanningCategory, Record<DayName, ScheduleCourse[]>> = {
  "Small Group": DAYS_ORDER.reduce((acc, day) => {
    acc[day] = OFFICIAL_SMALL_GROUP_SESSIONS
      .filter((s) => s.day === day && s.isActive !== false)
      .map((s) => ({
        name: s.discipline,
        level: s.level,
        time: s.endTime ? `${s.startTime} → ${s.endTime}` : s.startTime,
        places: String(s.maxCapacity || 12),
      }));
    return acc;
  }, {} as Record<DayName, ScheduleCourse[]>),
};
