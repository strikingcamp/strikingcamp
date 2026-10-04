/**
 * SUITE DE TESTS UNITAIRES — MOTEUR DE RAPPELS STRIKING CAMP (ÉTAPE 3)
 *
 * Scénarios vérifiés :
 * 1. Repas non consommé à l'heure prévue -> rappel éligible
 * 2. Repas déjà consommé -> aucun rappel
 * 3. enabled_meals = false -> aucun rappel
 * 4. enabled_global = false -> aucun rappel
 * 5. Séance digitale prévue mais non terminée -> rappel éligible
 * 6. Séance digitale déjà terminée -> aucun rappel
 * 7. Aucun entraînement prévu aujourd'hui -> aucun rappel
 * 8. Cours physique réservé -> rappel éligible dans la fenêtre H-2
 * 9. Cours physique déjà passé -> aucun rappel
 * 10. Notification déjà envoyée -> aucun doublon
 * 11. Fuseau Europe/Paris correctement pris en compte
 * 12. Cas où aucune préférence utilisateur n'existe encore -> valeurs par défaut
 */

import {
  evaluateMealReminder,
  evaluateDigitalWorkoutReminder,
  evaluateClubWorkoutReminder,
  evaluateAllReminders,
  getEligibleReminders,
  getZonedTimeDetails,
  hasRecentNotification,
  parseTimeToMinutes,
} from "../lib/notifications/reminder-engine.ts";

let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ÉCHEC : ${message}`);
    failedCount++;
    throw new Error(message);
  } else {
    console.log(`✅ SUCCÈS : ${message}`);
    passedCount++;
  }
}

async function runTests() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("   SUITE DE TESTS : MOTEUR DE RAPPELS (REMINDER ENGINE)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const userId = "u1111111-1111-4111-8111-111111111111";

  // Date de référence : Lundi 5 Octobre 2026 à 12:35 (Heure de Paris = 10:35 UTC)
  const mondayNoonUtc = new Date("2026-10-05T10:35:00Z"); // 12h35 Paris (Lundi)

  // 1. Repas non consommé à l'heure prévue (Déjeuner à 12h30, il est 12h35) -> éligible
  {
    const res = evaluateMealReminder("meal_lunch", {
      userId,
      currentTime: mondayNoonUtc,
      preferences: {
        id: "p1",
        user_id: userId,
        enabled_global: true,
        enabled_meals: true,
        enabled_workouts: true,
        enabled_hydration: false,
        reminder_breakfast_time: "08:00:00",
        reminder_lunch_time: "12:30:00",
        reminder_dinner_time: "19:30:00",
        reminder_snack_time: "16:30:00",
        reminder_workout_time: "18:00:00",
        timezone: "Europe/Paris",
      },
      dailyFoodLogsToday: [], // Aucun repas saisi
      recentLogsToday: [],
    });

    assert(res.shouldSend === true, "1. Repas non consommé dans la fenêtre horaire -> shouldSend === true");
    assert(res.category === "meal_lunch", "1. Catégorie correcte (meal_lunch)");
  }

  // 2. Repas déjà consommé -> aucun rappel
  {
    const res = evaluateMealReminder("meal_lunch", {
      userId,
      currentTime: mondayNoonUtc,
      preferences: null, // Test avec valeurs par défaut
      dailyFoodLogsToday: [{ meal_type: "lunch", food_name: "Bowl Poulet Quinoa" }],
      recentLogsToday: [],
    });

    assert(res.shouldSend === false, "2. Repas déjà consommé -> shouldSend === false");
    assert(res.reason.includes("déjà été enregistré"), "2. Raison explicite sur le repas logué");
  }

  // 3. enabled_meals = false -> aucun rappel
  {
    const res = evaluateMealReminder("meal_lunch", {
      userId,
      currentTime: mondayNoonUtc,
      preferences: {
        id: "p1",
        user_id: userId,
        enabled_global: true,
        enabled_meals: false,
        enabled_workouts: true,
        enabled_hydration: false,
        reminder_breakfast_time: "08:00:00",
        reminder_lunch_time: "12:30:00",
        reminder_dinner_time: "19:30:00",
        reminder_snack_time: "16:30:00",
        reminder_workout_time: "18:00:00",
        timezone: "Europe/Paris",
      },
      dailyFoodLogsToday: [],
      recentLogsToday: [],
    });

    assert(res.shouldSend === false, "3. enabled_meals = false -> shouldSend === false");
    assert(res.reason.includes("désactivés par l'utilisateur"), "3. Raison explicite désactivation repas");
  }

  // 4. enabled_global = false -> aucun rappel
  {
    const res = evaluateMealReminder("meal_lunch", {
      userId,
      currentTime: mondayNoonUtc,
      preferences: {
        id: "p1",
        user_id: userId,
        enabled_global: false,
        enabled_meals: true,
        enabled_workouts: true,
        enabled_hydration: false,
        reminder_breakfast_time: "08:00:00",
        reminder_lunch_time: "12:30:00",
        reminder_dinner_time: "19:30:00",
        reminder_snack_time: "16:30:00",
        reminder_workout_time: "18:00:00",
        timezone: "Europe/Paris",
      },
      dailyFoodLogsToday: [],
      recentLogsToday: [],
    });

    assert(res.shouldSend === false, "4. enabled_global = false -> shouldSend === false");
    assert(res.reason.includes("globales désactivées"), "4. Raison explicite désactivation globale");
  }

  // 5. Séance digitale prévue mais non terminée (Lundi 18h15, planifié à 18h00, 3 séances/semaine : Lundi/Mercredi/Vendredi) -> éligible
  const mondayEveningUtc = new Date("2026-10-05T16:15:00Z"); // 18h15 Paris (Lundi)
  {
    const res = evaluateDigitalWorkoutReminder({
      userId,
      currentTime: mondayEveningUtc,
      preferences: null, // Par défaut 18:00
      fitnessProfile: {
        id: "f1",
        user_id: userId,
        gender: "male",
        height_cm: 180,
        current_weight_kg: 80,
        activity_level: "moderate",
        target_workouts_per_week: 3, // Lundi (1), Mercredi (3), Vendredi (5)
        primary_goal: "weight_loss",
        training_environment: "home",
        available_equipment: ["bodyweight"],
      },
      activeSession: {
        id: "s1",
        program_id: "p1",
        day_number: 1,
        title: "Full Body 30 - Session 1",
        duration_minutes: 30,
        is_club_session: false,
        is_active: true,
        display_order: 1,
      },
      sessionCompletionsToday: [],
      recentLogsToday: [],
    });

    assert(res.shouldSend === true, "5. Séance digitale prévue non complétée -> shouldSend === true");
    assert(res.category === "workout_digital", "5. Catégorie workout_digital");
    assert(res.body.includes("Full Body 30"), "5. Titre de la séance présent dans le message");
  }

  // 6. Séance digitale déjà terminée -> aucun rappel
  {
    const res = evaluateDigitalWorkoutReminder({
      userId,
      currentTime: mondayEveningUtc,
      preferences: null,
      fitnessProfile: {
        id: "f1",
        user_id: userId,
        gender: "male",
        height_cm: 180,
        current_weight_kg: 80,
        activity_level: "moderate",
        target_workouts_per_week: 3,
        primary_goal: "weight_loss",
        training_environment: "home",
        available_equipment: ["bodyweight"],
      },
      sessionCompletionsToday: [{ completed_at: "2026-10-05T16:00:00Z", program_session_id: "s1" }],
      recentLogsToday: [],
    });

    assert(res.shouldSend === false, "6. Séance digitale déjà terminée -> shouldSend === false");
    assert(res.reason.includes("déjà été complétée"), "6. Raison séance complétée");
  }

  // 7. Aucun entraînement prévu aujourd'hui (Mardi pour un profil 3x/semaine [Lun, Mer, Ven]) -> aucun rappel
  const tuesdayEveningUtc = new Date("2026-10-06T16:15:00Z"); // 18h15 Paris (Mardi = jour 2)
  {
    const res = evaluateDigitalWorkoutReminder({
      userId,
      currentTime: tuesdayEveningUtc,
      preferences: null,
      fitnessProfile: {
        id: "f1",
        user_id: userId,
        gender: "male",
        height_cm: 180,
        current_weight_kg: 80,
        activity_level: "moderate",
        target_workouts_per_week: 3, // [1, 3, 5] -> Mardi non inclus
        primary_goal: "weight_loss",
        training_environment: "home",
        available_equipment: ["bodyweight"],
      },
      sessionCompletionsToday: [],
      recentLogsToday: [],
    });

    assert(res.shouldSend === false, "7. Hors jour d'entraînement -> shouldSend === false");
    assert(res.reason.includes("hors cycle"), "7. Raison hors cycle d'entraînement");
  }

  // 8. Cours physique réservé dans la fenêtre H-2 (Il est 16h00 Paris, cours à 18h00) -> éligible
  const monday4pmUtc = new Date("2026-10-05T14:00:00Z"); // 16h00 Paris (H-2 pour 18h00)
  {
    const booking = {
      id: "b1",
      class_session_id: "cs-101",
      starts_at: "2026-10-05T18:00:00+02:00",
      discipline: "Kick Boxing",
      status: "confirmed",
    };

    const res = evaluateClubWorkoutReminder(booking, {
      userId,
      currentTime: monday4pmUtc,
      preferences: null,
      recentLogsToday: [],
    });

    assert(res.shouldSend === true, "8. Cours club dans la fenêtre H-2 (120 min) -> shouldSend === true");
    assert(res.category === "workout_club", "8. Catégorie workout_club");
    assert(res.title.includes("Kick Boxing à 18h00"), "8. Titre contenant discipline et heure");
  }

  // 9. Cours physique déjà passé (Il est 19h00 Paris, cours débutait à 18h00) -> aucun rappel
  const monday7pmUtc = new Date("2026-10-05T17:00:00Z"); // 19h00 Paris
  {
    const booking = {
      id: "b1",
      class_session_id: "cs-101",
      starts_at: "2026-10-05T18:00:00+02:00",
      discipline: "Kick Boxing",
      status: "confirmed",
    };

    const res = evaluateClubWorkoutReminder(booking, {
      userId,
      currentTime: monday7pmUtc,
      preferences: null,
      recentLogsToday: [],
    });

    assert(res.shouldSend === false, "9. Cours physique passé -> shouldSend === false");
    assert(res.reason.includes("passé"), "9. Raison cours passé");
  }

  // 10. Notification déjà envoyée -> aucun doublon
  {
    const res = evaluateMealReminder("meal_lunch", {
      userId,
      currentTime: mondayNoonUtc,
      preferences: null,
      dailyFoodLogsToday: [],
      recentLogsToday: [
        {
          id: "nl-1",
          user_id: userId,
          category: "meal_lunch",
          channel: "in_app",
          title: "Rappel Déjeuner",
          body: "...",
          is_read: false,
          action_completed: false,
          scheduled_date: "2026-10-05",
          sent_at: "2026-10-05T10:30:00Z",
        },
      ],
    });

    assert(res.shouldSend === false, "10. Log de notification existant aujourd'hui -> shouldSend === false");
    assert(res.reason.includes("déjà été envoyé"), "10. Raison doublon bloqué");
  }

  // 11. Fuseau horaire Europe/Paris correctement pris en compte
  {
    // À 06:15 UTC en été/automne (UTC+2), il est 08:15 à Paris
    const timeUtc = new Date("2026-10-05T06:15:00Z");
    const zoned = getZonedTimeDetails(timeUtc, "Europe/Paris");

    assert(zoned.hour === 8 && zoned.minute === 15, "11. Conversion UTC 06h15 -> Paris 08h15");
    assert(zoned.dateStr === "2026-10-05", "11. Date locale correcte (2026-10-05)");
    assert(zoned.dayOfWeek === 1, "11. Jour de semaine Lundi (1)");
  }

  // 12. Cas où aucune préférence utilisateur n'existe encore -> utilisation des valeurs par défaut
  {
    // À 08:15 Paris (06:15 UTC), le petit-déjeuner par défaut (08:00) est dans la fenêtre
    const breakfastTimeUtc = new Date("2026-10-05T06:15:00Z"); // 08:15 Paris
    const res = evaluateMealReminder("meal_breakfast", {
      userId,
      currentTime: breakfastTimeUtc,
      preferences: null, // Aucune préférence existante
      dailyFoodLogsToday: [],
      recentLogsToday: [],
    });

    assert(res.shouldSend === true, "12. Préférences null -> Valeurs par défaut utilisées avec succès");
    assert(res.category === "meal_breakfast", "12. Catégorie meal_breakfast");
    assert(res.scheduledFor.includes("08:00:00"), "12. Heure par défaut 08:00:00 respectée");
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`RÉSULTAT TOTAL : ${passedCount} PASSÉS / ${failedCount} ÉCHECS`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Erreur critique suite de tests :", err);
  process.exit(1);
});
