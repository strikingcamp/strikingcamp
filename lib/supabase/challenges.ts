import { SupabaseClient } from "@supabase/supabase-js";

export type ChallengeCategory = "Technique" | "Physique" | "Cardio" | "Nutrition";
export type ChallengeLevel = "Débutant" | "Intermédiaire" | "Confirmé" | "Tous niveaux";
export type ChallengeStatus = "draft" | "published" | "archived";

export interface Challenge {
  id: string;
  title: string;
  category: ChallengeCategory;
  level: ChallengeLevel;
  short_description?: string | null;
  description?: string | null;
  cover_image_url?: string | null;
  points_xp: number;
  badge_reward?: string | null;
  status: ChallengeStatus;
  is_active: boolean;
  display_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface ChallengeStep {
  id: string;
  challenge_id: string;
  step_order: number;
  title: string;
  description?: string | null;
  video_url?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface UserChallengeProgress {
  id: string;
  user_id: string;
  challenge_id: string;
  progress_percentage: number;
  status: "in_progress" | "completed";
  started_at: string;
  completed_at?: string | null;
  updated_at?: string;
}

export interface MemberChallengeCardData extends Challenge {
  stepsCount: number;
  progressPercentage: number;
  progressStatus: "not_started" | "in_progress" | "completed";
  completedStepsCount: number;
}

export interface MemberStepDetail extends ChallengeStep {
  isCompleted: boolean;
  isUnlocked: boolean;
}

export interface MemberChallengeDetailData extends Challenge {
  steps: MemberStepDetail[];
  progressPercentage: number;
  progressStatus: "not_started" | "in_progress" | "completed";
  completedStepsCount: number;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FONCTIONS MEMBRE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Récupère tous les défis publiés et actifs avec l'état d'avancement du membre connecté
 */
export async function getMemberChallenges(
  supabase: SupabaseClient,
  userId?: string | null
): Promise<MemberChallengeCardData[]> {
  try {
    // 1. Récupérer les défis publiés et actifs
    const { data: challenges, error: chalErr } = await supabase
      .from("challenges")
      .select("*")
      .eq("status", "published")
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (chalErr || !challenges) {
      console.warn("[getMemberChallenges] Erreur ou aucun défi trouvé :", chalErr);
      return [];
    }

    if (challenges.length === 0) return [];

    const challengeIds = challenges.map((c) => c.id);

    // 2. Récupérer le nombre d'étapes actives par défi
    const { data: steps } = await supabase
      .from("challenge_steps")
      .select("id, challenge_id")
      .in("challenge_id", challengeIds)
      .eq("is_active", true);

    const stepsCountByChallenge: Record<string, number> = {};
    (steps || []).forEach((s) => {
      stepsCountByChallenge[s.challenge_id] = (stepsCountByChallenge[s.challenge_id] || 0) + 1;
    });

    // 3. Récupérer la progression du membre connecté si disponible
    let progressMap: Record<string, { progress_percentage: number; status: string }> = {};
    let completionsCountByChallenge: Record<string, number> = {};

    if (userId) {
      const { data: progressList } = await supabase
        .from("user_challenge_progress")
        .select("challenge_id, progress_percentage, status")
        .eq("user_id", userId)
        .in("challenge_id", challengeIds);

      (progressList || []).forEach((p) => {
        progressMap[p.challenge_id] = {
          progress_percentage: p.progress_percentage || 0,
          status: p.status,
        };
      });

      const { data: completions } = await supabase
        .from("user_challenge_step_completions")
        .select("challenge_id")
        .eq("user_id", userId)
        .in("challenge_id", challengeIds);

      (completions || []).forEach((c) => {
        completionsCountByChallenge[c.challenge_id] = (completionsCountByChallenge[c.challenge_id] || 0) + 1;
      });
    }

    // 4. Formater les données pour le membre
    return challenges.map((c) => {
      const stepsCount = stepsCountByChallenge[c.id] || 0;
      const userProgress = progressMap[c.id];
      const completedStepsCount = completionsCountByChallenge[c.id] || 0;

      let progressPercentage = 0;
      let progressStatus: "not_started" | "in_progress" | "completed" = "not_started";

      if (userProgress) {
        progressPercentage = userProgress.progress_percentage;
        progressStatus = userProgress.status === "completed" ? "completed" : "in_progress";
      } else if (completedStepsCount > 0 && stepsCount > 0) {
        progressPercentage = Math.floor((completedStepsCount / stepsCount) * 100);
        progressStatus = completedStepsCount >= stepsCount ? "completed" : "in_progress";
      }

      return {
        ...c,
        stepsCount,
        progressPercentage,
        progressStatus,
        completedStepsCount,
      };
    });
  } catch (err) {
    console.error("[getMemberChallenges] Exception :", err);
    return [];
  }
}

/**
 * Récupère le détail d'un défi avec toutes ses étapes et l'état de déverrouillage pour le membre
 */
export async function getMemberChallengeDetail(
  supabase: SupabaseClient,
  challengeId: string,
  userId?: string | null
): Promise<MemberChallengeDetailData | null> {
  try {
    // 1. Récupérer le défi
    const { data: challenge, error: chalErr } = await supabase
      .from("challenges")
      .select("*")
      .eq("id", challengeId)
      .single();

    if (chalErr || !challenge) {
      console.warn("[getMemberChallengeDetail] Défi introuvable :", chalErr);
      return null;
    }

    // 2. Récupérer les étapes actives ordonnées
    const { data: steps, error: stepErr } = await supabase
      .from("challenge_steps")
      .select("*")
      .eq("challenge_id", challengeId)
      .eq("is_active", true)
      .order("step_order", { ascending: true });

    if (stepErr) {
      console.warn("[getMemberChallengeDetail] Erreur étapes :", stepErr);
    }

    const rawSteps: ChallengeStep[] = steps || [];

    // 3. Récupérer les étapes validées par le membre
    const completedStepIds = new Set<string>();
    if (userId) {
      const { data: completions } = await supabase
        .from("user_challenge_step_completions")
        .select("step_id")
        .eq("user_id", userId)
        .eq("challenge_id", challengeId);

      (completions || []).forEach((comp) => completedStepIds.add(comp.step_id));
    }

    // 4. Calcul du déverrouillage séquentiel
    // La 1ère étape est débloquée d'office. L'étape N est débloquée si l'étape N-1 est validée.
    let isPrevCompleted = true;
    const formattedSteps: MemberStepDetail[] = rawSteps.map((s, idx) => {
      const isCompleted = completedStepIds.has(s.id);
      const isUnlocked = idx === 0 || isPrevCompleted;

      // Pour l'étape suivante, l'étape courante doit être complétée
      isPrevCompleted = isCompleted;

      return {
        ...s,
        isCompleted,
        isUnlocked,
      };
    });

    const totalSteps = formattedSteps.length;
    const completedStepsCount = formattedSteps.filter((s) => s.isCompleted).length;
    const progressPercentage = totalSteps > 0 ? Math.floor((completedStepsCount / totalSteps) * 100) : 0;
    const progressStatus: "not_started" | "in_progress" | "completed" =
      completedStepsCount >= totalSteps && totalSteps > 0
        ? "completed"
        : completedStepsCount > 0
        ? "in_progress"
        : "not_started";

    return {
      ...challenge,
      steps: formattedSteps,
      progressPercentage,
      progressStatus,
      completedStepsCount,
    };
  } catch (err) {
    console.error("[getMemberChallengeDetail] Exception :", err);
    return null;
  }
}

/**
 * Valide une étape de défi via la RPC sécurisée Supabase
 */
export async function completeChallengeStep(
  supabase: SupabaseClient,
  challengeId: string,
  stepId: string
): Promise<{
  success: boolean;
  progressPercentage?: number;
  isCompleted?: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const { data, error } = await supabase.rpc("complete_challenge_step", {
      p_challenge_id: challengeId,
      p_step_id: stepId,
    });

    if (error) {
      console.error("[completeChallengeStep] Erreur RPC :", error);
      return { success: false, error: error.message };
    }

    const res = data as {
      success?: boolean;
      progress_percentage?: number;
      is_completed?: boolean;
      message?: string;
      error?: string;
    };

    if (res.success === false) {
      return {
        success: false,
        error: res.message || res.error || "Impossible de valider cette étape.",
      };
    }

    return {
      success: true,
      progressPercentage: res.progress_percentage,
      isCompleted: res.is_completed,
      message: res.message,
    };
  } catch (err) {
    console.error("[completeChallengeStep] Exception :", err);
    return {
      success: false,
      error: (err as Error).message || "Erreur lors de la validation de l'étape.",
    };
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FONCTIONS ADMINISTRATEUR (CRUD DÉFIS & ÉTAPES)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Récupère tous les défis pour la vue Admin (draft, published, archived)
 */
export async function getAdminChallenges(
  supabase: SupabaseClient
): Promise<(Challenge & { stepsCount: number; activeParticipantsCount: number })[]> {
  try {
    const { data: challenges, error: cErr } = await supabase
      .from("challenges")
      .select("*")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (cErr || !challenges) {
      console.error("[getAdminChallenges] Erreur récupération défis :", cErr);
      return [];
    }

    if (challenges.length === 0) return [];

    const challengeIds = challenges.map((c) => c.id);

    // Récupérer le nombre d'étapes
    const { data: steps } = await supabase
      .from("challenge_steps")
      .select("id, challenge_id")
      .in("challenge_id", challengeIds);

    const stepsCountMap: Record<string, number> = {};
    (steps || []).forEach((s) => {
      stepsCountMap[s.challenge_id] = (stepsCountMap[s.challenge_id] || 0) + 1;
    });

    // Récupérer le nombre de participants
    const { data: progressList } = await supabase
      .from("user_challenge_progress")
      .select("challenge_id")
      .in("challenge_id", challengeIds);

    const participantsCountMap: Record<string, number> = {};
    (progressList || []).forEach((p) => {
      participantsCountMap[p.challenge_id] = (participantsCountMap[p.challenge_id] || 0) + 1;
    });

    return challenges.map((c) => ({
      ...c,
      stepsCount: stepsCountMap[c.id] || 0,
      activeParticipantsCount: participantsCountMap[c.id] || 0,
    }));
  } catch (err) {
    console.error("[getAdminChallenges] Exception :", err);
    return [];
  }
}

/**
 * Récupère un défi et toutes ses étapes pour l'éditeur Admin
 */
export async function getAdminChallengeWithSteps(
  supabase: SupabaseClient,
  challengeId: string
): Promise<{ challenge: Challenge; steps: ChallengeStep[] } | null> {
  try {
    const { data: challenge, error: cErr } = await supabase
      .from("challenges")
      .select("*")
      .eq("id", challengeId)
      .single();

    if (cErr || !challenge) return null;

    const { data: steps, error: sErr } = await supabase
      .from("challenge_steps")
      .select("*")
      .eq("challenge_id", challengeId)
      .order("step_order", { ascending: true });

    if (sErr) console.warn("[getAdminChallengeWithSteps] Erreur étapes :", sErr);

    return {
      challenge,
      steps: steps || [],
    };
  } catch (err) {
    console.error("[getAdminChallengeWithSteps] Exception :", err);
    return null;
  }
}

/**
 * Crée un nouveau défi en base
 */
export async function createAdminChallenge(
  supabase: SupabaseClient,
  payload: Partial<Challenge>
): Promise<{ success: boolean; data?: Challenge; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("challenges")
      .insert({
        title: payload.title,
        category: payload.category || "Technique",
        level: payload.level || "Tous niveaux",
        short_description: payload.short_description,
        description: payload.description,
        cover_image_url: payload.cover_image_url,
        points_xp: payload.points_xp ?? 500,
        badge_reward: payload.badge_reward,
        status: payload.status || "draft",
        is_active: payload.is_active ?? true,
        display_order: payload.display_order ?? 0,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("[createAdminChallenge] Erreur insertion :", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    console.error("[createAdminChallenge] Exception :", err);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Met à jour un défi existant
 */
export async function updateAdminChallenge(
  supabase: SupabaseClient,
  challengeId: string,
  payload: Partial<Challenge>
): Promise<{ success: boolean; data?: Challenge; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("challenges")
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq("id", challengeId)
      .select()
      .single();

    if (error) {
      console.error("[updateAdminChallenge] Erreur mise à jour :", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    console.error("[updateAdminChallenge] Exception :", err);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Supprime un défi (cascade sur steps et progress)
 */
export async function deleteAdminChallenge(
  supabase: SupabaseClient,
  challengeId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("challenges")
      .delete()
      .eq("id", challengeId);

    if (error) {
      console.error("[deleteAdminChallenge] Erreur suppression :", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("[deleteAdminChallenge] Exception :", err);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Crée une nouvelle étape pour un défi
 */
export async function createAdminChallengeStep(
  supabase: SupabaseClient,
  challengeId: string,
  payload: Partial<ChallengeStep>
): Promise<{ success: boolean; data?: ChallengeStep; error?: string }> {
  try {
    // Calculer le prochain step_order si non fourni
    let order = payload.step_order;
    if (order === undefined || order === null) {
      const { data: existingSteps } = await supabase
        .from("challenge_steps")
        .select("step_order")
        .eq("challenge_id", challengeId)
        .order("step_order", { ascending: false })
        .limit(1);

      order = existingSteps && existingSteps.length > 0 ? existingSteps[0].step_order + 1 : 1;
    }

    const { data, error } = await supabase
      .from("challenge_steps")
      .insert({
        challenge_id: challengeId,
        step_order: order,
        title: payload.title || "Nouvelle étape",
        description: payload.description,
        video_url: payload.video_url,
        is_active: payload.is_active ?? true,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("[createAdminChallengeStep] Erreur création étape :", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    console.error("[createAdminChallengeStep] Exception :", err);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Met à jour une étape de défi
 */
export async function updateAdminChallengeStep(
  supabase: SupabaseClient,
  stepId: string,
  payload: Partial<ChallengeStep>
): Promise<{ success: boolean; data?: ChallengeStep; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("challenge_steps")
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq("id", stepId)
      .select()
      .single();

    if (error) {
      console.error("[updateAdminChallengeStep] Erreur mise à jour étape :", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    console.error("[updateAdminChallengeStep] Exception :", err);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Supprime une étape de défi
 */
export async function deleteAdminChallengeStep(
  supabase: SupabaseClient,
  stepId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("challenge_steps")
      .delete()
      .eq("id", stepId);

    if (error) {
      console.error("[deleteAdminChallengeStep] Erreur suppression étape :", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("[deleteAdminChallengeStep] Exception :", err);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Réordonne les étapes d'un défi
 */
export async function reorderAdminChallengeSteps(
  supabase: SupabaseClient,
  challengeId: string,
  stepIdsInOrder: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    // Passe 1 : Décaler temporairement les ordres pour éviter les collisions d'index unique
    for (let i = 0; i < stepIdsInOrder.length; i++) {
      const stepId = stepIdsInOrder[i];
      await supabase
        .from("challenge_steps")
        .update({ step_order: 10000 + i })
        .eq("id", stepId)
        .eq("challenge_id", challengeId);
    }

    // Passe 2 : Assigner les ordres définitifs (1, 2, 3...)
    for (let i = 0; i < stepIdsInOrder.length; i++) {
      const stepId = stepIdsInOrder[i];
      const newOrder = i + 1;
      const { error } = await supabase
        .from("challenge_steps")
        .update({ step_order: newOrder, updated_at: new Date().toISOString() })
        .eq("id", stepId)
        .eq("challenge_id", challengeId);

      if (error) {
        console.error(`[reorderAdminChallengeSteps] Erreur sur étape ${stepId} :`, error);
        return { success: false, error: error.message };
      }
    }

    return { success: true };
  } catch (err) {
    console.error("[reorderAdminChallengeSteps] Exception :", err);
    return { success: false, error: (err as Error).message };
  }
}
