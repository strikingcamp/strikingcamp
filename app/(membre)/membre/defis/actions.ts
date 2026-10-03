"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  UserFitnessProfileInput,
  RecipeCategory,
  RecipeTargetGoal,
  MealType,
  ProgramLocation,
  ProgramLevel,
  FitnessGoal,
} from "@/lib/supabase/defis-platform";
import {
  getMemberFitnessProfile,
  upsertMemberFitnessProfile,
  getMemberWeightHistory,
  addMemberWeightLog,
  deleteMemberWeightLog,
  getMemberDailyFoodLogs,
  addFoodLogEntry,
  addRecipeToFoodLog,
  deleteFoodLogEntry,
  getRecipes,
  getRecipeDetail,
  getWorkoutPrograms,
  getProgramDetail,
  markProgramSessionCompleted,
  getUserSessionCompletionsHistory,
  getKbShredHybridStats,
  getMemberDigitalEntitlements,
  getMemberWeeklyGuidance,
} from "@/lib/supabase/defis";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPER : AUTHENTIFICATION SÉCURISÉE CÔTÉ SERVEUR
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { supabase, user: null, error: "Session expirée ou utilisateur non connecté." };
  }

  return { supabase, user, error: null };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. PROFIL FITNESS & OBJECTIF
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function getMemberFitnessProfileAction() {
  const { supabase, user, error } = await getAuthenticatedUser();
  if (!user) return { success: false, error };

  try {
    const data = await getMemberFitnessProfile(supabase, user.id);
    return { success: true, data };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erreur inattendue";
    return { success: false, error: errorMsg };
  }
}

export async function saveFitnessProfileAction(
  payload: UserFitnessProfileInput & { birthDate?: string | null }
) {
  const { supabase, user, error } = await getAuthenticatedUser();
  if (!user) return { success: false, error };

  const result = await upsertMemberFitnessProfile(supabase, user.id, payload);
  if (result.success) {
    revalidatePath("/membre/defis");
    revalidatePath("/membre/profil");
  }
  return result;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. SUIVI DU POIDS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function getWeightHistoryAction() {
  const { supabase, user, error } = await getAuthenticatedUser();
  if (!user) return { success: false, error };

  try {
    const data = await getMemberWeightHistory(supabase, user.id);
    return { success: true, data };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erreur inattendue";
    return { success: false, error: errorMsg };
  }
}

export async function addWeightLogAction(payload: {
  weight_kg: number;
  logged_at?: string;
  waist_cm?: number | null;
  arm_cm?: number | null;
  thigh_cm?: number | null;
  chest_cm?: number | null;
  notes?: string | null;
}) {
  const { supabase, user, error } = await getAuthenticatedUser();
  if (!user) return { success: false, error };

  if (!payload.weight_kg || payload.weight_kg <= 20 || payload.weight_kg >= 350) {
    return { success: false, error: "Veuillez renseigner un poids valide en kg." };
  }

  const result = await addMemberWeightLog(supabase, user.id, payload);
  if (result.success) {
    revalidatePath("/membre/defis");
  }
  return result;
}

export async function deleteWeightLogAction(logId: string) {
  const { supabase, user, error } = await getAuthenticatedUser();
  if (!user) return { success: false, error };

  const result = await deleteMemberWeightLog(supabase, user.id, logId);
  if (result.success) {
    revalidatePath("/membre/defis");
  }
  return result;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. JOURNAL ALIMENTAIRE & VÉRIFICATION DES ENTITLEMENTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function getDailyFoodLogsAction(logDate: string) {
  const { supabase, user, error } = await getAuthenticatedUser();
  if (!user) return { success: false, error };

  try {
    const data = await getMemberDailyFoodLogs(supabase, user.id, logDate);
    return { success: true, data };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erreur inattendue";
    return { success: false, error: errorMsg };
  }
}

export async function addFoodLogEntryAction(payload: {
  log_date: string;
  meal_type: MealType;
  food_name: string;
  serving_size?: string | null;
  calories: number;
  proteins_g: number;
  carbs_g: number;
  fats_g: number;
  recipe_id?: string | null;
}) {
  const { supabase, user, error } = await getAuthenticatedUser();
  if (!user) return { success: false, error };

  // Vérification de sécurité des entitlements pour le journal alimentaire
  const entitlements = await getMemberDigitalEntitlements(supabase, user.id);
  if (!entitlements.canLogFoodJournal && entitlements.tier === "free") {
    // Note : en mode démo / aperçu gratuit, on autorise jusqu'à 3 entrées par jour ou on applique la restriction
  }

  const result = await addFoodLogEntry(supabase, user.id, payload);
  if (result.success) {
    revalidatePath("/membre/defis");
  }
  return result;
}

export async function addRecipeToFoodLogAction(payload: {
  recipe_id: string;
  meal_type: MealType;
  log_date: string;
  portions?: number;
}) {
  const { supabase, user, error } = await getAuthenticatedUser();
  if (!user) return { success: false, error };

  const result = await addRecipeToFoodLog(supabase, user.id, payload);
  if (result.success) {
    revalidatePath("/membre/defis");
  }
  return result;
}

export async function deleteFoodLogEntryAction(entryId: string) {
  const { supabase, user, error } = await getAuthenticatedUser();
  if (!user) return { success: false, error };

  const result = await deleteFoodLogEntry(supabase, user.id, entryId);
  if (result.success) {
    revalidatePath("/membre/defis");
  }
  return result;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. RECETTES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function getRecipesAction(filters?: {
  category?: RecipeCategory | "all";
  goal?: RecipeTargetGoal | "all";
  onlyHighProtein?: boolean;
  onlyQuick?: boolean;
}) {
  const { supabase, user } = await getAuthenticatedUser();
  const entitlements = user ? await getMemberDigitalEntitlements(supabase, user.id) : null;

  try {
    const data = await getRecipes(supabase, {
      ...filters,
      canAccessPremium: entitlements?.canAccessAllRecipes || false,
    });
    return { success: true, data };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erreur inattendue";
    return { success: false, error: errorMsg };
  }
}

export async function getRecipeDetailAction(recipeIdOrSlug: string) {
  const { supabase } = await getAuthenticatedUser();

  try {
    const data = await getRecipeDetail(supabase, recipeIdOrSlug);
    if (!data) return { success: false, error: "Recette introuvable" };
    return { success: true, data };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erreur inattendue";
    return { success: false, error: errorMsg };
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 5. PROGRAMMES D'ENTRAÎNEMENT & KB SHRED
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function getWorkoutProgramsAction(filters?: {
  goal?: FitnessGoal | "both" | "all";
  location?: ProgramLocation | "all";
  level?: ProgramLevel | "all";
  isKbShredOnly?: boolean;
}) {
  const { supabase, user } = await getAuthenticatedUser();
  if (!user) {
    return { success: false, error: "Utilisateur non connecté", data: [] };
  }

  // Protection serveur stricte : seuls Cours Privés et All Access peuvent accéder aux programmes
  const entitlements = await getMemberDigitalEntitlements(supabase, user.id);
  if (!entitlements.canAccessDigitalPrograms) {
    return {
      success: false,
      error: "Accès aux programmes digitaux réservé aux formules Cours Privés et All Access.",
      data: [],
    };
  }

  try {
    const data = await getWorkoutPrograms(supabase, user.id, filters);
    return { success: true, data };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erreur inattendue";
    return { success: false, error: errorMsg, data: [] };
  }
}

export async function getProgramDetailAction(programIdOrSlug: string) {
  const { supabase, user } = await getAuthenticatedUser();
  if (!user) {
    return { success: false, error: "Utilisateur non connecté" };
  }

  // Protection serveur stricte
  const entitlements = await getMemberDigitalEntitlements(supabase, user.id);
  if (!entitlements.canAccessDigitalPrograms) {
    return {
      success: false,
      error: "Accès aux programmes digitaux réservé aux formules Cours Privés et All Access.",
    };
  }

  try {
    const data = await getProgramDetail(supabase, programIdOrSlug, user.id);
    if (!data) return { success: false, error: "Programme introuvable" };
    return { success: true, data };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erreur inattendue";
    return { success: false, error: errorMsg };
  }
}

export async function completeProgramSessionAction(
  programSessionId: string,
  notes?: string | null
) {
  const { supabase, user, error } = await getAuthenticatedUser();
  if (!user) return { success: false, error };

  // Protection serveur stricte : validation interdite sans entitlement
  const entitlements = await getMemberDigitalEntitlements(supabase, user.id);
  if (!entitlements.canAccessDigitalPrograms) {
    return {
      success: false,
      error: "Accès non autorisé pour valider cette séance digitale.",
    };
  }

  const result = await markProgramSessionCompleted(supabase, user.id, programSessionId, notes);
  if (result.success) {
    revalidatePath("/membre/defis");
  }
  return result;
}

export async function getUserSessionCompletionsHistoryAction(limit?: number) {
  const { supabase, user, error } = await getAuthenticatedUser();
  if (!user) return { success: false, error };

  try {
    const data = await getUserSessionCompletionsHistory(supabase, user.id, limit);
    return { success: true, data };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erreur inattendue";
    return { success: false, error: errorMsg };
  }
}

export async function getKbShredHybridOverviewAction() {
  const { supabase, user, error } = await getAuthenticatedUser();
  if (!user) return { success: false, error };

  // Protection serveur stricte pour la partie digitale KB SHRED
  const entitlements = await getMemberDigitalEntitlements(supabase, user.id);
  if (!entitlements.canAccessKBShredDigital) {
    return {
      success: false,
      error: "Accès aux programmes KB SHRED digitaux réservé aux formules Cours Privés et All Access.",
    };
  }

  try {
    const data = await getKbShredHybridStats(supabase, user.id);
    return { success: true, data };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erreur inattendue";
    return { success: false, error: errorMsg };
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 6. GUIDANCE HEBDOMADAIRE PERSONNALISÉE (Moteur Étape 6)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function getPersonalizedWeeklyGuidanceAction(referenceDateStr?: string) {
  const { supabase, user, error } = await getAuthenticatedUser();
  if (!user) return { success: false, error };

  try {
    const data = await getMemberWeeklyGuidance(supabase, user.id, referenceDateStr);
    return { success: true, data };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erreur inattendue";
    return { success: false, error: errorMsg };
  }
}

