"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { SESSION_PACKS, computePackExpirationDate } from "@/lib/stripe";

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
 * Server Action : Valide une demande d'adhésion ou de pack côté administrateur.
 *
 * Exécutée exclusivement côté serveur avec vérification d'authentification
 * et du rôle ADMIN sur la session active via getUser().
 */
export async function approveMembershipRequestServerAction(
  requestId: string,
  adminNotes?: string
): Promise<ApproveMembershipResult> {
  try {
    if (!requestId || typeof requestId !== "string" || requestId.trim() === "") {
      return { success: false, error: "Identifiant de demande invalide." };
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

    const role = (user.app_metadata?.role || "").toUpperCase();
    if (role !== "ADMIN") {
      return {
        success: false,
        error: "Accès refusé. Privilèges administrateur requis.",
      };
    }

    const cleanNotes = adminNotes?.trim() || null;

    // 2. Récupération de la demande et du type d'offre
    const { data: req, error: reqErr } = await supabase
      .from("membership_requests")
      .select(`
        id,
        user_id,
        plan_id,
        status,
        plan:plans (
          id,
          name,
          code,
          type,
          tier,
          price_cents
        )
      `)
      .eq("id", requestId)
      .single();

    if (reqErr || !req) {
      return { success: false, error: "Demande introuvable." };
    }

    if (req.status !== "pending") {
      return {
        success: false,
        error: `Cette demande n'est plus en attente (statut actuel: ${req.status}).`,
      };
    }

    const plan = Array.isArray(req.plan) ? req.plan[0] : req.plan;

    // 3. Cas particulier : Offre de type Pack de Crédits (Achat unique sans abonnement)
    if (plan?.tier === "credit_pack") {
      const planCode = plan.code || "";
      const packDef = SESSION_PACKS[planCode];
      const totalCredits =
        packDef?.totalCredits ||
        (planCode === "pack_10_small_group" ? 10 : planCode === "decouverte_3" ? 3 : 1);
      const startsAt = new Date();
      const expiresAt = computePackExpirationDate(packDef || planCode, startsAt);

      // Restriction stricte : les offres découverte ne peuvent être validées qu'une seule fois à vie
      if (planCode === "decouverte_1" || planCode === "decouverte_3") {
        const { data: existingCredits } = await supabase
          .from("member_session_credits")
          .select("id")
          .eq("user_id", req.user_id)
          .eq("plan_id", req.plan_id);

        if (existingCredits && existingCredits.length > 0) {
          return {
            success: false,
            error: `Ce membre a déjà bénéficié de l'offre découverte ${plan.name}. Les offres découverte sont strictement limitées à 1 fois par membre à vie.`,
          };
        }
      }

      // Création du pack actif dans public.member_session_credits
      const { data: newPack, error: packErr } = await supabase
        .from("member_session_credits")
        .insert({
          user_id: req.user_id,
          plan_id: req.plan_id,
          total_credits: totalCredits,
          remaining_credits: totalCredits,
          starts_at: startsAt.toISOString(),
          expires_at: expiresAt.toISOString(),
          status: "active",
        })
        .select("id")
        .single();

      if (packErr || !newPack) {
        console.error("[approveMembershipRequestServerAction] Erreur création member_session_credits :", packErr);
        return { success: false, error: "Erreur lors de la création du pack de crédits." };
      }

      // Insertion de la transaction d'audit
      await supabase.from("session_credit_transactions").insert({
        credit_pack_id: newPack.id,
        user_id: req.user_id,
        delta: totalCredits,
        transaction_type: "purchase",
        reason: `Validation manuelle par l'administrateur : ${plan.name}`,
      });

      // Mise à jour de la demande en approved
      await supabase
        .from("membership_requests")
        .update({
          status: "approved",
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          admin_notes: cleanNotes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      revalidatePath("/admin/adhesions");
      revalidatePath("/admin/abonnements");
      revalidatePath("/admin/membres");
      revalidatePath("/admin");
      revalidatePath("/membre/planning");
      revalidatePath("/membre");

      return {
        success: true,
        message: `Demande de pack validée avec succès. ${totalCredits} séance(s) ont été créditées sur le compte du membre.`,
      };
    }

    // 4. Cas standard : Abonnement récurrent (appel de la RPC PostgreSQL SECURITY DEFINER)
    const { data: rpcData, error: rpcError } = await supabase.rpc("admin_approve_membership_request", {
      p_request_id: requestId,
      p_admin_notes: cleanNotes,
    });

    if (rpcError) {
      console.error("[approveMembershipRequestServerAction] Erreur RPC :", rpcError);
      return {
        success: false,
        error: rpcError.message || "Erreur lors de la validation de la demande d'adhésion.",
      };
    }

    const res = rpcData as { success?: boolean; subscription_id?: string; error?: string; message?: string };
    if (!res || res.success === false) {
      return {
        success: false,
        error: res?.message || res?.error || "La validation a échoué.",
      };
    }

    revalidatePath("/admin/adhesions");
    revalidatePath("/admin/abonnements");
    revalidatePath("/admin/membres");
    revalidatePath("/admin");

    return {
      success: true,
      subscriptionId: res.subscription_id,
      message: res.message || "Demande validée avec succès. L'abonnement actif du membre a été créé.",
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
 * Server Action : Refuse une demande d'adhésion ou de pack côté administrateur.
 *
 * Exécutée exclusivement côté serveur avec vérification d'authentification
 * et du rôle ADMIN sur la session active via getUser().
 */
export async function rejectMembershipRequestServerAction(
  requestId: string,
  adminNotes?: string
): Promise<RejectMembershipResult> {
  try {
    if (!requestId || typeof requestId !== "string" || requestId.trim() === "") {
      return { success: false, error: "Identifiant de demande invalide." };
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

    const role = (user.app_metadata?.role || "").toUpperCase();
    if (role !== "ADMIN") {
      return {
        success: false,
        error: "Accès refusé. Privilèges administrateur requis.",
      };
    }

    const cleanNotes = adminNotes?.trim() || null;

    // 2. Récupération de la demande et du type d'offre
    const { data: req, error: reqErr } = await supabase
      .from("membership_requests")
      .select(`
        id,
        user_id,
        plan_id,
        status,
        plan:plans (
          id,
          name,
          code,
          tier
        )
      `)
      .eq("id", requestId)
      .single();

    if (reqErr || !req) {
      return { success: false, error: "Demande introuvable." };
    }

    const plan = Array.isArray(req.plan) ? req.plan[0] : req.plan;

    // 3. Cas particulier : Offre de type Pack de Crédits
    if (plan?.tier === "credit_pack") {
      await supabase
        .from("membership_requests")
        .update({
          status: "rejected",
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          admin_notes: cleanNotes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      revalidatePath("/admin/adhesions");
      revalidatePath("/admin");

      return {
        success: true,
        message: "La demande de pack a été refusée.",
      };
    }

    // 4. Cas standard : Abonnement récurrent (appel de la RPC PostgreSQL SECURITY DEFINER)
    const { data: rpcData, error: rpcError } = await supabase.rpc("admin_reject_membership_request", {
      p_request_id: requestId,
      p_admin_notes: cleanNotes,
    });

    if (rpcError) {
      console.error("[rejectMembershipRequestServerAction] Erreur RPC :", rpcError);
      return {
        success: false,
        error: rpcError.message || "Erreur lors du refus de la demande.",
      };
    }

    const res = rpcData as { success?: boolean; error?: string; message?: string };
    if (!res || res.success === false) {
      return {
        success: false,
        error: res?.message || res?.error || "Le refus de la demande a échoué.",
      };
    }

    revalidatePath("/admin/adhesions");
    revalidatePath("/admin");

    return {
      success: true,
      message: res.message || "La demande d'adhésion a été refusée.",
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
 * Utilise la RPC native PostgreSQL SECURITY DEFINER `admin_update_membership_request`.
 * Ne tente AUCUN update direct risqué sur la table sans passer par la RPC.
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

    // 2. Validation stricte de la session et du rôle ADMIN côté serveur
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

    const role = (user.app_metadata?.role || "").toUpperCase();
    if (role !== "ADMIN") {
      return {
        success: false,
        error: "Accès refusé. Privilèges administrateur requis.",
      };
    }

    const cleanNotes = typeof adminNotes === "string" ? adminNotes.trim() : null;

    // 3. Exécution exclusive via la RPC PostgreSQL native SECURITY DEFINER
    const { data: rpcData, error: rpcError } = await supabase.rpc("admin_update_membership_request", {
      p_request_id: requestId,
      p_plan_id: planId,
      p_commitment_type: commitmentType,
      p_admin_notes: cleanNotes,
    });

    if (rpcError) {
      console.error("[updateMembershipRequestServerAction] Erreur RPC :", rpcError);
      
      // Message d'erreur explicite et pédagogique si la fonction n'est pas encore créée en base Supabase
      const isMissingFunction =
        rpcError.message?.includes("function") ||
        rpcError.message?.includes("schema cache") ||
        rpcError.code === "42883" ||
        rpcError.code === "PGRST202";

      if (isMissingFunction) {
        return {
          success: false,
          error: "La fonction SQL admin_update_membership_request n'est pas disponible dans Supabase. La migration supabase/migrations/20260905_admin_update_membership_request.sql doit être exécutée dans le SQL Editor de Supabase.",
        };
      }

      return {
        success: false,
        error: rpcError.message || "Erreur lors de la modification de l'adhésion.",
      };
    }

    const res = rpcData as { success?: boolean; error?: string; message?: string };
    if (!res || res.success === false) {
      return {
        success: false,
        error: res?.message || res?.error || "La modification de la demande d'adhésion a échoué.",
      };
    }

    revalidatePath("/admin/adhesions");
    revalidatePath("/admin/abonnements");
    revalidatePath("/admin");

    return {
      success: true,
      message: res.message || "La demande d'adhésion a été modifiée avec succès.",
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
