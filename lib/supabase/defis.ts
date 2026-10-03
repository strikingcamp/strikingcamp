/**
 * HELPERS & OPÉRATIONS SUPABASE — PLATEFORME DÉFIS & PROGRESSION (V1)
 *
 * Règles architecturales & sécurité :
 * 1. Isolation stricte : toutes les requêtes sont filtrées sur `user_id`.
 * 2. Source unique de vérité pour l'identité (`profiles.birth_date`).
 * 3. Sécurité RLS et vérification des entitlements.
 * 4. Calcul déterministe côté serveur des totaux journaliers et de la progression.
 * 5. Hybridation KB SHRED (Digital + Réservations Club existantes).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  UserFitnessProfile,
  UserFitnessProfileInput,
  UserWeightLog,
  Recipe,
  RecipeCategory,
  RecipeTargetGoal,
  UserDailyFoodLog,
  UserSessionCompletion,
  WorkoutProgram,
  ProgramSession,
  ProgramLocation,
  ProgramLevel,
  FitnessGoal,
  NutritionPlatformSettings,
  MealType,
  PersonalizedWeeklyGuidance,
} from "./defis-platform";
import { DEFAULT_NUTRITION_SETTINGS } from "./defis-platform";
import {
  calculateNutritionPlan,
  type NutritionPlanResult,
} from "../nutrition-engine";
import {
  buildWeeklyGuidance,
} from "../personalization-engine";
import { V1_REFERENCE_PROGRAMS } from "../training/reference-programs";
import {
  computeMemberDigitalEntitlements,
  type MemberDigitalEntitlementsResult,
  type SubscriptionLike,
} from "../access-control";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 0. VÉRIFICATION DES ENTITLEMENTS D'UN MEMBRE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Récupère et calcule les droits numériques d'un membre à partir de ses abonnements en base
 */
export async function getMemberDigitalEntitlements(
  supabase: SupabaseClient,
  userId: string
): Promise<MemberDigitalEntitlementsResult> {
  try {
    const { data: subs, error } = await supabase
      .from("subscriptions")
      .select("id, status, plan:plans(id, code, name, type, tier, allows_small_group, allows_private, is_digital_plan, entitlements)")
      .eq("user_id", userId)
      .eq("status", "active");

    if (error || !subs) {
      return computeMemberDigitalEntitlements([]);
    }

    return computeMemberDigitalEntitlements(subs as unknown as SubscriptionLike[]);
  } catch (err) {
    console.error("[getMemberDigitalEntitlements] Erreur :", err);
    return computeMemberDigitalEntitlements([]);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. PROFIL FITNESS & OBJECTIF
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface MemberCompleteFitnessData {
  profile: UserFitnessProfile | null;
  birthDate: string | null;
  nutritionPlan: NutritionPlanResult | null;
  entitlements: MemberDigitalEntitlementsResult;
}

/**
 * Récupère le profil fitness complet du membre ainsi que son plan nutritionnel déterministe
 */
export async function getMemberFitnessProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<MemberCompleteFitnessData> {
  const [profileRes, userProfileRes, settingsRes, entitlements] = await Promise.all([
    supabase
      .from("user_fitness_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("birth_date")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("nutrition_platform_settings")
      .select("*")
      .limit(1)
      .maybeSingle(),
    getMemberDigitalEntitlements(supabase, userId),
  ]);

  const fitnessProfile = (profileRes.data as UserFitnessProfile) || null;
  const birthDate = userProfileRes.data?.birth_date || null;
  const settings = (settingsRes.data as NutritionPlatformSettings) || DEFAULT_NUTRITION_SETTINGS;

  let nutritionPlan: NutritionPlanResult | null = null;

  if (fitnessProfile) {
    nutritionPlan = calculateNutritionPlan(
      {
        gender: fitnessProfile.gender,
        birthDate: birthDate,
        heightCm: fitnessProfile.height_cm,
        currentWeightKg: fitnessProfile.current_weight_kg,
        targetWeightKg: fitnessProfile.target_weight_kg,
        activityLevel: fitnessProfile.activity_level,
        primaryGoal: fitnessProfile.primary_goal,
        targetWorkoutsPerWeek: fitnessProfile.target_workouts_per_week,
        customTargetCalories: fitnessProfile.custom_target_calories,
        customTargetProteins: fitnessProfile.custom_target_proteins,
        customTargetCarbs: fitnessProfile.custom_target_carbs,
        customTargetFats: fitnessProfile.custom_target_fats,
      },
      settings
    );
  }

  return {
    profile: fitnessProfile,
    birthDate,
    nutritionPlan,
    entitlements,
  };
}

/**
 * Crée ou met à jour le profil fitness d'un membre.
 * Si une date de naissance est fournie, elle met à jour `profiles.birth_date` (source unique).
 */
export async function upsertMemberFitnessProfile(
  supabase: SupabaseClient,
  userId: string,
  payload: UserFitnessProfileInput & { birthDate?: string | null }
): Promise<{ success: boolean; data?: UserFitnessProfile; error?: string }> {
  try {
    // 1. Mise à jour de la date de naissance dans `profiles` si fournie
    if (payload.birthDate) {
      const { error: birthErr } = await supabase
        .from("profiles")
        .update({ birth_date: payload.birthDate, updated_at: new Date().toISOString() })
        .eq("id", userId);

      if (birthErr) {
        console.warn("[upsertMemberFitnessProfile] Erreur update birth_date :", birthErr);
      }
    }

    // 2. Upsert dans `user_fitness_profiles`
    const { data, error } = await supabase
      .from("user_fitness_profiles")
      .upsert(
        {
          user_id: userId,
          gender: payload.gender,
          height_cm: payload.height_cm,
          current_weight_kg: payload.current_weight_kg,
          target_weight_kg: payload.target_weight_kg || null,
          activity_level: payload.activity_level,
          target_workouts_per_week: payload.target_workouts_per_week,
          primary_goal: payload.primary_goal,
          training_environment: payload.training_environment,
          available_equipment: payload.available_equipment || ["bodyweight"],
          custom_target_calories: payload.custom_target_calories || null,
          custom_target_proteins: payload.custom_target_proteins || null,
          custom_target_carbs: payload.custom_target_carbs || null,
          custom_target_fats: payload.custom_target_fats || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // 3. Enregistrement automatique de la première pesée si aucune pesée n'existe aujourd'hui
    const todayStr = new Date().toISOString().split("T")[0];
    await supabase.from("user_weight_logs").upsert(
      {
        user_id: userId,
        weight_kg: payload.current_weight_kg,
        logged_at: todayStr,
      },
      { onConflict: "user_id,logged_at" }
    );

    return { success: true, data: data as UserFitnessProfile };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erreur inattendue";
    return { success: false, error: errorMsg };
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. SUIVI DU POIDS & PROGRESSION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface WeightProgressionStats {
  initialWeightKg: number | null;
  currentWeightKg: number | null;
  targetWeightKg: number | null;
  totalDeltaKg: number | null;
  progressPercentage: number | null;
  logs: UserWeightLog[];
}

/**
 * Récupère l'historique complet des pesées et calcule la progression
 */
export async function getMemberWeightHistory(
  supabase: SupabaseClient,
  userId: string
): Promise<WeightProgressionStats> {
  const [logsRes, profileRes] = await Promise.all([
    supabase
      .from("user_weight_logs")
      .select("*")
      .eq("user_id", userId)
      .order("logged_at", { ascending: true }),
    supabase
      .from("user_fitness_profiles")
      .select("current_weight_kg, target_weight_kg, primary_goal")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  const logs = (logsRes.data as UserWeightLog[]) || [];
  const profile = profileRes.data;

  if (logs.length === 0) {
    return {
      initialWeightKg: profile?.current_weight_kg || null,
      currentWeightKg: profile?.current_weight_kg || null,
      targetWeightKg: profile?.target_weight_kg || null,
      totalDeltaKg: null,
      progressPercentage: null,
      logs: [],
    };
  }

  const initialWeight = logs[0].weight_kg;
  const currentWeight = logs[logs.length - 1].weight_kg;
  const targetWeight = profile?.target_weight_kg || null;
  const totalDelta = Number((currentWeight - initialWeight).toFixed(1));

  let progressPercentage: number | null = null;
  if (targetWeight && targetWeight !== initialWeight) {
    const totalDistance = targetWeight - initialWeight;
    const currentDistance = currentWeight - initialWeight;
    const pct = (currentDistance / totalDistance) * 100;
    progressPercentage = Math.min(100, Math.max(0, Math.round(pct)));
  }

  return {
    initialWeightKg: initialWeight,
    currentWeightKg: currentWeight,
    targetWeightKg: targetWeight,
    totalDeltaKg: totalDelta,
    progressPercentage,
    logs,
  };
}

/**
 * Enregistre une pesée quotidienne pour le membre
 */
export async function addMemberWeightLog(
  supabase: SupabaseClient,
  userId: string,
  payload: {
    weight_kg: number;
    logged_at?: string;
    waist_cm?: number | null;
    arm_cm?: number | null;
    thigh_cm?: number | null;
    chest_cm?: number | null;
    notes?: string | null;
  }
): Promise<{ success: boolean; data?: UserWeightLog; error?: string }> {
  try {
    const loggedDate = payload.logged_at || new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("user_weight_logs")
      .upsert(
        {
          user_id: userId,
          weight_kg: payload.weight_kg,
          logged_at: loggedDate,
          waist_cm: payload.waist_cm || null,
          arm_cm: payload.arm_cm || null,
          thigh_cm: payload.thigh_cm || null,
          chest_cm: payload.chest_cm || null,
          notes: payload.notes || null,
        },
        { onConflict: "user_id,logged_at" }
      )
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Synchronisation du poids actuel dans le profil fitness
    await supabase
      .from("user_fitness_profiles")
      .update({ current_weight_kg: payload.weight_kg, updated_at: new Date().toISOString() })
      .eq("user_id", userId);

    return { success: true, data: data as UserWeightLog };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erreur inattendue";
    return { success: false, error: errorMsg };
  }
}

/**
 * Supprime une pesée spécifique
 */
export async function deleteMemberWeightLog(
  supabase: SupabaseClient,
  userId: string,
  logId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from("user_weight_logs")
    .delete()
    .eq("id", logId)
    .eq("user_id", userId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. JOURNAL ALIMENTAIRE & CALCULS DÉTERMINISTES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface DailyFoodLogSummary {
  date: string;
  totalCalories: number;
  totalProteinsGrams: number;
  totalCarbsGrams: number;
  totalFatsGrams: number;
  meals: {
    breakfast: UserDailyFoodLog[];
    lunch: UserDailyFoodLog[];
    dinner: UserDailyFoodLog[];
    snack: UserDailyFoodLog[];
  };
}

/**
 * Récupère le journal alimentaire d'une date donnée et calcule les totaux en temps réel
 */
export async function getMemberDailyFoodLogs(
  supabase: SupabaseClient,
  userId: string,
  logDate: string // YYYY-MM-DD
): Promise<DailyFoodLogSummary> {
  const { data, error } = await supabase
    .from("user_daily_food_logs")
    .select("*, recipe:recipes(id, title, image_url, prep_time_minutes)")
    .eq("user_id", userId)
    .eq("log_date", logDate)
    .order("created_at", { ascending: true });

  const logs = (data as UserDailyFoodLog[]) || [];

  const meals: DailyFoodLogSummary["meals"] = {
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: [],
  };

  let totalCalories = 0;
  let totalProteins = 0;
  let totalCarbs = 0;
  let totalFats = 0;

  for (const log of logs) {
    if (meals[log.meal_type]) {
      meals[log.meal_type].push(log);
    }
    totalCalories += log.calories || 0;
    totalProteins += Number(log.proteins_g) || 0;
    totalCarbs += Number(log.carbs_g) || 0;
    totalFats += Number(log.fats_g) || 0;
  }

  return {
    date: logDate,
    totalCalories: Math.round(totalCalories),
    totalProteinsGrams: Number(totalProteins.toFixed(1)),
    totalCarbsGrams: Number(totalCarbs.toFixed(1)),
    totalFatsGrams: Number(totalFats.toFixed(1)),
    meals,
  };
}

/**
 * Ajoute un aliment / repas au journal
 */
export async function addFoodLogEntry(
  supabase: SupabaseClient,
  userId: string,
  payload: {
    log_date: string;
    meal_type: MealType;
    food_name: string;
    serving_size?: string | null;
    calories: number;
    proteins_g: number;
    carbs_g: number;
    fats_g: number;
    recipe_id?: string | null;
  }
): Promise<{ success: boolean; data?: UserDailyFoodLog; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("user_daily_food_logs")
      .insert({
        user_id: userId,
        log_date: payload.log_date,
        meal_type: payload.meal_type,
        food_name: payload.food_name.trim(),
        serving_size: payload.serving_size || "1 portion",
        calories: Math.max(0, Math.round(payload.calories)),
        proteins_g: Math.max(0, Number(payload.proteins_g.toFixed(1))),
        carbs_g: Math.max(0, Number(payload.carbs_g.toFixed(1))),
        fats_g: Math.max(0, Number(payload.fats_g.toFixed(1))),
        recipe_id: payload.recipe_id || null,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as UserDailyFoodLog };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erreur inattendue";
    return { success: false, error: errorMsg };
  }
}

/**
 * Ajoute une recette certifiée au journal alimentaire (avec respect du multiplicateur de portion)
 */
export async function addRecipeToFoodLog(
  supabase: SupabaseClient,
  userId: string,
  payload: {
    recipe_id: string;
    meal_type: MealType;
    log_date: string;
    portions?: number;
  }
): Promise<{ success: boolean; data?: UserDailyFoodLog; error?: string }> {
  try {
    const { data: recipe, error: recipeErr } = await supabase
      .from("recipes")
      .select("*")
      .eq("id", payload.recipe_id)
      .single();

    if (recipeErr || !recipe) {
      return { success: false, error: "Recette introuvable" };
    }

    if (recipe.is_premium) {
      const entitlements = await getMemberDigitalEntitlements(supabase, userId);
      if (!entitlements.canAccessAllRecipes && entitlements.tier === "free") {
        return {
          success: false,
          error: "Cette recette nécessite un abonnement Striking Digital Premium.",
        };
      }
    }

    const multiplier = payload.portions && payload.portions > 0 ? payload.portions : 1;

    return addFoodLogEntry(supabase, userId, {
      log_date: payload.log_date,
      meal_type: payload.meal_type,
      food_name: recipe.title,
      serving_size: multiplier === 1 ? "1 portion" : `${multiplier} portions`,
      calories: Math.round(recipe.calories * multiplier),
      proteins_g: Number((recipe.proteins_g * multiplier).toFixed(1)),
      carbs_g: Number((recipe.carbs_g * multiplier).toFixed(1)),
      fats_g: Number((recipe.fats_g * multiplier).toFixed(1)),
      recipe_id: recipe.id,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erreur inattendue";
    return { success: false, error: errorMsg };
  }
}

/**
 * Supprime une entrée du journal alimentaire
 */
export async function deleteFoodLogEntry(
  supabase: SupabaseClient,
  userId: string,
  entryId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from("user_daily_food_logs")
    .delete()
    .eq("id", entryId)
    .eq("user_id", userId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. RECETTES & INGRÉDIENTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface RecipeFilterParams {
  category?: RecipeCategory | "all";
  goal?: RecipeTargetGoal | "all";
  onlyHighProtein?: boolean;
  onlyQuick?: boolean;
  canAccessPremium?: boolean;
}

/**
 * Récupère les recettes actives avec filtres et contrôle de visibilité Premium
 */
export async function getRecipes(
  supabase: SupabaseClient,
  filters: RecipeFilterParams = {}
): Promise<Recipe[]> {
  let query = supabase
    .from("recipes")
    .select("*, ingredients:recipe_ingredients(*)")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (filters.category && filters.category !== "all") {
    query = query.eq("category", filters.category);
  }

  if (filters.goal && filters.goal !== "all") {
    query = query.or(`target_goal.eq.${filters.goal},target_goal.eq.both`);
  }

  if (filters.onlyHighProtein) {
    query = query.contains("tags", ["high_protein"]);
  }

  if (filters.onlyQuick) {
    query = query.lte("prep_time_minutes", 15);
  }

  const { data, error } = await query;
  if (error || !data) {
    console.error("[getRecipes] Erreur :", error);
    return [];
  }

  return data as Recipe[];
}

/**
 * Récupère le détail d'une recette avec ses ingrédients
 */
export async function getRecipeDetail(
  supabase: SupabaseClient,
  recipeIdOrSlug: string
): Promise<Recipe | null> {
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(recipeIdOrSlug);

  let query = supabase
    .from("recipes")
    .select("*, ingredients:recipe_ingredients(*)")
    .eq("is_active", true);

  if (isUUID) {
    query = query.eq("id", recipeIdOrSlug);
  } else {
    query = query.eq("slug", recipeIdOrSlug);
  }

  const { data, error } = await query.maybeSingle();
  if (error || !data) return null;
  return data as Recipe;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 5. PROGRAMMES D'ENTRAÎNEMENT & KB SHRED HYBRIDE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface ProgramFilterParams {
  goal?: FitnessGoal | "both" | "all";
  location?: ProgramLocation | "all";
  level?: ProgramLevel | "all";
  isKbShredOnly?: boolean;
}

/**
 * Récupère les programmes d'entraînement officiels V1 avec complétion utilisateur
 * V1 STRIKING CAMP : V1_REFERENCE_PROGRAMS est la source de vérité officielle
 */
export async function getWorkoutPrograms(
  supabase: SupabaseClient,
  userId?: string | null,
  filters: ProgramFilterParams = {}
): Promise<WorkoutProgram[]> {
  let programs = V1_REFERENCE_PROGRAMS;

  if (filters.isKbShredOnly) {
    programs = programs.filter((p) => p.is_kb_shred);
  }

  if (filters.location && filters.location !== "all") {
    programs = programs.filter((p) => p.location === filters.location || p.location === "hybrid");
  }

  if (filters.goal && filters.goal !== "all") {
    programs = programs.filter((p) => p.primary_goal === filters.goal || p.primary_goal === "both");
  }

  if (filters.level && filters.level !== "all") {
    programs = programs.filter((p) => p.level === filters.level || p.level === "Tous niveaux");
  }

  if (userId) {
    const allSessionIds = programs.flatMap((p) => p.sessions?.map((s) => s.id) || []);
    if (allSessionIds.length > 0) {
      const { data: completions } = await supabase
        .from("user_session_completions")
        .select("program_session_id, completed_at")
        .eq("user_id", userId)
        .in("program_session_id", allSessionIds);

      const completionMap = new Map((completions || []).map((c) => [c.program_session_id, c.completed_at]));

      programs = programs.map((p) => ({
        ...p,
        sessions: p.sessions?.map((s) => ({
          ...s,
          is_completed: completionMap.has(s.id),
          completed_at: completionMap.get(s.id) || undefined,
        })),
      }));
    }
  }

  return programs;
}

/**
 * Récupère le détail d'un programme d'entraînement avec ses sessions, exercices et l'état de complétion
 */
export async function getProgramDetail(
  supabase: SupabaseClient,
  programIdOrSlug: string,
  userId?: string | null
): Promise<WorkoutProgram | null> {
  const ref = V1_REFERENCE_PROGRAMS.find((p) => p.id === programIdOrSlug || p.slug === programIdOrSlug);
  if (ref) {
    if (userId && ref.sessions) {
      const sessionIds = ref.sessions.map((s) => s.id);
      const { data: completions } = await supabase
        .from("user_session_completions")
        .select("program_session_id, completed_at")
        .eq("user_id", userId)
        .in("program_session_id", sessionIds);

      const completionMap = new Map((completions || []).map((c) => [c.program_session_id, c.completed_at]));
      return {
        ...ref,
        sessions: ref.sessions.map((s) => ({
          ...s,
          is_completed: completionMap.has(s.id),
          completed_at: completionMap.get(s.id) || undefined,
        })),
      };
    }
    return ref;
  }

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(programIdOrSlug);
  let query = supabase
    .from("workout_programs")
    .select("*, sessions:program_sessions(*, exercises:program_exercises(*))")
    .eq("is_active", true);

  if (isUUID) {
    query = query.eq("id", programIdOrSlug);
  } else {
    query = query.eq("slug", programIdOrSlug);
  }

  const { data, error } = await query.maybeSingle();
  if (error || !data) return null;

  const program = data as WorkoutProgram;

  if (userId && program.sessions) {
    const sessionIds = program.sessions.map((s) => s.id);
    const { data: completions } = await supabase
      .from("user_session_completions")
      .select("program_session_id, completed_at")
      .eq("user_id", userId)
      .in("program_session_id", sessionIds);

    const completionMap = new Map((completions || []).map((c) => [c.program_session_id, c.completed_at]));
    program.sessions = program.sessions.map((s) => ({
      ...s,
      is_completed: completionMap.has(s.id),
      completed_at: completionMap.get(s.id) || undefined,
    }));
  }

  return program;
}

/**
 * Enregistre une séance numérique comme terminée
 */
export async function markProgramSessionCompleted(
  supabase: SupabaseClient,
  userId: string,
  programSessionId: string,
  notes?: string | null
): Promise<{ success: boolean; error?: string; alreadyCompleted?: boolean }> {
  try {
    if (!userId) {
      return { success: false, error: "Utilisateur non authentifié" };
    }

    // 1. Trouver la session et le programme dans V1_REFERENCE_PROGRAMS
    const refProg = V1_REFERENCE_PROGRAMS.find((p) =>
      p.sessions?.some((s) => s.id === programSessionId)
    );

    // 2. Vérification des droits d'accès si programme Premium
    if (refProg?.is_premium) {
      const entitlements = await getMemberDigitalEntitlements(supabase, userId);
      if (!entitlements.canAccessDigitalPrograms && entitlements.tier === "free") {
        return {
          success: false,
          error: "Ce programme nécessite un abonnement Striking Digital Premium.",
        };
      }
    }

    // 3. Vérification anti-doublon
    const { data: existing } = await supabase
      .from("user_session_completions")
      .select("id, completed_at")
      .eq("user_id", userId)
      .eq("program_session_id", programSessionId)
      .maybeSingle();

    if (existing) {
      return { success: true, alreadyCompleted: true };
    }

    // 4. Enregistrement effectif dans Supabase
    const { error: insertError } = await supabase
      .from("user_session_completions")
      .insert({
        user_id: userId,
        program_session_id: programSessionId,
        notes: notes || null,
        completed_at: new Date().toISOString(),
      });

    if (insertError) {
      return { success: false, error: insertError.message };
    }

    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erreur inattendue";
    return { success: false, error: errorMsg };
  }
}

export interface UserWorkoutCompletionHistoryItem {
  id: string;
  programId: string;
  programTitle: string;
  sessionId: string;
  sessionTitle: string;
  dayNumber: number;
  durationMinutes: number;
  completedAt: string;
  completed_at?: string;
  program_session_id?: string;
  notes?: string | null;
}

/**
 * Récupère l'historique chronologique des séances d'entraînement complétées
 */
export async function getUserSessionCompletionsHistory(
  supabase: SupabaseClient,
  userId: string,
  limit = 50
): Promise<UserWorkoutCompletionHistoryItem[]> {
  const { data, error } = await supabase
    .from("user_session_completions")
    .select("id, program_session_id, completed_at, notes")
    .eq("user_id", userId)
    .order("completed_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  // Mapper avec les 12 programmes et 36 sessions V1
  const sessionMap = new Map<
    string,
    { programId: string; programTitle: string; sessionTitle: string; dayNumber: number; durationMinutes: number }
  >();
  for (const prog of V1_REFERENCE_PROGRAMS) {
    for (const sess of prog.sessions || []) {
      sessionMap.set(sess.id, {
        programId: prog.id,
        programTitle: prog.title,
        sessionTitle: sess.title,
        dayNumber: sess.day_number,
        durationMinutes: sess.duration_minutes,
      });
    }
  }

  return data.map((item) => {
    const meta = sessionMap.get(item.program_session_id);
    return {
      id: item.id,
      programId: meta?.programId || "",
      programTitle: meta?.programTitle || "Programme d'entraînement",
      sessionId: item.program_session_id,
      sessionTitle: meta?.sessionTitle || "Séance d'entraînement",
      dayNumber: meta?.dayNumber || 1,
      durationMinutes: meta?.durationMinutes || 30,
      completedAt: item.completed_at,
      completed_at: item.completed_at,
      program_session_id: item.program_session_id,
      notes: item.notes,
    };
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 6. SYNTHÈSE HYBRIDE KB SHRED (DIGITAL + PHYSIQUE CLUB)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface KbShredHybridStats {
  digitalCompletedCount: number;
  clubBookedCount: number;
  clubAttendedCount: number;
  totalKbShredSessions: number;
  digitalProgram: WorkoutProgram | null;
}

/**
 * Récupère la synthèse KB SHRED en croisant les séances numériques complétées
 * et les réservations physiques au club (Small Group Boxing Shred / KB Shred)
 */
export async function getKbShredHybridStats(
  supabase: SupabaseClient,
  userId: string
): Promise<KbShredHybridStats> {
  const kbShredProgram = V1_REFERENCE_PROGRAMS.find((p) => p.is_kb_shred) || null;
  const kbShredSessionIds = V1_REFERENCE_PROGRAMS
    .filter((p) => p.is_kb_shred)
    .flatMap((p) => p.sessions?.map((s) => s.id) || []);

  const [compRes, clubBookingsRes] = await Promise.all([
    kbShredSessionIds.length > 0
      ? supabase
          .from("user_session_completions")
          .select("id, program_session_id, completed_at")
          .eq("user_id", userId)
          .in("program_session_id", kbShredSessionIds)
      : Promise.resolve({ data: [] }),
    supabase
      .from("bookings")
      .select("id, status, attended_at, class_session:class_sessions!inner(discipline, type, starts_at)")
      .eq("user_id", userId)
      .or("status.eq.confirmed,status.eq.attended"),
  ]);

  const digitalCompletedCount = (compRes.data || []).length;

  // Filtrer les réservations club de type KB Shred ou Boxing Shred
  const clubBookings = (clubBookingsRes.data || []).filter((b: any) => {
    const session = Array.isArray(b.class_session) ? b.class_session[0] : b.class_session;
    const disc = (session?.discipline || "").toLowerCase();
    return disc.includes("shred") || disc.includes("kettlebell") || disc.includes("kb");
  });

  const clubBookedCount = clubBookings.filter((b) => b.status === "confirmed").length;
  const clubAttendedCount = clubBookings.filter((b) => b.status === "attended" || b.attended_at !== null).length;

  return {
    digitalCompletedCount,
    clubBookedCount,
    clubAttendedCount,
    totalKbShredSessions: digitalCompletedCount + clubAttendedCount + clubBookedCount,
    digitalProgram: kbShredProgram,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 7. GUIDANCE HEBDOMADAIRE PERSONNALISÉE (Moteur Étape 6)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Récupère l'ensemble des données du membre et génère sa guidance personnalisée déterministe
 */
export async function getMemberWeeklyGuidance(
  supabase: SupabaseClient,
  userId: string,
  referenceDateStr?: string
): Promise<PersonalizedWeeklyGuidance> {
  const refDate = referenceDateStr || new Date().toISOString().split("T")[0];
  const windowStart = new Date(new Date(refDate).getTime() - 14 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const [
    fitnessData,
    weightHistory,
    foodLogsRes,
    completionsRes,
    clubBookingsRes,
    programs,
    recipes,
  ] = await Promise.all([
    getMemberFitnessProfile(supabase, userId),
    getMemberWeightHistory(supabase, userId),
    supabase
      .from("user_daily_food_logs")
      .select("*")
      .eq("user_id", userId)
      .gte("log_date", windowStart)
      .lte("log_date", refDate),
    supabase
      .from("user_session_completions")
      .select("id, user_id, program_session_id, completed_at")
      .eq("user_id", userId)
      .gte("completed_at", windowStart),
    supabase
      .from("bookings")
      .select("id, status, attended_at, class_session:class_sessions(discipline, type, starts_at)")
      .eq("user_id", userId)
      .or("status.eq.confirmed,status.eq.attended"),
    getWorkoutPrograms(supabase),
    getRecipes(supabase),
  ]);

  // Reformater les réservations club
  const clubBookings = (clubBookingsRes.data || []).map((b: any) => {
    const session = Array.isArray(b.class_session) ? b.class_session[0] : b.class_session;
    return {
      id: b.id,
      status: b.status,
      attended_at: b.attended_at,
      starts_at: session?.starts_at,
      discipline: session?.discipline,
      title: session?.discipline,
    };
  });

  const successPlan =
    fitnessData.nutritionPlan && fitnessData.nutritionPlan.status === "success"
      ? (fitnessData.nutritionPlan as any)
      : null;

  const targetNutrition = successPlan
    ? {
        targetCalories: successPlan.targetCalories?.value || 2000,
        targetProtein: successPlan.macros?.proteins?.grams || 150,
        targetCarbs: successPlan.macros?.carbs?.grams || 200,
        targetFats: successPlan.macros?.fats?.grams || 65,
      }
    : null;

  return buildWeeklyGuidance({
    profile: fitnessData.profile,
    weightLogs: weightHistory.logs,
    dailyFoodLogs: (foodLogsRes.data as UserDailyFoodLog[]) || [],
    sessionCompletions: (completionsRes.data as UserSessionCompletion[]) || [],
    clubBookings,
    availablePrograms: programs,
    availableRecipes: recipes,
    entitlements: {
      nutrition: fitnessData.entitlements.canAccessNutritionEngine,
      food_log: fitnessData.entitlements.canLogFoodJournal,
      recipes_all: fitnessData.entitlements.canAccessAllRecipes,
      digital_programs: fitnessData.entitlements.canAccessDigitalPrograms,
      kb_shred_digital: fitnessData.entitlements.canAccessKBShredDigital,
      advanced_stats: fitnessData.entitlements.canAccessAdvancedStats,
    },
    targetNutrition,
    referenceDate: refDate,
  });
}

