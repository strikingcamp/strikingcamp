import { SupabaseClient } from "@supabase/supabase-js";

export type MembershipRequestStatus = "pending" | "approved" | "rejected" | "cancelled";
export type CommitmentType = "monthly" | "annual";

export interface MembershipRequestItem {
  id: string;
  user_id: string;
  plan_id: string;
  status: MembershipRequestStatus;
  commitment_type: CommitmentType;
  selected_discipline?: string | null;
  member_notes?: string | null;
  admin_notes?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
  // Jointures enrichies
  plan?: {
    id: string;
    name: string;
    code?: string | null;
    type: string;
    tier?: string | null;
    price_cents: number;
    allows_private: boolean;
    allows_small_group: boolean;
    allows_collective: boolean;
  } | null;
  profile?: {
    id: string;
    first_name: string;
    last_name: string;
    phone?: string | null;
    birth_date?: string | null;
  } | null;
}

export interface MembershipPlanOption {
  id: string;
  name: string;
  code?: string | null;
  type: "private" | "small_group" | string;
  tier?: string | null;
  commitment?: "monthly" | "annual" | string | null;
  price_cents: number;
  private_sessions_per_period?: number | null;
  allows_private: boolean;
  allows_small_group: boolean;
  allows_collective?: boolean;
  is_active: boolean;
  display_order?: number | null;
}

export interface SubmitMembershipRequestPayload {
  planId: string;
  commitmentType: CommitmentType;
  selectedDiscipline?: string;
  birthDate?: string;
  memberNotes?: string;
}

/**
 * Récupère la dernière demande d'adhésion du membre connecté
 */
export async function getMyLatestMembershipRequest(
  supabase: SupabaseClient
): Promise<MembershipRequestItem | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data, error } = await supabase
      .from("membership_requests")
      .select(`
        id,
        user_id,
        plan_id,
        status,
        commitment_type,
        selected_discipline,
        member_notes,
        admin_notes,
        reviewed_by,
        reviewed_at,
        created_at,
        updated_at,
        plan:plans (
          id,
          name,
          code,
          type,
          tier,
          price_cents,
          allows_private,
          allows_small_group,
          allows_collective
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[getMyLatestMembershipRequest] Erreur :", error);
      return null;
    }

    if (!data) return null;

    return {
      ...data,
      plan: Array.isArray(data.plan) ? data.plan[0] : data.plan,
    } as MembershipRequestItem;
  } catch (err) {
    console.error("[getMyLatestMembershipRequest] Exception :", err);
    return null;
  }
}

/**
 * Récupère la demande de pack en attente (pending) du membre connecté s'il y en a une
 */
export async function getMyPendingPackRequest(
  supabase: SupabaseClient
): Promise<MembershipRequestItem | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data, error } = await supabase
      .from("membership_requests")
      .select(`
        id,
        user_id,
        plan_id,
        status,
        commitment_type,
        selected_discipline,
        member_notes,
        admin_notes,
        reviewed_by,
        reviewed_at,
        created_at,
        updated_at,
        plan:plans (
          id,
          name,
          code,
          type,
          tier,
          price_cents,
          allows_private,
          allows_small_group,
          allows_collective
        )
      `)
      .eq("user_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[getMyPendingPackRequest] Erreur :", error);
      return null;
    }

    if (!data || data.length === 0) return null;

    // Trouver une demande dont le plan est un pack de crédits ou une offre découverte
    const packReq = data.find((r) => {
      const p = Array.isArray(r.plan) ? r.plan[0] : r.plan;
      return (
        p?.tier === "credit_pack" ||
        p?.tier === "discovery_pass" ||
        p?.code === "discovery_monthly" ||
        p?.code?.startsWith("decouverte")
      );
    });

    if (!packReq) return null;

    return {
      ...packReq,
      plan: Array.isArray(packReq.plan) ? packReq.plan[0] : packReq.plan,
    } as MembershipRequestItem;
  } catch (err) {
    console.error("[getMyPendingPackRequest] Exception :", err);
    return null;
  }
}

/**
 * Récupère la liste des formules actives disponibles à l'adhésion
 */
export async function getAvailablePlansForMembership(
  supabase: SupabaseClient
): Promise<MembershipPlanOption[]> {
  try {
    const { data, error } = await supabase
      .from("plans")
      .select(`
        id,
        name,
        code,
        type,
        tier,
        commitment,
        price_cents,
        private_sessions_per_period,
        allows_private,
        allows_small_group,
        allows_collective,
        is_active,
        display_order
      `)
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (error) {
      console.error("[getAvailablePlansForMembership] Erreur :", error);
      return [];
    }

    return (data || []) as MembershipPlanOption[];
  } catch (err) {
    console.error("[getAvailablePlansForMembership] Exception :", err);
    return [];
  }
}

/**
 * Soumet une nouvelle demande d'adhésion via la RPC sécurisée submit_membership_request
 */
export async function submitMembershipRequest(
  supabase: SupabaseClient,
  payload: SubmitMembershipRequestPayload
): Promise<{ success: boolean; requestId?: string; error?: string; message?: string }> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user && payload.birthDate) {
      // Sauvegarder la date de naissance sur le profil
      await supabase
        .from("profiles")
        .update({ birth_date: payload.birthDate })
        .eq("id", user.id);
    }

    const { data, error } = await supabase.rpc("submit_membership_request", {
      p_plan_id: payload.planId,
      p_commitment_type: payload.commitmentType,
      p_member_notes: payload.memberNotes || null,
      p_selected_discipline: payload.selectedDiscipline || null,
    });

    if (error) {
      console.error("[submitMembershipRequest] Erreur RPC :", error);
      return { success: false, error: error.message };
    }

    const res = data as { success?: boolean; request_id?: string; error?: string; message?: string };
    if (res?.success === false) {
      return { success: false, error: res.message || res.error };
    }

    const requestId = res?.request_id;

    return {
      success: true,
      requestId,
      message: res?.message || "Demande transmise avec succès.",
    };
  } catch (err) {
    console.error("[submitMembershipRequest] Exception :", err);
    return { success: false, error: (err as Error).message };
  }
}

export interface UpdateMyPendingMembershipRequestPayload {
  requestId: string;
  planId: string;
  commitmentType: CommitmentType;
  selectedDiscipline?: string;
  memberNotes?: string;
}

/**
 * Permet au membre connecté de modifier sa demande d'adhésion en attente (pending)
 * sans créer de doublon.
 */
export async function updateMyPendingMembershipRequest(
  supabase: SupabaseClient,
  payload: UpdateMyPendingMembershipRequestPayload
): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    const { data, error } = await supabase.rpc("update_my_pending_membership_request", {
      p_request_id: payload.requestId,
      p_plan_id: payload.planId,
      p_commitment_type: payload.commitmentType,
      p_selected_discipline: payload.selectedDiscipline || null,
      p_member_notes: payload.memberNotes || null,
    });

    if (error) {
      console.error("[updateMyPendingMembershipRequest] Erreur RPC :", error);
      return { success: false, error: error.message };
    }

    const res = data as { success?: boolean; error?: string; message?: string };
    if (res?.success === false) {
      return { success: false, error: res.message || res.error };
    }

    return {
      success: true,
      message: res?.message || "Demande mise à jour avec succès.",
    };
  } catch (err) {
    console.error("[updateMyPendingMembershipRequest] Exception :", err);
    return { success: false, error: (err as Error).message };
  }
}


export interface PackEligibilityResult {
  isEligible: boolean;
  reason?: string;
  alreadyUsed: boolean;
  hasPending: boolean;
  isDiscovery: boolean;
}

/**
 * Vérifie l'éligibilité d'un membre pour l'achat ou la demande d'un pack de séances.
 * Règles métier strictes :
 * - decouverte_1 : achetable 1 seule fois par membre à vie.
 * - decouverte_3 : achetable 1 seule fois par membre à vie.
 *   (Droit consommé dès qu'une demande existe ou a existé, ou si un member_session_credits existe)
 *   (Un pack découverte expiré ou épuisé ne redevient jamais éligible)
 * - pack_10_small_group : achetable plusieurs fois sans restriction à vie.
 */
export async function checkMemberPackEligibility(
  supabase: SupabaseClient,
  userId: string,
  planCode: string
): Promise<PackEligibilityResult> {
  const isDiscovery =
    planCode === "decouverte_1" ||
    planCode === "decouverte_3";

  // Récupérer la formule correspondante
  const { data: plan, error: planErr } = await supabase
    .from("plans")
    .select("id, name, code, tier")
    .eq("code", planCode)
    .single();

  if (planErr || !plan) {
    return {
      isEligible: false,
      reason: "Formule ou pack introuvable.",
      alreadyUsed: false,
      hasPending: false,
      isDiscovery,
    };
  }

  // 1. Vérifier si un enregistrement existe dans member_session_credits pour cet utilisateur et ce plan
  const { data: existingCredits } = await supabase
    .from("member_session_credits")
    .select("id, status")
    .eq("user_id", userId)
    .eq("plan_id", plan.id);

  const hasCreditsRecord = Boolean(existingCredits && existingCredits.length > 0);

  // 2. Vérifier si un enregistrement existe dans subscriptions pour cet utilisateur et ce plan
  const { data: existingSubs } = await supabase
    .from("subscriptions")
    .select("id, status")
    .eq("user_id", userId)
    .eq("plan_id", plan.id);

  const hasSubsRecord = Boolean(existingSubs && existingSubs.length > 0);

  // 3. Vérifier les demandes existantes dans membership_requests pour cet utilisateur et ce plan
  const { data: existingRequests } = await supabase
    .from("membership_requests")
    .select("id, status")
    .eq("user_id", userId)
    .eq("plan_id", plan.id);

  const requests = existingRequests || [];
  const hasPending = requests.some((r) => r.status === "pending");
  const hasAnyRequest = requests.length > 0;

  if (isDiscovery) {
    // Si le membre a déjà une demande (pending, approved, rejected, etc.) OU a déjà eu un pack de crédits ou un pass actif/expiré
    if (hasCreditsRecord || hasSubsRecord || hasAnyRequest) {
      return {
        isEligible: false,
        reason: "Offre découverte déjà utilisée",
        alreadyUsed: true,
        hasPending,
        isDiscovery: true,
      };
    }

    return {
      isEligible: true,
      alreadyUsed: false,
      hasPending: false,
      isDiscovery: true,
    };
  }

  // Pour pack_10_small_group et discovery_monthly (répétables / renouvelables) :
  if (hasPending) {
    return {
      isEligible: false,
      reason: "Une demande pour cette formule est déjà en cours de validation.",
      alreadyUsed: false,
      hasPending: true,
      isDiscovery: false,
    };
  }

  return {
    isEligible: true,
    alreadyUsed: false,
    hasPending: false,
    isDiscovery: false,
  };
}

/**
 * Récupère le statut d'éligibilité pour l'ensemble des offres découverte & packs disponibles
 */
export async function getMemberPacksEligibilityMap(
  supabase: SupabaseClient
): Promise<Record<string, PackEligibilityResult>> {
  const result: Record<string, PackEligibilityResult> = {
    decouverte_1: { isEligible: true, alreadyUsed: false, hasPending: false, isDiscovery: true },
    discovery_monthly: { isEligible: true, alreadyUsed: false, hasPending: false, isDiscovery: false },
    decouverte_3: { isEligible: true, alreadyUsed: false, hasPending: false, isDiscovery: true },
    pack_10_small_group: { isEligible: true, alreadyUsed: false, hasPending: false, isDiscovery: false },
  };

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return result;

    const [e1, eMonthly, e3, e10] = await Promise.all([
      checkMemberPackEligibility(supabase, user.id, "decouverte_1"),
      checkMemberPackEligibility(supabase, user.id, "discovery_monthly"),
      checkMemberPackEligibility(supabase, user.id, "decouverte_3"),
      checkMemberPackEligibility(supabase, user.id, "pack_10_small_group"),
    ]);

    result.decouverte_1 = e1;
    result.discovery_monthly = eMonthly;
    result.decouverte_3 = e3;
    result.pack_10_small_group = e10;
  } catch (err) {
    console.error("[getMemberPacksEligibilityMap] Exception :", err);
  }

  return result;
}

export interface SubmitPackRequestPayload {
  planCode: string;
  memberNotes?: string;
}

/**
 * Soumet une demande d'offre découverte ou de pack Small Group (mode confirmation sans Stripe)
 * avec validation serveur stricte d'éligibilité unique à vie pour les offres découverte.
 */
export async function submitPackRequest(
  supabase: SupabaseClient,
  payload: SubmitPackRequestPayload
): Promise<{ success: boolean; requestId?: string; error?: string; message?: string }> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: "Veuillez vous connecter pour faire une demande d'offre découverte.",
      };
    }

    // Récupération de la formule
    const { data: plan, error: planErr } = await supabase
      .from("plans")
      .select("id, name, code, tier, price_cents")
      .eq("code", payload.planCode)
      .single();

    if (planErr || !plan) {
      return { success: false, error: "Offre découverte introuvable." };
    }

    // Vérification de l'éligibilité stricte côté serveur
    const eligibility = await checkMemberPackEligibility(supabase, user.id, payload.planCode);
    if (!eligibility.isEligible) {
      if (eligibility.alreadyUsed) {
        return {
          success: false,
          error: `Offre découverte déjà utilisée : vous avez déjà souscrit ou demandé le ${plan.name}. Les offres découverte sont strictement limitées à une seule fois par membre à vie.`,
        };
      }
      return {
        success: false,
        error: eligibility.reason || "Vous n'êtes pas éligible à cette offre.",
      };
    }

    // Insertion directe de la demande dans public.membership_requests
    const { data: newReq, error: reqErr } = await supabase
      .from("membership_requests")
      .insert({
        user_id: user.id,
        plan_id: plan.id,
        commitment_type: "monthly",
        status: "pending",
        member_notes: payload.memberNotes?.trim() || null,
      })
      .select("id")
      .single();

    if (reqErr || !newReq) {
      console.error("[submitPackRequest] Erreur insertion :", reqErr);
      return { success: false, error: reqErr?.message || "Erreur lors de l'enregistrement de la demande." };
    }

    const isMonthlyUnlimited = payload.planCode === "discovery_monthly" || plan.tier === "adult_monthly" || plan.tier === "discovery_pass";
    const successMsg = isMonthlyUnlimited
      ? `Votre demande pour la formule ${plan.name} a été transmise avec succès. Dès validation par l'équipe, votre accès de 30 jours sera activé ou prolongé.`
      : `Votre demande pour le ${plan.name} a été transmise avec succès. Dès validation par l'équipe, vos crédits seront disponibles.`;

    return {
      success: true,
      requestId: newReq.id,
      message: successMsg,
    };
  } catch (err) {
    console.error("[submitPackRequest] Exception :", err);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Récupère l'ensemble des demandes d'adhésion pour la vue d'administration
 */
export async function getAdminMembershipRequestsList(
  supabase: SupabaseClient
): Promise<MembershipRequestItem[]> {
  try {
    const { data, error } = await supabase
      .from("membership_requests")
      .select(`
        id,
        user_id,
        plan_id,
        status,
        commitment_type,
        selected_discipline,
        member_notes,
        admin_notes,
        reviewed_by,
        reviewed_at,
        created_at,
        updated_at,
        profile:profiles!membership_requests_user_id_fkey (
          id,
          first_name,
          last_name,
          phone
        ),
        plan:plans (
          id,
          name,
          code,
          type,
          tier,
          price_cents,
          allows_private,
          allows_small_group,
          allows_collective
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[getAdminMembershipRequestsList]", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      return [];
    }

    return (data || []).map((item) => ({
      ...item,
      profile: Array.isArray(item.profile) ? item.profile[0] : item.profile,
      plan: Array.isArray(item.plan) ? item.plan[0] : item.plan,
    })) as MembershipRequestItem[];
  } catch (err) {
    console.error("[getAdminMembershipRequestsList] Exception :", err);
    return [];
  }
}

/**
 * Valide une demande d'adhésion côté administrateur via la RPC admin_approve_membership_request
 */
export async function adminApproveMembershipRequest(
  supabase: SupabaseClient,
  requestId: string,
  adminNotes?: string
): Promise<{ success: boolean; subscriptionId?: string; error?: string; message?: string }> {
  try {
    const { data, error } = await supabase.rpc("admin_approve_membership_request", {
      p_request_id: requestId,
      p_admin_notes: adminNotes || null,
    });

    if (error) {
      console.error("[adminApproveMembershipRequest] Erreur RPC :", error);
      return { success: false, error: error.message };
    }

    const res = data as { success?: boolean; subscription_id?: string; error?: string; message?: string };
    if (res?.success === false) {
      return { success: false, error: res.message || res.error };
    }

    return {
      success: true,
      subscriptionId: res?.subscription_id,
      message: res?.message || "Demande validée et abonnement actif créé.",
    };
  } catch (err) {
    console.error("[adminApproveMembershipRequest] Exception :", err);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Refuse une demande d'adhésion côté administrateur via la RPC admin_reject_membership_request
 */
export async function adminRejectMembershipRequest(
  supabase: SupabaseClient,
  requestId: string,
  adminNotes?: string
): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    const { data, error } = await supabase.rpc("admin_reject_membership_request", {
      p_request_id: requestId,
      p_admin_notes: adminNotes || null,
    });

    if (error) {
      console.error("[adminRejectMembershipRequest] Erreur RPC :", error);
      return { success: false, error: error.message };
    }

    const res = data as { success?: boolean; error?: string; message?: string };
    if (res?.success === false) {
      return { success: false, error: res.message || res.error };
    }

    return {
      success: true,
      message: res?.message || "La demande a été refusée.",
    };
  } catch (err) {
    console.error("[adminRejectMembershipRequest] Exception :", err);
    return { success: false, error: (err as Error).message };
  }
}
