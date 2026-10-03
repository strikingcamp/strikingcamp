/**
 * Test runner ESM pour les opérations et calculs de la plateforme Défis (Poids, Journal, Recettes, KB Shred)
 */

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ÉCHEC : ${message}`);
    process.exit(1);
  }
  console.log(`✅ SUCCÈS : ${message}`);
}

console.log("\n========================================================");
console.log("TESTS UNITAIRES DES OPÉRATIONS DÉFIS & PROGRESSION (ÉTAPE 3)");
console.log("========================================================\n");

// 1. Calcul de la progression du poids
console.log("--- 1. Progression du poids ---");
function calculateWeightProgression(logs, targetWeight) {
  if (!logs || logs.length === 0) return { totalDelta: null, progressPercentage: null };
  const initialWeight = logs[0].weight_kg;
  const currentWeight = logs[logs.length - 1].weight_kg;
  const totalDelta = Number((currentWeight - initialWeight).toFixed(1));

  let progressPercentage = null;
  if (targetWeight && targetWeight !== initialWeight) {
    const totalDistance = targetWeight - initialWeight;
    const currentDistance = currentWeight - initialWeight;
    const pct = (currentDistance / totalDistance) * 100;
    progressPercentage = Math.min(100, Math.max(0, Math.round(pct)));
  }

  return { initialWeight, currentWeight, targetWeight, totalDelta, progressPercentage };
}

// Scénario Perte de poids : Initial 80kg, Actuel 76kg, Objectif 72kg -> 4kg perdus sur 8kg = 50%
const weightLogs1 = [
  { weight_kg: 80, logged_at: "2026-09-01" },
  { weight_kg: 78.5, logged_at: "2026-09-15" },
  { weight_kg: 76.0, logged_at: "2026-10-01" },
];
const prog1 = calculateWeightProgression(weightLogs1, 72.0);
assert(prog1.initialWeight === 80, "Poids initial = 80kg");
assert(prog1.currentWeight === 76, "Poids actuel = 76kg");
assert(prog1.totalDelta === -4.0, "Delta total = -4.0 kg");
assert(prog1.progressPercentage === 50, "Progression = 50%");

// Scénario Prise de muscle : Initial 70kg, Actuel 73kg, Objectif 75kg -> 3kg pris sur 5kg = 60%
const weightLogs2 = [
  { weight_kg: 70, logged_at: "2026-09-01" },
  { weight_kg: 73, logged_at: "2026-10-01" },
];
const prog2 = calculateWeightProgression(weightLogs2, 75.0);
assert(prog2.totalDelta === 3.0, "Delta prise de muscle = +3.0 kg");
assert(prog2.progressPercentage === 60, "Progression = 60%");

// 2. Calcul des totaux journaliers du journal alimentaire
console.log("\n--- 2. Totaux journaliers du Journal Alimentaire ---");
function calculateDailyTotals(logs) {
  let totalCalories = 0;
  let totalProteins = 0;
  let totalCarbs = 0;
  let totalFats = 0;

  for (const item of logs) {
    totalCalories += item.calories || 0;
    totalProteins += Number(item.proteins_g) || 0;
    totalCarbs += Number(item.carbs_g) || 0;
    totalFats += Number(item.fats_g) || 0;
  }

  return {
    totalCalories: Math.round(totalCalories),
    totalProteinsGrams: Number(totalProteins.toFixed(1)),
    totalCarbsGrams: Number(totalCarbs.toFixed(1)),
    totalFatsGrams: Number(totalFats.toFixed(1)),
  };
}

const dayLogs = [
  { meal_type: "breakfast", food_name: "Omelette Striker", calories: 380, proteins_g: 28, carbs_g: 6, fats_g: 26 },
  { meal_type: "lunch", food_name: "Bowl Poulet & Quinoa", calories: 520, proteins_g: 44, carbs_g: 52, fats_g: 14 },
  { meal_type: "snack", food_name: "Shaker Récupération", calories: 310, proteins_g: 24, carbs_g: 42, fats_g: 5 },
  { meal_type: "dinner", food_name: "Pavé de Saumon & Patate douce", calories: 560, proteins_g: 38, carbs_g: 42, fats_g: 24 },
];

const dayTotals = calculateDailyTotals(dayLogs);
assert(dayTotals.totalCalories === 1770, `Total Calories journalier = 1770 kcal (obtenu: ${dayTotals.totalCalories})`);
assert(dayTotals.totalProteinsGrams === 134.0, `Total Protéines = 134.0 g (obtenu: ${dayTotals.totalProteinsGrams})`);
assert(dayTotals.totalCarbsGrams === 142.0, `Total Glucides = 142.0 g (obtenu: ${dayTotals.totalCarbsGrams})`);
assert(dayTotals.totalFatsGrams === 69.0, `Total Lipides = 69.0 g (obtenu: ${dayTotals.totalFatsGrams})`);

// 3. Multiplicateur de portion pour recette ajoutée au journal
console.log("\n--- 3. Multiplicateur de portion recette ---");
function calculateRecipeServing(recipe, multiplier = 1) {
  return {
    calories: Math.round(recipe.calories * multiplier),
    proteins_g: Number((recipe.proteins_g * multiplier).toFixed(1)),
    carbs_g: Number((recipe.carbs_g * multiplier).toFixed(1)),
    fats_g: Number((recipe.fats_g * multiplier).toFixed(1)),
  };
}

const baseRecipe = { calories: 400, proteins_g: 30, carbs_g: 40, fats_g: 10 };
const doubleServing = calculateRecipeServing(baseRecipe, 2);
assert(doubleServing.calories === 800, "2 portions = 800 kcal");
assert(doubleServing.proteins_g === 60.0, "2 portions = 60g protéines");
assert(doubleServing.carbs_g === 80.0, "2 portions = 80g glucides");
assert(doubleServing.fats_g === 20.0, "2 portions = 20g lipides");

// 4. Agrégation Hybride KB SHRED (Digital + Club)
console.log("\n--- 4. Agrégation Hybride KB SHRED ---");
function aggregateKbShredStats(digitalCompletions, clubBookings) {
  const digitalCount = digitalCompletions.length;
  const filteredClubBookings = clubBookings.filter((b) => {
    const disc = (b.discipline || "").toLowerCase();
    return disc.includes("shred") || disc.includes("kettlebell") || disc.includes("kb");
  });
  const clubBooked = filteredClubBookings.filter((b) => b.status === "confirmed").length;
  const clubAttended = filteredClubBookings.filter((b) => b.status === "attended").length;

  return {
    digitalCompletedCount: digitalCount,
    clubBookedCount: clubBooked,
    clubAttendedCount: clubAttended,
    totalKbShredSessions: digitalCount + clubBooked + clubAttended,
  };
}

const digitalComps = [{ id: "c1" }, { id: "c2" }];
const clubBookingsSample = [
  { id: "b1", discipline: "Boxing Shred", status: "attended" },
  { id: "b2", discipline: "KB Shred", status: "confirmed" },
  { id: "b3", discipline: "Boxe Anglaise", status: "confirmed" }, // Hors KB Shred
];

const kbStats = aggregateKbShredStats(digitalComps, clubBookingsSample);
assert(kbStats.digitalCompletedCount === 2, "2 séances digitales KB Shred terminées");
assert(kbStats.clubAttendedCount === 1, "1 séance physique Boxing Shred effectuée");
assert(kbStats.clubBookedCount === 1, "1 séance physique KB Shred réservée");
assert(kbStats.totalKbShredSessions === 4, "Total hybride KB Shred = 4 séances");

console.log("\n========================================================");
console.log("TOUS LES TESTS D'OPÉRATIONS DÉFIS ONT RÉUSSI AVEC SUCCÈS !");
console.log("========================================================\n");
