"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { assertAdminUser } from "@/lib/supabase/auth-admin";
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

/**
 * Récupère tous les défis avec métadonnées pour l'administration (Server Action sécurisée).
 */
export async function getAdminChallengesServerAction() {
  try {
    await assertAdminUser();
    const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : await createClient();
    const data = await getAdminChallenges(supabase);
    return { success: true, data };
  } catch (err) {
    const error = err as Error;
    console.error("[getAdminChallengesServerAction] Erreur :", error);
    return { success: false, error: error.message || "Erreur de chargement des défis." };
  }
}

/**
 * Récupère un défi et ses étapes pour l'éditeur Admin (Server Action sécurisée).
 */
export async function getAdminChallengeWithStepsServerAction(challengeId: string) {
  try {
    await assertAdminUser();
    const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : await createClient();
    const data = await getAdminChallengeWithSteps(supabase, challengeId);
    return { success: true, data };
  } catch (err) {
    const error = err as Error;
    console.error("[getAdminChallengeWithStepsServerAction] Erreur :", error);
    return { success: false, error: error.message || "Erreur de chargement du défi." };
  }
}

/**
 * Crée un nouveau défi en base de données (Server Action sécurisée).
 */
export async function createAdminChallengeServerAction(payload: Partial<Challenge>) {
  try {
    await assertAdminUser();
    const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : await createClient();
    const result = await createAdminChallenge(supabase, payload);

    if (result.success) {
      revalidatePath("/admin/defis");
      revalidatePath("/membre/defis");
    }

    return result;
  } catch (err) {
    const error = err as Error;
    console.error("[createAdminChallengeServerAction] Erreur :", error);
    return { success: false, error: error.message || "Erreur lors de la création du défi." };
  }
}

/**
 * Met à jour un défi existant (Server Action sécurisée).
 */
export async function updateAdminChallengeServerAction(
  challengeId: string,
  payload: Partial<Challenge>
) {
  try {
    await assertAdminUser();
    const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : await createClient();
    const result = await updateAdminChallenge(supabase, challengeId, payload);

    if (result.success) {
      revalidatePath("/admin/defis");
      revalidatePath("/membre/defis");
    }

    return result;
  } catch (err) {
    const error = err as Error;
    console.error("[updateAdminChallengeServerAction] Erreur :", error);
    return { success: false, error: error.message || "Erreur lors de la mise à jour du défi." };
  }
}

/**
 * Supprime un défi (Server Action sécurisée).
 */
export async function deleteAdminChallengeServerAction(challengeId: string) {
  try {
    await assertAdminUser();
    const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : await createClient();
    const result = await deleteAdminChallenge(supabase, challengeId);

    if (result.success) {
      revalidatePath("/admin/defis");
      revalidatePath("/membre/defis");
    }

    return result;
  } catch (err) {
    const error = err as Error;
    console.error("[deleteAdminChallengeServerAction] Erreur :", error);
    return { success: false, error: error.message || "Erreur lors de la suppression du défi." };
  }
}

/**
 * Crée une nouvelle étape pour un défi (Server Action sécurisée).
 */
export async function createAdminChallengeStepServerAction(
  challengeId: string,
  payload: Partial<ChallengeStep>
) {
  try {
    await assertAdminUser();
    const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : await createClient();
    const result = await createAdminChallengeStep(supabase, challengeId, payload);

    if (result.success) {
      revalidatePath("/admin/defis");
      revalidatePath("/membre/defis");
    }

    return result;
  } catch (err) {
    const error = err as Error;
    console.error("[createAdminChallengeStepServerAction] Erreur :", error);
    return { success: false, error: error.message || "Erreur lors de la création de l'étape." };
  }
}

/**
 * Met à jour une étape de défi (Server Action sécurisée).
 */
export async function updateAdminChallengeStepServerAction(
  stepId: string,
  payload: Partial<ChallengeStep>
) {
  try {
    await assertAdminUser();
    const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : await createClient();
    const result = await updateAdminChallengeStep(supabase, stepId, payload);

    if (result.success) {
      revalidatePath("/admin/defis");
      revalidatePath("/membre/defis");
    }

    return result;
  } catch (err) {
    const error = err as Error;
    console.error("[updateAdminChallengeStepServerAction] Erreur :", error);
    return { success: false, error: error.message || "Erreur lors de la mise à jour de l'étape." };
  }
}

/**
 * Supprime une étape de défi (Server Action sécurisée).
 */
export async function deleteAdminChallengeStepServerAction(stepId: string) {
  try {
    await assertAdminUser();
    const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : await createClient();
    const result = await deleteAdminChallengeStep(supabase, stepId);

    if (result.success) {
      revalidatePath("/admin/defis");
      revalidatePath("/membre/defis");
    }

    return result;
  } catch (err) {
    const error = err as Error;
    console.error("[deleteAdminChallengeStepServerAction] Erreur :", error);
    return { success: false, error: error.message || "Erreur lors de la suppression de l'étape." };
  }
}

/**
 * Réordonne les étapes d'un défi (Server Action sécurisée).
 */
export async function reorderAdminChallengeStepsServerAction(
  challengeId: string,
  stepIdsInOrder: string[]
) {
  try {
    await assertAdminUser();
    const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : await createClient();
    const result = await reorderAdminChallengeSteps(supabase, challengeId, stepIdsInOrder);

    if (result.success) {
      revalidatePath("/admin/defis");
      revalidatePath("/membre/defis");
    }

    return result;
  } catch (err) {
    const error = err as Error;
    console.error("[reorderAdminChallengeStepsServerAction] Erreur :", error);
    return { success: false, error: error.message || "Erreur lors du réordonnancement des étapes." };
  }
}
