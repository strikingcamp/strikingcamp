/**
 * MOTEUR NUTRITIONNEL DÉTERMINISTE STRIKING CAMP (V1)
 *
 * Principes & Spécifications :
 * 1. Formule de calcul BMR : Mifflin-St Jeor exclusivement pour la V1.
 * 2. Découpage en fonctions pures, déterministes et isolées pour les tests unitaires.
 * 3. Paramètres métier dynamiques configurables via `nutrition_platform_settings`.
 * 4. Alertes techniques (protection sans affirmation médicale).
 * 5. Gestion des surcharges manuelles (custom values) avec traçabilité de la source ("calculated" | "custom").
 * 6. Détection et rapport strict des données manquantes (zéro valeur inventée).
 */

import type {
  FitnessGender,
  FitnessGoal,
  ActivityLevel,
  NutritionPlatformSettings,
} from "./supabase/defis-platform";
import { DEFAULT_NUTRITION_SETTINGS } from "./supabase/defis-platform";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COEFFICIENTS D'ACTIVITÉ PHYSIQUE (TDEE)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2, // Peu ou pas d'exercice
  light: 1.375, // Exercice léger (1-3 jours/semaine)
  moderate: 1.55, // Entraînement modéré (3-5 jours/semaine)
  very_active: 1.725, // Entraînement intense (6-7 jours/semaine)
  extra_active: 1.9, // Entraînement biquotidien / sportif d'élite
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INTERFACES DU MOTEUR
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface NutritionPlanInput {
  gender?: FitnessGender | null;
  birthDate?: string | Date | null;
  ageYears?: number | null;
  heightCm?: number | null;
  currentWeightKg?: number | null;
  targetWeightKg?: number | null;
  activityLevel?: ActivityLevel | null;
  primaryGoal?: FitnessGoal | null;
  targetWorkoutsPerWeek?: number | null;

  // Surcharges manuelles facultatives
  customTargetCalories?: number | null;
  customTargetProteins?: number | null;
  customTargetCarbs?: number | null;
  customTargetFats?: number | null;
}

export type ValueSource = "calculated" | "custom";

export interface MacroDetail {
  grams: number;
  calories: number;
  percentage: number;
  source: ValueSource;
}

export interface NutritionPlanSuccess {
  status: "success";
  age: number;
  bmr: number;
  tdee: number;
  goal: FitnessGoal;
  targetCalories: {
    value: number;
    source: ValueSource;
    deltaFromTdee: number;
  };
  macros: {
    proteins: MacroDetail;
    carbs: MacroDetail;
    fats: MacroDetail;
    totalCalculatedCalories: number;
  };
  technicalAlert: {
    requires_review: boolean;
    technicalFloor: number;
    message?: string;
  };
  disclaimer: string;
}

export interface NutritionPlanMissingData {
  status: "missing_data";
  missingFields: string[];
  message: string;
}

export type NutritionPlanResult = NutritionPlanSuccess | NutritionPlanMissingData;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. CALCUL DE L'ÂGE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Calcule l'âge exact en années révolues à partir d'une date de naissance (source unique).
 */
export function calculateAge(
  birthDate: string | Date | null | undefined,
  referenceDate: Date = new Date()
): number | null {
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. CALCUL DU MÉTABOLISME DE BASE (BMR — MIFFLIN-ST JEOR)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Formule Mifflin-St Jeor :
 * Homme  : 10 * poids(kg) + 6.25 * taille(cm) - 5 * âge + 5
 * Femme  : 10 * poids(kg) + 6.25 * taille(cm) - 5 * âge - 161
 * Autre  : Moyenne neutre des deux formules
 */
export function calculateBMR(
  gender: FitnessGender,
  weightKg: number,
  heightCm: number,
  ageYears: number
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  if (gender === "male") {
    return Math.round(base + 5);
  }
  if (gender === "female") {
    return Math.round(base - 161);
  }
  // Sexe neutre/autre : moyenne arithmétique
  return Math.round(base - 78);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. CALCUL DE LA DÉPENSE ÉNERGÉTIQUE TOTALE (TDEE)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * TDEE = BMR * Multiplicateur d'activité
 */
export function calculateTDEE(
  bmr: number,
  activityLevel: ActivityLevel,
  customMultipliers: Partial<Record<ActivityLevel, number>> = {}
): number {
  const multiplier = customMultipliers[activityLevel] ?? ACTIVITY_MULTIPLIERS[activityLevel] ?? 1.55;
  return Math.round(bmr * multiplier);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. CALCUL DE LA CIBLE CALORIQUE SELON L'OBJECTIF
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Calcule le besoin énergétique selon l'objectif et évalue l'alerte technique.
 */
export function calculateCalorieTarget(
  tdee: number,
  goal: FitnessGoal,
  gender: FitnessGender,
  config: NutritionPlatformSettings = DEFAULT_NUTRITION_SETTINGS
): {
  calories: number;
  deltaFromTdee: number;
  requires_review: boolean;
  technicalFloor: number;
} {
  let delta = 0;
  switch (goal) {
    case "weight_loss":
      delta = config.weight_loss_caloric_delta; // Ex: -400
      break;
    case "muscle_gain":
      delta = config.muscle_gain_caloric_delta; // Ex: +300
      break;
    case "maintenance":
    case "recomposition":
      delta = config.maintenance_caloric_delta; // Ex: 0
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 5. CALCUL DES MACRONUTRIMENTS (PROTÉINES, LIPIDES, GLUCIDES)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Répartition des macros :
 * 1. Protéines : ratio g/kg selon l'objectif (4 kcal/g)
 * 2. Lipides : ratio g/kg selon l'objectif (9 kcal/g)
 * 3. Glucides : solde calorique restant (4 kcal/g)
 */
export function calculateMacroTargets(
  weightKg: number,
  targetCalories: number,
  goal: FitnessGoal,
  config: NutritionPlatformSettings = DEFAULT_NUTRITION_SETTINGS
): {
  proteinsGrams: number;
  fatsGrams: number;
  carbsGrams: number;
  proteinsKcal: number;
  fatsKcal: number;
  carbsKcal: number;
  totalCalculatedCalories: number;
} {
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
      proteinRatio = config.protein_ratio_weight_loss; // Maintien élevé de protéines
      fatRatio = config.fat_ratio_maintenance;
      break;
    case "maintenance":
    default:
      proteinRatio = config.protein_ratio_maintenance;
      fatRatio = config.fat_ratio_maintenance;
      break;
  }

  // 1. Protéines
  const proteinsGrams = Math.round(weightKg * proteinRatio);
  const proteinsKcal = proteinsGrams * 4;

  // 2. Lipides
  const fatsGrams = Math.round(weightKg * fatRatio);
  const fatsKcal = fatsGrams * 9;

  // 3. Glucides (Solde restant)
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 6. PLAN NUTRITIONNEL COMPLET & MODULAIRE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Fonction principale orchestrant la validation des données, le calcul déterministe
 * et la gestion des personnalisations manuelles.
 */
export function calculateNutritionPlan(
  input: NutritionPlanInput,
  customConfig?: Partial<NutritionPlatformSettings>
): NutritionPlanResult {
  const config: NutritionPlatformSettings = {
    ...DEFAULT_NUTRITION_SETTINGS,
    ...customConfig,
  };

  // 1. Validation stricte des données requises (zéro valeur inventée)
  const missingFields: string[] = [];

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

  // Casts sécurisés après validation
  const validGender = input.gender as FitnessGender;
  const validWeight = Number(input.currentWeightKg);
  const validHeight = Number(input.heightCm);
  const validAge = Number(age);
  const validGoal: FitnessGoal = input.primaryGoal || "weight_loss";
  const validActivity: ActivityLevel = input.activityLevel || "moderate";

  // 2. Calculs BMR & TDEE
  const bmr = calculateBMR(validGender, validWeight, validHeight, validAge);
  const tdee = calculateTDEE(bmr, validActivity);

  // 3. Cible calorique (Calculée vs Personnalisée)
  const autoTarget = calculateCalorieTarget(tdee, validGoal, validGender, config);
  const hasCustomCalories = typeof input.customTargetCalories === "number" && input.customTargetCalories > 0;
  const finalCalories = hasCustomCalories ? Math.round(input.customTargetCalories!) : autoTarget.calories;
  const caloriesSource: ValueSource = hasCustomCalories ? "custom" : "calculated";

  // 4. Macronutriments (Calculés vs Personnalisés)
  const autoMacros = calculateMacroTargets(validWeight, finalCalories, validGoal, config);

  const hasCustomProteins = typeof input.customTargetProteins === "number" && input.customTargetProteins > 0;
  const hasCustomCarbs = typeof input.customTargetCarbs === "number" && input.customTargetCarbs > 0;
  const hasCustomFats = typeof input.customTargetFats === "number" && input.customTargetFats > 0;

  const finalProteinsGrams = hasCustomProteins ? Math.round(input.customTargetProteins!) : autoMacros.proteinsGrams;
  const finalCarbsGrams = hasCustomCarbs ? Math.round(input.customTargetCarbs!) : autoMacros.carbsGrams;
  const finalFatsGrams = hasCustomFats ? Math.round(input.customTargetFats!) : autoMacros.fatsGrams;

  const proteinsKcal = finalProteinsGrams * 4;
  const carbsKcal = finalCarbsGrams * 4;
  const fatsKcal = finalFatsGrams * 9;
  const totalCalculatedCalories = proteinsKcal + carbsKcal + fatsKcal;

  const proteinsPercentage = totalCalculatedCalories > 0 ? Math.round((proteinsKcal / totalCalculatedCalories) * 100) : 0;
  const carbsPercentage = totalCalculatedCalories > 0 ? Math.round((carbsKcal / totalCalculatedCalories) * 100) : 0;
  const fatsPercentage = totalCalculatedCalories > 0 ? Math.round((fatsKcal / totalCalculatedCalories) * 100) : 0;

  // 5. Alerte technique de protection
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
