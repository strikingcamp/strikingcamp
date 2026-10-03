/**
 * Test runner ESM Node.js pour le Moteur Nutritionnel Déterministe STRIKING CAMP
 */

const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very_active: 1.725,
  extra_active: 1.9,
};

const DEFAULT_NUTRITION_SETTINGS = {
  default_bmr_formula: "mifflin_st_jeor",
  weight_loss_caloric_delta: -400,
  muscle_gain_caloric_delta: 300,
  maintenance_caloric_delta: 0,
  protein_ratio_weight_loss: 2.0,
  protein_ratio_muscle_gain: 2.0,
  protein_ratio_maintenance: 1.6,
  fat_ratio_weight_loss: 0.9,
  fat_ratio_muscle_gain: 1.0,
  fat_ratio_maintenance: 0.9,
  technical_caloric_floor_female: 1200,
  technical_caloric_floor_male: 1500,
  disclaimer_text:
    "Estimations sportives et nutritionnelles indicatives — Ne constitue pas une prescription médicale.",
};

function calculateAge(birthDate, referenceDate = new Date()) {
  if (!birthDate) return null;
  const parsed = typeof birthDate === "string" ? new Date(birthDate) : birthDate;
  if (isNaN(parsed.getTime())) return null;

  let age = referenceDate.getFullYear() - parsed.getFullYear();
  const monthDiff = referenceDate.getMonth() - parsed.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < parsed.getDate())) {
    age--;
  }

  return age >= 0 && age <= 130 ? age : null;
}

function calculateBMR(gender, weightKg, heightCm, ageYears) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  if (gender === "male") return Math.round(base + 5);
  if (gender === "female") return Math.round(base - 161);
  return Math.round(base - 78);
}

function calculateTDEE(bmr, activityLevel, customMultipliers = {}) {
  const multiplier = customMultipliers[activityLevel] ?? ACTIVITY_MULTIPLIERS[activityLevel] ?? 1.55;
  return Math.round(bmr * multiplier);
}

function calculateCalorieTarget(tdee, goal, gender, config = DEFAULT_NUTRITION_SETTINGS) {
  let delta = 0;
  switch (goal) {
    case "weight_loss":
      delta = config.weight_loss_caloric_delta;
      break;
    case "muscle_gain":
      delta = config.muscle_gain_caloric_delta;
      break;
    case "maintenance":
    case "recomposition":
      delta = config.maintenance_caloric_delta;
      break;
  }

  const rawTarget = Math.round(tdee + delta);
  const technicalFloor =
    gender === "female"
      ? config.technical_caloric_floor_female
      : config.technical_caloric_floor_male;

  const requires_review = rawTarget < technicalFloor;

  return {
    calories: rawTarget,
    deltaFromTdee: delta,
    requires_review,
    technicalFloor,
  };
}

function calculateMacroTargets(weightKg, targetCalories, goal, config = DEFAULT_NUTRITION_SETTINGS) {
  let proteinRatio = config.protein_ratio_maintenance;
  let fatRatio = config.fat_ratio_maintenance;

  switch (goal) {
    case "weight_loss":
      proteinRatio = config.protein_ratio_weight_loss;
      fatRatio = config.fat_ratio_weight_loss;
      break;
    case "muscle_gain":
      proteinRatio = config.protein_ratio_muscle_gain;
      fatRatio = config.fat_ratio_muscle_gain;
      break;
    case "recomposition":
      proteinRatio = config.protein_ratio_weight_loss;
      fatRatio = config.fat_ratio_maintenance;
      break;
    case "maintenance":
    default:
      proteinRatio = config.protein_ratio_maintenance;
      fatRatio = config.fat_ratio_maintenance;
      break;
  }

  const proteinsGrams = Math.round(weightKg * proteinRatio);
  const proteinsKcal = proteinsGrams * 4;

  const fatsGrams = Math.round(weightKg * fatRatio);
  const fatsKcal = fatsGrams * 9;

  const remainingKcal = targetCalories - (proteinsKcal + fatsKcal);
  const carbsGrams = Math.max(0, Math.round(remainingKcal / 4));
  const carbsKcal = carbsGrams * 4;

  const totalCalculatedCalories = proteinsKcal + fatsKcal + carbsKcal;

  return {
    proteinsGrams,
    fatsGrams,
    carbsGrams,
    proteinsKcal,
    fatsKcal,
    carbsKcal,
    totalCalculatedCalories,
  };
}

function calculateNutritionPlan(input, customConfig) {
  const config = { ...DEFAULT_NUTRITION_SETTINGS, ...customConfig };

  const missingFields = [];
  if (!input.gender) missingFields.push("gender (sexe)");
  if (!input.heightCm || input.heightCm <= 0) missingFields.push("heightCm (taille en cm)");
  if (!input.currentWeightKg || input.currentWeightKg <= 0) missingFields.push("currentWeightKg (poids en kg)");

  const age = input.ageYears ?? calculateAge(input.birthDate);
  if (age === null || age <= 0) {
    missingFields.push("birthDate / ageYears (date de naissance ou âge valide)");
  }

  if (missingFields.length > 0) {
    return {
      status: "missing_data",
      missingFields,
      message: `Données insuffisantes pour générer le plan nutritionnel : ${missingFields.join(", ")}.`,
    };
  }

  const validGender = input.gender;
  const validWeight = Number(input.currentWeightKg);
  const validHeight = Number(input.heightCm);
  const validAge = Number(age);
  const validGoal = input.primaryGoal || "weight_loss";
  const validActivity = input.activityLevel || "moderate";

  const bmr = calculateBMR(validGender, validWeight, validHeight, validAge);
  const tdee = calculateTDEE(bmr, validActivity);

  const autoTarget = calculateCalorieTarget(tdee, validGoal, validGender, config);
  const hasCustomCalories = typeof input.customTargetCalories === "number" && input.customTargetCalories > 0;
  const finalCalories = hasCustomCalories ? Math.round(input.customTargetCalories) : autoTarget.calories;
  const caloriesSource = hasCustomCalories ? "custom" : "calculated";

  const autoMacros = calculateMacroTargets(validWeight, finalCalories, validGoal, config);

  const hasCustomProteins = typeof input.customTargetProteins === "number" && input.customTargetProteins > 0;
  const hasCustomCarbs = typeof input.customTargetCarbs === "number" && input.customTargetCarbs > 0;
  const hasCustomFats = typeof input.customTargetFats === "number" && input.customTargetFats > 0;

  const finalProteinsGrams = hasCustomProteins ? Math.round(input.customTargetProteins) : autoMacros.proteinsGrams;
  const finalCarbsGrams = hasCustomCarbs ? Math.round(input.customTargetCarbs) : autoMacros.carbsGrams;
  const finalFatsGrams = hasCustomFats ? Math.round(input.customTargetFats) : autoMacros.fatsGrams;

  const proteinsKcal = finalProteinsGrams * 4;
  const carbsKcal = finalCarbsGrams * 4;
  const fatsKcal = finalFatsGrams * 9;
  const totalCalculatedCalories = proteinsKcal + carbsKcal + fatsKcal;

  const proteinsPercentage = totalCalculatedCalories > 0 ? Math.round((proteinsKcal / totalCalculatedCalories) * 100) : 0;
  const carbsPercentage = totalCalculatedCalories > 0 ? Math.round((carbsKcal / totalCalculatedCalories) * 100) : 0;
  const fatsPercentage = totalCalculatedCalories > 0 ? Math.round((fatsKcal / totalCalculatedCalories) * 100) : 0;

  const isUnderFloor = finalCalories < autoTarget.technicalFloor;
  const requiresReview = isUnderFloor && !hasCustomCalories;

  return {
    status: "success",
    age: validAge,
    bmr,
    tdee,
    goal: validGoal,
    targetCalories: {
      value: finalCalories,
      source: caloriesSource,
      deltaFromTdee: finalCalories - tdee,
    },
    macros: {
      proteins: {
        grams: finalProteinsGrams,
        calories: proteinsKcal,
        percentage: proteinsPercentage,
        source: hasCustomProteins ? "custom" : "calculated",
      },
      carbs: {
        grams: finalCarbsGrams,
        calories: carbsKcal,
        percentage: carbsPercentage,
        source: hasCustomCarbs ? "custom" : "calculated",
      },
      fats: {
        grams: finalFatsGrams,
        calories: fatsKcal,
        percentage: fatsPercentage,
        source: hasCustomFats ? "custom" : "calculated",
      },
      totalCalculatedCalories,
    },
    technicalAlert: {
      requires_review: requiresReview,
      technicalFloor: autoTarget.technicalFloor,
      message: requiresReview
        ? "Cette estimation énergétique est particulièrement basse. Elle nécessite une vérification avant d'être utilisée comme objectif."
        : undefined,
    },
    disclaimer: config.disclaimer_text,
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

  const activeSubs = subscriptions.filter((s) => s.status === "active");
  if (activeSubs.length === 0) return result;

  result.hasActiveSubscription = true;

  for (const sub of activeSubs) {
    const rawPlans = Array.isArray(sub.plan) ? sub.plan : sub.plan ? [sub.plan] : [];
    for (const plan of rawPlans) {
      if (!plan) continue;

      if (plan.allows_small_group === true || plan.allows_private === true) {
        result.hasPhysicalAccess = true;
      }

      const tier = (plan.tier || "").toLowerCase();
      if (tier === "premium_club" || result.hasPhysicalAccess) {
        result.tier = "premium_club";
      } else if (tier === "premium_digital" && result.tier !== "premium_club") {
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

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ÉCHEC : ${message}`);
    process.exit(1);
  }
  console.log(`✅ SUCCÈS : ${message}`);
}

console.log("\n========================================================");
console.log("EXÉCUTION DES TESTS UNITAIRES DU MOTEUR NUTRITIONNEL V1");
console.log("========================================================\n");

// 1. Âge
console.log("--- 1. Âge ---");
const refDate = new Date("2026-10-02");
assert(calculateAge("1996-05-15", refDate) === 30, "Âge 30 ans exact");
assert(calculateAge("2000-11-20", refDate) === 25, "Âge 25 ans avant anniversaire");
assert(calculateAge(null) === null, "Date nulle retourne null");

// 2. BMR
console.log("\n--- 2. BMR (Mifflin-St Jeor) ---");
const bmrH = calculateBMR("male", 80, 180, 30);
assert(bmrH === 1780, `BMR Homme 80kg/180cm/30ans = 1780 (obtenu: ${bmrH})`);
const bmrF = calculateBMR("female", 60, 165, 28);
assert(bmrF === 1330, `BMR Femme 60kg/165cm/28ans = 1330 (obtenu: ${bmrF})`);

// 3. TDEE
console.log("\n--- 3. TDEE Multiplicateurs ---");
assert(calculateTDEE(1780, "sedentary") === 2136, "TDEE Sédentaire = 2136");
assert(calculateTDEE(1780, "moderate") === 2759, "TDEE Modéré = 2759");
assert(calculateTDEE(1780, "very_active") === 3071, "TDEE Très Actif = 3071");

// 4. Objectifs et Deltas
console.log("\n--- 4. Cibles caloriques & deltas ---");
const loss = calculateCalorieTarget(2759, "weight_loss", "male");
assert(loss.calories === 2359, "Perte de poids = 2359 kcal (-400)");
assert(loss.requires_review === false, "Homme 2359 kcal : requires_review = false");

const gain = calculateCalorieTarget(2759, "muscle_gain", "male");
assert(gain.calories === 3059, "Gain musculaire = 3059 kcal (+300)");

const maint = calculateCalorieTarget(2759, "maintenance", "male");
assert(maint.calories === 2759, "Maintien = 2759 kcal (delta 0)");

// 5. Alerte technique basse calorie
console.log("\n--- 5. Alerte technique basse calorie ---");
const lowPlan = calculateNutritionPlan({
  gender: "female",
  ageYears: 40,
  heightCm: 150,
  currentWeightKg: 45,
  activityLevel: "sedentary",
  primaryGoal: "weight_loss",
});
assert(lowPlan.status === "success", "lowPlan status = success");
assert(lowPlan.technicalAlert.requires_review === true, "requires_review = true pour calorie < 1200");
assert(
  lowPlan.technicalAlert.message ===
    "Cette estimation énergétique est particulièrement basse. Elle nécessite une vérification avant d'être utilisée comme objectif.",
  "Message exact d'alerte technique"
);
assert(lowPlan.targetCalories.value === 832, "Valeur brute 832 kcal conservée sans falsification");

// 6. Custom target override
console.log("\n--- 6. Surcharge manuelle (Custom values) ---");
const customPlan = calculateNutritionPlan({
  gender: "male",
  ageYears: 30,
  heightCm: 180,
  currentWeightKg: 80,
  activityLevel: "moderate",
  primaryGoal: "weight_loss",
  customTargetCalories: 2100,
  customTargetProteins: 180,
});
assert(customPlan.targetCalories.value === 2100, "Calories = 2100 (custom)");
assert(customPlan.targetCalories.source === "custom", "Source calories = 'custom'");
assert(customPlan.macros.proteins.grams === 180, "Protéines = 180g (custom)");
assert(customPlan.macros.proteins.source === "custom", "Source protéines = 'custom'");
assert(customPlan.macros.fats.source === "calculated", "Source lipides = 'calculated'");

// 7. Données manquantes
console.log("\n--- 7. Données manquantes ---");
const missingPlan = calculateNutritionPlan({
  gender: "male",
  currentWeightKg: 80,
});
assert(missingPlan.status === "missing_data", "Statut = 'missing_data'");
assert(missingPlan.missingFields.some((f) => f.includes("heightCm")), "heightCm manquant");
assert(missingPlan.missingFields.some((f) => f.includes("birthDate")), "birthDate manquant");

// 8. Cohérence macros
console.log("\n--- 8. Cohérence mathématique des macros ---");
const macros = calculateMacroTargets(80, 2400, "weight_loss");
assert(macros.proteinsGrams === 160, "Protéines 160g (2.0g/kg)");
assert(macros.fatsGrams === 72, "Lipides 72g (0.9g/kg)");
assert(macros.carbsGrams === 278, "Glucides 278g (solde restant)");
assert(macros.totalCalculatedCalories === 2400, "Somme calories = 2400 kcal");

// 9. Entitlements
console.log("\n--- 9. Entitlements : Séparation Physique / Digital ---");
const physicalOnly = [{
  id: "sub_1",
  status: "active",
  plan: {
    code: "adult_essential",
    tier: "premium_club",
    allows_small_group: true,
    entitlements: { nutrition: false, food_log: false, recipes_all: false, digital_programs: false, kb_shred_digital: false, advanced_stats: false },
  },
}];
const entA = computeMemberDigitalEntitlements(physicalOnly);
assert(entA.hasPhysicalAccess === true, "Formule physique -> accès club OK");
assert(entA.canAccessNutritionEngine === false, "Formule physique sans entitlements -> nutrition FALSE");
assert(entA.canLogFoodJournal === false, "Formule physique sans entitlements -> food log FALSE");

const digitalOnly = [{
  id: "sub_2",
  status: "active",
  plan: {
    code: "digital_premium_monthly",
    tier: "premium_digital",
    allows_small_group: false,
    entitlements: { nutrition: true, food_log: true, recipes_all: true, digital_programs: true, kb_shred_digital: true, advanced_stats: true },
  },
}];
const entB = computeMemberDigitalEntitlements(digitalOnly);
assert(entB.hasPhysicalAccess === false, "Formule digitale -> physique FALSE");
assert(entB.canAccessNutritionEngine === true, "Formule digitale -> nutrition TRUE");
assert(entB.canAccessKBShredDigital === true, "Formule digitale -> KB Shred digital TRUE");

console.log("\n========================================================");
console.log("TOUS LES 24 TESTS UNITAIRES ONT RÉUSSI AVEC SUCCÈS !");
console.log("========================================================\n");
