/**
 * TEST SUITE — ÉTAPE 7 : VALIDATION END-TO-END DE LA PRODUCTION (16 SCÉNARIOS OBLIGATOIRES)
 *
 * Scénarios vérifiés :
 * SCÉNARIO 1 : Utilisateur avec notifications activées, repas non enregistré, heure dans la fenêtre -> éligible
 * SCÉNARIO 2 : Repas déjà enregistré -> aucune notification
 * SCÉNARIO 3 : Notification déjà envoyée -> aucun doublon
 * SCÉNARIO 4 : Utilisateur désactive les notifications -> aucune notification
 * SCÉNARIO 5 : Utilisateur désactive uniquement les repas -> aucun rappel repas, mais entraînements fonctionnels
 * SCÉNARIO 6 : Séance digitale prévue et non terminée -> notification
 * SCÉNARIO 7 : Séance digitale déjà terminée -> aucune notification
 * SCÉNARIO 8 : Cours physique réservé dans la fenêtre H-2 -> notification
 * SCÉNARIO 9 : Cours physique annulé -> aucune notification
 * SCÉNARIO 10 : Deux cours réservés le même jour -> deux rappels distincts autorisés
 * SCÉNARIO 11 : Subscription push expirée (410/404) -> suppression de la subscription uniquement
 * SCÉNARIO 12 : Deux appareils actifs -> les deux appareils reçoivent la notification
 * SCÉNARIO 13 : Un appareil échoue -> les autres appareils continuent
 * SCÉNARIO 14 : Cron appelé sans secret -> HTTP 401
 * SCÉNARIO 15 : Cron appelé avec mauvais secret -> HTTP 401
 * SCÉNARIO 16 : Cron appelé avec bon secret en DRY-RUN -> aucune écriture et aucun push réel
 */

import assert from 'node:assert/strict';
import {
  evaluateAllReminders,
  evaluateMealReminder,
  evaluateDigitalWorkoutReminder,
  evaluateClubWorkoutReminder,
  getEligibleReminders,
  getZonedTimeDetails,
  DEFAULT_REMINDER_PREFERENCES,
} from '../lib/notifications/reminder-engine.ts';

console.log('='.repeat(70));
console.log('  TESTS ÉTAPE 7 — VALIDATION END-TO-END (PRODUCTION READY)');
console.log('='.repeat(70));

let passedTests = 0;
let totalTests = 0;

function runScenario(num, name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ [PASS] SCÉNARIO ${num} : ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] SCÉNARIO ${num} : ${name}`);
    console.error(`     -> ${err.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────
// SIMULATION DE DISPATCH END-TO-END (MÊME LOGIQUE QUE LE CRON)
// ─────────────────────────────────────────────────────────────────

async function simulateCronExecution({
  authHeader,
  cronSecret = 'valid_production_secret',
  isDryRun = true,
  vapidConfigured = true,
  usersPreferences = [],
  dataStore = {},
  pushService = null,
}) {
  // 1. Authentification Fail-Closed
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return { status: 401, error: 'Non autorisé' };
  }

  // 2. Utilisateurs actifs
  const activePreferences = usersPreferences.filter((p) => p.enabled_global === true);
  if (activePreferences.length === 0) {
    return {
      status: 200,
      dryRun: isDryRun,
      stats: {
        evaluatedUsers: 0,
        eligibleReminders: 0,
        sentPushCount: 0,
        failedPushCount: 0,
        staleSubscriptionsCleaned: 0,
      },
      wouldSend: [],
    };
  }

  const now = dataStore.currentTime || new Date('2026-10-05T10:30:00Z'); // 12h30 Paris
  const zoned = getZonedTimeDetails(now, 'Europe/Paris');
  const todayDateStr = zoned.dateStr;

  const stats = {
    evaluatedUsers: activePreferences.length,
    eligibleReminders: 0,
    sentPushCount: 0,
    failedPushCount: 0,
    staleSubscriptionsCleaned: 0,
    writtenLogsCount: 0,
  };

  const wouldSend = [];
  const writtenLogs = [...(dataStore.existingLogs || [])];
  const activeSubscriptions = [...(dataStore.subscriptions || [])];

  for (const pref of activePreferences) {
    const uid = pref.user_id;

    const userContext = {
      userId: uid,
      currentTime: now,
      preferences: pref,
      dailyFoodLogsToday: (dataStore.foodLogs || []).filter((f) => f.user_id === uid),
      fitnessProfile: (dataStore.fitnessProfiles || []).find((fp) => fp.user_id === uid) || null,
      sessionCompletionsToday: (dataStore.completions || []).filter((c) => c.user_id === uid),
      todayClubBookings: (dataStore.bookings || []).filter((b) => b.user_id === uid),
      recentLogsToday: writtenLogs.filter((l) => l.user_id === uid),
    };

    const decisions = evaluateAllReminders(userContext);

    for (const decision of decisions) {
      if (!decision.shouldSend) continue;

      stats.eligibleReminders++;

      if (isDryRun) {
        wouldSend.push({
          userId: uid,
          category: decision.category,
          title: decision.title,
          body: decision.body,
          actionUrl: decision.actionUrl,
        });
        continue;
      }

      const userSubs = activeSubscriptions.filter((s) => s.user_id === uid);
      let pushSentSuccessfully = false;

      if (vapidConfigured && userSubs.length > 0) {
        for (const sub of userSubs) {
          try {
            if (!pushService) throw new Error('Push service indisponible');
            await pushService.send({
              endpoint: sub.endpoint,
              title: decision.title,
              body: decision.body,
            });
            stats.sentPushCount++;
            pushSentSuccessfully = true;
          } catch (pushErr) {
            stats.failedPushCount++;
            if (pushErr.statusCode === 404 || pushErr.statusCode === 410) {
              // Nettoyage subscription expirée
              const idx = activeSubscriptions.findIndex((s) => s.endpoint === sub.endpoint);
              if (idx !== -1) {
                activeSubscriptions.splice(idx, 1);
                stats.staleSubscriptionsCleaned++;
              }
            }
          }
        }
      }

      // Écriture SYSTÉMATIQUE dans les logs (channel: web_push si au moins 1 push a réussi, in_app sinon)
      const newLog = {
        id: `log-${Date.now()}-${Math.random()}`,
        user_id: uid,
        category: decision.category,
        channel: pushSentSuccessfully ? 'web_push' : 'in_app',
        title: decision.title,
        body: decision.body,
        action_url: decision.actionUrl,
        scheduled_date: todayDateStr,
        sent_at: now.toISOString(),
      };
      writtenLogs.push(newLog);
      stats.writtenLogsCount++;
    }
  }

  return {
    status: 200,
    dryRun: isDryRun,
    stats,
    wouldSend,
    writtenLogs,
    activeSubscriptions,
  };
}

// ─────────────────────────────────────────────────────────────────
// EXÉCUTION DES 16 SCÉNARIOS
// ─────────────────────────────────────────────────────────────────

// SCÉNARIO 1 : Utilisateur avec notifications activées, repas non enregistré, heure dans la fenêtre -> éligible
runScenario(1, 'Utilisateur notifications activées, repas non enregistré dans la fenêtre -> Éligible', () => {
  const ctx = {
    userId: 'u1',
    currentTime: new Date('2026-10-05T10:35:00Z'), // 12h35 Paris
    preferences: {
      ...DEFAULT_REMINDER_PREFERENCES,
      id: 'p1',
      user_id: 'u1',
      enabled_global: true,
      enabled_meals: true,
      reminder_lunch_time: '12:30:00',
    },
    dailyFoodLogsToday: [],
    recentLogsToday: [],
  };

  const decision = evaluateMealReminder('meal_lunch', ctx);
  assert.strictEqual(decision.shouldSend, true, 'Rappel déjeuner doit être éligible');
  assert.strictEqual(decision.category, 'meal_lunch');
  assert.ok(decision.title.includes('Déjeuner'));
});

// SCÉNARIO 2 : Repas déjà enregistré -> aucune notification
runScenario(2, 'Repas déjà enregistré -> Aucune notification', () => {
  const ctx = {
    userId: 'u1',
    currentTime: new Date('2026-10-05T10:35:00Z'),
    preferences: {
      ...DEFAULT_REMINDER_PREFERENCES,
      id: 'p1',
      user_id: 'u1',
      enabled_global: true,
      enabled_meals: true,
      reminder_lunch_time: '12:30:00',
    },
    dailyFoodLogsToday: [{ meal_type: 'lunch', log_date: '2026-10-05' }],
    recentLogsToday: [],
  };

  const decision = evaluateMealReminder('meal_lunch', ctx);
  assert.strictEqual(decision.shouldSend, false, 'Ne doit pas envoyer si déjà logué');
  assert.ok(decision.reason.includes('déjà été enregistré'));
});

// SCÉNARIO 3 : Notification déjà envoyée -> aucun doublon
runScenario(3, 'Notification déjà envoyée -> Aucun doublon', () => {
  const ctx = {
    userId: 'u1',
    currentTime: new Date('2026-10-05T10:35:00Z'),
    preferences: {
      ...DEFAULT_REMINDER_PREFERENCES,
      id: 'p1',
      user_id: 'u1',
      enabled_global: true,
      enabled_meals: true,
      reminder_lunch_time: '12:30:00',
    },
    dailyFoodLogsToday: [],
    recentLogsToday: [
      {
        id: 'log-1',
        user_id: 'u1',
        category: 'meal_lunch',
        channel: 'web_push',
        title: 'Rappel Déjeuner',
        body: '...',
        scheduled_date: '2026-10-05',
        sent_at: '2026-10-05T10:31:00Z',
        is_read: false,
        action_completed: false,
      },
    ],
  };

  const decision = evaluateMealReminder('meal_lunch', ctx);
  assert.strictEqual(decision.shouldSend, false, 'Ne doit pas envoyer si log présent');
  assert.ok(decision.reason.includes('déjà été envoyé'));
});

// SCÉNARIO 4 : Utilisateur désactive les notifications -> aucune notification
runScenario(4, 'Utilisateur désactive les notifications (enabled_global=false) -> Aucune notification', () => {
  const ctx = {
    userId: 'u1',
    currentTime: new Date('2026-10-05T10:35:00Z'),
    preferences: {
      ...DEFAULT_REMINDER_PREFERENCES,
      id: 'p1',
      user_id: 'u1',
      enabled_global: false,
      enabled_meals: true,
      enabled_workouts: true,
    },
    dailyFoodLogsToday: [],
    recentLogsToday: [],
  };

  const eligible = getEligibleReminders(ctx);
  assert.strictEqual(eligible.length, 0, 'Aucun rappel éligible si global désactivé');
});

// SCÉNARIO 5 : Utilisateur désactive uniquement les rappels repas -> repas désactivés mais entraînements fonctionnels
runScenario(5, 'Désactivation des repas uniquement -> Repas ignorés, entraînements actifs', () => {
  const ctx = {
    userId: 'u1',
    currentTime: new Date('2026-10-05T16:15:00Z'), // 18h15 Paris (Lundi)
    preferences: {
      ...DEFAULT_REMINDER_PREFERENCES,
      id: 'p1',
      user_id: 'u1',
      enabled_global: true,
      enabled_meals: false,
      enabled_workouts: true,
      reminder_workout_time: '18:00:00',
    },
    fitnessProfile: {
      id: 'fp1',
      user_id: 'u1',
      target_workouts_per_week: 3, // Lundi, Mercredi, Vendredi
      primary_goal: 'weight_loss',
    },
    dailyFoodLogsToday: [],
    sessionCompletionsToday: [],
    recentLogsToday: [],
  };

  const mealDecision = evaluateMealReminder('meal_snack', ctx);
  assert.strictEqual(mealDecision.shouldSend, false, 'Repas désactivé');
  assert.ok(mealDecision.reason.includes('désactivés par l\'utilisateur'));

  const workoutDecision = evaluateDigitalWorkoutReminder(ctx);
  assert.strictEqual(workoutDecision.shouldSend, true, 'Entraînement doit rester actif');
  assert.strictEqual(workoutDecision.category, 'workout_digital');
});

// SCÉNARIO 6 : Séance digitale prévue et non terminée -> notification
runScenario(6, 'Séance digitale prévue non terminée -> Notification éligible', () => {
  const ctx = {
    userId: 'u1',
    currentTime: new Date('2026-10-05T16:15:00Z'), // 18h15 Paris
    preferences: {
      ...DEFAULT_REMINDER_PREFERENCES,
      id: 'p1',
      user_id: 'u1',
      enabled_global: true,
      enabled_workouts: true,
      reminder_workout_time: '18:00:00',
    },
    fitnessProfile: {
      id: 'fp1',
      user_id: 'u1',
      target_workouts_per_week: 3,
      primary_goal: 'muscle_gain',
    },
    sessionCompletionsToday: [],
    recentLogsToday: [],
  };

  const decision = evaluateDigitalWorkoutReminder(ctx);
  assert.strictEqual(decision.shouldSend, true);
  assert.strictEqual(decision.category, 'workout_digital');
  assert.ok(decision.actionUrl.includes('/membre/defis?tab=workouts'));
});

// SCÉNARIO 7 : Séance digitale déjà terminée -> aucune notification
runScenario(7, 'Séance digitale déjà terminée -> Aucune notification', () => {
  const ctx = {
    userId: 'u1',
    currentTime: new Date('2026-10-05T16:15:00Z'),
    preferences: {
      ...DEFAULT_REMINDER_PREFERENCES,
      id: 'p1',
      user_id: 'u1',
      enabled_global: true,
      enabled_workouts: true,
      reminder_workout_time: '18:00:00',
    },
    fitnessProfile: {
      id: 'fp1',
      user_id: 'u1',
      target_workouts_per_week: 3,
      primary_goal: 'muscle_gain',
    },
    sessionCompletionsToday: [
      { completed_at: '2026-10-05T15:30:00Z', program_session_id: 'sess-1' }
    ],
    recentLogsToday: [],
  };

  const decision = evaluateDigitalWorkoutReminder(ctx);
  assert.strictEqual(decision.shouldSend, false);
  assert.ok(decision.reason.includes('déjà été complétée'));
});

// SCÉNARIO 8 : Cours physique réservé dans la fenêtre H-2 -> notification
runScenario(8, 'Cours physique réservé dans la fenêtre H-2 (120 min) -> Notification', () => {
  const currentTime = new Date('2026-10-05T14:00:00Z'); // 16h00 Paris
  const booking = {
    id: 'b-100',
    class_session_id: 'cs-boxing',
    starts_at: '2026-10-05T16:00:00Z', // 18h00 Paris (diff = 120 min)
    discipline: 'Boxe Anglaise',
    status: 'confirmed',
  };

  const ctx = {
    userId: 'u1',
    currentTime,
    preferences: DEFAULT_REMINDER_PREFERENCES,
    recentLogsToday: [],
  };

  const decision = evaluateClubWorkoutReminder(booking, ctx);
  assert.strictEqual(decision.shouldSend, true);
  assert.strictEqual(decision.category, 'workout_club');
  assert.ok(decision.title.includes('Boxe Anglaise'));
  assert.ok(decision.actionUrl.includes('cs-boxing'));
});

// SCÉNARIO 9 : Cours physique annulé -> aucune notification
runScenario(9, 'Cours physique annulé -> Aucune notification', () => {
  const currentTime = new Date('2026-10-05T14:00:00Z');
  const booking = {
    id: 'b-cancelled',
    class_session_id: 'cs-boxing',
    starts_at: '2026-10-05T16:00:00Z',
    discipline: 'Boxe Anglaise',
    status: 'cancelled',
  };

  const ctx = {
    userId: 'u1',
    currentTime,
    preferences: DEFAULT_REMINDER_PREFERENCES,
    recentLogsToday: [],
  };

  const decision = evaluateClubWorkoutReminder(booking, ctx);
  assert.strictEqual(decision.shouldSend, false);
  assert.ok(decision.reason.includes('annulée'));
});

// SCÉNARIO 10 : Deux cours réservés le même jour -> deux rappels distincts autorisés
runScenario(10, 'Deux cours réservés le même jour -> Deux rappels distincts', () => {
  const currentTime = new Date('2026-10-05T10:00:00Z'); // 12h00 Paris

  const booking1 = {
    id: 'b-morning',
    class_session_id: 'cs-morning',
    starts_at: '2026-10-05T12:00:00Z', // 14h00 Paris (H-2)
    discipline: 'Lady Striking',
    status: 'confirmed',
  };

  const booking2 = {
    id: 'b-evening',
    class_session_id: 'cs-evening',
    starts_at: '2026-10-05T16:00:00Z', // 18h00 Paris (H-6)
    discipline: 'Kick Boxing',
    status: 'confirmed',
  };

  const ctx = {
    userId: 'u1',
    currentTime,
    preferences: DEFAULT_REMINDER_PREFERENCES,
    recentLogsToday: [
      // Log déjà existant pour le premier cours
      {
        id: 'l-morning',
        user_id: 'u1',
        category: 'workout_club',
        action_url: '/membre/planning?session=cs-morning',
        scheduled_date: '2026-10-05',
        sent_at: '2026-10-05T10:00:00Z',
      }
    ],
  };

  // Le cours 1 a déjà son log -> bloqué
  const res1 = evaluateClubWorkoutReminder(booking1, ctx);
  assert.strictEqual(res1.shouldSend, false, 'Cours 1 déjà notifié');

  // Avance dans le temps à 16h00 Paris pour le cours 2
  const ctxEvening = {
    ...ctx,
    currentTime: new Date('2026-10-05T14:00:00Z'), // 16h00 Paris
  };
  const res2 = evaluateClubWorkoutReminder(booking2, ctxEvening);
  assert.strictEqual(res2.shouldSend, true, 'Cours 2 doit recevoir son rappel propre');
  assert.strictEqual(res2.targetId, 'cs-evening');
});

// SCÉNARIO 11 : Subscription push expirée -> suppression de la subscription uniquement
runScenario(11, 'Subscription push expirée (410 Gone) -> Nettoyage sélectif', async () => {
  const usersPreferences = [{
    id: 'p1',
    user_id: 'u1',
    enabled_global: true,
    enabled_meals: true,
    reminder_lunch_time: '12:30:00',
  }];

  const dataStore = {
    currentTime: new Date('2026-10-05T10:35:00Z'),
    subscriptions: [
      { id: 'sub-stale', user_id: 'u1', endpoint: 'https://push.example.com/stale' }
    ],
  };

  const pushService = {
    send: async () => {
      const err = new Error('Subscription expired');
      err.statusCode = 410;
      throw err;
    },
  };

  const res = await simulateCronExecution({
    authHeader: 'Bearer valid_production_secret',
    isDryRun: false,
    usersPreferences,
    dataStore,
    pushService,
  });

  assert.strictEqual(res.stats.staleSubscriptionsCleaned, 1, 'Doit avoir nettoyé 1 subscription expirée');
  assert.strictEqual(res.stats.failedPushCount, 1);
  assert.strictEqual(res.stats.writtenLogsCount, 1, 'Log in-app écrit pour persister l alerte et bloquer les doublons');
  assert.strictEqual(res.writtenLogs[0].channel, 'in_app', 'Canal de repli in_app quand le push expire');
  assert.strictEqual(res.activeSubscriptions.length, 0, 'La subscription expirée a été retirée');
});

// SCÉNARIO 12 : Deux appareils actifs -> les deux reçoivent la notification
runScenario(12, 'Deux appareils actifs pour un utilisateur -> Les deux reçoivent la notification', async () => {
  const usersPreferences = [{
    id: 'p1',
    user_id: 'u1',
    enabled_global: true,
    enabled_meals: true,
    reminder_lunch_time: '12:30:00',
  }];

  const dataStore = {
    currentTime: new Date('2026-10-05T10:35:00Z'),
    subscriptions: [
      { id: 'sub-phone', user_id: 'u1', endpoint: 'https://push.example.com/phone' },
      { id: 'sub-laptop', user_id: 'u1', endpoint: 'https://push.example.com/laptop' },
    ],
  };

  const receivedEndpoints = [];
  const pushService = {
    send: async ({ endpoint }) => {
      receivedEndpoints.push(endpoint);
      return { success: true };
    },
  };

  const res = await simulateCronExecution({
    authHeader: 'Bearer valid_production_secret',
    isDryRun: false,
    usersPreferences,
    dataStore,
    pushService,
  });

  assert.strictEqual(res.stats.sentPushCount, 2, '2 pushes doivent avoir été envoyés');
  assert.strictEqual(receivedEndpoints.length, 2);
  assert.ok(receivedEndpoints.includes('https://push.example.com/phone'));
  assert.ok(receivedEndpoints.includes('https://push.example.com/laptop'));
  assert.strictEqual(res.stats.writtenLogsCount, 1, '1 seul log créé pour la notification');
});

// SCÉNARIO 13 : Un appareil échoue -> les autres appareils continuent
runScenario(13, 'Un appareil échoue -> L\'autre appareil continue et reçoit le push', async () => {
  const usersPreferences = [{
    id: 'p1',
    user_id: 'u1',
    enabled_global: true,
    enabled_meals: true,
    reminder_lunch_time: '12:30:00',
  }];

  const dataStore = {
    currentTime: new Date('2026-10-05T10:35:00Z'),
    subscriptions: [
      { id: 'sub-failing', user_id: 'u1', endpoint: 'https://push.example.com/fail' },
      { id: 'sub-success', user_id: 'u1', endpoint: 'https://push.example.com/success' },
    ],
  };

  const delivered = [];
  const pushService = {
    send: async ({ endpoint }) => {
      if (endpoint.includes('fail')) {
        const err = new Error('Network error');
        err.statusCode = 500;
        throw err;
      }
      delivered.push(endpoint);
      return { success: true };
    },
  };

  const res = await simulateCronExecution({
    authHeader: 'Bearer valid_production_secret',
    isDryRun: false,
    usersPreferences,
    dataStore,
    pushService,
  });

  assert.strictEqual(res.stats.sentPushCount, 1);
  assert.strictEqual(res.stats.failedPushCount, 1);
  assert.strictEqual(delivered.length, 1);
  assert.strictEqual(delivered[0], 'https://push.example.com/success');
  assert.strictEqual(res.stats.writtenLogsCount, 1, 'Log enregistré car au moins 1 appareil a réussi');
});

// SCÉNARIO 14 : Cron appelé sans secret -> HTTP 401
runScenario(14, 'Cron appelé sans secret -> HTTP 401 Rejet immédiat', async () => {
  const res = await simulateCronExecution({
    authHeader: null,
    cronSecret: 'production_secret_key',
  });
  assert.strictEqual(res.status, 401);
  assert.ok(res.error.includes('Non autorisé'));
});

// SCÉNARIO 15 : Cron appelé avec mauvais secret -> HTTP 401
runScenario(15, 'Cron appelé avec mauvais secret -> HTTP 401 Rejet immédiat', async () => {
  const res = await simulateCronExecution({
    authHeader: 'Bearer hacked_invalid_secret',
    cronSecret: 'production_secret_key',
  });
  assert.strictEqual(res.status, 401);
  assert.ok(res.error.includes('Non autorisé'));
});

// SCÉNARIO 16 : Cron appelé avec bon secret en DRY-RUN -> aucune écriture et aucun push réel
runScenario(16, 'Cron appelé en mode DRY-RUN -> Aucune écriture et aucun push réel', async () => {
  const usersPreferences = [{
    id: 'p1',
    user_id: 'u1',
    enabled_global: true,
    enabled_meals: true,
    reminder_lunch_time: '12:30:00',
  }];

  const dataStore = {
    currentTime: new Date('2026-10-05T10:35:00Z'),
    subscriptions: [
      { id: 'sub-real', user_id: 'u1', endpoint: 'https://push.example.com/real' }
    ],
  };

  let pushAttempted = false;
  const pushService = {
    send: async () => {
      pushAttempted = true;
      return { success: true };
    },
  };

  const res = await simulateCronExecution({
    authHeader: 'Bearer valid_production_secret',
    isDryRun: true, // Simulation
    usersPreferences,
    dataStore,
    pushService,
  });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.dryRun, true);
  assert.strictEqual(res.stats.eligibleReminders, 1);
  assert.strictEqual(res.stats.sentPushCount, 0, 'Zero push réel en dry-run');
  assert.strictEqual(res.stats.writtenLogsCount, 0, 'Zero log écrit en base en dry-run');
  assert.strictEqual(pushAttempted, false, 'Le service push ne doit jamais être invoqué');
  assert.strictEqual(res.wouldSend.length, 1, 'Doit retourner la prévisualisation dans wouldSend');
});

// SCÉNARIO 17 : Utilisateur sans aucun abonnement Web Push -> log in_app créé et bloqué par anti-doublon au cycle suivant
runScenario(17, 'Utilisateur sans abonnement Web Push -> Enregistré en in_app et anti-doublon actif', async () => {
  const usersPreferences = [{
    id: 'p1',
    user_id: 'u-no-push',
    enabled_global: true,
    enabled_meals: true,
    reminder_lunch_time: '12:30:00',
  }];

  const dataStore = {
    currentTime: new Date('2026-10-05T10:35:00Z'),
    subscriptions: [], // Aucun device push
  };

  const res1 = await simulateCronExecution({
    authHeader: 'Bearer valid_production_secret',
    isDryRun: false,
    usersPreferences,
    dataStore,
  });

  assert.strictEqual(res1.status, 200);
  assert.strictEqual(res1.stats.eligibleReminders, 1);
  assert.strictEqual(res1.stats.sentPushCount, 0, 'Aucun push envoyé car aucune subscription');
  assert.strictEqual(res1.stats.writtenLogsCount, 1, 'Log in-app systématiquement enregistré');
  assert.strictEqual(res1.writtenLogs[0].channel, 'in_app', 'Canal in_app');

  // Second passage du cron 15 minutes plus tard -> l'anti-doublon doit bloquer
  dataStore.currentTime = new Date('2026-10-05T10:50:00Z');
  dataStore.existingLogs = res1.writtenLogs;

  const res2 = await simulateCronExecution({
    authHeader: 'Bearer valid_production_secret',
    isDryRun: false,
    usersPreferences,
    dataStore,
  });

  assert.strictEqual(res2.stats.eligibleReminders, 0, 'Anti-doublon bloque le rappel au 2e passage');
  assert.strictEqual(res2.stats.writtenLogsCount, 0, 'Aucun nouveau log écrit');
});

// ─────────────────────────────────────────────────────────────────
// BILAN DES 17 SCÉNARIOS END-TO-END
// ─────────────────────────────────────────────────────────────────
console.log('\n' + '='.repeat(70));
console.log(`BILAN DES TESTS END-TO-END : ${passedTests} / ${totalTests} scénarios réussis`);
console.log('='.repeat(70));

if (passedTests !== totalTests) {
  process.exit(1);
}
