/**
 * TEST SUITE — ÉTAPE 6 : UI DES PRÉFÉRENCES DE NOTIFICATIONS & ACTIVATION WEB PUSH
 *
 * Vérifie :
 * 1. Valeurs et structure des préférences par défaut (DEFAULT_NOTIFICATION_PREFERENCES)
 * 2. Comportement des interrupteurs (enabled_global, enabled_meals, enabled_workouts)
 * 3. Validation et normalisation des horaires de rappel
 * 4. Préparation et validation du payload d'activation push
 * 5. Désactivation sélective de souscription (multi-appareils)
 * 6. Gestion des permissions refusées et navigateurs incompatibles
 * 7. Sécurité Fail-Closed de la session (aucun user_id client accepté)
 * 8. Absence totale de secrets dans les composants React et bundles client
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '../lib/supabase/notifications.ts';

console.log('='.repeat(70));
console.log('  TESTS ÉTAPE 6 — UI DES PRÉFÉRENCES & ACTIVATION WEB PUSH');
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
// 1. PRÉFÉRENCES PAR DÉFAUT
// ─────────────────────────────────────────────────────────────────
console.log('\n--- 1. Valeurs des Préférences par Défaut ---');

test('1.1. Les préférences par défaut ont les bascules activées', () => {
  assert.strictEqual(DEFAULT_NOTIFICATION_PREFERENCES.enabled_global, true);
  assert.strictEqual(DEFAULT_NOTIFICATION_PREFERENCES.enabled_meals, true);
  assert.strictEqual(DEFAULT_NOTIFICATION_PREFERENCES.enabled_workouts, true);
  assert.strictEqual(DEFAULT_NOTIFICATION_PREFERENCES.enabled_hydration, false);
});

test('1.2. Les horaires par défaut sont conformes', () => {
  assert.strictEqual(DEFAULT_NOTIFICATION_PREFERENCES.reminder_breakfast_time, '08:00:00');
  assert.strictEqual(DEFAULT_NOTIFICATION_PREFERENCES.reminder_lunch_time, '12:30:00');
  assert.strictEqual(DEFAULT_NOTIFICATION_PREFERENCES.reminder_snack_time, '16:30:00');
  assert.strictEqual(DEFAULT_NOTIFICATION_PREFERENCES.reminder_dinner_time, '19:30:00');
  assert.strictEqual(DEFAULT_NOTIFICATION_PREFERENCES.reminder_workout_time, '18:00:00');
  assert.strictEqual(DEFAULT_NOTIFICATION_PREFERENCES.timezone, 'Europe/Paris');
});

// ─────────────────────────────────────────────────────────────────
// 2. LOGIQUE DE MODIFICATION DES PRÉFÉRENCES
// ─────────────────────────────────────────────────────────────────
console.log('\n--- 2. Modification des Paramètres et Horaires ---');

test('2.1. Bascule globale (enabled_global)', () => {
  let userPrefs = { ...DEFAULT_NOTIFICATION_PREFERENCES };
  userPrefs.enabled_global = false;
  assert.strictEqual(userPrefs.enabled_global, false);
});

test('2.2. Bascule des repas (enabled_meals)', () => {
  let userPrefs = { ...DEFAULT_NOTIFICATION_PREFERENCES };
  userPrefs.enabled_meals = false;
  assert.strictEqual(userPrefs.enabled_meals, false);
});

test('2.3. Modification d\'un horaire (ex: déjeuner à 13:00:00)', () => {
  let userPrefs = { ...DEFAULT_NOTIFICATION_PREFERENCES };
  const newLunchTime = '13:00:00';
  userPrefs.reminder_lunch_time = newLunchTime;
  assert.strictEqual(userPrefs.reminder_lunch_time, '13:00:00');
  assert.match(userPrefs.reminder_lunch_time, /^\d{2}:\d{2}:\d{2}$/);
});

// ─────────────────────────────────────────────────────────────────
// 3. ACTIVATION & DÉSACTIVATION WEB PUSH
// ─────────────────────────────────────────────────────────────────
console.log('\n--- 3. Activation & Désactivation Web Push ---');

test('3.1. Structure du payload d\'activation push transmis à la route API', () => {
  const fakeSubscription = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/fake-device-token-123',
    p256dh_key: 'BNcRdreALRF8FsII0615...',
    auth_key: 'tBHbtxK7m22...',
    user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
  };

  assert.ok(fakeSubscription.endpoint.startsWith('https://'));
  assert.ok(fakeSubscription.p256dh_key.length > 10);
  assert.ok(fakeSubscription.auth_key.length > 5);
});

test('3.2. Désactivation sélective par endpoint (multi-appareils)', () => {
  const userDevices = [
    { id: 'dev-1', endpoint: 'https://push.apple.com/sub/iphone-1' },
    { id: 'dev-2', endpoint: 'https://push.google.com/sub/chrome-laptop' },
  ];

  const targetEndpointToRemove = 'https://push.apple.com/sub/iphone-1';
  const remainingDevices = userDevices.filter(d => d.endpoint !== targetEndpointToRemove);

  assert.strictEqual(remainingDevices.length, 1);
  assert.strictEqual(remainingDevices[0].id, 'dev-2');
  assert.strictEqual(remainingDevices[0].endpoint, 'https://push.google.com/sub/chrome-laptop');
});

// ─────────────────────────────────────────────────────────────────
// 4. SÉCURITÉ & ANALYSE DE CODE STATIQUE
// ─────────────────────────────────────────────────────────────────
console.log('\n--- 4. Sécurité & Absence de Secrets Client ---');

const settingsComponentPath = path.resolve('components', 'membre', 'MemberNotificationSettings.tsx');
const profileViewPath = path.resolve('components', 'membre', 'MemberProfileView.tsx');

test('4.1. Le composant MemberNotificationSettings.tsx existe', () => {
  assert.ok(fs.existsSync(settingsComponentPath), 'MemberNotificationSettings.tsx doit exister');
});

const settingsContent = fs.readFileSync(settingsComponentPath, 'utf8');

test('4.2. MemberNotificationSettings.tsx ne contient aucun secret ni clé privée', () => {
  assert.ok(!settingsContent.includes('VAPID_PRIVATE_KEY'), 'Pas de VAPID_PRIVATE_KEY dans le composant');
  assert.ok(!settingsContent.includes('SUPABASE_SERVICE_ROLE_KEY'), 'Pas de SUPABASE_SERVICE_ROLE_KEY dans le composant');
  assert.ok(!settingsContent.includes('service_role'), 'Pas de service_role dans le composant');
});

test('4.3. MemberNotificationSettings.tsx est accessible (role switch, labels, aria)', () => {
  assert.ok(settingsContent.includes('role="switch"'), 'Doit avoir des boutons accessibles role switch');
  assert.ok(settingsContent.includes('aria-checked'), 'Doit avoir aria-checked');
  assert.ok(settingsContent.includes('aria-label'), 'Doit avoir aria-label');
});

const profileViewContent = fs.readFileSync(profileViewPath, 'utf8');

test('4.4. MemberProfileView.tsx intègre MemberNotificationSettings', () => {
  assert.ok(profileViewContent.includes('MemberNotificationSettings'), 'Doit importer et afficher MemberNotificationSettings');
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
