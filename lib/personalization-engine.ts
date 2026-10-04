/**
 * MOTEUR DE PERSONNALISATION DYNAMIQUE STRIKING CAMP (Étape 6)
 *
 * Principes stricts d'architecture :
 * 1. Fonctions 100 % pures, déterministes, explicables ("Pourquoi ?") et testables unitairement.
 * 2. Aucune IA externe : logique déterministe basée sur les données réelles et l'historique.
 * 3. Aucune invention de données : gestion explicite du statut "insufficient_data".
 * 4. Respect absolu de la règle métier : booked !== completed.
 * 5. Respect strict des entitlements (Free / Premium Digital / Club).
 * 6. Adaptation respectueuse de la santé (pas de restriction brutale, alertes de prudence non médicales).
 */

import type {
  UserFitnessProfile,
  UserWeightLog,
  UserDailyFoodLog,
  UserSessionCompletion,
  WorkoutProgram,
  ProgramSession,
  Recipe,
  FitnessGoal,
  PrepTimePreference,
  PlanEntitlements,
  WeightTrajectoryResult,
  WeightTrajectoryStatus,
  TrainingAdherenceResult,
  TrainingAdherenceStatus,
  NutritionAdherenceResult,
  NutritionAdherenceStatus,
  MealFocusType,
  RecommendedMealFocus,
  RecommendedWeeklySession,
  PersonalizedWeeklyGuidance,
  PersonalizationContext,
} from "./supabase/defis-platform";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPERS DE DATE & DE CALCUL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function parseDateOnly(dateStr: string): Date {
  const clean = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
  const [y, m, d] = clean.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function getDaysDifference(d1: Date, d2: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round(Math.abs(d2.getTime() - d1.getTime()) / msPerDay);
}

function formatYYYYMMDD(date: Date): string {
  return date.toISOString().split("T")[0];
}

const DAY_LABELS = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. TRAJECTOIRE DU POIDS (evaluateWeightTrajectory)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Analyse la trajectoire du poids d'un membre sur une base mobile 7-14 jours.
 * Priorise la moyenne mobile pour éliminer le bruit hydrique journalier.
 */
export function evaluateWeightTrajectory(
  logs: UserWeightLog[] = [],
  profile: UserFitnessProfile | null,
  referenceDateStr?: string
): WeightTrajectoryResult {
  const goal: FitnessGoal = profile?.primary_goal || "weight_loss";
  const targetWeight = profile?.target_weight_kg ?? null;

  // Si moins de 2 pesées, données insuffisantes
  if (!logs || logs.length < 2) {
    const currentW = logs && logs.length === 1 ? logs[0].weight_kg : profile?.current_weight_kg || null;
    return {
      currentWeight: currentW,
      sevenDayAvg: currentW,
      previousAvg: null,
      deltaKg: null,
      weeklyRateKg: null,
      trend: "insufficient_data",
      remainingDistanceKg: targetWeight && currentW ? Number((targetWeight - currentW).toFixed(1)) : null,
      progressPercent: null,
      status: "insufficient_data",
      message: "Nous avons besoin d'au moins 2 pesées sur quelques jours pour calculer une trajectoire fiable.",
      isSufficientData: false,
    };
  }

  // Tri chronologique des pesées
  const sortedLogs = [...logs].sort(
    (a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime()
  );

  const refDate = referenceDateStr ? parseDateOnly(referenceDateStr) : parseDateOnly(sortedLogs[sortedLogs.length - 1].logged_at);
  const firstLog = sortedLogs[0];
  const lastLog = sortedLogs[sortedLogs.length - 1];

  const totalTimespanDays = getDaysDifference(parseDateOnly(firstLog.logged_at), refDate);

  // Si la plage totale est inférieure à 4 jours, les données restent insuffisantes pour une trajectoire hebdomadaire
  if (totalTimespanDays < 4) {
    const currentW = lastLog.weight_kg;
    return {
      currentWeight: currentW,
      sevenDayAvg: currentW,
      previousAvg: null,
      deltaKg: null,
      weeklyRateKg: null,
      trend: "insufficient_data",
      remainingDistanceKg: targetWeight ? Number((targetWeight - currentW).toFixed(1)) : null,
      progressPercent: null,
      status: "insufficient_data",
      message: "Poursuis tes pesées régulières pour établir ta première tendance hebdomadaire.",
      isSufficientData: false,
    };
  }

  // Découpage en 2 fenêtres : 7 derniers jours [ref - 6d, ref] et 7 jours précédents [ref - 13d, ref - 7d]
  const recentWindowStart = new Date(refDate.getTime() - 6 * 24 * 60 * 60 * 1000);
  const prevWindowStart = new Date(refDate.getTime() - 13 * 24 * 60 * 60 * 1000);

  const recentLogs = sortedLogs.filter((l) => {
    const d = parseDateOnly(l.logged_at);
    return d >= recentWindowStart && d <= refDate;
  });

  const prevLogs = sortedLogs.filter((l) => {
    const d = parseDateOnly(l.logged_at);
    return d >= prevWindowStart && d < recentWindowStart;
  });

  const currentWeight = lastLog.weight_kg;
  let sevenDayAvg: number;
  let previousAvg: number | null = null;
  let weeklyRateKg: number;
  let deltaKg: number;

  if (recentLogs.length > 0) {
    sevenDayAvg = Number((recentLogs.reduce((acc, l) => acc + l.weight_kg, 0) / recentLogs.length).toFixed(1));
  } else {
    sevenDayAvg = currentWeight;
  }

  if (prevLogs.length > 0) {
    previousAvg = Number((prevLogs.reduce((acc, l) => acc + l.weight_kg, 0) / prevLogs.length).toFixed(1));
    deltaKg = Number((sevenDayAvg - previousAvg).toFixed(2));
    weeklyRateKg = deltaKg; // Évolution entre 2 moyennes hebdomadaires = taux par semaine
  } else {
    // Calcul de repli basé sur le premier et dernier log disponible
    const daysBetween = Math.max(1, getDaysDifference(parseDateOnly(firstLog.logged_at), parseDateOnly(lastLog.logged_at)));
    const totalDiff = lastLog.weight_kg - firstLog.weight_kg;
    deltaKg = Number(totalDiff.toFixed(2));
    weeklyRateKg = Number(((totalDiff / daysBetween) * 7).toFixed(2));
  }

  // Tendance globale
  let trend: "losing" | "gaining" | "stable" | "insufficient_data" = "stable";
  if (weeklyRateKg <= -0.15) trend = "losing";
  else if (weeklyRateKg >= 0.15) trend = "gaining";

  // Distance restante et pourcentage de complétion
  let remainingDistanceKg: number | null = null;
  let progressPercent: number | null = null;

  if (targetWeight !== null) {
    remainingDistanceKg = Number(Math.abs(targetWeight - currentWeight).toFixed(1));
    const initialWeight = firstLog.weight_kg;
    const totalSpan = Math.abs(targetWeight - initialWeight);
    if (totalSpan > 0) {
      const currentAchieved = Math.abs(currentWeight - initialWeight);
      // Vérifier si on va dans le bon sens
      const isRightDirection =
        (goal === "weight_loss" && currentWeight <= initialWeight) ||
        (goal === "muscle_gain" && currentWeight >= initialWeight);
      if (isRightDirection) {
        progressPercent = Math.min(100, Math.max(0, Math.round((currentAchieved / totalSpan) * 100)));
      } else {
        progressPercent = 0;
      }
    }
  }

  // 1. Vérification Objectif Atteint
  if (targetWeight !== null) {
    if (goal === "weight_loss" && currentWeight <= targetWeight) {
      return {
        currentWeight,
        sevenDayAvg,
        previousAvg,
        deltaKg,
        weeklyRateKg,
        trend,
        remainingDistanceKg: 0,
        progressPercent: 100,
        status: "goal_reached",
        message: "Félicitations ! Ton objectif de poids est atteint. Place à la consolidation athlétique.",
        isSufficientData: true,
      };
    }
    if (goal === "muscle_gain" && currentWeight >= targetWeight) {
      return {
        currentWeight,
        sevenDayAvg,
        previousAvg,
        deltaKg,
        weeklyRateKg,
        trend,
        remainingDistanceKg: 0,
        progressPercent: 100,
        status: "goal_reached",
        message: "Félicitations ! Ton objectif de masse est atteint. Consolide tes acquis en maintien.",
        isSufficientData: true,
      };
    }
  }

  // 2. Évaluation par Objectif
  let status: WeightTrajectoryStatus = "on_track";
  let message = "Progression régulière et conforme.";

  if (goal === "weight_loss") {
    // Zone de référence : -0.4 à -0.8 kg/semaine
    if (weeklyRateKg < -1.2) {
      status = "too_fast";
      message =
        "Ta perte de poids récente est plus rapide que la trajectoire prévue (-1,2 kg/semaine). Évite de réduire davantage tes apports et surveille ton évolution.";
    } else if (weeklyRateKg <= -0.3 && weeklyRateKg >= -1.2) {
      status = "on_track";
      message = `Perte de poids optimale (${weeklyRateKg > 0 ? "+" : ""}${weeklyRateKg} kg/semaine). Trajectoire parfaitement maîtrisée.`;
    } else if (weeklyRateKg > -0.3 && weeklyRateKg <= -0.15) {
      status = "too_slow";
      message = "Perte de poids progressive mais légèrement inférieure au rythme cible.";
    } else {
      // Poids stable (taux > -0.15 kg/sem) ou légère prise
      status = "stagnating";
      message = "Poids stable sur la période. Une légère hausse d'activité ou un ajustement KB SHRED est proposé.";
    }
  } else if (goal === "muscle_gain") {
    // Zone de référence : +0.25 à +0.5 kg/semaine
    if (weeklyRateKg > 0.8) {
      status = "too_fast";
      message =
        "Prise de poids très rapide (+0,8 kg/semaine). Veille à maintenir un surplus modéré pour cibler le tissu musculaire.";
    } else if (weeklyRateKg >= 0.2 && weeklyRateKg <= 0.8) {
      status = "on_track";
      message = `Prise de masse musculaire propre et progressive (+${weeklyRateKg} kg/semaine).`;
    } else if (weeklyRateKg < 0.2 && weeklyRateKg >= -0.05) {
      status = "too_slow";
      message = "Progression lente. Priorise l'apport protéique, le surplus calorique et la surcharge à l'entraînement.";
    } else {
      status = "stagnating";
      message = "Poids en baisse ou stagnation. Assure-toi de consommer la totalité de tes calories cibles.";
    }
  } else {
    // Maintien ou Recomposition
    if (Math.abs(weeklyRateKg) <= 0.35) {
      status = "on_track";
      message = "Poids stabilisé avec précision conformément à l'objectif de maintien.";
    } else if (weeklyRateKg > 0.35) {
      status = "too_fast";
      message = "Légère tendance haussière au-delà de la zone de maintien.";
    } else {
      status = "too_fast";
      message = "Légère tendance baissière au-delà de la zone de maintien.";
    }
  }

  return {
    currentWeight,
    sevenDayAvg,
    previousAvg,
    deltaKg,
    weeklyRateKg,
    trend,
    remainingDistanceKg,
    progressPercent,
    status,
    message,
    isSufficientData: true,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. ADHÉRENCE AUX ENTRAÎNEMENTS (calculateTrainingAdherence)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Calcule l'adhérence sportive sur les 7 derniers jours.
 * RÈGLE ABSOLUE : booked !== completed. Les réservations futures ne comptent JAMAIS comme complétées.
 */
export function calculateTrainingAdherence(
  sessionCompletions: Array<{ completed_at: string; program_session_id?: string }> = [],
  clubBookings: Array<{ starts_at?: string; session_date?: string; status: string; attended_at?: string | null }> = [],
  targetWorkoutsPerWeek: number = 4,
  referenceDateStr?: string
): TrainingAdherenceResult {
  const target = Math.max(1, targetWorkoutsPerWeek || 4);
  const refDate = referenceDateStr ? parseDateOnly(referenceDateStr) : new Date();
  const windowStart = new Date(refDate.getTime() - 6 * 24 * 60 * 60 * 1000);

  // 1. Séances digitales complétées dans les 7 derniers jours
  const digitalCompletedCount = sessionCompletions.filter((c) => {
    if (!c.completed_at) return false;
    const d = parseDateOnly(c.completed_at);
    return d >= windowStart && d <= refDate;
  }).length;

  // 2. Séances physiques au club ASSISTÉES (status === 'attended' ou attended_at non nul)
  const clubAttendedCount = clubBookings.filter((b) => {
    const isAttended = b.status === "attended" || (b.attended_at !== undefined && b.attended_at !== null);
    if (!isAttended) return false;

    const dateStr = b.starts_at || b.session_date;
    if (!dateStr) return false;
    const d = parseDateOnly(dateStr);
    return d >= windowStart && d <= refDate;
  }).length;

  const totalCompleted = digitalCompletedCount + clubAttendedCount;
  const adherencePercent = Math.round((totalCompleted / target) * 100);

  let status: TrainingAdherenceStatus = "good";
  let message = `${totalCompleted} / ${target} séances réalisées cette semaine.`;

  if (adherencePercent >= 100) {
    status = "excellent";
    message = `Objectif hebdomadaire atteint (${totalCompleted}/${target} séances). Excellente régularité !`;
  } else if (adherencePercent >= 70) {
    status = "good";
    message = `Bonne régularité (${totalCompleted}/${target} séances). Plus que ${target - totalCompleted} séance(s) pour compléter la semaine.`;
  } else if (adherencePercent >= 40) {
    status = "low";
    message = `Adhérence modérée (${totalCompleted}/${target} séances). Priorise une courte session pour relancer la dynamique.`;
  } else {
    status = "very_low";
    message = `Faible volume (${totalCompleted}/${target} séances). Privilégie des séances courtes de 20-30 min pour réduire la friction.`;
  }

  return {
    targetSessions: target,
    completedSessions: totalCompleted,
    digitalCompletedCount,
    clubAttendedCount,
    adherencePercent,
    status,
    message,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. ADHÉRENCE NUTRITIONNELLE (calculateNutritionAdherence)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Analyse les journées alimentaires renseignées sur les 7 derniers jours.
 * Ne considère pas une journée vide comme parfaite.
 */
export function calculateNutritionAdherence(
  dailyFoodLogs: Array<UserDailyFoodLog | any> = [],
  targetCalories: number = 2000,
  targetProtein: number = 150,
  primaryGoal: FitnessGoal = "weight_loss",
  referenceDateStr?: string
): NutritionAdherenceResult {
  const refDate = referenceDateStr ? parseDateOnly(referenceDateStr) : new Date();
  const windowStart = new Date(refDate.getTime() - 6 * 24 * 60 * 60 * 1000);

  // Regroupement par jour
  const dayMap = new Map<string, { calories: number; protein: number }>();

  for (const item of dailyFoodLogs) {
    const logDate = item.log_date || item.date;
    if (!logDate) continue;

    const d = parseDateOnly(logDate);
    if (d < windowStart || d > refDate) continue;

    const existing = dayMap.get(logDate) || { calories: 0, protein: 0 };

    if (item.totalCalories !== undefined) {
      // Format DailyFoodLogSummary
      existing.calories += item.totalCalories || 0;
      existing.protein += item.totalProteinsGrams || 0;
    } else {
      // Format UserDailyFoodLog
      existing.calories += item.calories || 0;
      existing.protein += Number(item.proteins_g) || 0;
    }

    dayMap.set(logDate, existing);
  }

  // Filtrer les journées ayant au moins 400 kcal renseignées pour éliminer les logs fantômes
  const validDays = Array.from(dayMap.entries()).filter(([, data]) => data.calories >= 400);
  const loggedDays = validDays.length;

  if (loggedDays < 3) {
    return {
      averageCalories: loggedDays > 0 ? Math.round(validDays.reduce((a, [, d]) => a + d.calories, 0) / loggedDays) : null,
      targetCalories,
      averageProtein: loggedDays > 0 ? Number((validDays.reduce((a, [, d]) => a + d.protein, 0) / loggedDays).toFixed(1)) : null,
      targetProtein,
      loggedDays,
      adherencePercent: null,
      status: "insufficient_data",
      focus: "insufficient_data",
      message: "Renseigne ton journal alimentaire sur au moins 3 jours pour débloquer l'analyse nutritionnelle.",
    };
  }

  const avgCal = Math.round(validDays.reduce((a, [, d]) => a + d.calories, 0) / loggedDays);
  const avgProt = Number((validDays.reduce((a, [, d]) => a + d.protein, 0) / loggedDays).toFixed(1));

  // Calcul du score d'adhérence global (50 % calories, 50 % protéines)
  const calRatio = Math.min(1.5, avgCal / targetCalories);
  const calScore = Math.max(0, 100 - Math.abs(1 - calRatio) * 100);

  const protRatio = Math.min(1.2, avgProt / targetProtein);
  const protScore = Math.max(0, protRatio * 100);

  const adherencePercent = Math.min(100, Math.round((calScore * 0.5) + (protScore * 0.5)));

  // Détermination du focus nutritionnel
  let focus: MealFocusType = "balanced_meals";
  if (avgProt < targetProtein * 0.8) {
    focus = "prioritize_protein";
  } else if (primaryGoal === "weight_loss" && avgCal > targetCalories * 1.15) {
    focus = "calorie_control";
  } else if (primaryGoal === "muscle_gain" && avgCal < targetCalories * 0.9) {
    focus = "muscle_surplus";
  } else if (loggedDays < 5) {
    focus = "consistency";
  } else {
    focus = "balanced_meals";
  }

  let status: NutritionAdherenceStatus = "good";
  let message = `Moyenne de ${avgCal} kcal / jour sur ${loggedDays} jours renseignés.`;

  if (adherencePercent >= 85) {
    status = "excellent";
    message = "Excellente précision nutritionnelle : calories et protéines maîtrisées.";
  } else if (adherencePercent >= 65) {
    status = "good";
    message = "Bonne régularité nutritionnelle globale. Quelques ajustements recommandés.";
  } else {
    status = "low";
    message = "Écarts constatés par rapport à tes cibles caloriques ou protéiques.";
  }

  return {
    averageCalories: avgCal,
    targetCalories,
    averageProtein: avgProt,
    targetProtein,
    loggedDays,
    adherencePercent,
    status,
    focus,
    message,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. RECOMMANDATION NUTRITIONNELLE & RECETTES (recommendMealFocus)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Détermine le focus alimentaire et sélectionne des recettes accessibles selon les droits,
 * l'objectif, le temps de préparation souhaité, les macros cibles et la variété (historique).
 *
 * Règles & Priorités strictes :
 * Priorité 1 : Entitlements (Ne JAMAIS recommander une recette Premium sans droits).
 * Priorité 2 : Objectif du membre (weight_loss, muscle_gain, maintenance, recomposition).
 * Priorité 3 : Temps de préparation souhaité (quick ≤ 10 min, standard ≤ 20 min, flexible).
 * Priorité 4 : Focus nutritionnel et adéquation macronutritionnelle.
 * Priorité 5 : Variété & pénalisation des repas récemment consommés (historique food log).
 */
export function recommendMealFocus(
  focus: MealFocusType,
  availableRecipes: Recipe[] = [],
  entitlements: PlanEntitlements,
  primaryGoal: FitnessGoal = "weight_loss",
  prepTimePreference: PrepTimePreference = "flexible",
  recentDailyFoodLogs: Array<{ recipe_id?: string | null; food_name?: string; log_date?: string; [key: string]: any }> = [],
  targetNutrition?: { targetCalories: number; targetProtein: number } | null
): RecommendedMealFocus {
  // Priorité 1 : Filtrage strict par entitlement et statut actif
  const accessibleRecipes = availableRecipes.filter((r) => {
    if (!r.is_active) return false;
    if (r.is_premium && !entitlements.recipes_all) return false;
    return true;
  });

  let title = "Équilibre & Régularité";
  let description = "Maintiens tes repas structurés avec des apports complets.";
  let actionableTip = "Assure-toi de consommer une portion de légumes et une source de protéines à chaque repas.";

  switch (focus) {
    case "prioritize_protein":
      title = "Renforcer l'Apport en Protéines";
      description = "Ton apport protéique moyen est en dessous de la cible recommandée pour préserver ta masse musculaire.";
      actionableTip = "Ajoute une source protéique dès le petit-déjeuner (fromage blanc, œufs, poulet, saumon) et vise 30-40 g par repas principal.";
      break;

    case "calorie_control":
      title = "Contrôle des Apports Caloriques";
      description = "Tes calories moyennes dépassent légèrement la zone de déficit prévue pour la perte de poids.";
      actionableTip = "Privilégie les salades/bowls à haute satiété et faible densité calorique (volaille, thon, légumes verts, agrumes).";
      break;

    case "muscle_surplus":
      title = "Optimiser le Surplus Calorigène";
      description = "Ton apport calorique est trop faible pour stimuler une prise de masse musculaire optimale.";
      actionableTip = "Intègre des graisses saines et des féculents digestes (beurre de cacahuète, avocat, riz complet, pâtes complètes, avoine).";
      break;

    case "consistency":
      title = "Régularité du Suivi Alimentaire";
      description = "Il manque quelques jours de saisie pour affiner la personnalisation de tes macronutriments.";
      actionableTip = "Prends 1 minute après chaque repas pour noter tes aliments dans le journal.";
      break;

    case "insufficient_data":
      title = "Premiers Pas Nutritionnels";
      description = "Renseigne tes premiers repas pour que nous puissions adapter tes suggestions.";
      actionableTip = "Commence par enregistrer ton petit-déjeuner et ton déjeuner d'aujourd'hui.";
      break;

    case "balanced_meals":
    default:
      if (primaryGoal === "weight_loss") {
        title = "Déficit Contrôlé & Satiété";
        description = "Ta répartition nutritionnelle est harmonieuse. Continue sur cette régularité.";
        actionableTip = "Varie tes sources de micronutriments et hydrate-toi avec au moins 2L d'eau par jour.";
      } else if (primaryGoal === "recomposition") {
        title = "Recomposition Corporelle & Densité Protéique";
        description = "Maintiens un apport protéique élevé et une dépense énergétique active.";
        actionableTip = "Privilégie les bowls riches en protéines avec féculents complets à index glycémique modéré.";
      } else if (primaryGoal === "muscle_gain") {
        title = "Surplus Propre & Performance";
        description = "Apports réguliers pour nourrir la synthèse musculaire et l'intensité d'entraînement.";
        actionableTip = "Répartis tes apports en 3 repas solides et 1 collation post-effort riche en protéines.";
      } else {
        title = "Nutrition Performance & Maintien";
        description = "Équilibre parfait entre glucides, protéines et lipides de haute qualité.";
        actionableTip = "Conserve ta diversité alimentaire avec légumes de saison et protéines de qualité.";
      }
      break;
  }

  // Historique des recettes consommées récemment pour la pénalisation de redondance (Priorité 5)
  const recentRecipeIds = new Set<string>();
  const recentRecipeNames = new Set<string>();
  for (const log of recentDailyFoodLogs) {
    if (log.recipe_id) recentRecipeIds.add(log.recipe_id);
    if (log.food_name) recentRecipeNames.add(log.food_name.toLowerCase().trim());
  }

  // Scoring déterministe de chaque recette accessible
  const scoredRecipes = accessibleRecipes.map((recipe) => {
    let score = 0;

    // Priorité 2 : Adéquation avec l'objectif
    if (recipe.target_goal === primaryGoal) {
      score += 50;
    } else if (recipe.target_goal === "both" || recipe.target_goal === "all") {
      score += 40;
    } else if (primaryGoal === "recomposition") {
      if (recipe.target_goal === "weight_loss" || recipe.target_goal === "muscle_gain") {
        score += 30;
      }
    } else if (primaryGoal === "maintenance") {
      score += 25;
    } else {
      score += 10;
    }

    // Priorité 3 : Temps de préparation souhaité
    if (prepTimePreference === "quick") {
      if (recipe.prep_time_minutes <= 10) {
        score += 60;
      } else if (recipe.prep_time_minutes <= 15) {
        score += 15;
      } else {
        score -= 40;
      }
    } else if (prepTimePreference === "standard") {
      if (recipe.prep_time_minutes <= 20) {
        score += 40;
      } else {
        score -= 25;
      }
    }

    // Priorité 4 : Focus & Macros
    if (focus === "prioritize_protein" || primaryGoal === "recomposition") {
      if (recipe.proteins_g >= 30 || (recipe.tags && recipe.tags.includes("high_protein"))) {
        score += 35;
      }
      const proteinCalRatio = (recipe.proteins_g * 4) / Math.max(1, recipe.calories);
      score += Math.round(proteinCalRatio * 30);
    } else if (focus === "calorie_control" || primaryGoal === "weight_loss") {
      if (recipe.calories <= 450 || (recipe.tags && (recipe.tags.includes("satiety") || recipe.tags.includes("low_fat")))) {
        score += 35;
      }
      if (recipe.calories > 580) {
        score -= 30;
      }
    } else if (focus === "muscle_surplus" || primaryGoal === "muscle_gain") {
      if (recipe.calories >= 450 && recipe.proteins_g >= 25) {
        score += 40;
      }
      if (recipe.tags && (recipe.tags.includes("muscle_gain") || recipe.tags.includes("energy"))) {
        score += 25;
      }
    } else {
      // balanced_meals / maintenance
      if (recipe.calories >= 250 && recipe.calories <= 550) {
        score += 30;
      }
      if (recipe.tags && (recipe.tags.includes("balanced") || recipe.tags.includes("clean_eating"))) {
        score += 20;
      }
    }

    // Priorité 5 : Pénalité d'historique récent (anti-répétition)
    const isRecentlyLogged =
      recentRecipeIds.has(recipe.id) ||
      recentRecipeNames.has(recipe.title.toLowerCase().trim());
    if (isRecentlyLogged) {
      score -= 75; // Fortement pénalisé pour favoriser la découverte d'autres recettes
    }

    return { recipe, score };
  });

  // Tri par score décroissant
  scoredRecipes.sort((a, b) => b.score - a.score);

  // Sélection variée (Diversification des catégories : petit-déjeuner, bowl/salade, collation)
  const selected: Recipe[] = [];
  const usedCategories = new Set<string>();

  // 1ère passe : Sélectionner les meilleures recettes en diversifiant les catégories
  for (const item of scoredRecipes) {
    if (selected.length >= 3) break;
    if (!usedCategories.has(item.recipe.category)) {
      selected.push(item.recipe);
      usedCategories.add(item.recipe.category);
    }
  }

  // 2ème passe : Compléter si nécessaire jusqu'à 3 recettes avec les meilleurs scores restants
  for (const item of scoredRecipes) {
    if (selected.length >= 3) break;
    if (!selected.some((r) => r.id === item.recipe.id)) {
      selected.push(item.recipe);
    }
  }

  // Repli de sécurité si aucune recette trouvée
  const finalRecipes = selected.length > 0 ? selected : accessibleRecipes.slice(0, 3);

  return {
    focus,
    title,
    description,
    actionableTip,
    recommendedRecipes: finalRecipes,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 5. RECOMMANDATION DES SÉANCES (recommendWeeklySessions)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Construit le planning des séances de la semaine basé sur les programmes réels en base,
 * l'environnement du membre, son matériel, son adhérence et ses réservations club.
 * Ne JAMAIS inventer un programme.
 */
export function recommendWeeklySessions(
  availablePrograms: WorkoutProgram[] = [],
  profile: UserFitnessProfile | null,
  adherence: TrainingAdherenceResult,
  entitlements: PlanEntitlements,
  clubBookings: Array<{ starts_at?: string; session_date?: string; status: string; discipline?: string; title?: string }> = [],
  referenceDateStr?: string
): RecommendedWeeklySession[] {
  const refDate = referenceDateStr ? parseDateOnly(referenceDateStr) : new Date();

  // Filtrer les programmes accessibles selon les entitlements
  const accessiblePrograms = availablePrograms.filter((p) => {
    if (!p.is_active) return false;
    if (p.is_premium && !entitlements.digital_programs) return false;
    return true;
  });

  const env = profile?.training_environment || "hybrid";
  const goal = profile?.primary_goal || "weight_loss";
  const targetWorkouts = profile?.target_workouts_per_week || 4;

  // Trouver les programmes les plus adaptés
  const matchingProgram =
    accessiblePrograms.find((p) => p.location === env && (p.primary_goal === goal || p.primary_goal === "both")) ||
    accessiblePrograms.find((p) => p.location === env) ||
    accessiblePrograms.find((p) => p.primary_goal === goal) ||
    accessiblePrograms[0] ||
    null;

  const kbShredProg = accessiblePrograms.find((p) => p.is_kb_shred) || null;

  // Calcul du lundi de la semaine en cours
  const dayOfWeek = refDate.getUTCDay(); // 0 = Dimanche, 1 = Lundi
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const mondayDate = new Date(refDate.getTime() - daysSinceMonday * 24 * 60 * 60 * 1000);

  // Distribution des jours selon la fréquence cible (ex : 3 -> Lun, Mer, Ven / 4 -> Lun, Mar, Jeu, Sam)
  const scheduledDaysMap: Record<number, number[]> = {
    1: [1],
    2: [2, 5],
    3: [1, 3, 5],
    4: [1, 2, 4, 6],
    5: [1, 2, 3, 5, 6],
    6: [1, 2, 3, 4, 5, 6],
    7: [1, 2, 3, 4, 5, 6, 7],
  };

  const targetDayIndices = scheduledDaysMap[Math.min(7, Math.max(1, targetWorkouts))] || [1, 3, 5, 6];

  const weeklySessions: RecommendedWeeklySession[] = [];

  // Vérifier les réservations club de la semaine en cours
  const weekClubBookings = clubBookings.filter((b) => {
    const dStr = b.starts_at || b.session_date;
    if (!dStr) return false;
    const d = parseDateOnly(dStr);
    const diff = (d.getTime() - mondayDate.getTime()) / (24 * 60 * 60 * 1000);
    return diff >= 0 && diff < 7 && b.status !== "cancelled";
  });

  for (let i = 0; i < 7; i++) {
    const currentDayIndex = i + 1; // 1 to 7
    const currentDayDate = new Date(mondayDate.getTime() + i * 24 * 60 * 60 * 1000);
    const dateStr = formatYYYYMMDD(currentDayDate);
    const dayLabel = DAY_LABELS[i];

    // Vérifier si une réservation club existe ce jour
    const clubBookingToday = weekClubBookings.find((b) => {
      const bDate = (b.starts_at || b.session_date || "").split("T")[0];
      return bDate === dateStr;
    });

    if (clubBookingToday) {
      weeklySessions.push({
        dayIndex: currentDayIndex,
        dayLabel,
        sessionTitle: clubBookingToday.discipline || clubBookingToday.title || "Séance Club Striking Camp",
        programTitle: "Striking Camp Marseille (13010)",
        durationMinutes: 60,
        location: "club",
        isClubSession: true,
        isKbShred: (clubBookingToday.discipline || "").toLowerCase().includes("shred"),
        isCompleted: clubBookingToday.status === "attended",
        isBookedClub: true,
        reason: "Séance physique réservée au club.",
      });
      continue;
    }

    // Si ce jour fait partie des jours programmés
    if (targetDayIndices.includes(currentDayIndex)) {
      // Si très faible adhérence, réduire la friction avec une séance courte
      const isFrictionReduction = adherence.status === "very_low";

      // Alternance intelligente avec KB SHRED si applicable
      const shouldUseKbShred =
        kbShredProg &&
        entitlements.kb_shred_digital &&
        (currentDayIndex === 2 || currentDayIndex === 6 || isFrictionReduction);

      const activeProg = shouldUseKbShred ? kbShredProg : matchingProgram;
      const sessionCount = activeProg?.sessions?.length || 1;
      const sessionIndex = (currentDayIndex - 1) % sessionCount;
      const session = activeProg?.sessions?.[sessionIndex];

      weeklySessions.push({
        dayIndex: currentDayIndex,
        dayLabel,
        programId: activeProg?.id,
        programTitle: activeProg?.title || "Programme Signature",
        sessionId: session?.id,
        sessionTitle: session?.title || (isFrictionReduction ? "Circuit Reprise 20 min" : "Séance Fondations"),
        durationMinutes: isFrictionReduction ? 20 : session?.duration_minutes || 45,
        location: activeProg?.location || env || "home",
        isClubSession: false,
        isKbShred: Boolean(activeProg?.is_kb_shred),
        isCompleted: Boolean(session?.is_completed),
        isBookedClub: false,
        reason: isFrictionReduction
          ? "Séance courte 20-30 min pour reconstruire ta régularité sans fatigue excessive."
          : "Séance programmée dans ton cycle d'entraînement hebdomadaire.",
      });
    }
  }

  return weeklySessions;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 6. BUILD WEEKLY GUIDANCE (Point d'entrée principal)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Construit la synthèse de guidage hebdomadaire personnalisée, déterministe et explicable.
 */
export function buildWeeklyGuidance(context: PersonalizationContext): PersonalizedWeeklyGuidance {
  const {
    profile,
    weightLogs = [],
    dailyFoodLogs = [],
    sessionCompletions = [],
    clubBookings = [],
    availablePrograms = [],
    availableRecipes = [],
    entitlements,
    targetNutrition,
    referenceDate,
  } = context;

  const goal: FitnessGoal = profile?.primary_goal || "weight_loss";
  const targetCalories = targetNutrition?.targetCalories || 2000;
  const targetProtein = targetNutrition?.targetProtein || 150;

  // Calcul du début de la semaine (Lundi)
  const refDate = referenceDate ? parseDateOnly(referenceDate) : new Date();
  const dayOfWeek = refDate.getUTCDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const mondayDate = new Date(refDate.getTime() - daysSinceMonday * 24 * 60 * 60 * 1000);
  const weekStart = formatYYYYMMDD(mondayDate);

  // 1. Évaluation du poids
  const weightTrajectory = evaluateWeightTrajectory(weightLogs, profile, referenceDate);

  // 2. Évaluation de l'adhérence sportive
  const trainingAdherence = calculateTrainingAdherence(
    sessionCompletions,
    clubBookings,
    profile?.target_workouts_per_week || 4,
    referenceDate
  );

  // 3. Évaluation de l'adhérence nutritionnelle
  const nutritionAdherence = calculateNutritionAdherence(
    dailyFoodLogs,
    targetCalories,
    targetProtein,
    goal,
    referenceDate
  );

  // 4. Focus Nutrition & Recettes personnalisées (Objectif, Temps, Macros, Variété)
  const prepTimePref = profile?.prep_time_preference || "flexible";
  const mealFocus = recommendMealFocus(
    nutritionAdherence.focus,
    availableRecipes,
    entitlements,
    goal,
    prepTimePref,
    dailyFoodLogs,
    targetNutrition
  );

  // 5. Recommandation des séances
  const recommendedSessions = recommendWeeklySessions(
    availablePrograms,
    profile,
    trainingAdherence,
    entitlements,
    clubBookings,
    referenceDate
  );

  // 6. Éligibilité et recommandation KB SHRED
  const hasKbShredEquipment = (profile?.available_equipment || []).includes("kettlebell");
  const isEligibleKbShred = Boolean(entitlements.kb_shred_digital || entitlements.hasPhysicalAccess);
  let kbShredRecommended = false;
  let kbShredReason = "Disponible en option pour dynamiser ton métabolisme.";

  if (isEligibleKbShred) {
    if (weightTrajectory.status === "stagnating" && trainingAdherence.status !== "very_low") {
      kbShredRecommended = true;
      kbShredReason = "Recommandé cette semaine : ajoute une séance courte KB SHRED pour relancer la dépense métabolique sans restreindre davantage tes calories.";
    } else if (goal === "recomposition" || hasKbShredEquipment) {
      kbShredRecommended = true;
      kbShredReason = "Idéal pour combiner renforcement haute intensité et brûlage calorique.";
    }
  }

  // 7. Détermination de la priorité et des explications ("Pourquoi ?")
  const explanationDetails: string[] = [];
  const warnings: string[] = [];
  let priority: PersonalizedWeeklyGuidance["priority"] = "consistency";
  let priorityTitle = "Maintenir le Rythme";

  if (!profile) {
    priority = "onboarding";
    priorityTitle = "Configuration Initiale";
    explanationDetails.push("Ton profil fitness n'est pas encore complété.");
    explanationDetails.push("Définis ton objectif pour débloquer les calculs nutritionnels et le programme sur mesure.");
  } else {
    // Fait 1 : Entraînement
    explanationDetails.push(
      `Tu vises ${trainingAdherence.targetSessions} séances par semaine. Tu en as validé ${trainingAdherence.completedSessions} sur les 7 derniers jours.`
    );

    // Fait 2 : Trajectoire Poids
    if (weightTrajectory.isSufficientData && weightTrajectory.weeklyRateKg !== null) {
      explanationDetails.push(
        `Ta trajectoire de poids affiche ${weightTrajectory.weeklyRateKg > 0 ? "+" : ""}${weightTrajectory.weeklyRateKg} kg/semaine (${weightTrajectory.message}).`
      );
    } else {
      explanationDetails.push("Historique de poids en cours de constitution (pesées supplémentaires recommandées).");
    }

    // Fait 3 : Nutrition
    if (nutritionAdherence.status !== "insufficient_data" && nutritionAdherence.averageCalories !== null) {
      explanationDetails.push(
        `Apports moyens observés : ${nutritionAdherence.averageCalories} kcal et ${nutritionAdherence.averageProtein} g de protéines sur ${nutritionAdherence.loggedDays} jours renseignés.`
      );
    }

    // Alertes de sécurité / prudence
    if (weightTrajectory.status === "too_fast" && goal === "weight_loss") {
      warnings.push(
        "Perte rapide constatée (< -1,2 kg/semaine). Évite tout déficit calorique excessif pour préserver ton intégrité musculaire et ton énergie."
      );
      priority = "recovery";
      priorityTitle = "Modération & Récupération";
    } else if (trainingAdherence.status === "very_low") {
      priority = "consistency";
      priorityTitle = "Réduire la Friction";
      explanationDetails.push("Séances courtes de 20-30 min privilégiées cette semaine pour relancer ta routine en douceur.");
    } else if (weightTrajectory.status === "stagnating" && trainingAdherence.status === "excellent") {
      priority = "training";
      priorityTitle = "Boost Métabolique";
      explanationDetails.push("Stagnation constatée malgré une haute assiduité : stimulation supplémentaire via KB SHRED suggérée.");
    } else if (nutritionAdherence.focus === "prioritize_protein") {
      priority = "nutrition";
      priorityTitle = "Focus Protéines";
    } else {
      priority = "training";
      priorityTitle = "Progression Continue";
    }
  }

  const whyText =
    priority === "onboarding"
      ? "Configure ton profil pour lancer ta personnalisation."
      : `Guidance construite sur l'analyse de tes ${trainingAdherence.completedSessions} séance(s) récente(s) et ta trajectoire de poids actuelle.`;

  const isInsufficientData = !profile || (!weightTrajectory.isSufficientData && nutritionAdherence.status === "insufficient_data");

  const goalLabels: Record<FitnessGoal, string> = {
    weight_loss: "Perte de Poids",
    muscle_gain: "Gain Musculaire",
    maintenance: "Maintien Athlétique",
    recomposition: "Recomposition Corporelle",
  };

  return {
    weekStart,
    objective: goal,
    objectiveLabel: goalLabels[goal] || "Perte de Poids",
    weightTrajectory,
    trainingAdherence,
    nutritionAdherence,
    recommendedSessions,
    mealFocus,
    kbShredRecommendation: {
      eligible: isEligibleKbShred,
      recommended: kbShredRecommended,
      reason: kbShredReason,
    },
    priority,
    priorityTitle,
    explanation: {
      why: whyText,
      details: explanationDetails,
    },
    warnings,
    isInsufficientData,
  };
}
