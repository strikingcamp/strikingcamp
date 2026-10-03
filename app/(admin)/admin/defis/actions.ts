"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { assertAdminUser } from "@/lib/supabase/auth-admin";
import type {
  Recipe,
  RecipeIngredient,
  WorkoutProgram,
  ProgramSession,
  ProgramExercise,
  PlanConfig,
  NutritionPlatformSettings,
} from "@/lib/supabase/defis-platform";
import type {
  Challenge,
  ChallengeStep,
} from "@/lib/supabase/challenges";
import {
  getAdminChallenges,
  getAdminChallengeWithSteps,
  createAdminChallenge,
  updateAdminChallenge,
  deleteAdminChallenge,
  createAdminChallengeStep,
  updateAdminChallengeStep,
  deleteAdminChallengeStep,
  reorderAdminChallengeSteps,
} from "@/lib/supabase/challenges";

async function getAdminDb() {
  await assertAdminUser();
  return process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : await createClient();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. VUE D'ENSEMBLE / STATISTIQUES GLOBALES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface DefisOverviewStats {
  totalRecipes: number;
  totalActiveRecipes: number;
  totalPrograms: number;
  totalActivePrograms: number;
  totalPlans: number;
  totalActiveProfiles: number;
  totalWeightLogs: number;
  totalFoodLogs: number;
}

export async function getAdminDefisOverviewAction(): Promise<{
  success: boolean;
  data?: DefisOverviewStats;
  error?: string;
}> {
  try {
    const supabase = await getAdminDb();

    const [
      recipesRes,
      programsRes,
      plansRes,
      profilesRes,
      weightsRes,
      foodLogsRes,
    ] = await Promise.all([
      supabase.from("recipes").select("id, is_active"),
      supabase.from("workout_programs").select("id, is_active"),
      supabase.from("plans").select("id, is_active"),
      supabase.from("user_fitness_profiles").select("id", { count: "exact", head: true }),
      supabase.from("user_weight_logs").select("id", { count: "exact", head: true }),
      supabase.from("user_daily_food_logs").select("id", { count: "exact", head: true }),
    ]);

    const recipes = recipesRes.data || [];
    const programs = programsRes.data || [];
    const plans = plansRes.data || [];

    const stats: DefisOverviewStats = {
      totalRecipes: recipes.length,
      totalActiveRecipes: recipes.filter((r) => r.is_active).length,
      totalPrograms: programs.length,
      totalActivePrograms: programs.filter((p) => p.is_active).length,
      totalPlans: plans.length,
      totalActiveProfiles: profilesRes.count || 0,
      totalWeightLogs: weightsRes.count || 0,
      totalFoodLogs: foodLogsRes.count || 0,
    };

    return { success: true, data: stats };
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[getAdminDefisOverviewAction] Erreur :", error);
    return { success: false, error: error.message || "Erreur de chargement des statistiques." };
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. RECETTES (CRUD COMPLET & INGRÉDIENTS)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function getAdminRecipesAction(): Promise<{
  success: boolean;
  data?: Recipe[];
  error?: string;
}> {
  try {
    const supabase = await getAdminDb();
    const { data, error } = await supabase
      .from("recipes")
      .select("*, ingredients:recipe_ingredients(*)")
      .order("display_order", { ascending: true })
      .order("title", { ascending: true });

    if (error) throw error;
    return { success: true, data: data as Recipe[] };
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[getAdminRecipesAction] Erreur :", error);
    return { success: false, error: error.message || "Erreur lors du chargement des recettes." };
  }
}

export async function upsertAdminRecipeAction(
  recipeData: Partial<Recipe>,
  ingredients: Partial<RecipeIngredient>[] = []
): Promise<{ success: boolean; data?: Recipe; error?: string }> {
  try {
    const supabase = await getAdminDb();

    const recipePayload = {
      title: recipeData.title,
      slug: recipeData.slug || (recipeData.title ? recipeData.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") : "recette"),
      category: recipeData.category || "lunch",
      target_goal: recipeData.target_goal || "both",
      prep_time_minutes: recipeData.prep_time_minutes || 15,
      difficulty: recipeData.difficulty || "Facile",
      calories: recipeData.calories || 0,
      proteins_g: recipeData.proteins_g || 0,
      carbs_g: recipeData.carbs_g || 0,
      fats_g: recipeData.fats_g || 0,
      image_url: recipeData.image_url || null,
      instructions: recipeData.instructions || null,
      tags: recipeData.tags || [],
      is_premium: recipeData.is_premium ?? false,
      is_active: recipeData.is_active ?? true,
      display_order: recipeData.display_order || 10,
      updated_at: new Date().toISOString(),
    };

    let recipeId = recipeData.id;

    if (recipeId) {
      const { data, error } = await supabase
        .from("recipes")
        .update(recipePayload)
        .eq("id", recipeId)
        .select()
        .single();
      if (error) throw error;
    } else {
      const { data, error } = await supabase
        .from("recipes")
        .insert(recipePayload)
        .select()
        .single();
      if (error) throw error;
      recipeId = data.id;
    }

    // Gestion des ingrédients
    if (recipeId && ingredients) {
      await supabase.from("recipe_ingredients").delete().eq("recipe_id", recipeId);

      if (ingredients.length > 0) {
        const ingredientsToInsert = ingredients.map((ing, idx) => ({
          recipe_id: recipeId,
          name: ing.name || "Ingrédient",
          quantity: ing.quantity ?? null,
          unit: ing.unit ?? null,
          display_order: ing.display_order ?? idx + 1,
        }));
        const { error: ingError } = await supabase.from("recipe_ingredients").insert(ingredientsToInsert);
        if (ingError) throw ingError;
      }
    }

    revalidatePath("/admin/defis");
    revalidatePath("/membre/defis");

    return { success: true };
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[upsertAdminRecipeAction] Erreur :", error);
    return { success: false, error: error.message || "Erreur lors de l'enregistrement de la recette." };
  }
}

export async function deleteAdminRecipeAction(recipeId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getAdminDb();
    const { error } = await supabase.from("recipes").delete().eq("id", recipeId);
    if (error) throw error;

    revalidatePath("/admin/defis");
    revalidatePath("/membre/defis");
    return { success: true };
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[deleteAdminRecipeAction] Erreur :", error);
    return { success: false, error: error.message || "Erreur lors de la suppression de la recette." };
  }
}

export async function toggleAdminRecipeActiveAction(recipeId: string, isActive: boolean): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getAdminDb();
    const { error } = await supabase.from("recipes").update({ is_active: isActive }).eq("id", recipeId);
    if (error) throw error;

    revalidatePath("/admin/defis");
    revalidatePath("/membre/defis");
    return { success: true };
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[toggleAdminRecipeActiveAction] Erreur :", error);
    return { success: false, error: error.message || "Erreur de statut recette." };
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. PROGRAMMES D'ENTRAÎNEMENT & KB SHRED (CRUD COMPLET)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function getAdminProgramsAction(): Promise<{
  success: boolean;
  data?: WorkoutProgram[];
  error?: string;
}> {
  try {
    const supabase = await getAdminDb();
    const { data, error } = await supabase
      .from("workout_programs")
      .select("*, sessions:program_sessions(*, exercises:program_exercises(*))")
      .order("display_order", { ascending: true })
      .order("title", { ascending: true });

    if (error) throw error;
    return { success: true, data: data as WorkoutProgram[] };
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[getAdminProgramsAction] Erreur :", error);
    return { success: false, error: error.message || "Erreur lors du chargement des programmes." };
  }
}

export async function upsertAdminProgramAction(
  programData: Partial<WorkoutProgram>
): Promise<{ success: boolean; data?: WorkoutProgram; error?: string }> {
  try {
    const supabase = await getAdminDb();

    const payload = {
      title: programData.title,
      slug: programData.slug || (programData.title ? programData.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") : "programme"),
      description: programData.description || null,
      primary_goal: programData.primary_goal || "both",
      location: programData.location || "home",
      required_equipment: programData.required_equipment || ["bodyweight"],
      level: programData.level || "Débutant",
      sessions_per_week: programData.sessions_per_week || 3,
      duration_weeks: programData.duration_weeks || 4,
      cover_image_url: programData.cover_image_url || null,
      is_kb_shred: programData.is_kb_shred ?? false,
      is_premium: programData.is_premium ?? false,
      is_active: programData.is_active ?? true,
      display_order: programData.display_order || 10,
      updated_at: new Date().toISOString(),
    };

    if (programData.id) {
      const { error } = await supabase.from("workout_programs").update(payload).eq("id", programData.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("workout_programs").insert(payload);
      if (error) throw error;
    }

    revalidatePath("/admin/defis");
    revalidatePath("/membre/defis");
    return { success: true };
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[upsertAdminProgramAction] Erreur :", error);
    return { success: false, error: error.message || "Erreur lors de l'enregistrement du programme." };
  }
}

export async function deleteAdminProgramAction(programId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getAdminDb();
    const { error } = await supabase.from("workout_programs").delete().eq("id", programId);
    if (error) throw error;

    revalidatePath("/admin/defis");
    revalidatePath("/membre/defis");
    return { success: true };
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[deleteAdminProgramAction] Erreur :", error);
    return { success: false, error: error.message || "Erreur lors de la suppression du programme." };
  }
}

export async function upsertAdminSessionAction(
  programId: string,
  sessionData: Partial<ProgramSession>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getAdminDb();
    const payload = {
      program_id: programId,
      day_number: sessionData.day_number || 1,
      title: sessionData.title || "Séance",
      description: sessionData.description || null,
      duration_minutes: sessionData.duration_minutes || 30,
      is_club_session: sessionData.is_club_session ?? false,
      club_discipline_tag: sessionData.club_discipline_tag || null,
      is_active: sessionData.is_active ?? true,
      display_order: sessionData.display_order || 1,
    };

    if (sessionData.id) {
      const { error } = await supabase.from("program_sessions").update(payload).eq("id", sessionData.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("program_sessions").insert(payload);
      if (error) throw error;
    }

    revalidatePath("/admin/defis");
    revalidatePath("/membre/defis");
    return { success: true };
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[upsertAdminSessionAction] Erreur :", error);
    return { success: false, error: error.message || "Erreur lors de l'enregistrement de la séance." };
  }
}

export async function deleteAdminSessionAction(sessionId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getAdminDb();
    const { error } = await supabase.from("program_sessions").delete().eq("id", sessionId);
    if (error) throw error;

    revalidatePath("/admin/defis");
    revalidatePath("/membre/defis");
    return { success: true };
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[deleteAdminSessionAction] Erreur :", error);
    return { success: false, error: error.message || "Erreur lors de la suppression de la séance." };
  }
}

export async function upsertAdminExerciseAction(
  sessionId: string,
  exerciseData: Partial<ProgramExercise>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getAdminDb();
    const payload = {
      session_id: sessionId,
      name: exerciseData.name || "Exercice",
      sets: exerciseData.sets || 3,
      reps_or_duration: exerciseData.reps_or_duration || "10 reps",
      rest_seconds: exerciseData.rest_seconds || 60,
      instructions: exerciseData.instructions || null,
      video_url: exerciseData.video_url || null,
      display_order: exerciseData.display_order || 1,
    };

    if (exerciseData.id) {
      const { error } = await supabase.from("program_exercises").update(payload).eq("id", exerciseData.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("program_exercises").insert(payload);
      if (error) throw error;
    }

    revalidatePath("/admin/defis");
    revalidatePath("/membre/defis");
    return { success: true };
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[upsertAdminExerciseAction] Erreur :", error);
    return { success: false, error: error.message || "Erreur lors de l'enregistrement de l'exercice." };
  }
}

export async function deleteAdminExerciseAction(exerciseId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getAdminDb();
    const { error } = await supabase.from("program_exercises").delete().eq("id", exerciseId);
    if (error) throw error;

    revalidatePath("/admin/defis");
    revalidatePath("/membre/defis");
    return { success: true };
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[deleteAdminExerciseAction] Erreur :", error);
    return { success: false, error: error.message || "Erreur lors de la suppression de l'exercice." };
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. OFFRES PREMIUM & ENTITLEMENTS (PLANS)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function getAdminPlansAction(): Promise<{
  success: boolean;
  data?: PlanConfig[];
  error?: string;
}> {
  try {
    const supabase = await getAdminDb();
    const { data, error } = await supabase
      .from("plans")
      .select("*")
      .order("display_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) throw error;
    return { success: true, data: data as PlanConfig[] };
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[getAdminPlansAction] Erreur :", error);
    return { success: false, error: error.message || "Erreur lors du chargement des offres." };
  }
}

export async function updateAdminPlanAction(
  planId: string,
  payload: Partial<PlanConfig>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getAdminDb();

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (payload.name !== undefined) updateData.name = payload.name;
    if (payload.description !== undefined) updateData.description = payload.description;
    if (payload.price_cents !== undefined) updateData.price_cents = payload.price_cents;
    if (payload.commitment !== undefined) updateData.commitment = payload.commitment;
    if (payload.tier !== undefined) updateData.tier = payload.tier;
    if (payload.is_digital_plan !== undefined) updateData.is_digital_plan = payload.is_digital_plan;
    if (payload.is_active !== undefined) updateData.is_active = payload.is_active;
    if (payload.badge_text !== undefined) updateData.badge_text = payload.badge_text;
    if (payload.display_order !== undefined) updateData.display_order = payload.display_order;
    if (payload.trial_days !== undefined) updateData.trial_days = payload.trial_days;
    if (payload.features !== undefined) updateData.features = payload.features;
    if (payload.entitlements !== undefined) updateData.entitlements = payload.entitlements;
    if (payload.stripe_price_id !== undefined) updateData.stripe_price_id = payload.stripe_price_id;
    if (payload.stripe_product_id !== undefined) updateData.stripe_product_id = payload.stripe_product_id;

    const { error } = await supabase.from("plans").update(updateData).eq("id", planId);
    if (error) throw error;

    revalidatePath("/admin/defis");
    revalidatePath("/admin/formules");
    revalidatePath("/tarifs");
    revalidatePath("/membre/defis");
    return { success: true };
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[updateAdminPlanAction] Erreur :", error);
    return { success: false, error: error.message || "Erreur lors de la mise à jour de l'offre." };
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 5. PARAMÈTRES NUTRITIONNELS DU MOTEUR (MIFFLIN-ST JEOR)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function getAdminNutritionSettingsAction(): Promise<{
  success: boolean;
  data?: NutritionPlatformSettings;
  error?: string;
}> {
  try {
    const supabase = await getAdminDb();
    const { data, error } = await supabase
      .from("nutrition_platform_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return { success: true, data: data as NutritionPlatformSettings };
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[getAdminNutritionSettingsAction] Erreur :", error);
    return { success: false, error: error.message || "Erreur de chargement des paramètres nutrition." };
  }
}

export async function updateAdminNutritionSettingsAction(
  settingsData: Partial<NutritionPlatformSettings>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getAdminDb();

    const payload = {
      default_bmr_formula: "mifflin_st_jeor",
      weight_loss_caloric_delta: settingsData.weight_loss_caloric_delta ?? -400,
      muscle_gain_caloric_delta: settingsData.muscle_gain_caloric_delta ?? 300,
      maintenance_caloric_delta: settingsData.maintenance_caloric_delta ?? 0,
      protein_ratio_weight_loss: settingsData.protein_ratio_weight_loss ?? 2.0,
      protein_ratio_muscle_gain: settingsData.protein_ratio_muscle_gain ?? 2.0,
      protein_ratio_maintenance: settingsData.protein_ratio_maintenance ?? 1.6,
      fat_ratio_weight_loss: settingsData.fat_ratio_weight_loss ?? 0.9,
      fat_ratio_muscle_gain: settingsData.fat_ratio_muscle_gain ?? 1.0,
      fat_ratio_maintenance: settingsData.fat_ratio_maintenance ?? 0.9,
      technical_caloric_floor_female: settingsData.technical_caloric_floor_female ?? 1200,
      technical_caloric_floor_male: settingsData.technical_caloric_floor_male ?? 1500,
      disclaimer_text: settingsData.disclaimer_text || "Estimations sportives et nutritionnelles indicatives — Ne constitue pas une prescription médicale.",
      updated_at: new Date().toISOString(),
    };

    if (settingsData.id) {
      const { error } = await supabase
        .from("nutrition_platform_settings")
        .update(payload)
        .eq("id", settingsData.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("nutrition_platform_settings")
        .upsert(payload);
      if (error) throw error;
    }

    revalidatePath("/admin/defis");
    revalidatePath("/membre/defis");
    return { success: true };
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[updateAdminNutritionSettingsAction] Erreur :", error);
    return { success: false, error: error.message || "Erreur lors de la sauvegarde des paramètres nutritionnels." };
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 6. DÉFIS & ÉTAPES V1 (GESTION DU MODULE GAMIFICATION EXISTANT)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function getAdminChallengesServerAction() {
  try {
    const supabase = await getAdminDb();
    const data = await getAdminChallenges(supabase);
    return { success: true, data };
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[getAdminChallengesServerAction] Erreur :", error);
    return { success: false, error: error.message || "Erreur de chargement des défis." };
  }
}

export async function getAdminChallengeWithStepsServerAction(challengeId: string) {
  try {
    const supabase = await getAdminDb();
    const data = await getAdminChallengeWithSteps(supabase, challengeId);
    return { success: true, data };
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[getAdminChallengeWithStepsServerAction] Erreur :", error);
    return { success: false, error: error.message || "Erreur de chargement du défi." };
  }
}

export async function createAdminChallengeServerAction(payload: Partial<Challenge>) {
  try {
    const supabase = await getAdminDb();
    const result = await createAdminChallenge(supabase, payload);
    if (result.success) {
      revalidatePath("/admin/defis");
      revalidatePath("/membre/defis");
    }
    return result;
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[createAdminChallengeServerAction] Erreur :", error);
    return { success: false, error: error.message || "Erreur lors de la création du défi." };
  }
}

export async function updateAdminChallengeServerAction(
  challengeId: string,
  payload: Partial<Challenge>
) {
  try {
    const supabase = await getAdminDb();
    const result = await updateAdminChallenge(supabase, challengeId, payload);
    if (result.success) {
      revalidatePath("/admin/defis");
      revalidatePath("/membre/defis");
    }
    return result;
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[updateAdminChallengeServerAction] Erreur :", error);
    return { success: false, error: error.message || "Erreur lors de la mise à jour du défi." };
  }
}

export async function deleteAdminChallengeServerAction(challengeId: string) {
  try {
    const supabase = await getAdminDb();
    const result = await deleteAdminChallenge(supabase, challengeId);
    if (result.success) {
      revalidatePath("/admin/defis");
      revalidatePath("/membre/defis");
    }
    return result;
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[deleteAdminChallengeServerAction] Erreur :", error);
    return { success: false, error: error.message || "Erreur lors de la suppression du défi." };
  }
}

export async function createAdminChallengeStepServerAction(
  challengeId: string,
  payload: Partial<ChallengeStep>
) {
  try {
    const supabase = await getAdminDb();
    const result = await createAdminChallengeStep(supabase, challengeId, payload);
    if (result.success) {
      revalidatePath("/admin/defis");
      revalidatePath("/membre/defis");
    }
    return result;
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[createAdminChallengeStepServerAction] Erreur :", error);
    return { success: false, error: error.message || "Erreur lors de la création de l'étape." };
  }
}

export async function updateAdminChallengeStepServerAction(
  stepId: string,
  payload: Partial<ChallengeStep>
) {
  try {
    const supabase = await getAdminDb();
    const result = await updateAdminChallengeStep(supabase, stepId, payload);
    if (result.success) {
      revalidatePath("/admin/defis");
      revalidatePath("/membre/defis");
    }
    return result;
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[updateAdminChallengeStepServerAction] Erreur :", error);
    return { success: false, error: error.message || "Erreur lors de la mise à jour de l'étape." };
  }
}

export async function deleteAdminChallengeStepServerAction(stepId: string) {
  try {
    const supabase = await getAdminDb();
    const result = await deleteAdminChallengeStep(supabase, stepId);
    if (result.success) {
      revalidatePath("/admin/defis");
      revalidatePath("/membre/defis");
    }
    return result;
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[deleteAdminChallengeStepServerAction] Erreur :", error);
    return { success: false, error: error.message || "Erreur lors de la suppression de l'étape." };
  }
}

export async function reorderAdminChallengeStepsServerAction(
  challengeId: string,
  stepIdsInOrder: string[]
) {
  try {
    const supabase = await getAdminDb();
    const result = await reorderAdminChallengeSteps(supabase, challengeId, stepIdsInOrder);
    if (result.success) {
      revalidatePath("/admin/defis");
      revalidatePath("/membre/defis");
    }
    return result;
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[reorderAdminChallengeStepsServerAction] Erreur :", error);
    return { success: false, error: error.message || "Erreur lors du réordonnancement des étapes." };
  }
}
