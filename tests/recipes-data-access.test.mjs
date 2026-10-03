/**
 * TEST SUITE : ACCÈS AUX RECETTES, ENTITLEMENTS & FILTRES (STRIKING CAMP)
 *
 * Exécution :
 * node tests/recipes-data-access.test.mjs
 */

import assert from "node:assert/strict";
import { computeMemberDigitalEntitlements } from "../lib/access-control.ts";

console.log("\n=======================================================");
console.log("  TEST SUITE : ACCÈS RECETTES & ENTITLEMENTS (V1)");
console.log("=======================================================\n");

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error("     ", err.message);
    failed++;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DONNÉES DE TEST DU CATALOGUE DE RECETTES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const MOCK_RECIPES = [
  {
    id: "r1",
    title: "Omelette Blanche aux Blancs d'Œufs",
    slug: "omelette-blanche",
    category: "breakfast",
    target_goal: "weight_loss",
    prep_time_minutes: 10,
    difficulty: "Facile",
    calories: 220,
    proteins_g: 30,
    carbs_g: 6,
    fats_g: 7,
    tags: ["high_protein", "quick"],
    is_premium: false,
    is_active: true,
  },
  {
    id: "r2",
    title: "Salade Thaï au Bœuf Saisi",
    slug: "salade-thai-boeuf",
    category: "lunch",
    target_goal: "weight_loss",
    prep_time_minutes: 15,
    difficulty: "Facile",
    calories: 360,
    proteins_g: 38,
    carbs_g: 12,
    fats_g: 16,
    tags: ["high_protein", "quick"],
    is_premium: false,
    is_active: true,
  },
  {
    id: "r3",
    title: "Saumon Sauvage Rôti & Patates Douces",
    slug: "saumon-sauvage-roti",
    category: "dinner",
    target_goal: "both",
    prep_time_minutes: 25,
    difficulty: "Moyen",
    calories: 540,
    proteins_g: 42,
    carbs_g: 45,
    fats_g: 18,
    tags: ["high_protein"],
    is_premium: true,
    is_active: true,
  },
  {
    id: "r4",
    title: "Smoothie Anabolisant Banane & Beurre de Cacahuète",
    slug: "smoothie-anabolisant",
    category: "snack",
    target_goal: "muscle_gain",
    prep_time_minutes: 5,
    difficulty: "Facile",
    calories: 480,
    proteins_g: 35,
    carbs_g: 50,
    fats_g: 14,
    tags: ["high_protein", "quick"],
    is_premium: true,
    is_active: true,
  },
  {
    id: "r5",
    title: "Bavette Grillée & Purée de Patate Douce",
    slug: "bavette-grillee",
    category: "dinner",
    target_goal: "muscle_gain",
    prep_time_minutes: 20,
    difficulty: "Facile",
    calories: 620,
    proteins_g: 48,
    carbs_g: 55,
    fats_g: 22,
    tags: ["high_protein"],
    is_premium: true,
    is_active: true,
  },
];

// Helper de filtrage identique à RecipesTab
function filterRecipes(recipes, filters) {
  const {
    category = "all",
    goal = "all",
    onlyHighProtein = false,
    onlyQuick = false,
    searchQuery = "",
  } = filters;

  return recipes.filter((r) => {
    if (category !== "all" && r.category !== category) return false;
    if (goal !== "all" && r.target_goal !== "both" && r.target_goal !== goal) return false;
    if (onlyHighProtein && !r.tags.includes("high_protein")) return false;
    if (onlyQuick && r.prep_time_minutes > 15) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = r.title.toLowerCase().includes(q);
      const matchTag = r.tags.some((t) => t.toLowerCase().includes(q));
      if (!matchTitle && !matchTag) return false;
    }
    return true;
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. TESTS DES ENTITLEMENTS & RÈGLES D'ACCÈS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log("--- 1. Entitlements Free vs Premium vs Club ---");

runTest("1.1. Profil Free : canAccessAllRecipes est false, voit les recettes avec statut verrouillé", () => {
  const entitlements = computeMemberDigitalEntitlements([]);
  assert.equal(entitlements.canAccessAllRecipes, false);
  assert.equal(entitlements.tier, "free");

  // Dans l'interface, les recettes sont visibles mais celles avec is_premium=true sont verrouillées
  const freeVisible = MOCK_RECIPES.map((r) => ({
    ...r,
    isLocked: r.is_premium && !entitlements.canAccessAllRecipes,
  }));

  const lockedRecipes = freeVisible.filter((r) => r.isLocked);
  const unlockedRecipes = freeVisible.filter((r) => !r.isLocked);

  assert.equal(lockedRecipes.length, 3, "Les 3 recettes Premium doivent être verrouillées");
  assert.equal(unlockedRecipes.length, 2, "Les 2 recettes gratuites doivent être accessibles");
});

runTest("1.2. Profil Premium Digital : canAccessAllRecipes est true, toutes les recettes débloquées", () => {
  const entitlements = computeMemberDigitalEntitlements([
    {
      id: "sub-1",
      status: "active",
      plan: {
        id: "plan-dig",
        type: "digital",
        tier: "premium_digital",
        is_digital_plan: true,
        entitlements: { recipes_all: true, nutrition: true, food_log: true },
      },
    },
  ]);

  assert.equal(entitlements.canAccessAllRecipes, true);
  assert.equal(entitlements.tier, "premium_digital");

  const digitalVisible = MOCK_RECIPES.map((r) => ({
    ...r,
    isLocked: r.is_premium && !entitlements.canAccessAllRecipes,
  }));

  const locked = digitalVisible.filter((r) => r.isLocked);
  assert.equal(locked.length, 0, "Aucune recette ne doit être verrouillée pour Premium Digital");
});

runTest("1.3. Profil Club pur (Physique) : pas d'accès digital implicite aux recettes Premium", () => {
  const entitlements = computeMemberDigitalEntitlements([
    {
      id: "sub-club",
      status: "active",
      plan: {
        id: "plan-club",
        type: "subscription",
        tier: "premium_club",
        allows_small_group: true,
        is_digital_plan: false,
        entitlements: { recipes_all: false },
      },
    },
  ]);

  assert.equal(entitlements.hasPhysicalAccess, true);
  assert.equal(entitlements.canAccessAllRecipes, false);
});

runTest("1.4. Sécurité serveur : simulation du blocage de l'ajout au journal pour un Free", () => {
  const freeEntitlements = computeMemberDigitalEntitlements([]);
  const targetRecipe = MOCK_RECIPES.find((r) => r.is_premium);

  let error = null;
  if (targetRecipe.is_premium && !freeEntitlements.canAccessAllRecipes) {
    error = "Cette recette nécessite un abonnement Striking Digital Premium.";
  }

  assert.ok(error !== null);
  assert.ok(error.includes("Digital Premium"));
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. TESTS DES FILTRES DE RECIPESTAB
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log("\n--- 2. Validation des Filtres RecipesTab ---");

runTest("2.1. Filtre par défaut (All) : retourne 100% des recettes", () => {
  const res = filterRecipes(MOCK_RECIPES, {});
  assert.equal(res.length, MOCK_RECIPES.length);
});

runTest("2.2. Filtre Catégorie : Petit-déjeuner / Déjeuner / Dîner / Collation", () => {
  const breakfasts = filterRecipes(MOCK_RECIPES, { category: "breakfast" });
  assert.equal(breakfasts.length, 1);
  assert.equal(breakfasts[0].category, "breakfast");

  const lunches = filterRecipes(MOCK_RECIPES, { category: "lunch" });
  assert.equal(lunches.length, 1);
  assert.equal(lunches[0].category, "lunch");

  const dinners = filterRecipes(MOCK_RECIPES, { category: "dinner" });
  assert.equal(dinners.length, 2);

  const snacks = filterRecipes(MOCK_RECIPES, { category: "snack" });
  assert.equal(snacks.length, 1);
});

runTest("2.3. Filtre Objectif : Perte de poids vs Gain musculaire (avec support 'both')", () => {
  const weightLoss = filterRecipes(MOCK_RECIPES, { goal: "weight_loss" });
  // r1 (weight_loss), r2 (weight_loss), r3 (both) -> 3 recettes
  assert.equal(weightLoss.length, 3);
  assert.ok(weightLoss.every((r) => r.target_goal === "weight_loss" || r.target_goal === "both"));

  const muscleGain = filterRecipes(MOCK_RECIPES, { goal: "muscle_gain" });
  // r3 (both), r4 (muscle_gain), r5 (muscle_gain) -> 3 recettes
  assert.equal(muscleGain.length, 3);
  assert.ok(muscleGain.every((r) => r.target_goal === "muscle_gain" || r.target_goal === "both"));
});

runTest("2.4. Filtre 'Riche en protéines' : tags includes 'high_protein'", () => {
  const res = filterRecipes(MOCK_RECIPES, { onlyHighProtein: true });
  assert.equal(res.length, 5);
});

runTest("2.5. Filtre 'Rapide' (≤ 15 min)", () => {
  const res = filterRecipes(MOCK_RECIPES, { onlyQuick: true });
  // r1 (10 min), r2 (15 min), r4 (5 min) -> 3 recettes
  assert.equal(res.length, 3);
  assert.ok(res.every((r) => r.prep_time_minutes <= 15));
});

runTest("2.6. Recherche textuelle par titre ou ingrédient", () => {
  const searchBoeuf = filterRecipes(MOCK_RECIPES, { searchQuery: "bœuf" });
  assert.equal(searchBoeuf.length, 1);
  assert.equal(searchBoeuf[0].slug, "salade-thai-boeuf");

  const searchSmoothie = filterRecipes(MOCK_RECIPES, { searchQuery: "smoothie" });
  assert.equal(searchSmoothie.length, 1);
  assert.equal(searchSmoothie[0].slug, "smoothie-anabolisant");
});

runTest("2.7. Combinaison de filtres : Déjeuner + Rapide + Perte de poids", () => {
  const res = filterRecipes(MOCK_RECIPES, {
    category: "lunch",
    goal: "weight_loss",
    onlyQuick: true,
  });
  assert.equal(res.length, 1);
  assert.equal(res[0].id, "r2");
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RÉSULTATS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log("\n=======================================================");
console.log(`  RÉSULTAT DES TESTS RECETTES : ${passed} passés / ${failed} échoués`);
console.log("=======================================================\n");

if (failed > 0) {
  process.exit(1);
}
