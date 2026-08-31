import { SupabaseClient } from "@supabase/supabase-js";

export type MembershipRequestStatus = "pending" | "approved" | "rejected" | "cancelled";
export type CommitmentType = "monthly" | "annual";

export interface MembershipRequestItem {
  id: string;
  user_id: string;
  plan_id: string;
  status: MembershipRequestStatus;
  commitment_type: CommitmentType;
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
    type: string;
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
  } | null;
}

export interface MembershipPlanOption {
  id: string;
  name: string;
  code?: string | null;
  type: "private" | "small_group" | "collective" | string;
  commitment?: "monthly" | "annual" | string | null;
  price_cents: number;
  private_sessions_per_period?: number | null;
  allows_private: boolean;
  allows_small_group: boolean;
  allows_collective: boolean;
  is_active: boolean;
  display_order?: number | null;
}

export interface SubmitMembershipRequestPayload {
  planId: string;
  commitmentType: CommitmentType;
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
        member_notes,
        admin_notes,
        reviewed_by,
        reviewed_at,
        created_at,
        updated_at,
        plan:plans (
          id,
          name,
          type,
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
    const { data, error } = await supabase.rpc("submit_membership_request", {
      p_plan_id: payload.planId,
      p_commitment_type: payload.commitmentType,
      p_member_notes: payload.memberNotes || null,
    });

    if (error) {
      console.error("[submitMembershipRequest] Erreur RPC :", error);
      return { success: false, error: error.message };
    }

    const res = data as { success?: boolean; request_id?: string; error?: string; message?: string };
    if (res?.success === false) {
      return { success: false, error: res.message || res.error };
    }

    return {
      success: true,
      requestId: res?.request_id,
      message: res?.message || "Demande transmise avec succès.",
    };
  } catch (err) {
    console.error("[submitMembershipRequest] Exception :", err);
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
          type,
          price_cents,
          allows_private,
          allows_small_group,
          allows_collective
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[getAdminMembershipRequestsList] Erreur :", error);
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
