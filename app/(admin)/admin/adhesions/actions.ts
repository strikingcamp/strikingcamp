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
 * et du rôle ADMIN sur la session active.
 *
 * Processus métier :
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

    // 1. Validation de la session et du rôle ADMIN côté serveur
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

    const cleanNotes = adminNotes?.trim() || null;

    // 2. Tentative via RPC Postgres sécurisée (avec contexte JWT admin)
    const { data: rpcData, error: rpcError } = await supabase.rpc("admin_approve_membership_request", {
      p_request_id: requestId,
      p_admin_notes: cleanNotes,
    });

    const rpcRes = rpcData as { success?: boolean; subscription_id?: string; error?: string; message?: string } | null;

    if (!rpcError && rpcRes && rpcRes.success === true) {
      revalidatePath("/admin/adhesions");
      revalidatePath("/admin/abonnements");
      revalidatePath("/admin");
      return {
        success: true,
        subscriptionId: rpcRes.subscription_id,
        message: rpcRes.message || "Demande validée avec succès. L'abonnement actif du membre a été créé.",
      };
    }

    // Si la RPC a retourné une erreur métier explicite (autre que FORBIDDEN)
    if (rpcRes && rpcRes.success === false && rpcRes.error !== "FORBIDDEN") {
      return {
        success: false,
        error: rpcRes.message || rpcRes.error || "Impossible de valider la demande.",
      };
    }

    // 3. Exécution sécurisée avec privilèges serveur (service_role)
    // Résout les cas où les cookies client ne propagent pas auth.uid() à la RPC
    const adminSupabase = createAdminClient();

    // A. Récupérer et verrouiller la demande
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

    // B. Récupération de la formule
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

    // C. Calcul des dates selon l'engagement
    const startedAt = new Date();
    const endsAt = new Date(startedAt);
    if (req.commitment_type === "annual") {
      endsAt.setFullYear(endsAt.getFullYear() + 1);
    } else {
      endsAt.setMonth(endsAt.getMonth() + 1);
    }

    const quota = typeof plan.private_sessions_per_period === "number" ? plan.private_sessions_per_period : 8;

    // D. Création de l'abonnement actif
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

    // E. Mise à jour de la demande en approved
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
 * et du rôle ADMIN sur la session active.
 */
export async function rejectMembershipRequestServerAction(
  requestId: string,
  adminNotes?: string
): Promise<RejectMembershipResult> {
  try {
    if (!requestId || typeof requestId !== "string") {
      return { success: false, error: "Identifiant de demande d'adhésion invalide." };
    }

    // 1. Validation de la session et du rôle ADMIN côté serveur
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

    const cleanNotes = adminNotes?.trim() || null;

    // 2. Tentative via RPC Postgres sécurisée
    const { data: rpcData, error: rpcError } = await supabase.rpc("admin_reject_membership_request", {
      p_request_id: requestId,
      p_admin_notes: cleanNotes,
    });

    const rpcRes = rpcData as { success?: boolean; error?: string; message?: string } | null;

    if (!rpcError && rpcRes && rpcRes.success === true) {
      revalidatePath("/admin/adhesions");
      return {
        success: true,
        message: rpcRes.message || "La demande d'adhésion a été refusée.",
      };
    }

    if (rpcRes && rpcRes.success === false && rpcRes.error !== "FORBIDDEN") {
      return {
        success: false,
        error: rpcRes.message || rpcRes.error || "Impossible de refuser la demande.",
      };
    }

    // 3. Exécution sécurisée avec privilèges serveur (service_role)
    const adminSupabase = createAdminClient();

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
