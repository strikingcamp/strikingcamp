/**
 * TYPES OFFICIELS DE L'ARCHITECTURE D'ENTRAÎNEMENT V1 — STRIKING CAMP
 *
 * Règles :
 * 1. Les formats d'entraînement (EMOM, AMRAP, TABATA...) qualifient la méthode d'un bloc et ne sont PAS des catégories de navigation.
 * 2. Une séance est découpée en blocs cohérents (warmup, main, secondary, finisher, cooldown).
 * 3. Chaque bloc possède son propre format et ses paramètres de travail / repos / tours.
 * 4. Les séances hybrides mêlant Kettlebell + Boxe + Poids du corps appartiennent à l'univers "KB SHRED".
 */

export type WorkoutFormat =
  | "straight_sets"
  | "emom"
  | "amrap"
  | "tabata"
  | "circuit"
  | "intervals"
  | "for_time"
  | "rounds";

export type WorkoutBlockType =
  | "warmup"
  | "main"
  | "secondary"
  | "finisher"
  | "cooldown";

export type TrainingEquipment =
  | "bodyweight"
  | "kettlebell"
  | "boxing"
  | "dumbbells"
  | "barbell"
  | "bands";

export type ExerciseSide = "left" | "right" | "both" | "alternate";

export interface WorkoutExerciseDetail {
  id: string;
  name: string;
  reps?: number | string;
  duration_seconds?: number;
  work_seconds?: number;
  rest_seconds?: number;
  transition_seconds?: number;
  sets?: number;
  side?: ExerciseSide;
  load_recommendation?: string;
  instructions?: string;
  display_order?: number;
}

export interface WorkoutBlock {
  id: string;
  title: string;
  type: WorkoutBlockType;
  format: WorkoutFormat;
  duration_minutes?: number;
  rounds?: number;
  time_cap_minutes?: number;
  work_seconds?: number;
  rest_seconds?: number;
  transition_seconds?: number;
  rest_between_rounds_seconds?: number;
  instructions?: string;
  exercises: WorkoutExerciseDetail[];
}

export interface StructuredWorkoutSession {
  id: string;
  program_id: string;
  day_number: number;
  title: string;
  description?: string;
  duration_minutes: number;
  is_club_session?: boolean;
  club_discipline_tag?: string;
  is_active?: boolean;
  display_order?: number;
  blocks: WorkoutBlock[];
  is_completed?: boolean;
}

export interface StructuredWorkoutProgram {
  id: string;
  title: string;
  slug: string;
  universe: "home" | "striking-camp";
  category: "bodyweight" | "kettlebell" | "kb-shred";
  level: "Débutant" | "Intermédiaire" | "Avancé" | "Tous niveaux";
  duration_weeks: number;
  sessions_per_week: number;
  duration_minutes_per_session: number;
  objective: string;
  equipment: TrainingEquipment[];
  description: string;
  is_kb_shred: boolean;
  is_premium: boolean;
  is_active: boolean;
  display_order: number;
  sessions: StructuredWorkoutSession[];
}
