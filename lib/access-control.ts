/**
 * Module centralisé de gestion des droits d'accès aux cours du Striking Camp.
 *
 * Nouvelle grille tarifaire & règles métier officielles :
 * ─────────────────────────────────────────────────────────────────────────────
 * Formule              │ Accès Privé │ Accès Small Group │ Accès Collectif
 * ─────────────────────┼─────────────┼───────────────────┼────────────────
 * Cours Privé Mensuel  │     Oui     │        Oui        │      Oui
 * Cours Privé Annuel   │     Oui     │        Oui        │      Oui
 * Small Group Mensuel  │     Non     │        Oui        │      Oui
 * Small Group Annuel   │     Non     │        Oui        │      Oui
 * Collectif Mensuel    │     Non     │        Non        │      Oui
 * Collectif Annuel     │     Non     │        Non        │      Oui
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface PlanAccessRights {
  allowsPrivate: boolean;
  allowsSmallGroup: boolean;
  allowsCollective: boolean;
}

export interface PlanLike {
  id?: string;
  name?: string | null;
  type?: string | null;
  commitment?: string | null;
  allows_private?: boolean | null;
  allows_small_group?: boolean | null;
  allows_collective?: boolean | null;
}

export interface SubscriptionLike {
  id?: string;
  status?: string | null;
  started_at?: string | null;
  ends_at?: string | null;
  private_sessions_quota?: number | null;
  plan?: PlanLike | PlanLike[] | null;
}

export interface CumulativeMemberAccess {
  hasActiveSubscription: boolean;
  hasPrivateAccess: boolean;
  hasSmallGroupAccess: boolean;
  hasCollectiveAccess: boolean;
  privateSessionsQuota: number | null;
  activePlanNames: string[];
  validSubscriptionsCount: number;
}

/**
 * Calcule les droits d'accès d'une formule individuelle.
 * Priorise les flags explicites de la base de données (si définis),
 * sinon applique la matrice métier stricte basée sur (type, commitment).
 */
export function computePlanAccess(plan: PlanLike | null | undefined): PlanAccessRights {
  if (!plan) {
    return { allowsPrivate: false, allowsSmallGroup: false, allowsCollective: false };
  }

  // 1. Si les colonnes explicites sont déjà peuplées dans public.plans
  if (
    typeof plan.allows_private === "boolean" &&
    typeof plan.allows_small_group === "boolean" &&
    typeof plan.allows_collective === "boolean"
  ) {
    return {
      allowsPrivate: plan.allows_private,
      allowsSmallGroup: plan.allows_small_group,
      allowsCollective: plan.allows_collective,
    };
  }

  // 2. Évaluation de la matrice officielle sur (type, commitment)
  const rawType = (plan.type || "").toLowerCase().trim();
  const rawName = (plan.name || "").toLowerCase().trim();

  // Détection du type
  const isPrivate =
    rawType === "private" ||
    rawType === "prive" ||
    rawName.includes("privé") ||
    rawName.includes("prive");

  const isSmallGroup =
    rawType === "small_group" ||
    rawType === "smallgroup" ||
    rawName.includes("small group");

  const isCollective =
    rawType === "collective" ||
    rawType === "collectif" ||
    rawName.includes("collectif");

  if (isPrivate) {
    // Les formules Cours Privé (Mensuel & Annuel) donnent accès total : Privé + Small Group + Collectif
    return {
      allowsPrivate: true,
      allowsSmallGroup: true,
      allowsCollective: true,
    };
  }

  if (isSmallGroup) {
    return {
      allowsPrivate: false,
      allowsSmallGroup: true,
      allowsCollective: true,
    };
  }

  if (isCollective) {
    return {
      allowsPrivate: false,
      allowsSmallGroup: false,
      allowsCollective: true,
    };
  }

  // Par défaut (sécurisé)
  return {
    allowsPrivate: false,
    allowsSmallGroup: false,
    allowsCollective: false,
  };
}

/**
 * Vérifie si un abonnement est actif et non expiré à l'instant T.
 */
export function isSubscriptionValid(
  subscription: SubscriptionLike | null | undefined,
  now: Date = new Date()
): boolean {
  if (!subscription) return false;

  // Statut doit être 'active'
  const rawStatus = (subscription.status || "").toLowerCase().trim();
  if (rawStatus !== "active") return false;

  // Si une date de fin est définie, elle doit être >= now
  if (subscription.ends_at) {
    const endDate = new Date(subscription.ends_at);
    if (!isNaN(endDate.getTime()) && endDate.getTime() < now.getTime()) {
      return false;
    }
  }

  return true;
}

/**
 * Déballe un plan qui peut être un objet unique ou un tableau (retour de jointure Supabase)
 */
function unwrapPlan(planData: PlanLike | PlanLike[] | null | undefined): PlanLike | null {
  if (!planData) return null;
  if (Array.isArray(planData)) {
    return planData.length > 0 ? planData[0] : null;
  }
  return planData;
}

/**
 * Calcule les droits d'accès finaux d'un membre en CUMULANT tous ses abonnements actifs et valides.
 */
export function computeCumulativeAccess(
  subscriptions: SubscriptionLike[] | null | undefined,
  now: Date = new Date()
): CumulativeMemberAccess {
  if (!subscriptions || subscriptions.length === 0) {
    return {
      hasActiveSubscription: false,
      hasPrivateAccess: false,
      hasSmallGroupAccess: false,
      hasCollectiveAccess: false,
      privateSessionsQuota: null,
      activePlanNames: [],
      validSubscriptionsCount: 0,
    };
  }

  let hasPrivateAccess = false;
  let hasSmallGroupAccess = false;
  let hasCollectiveAccess = false;
  let totalQuota: number | null = null;
  const activePlanNames: string[] = [];
  let validCount = 0;

  for (const sub of subscriptions) {
    if (!isSubscriptionValid(sub, now)) {
      continue;
    }

    validCount++;
    const plan = unwrapPlan(sub.plan);
    const rights = computePlanAccess(plan);

    if (rights.allowsPrivate) hasPrivateAccess = true;
    if (rights.allowsSmallGroup) hasSmallGroupAccess = true;
    if (rights.allowsCollective) hasCollectiveAccess = true;

    if (plan?.name) {
      activePlanNames.push(plan.name.trim());
    }

    if (typeof sub.private_sessions_quota === "number" && sub.private_sessions_quota > 0) {
      totalQuota = (totalQuota || 0) + sub.private_sessions_quota;
    }
  }

  return {
    hasActiveSubscription: validCount > 0,
    hasPrivateAccess,
    hasSmallGroupAccess,
    hasCollectiveAccess,
    privateSessionsQuota: totalQuota,
    activePlanNames: Array.from(new Set(activePlanNames)),
    validSubscriptionsCount: validCount,
  };
}

export interface BillingCycle {
  cycleStart: Date;
  cycleEnd: Date;
}

/**
 * Calcule déterministement le cycle mensuel d'un abonnement basé sur subscriptions.started_at
 */
export function computeBillingCycle(
  startedAt: string | Date,
  now: Date = new Date()
): BillingCycle {
  const startDate = new Date(startedAt);
  if (isNaN(startDate.getTime())) {
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0);
    return { cycleStart: startOfCurrentMonth, cycleEnd: endOfCurrentMonth };
  }

  let monthsElapsed =
    (now.getFullYear() - startDate.getFullYear()) * 12 +
    (now.getMonth() - startDate.getMonth());

  let cycleStart = new Date(startDate);
  cycleStart.setMonth(cycleStart.getMonth() + monthsElapsed);

  if (cycleStart.getTime() > now.getTime()) {
    monthsElapsed -= 1;
    cycleStart = new Date(startDate);
    cycleStart.setMonth(cycleStart.getMonth() + monthsElapsed);
  }

  const cycleEnd = new Date(cycleStart);
  cycleEnd.setMonth(cycleEnd.getMonth() + 1);

  return { cycleStart, cycleEnd };
}

export interface PrivateBookingLike {
  id?: string;
  status?: string | null;
  is_late_cancellation?: boolean | null;
  starts_at?: string | null;
}

export interface PrivateQuotaBalance {
  quotaTotal: number;
  sessionsConsumed: number;
  sessionsRemaining: number;
  cycleStart: Date;
  cycleEnd: Date;
  hasActivePrivatePlan: boolean;
}

/**
 * Calcule le solde dynamique des cours privés pour le cycle en cours selon les règles métiers :
 * - Séances actives (confirmed) = CONSOMMÉ
 * - Annulations tardives (<24h, is_late_cancellation=true) = CONSOMMÉ
 * - Annulations normales (>=24h, is_late_cancellation=false) = NON CONSOMMÉ
 */
export function computePrivateQuotaBalance(
  quotaTotal: number,
  cycleStart: Date,
  cycleEnd: Date,
  bookings: PrivateBookingLike[],
  hasActivePrivatePlan: boolean = true
): PrivateQuotaBalance {
  if (!hasActivePrivatePlan) {
    return {
      quotaTotal: 0,
      sessionsConsumed: 0,
      sessionsRemaining: 0,
      cycleStart,
      cycleEnd,
      hasActivePrivatePlan: false,
    };
  }

  const startMs = cycleStart.getTime();
  const endMs = cycleEnd.getTime();

  let consumedCount = 0;

  for (const b of bookings) {
    if (!b.starts_at) continue;
    const sessionTime = new Date(b.starts_at).getTime();
    if (isNaN(sessionTime)) continue;

    if (sessionTime >= startMs && sessionTime < endMs) {
      const isConfirmed = b.status === "confirmed";
      const isLateCancelled = b.status === "cancelled" && b.is_late_cancellation === true;
      if (isConfirmed || isLateCancelled) {
        consumedCount++;
      }
    }
  }

  const remaining = Math.max(0, quotaTotal - consumedCount);

  return {
    quotaTotal,
    sessionsConsumed: consumedCount,
    sessionsRemaining: remaining,
    cycleStart,
    cycleEnd,
    hasActivePrivatePlan: true,
  };
}

