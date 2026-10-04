/**
 * Types & Interfaces pour la plateforme Défis & Progression STRIKING CAMP
 * (Nutrition déterministe, Recettes, Journal alimentaire, Poids, Programmes d'entraînement & Entitlements)
 */

export type FitnessGender = "male" | "female" | "other";

export type FitnessGoal =
  | "weight_loss"
  | "muscle_gain"
  | "maintenance"
  | "recomposition";

export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "very_active"
  | "extra_active";

export type TrainingEnvironment = "home" | "gym" | "club" | "hybrid";

export type AvailableEquipment =
  | "bodyweight"
  | "dumbbells"
  | "kettlebell"
  | "machines"
  | "barbell"
  | "bands";

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export type RecipeCategory = "breakfast" | "lunch" | "dinner" | "snack";
export type RecipeTargetGoal =
  | "weight_loss"
  | "muscle_gain"
  | "maintenance"
  | "recomposition"
  | "both"
  | "all";
export type RecipeDifficulty = "Facile" | "Moyen" | "Avancé";
export type PrepTimePreference = "quick" | "standard" | "flexible";

export type ProgramLocation = "home" | "gym" | "club" | "hybrid";
export type ProgramLevel = "Débutant" | "Intermédiaire" | "Avancé" | "Tous niveaux";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PARAMÈTRES GLOBAUX DU MOTEUR NUTRITIONNEL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface NutritionPlatformSettings {
  id?: string;
  default_bmr_formula: "mifflin_st_jeor";
  weight_loss_caloric_delta: number;
  muscle_gain_caloric_delta: number;
  maintenance_caloric_delta: number;
  protein_ratio_weight_loss: number;
  protein_ratio_muscle_gain: number;
  protein_ratio_maintenance: number;
  fat_ratio_weight_loss: number;
  fat_ratio_muscle_gain: number;
  fat_ratio_maintenance: number;
  technical_caloric_floor_female: number;
  technical_caloric_floor_male: number;
  disclaimer_text: string;
  updated_at?: string;
}

export const DEFAULT_NUTRITION_SETTINGS: NutritionPlatformSettings = {
  default_bmr_formula: "mifflin_st_jeor",
  weight_loss_caloric_delta: -400,
  muscle_gain_caloric_delta: 300,
  maintenance_caloric_delta: 0,
  protein_ratio_weight_loss: 2.0,
  protein_ratio_muscle_gain: 2.0,
  protein_ratio_maintenance: 1.6,
  fat_ratio_weight_loss: 0.9,
  fat_ratio_muscle_gain: 1.0,
  fat_ratio_maintenance: 0.9,
  technical_caloric_floor_female: 1200,
  technical_caloric_floor_male: 1500,
  disclaimer_text:
    "Estimations sportives et nutritionnelles indicatives — Ne constitue pas une prescription médicale.",
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PROFILS FITNESS & OBJECTIFS MEMBRE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface UserFitnessProfile {
  id: string;
  user_id: string;
  gender: FitnessGender;
  height_cm: number;
  current_weight_kg: number;
  target_weight_kg?: number | null;
  activity_level: ActivityLevel;
  target_workouts_per_week: number;
  primary_goal: FitnessGoal;
  prep_time_preference?: PrepTimePreference;
  training_environment: TrainingEnvironment;
  available_equipment: string[];
  custom_target_calories?: number | null;
  custom_target_proteins?: number | null;
  custom_target_carbs?: number | null;
  custom_target_fats?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface UserFitnessProfileInput {
  gender: FitnessGender;
  height_cm: number;
  current_weight_kg: number;
  target_weight_kg?: number | null;
  activity_level: ActivityLevel;
  target_workouts_per_week: number;
  primary_goal: FitnessGoal;
  prep_time_preference?: PrepTimePreference;
  training_environment: TrainingEnvironment;
  available_equipment: string[];
  custom_target_calories?: number | null;
  custom_target_proteins?: number | null;
  custom_target_carbs?: number | null;
  custom_target_fats?: number | null;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SUIVI DU POIDS & MENSURATIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface UserWeightLog {
  id: string;
  user_id: string;
  weight_kg: number;
  logged_at: string; // YYYY-MM-DD
  waist_cm?: number | null;
  arm_cm?: number | null;
  thigh_cm?: number | null;
  chest_cm?: number | null;
  notes?: string | null;
  photo_url?: string | null;
  created_at?: string;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RECETTES & INGRÉDIENTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface RecipeIngredient {
  id?: string;
  recipe_id?: string;
  name: string;
  quantity?: number | null;
  unit?: string | null;
  display_order: number;
  created_at?: string;
}

export interface Recipe {
  id: string;
  title: string;
  slug: string;
  category: RecipeCategory;
  target_goal: RecipeTargetGoal;
  prep_time_minutes: number;
  difficulty: RecipeDifficulty;
  calories: number;
  proteins_g: number;
  carbs_g: number;
  fats_g: number;
  image_url?: string | null;
  instructions?: string | null;
  tags: string[];
  is_premium: boolean;
  is_active: boolean;
  display_order: number;
  created_at?: string;
  updated_at?: string;
  ingredients?: RecipeIngredient[];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// JOURNAL ALIMENTAIRE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface UserDailyFoodLog {
  id: string;
  user_id: string;
  log_date: string; // YYYY-MM-DD
  meal_type: MealType;
  recipe_id?: string | null;
  food_name: string;
  serving_size?: string | null;
  calories: number;
  proteins_g: number;
  carbs_g: number;
  fats_g: number;
  created_at?: string;
  recipe?: Partial<Recipe> | null;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PROGRAMMES D'ENTRAÎNEMENT & KB SHRED
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface ProgramExercise {
  id: string;
  session_id: string;
  name: string;
  sets: number;
  reps_or_duration: string;
  rest_seconds: number;
  instructions?: string | null;
  video_url?: string | null;
  display_order: number;
  created_at?: string;
}

import type { WorkoutBlock } from "../training/types";

export interface ProgramSession {
  id: string;
  program_id: string;
  day_number: number;
  title: string;
  description?: string | null;
  duration_minutes: number;
  is_club_session: boolean;
  club_discipline_tag?: string | null;
  is_active: boolean;
  display_order: number;
  created_at?: string;
  exercises?: ProgramExercise[];
  blocks?: WorkoutBlock[];
  is_completed?: boolean;
}

export interface WorkoutProgram {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  primary_goal: FitnessGoal | "both";
  location: ProgramLocation;
  required_equipment: string[];
  level: ProgramLevel;
  sessions_per_week: number;
  duration_weeks: number;
  cover_image_url?: string | null;
  is_kb_shred: boolean;
  is_premium: boolean;
  is_active: boolean;
  display_order: number;
  created_at?: string;
  updated_at?: string;
  sessions?: ProgramSession[];
}

export interface UserSessionCompletion {
  id: string;
  user_id: string;
  program_session_id: string;
  completed_at: string;
  notes?: string | null;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ENTITLEMENTS & DROITS D'ACCÈS NUMÉRIQUES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface PlanEntitlements {
  nutrition: boolean;
  food_log: boolean;
  recipes_all: boolean;
  digital_programs: boolean;
  kb_shred_digital: boolean;
  advanced_stats: boolean;
}

export const DEFAULT_FREE_ENTITLEMENTS: PlanEntitlements = {
  nutrition: false,
  food_log: false,
  recipes_all: false,
  digital_programs: false,
  kb_shred_digital: false,
  advanced_stats: false,
};

export const DEFAULT_PREMIUM_DIGITAL_ENTITLEMENTS: PlanEntitlements = {
  nutrition: true,
  food_log: true,
  recipes_all: true,
  digital_programs: true,
  kb_shred_digital: true,
  advanced_stats: true,
};

export interface MemberDigitalEntitlements extends PlanEntitlements {
  tier: "free" | "premium_digital" | "premium_club";
  hasActiveSubscription: boolean;
  hasPhysicalClubAccess: boolean;
}

export interface PlanConfig {
  id: string;
  name: string;
  code: string | null;
  type: string;
  tier: "free" | "premium_digital" | "premium_club";
  commitment: "monthly" | "annual" | string | null;
  price_cents: number;
  is_digital_plan: boolean;
  allows_small_group: boolean;
  allows_private: boolean;
  allows_collective: boolean;
  private_sessions_per_period?: number | null;
  description?: string | null;
  features: string[];
  entitlements: PlanEntitlements;
  trial_days: number;
  badge_text?: string | null;
  display_order: number;
  is_active: boolean;
  stripe_price_id?: string | null;
  stripe_product_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MOTEUR DE PERSONNALISATION DYNAMIQUE (Étape 6)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type WeightTrajectoryStatus =
  | "on_track"
  | "too_fast"
  | "too_slow"
  | "stagnating"
  | "insufficient_data"
  | "goal_reached";

export interface WeightTrajectoryResult {
  currentWeight: number | null;
  sevenDayAvg: number | null;
  previousAvg: number | null;
  deltaKg: number | null;
  weeklyRateKg: number | null;
  trend: "losing" | "gaining" | "stable" | "insufficient_data";
  remainingDistanceKg: number | null;
  progressPercent: number | null;
  status: WeightTrajectoryStatus;
  message: string;
  isSufficientData: boolean;
}

export type TrainingAdherenceStatus =
  | "excellent"
  | "good"
  | "low"
  | "very_low";

export interface TrainingAdherenceResult {
  targetSessions: number;
  completedSessions: number;
  digitalCompletedCount: number;
  clubAttendedCount: number;
  adherencePercent: number;
  status: TrainingAdherenceStatus;
  message: string;
}

export type NutritionAdherenceStatus =
  | "excellent"
  | "good"
  | "low"
  | "insufficient_data";

export type MealFocusType =
  | "prioritize_protein"
  | "calorie_control"
  | "muscle_surplus"
  | "balanced_meals"
  | "consistency"
  | "insufficient_data";

export interface NutritionAdherenceResult {
  averageCalories: number | null;
  targetCalories: number;
  averageProtein: number | null;
  targetProtein: number;
  loggedDays: number;
  adherencePercent: number | null;
  status: NutritionAdherenceStatus;
  focus: MealFocusType;
  message: string;
}

export interface RecommendedWeeklySession {
  dayIndex: number; // 1 = Lundi, 7 = Dimanche
  dayLabel: string;
  programId?: string;
  programTitle: string;
  sessionId?: string;
  sessionTitle: string;
  durationMinutes: number;
  location: ProgramLocation;
  isClubSession: boolean;
  isKbShred: boolean;
  isCompleted: boolean;
  isBookedClub: boolean;
  reason?: string;
}

export interface RecommendedMealFocus {
  focus: MealFocusType;
  title: string;
  description: string;
  actionableTip: string;
  recommendedRecipes: Recipe[];
}

export interface PersonalizedWeeklyGuidance {
  weekStart: string; // YYYY-MM-DD
  objective: FitnessGoal;
  objectiveLabel: string;
  weightTrajectory: WeightTrajectoryResult;
  trainingAdherence: TrainingAdherenceResult;
  nutritionAdherence: NutritionAdherenceResult;
  recommendedSessions: RecommendedWeeklySession[];
  mealFocus: RecommendedMealFocus;
  kbShredRecommendation: {
    eligible: boolean;
    recommended: boolean;
    reason: string;
  };
  priority: "training" | "nutrition" | "consistency" | "recovery" | "onboarding";
  priorityTitle: string;
  explanation: {
    why: string;
    details: string[];
  };
  warnings: string[];
  isInsufficientData: boolean;
}

export interface PersonalizationContext {
  profile: UserFitnessProfile | null;
  weightLogs?: UserWeightLog[];
  dailyFoodLogs?: UserDailyFoodLog[] | Array<{ date?: string; log_date?: string; totalCalories?: number; totalProteinsGrams?: number; [key: string]: any }>;
  sessionCompletions?: UserSessionCompletion[] | Array<{ completed_at: string; program_session_id?: string }>;
  clubBookings?: Array<{
    id: string;
    session_date?: string;
    starts_at?: string;
    status: "confirmed" | "attended" | "cancelled" | "no_show" | string;
    discipline?: string;
    title?: string;
  }>;
  availablePrograms: WorkoutProgram[];
  availableRecipes: Recipe[];
  entitlements: PlanEntitlements & { hasPhysicalAccess?: boolean };
  targetNutrition?: {
    targetCalories: number;
    targetProtein: number;
    targetCarbs?: number;
    targetFats?: number;
  } | null;
  referenceDate?: string; // YYYY-MM-DD
}


