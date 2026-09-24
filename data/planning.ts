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
  { id: "sg_18", day: "Jeudi", startTime: "20:30", endTime: "21:30", discipline: "Boxe Thaï", level: "Sparring", maxCapacity: 12, isActive: true },

  // VENDREDI (4 cours dont essai Boxe Thaï 18:00 → 19:00)
  { id: "sg_19", day: "Vendredi", startTime: "07:00", endTime: "08:00", discipline: "Boxing Bag", level: "Fondamentaux", maxCapacity: 12, isActive: true },
  { id: "sg_20", day: "Vendredi", startTime: "17:00", endTime: "18:00", discipline: "Boxe Thaï", level: "Fondamentaux", maxCapacity: 12, isActive: true },
  { id: "sg_trial_v", day: "Vendredi", startTime: "18:00", endTime: "19:00", discipline: "Boxe Thaï", level: "Fondamentaux", maxCapacity: 12, isActive: true },
  { id: "sg_21", day: "Vendredi", startTime: "19:30", endTime: "20:30", discipline: "Striking", level: "Drills", maxCapacity: 12, isActive: true },

  // SAMEDI (3 cours dont essai Boxe anglaise 09:00 → 10:00)
  { id: "sg_trial_s", day: "Samedi", startTime: "09:00", endTime: "10:00", discipline: "Boxe anglaise", level: "Fondamentaux", maxCapacity: 12, isActive: true },
  { id: "sg_22", day: "Samedi", startTime: "11:00", endTime: "12:00", discipline: "Kick Boxing", level: "Sparring", maxCapacity: 12, isActive: true },
  { id: "sg_23", day: "Samedi", startTime: "12:00", endTime: "13:00", discipline: "Lady Striking", level: "Sparring", maxCapacity: 12, isActive: true },
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
