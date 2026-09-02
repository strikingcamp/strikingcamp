export type DayName = "Lundi" | "Mardi" | "Mercredi" | "Jeudi" | "Vendredi" | "Samedi";
export type PlanningCategory = "Small Group" | "Collectifs";

export interface ScheduleCourse {
  name: string;
  level?: string;
  time: string;
  places?: string;
}

export interface CollectiveScheduleItem {
  id: string;
  day: DayName;
  startTime: string;
  endTime: string;
  discipline: string;
  level: string;
  maxCapacity?: number;
  isActive?: boolean;
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
// 1. PLANNING OFFICIEL COLLECTIFS (3 SÉANCES) — SOURCE DE VÉRITÉ
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const OFFICIAL_COLLECTIVE_SESSIONS: CollectiveScheduleItem[] = [
  {
    id: "col_1",
    day: "Mardi",
    startTime: "18:00",
    endTime: "19:00",
    discipline: "Kick Boxing",
    level: "Tous niveaux (Accès libre)",
    maxCapacity: 35,
    isActive: true,
  },
  {
    id: "col_2",
    day: "Vendredi",
    startTime: "18:00",
    endTime: "19:00",
    discipline: "Kick Boxing",
    level: "Tous niveaux (Accès libre)",
    maxCapacity: 35,
    isActive: true,
  },
  {
    id: "col_3",
    day: "Samedi",
    startTime: "10:00",
    endTime: "11:00",
    discipline: "Kick Boxing",
    level: "Tous niveaux (Accès libre)",
    maxCapacity: 35,
    isActive: true,
  },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. PLANNING OFFICIEL SMALL GROUP (23 SÉANCES) — SOURCE DE VÉRITÉ
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const OFFICIAL_SMALL_GROUP_SESSIONS: SmallGroupScheduleItem[] = [
  // LUNDI (3 cours)
  { id: "sg_1", day: "Lundi", startTime: "07:00", endTime: "07:50", discipline: "Boxing Bag", level: "Fondamentaux", maxCapacity: 20, isActive: true },
  { id: "sg_2", day: "Lundi", startTime: "11:00", endTime: "11:50", discipline: "Boxing", level: "Fondamentaux", maxCapacity: 20, isActive: true },
  { id: "sg_3", day: "Lundi", startTime: "12:15", endTime: "13:05", discipline: "Boxing Shred", level: "Performance", maxCapacity: 20, isActive: true },

  // MARDI (4 cours)
  { id: "sg_4", day: "Mardi", startTime: "11:00", endTime: "11:50", discipline: "Boxing Shred", level: "Cardio", maxCapacity: 20, isActive: true },
  { id: "sg_5", day: "Mardi", startTime: "12:15", endTime: "13:05", discipline: "Boxing Bag", level: "Cardio", maxCapacity: 20, isActive: true },
  { id: "sg_6", day: "Mardi", startTime: "17:00", endTime: "17:50", discipline: "Lady Striking", level: "Cours féminin", maxCapacity: 20, isActive: true },
  { id: "sg_7", day: "Mardi", startTime: "18:00", endTime: "18:50", discipline: "Kick Boxing", level: "Fondamentaux", maxCapacity: 20, isActive: true },

  // MERCREDI (6 cours)
  { id: "sg_8", day: "Mercredi", startTime: "07:00", endTime: "07:50", discipline: "Boxing Bag", level: "Performance", maxCapacity: 20, isActive: true },
  { id: "sg_9", day: "Mercredi", startTime: "11:00", endTime: "11:50", discipline: "Kick Boxing", level: "Fondamentaux", maxCapacity: 20, isActive: true },
  { id: "sg_10", day: "Mercredi", startTime: "12:15", endTime: "13:05", discipline: "Boxing Shred", level: "Performance", maxCapacity: 20, isActive: true },
  { id: "sg_11", day: "Mercredi", startTime: "17:30", endTime: "18:20", discipline: "Striking", level: "Performance", maxCapacity: 20, isActive: true },
  { id: "sg_12", day: "Mercredi", startTime: "19:30", endTime: "20:20", discipline: "Boxe Thaï", level: "Fondamentaux", maxCapacity: 20, isActive: true },
  { id: "sg_13", day: "Mercredi", startTime: "20:30", endTime: "21:20", discipline: "Kick Boxing", level: "Performance", maxCapacity: 20, isActive: true },

  // JEUDI (5 cours)
  { id: "sg_14", day: "Jeudi", startTime: "11:00", endTime: "11:50", discipline: "Boxing Shred", level: "Performance", maxCapacity: 20, isActive: true },
  { id: "sg_15", day: "Jeudi", startTime: "12:15", endTime: "13:05", discipline: "Striking", level: "Performance", maxCapacity: 20, isActive: true },
  { id: "sg_16", day: "Jeudi", startTime: "17:30", endTime: "18:20", discipline: "Lady Striking", level: "Cours féminin", maxCapacity: 20, isActive: true },
  { id: "sg_17", day: "Jeudi", startTime: "19:30", endTime: "20:20", discipline: "Kick Boxing", level: "Fondamentaux", maxCapacity: 20, isActive: true },
  { id: "sg_18", day: "Jeudi", startTime: "20:30", endTime: "21:20", discipline: "Boxe Thaï", level: "Élite", maxCapacity: 20, isActive: true },

  // VENDREDI (3 cours)
  { id: "sg_19", day: "Vendredi", startTime: "07:00", endTime: "07:50", discipline: "Boxing Bag", level: "Fondamentaux", maxCapacity: 20, isActive: true },
  { id: "sg_20", day: "Vendredi", startTime: "17:00", endTime: "17:50", discipline: "Boxe Thaï", level: "Fondamentaux", maxCapacity: 20, isActive: true },
  { id: "sg_21", day: "Vendredi", startTime: "19:30", endTime: "20:20", discipline: "Striking", level: "Performance", maxCapacity: 20, isActive: true },

  // SAMEDI (2 cours)
  { id: "sg_22", day: "Samedi", startTime: "11:00", endTime: "11:50", discipline: "Kick Boxing", level: "Élite", maxCapacity: 20, isActive: true },
  { id: "sg_23", day: "Samedi", startTime: "12:00", endTime: "12:50", discipline: "Lady Striking", level: "Élite", maxCapacity: 20, isActive: true },
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
        time: s.startTime,
      }));
    return acc;
  }, {} as Record<DayName, ScheduleCourse[]>),

  Collectifs: DAYS_ORDER.reduce((acc, day) => {
    acc[day] = OFFICIAL_COLLECTIVE_SESSIONS
      .filter((s) => s.day === day && s.isActive !== false)
      .map((s) => ({
        name: s.discipline,
        level: s.level,
        time: s.startTime,
      }));
    return acc;
  }, {} as Record<DayName, ScheduleCourse[]>),
};
