"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export interface ApproveMembershipResult {
  success: boolean;
  subscriptionId?: string;
  error?: string;
  message?: string;
}

export interface RejectMembershipResult {
  success: boolean;
  error?: string;
  message?: string;
}

/**
 * Server Action : Valide une demande d'adhésion côté administrateur.
 *
 * Exécutée exclusivement côté serveur avec vérification d'authentification
 * et du rôle ADMIN sur la session active via getUser().
 *
 * Processus métier atomique :
 * 1. Vérification de la session et du rôle ADMIN.
 * 2. Vérification que la demande existe et est en statut "pending".
 * 3. Récupération de la formule choisie (plans) et calcul des dates :
 *    - Annuel (annual) : validité 12 mois
 *    - Mensuel (monthly) : validité 1 mois initial
 * 4. Application du quota de séances privées (selon la formule, défaut 8).
 * 5. Création de l'abonnement actif dans public.subscriptions (status: 'active').
 * 6. Mise à jour de la demande dans public.membership_requests (status: 'approved', reviewed_by, reviewed_at, admin_notes).
 */
export async function approveMembershipRequestServerAction(
  requestId: string,
  adminNotes?: string
): Promise<ApproveMembershipResult> {
  try {
    if (!requestId || typeof requestId !== "string") {
      return { success: false, error: "Identifiant de demande d'adhésion invalide." };
    }

    // 1. Validation stricte de la session et du rôle ADMIN côté serveur via les cookies de session
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "Session invalide ou expirée. Veuillez vous reconnecter.",
      };
    }

    const role = (user.app_metadata?.role || user.user_metadata?.role || "").toUpperCase();
    if (role !== "ADMIN") {
      return {
        success: false,
        error: "Accès refusé. Privilèges administrateur requis.",
      };
    }

    // 2. Vérification de la clé secrète service_role
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return {
        success: false,
        error: "Configuration serveur incomplète : SUPABASE_SERVICE_ROLE_KEY non disponible.",
      };
    }

    const cleanNotes = adminNotes?.trim() || null;
    const adminSupabase = createAdminClient();

    // 3. Récupération et vérification de la demande
    const { data: req, error: reqFetchError } = await adminSupabase
      .from("membership_requests")
      .select("id, user_id, plan_id, status, commitment_type")
      .eq("id", requestId)
      .maybeSingle();

    if (reqFetchError || !req) {
      return {
        success: false,
        error: "Demande d'adhésion introuvable.",
      };
    }

    if (req.status !== "pending") {
      return {
        success: false,
        error: `Cette demande n'est plus en attente (statut actuel: ${req.status}).`,
      };
    }

    // 4. Récupération de la formule
    const { data: plan, error: planFetchError } = await adminSupabase
      .from("plans")
      .select("id, name, type, private_sessions_per_period")
      .eq("id", req.plan_id)
      .maybeSingle();

    if (planFetchError || !plan) {
      return {
        success: false,
        error: "Formule introuvable pour cette demande.",
      };
    }

    // 5. Calcul des dates selon l'engagement
    const startedAt = new Date();
    const endsAt = new Date(startedAt);
    if (req.commitment_type === "annual") {
      endsAt.setFullYear(endsAt.getFullYear() + 1);
    } else {
      endsAt.setMonth(endsAt.getMonth() + 1);
    }

    const quota = typeof plan.private_sessions_per_period === "number" ? plan.private_sessions_per_period : 8;

    // 6. Création de l'abonnement actif
    const { data: sub, error: subError } = await adminSupabase
      .from("subscriptions")
      .insert({
        user_id: req.user_id,
        plan_id: req.plan_id,
        status: "active",
        started_at: startedAt.toISOString(),
        ends_at: endsAt.toISOString(),
        private_sessions_quota: quota,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (subError || !sub) {
      console.error("[approveMembershipRequestServerAction] Erreur création subscription :", subError);
      return {
        success: false,
        error: "Erreur lors de la création de l'abonnement du membre.",
      };
    }

    // 7. Mise à jour de la demande en approved avec traçabilité de l'administrateur
    const { error: updateReqError } = await adminSupabase
      .from("membership_requests")
      .update({
        status: "approved",
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        admin_notes: cleanNotes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (updateReqError) {
      console.error("[approveMembershipRequestServerAction] Erreur mise à jour demande :", updateReqError);
      return {
        success: false,
        error: "L'abonnement a été créé mais la mise à jour du statut a échoué.",
      };
    }

    revalidatePath("/admin/adhesions");
    revalidatePath("/admin/abonnements");
    revalidatePath("/admin");

    return {
      success: true,
      subscriptionId: sub.id,
      message: "Demande validée avec succès. L'abonnement actif du membre a été créé.",
    };
  } catch (err) {
    const error = err as Error;
    console.error("[approveMembershipRequestServerAction] Exception :", error);
    return {
      success: false,
      error: error.message || "Une erreur inattendue est survenue lors de la validation.",
    };
  }
}

/**
 * Server Action : Refuse une demande d'adhésion côté administrateur.
 *
 * Exécutée exclusivement côté serveur avec vérification d'authentification
 * et du rôle ADMIN sur la session active via getUser().
 */
export async function rejectMembershipRequestServerAction(
  requestId: string,
  adminNotes?: string
): Promise<RejectMembershipResult> {
  try {
    if (!requestId || typeof requestId !== "string") {
      return { success: false, error: "Identifiant de demande d'adhésion invalide." };
    }

    // 1. Validation stricte de la session et du rôle ADMIN côté serveur
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "Session invalide ou expirée. Veuillez vous reconnecter.",
      };
    }

    const role = (user.app_metadata?.role || user.user_metadata?.role || "").toUpperCase();
    if (role !== "ADMIN") {
      return {
        success: false,
        error: "Accès refusé. Privilèges administrateur requis.",
      };
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return {
        success: false,
        error: "Configuration serveur incomplète : SUPABASE_SERVICE_ROLE_KEY non disponible.",
      };
    }

    const cleanNotes = adminNotes?.trim() || null;
    const adminSupabase = createAdminClient();

    // 2. Vérification que la demande existe et est en attente
    const { data: req, error: reqFetchError } = await adminSupabase
      .from("membership_requests")
      .select("id, status")
      .eq("id", requestId)
      .maybeSingle();

    if (reqFetchError || !req) {
      return {
        success: false,
        error: "Demande d'adhésion introuvable.",
      };
    }

    if (req.status !== "pending") {
      return {
        success: false,
        error: `Cette demande n'est plus en attente (statut actuel: ${req.status}).`,
      };
    }

    // 3. Mise à jour de la demande en rejected
    const { error: updateError } = await adminSupabase
      .from("membership_requests")
      .update({
        status: "rejected",
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        admin_notes: cleanNotes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (updateError) {
      console.error("[rejectMembershipRequestServerAction] Erreur mise à jour demande :", updateError);
      return {
        success: false,
        error: "Erreur lors du refus de la demande.",
      };
    }

    revalidatePath("/admin/adhesions");

    return {
      success: true,
      message: "La demande d'adhésion a été refusée.",
    };
  } catch (err) {
    const error = err as Error;
    console.error("[rejectMembershipRequestServerAction] Exception :", error);
    return {
      success: false,
      error: error.message || "Une erreur inattendue est survenue lors du refus.",
    };
  }
}
