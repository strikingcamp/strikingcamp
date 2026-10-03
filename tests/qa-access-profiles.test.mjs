/**
 * Suite de tests QA / Profils d'accès & Non-Régression pour STRIKING CAMP
 * Version : Règle Métier Défis V1 (Cours Privés / All Access = Complet ; Autres = Limité)
 */

function computePlanAccess(plan) {
  if (!plan) {
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
  const isAllAccess = code === "adult_all_access" || code === "col_annual" || code === "sg_annual" || rawName.includes("all access");
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

  return {
    allowsPrivate,
    allowsSmallGroup,
    isEssential,
    isAllAccess,
    isLadyStriking,
    isKidBoxing,
    allowedCategory: "all",
  };
}

function computeCumulativeAccess(subscriptions) {
  if (!subscriptions || subscriptions.length === 0) {
    return {
      hasActiveSubscription: false,
      hasPrivateAccess: false,
      hasSmallGroupAccess: false,
      isEssential: false,
      isAllAccess: false,
      isLadyStriking: false,
      isKidBoxing: false,
      validSubscriptionsCount: 0,
    };
  }

  let hasPrivateAccess = false;
  let hasSmallGroupAccess = false;
  let isEssential = false;
  let isAllAccess = false;
  let isLadyStriking = false;
  let isKidBoxing = false;
  let validCount = 0;

  for (const sub of subscriptions) {
    if (sub.status !== "active" && sub.status !== "trialing") continue;
    validCount++;
    const plan = Array.isArray(sub.plan) ? sub.plan[0] : sub.plan;
    const rights = computePlanAccess(plan);

    if (rights.allowsPrivate) hasPrivateAccess = true;
    if (rights.allowsSmallGroup) hasSmallGroupAccess = true;
    if (rights.isEssential) isEssential = true;
    if (rights.isAllAccess) isAllAccess = true;
    if (rights.isLadyStriking) isLadyStriking = true;
    if (rights.isKidBoxing) isKidBoxing = true;
  }

  return {
    hasActiveSubscription: validCount > 0,
    hasPrivateAccess,
    hasSmallGroupAccess,
    isEssential,
    isAllAccess,
    isLadyStriking,
    isKidBoxing,
    validSubscriptionsCount: validCount,
  };
}

function computeMemberDigitalEntitlements(subscriptions) {
  const result = {
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

  if (!subscriptions || subscriptions.length === 0) return result;

  const activeSubs = subscriptions.filter((s) => s.status === "active" || s.status === "trialing");
  if (activeSubs.length === 0) return result;

  result.hasActiveSubscription = true;

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

  return result;
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ÉCHEC QA : ${message}`);
    process.exit(1);
  }
  console.log(`✅ SUCCÈS QA : ${message}`);
}

console.log("\n========================================================");
console.log("TESTS QUALITÉ (QA) — NOUVELLE GESTION DES ACCÈS DÉFIS V1");
console.log("========================================================\n");

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SCÉNARIO 1 : COURS PRIVÉS (ACCÈS COMPLET)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log("--- SCÉNARIO 1 : COURS PRIVÉS (ACCÈS COMPLET) ---");
const privateUserSubs = [
  {
    id: "sub_priv_1",
    status: "active",
    plan: {
      id: "plan_priv_8",
      code: "priv_monthly_8",
      name: "Cours Privé Mensuel (8 séances)",
      type: "private",
      tier: "premium_club",
      allows_private: true,
      allows_small_group: true,
    },
  },
];

const privateEntitlements = computeMemberDigitalEntitlements(privateUserSubs);
assert(privateEntitlements.hasActiveSubscription === true, "Abonnement actif = true");
assert(privateEntitlements.hasPhysicalAccess === true, "Accès physique club = true");
assert(privateEntitlements.canAccessDigitalPrograms === true, "Programmes digitaux V1 = true");
assert(privateEntitlements.canAccessKBShredDigital === true, "KB Shred digital = true");
assert(privateEntitlements.canAccessNutritionEngine === true, "Nutrition digitale = true");
assert(privateEntitlements.canLogFoodJournal === true, "Journal alimentaire = true");

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SCÉNARIO 2 : ALL ACCESS (ACCÈS COMPLET)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log("\n--- SCÉNARIO 2 : ALL ACCESS (ACCÈS COMPLET) ---");
const allAccessUserSubs = [
  {
    id: "sub_all_1",
    status: "active",
    plan: {
      id: "plan_all_access",
      code: "adult_all_access",
      name: "All Access",
      type: "small_group",
      tier: "premium_club",
      allows_private: false,
      allows_small_group: true,
    },
  },
];

const allAccessEntitlements = computeMemberDigitalEntitlements(allAccessUserSubs);
assert(allAccessEntitlements.hasActiveSubscription === true, "Abonnement actif = true");
assert(allAccessEntitlements.hasPhysicalAccess === true, "Accès physique club = true");
assert(allAccessEntitlements.canAccessDigitalPrograms === true, "Programmes digitaux V1 = true");
assert(allAccessEntitlements.canAccessKBShredDigital === true, "KB Shred digital = true");
assert(allAccessEntitlements.canAccessNutritionEngine === true, "Nutrition digitale = true");
assert(allAccessEntitlements.canLogFoodJournal === true, "Journal alimentaire = true");

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SCÉNARIO 3 : ESSENTIEL (ACCÈS LIMITÉ)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log("\n--- SCÉNARIO 3 : ESSENTIEL (ACCÈS LIMITÉ DÉFIS/ÉVOLUTION) ---");
const essentialUserSubs = [
  {
    id: "sub_ess_1",
    status: "active",
    plan: {
      id: "plan_adult_essential",
      code: "adult_essential",
      name: "Essentiel",
      type: "small_group",
      tier: "premium_club",
      allows_small_group: true,
      allows_private: false,
    },
  },
];

const essentialEntitlements = computeMemberDigitalEntitlements(essentialUserSubs);
assert(essentialEntitlements.hasActiveSubscription === true, "Abonnement actif = true");
assert(essentialEntitlements.hasPhysicalAccess === true, "Accès physique Small Group = true");
assert(essentialEntitlements.canAccessDigitalPrograms === false, "Programmes digitaux V1 = false (masqué)");
assert(essentialEntitlements.canAccessKBShredDigital === false, "KB Shred digital = false");
assert(essentialEntitlements.canAccessNutritionEngine === false, "Nutrition digitale = false");

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SCÉNARIO 4 : LADY STRIKING (ACCÈS LIMITÉ)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log("\n--- SCÉNARIO 4 : LADY STRIKING (ACCÈS LIMITÉ DÉFIS/ÉVOLUTION) ---");
const ladyUserSubs = [
  {
    id: "sub_lady_1",
    status: "active",
    plan: {
      id: "plan_lady_annual",
      code: "lady_striking_annual",
      name: "Lady Striking",
      type: "small_group",
      tier: "premium_club",
      allows_small_group: true,
      allows_private: false,
    },
  },
];

const ladyEntitlements = computeMemberDigitalEntitlements(ladyUserSubs);
assert(ladyEntitlements.hasActiveSubscription === true, "Abonnement actif = true");
assert(ladyEntitlements.hasPhysicalAccess === true, "Accès physique Lady = true");
assert(ladyEntitlements.canAccessDigitalPrograms === false, "Programmes digitaux V1 = false (masqué)");
assert(ladyEntitlements.canAccessKBShredDigital === false, "KB Shred digital = false");

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SCÉNARIO 5 : SANS ABONNEMENT & KID BOXING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log("\n--- SCÉNARIO 5 : MEMBRE SANS ABONNEMENT & KID BOXING ---");
const freeEntitlements = computeMemberDigitalEntitlements([]);
assert(freeEntitlements.hasActiveSubscription === false, "Aucun abonnement actif");
assert(freeEntitlements.canAccessDigitalPrograms === false, "Programmes digitaux = false");
assert(freeEntitlements.canAccessNutritionEngine === false, "Nutrition digitale = false");

const kidUserSubs = [
  {
    id: "sub_kid_1",
    status: "active",
    plan: {
      id: "plan_kid",
      code: "kid_boxing_season",
      name: "Kid Boxing",
      type: "small_group",
      allows_small_group: true,
      allows_private: false,
    },
  },
];
const kidEntitlements = computeMemberDigitalEntitlements(kidUserSubs);
assert(kidEntitlements.hasActiveSubscription === true, "Abonnement Kid actif");
assert(kidEntitlements.canAccessDigitalPrograms === false, "Programmes digitaux = false (masqué)");

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SCÉNARIO 6 : SIMULATION SÉCURITÉ SERVEUR DIRECTE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log("\n--- SCÉNARIO 6 : VÉRIFICATION DE LA PROTECTION SERVEUR ---");
function simulateServerActionGuard(entitlements, actionName) {
  if (!entitlements.canAccessDigitalPrograms) {
    return { success: false, error: "Accès refusé côté serveur (non autorisé)" };
  }
  return { success: true, action: actionName };
}

const unauthActionAttempt = simulateServerActionGuard(essentialEntitlements, "completeProgramSessionAction");
assert(unauthActionAttempt.success === false, "completeProgramSessionAction bloquée pour Essentiel");

const freeActionAttempt = simulateServerActionGuard(freeEntitlements, "getWorkoutProgramsAction");
assert(freeActionAttempt.success === false, "getWorkoutProgramsAction bloquée pour Sans abonnement");

const privActionAttempt = simulateServerActionGuard(privateEntitlements, "completeProgramSessionAction");
assert(privActionAttempt.success === true, "completeProgramSessionAction autorisée pour Cours Privés");

const allAccessActionAttempt = simulateServerActionGuard(allAccessEntitlements, "completeProgramSessionAction");
assert(allAccessActionAttempt.success === true, "completeProgramSessionAction autorisée pour All Access");

console.log("\n========================================================");
console.log("TOUS LES SCÉNARIOS QA ET CONTRÔLES D'ACCÈS SONT VALIDÉS !");
console.log("========================================================\n");
