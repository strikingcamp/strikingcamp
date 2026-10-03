/**
 * TEST SUITE — MOTEUR DE PERSONNALISATION DYNAMIQUE STRIKING CAMP (Étape 6)
 *
 * Exécution :
 * node tests/personalization-engine.test.mjs
 */

import assert from "node:assert/strict";
import {
  evaluateWeightTrajectory,
  calculateTrainingAdherence,
  calculateNutritionAdherence,
  recommendMealFocus,
  recommendWeeklySessions,
  buildWeeklyGuidance,
} from "../lib/personalization-engine.ts";

console.log("\n=======================================================");
console.log("  TEST SUITE : MOTEUR DE PERSONNALISATION DYNAMIQUE (V1)");
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
// 1. TESTS TRAJECTOIRE DU POIDS (evaluateWeightTrajectory)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log("\n--- 1. Trajectoire du Poids ---");

runTest("1.1. Perte de poids normale (-0.6 kg/semaine) -> on_track", () => {
  const profile = {
    id: "p1",
    user_id: "u1",
    gender: "male",
    height_cm: 180,
    current_weight_kg: 83.8,
    target_weight_kg: 78,
    activity_level: "moderate",
    target_workouts_per_week: 4,
    primary_goal: "weight_loss",
    training_environment: "gym",
    available_equipment: ["dumbbells", "machines"],
  };

  const logs = [
    { id: "w1", user_id: "u1", weight_kg: 85.0, logged_at: "2026-10-01" },
    { id: "w2", user_id: "u1", weight_kg: 84.8, logged_at: "2026-10-04" },
    { id: "w3", user_id: "u1", weight_kg: 84.4, logged_at: "2026-10-08" },
    { id: "w4", user_id: "u1", weight_kg: 83.8, logged_at: "2026-10-15" },
  ];

  const result = evaluateWeightTrajectory(logs, profile, "2026-10-15");
  assert.equal(result.status, "on_track", "Le statut doit être on_track");
  assert.equal(result.isSufficientData, true);
  assert.equal(result.trend, "losing");
  assert.ok(result.weeklyRateKg !== null && result.weeklyRateKg < 0, "Le taux doit être négatif");
  assert.ok(result.progressPercent > 0, "La progression doit être positive");
});

runTest("1.2. Perte de poids trop rapide (< -1.2 kg/semaine) -> too_fast avec alerte de prudence", () => {
  const profile = {
    id: "p1",
    user_id: "u1",
    gender: "female",
    height_cm: 165,
    current_weight_kg: 62.0,
    target_weight_kg: 58,
    activity_level: "moderate",
    target_workouts_per_week: 4,
    primary_goal: "weight_loss",
    training_environment: "home",
    available_equipment: ["bodyweight"],
  };

  const logs = [
    { id: "w1", user_id: "u1", weight_kg: 65.0, logged_at: "2026-10-01" },
    { id: "w2", user_id: "u1", weight_kg: 63.5, logged_at: "2026-10-04" },
    { id: "w3", user_id: "u1", weight_kg: 62.0, logged_at: "2026-10-08" },
  ];

  const result = evaluateWeightTrajectory(logs, profile, "2026-10-08");
  assert.equal(result.status, "too_fast", "Une perte de 3 kg en 7 jours doit être trop rapide");
  assert.ok(result.message.includes("rapide") || result.message.includes("-1,2"), "Message de prudence requis");
});

runTest("1.3. Stagnation en perte de poids (poids stable sur 14 jours) -> stagnating", () => {
  const profile = {
    id: "p1",
    user_id: "u1",
    gender: "male",
    height_cm: 178,
    current_weight_kg: 80.0,
    target_weight_kg: 75,
    activity_level: "light",
    target_workouts_per_week: 3,
    primary_goal: "weight_loss",
    training_environment: "hybrid",
    available_equipment: ["kettlebell"],
  };

  const logs = [
    { id: "w1", user_id: "u1", weight_kg: 80.0, logged_at: "2026-10-01" },
    { id: "w2", user_id: "u1", weight_kg: 80.1, logged_at: "2026-10-07" },
    { id: "w3", user_id: "u1", weight_kg: 80.0, logged_at: "2026-10-15" },
  ];

  const result = evaluateWeightTrajectory(logs, profile, "2026-10-15");
  assert.equal(result.status, "stagnating", "Poids stable sur 14j doit déclencher stagnating");
  assert.equal(result.trend, "stable");
});

runTest("1.4. Gain musculaire normal (+0.35 kg/semaine) -> on_track", () => {
  const profile = {
    id: "p2",
    user_id: "u2",
    gender: "male",
    height_cm: 185,
    current_weight_kg: 75.7,
    target_weight_kg: 80,
    activity_level: "very_active",
    target_workouts_per_week: 4,
    primary_goal: "muscle_gain",
    training_environment: "gym",
    available_equipment: ["barbell", "dumbbells", "machines"],
  };

  const logs = [
    { id: "w1", user_id: "u2", weight_kg: 75.0, logged_at: "2026-10-01" },
    { id: "w2", user_id: "u2", weight_kg: 75.3, logged_at: "2026-10-07" },
    { id: "w3", user_id: "u2", weight_kg: 75.7, logged_at: "2026-10-15" },
  ];

  const result = evaluateWeightTrajectory(logs, profile, "2026-10-15");
  assert.equal(result.status, "on_track");
  assert.equal(result.trend, "gaining");
  assert.ok(result.weeklyRateKg > 0);
});

runTest("1.5. Objectif atteint (poids cible atteint) -> goal_reached", () => {
  const profile = {
    id: "p3",
    user_id: "u3",
    gender: "female",
    height_cm: 168,
    current_weight_kg: 60.0,
    target_weight_kg: 60.0,
    activity_level: "moderate",
    target_workouts_per_week: 3,
    primary_goal: "weight_loss",
    training_environment: "gym",
    available_equipment: ["dumbbells"],
  };

  const logs = [
    { id: "w1", user_id: "u3", weight_kg: 63.0, logged_at: "2026-10-01" },
    { id: "w2", user_id: "u3", weight_kg: 60.0, logged_at: "2026-10-15" },
  ];

  const result = evaluateWeightTrajectory(logs, profile, "2026-10-15");
  assert.equal(result.status, "goal_reached");
  assert.equal(result.progressPercent, 100);
  assert.equal(result.remainingDistanceKg, 0);
});

runTest("1.6. Données insuffisantes (< 2 pesées ou durée < 4 jours) -> insufficient_data", () => {
  const profile = {
    id: "p4",
    user_id: "u4",
    gender: "male",
    height_cm: 175,
    current_weight_kg: 82.0,
    target_weight_kg: 76,
    activity_level: "light",
    target_workouts_per_week: 3,
    primary_goal: "weight_loss",
    training_environment: "home",
    available_equipment: ["bodyweight"],
  };

  // 1 seule pesée
  const result1 = evaluateWeightTrajectory([{ id: "w1", user_id: "u4", weight_kg: 82.0, logged_at: "2026-10-15" }], profile, "2026-10-15");
  assert.equal(result1.status, "insufficient_data");
  assert.equal(result1.isSufficientData, false);

  // 2 pesées à 1 jour d'intervalle (trop court pour une trajectoire semaine)
  const result2 = evaluateWeightTrajectory(
    [
      { id: "w1", user_id: "u4", weight_kg: 82.0, logged_at: "2026-10-14" },
      { id: "w2", user_id: "u4", weight_kg: 81.8, logged_at: "2026-10-15" },
    ],
    profile,
    "2026-10-15"
  );
  assert.equal(result2.status, "insufficient_data");
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. TESTS ADHÉRENCE AUX ENTRAÎNEMENTS (calculateTrainingAdherence)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log("\n--- 2. Adhérence aux Entraînements & règle booked !== completed ---");

runTest("2.1. 4 séances prévues / 4 réalisées -> excellent (100%)", () => {
  const completions = [
    { completed_at: "2026-10-10T10:00:00Z" },
    { completed_at: "2026-10-12T10:00:00Z" },
    { completed_at: "2026-10-14T10:00:00Z" },
  ];
  const clubBookings = [
    { starts_at: "2026-10-15T18:00:00Z", status: "attended" },
  ];

  const res = calculateTrainingAdherence(completions, clubBookings, 4, "2026-10-15");
  assert.equal(res.completedSessions, 4);
  assert.equal(res.targetSessions, 4);
  assert.equal(res.adherencePercent, 100);
  assert.equal(res.status, "excellent");
});

runTest("2.2. 4 prévues / 2 réalisées -> low (50%)", () => {
  const completions = [
    { completed_at: "2026-10-11T10:00:00Z" },
    { completed_at: "2026-10-13T10:00:00Z" },
  ];

  const res = calculateTrainingAdherence(completions, [], 4, "2026-10-15");
  assert.equal(res.completedSessions, 2);
  assert.equal(res.adherencePercent, 50);
  assert.equal(res.status, "low");
});

runTest("2.3. 4 prévues / 0 réalisées -> very_low (0%)", () => {
  const res = calculateTrainingAdherence([], [], 4, "2026-10-15");
  assert.equal(res.completedSessions, 0);
  assert.equal(res.adherencePercent, 0);
  assert.equal(res.status, "very_low");
  assert.ok(res.message.includes("20-30 min") || res.message.includes("friction"));
});

runTest("2.4. RÈGLE STRICTE : booked !== completed (réservation future non comptée)", () => {
  const completions = [{ completed_at: "2026-10-14T10:00:00Z" }];
  const futureBookings = [
    { starts_at: "2026-10-15T19:00:00Z", status: "confirmed" }, // FUTURE CONFIRMÉE
    { starts_at: "2026-10-16T19:00:00Z", status: "confirmed" }, // FUTURE CONFIRMÉE
  ];

  const res = calculateTrainingAdherence(completions, futureBookings, 4, "2026-10-15");
  assert.equal(res.completedSessions, 1, "Seule la séance complétée doit compter, pas les confirmed");
  assert.equal(res.clubAttendedCount, 0);
  assert.equal(res.adherencePercent, 25);
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. TESTS ADHÉRENCE NUTRITIONNELLE (calculateNutritionAdherence)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log("\n--- 3. Adhérence Nutritionnelle ---");

runTest("3.1. Bonne adhérence (calories & protéines maîtrisées sur 5 jours) -> excellent", () => {
  const logs = [
    { log_date: "2026-10-11", calories: 2050, proteins_g: 155 },
    { log_date: "2026-10-12", calories: 1980, proteins_g: 148 },
    { log_date: "2026-10-13", calories: 2020, proteins_g: 152 },
    { log_date: "2026-10-14", calories: 2000, proteins_g: 150 },
    { log_date: "2026-10-15", calories: 2010, proteins_g: 151 },
  ];

  const res = calculateNutritionAdherence(logs, 2000, 150, "weight_loss", "2026-10-15");
  assert.equal(res.status, "excellent");
  assert.equal(res.loggedDays, 5);
  assert.equal(res.focus, "balanced_meals");
});

runTest("3.2. Protéines insuffisantes (< 80% cible) -> prioritize_protein", () => {
  const logs = [
    { log_date: "2026-10-11", calories: 1950, proteins_g: 80 },
    { log_date: "2026-10-12", calories: 2000, proteins_g: 75 },
    { log_date: "2026-10-13", calories: 1900, proteins_g: 85 },
    { log_date: "2026-10-14", calories: 2050, proteins_g: 90 },
  ];

  const res = calculateNutritionAdherence(logs, 2000, 150, "weight_loss", "2026-10-15");
  assert.equal(res.focus, "prioritize_protein");
  assert.ok(res.averageProtein < 120);
});

runTest("3.3. Calories trop élevées en perte de poids (> 115%) -> calorie_control", () => {
  const logs = [
    { log_date: "2026-10-11", calories: 2600, proteins_g: 160 },
    { log_date: "2026-10-12", calories: 2550, proteins_g: 155 },
    { log_date: "2026-10-13", calories: 2700, proteins_g: 150 },
  ];

  const res = calculateNutritionAdherence(logs, 2000, 150, "weight_loss", "2026-10-15");
  assert.equal(res.focus, "calorie_control");
});

runTest("3.4. Données insuffisantes (< 3 jours) -> insufficient_data", () => {
  const logs = [
    { log_date: "2026-10-14", calories: 2000, proteins_g: 150 },
  ];

  const res = calculateNutritionAdherence(logs, 2000, 150, "weight_loss", "2026-10-15");
  assert.equal(res.status, "insufficient_data");
  assert.equal(res.focus, "insufficient_data");
  assert.equal(res.loggedDays, 1);
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. TESTS PERSONNALISATION ET ENTITLEMENTS (buildWeeklyGuidance)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log("\n--- 4. Recommandations Complètes & Profils d'accès ---");

const samplePrograms = [
  {
    id: "prog-home",
    title: "Maison Striking Starter",
    slug: "maison-striking-starter",
    primary_goal: "weight_loss",
    location: "home",
    required_equipment: ["bodyweight"],
    level: "Tous niveaux",
    sessions_per_week: 3,
    duration_weeks: 4,
    is_kb_shred: false,
    is_premium: false,
    is_active: true,
    display_order: 1,
    sessions: [
      { id: "s1", title: "Full Body Maison Découverte", duration_minutes: 30, is_club_session: false, is_active: true, display_order: 1 },
      { id: "s2", title: "Cardio Boxing Express", duration_minutes: 25, is_club_session: false, is_active: true, display_order: 2 },
    ],
  },
  {
    id: "prog-gym",
    title: "Gym Hypertrophie",
    slug: "gym-hypertrophie",
    primary_goal: "muscle_gain",
    location: "gym",
    required_equipment: ["barbell", "dumbbells", "machines"],
    level: "Intermédiaire",
    sessions_per_week: 4,
    duration_weeks: 8,
    is_kb_shred: false,
    is_premium: true,
    is_active: true,
    display_order: 2,
    sessions: [
      { id: "s3", title: "Pectoraux & Triceps", duration_minutes: 50, is_club_session: false, is_active: true, display_order: 1 },
      { id: "s4", title: "Dos & Biceps", duration_minutes: 50, is_club_session: false, is_active: true, display_order: 2 },
    ],
  },
  {
    id: "prog-kb-shred",
    title: "KB SHRED Digital",
    slug: "kb-shred-digital",
    primary_goal: "both",
    location: "hybrid",
    required_equipment: ["kettlebell"],
    level: "Tous niveaux",
    sessions_per_week: 3,
    duration_weeks: 6,
    is_kb_shred: true,
    is_premium: true,
    is_active: true,
    display_order: 3,
    sessions: [
      { id: "s5", title: "KB Shred Hiit Circuit", duration_minutes: 30, is_club_session: false, is_active: true, display_order: 1 },
    ],
  },
];

const sampleRecipes = [
  {
    id: "r-free",
    title: "Bowl Poulet & Quinoa",
    slug: "bowl-poulet-quinoa",
    category: "lunch",
    target_goal: "weight_loss",
    prep_time_minutes: 15,
    difficulty: "Facile",
    calories: 420,
    proteins_g: 38,
    carbs_g: 40,
    fats_g: 10,
    tags: ["high_protein"],
    is_premium: false,
    is_active: true,
    display_order: 1,
  },
  {
    id: "r-prem",
    title: "Saumon Teriyaki & Patate Douce",
    slug: "saumon-teriyaki",
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
    display_order: 2,
  },
];

runTest("4.1. Profil Free -> ne reçoit AUCUN programme ni recette premium", () => {
  const profile = {
    id: "p-free",
    user_id: "u-free",
    gender: "female",
    height_cm: 165,
    current_weight_kg: 68,
    target_weight_kg: 62,
    activity_level: "light",
    target_workouts_per_week: 3,
    primary_goal: "weight_loss",
    training_environment: "home",
    available_equipment: ["bodyweight"],
  };

  const guidance = buildWeeklyGuidance({
    profile,
    weightLogs: [
      { id: "w1", user_id: "u-free", weight_kg: 69.0, logged_at: "2026-10-01" },
      { id: "w2", user_id: "u-free", weight_kg: 68.0, logged_at: "2026-10-15" },
    ],
    dailyFoodLogs: [],
    sessionCompletions: [],
    clubBookings: [],
    availablePrograms: samplePrograms,
    availableRecipes: sampleRecipes,
    entitlements: {
      nutrition: false,
      food_log: false,
      recipes_all: false,
      digital_programs: false,
      kb_shred_digital: false,
      advanced_stats: false,
    },
    referenceDate: "2026-10-15",
  });

  // Vérifier qu'aucune recette premium n'est recommandée
  const premRecipe = guidance.mealFocus.recommendedRecipes.find((r) => r.is_premium);
  assert.equal(premRecipe, undefined, "L'utilisateur Free ne doit recevoir aucune recette premium");

  // Vérifier qu'aucun programme premium n'est recommandé
  const premSession = guidance.recommendedSessions.find((s) => s.programId === "prog-gym" || s.programId === "prog-kb-shred");
  assert.equal(premSession, undefined, "L'utilisateur Free ne doit recevoir aucun programme premium");
});

runTest("4.2. Profil Premium Digital (Perte de poids + Salle) -> recommandations personnalisées", () => {
  const profile = {
    id: "p-prem",
    user_id: "u-prem",
    gender: "male",
    height_cm: 180,
    current_weight_kg: 84,
    target_weight_kg: 78,
    activity_level: "moderate",
    target_workouts_per_week: 4,
    primary_goal: "weight_loss",
    training_environment: "gym",
    available_equipment: ["barbell", "dumbbells", "machines", "kettlebell"],
  };

  const guidance = buildWeeklyGuidance({
    profile,
    weightLogs: [
      { id: "w1", user_id: "u-prem", weight_kg: 85.2, logged_at: "2026-10-01" },
      { id: "w2", user_id: "u-prem", weight_kg: 84.0, logged_at: "2026-10-15" },
    ],
    dailyFoodLogs: [
      { log_date: "2026-10-11", calories: 2000, proteins_g: 100 },
      { log_date: "2026-10-12", calories: 2050, proteins_g: 110 },
      { log_date: "2026-10-13", calories: 1980, proteins_g: 95 },
    ],
    sessionCompletions: [
      { completed_at: "2026-10-10T10:00:00Z" },
      { completed_at: "2026-10-12T10:00:00Z" },
      { completed_at: "2026-10-14T10:00:00Z" },
    ],
    clubBookings: [],
    availablePrograms: samplePrograms,
    availableRecipes: sampleRecipes,
    entitlements: {
      nutrition: true,
      food_log: true,
      recipes_all: true,
      digital_programs: true,
      kb_shred_digital: true,
      advanced_stats: true,
    },
    targetNutrition: { targetCalories: 2000, targetProtein: 160 },
    referenceDate: "2026-10-15",
  });

  assert.equal(guidance.objective, "weight_loss");
  assert.equal(guidance.weightTrajectory.status, "on_track");
  assert.equal(guidance.trainingAdherence.completedSessions, 3);
  assert.equal(guidance.mealFocus.focus, "prioritize_protein");
  assert.ok(guidance.explanation.details.length >= 2, "L'explication doit contenir des détails factuels");
});

runTest("4.3. Profil Club Member -> respect strict de l'intégration club sans conflit", () => {
  const profile = {
    id: "p-club",
    user_id: "u-club",
    gender: "male",
    height_cm: 178,
    current_weight_kg: 77,
    target_weight_kg: 75,
    activity_level: "very_active",
    target_workouts_per_week: 4,
    primary_goal: "recomposition",
    training_environment: "club",
    available_equipment: ["bodyweight", "kettlebell"],
  };

  const guidance = buildWeeklyGuidance({
    profile,
    weightLogs: [
      { id: "w1", user_id: "u-club", weight_kg: 77.5, logged_at: "2026-10-01" },
      { id: "w2", user_id: "u-club", weight_kg: 77.0, logged_at: "2026-10-15" },
    ],
    dailyFoodLogs: [],
    sessionCompletions: [],
    clubBookings: [
      { id: "b1", starts_at: "2026-10-13T18:00:00Z", status: "attended", discipline: "Small Group KB Shred" },
      { id: "b2", starts_at: "2026-10-15T18:00:00Z", status: "attended", discipline: "Kick Boxing" },
    ],
    availablePrograms: samplePrograms,
    availableRecipes: sampleRecipes,
    entitlements: {
      nutrition: false,
      food_log: false,
      recipes_all: false,
      digital_programs: false,
      kb_shred_digital: false,
      advanced_stats: false,
      hasPhysicalAccess: true,
    },
    referenceDate: "2026-10-15",
  });

  assert.equal(guidance.trainingAdherence.clubAttendedCount, 2);
  assert.equal(guidance.trainingAdherence.completedSessions, 2);
  assert.equal(guidance.kbShredRecommendation.eligible, true);
});

runTest("4.4. Profil incomplet -> priority onboarding avec explications claires", () => {
  const guidance = buildWeeklyGuidance({
    profile: null,
    weightLogs: [],
    dailyFoodLogs: [],
    sessionCompletions: [],
    clubBookings: [],
    availablePrograms: samplePrograms,
    availableRecipes: sampleRecipes,
    entitlements: {
      nutrition: false,
      food_log: false,
      recipes_all: false,
      digital_programs: false,
      kb_shred_digital: false,
      advanced_stats: false,
    },
    referenceDate: "2026-10-15",
  });

  assert.equal(guidance.priority, "onboarding");
  assert.equal(guidance.isInsufficientData, true);
  assert.ok(guidance.explanation.why.includes("profil"));
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RÉSULTATS FINAUX
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log("\n=======================================================");
console.log(`  RÉSULTAT DES TESTS : ${passed} passés / ${failed} échoués`);
console.log("=======================================================\n");

if (failed > 0) {
  process.exit(1);
}
