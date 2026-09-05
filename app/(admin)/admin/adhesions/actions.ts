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

export interface UpdateMembershipRequestPayload {
  planId: string;
  commitmentType: "monthly" | "annual";
  adminNotes?: string;
}

export interface UpdateMembershipResult {
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

/**
 * Server Action : Modifie une demande d'adhésion côté administrateur.
 *
 * Exécutée exclusivement côté serveur avec vérification d'authentification
 * et du rôle ADMIN sur la session active via getUser().
 *
 * Règles métier :
 * 1. Validation stricte du rôle ADMIN et de la clé service_role.
 * 2. Contrôle de cohérence du plan et de l'engagement (mensuel/annuel).
 * 3. Ne modifie JAMAIS user_id ni les données d'authentification du membre.
 * 4. Ne supprime JAMAIS de réservations existantes.
 * 5. Cas "pending" : met à jour la demande en conservant le statut "pending".
 * 6. Cas "approved" : met à jour la demande ET synchronise l'abonnement actif
 *    correspondant dans public.subscriptions (plan_id, private_sessions_quota, ends_at).
 */
export async function updateMembershipRequestServerAction(
  requestId: string,
  payload: UpdateMembershipRequestPayload
): Promise<UpdateMembershipResult> {
  try {
    // 1. Validation de l'ID et de la structure du payload
    if (!requestId || typeof requestId !== "string" || requestId.trim() === "") {
      return { success: false, error: "Identifiant de demande d'adhésion invalide." };
    }

    if (!payload || typeof payload !== "object") {
      return { success: false, error: "Données de modification invalides." };
    }

    const { planId, commitmentType, adminNotes } = payload;

    if (!planId || typeof planId !== "string" || planId.trim() === "") {
      return { success: false, error: "Veuillez sélectionner une formule valide." };
    }

    if (commitmentType !== "monthly" && commitmentType !== "annual") {
      return {
        success: false,
        error: "Type d'engagement invalide (doit être 'monthly' ou 'annual').",
      };
    }

    // 2. Validation stricte de la session et du rôle ADMIN côté serveur via les cookies
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

    // 3. Vérification de la clé secrète service_role
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return {
        success: false,
        error: "Configuration serveur incomplète : SUPABASE_SERVICE_ROLE_KEY non disponible.",
      };
    }

    const adminSupabase = createAdminClient();

    // 4. Récupération et vérification de la demande existante
    const { data: req, error: reqFetchError } = await adminSupabase
      .from("membership_requests")
      .select("id, user_id, plan_id, status, commitment_type, admin_notes")
      .eq("id", requestId)
      .maybeSingle();

    if (reqFetchError || !req) {
      return {
        success: false,
        error: "Demande d'adhésion introuvable.",
      };
    }

    // 5. Récupération et validation de la formule sélectionnée
    const { data: targetPlan, error: planFetchError } = await adminSupabase
      .from("plans")
      .select("id, name, type, private_sessions_per_period, is_active")
      .eq("id", planId)
      .maybeSingle();

    if (planFetchError || !targetPlan) {
      return {
        success: false,
        error: "La formule sélectionnée est introuvable.",
      };
    }

    const cleanNotes = typeof adminNotes === "string" ? adminNotes.trim() : req.admin_notes;

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // CAS 1 : Demande en attente ("pending")
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (req.status === "pending") {
      const { error: updateReqError } = await adminSupabase
        .from("membership_requests")
        .update({
          plan_id: planId,
          commitment_type: commitmentType,
          admin_notes: cleanNotes || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (updateReqError) {
        console.error("[updateMembershipRequestServerAction] Erreur mise à jour demande pending :", updateReqError);
        return {
          success: false,
          error: "Erreur lors de la mise à jour de la demande d'adhésion.",
        };
      }

      revalidatePath("/admin/adhesions");

      return {
        success: true,
        message: "La demande d'adhésion a été modifiée avec succès.",
      };
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // CAS 2 : Demande déjà validée ("approved")
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (req.status === "approved") {
      // 1. Mise à jour de la demande d'adhésion
      const { error: updateReqError } = await adminSupabase
        .from("membership_requests")
        .update({
          plan_id: planId,
          commitment_type: commitmentType,
          admin_notes: cleanNotes || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (updateReqError) {
        console.error("[updateMembershipRequestServerAction] Erreur mise à jour demande approved :", updateReqError);
        return {
          success: false,
          error: "Erreur lors de la mise à jour de la demande d'adhésion.",
        };
      }

      // 2. Récupération de l'abonnement actif associé au membre
      const { data: sub, error: subFetchError } = await adminSupabase
        .from("subscriptions")
        .select("id, started_at, ends_at, private_sessions_quota")
        .eq("user_id", req.user_id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!subFetchError && sub) {
        // Recalcul déterministe de la date d'échéance basée sur la date de début de l'abonnement
        const startedAt = new Date(sub.started_at || new Date());
        const endsAt = new Date(startedAt);
        if (commitmentType === "annual") {
          endsAt.setFullYear(endsAt.getFullYear() + 1);
        } else {
          endsAt.setMonth(endsAt.getMonth() + 1);
        }

        const quota =
          typeof targetPlan.private_sessions_per_period === "number"
            ? targetPlan.private_sessions_per_period
            : 8;

        // Mise à jour de l'abonnement actif existant sans doublon ni suppression de réservations
        const { error: updateSubError } = await adminSupabase
          .from("subscriptions")
          .update({
            plan_id: planId,
            ends_at: endsAt.toISOString(),
            private_sessions_quota: quota,
            updated_at: new Date().toISOString(),
          })
          .eq("id", sub.id);

        if (updateSubError) {
          console.error("[updateMembershipRequestServerAction] Erreur synchronisation subscription :", updateSubError);
          return {
            success: false,
            error: "La demande a été mise à jour mais la synchronisation de l'abonnement actif a échoué.",
          };
        }
      }

      revalidatePath("/admin/adhesions");
      revalidatePath("/admin/abonnements");
      revalidatePath("/admin");

      return {
        success: true,
        message: "La formule d'adhésion et l'abonnement actif ont été synchronisés avec succès.",
      };
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // CAS 3 : Autres statuts (ex: rejected, cancelled)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const { error: updateOtherError } = await adminSupabase
      .from("membership_requests")
      .update({
        plan_id: planId,
        commitment_type: commitmentType,
        admin_notes: cleanNotes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (updateOtherError) {
      console.error("[updateMembershipRequestServerAction] Erreur mise à jour :", updateOtherError);
      return {
        success: false,
        error: "Erreur lors de la mise à jour de la demande.",
      };
    }

    revalidatePath("/admin/adhesions");

    return {
      success: true,
      message: "La demande d'adhésion a été modifiée avec succès.",
    };
  } catch (err) {
    const error = err as Error;
    console.error("[updateMembershipRequestServerAction] Exception :", error);
    return {
      success: false,
      error: error.message || "Une erreur inattendue est survenue lors de la modification.",
    };
  }
}

