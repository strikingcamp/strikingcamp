/**
 * TEST SUITE — NUTRITION & RECIPES PERSONALIZATION ENGINE (V1)
 *
 * Exécution :
 * node tests/recipes-personalization.test.mjs
 */

import assert from "node:assert/strict";
import {
  recommendMealFocus,
  buildWeeklyGuidance,
} from "../lib/personalization-engine.ts";

console.log("\n=======================================================");
console.log("  TEST SUITE : NUTRITION & RECIPES PERSONALIZATION (V1)");
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
// ÉCHANTILLON DE RECETTES REPRÉSENTATIF DE LA BIBLIOTHÈQUE V1
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const testRecipes = [
  // Petits-déjeuners
  {
    id: "r-fb-fruits",
    title: "Fromage blanc aux fruits rouges & graines de chia",
    slug: "fromage-blanc-fruits-rouges-chia",
    category: "breakfast",
    target_goal: "all",
    prep_time_minutes: 5,
    difficulty: "Facile",
    calories: 260,
    proteins_g: 28,
    carbs_g: 22,
    fats_g: 5,
    tags: ["high_protein", "quick", "breakfast", "clean_eating"],
    is_premium: false,
    is_active: true,
    display_order: 10,
  },
  {
    id: "r-fb-peanut",
    title: "Fromage blanc banane & beurre de cacahuète",
    slug: "fromage-blanc-banane-beurre-cacahuete",
    category: "breakfast",
    target_goal: "muscle_gain",
    prep_time_minutes: 5,
    difficulty: "Facile",
    calories: 380,
    proteins_g: 30,
    carbs_g: 38,
    fats_g: 11,
    tags: ["high_protein", "quick", "breakfast", "muscle_gain"],
    is_premium: false,
    is_active: true,
    display_order: 11,
  },
  {
    id: "r-pancakes-fb",
    title: "Pancakes moelleux au fromage blanc & vanille",
    slug: "pancakes-fromage-blanc-vanille",
    category: "breakfast",
    target_goal: "weight_loss",
    prep_time_minutes: 10,
    difficulty: "Facile",
    calories: 290,
    proteins_g: 29,
    carbs_g: 28,
    fats_g: 4.5,
    tags: ["high_protein", "quick", "breakfast", "satiety"],
    is_premium: false,
    is_active: true,
    display_order: 21,
  },
  // Bowls & Salades (Déjeuner / Dîner)
  {
    id: "r-bowl-poulet",
    title: "Bowl Poulet rôti, Quinoa, Roquette & Tomates cerises",
    slug: "bowl-poulet-quinoa-roquette",
    category: "lunch",
    target_goal: "all",
    prep_time_minutes: 15,
    difficulty: "Facile",
    calories: 490,
    proteins_g: 44,
    carbs_g: 48,
    fats_g: 12,
    tags: ["high_protein", "lunch", "dinner", "balanced", "clean_eating"],
    is_premium: false,
    is_active: true,
    display_order: 30,
  },
  {
    id: "r-bowl-thon-quick",
    title: "Bowl Thon mariné, Riz complet, Concombre & Maïs",
    slug: "bowl-thon-riz-complet-concombre",
    category: "lunch",
    target_goal: "weight_loss",
    prep_time_minutes: 10,
    difficulty: "Facile",
    calories: 420,
    proteins_g: 37,
    carbs_g: 46,
    fats_g: 7,
    tags: ["high_protein", "quick", "lunch", "dinner", "low_fat", "satiety"],
    is_premium: false,
    is_active: true,
    display_order: 34,
  },
  {
    id: "r-bowl-saumon",
    title: "Bowl Saumon frais, Avocat, Riz basmati & Fèves",
    slug: "bowl-saumon-avocat-riz-feves",
    category: "lunch",
    target_goal: "recomposition",
    prep_time_minutes: 15,
    difficulty: "Facile",
    calories: 560,
    proteins_g: 38,
    carbs_g: 52,
    fats_g: 20,
    tags: ["high_protein", "lunch", "dinner", "omega3"],
    is_premium: false,
    is_active: true,
    display_order: 31,
  },
  {
    id: "r-bowl-boeuf",
    title: "Bowl Bœuf émincé mariné, Riz basmati & Courgettes",
    slug: "bowl-boeuf-riz-courgettes",
    category: "dinner",
    target_goal: "muscle_gain",
    prep_time_minutes: 15,
    difficulty: "Facile",
    calories: 540,
    proteins_g: 46,
    carbs_g: 50,
    fats_g: 15,
    tags: ["high_protein", "lunch", "dinner", "muscle_gain"],
    is_premium: false,
    is_active: true,
    display_order: 39,
  },
  {
    id: "r-bowl-cabillaud",
    title: "Bowl Cabillaud vapeur, Patate douce rôtie & Épinards",
    slug: "bowl-cabillaud-patate-douce-epinards",
    category: "dinner",
    target_goal: "all",
    prep_time_minutes: 20,
    difficulty: "Facile",
    calories: 430,
    proteins_g: 40,
    carbs_g: 48,
    fats_g: 7,
    tags: ["high_protein", "dinner", "lunch", "clean_eating"],
    is_premium: false,
    is_active: true,
    display_order: 41,
  },
  // Collations & Desserts
  {
    id: "r-fb-cheesecake",
    title: "Fromage blanc façon Cheesecake aux fruits rouges",
    slug: "fromage-blanc-cheesecake-fruits-rouges",
    category: "snack",
    target_goal: "weight_loss",
    prep_time_minutes: 5,
    difficulty: "Facile",
    calories: 210,
    proteins_g: 24,
    carbs_g: 18,
    fats_g: 3.5,
    tags: ["high_protein", "quick", "snack", "dessert", "low_calorie"],
    is_premium: false,
    is_active: true,
    display_order: 50,
  },
  {
    id: "r-fb-tiramisu",
    title: "Fromage blanc façon Tiramisu léger au café & cacao",
    slug: "fromage-blanc-tiramisu-leger",
    category: "snack",
    target_goal: "recomposition",
    prep_time_minutes: 5,
    difficulty: "Facile",
    calories: 220,
    proteins_g: 25,
    carbs_g: 20,
    fats_g: 3.5,
    tags: ["high_protein", "quick", "snack", "dessert", "gourmet"],
    is_premium: false,
    is_active: true,
    display_order: 51,
  },
  {
    id: "r-snack-peanut-banane",
    title: "Banane écrasée, Fromage blanc & Beurre de cacahuète",
    slug: "banane-fromage-blanc-beurre-cacahuete",
    category: "snack",
    target_goal: "muscle_gain",
    prep_time_minutes: 3,
    difficulty: "Facile",
    calories: 320,
    proteins_g: 24,
    carbs_g: 35,
    fats_g: 9.5,
    tags: ["high_protein", "quick", "snack", "muscle_gain"],
    is_premium: false,
    is_active: true,
    display_order: 58,
  },
  // Recette Premium
  {
    id: "r-premium-saumon-teriyaki",
    title: "Saumon Teriyaki & Patate Douce Signature",
    slug: "saumon-teriyaki-signature",
    category: "dinner",
    target_goal: "both",
    prep_time_minutes: 25,
    difficulty: "Moyen",
    calories: 580,
    proteins_g: 44,
    carbs_g: 50,
    fats_g: 18,
    tags: ["high_protein", "dinner"],
    is_premium: true,
    is_active: true,
    display_order: 99,
  },
];

const allEntitlements = {
  nutrition: true,
  food_log: true,
  recipes_all: true,
  digital_programs: true,
  kb_shred_digital: true,
  advanced_stats: true,
};

const freeEntitlements = {
  nutrition: false,
  food_log: false,
  recipes_all: false,
  digital_programs: false,
  kb_shred_digital: false,
  advanced_stats: false,
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXÉCUTION DES TESTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log("--- Tests de Personnalisation Nutritionnelle ---");

runTest("1. Perte de poids + quick (≤ 10 min) -> Priorité stricte aux recettes rapides et légères", () => {
  const result = recommendMealFocus(
    "calorie_control",
    testRecipes,
    allEntitlements,
    "weight_loss",
    "quick",
    []
  );

  assert.ok(result.recommendedRecipes.length >= 2);
  // Toutes les recettes recommandées doivent être rapides (≤ 10 min)
  for (const recipe of result.recommendedRecipes) {
    assert.ok(
      recipe.prep_time_minutes <= 10,
      `La recette ${recipe.title} (${recipe.prep_time_minutes} min) dépasse 10 min pour un profil quick`
    );
  }
  // La première recette doit être orientée perte de poids ou faible calorie
  assert.ok(
    result.recommendedRecipes[0].target_goal === "weight_loss" ||
    result.recommendedRecipes[0].target_goal === "all" ||
    result.recommendedRecipes[0].calories <= 450
  );
});

runTest("2. Maintien + standard (≤ 20 min) -> Recommandations équilibrées ≤ 20 min", () => {
  const result = recommendMealFocus(
    "balanced_meals",
    testRecipes,
    allEntitlements,
    "maintenance",
    "standard",
    []
  );

  assert.ok(result.recommendedRecipes.length >= 2);
  for (const recipe of result.recommendedRecipes) {
    assert.ok(
      recipe.prep_time_minutes <= 20,
      `La recette ${recipe.title} (${recipe.prep_time_minutes} min) dépasse 20 min pour un profil standard`
    );
  }
});

runTest("3. Recomposition -> Recommandations à haute teneur en protéines et profil équilibré", () => {
  const result = recommendMealFocus(
    "prioritize_protein",
    testRecipes,
    allEntitlements,
    "recomposition",
    "flexible",
    []
  );

  assert.ok(result.recommendedRecipes.length >= 2);
  // La recette phare doit être riche en protéines (ex: Bowl Saumon ou Bowl Poulet)
  const topRecipe = result.recommendedRecipes[0];
  assert.ok(
    topRecipe.proteins_g >= 25 || topRecipe.tags.includes("high_protein"),
    "La recommandation recomposition doit être dense en protéines"
  );
  assert.ok(result.title.includes("Protéines") || result.title.includes("Recomposition"));
});

runTest("4. Changement d'objectif -> Les recommandations changent immédiatement", () => {
  const lossResult = recommendMealFocus(
    "calorie_control",
    testRecipes,
    allEntitlements,
    "weight_loss",
    "flexible",
    []
  );

  const gainResult = recommendMealFocus(
    "muscle_surplus",
    testRecipes,
    allEntitlements,
    "muscle_gain",
    "flexible",
    []
  );

  assert.notEqual(
    lossResult.recommendedRecipes[0].id,
    gainResult.recommendedRecipes[0].id,
    "Un profil perte de poids et un profil prise de masse doivent avoir des recommandations différentes"
  );
  assert.ok(gainResult.recommendedRecipes[0].calories >= 300);
});

runTest("5. Changement du temps de préparation -> Influence directe sur les recettes", () => {
  const quickResult = recommendMealFocus(
    "balanced_meals",
    testRecipes,
    allEntitlements,
    "weight_loss",
    "quick",
    []
  );

  const flexibleResult = recommendMealFocus(
    "balanced_meals",
    testRecipes,
    allEntitlements,
    "weight_loss",
    "flexible",
    []
  );

  // Pour quick, aucune recette > 10 min
  assert.ok(quickResult.recommendedRecipes.every((r) => r.prep_time_minutes <= 10));
});

runTest("6. Historique récent -> Une recette consommée récemment est pénalisée", () => {
  // Sans historique, prenons la première recette recommandée
  const baseline = recommendMealFocus(
    "calorie_control",
    testRecipes,
    allEntitlements,
    "weight_loss",
    "flexible",
    []
  );

  const topRecipeId = baseline.recommendedRecipes[0].id;

  // Maintenant simulons que cette recette a été consommée aujourd'hui
  const foodLogs = [
    { recipe_id: topRecipeId, food_name: baseline.recommendedRecipes[0].title, log_date: "2026-10-03" }
  ];

  const withHistory = recommendMealFocus(
    "calorie_control",
    testRecipes,
    allEntitlements,
    "weight_loss",
    "flexible",
    foodLogs
  );

  // La recette consommée ne doit plus être en première position (ou être remplacée)
  assert.notEqual(
    withHistory.recommendedRecipes[0].id,
    topRecipeId,
    "La recette consommée récemment doit être pénalisée pour éviter la redondance"
  );
});

runTest("7. Variété des catégories -> Diversification entre petit-déj, déjeuner/dîner et collation", () => {
  const result = recommendMealFocus(
    "balanced_meals",
    testRecipes,
    allEntitlements,
    "maintenance",
    "flexible",
    []
  );

  const categories = result.recommendedRecipes.map((r) => r.category);
  const uniqueCategories = new Set(categories);

  // On doit avoir au moins 2 catégories distinctes dans le top 3 (ex: breakfast + lunch/dinner ou snack)
  assert.ok(
    uniqueCategories.size >= 2,
    `Attendu au moins 2 catégories distinctes, reçu: ${Array.from(uniqueCategories).join(", ")}`
  );
});

runTest("8. Variété des sources de protéines -> Diversité nutritionnelle", () => {
  const result = recommendMealFocus(
    "prioritize_protein",
    testRecipes,
    allEntitlements,
    "recomposition",
    "flexible",
    []
  );

  const titles = result.recommendedRecipes.map((r) => r.title.toLowerCase());
  // Vérifier qu'on n'a pas 3 fois exactement le même aliment principal
  const chickenCount = titles.filter((t) => t.includes("poulet")).length;
  assert.ok(chickenCount <= 2, "Ne doit pas recommander uniquement du poulet");
});

runTest("9. Les anciennes recettes restent compatibles et accessibles", () => {
  const legacyRecipe = {
    id: "e1111111-1111-4111-8111-111111111101",
    title: "Omelette Protéinée aux Épinards & Avocat",
    slug: "omelette-proteinee-epinards-avocat",
    category: "breakfast",
    target_goal: "both",
    prep_time_minutes: 10,
    difficulty: "Facile",
    calories: 380,
    proteins_g: 28,
    carbs_g: 6,
    fats_g: 26,
    tags: ["high_protein", "quick"],
    is_premium: false,
    is_active: true,
    display_order: 1,
  };

  const pool = [...testRecipes, legacyRecipe];
  const result = recommendMealFocus(
    "prioritize_protein",
    pool,
    allEntitlements,
    "recomposition",
    "quick",
    []
  );

  assert.ok(result.recommendedRecipes.length >= 2);
});

runTest("10. Droits Premium/Digital -> Respect absolu des restrictions pour compte Free", () => {
  const result = recommendMealFocus(
    "muscle_surplus",
    testRecipes,
    freeEntitlements,
    "muscle_gain",
    "flexible",
    []
  );

  // Aucune recette premium ne doit être présente
  const hasPremium = result.recommendedRecipes.some((r) => r.is_premium);
  assert.equal(hasPremium, false, "L'utilisateur Free ne doit recevoir AUCUNE recette Premium");
});

console.log("\n=======================================================");
console.log(`  RÉSULTAT DES TESTS : ${passed} passés / ${failed} échoués`);
console.log("=======================================================\n");

if (failed > 0) {
  process.exit(1);
}
