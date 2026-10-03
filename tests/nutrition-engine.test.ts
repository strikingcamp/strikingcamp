/**
 * Tests unitaires complets pour le Moteur Nutritionnel Déterministe et les Entitlements STRIKING CAMP
 */

import {
  calculateAge,
  calculateBMR,
  calculateTDEE,
  calculateCalorieTarget,
  calculateMacroTargets,
  calculateNutritionPlan,
} from "../lib/nutrition-engine";
import {
  DEFAULT_NUTRITION_SETTINGS,
  FitnessGoal,
  ActivityLevel,
} from "../lib/supabase/defis-platform";
import {
  computeMemberDigitalEntitlements,
  SubscriptionLike,
} from "../lib/access-control";

// Helper simple d'assertion pour exécuter les tests sans framework externe
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`❌ ÉCHEC : ${message}`);
  }
  console.log(`✅ SUCCÈS : ${message}`);
}

function runTests() {
  console.log("\n========================================================");
  console.log("DÉBUT DES TESTS DU MOTEUR NUTRITIONNEL ET DES ENTITLEMENTS");
  console.log("========================================================\n");

  // 1. Test du calcul de l'âge
  console.log("--- 1. Calcul de l'âge ---");
  const refDate = new Date("2026-10-02");
  const age1 = calculateAge("1996-05-15", refDate);
  assert(age1 === 30, `Âge calculé exact: attendu 30, obtenu ${age1}`);

  const age2 = calculateAge("2000-11-20", refDate);
  assert(age2 === 25, `Âge calculé avant anniversaire: attendu 25, obtenu ${age2}`);

  const ageNull = calculateAge(null);
  assert(ageNull === null, "Date nulle retourne null");

  // 2. Test BMR Mifflin-St Jeor Homme / Femme
  console.log("\n--- 2. Calcul BMR (Mifflin-St Jeor) ---");
  // Homme : 80kg, 180cm, 30 ans -> 10*80 + 6.25*180 - 5*30 + 5 = 800 + 1125 - 150 + 5 = 1780
  const bmrMale = calculateBMR("male", 80, 180, 30);
  assert(bmrMale === 1780, `BMR Homme: attendu 1780, obtenu ${bmrMale}`);

  // Femme : 60kg, 165cm, 28 ans -> 10*60 + 6.25*165 - 5*28 - 161 = 600 + 1031.25 - 140 - 161 = 1330.25 -> 1330
  const bmrFemale = calculateBMR("female", 60, 165, 28);
  assert(bmrFemale === 1330, `BMR Femme: attendu 1330, obtenu ${bmrFemale}`);

  // 3. Test TDEE selon les niveaux d'activité
  console.log("\n--- 3. Calcul TDEE selon niveaux d'activité ---");
  const tdeeSedentary = calculateTDEE(1780, "sedentary"); // 1780 * 1.2 = 2136
  assert(tdeeSedentary === 2136, `TDEE Sédentaire: attendu 2136, obtenu ${tdeeSedentary}`);

  const tdeeModerate = calculateTDEE(1780, "moderate"); // 1780 * 1.55 = 2759
  assert(tdeeModerate === 2759, `TDEE Modéré: attendu 2759, obtenu ${tdeeModerate}`);

  const tdeeVeryActive = calculateTDEE(1780, "very_active"); // 1780 * 1.725 = 3070.5 -> 3071
  assert(tdeeVeryActive === 3071, `TDEE Très Actif: attendu 3071, obtenu ${tdeeVeryActive}`);

  // 4. Test Cibles Caloriques selon Objectifs (Perte de poids, Gain musculaire, Maintien)
  console.log("\n--- 4. Cibles Caloriques et Deltas configurables ---");
  const targetLoss = calculateCalorieTarget(2759, "weight_loss", "male", DEFAULT_NUTRITION_SETTINGS);
  assert(targetLoss.calories === 2359, `Perte de poids (-400): attendu 2359, obtenu ${targetLoss.calories}`);
  assert(targetLoss.requires_review === false, "Cible homme 2359 n'est pas sous le seuil d'alerte");

  const targetGain = calculateCalorieTarget(2759, "muscle_gain", "male", DEFAULT_NUTRITION_SETTINGS);
  assert(targetGain.calories === 3059, `Gain musculaire (+300): attendu 3059, obtenu ${targetGain.calories}`);

  const targetMaint = calculateCalorieTarget(2759, "maintenance", "male", DEFAULT_NUTRITION_SETTINGS);
  assert(targetMaint.calories === 2759, `Maintien (delta 0): attendu 2759, obtenu ${targetMaint.calories}`);

  // 5. Test Alerte Technique (Cible sous le seuil d'alerte)
  console.log("\n--- 5. Alerte technique basse calorie (Protection & non prescription) ---");
  // Femme petite taille, faible poids, sédentaire en perte de poids
  // BMR: 10*45 + 6.25*150 - 5*40 - 161 = 450 + 937.5 - 200 - 161 = 1026.5 -> 1027
  // TDEE sédentaire: 1027 * 1.2 = 1232
  // Cible perte de poids (-400): 1232 - 400 = 832 kcal (< 1200 floor)
  const planLowCal = calculateNutritionPlan({
    gender: "female",
    ageYears: 40,
    heightCm: 150,
    currentWeightKg: 45,
    activityLevel: "sedentary",
    primaryGoal: "weight_loss",
  });

  assert(planLowCal.status === "success", "Statut succès");
  if (planLowCal.status === "success") {
    assert(planLowCal.technicalAlert.requires_review === true, "requires_review = true pour calorie basse");
    assert(
      planLowCal.technicalAlert.message ===
        "Cette estimation énergétique est particulièrement basse. Elle nécessite une vérification avant d'être utilisée comme objectif.",
      "Message d'alerte technique exact"
    );
    assert(planLowCal.targetCalories.value === 832, `Calories calculées = 832 (non tronquées arbitrairement)`);
  }

  // 6. Test Valeurs Personnalisées (Custom Overrides)
  console.log("\n--- 6. Surcharge manuelle (Custom Target Values) ---");
  const planCustom = calculateNutritionPlan({
    gender: "male",
    ageYears: 30,
    heightCm: 180,
    currentWeightKg: 80,
    activityLevel: "moderate",
    primaryGoal: "weight_loss",
    customTargetCalories: 2100,
    customTargetProteins: 180,
  });

  assert(planCustom.status === "success", "Statut succès");
  if (planCustom.status === "success") {
    assert(planCustom.targetCalories.value === 2100, "Cible calorique = 2100");
    assert(planCustom.targetCalories.source === "custom", "Source calories = 'custom'");
    assert(planCustom.macros.proteins.grams === 180, "Protéines = 180g");
    assert(planCustom.macros.proteins.source === "custom", "Source protéines = 'custom'");
    assert(planCustom.macros.fats.source === "calculated", "Source lipides = 'calculated'");
    assert(planCustom.macros.carbs.source === "calculated", "Source glucides = 'calculated'");
  }

  // 7. Test Données Manquantes (Zéro valeur inventée)
  console.log("\n--- 7. Gestion stricte des données manquantes ---");
  const planMissing = calculateNutritionPlan({
    gender: "male",
    // heightCm manquant
    currentWeightKg: 80,
    // age manquant
  });

  assert(planMissing.status === "missing_data", "Statut = 'missing_data'");
  if (planMissing.status === "missing_data") {
    assert(planMissing.missingFields.some((f) => f.includes("heightCm")), "Champ heightCm signalé manquant");
    assert(planMissing.missingFields.some((f) => f.includes("birthDate")), "Champ birthDate signalé manquant");
  }

  // 8. Test Cohérence des Macronutriments
  console.log("\n--- 8. Cohérence mathématique de la répartition des macros ---");
  const macros = calculateMacroTargets(80, 2400, "weight_loss", DEFAULT_NUTRITION_SETTINGS);
  // Poids 80kg * 2.0g/kg = 160g Prot -> 640 kcal
  // Poids 80kg * 0.9g/kg = 72g Lip -> 648 kcal
  // Glucides restants: (2400 - (640 + 648)) / 4 = 1112 / 4 = 278g Carbs -> 1112 kcal
  // Total: 640 + 648 + 1112 = 2400 kcal
  assert(macros.proteinsGrams === 160, `Protéines 160g: obtenu ${macros.proteinsGrams}`);
  assert(macros.fatsGrams === 72, `Lipides 72g: obtenu ${macros.fatsGrams}`);
  assert(macros.carbsGrams === 278, `Glucides 278g: obtenu ${macros.carbsGrams}`);
  assert(macros.totalCalculatedCalories === 2400, `Total calories reconstitué = 2400`);

  // 9. Test Entitlements Numériques vs Abonnements Physiques
  console.log("\n--- 9. Entitlements : Séparation stricte Digital / Physique ---");
  // Scénario A : Membre avec formule physique club uniquement (Adult Essential sans entitlements digitaux)
  const physicalOnlySub: SubscriptionLike[] = [
    {
      id: "sub_1",
      status: "active",
      plan: {
        code: "adult_essential",
        tier: "premium_club",
        allows_small_group: true,
        entitlements: {
          nutrition: false,
          food_log: false,
          recipes_all: false,
          digital_programs: false,
          kb_shred_digital: false,
          advanced_stats: false,
        },
      },
    },
  ];

  const entA = computeMemberDigitalEntitlements(physicalOnlySub);
  assert(entA.hasPhysicalAccess === true, "Abonnement physique donne accès au club");
  assert(entA.canAccessNutritionEngine === false, "Abonnement physique seul NE DONNE PAS accès au moteur nutrition");
  assert(entA.canLogFoodJournal === false, "Abonnement physique seul NE DONNE PAS accès au journal alimentaire");
  assert(entA.canAccessDigitalPrograms === false, "Abonnement physique seul NE DONNE PAS accès aux programmes digitaux");

  // Scénario B : Membre avec formule Premium Digital
  const digitalSub: SubscriptionLike[] = [
    {
      id: "sub_2",
      status: "active",
      plan: {
        code: "digital_premium_monthly",
        tier: "premium_digital",
        allows_small_group: false,
        entitlements: {
          nutrition: true,
          food_log: true,
          recipes_all: true,
          digital_programs: true,
          kb_shred_digital: true,
          advanced_stats: true,
        },
      },
    },
  ];

  const entB = computeMemberDigitalEntitlements(digitalSub);
  assert(entB.hasPhysicalAccess === false, "Formule digitale ne donne pas accès aux réservations physiques");
  assert(entB.canAccessNutritionEngine === true, "Formule digitale donne accès à la nutrition");
  assert(entB.canLogFoodJournal === true, "Formule digitale donne accès au journal");
  assert(entB.canAccessKBShredDigital === true, "Formule digitale donne accès à KB Shred digital");

  // Scénario C : Membre avec formule Premium + Club (Cumul des deux)
  const hybridSubs: SubscriptionLike[] = [
    ...physicalOnlySub,
    ...digitalSub,
  ];

  const entC = computeMemberDigitalEntitlements(hybridSubs);
  assert(entC.hasPhysicalAccess === true, "Formule combinée : accès physique actif");
  assert(entC.canAccessNutritionEngine === true, "Formule combinée : accès digital nutrition actif");
  assert(entC.canAccessDigitalPrograms === true, "Formule combinée : programmes digitaux actifs");

  console.log("\n========================================================");
  console.log("TOUS LES TESTS UNITAIRES ONT RÉUSSI AVEC SUCCÈS !");
  console.log("========================================================\n");
}

runTests();
