import { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "./client";

export type CreditPackStatus = "active" | "exhausted" | "expired" | "refunded";
export type CreditTransactionType =
  | "purchase"
  | "booking_debit"
  | "cancellation_refund"
  | "admin_adjustment"
  | "expiration";

export interface MemberSessionCreditPack {
  id: string;
  userId: string;
  planId: string;
  planName?: string;
  planCode?: string;
  totalCredits: number;
  remainingCredits: number;
  startsAt: string;
  expiresAt: string;
  status: CreditPackStatus;
  stripePaymentIntentId?: string | null;
  stripeCheckoutSessionId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SessionCreditTransactionItem {
  id: string;
  creditPackId: string;
  userId: string;
  bookingId?: string | null;
  delta: number;
  transactionType: CreditTransactionType;
  reason?: string | null;
  createdAt: string;
}

export interface MemberCreditsBalance {
  totalAvailableCredits: number;
  activePacksCount: number;
  packs: MemberSessionCreditPack[];
  hasUsableCredits: boolean;
  nextExpiringDate: string | null;
}

/**
 * Récupère l'ensemble des packs de crédits d'un membre avec détails de formule.
 */
export async function getMemberCreditPacks(
  supabase: SupabaseClient,
  userId: string
): Promise<MemberSessionCreditPack[]> {
  try {
    const { data, error } = await supabase
      .from("member_session_credits")
      .select(`
        id,
        user_id,
        plan_id,
        total_credits,
        remaining_credits,
        starts_at,
        expires_at,
        status,
        stripe_payment_intent_id,
        stripe_checkout_session_id,
        created_at,
        updated_at,
        plan:plans (
          id,
          name,
          code
        )
      `)
      .eq("user_id", userId)
      .order("expires_at", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      if (error.code === "PGRST205" || error.message?.includes("member_session_credits")) {
        // Table pas encore créée ou cache schema
        return [];
      }
      console.error("[getMemberCreditPacks] Erreur récupération :", error);
      return [];
    }

    if (!data) return [];

    const nowIso = new Date().toISOString();

    return data.map((item: any) => {
      const plan = Array.isArray(item.plan) ? item.plan[0] : item.plan;
      let effectiveStatus: CreditPackStatus = item.status as CreditPackStatus;

      // Détection automatique d'expiration
      if (effectiveStatus === "active" && item.expires_at < nowIso) {
        effectiveStatus = "expired";
      } else if (effectiveStatus === "active" && item.remaining_credits === 0) {
        effectiveStatus = "exhausted";
      }

      return {
        id: item.id,
        userId: item.user_id,
        planId: item.plan_id,
        planName: plan?.name || "Pack de séances",
        planCode: plan?.code || undefined,
        totalCredits: item.total_credits,
        remainingCredits: item.remaining_credits,
        startsAt: item.starts_at,
        expiresAt: item.expires_at,
        status: effectiveStatus,
        stripePaymentIntentId: item.stripe_payment_intent_id,
        stripeCheckoutSessionId: item.stripe_checkout_session_id,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      };
    });
  } catch (err) {
    console.error("[getMemberCreditPacks] Exception :", err);
    return [];
  }
}

/**
 * Calcule le solde cumulé de crédits utilisables d'un membre à l'instant T.
 */
export async function getMemberCreditsBalance(
  supabase: SupabaseClient,
  userId: string
): Promise<MemberCreditsBalance> {
  const packs = await getMemberCreditPacks(supabase, userId);
  const nowIso = new Date().toISOString();

  // Filtrer les packs actifs avec crédits restants et non expirés
  const usablePacks = packs.filter(
    (p) => p.status === "active" && p.remainingCredits > 0 && p.expiresAt >= nowIso
  );

  const totalAvailable = usablePacks.reduce((acc, p) => acc + p.remainingCredits, 0);

  const nextExpiring =
    usablePacks.length > 0
      ? usablePacks.sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime())[0].expiresAt
      : null;

  return {
    totalAvailableCredits: totalAvailable,
    activePacksCount: usablePacks.length,
    packs,
    hasUsableCredits: totalAvailable > 0,
    nextExpiringDate: nextExpiring,
  };
}

/**
 * Récupère l'historique des transactions d'un membre (grand livre d'audit).
 */
export async function getMemberCreditTransactions(
  supabase: SupabaseClient,
  userId: string
): Promise<SessionCreditTransactionItem[]> {
  try {
    const { data, error } = await supabase
      .from("session_credit_transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      if (error.code === "PGRST205") return [];
      console.error("[getMemberCreditTransactions] Erreur :", error);
      return [];
    }

    return (data || []).map((t: any) => ({
      id: t.id,
      creditPackId: t.credit_pack_id,
      userId: t.user_id,
      bookingId: t.booking_id,
      delta: t.delta,
      transactionType: t.transaction_type,
      reason: t.reason,
      createdAt: t.created_at,
    }));
  } catch (err) {
    console.error("[getMemberCreditTransactions] Exception :", err);
    return [];
  }
}

/**
 * Ajuste manuellement les crédits d'un membre (Action Administrateur avec audit obligatoire).
 */
export async function adminAdjustCredits(
  arg1: SupabaseClient | string,
  arg2: string | number,
  arg3: number | string,
  arg4?: string
): Promise<{ success: boolean; error?: string; message?: string; data?: { remaining_credits?: number } }> {
  try {
    let supabase: SupabaseClient;
    let creditPackId: string;
    let delta: number;
    let reason: string;

    if (typeof arg1 === "string") {
      supabase = createClient();
      creditPackId = arg1;
      delta = Number(arg2);
      reason = String(arg3);
    } else {
      supabase = arg1;
      creditPackId = String(arg2);
      delta = Number(arg3);
      reason = String(arg4 || "");
    }

    const { data, error } = await supabase.rpc("admin_adjust_member_credits", {
      p_credit_pack_id: creditPackId,
      p_delta: delta,
      p_reason: reason,
    });

    if (error) {
      console.error("[adminAdjustCredits] Erreur RPC :", error);
      return { success: false, error: error.message };
    }

    if (data && typeof data === "object") {
      const res = data as Record<string, unknown>;
      if (res.success === false) {
        return { success: false, error: (res.message as string) || (res.error as string) };
      }
      return {
        success: true,
        message: (res.message as string) || "Crédits ajustés avec succès.",
        data: {
          remaining_credits: typeof res.remaining_credits === "number" ? res.remaining_credits : undefined,
        },
      };
    }

    return { success: false, error: "Réponse inattendue du serveur." };
  } catch (err: any) {
    console.error("[adminAdjustCredits] Exception :", err);
    return { success: false, error: err.message || "Erreur inconnue." };
  }
}
