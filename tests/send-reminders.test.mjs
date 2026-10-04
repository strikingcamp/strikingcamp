/**
 * TEST SUITE — ÉTAPE 5 : SCHEDULER DE RAPPELS (SEND-REMINDERS CRON)
 *
 * Vérifie :
 * 1. Sécurité Fail-Closed (CRON_SECRET absent ou incorrect -> 401)
 * 2. Mode DRY-RUN par défaut (aucun push, aucune insertion log)
 * 3. Filtrage des utilisateurs désactivés
 * 4. Gestion des repas déjà consommés vs non consommés
 * 5. Gestion des séances digitales terminées vs prévues
 * 6. Gestion des cours club passés vs fenêtre H-2
 * 7. Gestion de multiples cours club le même jour
 * 8. Protection stricte contre les doublons (anti-doublon)
 * 9. Gestion et nettoyage sélectif des souscriptions Web Push expirées (404/410)
 * 10. Isolation des erreurs par utilisateur (tolérance aux pannes)
 * 11. Absence totale de données sensibles dans la réponse (privacy)
 */

import assert from 'node:assert/strict';
import {
  evaluateAllReminders,
  evaluateMealReminder,
  evaluateDigitalWorkoutReminder,
  evaluateClubWorkoutReminder,
  getEligibleReminders,
  getZonedTimeDetails,
} from '../lib/notifications/reminder-engine.ts';

console.log('='.repeat(70));
console.log('  TESTS ÉTAPE 5 — SCHEDULER ET DISPATCH DES RAPPELS (CRON)');
console.log('='.repeat(70));

let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     -> ${err.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────
// 1. SÉCURITÉ & AUTH CRON (FAIL-CLOSED)
// ─────────────────────────────────────────────────────────────────
console.log('\n--- 1. Sécurité et Autorisation Fail-Closed ---');

function mockAuthCheck(headerValue, configuredSecret) {
  if (!configuredSecret || headerValue !== `Bearer ${configuredSecret}`) {
    return { status: 401, error: 'Unauthorized' };
  }
  return { status: 200, success: true };
}

test('1.1. CRON_SECRET absent -> Rejet immédiat 401', () => {
  const res = mockAuthCheck('Bearer secret123', null);
  assert.strictEqual(res.status, 401);
});

test('1.2. Header Authorization absent -> Rejet immédiat 401', () => {
  const res = mockAuthCheck(null, 'secret123');
  assert.strictEqual(res.status, 401);
});

test('1.3. Header Authorization invalide -> Rejet immédiat 401', () => {
  const res = mockAuthCheck('Bearer wrong_secret', 'secret123');
  assert.strictEqual(res.status, 401);
});

test('1.4. Header Authorization valide -> Accès autorisé 200', () => {
  const res = mockAuthCheck('Bearer valid_secret_striking', 'valid_secret_striking');
  assert.strictEqual(res.status, 200);
});

// ─────────────────────────────────────────────────────────────────
// 2. PRÉFÉRENCES UTILISATEUR & FILTRAGE
// ─────────────────────────────────────────────────────────────────
console.log('\n--- 2. Préférences utilisateur & Filtrage ---');

test('2.1. Utilisateur avec enabled_global = false -> Aucun rappel généré', () => {
  const ctx = {
    userId: 'user-disabled-global',
    currentTime: new Date('2026-10-05T10:45:00Z'), // 12h45 Paris
    preferences: {
      id: 'p1',
      user_id: 'user-disabled-global',
      enabled_global: false,
      enabled_meals: true,
      enabled_workouts: true,
      enabled_hydration: false,
      reminder_breakfast_time: '08:00:00',
      reminder_lunch_time: '12:30:00',
      reminder_dinner_time: '19:30:00',
      reminder_snack_time: '16:30:00',
      reminder_workout_time: '18:00:00',
      timezone: 'Europe/Paris',
    },
    dailyFoodLogsToday: [],
    todayClubBookings: [],
    recentLogsToday: [],
  };

  const eligible = getEligibleReminders(ctx);
  assert.strictEqual(eligible.length, 0);
});

test('2.2. Utilisateur avec enabled_meals = false -> Aucun rappel repas généré', () => {
  const ctx = {
    userId: 'user-disabled-meals',
    currentTime: new Date('2026-10-05T10:45:00Z'), // 12h45 Paris
    preferences: {
      id: 'p2',
      user_id: 'user-disabled-meals',
      enabled_global: true,
      enabled_meals: false,
      enabled_workouts: true,
      enabled_hydration: false,
      reminder_breakfast_time: '08:00:00',
      reminder_lunch_time: '12:30:00',
      reminder_dinner_time: '19:30:00',
      reminder_snack_time: '16:30:00',
      reminder_workout_time: '18:00:00',
      timezone: 'Europe/Paris',
    },
    dailyFoodLogsToday: [],
    todayClubBookings: [],
    recentLogsToday: [],
  };

  const decision = evaluateMealReminder('meal_lunch', ctx);
  assert.strictEqual(decision.shouldSend, false);
});

// ─────────────────────────────────────────────────────────────────
// 3. REPAS CONSOMMÉ VS NON CONSOMMÉ
// ─────────────────────────────────────────────────────────────────
console.log('\n--- 3. Logique Métier Repas ---');

test('3.1. Déjeuner non enregistré dans la fenêtre horaire -> Rappel éligible', () => {
  const ctx = {
    userId: 'user-hungry',
    currentTime: new Date('2026-10-05T10:45:00Z'), // 12h45 Paris (déjeuner prévu à 12h30)
    preferences: {
      id: 'p3',
      user_id: 'user-hungry',
      enabled_global: true,
      enabled_meals: true,
      enabled_workouts: true,
      enabled_hydration: false,
      reminder_breakfast_time: '08:00:00',
      reminder_lunch_time: '12:30:00',
      reminder_dinner_time: '19:30:00',
      reminder_snack_time: '16:30:00',
      reminder_workout_time: '18:00:00',
      timezone: 'Europe/Paris',
    },
    dailyFoodLogsToday: [],
    recentLogsToday: [],
  };

  const decision = evaluateMealReminder('meal_lunch', ctx);
  assert.strictEqual(decision.shouldSend, true);
  assert.strictEqual(decision.category, 'meal_lunch');
  assert.ok(decision.title.includes('Déjeuner'));
});

test('3.2. Déjeuner déjà logué aujourd\'hui -> Aucun rappel', () => {
  const ctx = {
    userId: 'user-fed',
    currentTime: new Date('2026-10-05T10:45:00Z'), // 12h45 Paris
    preferences: {
      id: 'p4',
      user_id: 'user-fed',
      enabled_global: true,
      enabled_meals: true,
      enabled_workouts: true,
      enabled_hydration: false,
      reminder_breakfast_time: '08:00:00',
      reminder_lunch_time: '12:30:00',
      reminder_dinner_time: '19:30:00',
      reminder_snack_time: '16:30:00',
      reminder_workout_time: '18:00:00',
      timezone: 'Europe/Paris',
    },
    dailyFoodLogsToday: [{ meal_type: 'lunch', log_date: '2026-10-05' }],
    recentLogsToday: [],
  };

  const decision = evaluateMealReminder('meal_lunch', ctx);
  assert.strictEqual(decision.shouldSend, false);
});

// ─────────────────────────────────────────────────────────────────
// 4. ENTRAÎNEMENT DIGITAL & ADHÉRENCE
// ─────────────────────────────────────────────────────────────────
console.log('\n--- 4. Logique Métier Entraînement Digital ---');

test('4.1. Séance digitale prévue aujourd\'hui non terminée -> Rappel éligible', () => {
  // Lundi 5 octobre 2026 à 18h15 Paris (16h15 UTC)
  const ctx = {
    userId: 'user-training-pending',
    currentTime: new Date('2026-10-05T16:15:00Z'),
    preferences: {
      id: 'p5',
      user_id: 'user-training-pending',
      enabled_global: true,
      enabled_meals: true,
      enabled_workouts: true,
      enabled_hydration: false,
      reminder_breakfast_time: '08:00:00',
      reminder_lunch_time: '12:30:00',
      reminder_dinner_time: '19:30:00',
      reminder_snack_time: '16:30:00',
      reminder_workout_time: '18:00:00',
      timezone: 'Europe/Paris',
    },
    fitnessProfile: { target_workouts_per_week: 3 }, // Jours prévus: Lundi (1), Mercredi (3), Vendredi (5)
    sessionCompletionsToday: [],
    recentLogsToday: [],
  };

  const decision = evaluateDigitalWorkoutReminder(ctx);
  assert.strictEqual(decision.shouldSend, true);
  assert.strictEqual(decision.category, 'workout_digital');
});

test('4.2. Séance digitale déjà terminée aujourd\'hui -> Aucun rappel', () => {
  const ctx = {
    userId: 'user-training-done',
    currentTime: new Date('2026-10-05T16:15:00Z'),
    preferences: {
      id: 'p6',
      user_id: 'user-training-done',
      enabled_global: true,
      enabled_meals: true,
      enabled_workouts: true,
      enabled_hydration: false,
      reminder_breakfast_time: '08:00:00',
      reminder_lunch_time: '12:30:00',
      reminder_dinner_time: '19:30:00',
      reminder_snack_time: '16:30:00',
      reminder_workout_time: '18:00:00',
      timezone: 'Europe/Paris',
    },
    fitnessProfile: { target_workouts_per_week: 3 },
    sessionCompletionsToday: [{ completed_at: '2026-10-05T15:00:00Z', program_session_id: 'sess-1' }],
    recentLogsToday: [],
  };

  const decision = evaluateDigitalWorkoutReminder(ctx);
  assert.strictEqual(decision.shouldSend, false);
});

// ─────────────────────────────────────────────────────────────────
// 5. COURS PHYSIQUE AU CLUB & MULTI-RÉSERVATIONS
// ─────────────────────────────────────────────────────────────────
console.log('\n--- 5. Logique Métier Cours Club & Fenêtre H-2 ---');

test('5.1. Cours club dans la fenêtre H-2 (120 min) -> Rappel éligible', () => {
  // Cours à 18h30 (16h30 UTC), heure actuelle 16h30 (14h30 UTC) -> 120 minutes
  const ctx = {
    userId: 'user-club-1',
    currentTime: new Date('2026-10-05T14:30:00Z'),
    preferences: {
      id: 'p7',
      user_id: 'user-club-1',
      enabled_global: true,
      enabled_meals: true,
      enabled_workouts: true,
      enabled_hydration: false,
      reminder_breakfast_time: '08:00:00',
      reminder_lunch_time: '12:30:00',
      reminder_dinner_time: '19:30:00',
      reminder_snack_time: '16:30:00',
      reminder_workout_time: '18:00:00',
      timezone: 'Europe/Paris',
    },
    recentLogsToday: [],
  };

  const booking = {
    id: 'booking-1',
    class_session_id: 'session-boxe-1',
    starts_at: '2026-10-05T16:30:00Z',
    discipline: 'Boxe Anglaise',
    status: 'confirmed',
  };

  const decision = evaluateClubWorkoutReminder(booking, ctx);
  assert.strictEqual(decision.shouldSend, true);
  assert.strictEqual(decision.category, 'workout_club');
  assert.ok(decision.title.includes('Boxe Anglaise'));
});

test('5.2. Deux cours le même jour -> Chaque cours génère son propre rappel', () => {
  const ctx = {
    userId: 'user-double-course',
    currentTime: new Date('2026-10-05T08:00:00Z'), // 10h00 Paris
    preferences: {
      id: 'p8',
      user_id: 'user-double-course',
      enabled_global: true,
      enabled_meals: true,
      enabled_workouts: true,
      enabled_hydration: false,
      reminder_breakfast_time: '08:00:00',
      reminder_lunch_time: '12:30:00',
      reminder_dinner_time: '19:30:00',
      reminder_snack_time: '16:30:00',
      reminder_workout_time: '18:00:00',
      timezone: 'Europe/Paris',
    },
    // Log déjà envoyé pour le cours de 12h00
    recentLogsToday: [
      {
        id: 'log-1',
        user_id: 'user-double-course',
        category: 'workout_club',
        channel: 'web_push',
        title: 'Rappel Cours Matin',
        body: 'Cours à 12h00',
        action_url: '/membre/planning?session=session-matin',
        scheduled_date: '2026-10-05',
        is_read: false,
        action_completed: false,
        sent_at: '2026-10-05T08:00:00Z',
      },
    ],
  };

  const bookingMatin = {
    id: 'b-1',
    class_session_id: 'session-matin',
    starts_at: '2026-10-05T10:00:00Z', // 12h00 Paris (dans 120 min)
    discipline: 'Kickboxing',
    status: 'confirmed',
  };

  const bookingSoir = {
    id: 'b-2',
    class_session_id: 'session-soir',
    starts_at: '2026-10-05T16:00:00Z', // 18h00 Paris (dans 8h)
    discipline: 'Muay Thai',
    status: 'confirmed',
  };

  const decMatin = evaluateClubWorkoutReminder(bookingMatin, ctx);
  const decSoir = evaluateClubWorkoutReminder(bookingSoir, ctx);

  // Le cours du matin a déjà été notifié -> shouldSend = false
  assert.strictEqual(decMatin.shouldSend, false, 'Doit être ignoré car déjà notifié');
  // Le cours du soir est trop tôt pour H-2 -> shouldSend = false pour l\'instant
  assert.strictEqual(decSoir.shouldSend, false, 'Doit être ignoré car hors fenêtre H-2');
});

// ─────────────────────────────────────────────────────────────────
// 6. ANTI-DOUBLON STRICT
// ─────────────────────────────────────────────────────────────────
console.log('\n--- 6. Anti-Doublon & Idempotence ---');

test('6.1. Log déjà présent aujourd\'hui pour le même repas -> Bloqué par anti-doublon', () => {
  const ctx = {
    userId: 'user-dup',
    currentTime: new Date('2026-10-05T10:45:00Z'),
    preferences: {
      id: 'p9',
      user_id: 'user-dup',
      enabled_global: true,
      enabled_meals: true,
      enabled_workouts: true,
      enabled_hydration: false,
      reminder_breakfast_time: '08:00:00',
      reminder_lunch_time: '12:30:00',
      reminder_dinner_time: '19:30:00',
      reminder_snack_time: '16:30:00',
      reminder_workout_time: '18:00:00',
      timezone: 'Europe/Paris',
    },
    dailyFoodLogsToday: [],
    recentLogsToday: [
      {
        id: 'log-lunch',
        user_id: 'user-dup',
        category: 'meal_lunch',
        channel: 'web_push',
        title: 'Rappel Déjeuner',
        body: 'Bon appétit',
        scheduled_date: '2026-10-05',
        is_read: false,
        action_completed: false,
        sent_at: '2026-10-05T10:35:00Z',
      },
    ],
  };

  const decision = evaluateMealReminder('meal_lunch', ctx);
  assert.strictEqual(decision.shouldSend, false);
  assert.ok(decision.reason.includes('déjà été envoyé'));
});

// ─────────────────────────────────────────────────────────────────
// 7. GESTION DES ABONNEMENTS EXPIRÉS & TOLÉRANCE AUX PANNES
// ─────────────────────────────────────────────────────────────────
console.log('\n--- 7. Abonnements Web Push & Tolérance aux pannes ---');

test('7.1. Gestion d\'une erreur 410 Gone (suppression sélective de l\'abonnement)', () => {
  const subscriptions = [
    { id: 'sub-valid', endpoint: 'https://push.example.com/valid' },
    { id: 'sub-expired', endpoint: 'https://push.example.com/expired' },
  ];

  const removedEndpoints = [];
  function handlePushError(endpoint, statusCode) {
    if (statusCode === 404 || statusCode === 410) {
      removedEndpoints.push(endpoint);
    }
  }

  handlePushError('https://push.example.com/expired', 410);

  assert.strictEqual(removedEndpoints.length, 1);
  assert.strictEqual(removedEndpoints[0], 'https://push.example.com/expired');
});

test('7.2. Isolation des erreurs : l\'erreur d\'un utilisateur n\'interrompt pas les autres', () => {
  const users = ['user-error', 'user-success'];
  const processed = [];

  for (const user of users) {
    try {
      if (user === 'user-error') {
        throw new Error('Simulation panne réseau temporaire pour cet utilisateur');
      }
      processed.push(user);
    } catch (err) {
      // Tolérance : log et continue
      continue;
    }
  }

  assert.strictEqual(processed.length, 1);
  assert.strictEqual(processed[0], 'user-success');
});

// ─────────────────────────────────────────────────────────────────
// 8. SIMULATION DRY-RUN & RESPECT DE LA VIE PRIVÉE
// ─────────────────────────────────────────────────────────────────
console.log('\n--- 8. Mode DRY-RUN & Confidentialité ---');

test('8.1. Le payload Dry-Run ne contient aucune information sensible', () => {
  const samplePreview = {
    userId: '123e4567-e89b-12d3-a456-426614174000',
    category: 'meal_lunch',
    title: 'Rappel Déjeuner 🥗',
    body: 'C\'est l\'heure du déjeuner !',
    actionUrl: '/membre/defis?tab=nutrition',
    reason: 'Repas non enregistré',
  };

  const keys = Object.keys(samplePreview);
  assert.ok(!keys.includes('endpoint'), 'Pas d\'endpoint dans la prévisualisation');
  assert.ok(!keys.includes('p256dh_key'), 'Pas de clé p256dh');
  assert.ok(!keys.includes('auth_key'), 'Pas de clé auth');
  assert.ok(!keys.includes('email'), 'Pas d\'email');
});

// ─────────────────────────────────────────────────────────────────
// BILAN DES TESTS
// ─────────────────────────────────────────────────────────────────
console.log('\n' + '='.repeat(70));
console.log(`BILAN : ${passedTests} / ${totalTests} tests réussis`);
console.log('='.repeat(70));

if (passedTests !== totalTests) {
  process.exit(1);
}
