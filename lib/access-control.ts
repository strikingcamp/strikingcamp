/**
 * Module centralisé de gestion des droits d'accès aux cours du Striking Camp.
 *
 * Grille tarifaire & règles métier officielles :
 * ─────────────────────────────────────────────────────────────
 * Formule              │ Accès Privé │ Accès Small Group
 * ─────────────────────┼─────────────┼───────────────────
 * Cours Privé Mensuel  │     Oui     │        Oui
 * Cours Privé Annuel   │     Oui     │        Oui
 * Small Group Mensuel  │     Non     │        Oui
 * Small Group Annuel   │     Non     │        Oui
 * ─────────────────────────────────────────────────────────────
 */

export type PlanningCategory = "cours_adulte" | "lady_striking" | "kid_boxing";
export type TargetAgeGroup = "all" | "5_8" | "9_13";

/**
 * Catégorisation unifiée des créneaux dans toute l'application :
 * - "Lady Striking" -> "lady_striking"
 * - "Kid Boxing" -> "kid_boxing"
 * - Autres disciplines -> "cours_adulte"
 */
export function getDisciplinePlanningCategory(
  discipline?: string | null,
  explicitCategory?: string | null
): "cours_adulte" | "lady_striking" | "kid_boxing" {
  if (explicitCategory === "lady_striking" || explicitCategory === "kid_boxing" || explicitCategory === "cours_adulte") {
    return explicitCategory;
  }
  const disc = (discipline || "").toLowerCase().trim();
  if (disc.includes("lady")) return "lady_striking";
  if (disc.includes("kid")) return "kid_boxing";
  return "cours_adulte";
}

/**
 * Déduction unifiée du groupe d'âge :
 * - 5–8 ans -> "5_8"
 * - 9–13 ans -> "9_13"
 * - Par défaut -> "all"
 */
export function getTargetAgeGroup(
  level?: string | null,
  explicitAgeGroup?: string | null
): "all" | "5_8" | "9_13" {
  if (explicitAgeGroup === "5_8" || explicitAgeGroup === "9_13" || explicitAgeGroup === "all") {
    return explicitAgeGroup;
  }
  const lvl = (level || "").toLowerCase();
  if (lvl.includes("5-8") || lvl.includes("5_8") || lvl.includes("5–8")) return "5_8";
  if (lvl.includes("9-13") || lvl.includes("9_13") || lvl.includes("9–13")) return "9_13";
  return "all";
}

export interface PlanAccessRights {
  allowsPrivate: boolean;
  allowsSmallGroup: boolean;
  isEssential: boolean;
  isAllAccess: boolean;
  isLadyStriking: boolean;
  isKidBoxing: boolean;
  allowedCategory: PlanningCategory | "all";
}

export interface PlanLike {
  id?: string;
  code?: string | null;
  name?: string | null;
  type?: string | null;
  commitment?: string | null;
  allows_private?: boolean | null;
  allows_small_group?: boolean | null;
  allows_collective?: boolean | null;
  is_digital_plan?: boolean | null;
  tier?: string | null;
  entitlements?: Record<string, boolean> | null;
}

export interface SubscriptionLike {
  id?: string;
  status?: string | null;
  started_at?: string | null;
  ends_at?: string | null;
  private_sessions_quota?: number | null;
  selected_discipline?: string | null;
  plan?: PlanLike | PlanLike[] | null;
}

export interface CumulativeMemberAccess {
  hasActiveSubscription: boolean;
  hasPrivateAccess: boolean;
  hasSmallGroupAccess: boolean;
  isEssential: boolean;
  isAllAccess: boolean;
  isLadyStriking: boolean;
  isKidBoxing: boolean;
  selectedDiscipline?: string | null;
  privateSessionsQuota: number | null;
  activePlanNames: string[];
  activePlanCodes: string[];
  validSubscriptionsCount: number;
  availableCredits?: number;
  hasCreditAccess?: boolean;
}

/**
 * Calcule les droits d'accès d'une formule individuelle selon le catalogue STRIKING CAMP.
 */
export function computePlanAccess(plan: PlanLike | null | undefined): PlanAccessRights {
  if (!plan || plan.is_digital_plan === true || plan.tier === "premium_digital") {
    return {
      allowsPrivate: false,
      allowsSmallGroup: false,
      isEssential: false,
      isAllAccess: false,
      isLadyStriking: false,
      isKidBoxing: false,
      allowedCategory: "all",
    };
  }

  const code = (plan.code || "").toLowerCase().trim();
  const rawType = (plan.type || "").toLowerCase().trim();
  const rawName = (plan.name || "").toLowerCase().trim();

  const isEssential = code === "adult_essential" || rawName.includes("essentiel");
  const isAllAccess =
    code === "adult_all_access" ||
    code === "discovery_monthly" ||
    code === "decouverte_1_mois" ||
    code === "col_annual" ||
    code === "sg_annual" ||
    rawName.includes("all access") ||
    rawName.includes("1 mois découverte") ||
    rawName.includes("1 mois decouverte") ||
    plan.tier === "discovery_pass";
  const isLadyStriking = code === "lady_striking_annual" || rawName.includes("lady");
  const isKidBoxing = code === "kid_boxing_season" || rawName.includes("kid");

  const isPrivate =
    rawType === "private" ||
    rawType === "prive" ||
    code.startsWith("priv_") ||
    rawName.includes("privé") ||
    rawName.includes("prive");

  const allowsSmallGroup =
    plan.allows_small_group === true ||
    isEssential ||
    isAllAccess ||
    isLadyStriking ||
    isKidBoxing ||
    isPrivate;

  const allowsPrivate = plan.allows_private === true || isPrivate;

  let allowedCategory: PlanningCategory | "all" = "all";
  if (isLadyStriking) allowedCategory = "lady_striking";
  else if (isKidBoxing) allowedCategory = "kid_boxing";
  else if (isEssential || isAllAccess) allowedCategory = "cours_adulte";

  return {
    allowsPrivate,
    allowsSmallGroup,
    isEssential,
    isAllAccess,
    isLadyStriking,
    isKidBoxing,
    allowedCategory,
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

  const rawStatus = (subscription.status || "").toLowerCase().trim();
  if (rawStatus !== "active" && rawStatus !== "trialing") return false;

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
      isEssential: false,
      isAllAccess: false,
      isLadyStriking: false,
      isKidBoxing: false,
      selectedDiscipline: null,
      privateSessionsQuota: null,
      activePlanNames: [],
      activePlanCodes: [],
      validSubscriptionsCount: 0,
    };
  }

  let hasPrivateAccess = false;
  let hasSmallGroupAccess = false;
  let isEssential = false;
  let isAllAccess = false;
  let isLadyStriking = false;
  let isKidBoxing = false;
  let selectedDiscipline: string | null = null;
  let totalQuota: number | null = null;
  const activePlanNames: string[] = [];
  const activePlanCodes: string[] = [];
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
    if (rights.isEssential) {
      isEssential = true;
      if (sub.selected_discipline) {
        selectedDiscipline = sub.selected_discipline;
      }
    }
    if (rights.isAllAccess) isAllAccess = true;
    if (rights.isLadyStriking) isLadyStriking = true;
    if (rights.isKidBoxing) isKidBoxing = true;

    if (plan?.name) {
      activePlanNames.push(plan.name.trim());
    }
    if (plan?.code) {
      activePlanCodes.push(plan.code.trim());
    }

    if (typeof sub.private_sessions_quota === "number" && sub.private_sessions_quota > 0) {
      totalQuota = (totalQuota || 0) + sub.private_sessions_quota;
    }
  }

  return {
    hasActiveSubscription: validCount > 0,
    hasPrivateAccess,
    hasSmallGroupAccess,
    isEssential,
    isAllAccess,
    isLadyStriking,
    isKidBoxing,
    selectedDiscipline,
    privateSessionsQuota: totalQuota,
    activePlanNames: Array.from(new Set(activePlanNames)),
    activePlanCodes: Array.from(new Set(activePlanCodes)),
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

export interface WeeklyBookingsStatus {
  weekStart: Date;
  weekEnd: Date;
  confirmedCount: number;
  isLimitReached: boolean;
}

/**
 * Calcule le nombre de réservations confirmées dans la semaine calendaire (Lundi 00h -> Dimanche 23h59 Europe/Paris)
 * pour un créneau cible donné.
 */
export function computeWeeklySessionCount(
  bookings: { starts_at?: string | null; status?: string | null }[],
  targetDate: Date | string = new Date()
): WeeklyBookingsStatus {
  const target = typeof targetDate === "string" ? new Date(targetDate) : targetDate;

  // Date en heure locale ou Europe/Paris
  const d = new Date(target.getTime());
  const day = d.getDay(); // 0 = Dimanche, 1 = Lundi, ...
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sundayEnd = new Date(monday);
  sundayEnd.setDate(monday.getDate() + 7);

  const startMs = monday.getTime();
  const endMs = sundayEnd.getTime();

  let count = 0;
  for (const b of bookings) {
    if (b.status !== "confirmed" || !b.starts_at) continue;
    const bTime = new Date(b.starts_at).getTime();
    if (!isNaN(bTime) && bTime >= startMs && bTime < endMs) {
      count++;
    }
  }

  return {
    weekStart: monday,
    weekEnd: sundayEnd,
    confirmedCount: count,
    isLimitReached: count >= 3,
  };
}

export interface SessionEligibilityResult {
  isEligible: boolean;
  reason?: string;
  isUsingCredit?: boolean;
}

/**
 * Valide si un membre peut réserver une séance collective selon sa formule ou ses crédits disponibles.
 */
export function checkSessionEligibility(
  access: CumulativeMemberAccess,
  session: {
    discipline: string;
    category?: string | null;
    target_age_group?: string | null;
    starts_at: string;
  },
  userBirthDate?: string | null,
  weeklyBookings: { starts_at?: string | null; status?: string | null }[] = []
): SessionEligibilityResult {
  // 1. Priorité absolue aux abonnements actifs
  if (access.hasActiveSubscription) {
    const category = (session.category || "").toLowerCase();
    const disc = session.discipline.toLowerCase().trim();

    // Formule Adulte Essentiel
    if (access.isEssential) {
      if (category && category !== "cours_adulte" && category !== "small_group") {
        return {
          isEligible: false,
          reason: "Votre formule Essentiel ne donne pas accès à cette catégorie.",
        };
      }
      const chosen = (access.selectedDiscipline || "").toLowerCase().trim();
      if (!chosen) {
        return {
          isEligible: false,
          reason: "Veuillez sélectionner votre discipline dans votre espace adhésion.",
        };
      }
      if (disc !== chosen && !disc.includes(chosen) && !chosen.includes(disc)) {
        return {
          isEligible: false,
          reason: `Votre formule Essentiel est restreinte à la discipline ${access.selectedDiscipline}.`,
        };
      }

      const weekly = computeWeeklySessionCount(weeklyBookings, session.starts_at);
      if (weekly.isLimitReached) {
        return {
          isEligible: false,
          reason: "Limite de 3 séances par semaine atteinte pour votre formule Essentiel.",
        };
      }

      return { isEligible: true, isUsingCredit: false };
    }

    // Formule Adulte All Access (ou formules privées avec small group)
    if (access.isAllAccess || access.hasPrivateAccess) {
      if (category === "lady_striking" || disc.includes("lady")) {
        return {
          isEligible: false,
          reason: "Votre formule ne donne pas accès aux cours Lady Striking.",
        };
      }
      if (category === "kid_boxing" || disc.includes("kid")) {
        return {
          isEligible: false,
          reason: "Votre formule ne donne pas accès aux cours Kid Boxing.",
        };
      }
      return { isEligible: true, isUsingCredit: false };
    }

    // Formule Lady Striking
    if (access.isLadyStriking) {
      if (category === "lady_striking" || disc.includes("lady")) {
        return { isEligible: true, isUsingCredit: false };
      }
      return {
        isEligible: false,
        reason: "Votre formule Lady Striking donne accès exclusivement aux cours Lady Striking.",
      };
    }

    // Formule Kid Boxing
    if (access.isKidBoxing) {
      if (category !== "kid_boxing" && !disc.includes("kid")) {
        return {
          isEligible: false,
          reason: "Votre formule Kid Boxing donne accès exclusivement aux cours Kid Boxing.",
        };
      }
      if (userBirthDate) {
        const birth = new Date(userBirthDate);
        const sessionDate = new Date(session.starts_at);
        if (!isNaN(birth.getTime()) && !isNaN(sessionDate.getTime())) {
          let age = sessionDate.getFullYear() - birth.getFullYear();
          const m = sessionDate.getMonth() - birth.getMonth();
          if (m < 0 || (m === 0 && sessionDate.getDate() < birth.getDate())) {
            age--;
          }
          const ageGroup = session.target_age_group;
          if (ageGroup === "5_8" && (age < 5 || age > 8)) {
            return {
              isEligible: false,
              reason: `Ce créneau est réservé aux enfants de 5 à 8 ans (âge actuel : ${age} ans).`,
            };
          }
          if (ageGroup === "9_13" && (age < 9 || age > 13)) {
            return {
              isEligible: false,
              reason: `Ce créneau est réservé aux enfants de 9 à 13 ans (âge actuel : ${age} ans).`,
            };
          }
        }
      }
      return { isEligible: true, isUsingCredit: false };
    }

    // Par défaut avec accès Small Group
    if (access.hasSmallGroupAccess) {
      return { isEligible: true, isUsingCredit: false };
    }
  }

  // 2. Si aucun abonnement couvrant, vérification des packs de crédits
  if (typeof access.availableCredits === "number" && access.availableCredits > 0) {
    return {
      isEligible: true,
      isUsingCredit: true,
    };
  }

  return {
    isEligible: false,
    reason: "Aucun abonnement actif ni crédit disponible. Veuillez souscrire à une formule ou acheter un pack de séances.",
  };
}

/**
 * Calcule les entitlements numériques (Programmes V1, Séances digitales, KB SHRED, Nutrition)
 * d'un membre à partir de ses abonnements actifs selon la règle officielle STRIKING CAMP :
 *
 * 1. COURS PRIVÉS (allowsPrivate = true) -> Accès COMPLET aux programmes V1 & digital
 * 2. ALL ACCESS (isAllAccess = true) -> Accès COMPLET aux programmes V1 & digital
 * 3. AUTRES PROFILS (Essentiel, Lady Striking, Kid Boxing, sans abo) -> Accès digital désactivé
 */
export interface MemberDigitalEntitlementsResult {
  tier: "free" | "premium_digital" | "premium_club";
  hasActiveSubscription: boolean;
  hasPhysicalAccess: boolean;
  canAccessNutritionEngine: boolean;
  canLogFoodJournal: boolean;
  canAccessAllRecipes: boolean;
  canAccessDigitalPrograms: boolean;
  canAccessKBShredDigital: boolean;
  canAccessAdvancedStats: boolean;
}

export function computeMemberDigitalEntitlements(
  subscriptions: SubscriptionLike[] | null | undefined
): MemberDigitalEntitlementsResult {
  const result: MemberDigitalEntitlementsResult = {
    tier: "free",
    hasActiveSubscription: false,
    hasPhysicalAccess: false,
    canAccessNutritionEngine: false,
    canLogFoodJournal: false,
    canAccessAllRecipes: false,
    canAccessDigitalPrograms: false,
    canAccessKBShredDigital: false,
    canAccessAdvancedStats: false,
  };

  if (!subscriptions || subscriptions.length === 0) {
    return result;
  }

  const activeSubs = subscriptions.filter((s) => s.status === "active" || s.status === "trialing");
  if (activeSubs.length === 0) {
    return result;
  }

  result.hasActiveSubscription = true;

  // Calcul cumulé des droits
  const cumulative = computeCumulativeAccess(activeSubs);

  // RÈGLE MÉTIER OFFICIELLE :
  // Cours Privés OU All Access => Accès digital complet
  const isFullDigitalAuthorized = cumulative.hasPrivateAccess || cumulative.isAllAccess;

  if (isFullDigitalAuthorized) {
    result.tier = "premium_club";
    result.hasPhysicalAccess = true;
    result.canAccessNutritionEngine = true;
    result.canLogFoodJournal = true;
    result.canAccessAllRecipes = true;
    result.canAccessDigitalPrograms = true;
    result.canAccessKBShredDigital = true;
    result.canAccessAdvancedStats = true;
    return result;
  }

  // Autres profils physiques (Essentiel, Lady Striking, Kid Boxing, etc.)
  result.hasPhysicalAccess = cumulative.hasSmallGroupAccess || cumulative.isLadyStriking || cumulative.isKidBoxing;
  result.tier = result.hasPhysicalAccess ? "premium_club" : "free";

  // Pour les autres profils, vérifier si des entitlements spécifiques JSONB explicites existent
  for (const sub of activeSubs) {
    const rawPlans = Array.isArray(sub.plan) ? sub.plan : sub.plan ? [sub.plan] : [];
    for (const plan of rawPlans) {
      if (!plan) continue;
      const planTier = (plan.tier || "").toLowerCase();
      if (planTier === "premium_digital") {
        result.tier = "premium_digital";
      }
      const ent = plan.entitlements || {};
      if (ent.nutrition === true) result.canAccessNutritionEngine = true;
      if (ent.food_log === true) result.canLogFoodJournal = true;
      if (ent.recipes_all === true) result.canAccessAllRecipes = true;
      if (ent.digital_programs === true) result.canAccessDigitalPrograms = true;
      if (ent.kb_shred_digital === true) result.canAccessKBShredDigital = true;
      if (ent.advanced_stats === true) result.canAccessAdvancedStats = true;
    }
  }

  return result;
}


