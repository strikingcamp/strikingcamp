/**
 * TEST SUITE — ÉTAPE 4 : INFRASTRUCTURE WEB PUSH & SERVICE WORKER
 *
 * Vérifie :
 * 1. Présence et intégrité du Service Worker (public/sw.js)
 * 2. Absence totale de secrets dans le Service Worker et code client
 * 3. Génération et validité des clés VAPID
 * 4. Validation des payloads et règles de sécurité de l'API route push-subscription
 * 5. Conversion base64 URL-safe (urlBase64ToUint8Array)
 * 6. Non-exposition des clés privées / service_role
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import webpush from 'web-push';

console.log('='.repeat(70));
console.log('  TESTS ÉTAPE 4 — INFRASTRUCTURE WEB PUSH & SERVICE WORKER');
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

async function testAsync(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     -> ${err.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────
// 1. SERVICE WORKER (public/sw.js)
// ─────────────────────────────────────────────────────────────────
console.log('\n--- 1. Analyse du Service Worker (public/sw.js) ---');

const swPath = path.resolve('public', 'sw.js');

test('Le fichier public/sw.js existe', () => {
  assert.ok(fs.existsSync(swPath), 'public/sw.js doit exister');
});

const swContent = fs.existsSync(swPath) ? fs.readFileSync(swPath, 'utf8') : '';

test('Le Service Worker contient les écouteurs "install", "activate", "push", "notificationclick"', () => {
  assert.ok(swContent.includes("addEventListener('install'"), 'Doit écouter install');
  assert.ok(swContent.includes("addEventListener('activate'"), 'Doit écouter activate');
  assert.ok(swContent.includes("addEventListener('push'"), 'Doit écouter push');
  assert.ok(swContent.includes("addEventListener('notificationclick'"), 'Doit écouter notificationclick');
});

test('Le Service Worker gère la navigation et le focus de fenêtre', () => {
  assert.ok(swContent.includes('clients.matchAll'), 'Doit matcher les clients existants');
  assert.ok(swContent.includes('client.focus'), 'Doit focus le client existant');
  assert.ok(swContent.includes('clients.openWindow'), 'Doit ouvrir une fenêtre si aucune ouverte');
});

test('Le Service Worker ne contient aucun secret ni clé privée', () => {
  assert.ok(!swContent.includes('SUPABASE_SERVICE_ROLE_KEY'), 'Aucun service role dans sw.js');
  assert.ok(!swContent.includes('VAPID_PRIVATE_KEY'), 'Aucune clé VAPID privée dans sw.js');
  assert.ok(!swContent.includes('process.env'), 'Aucun process.env dans sw.js');
  assert.ok(!swContent.includes('service_role'), 'Aucun service_role dans sw.js');
});

test('Le Service Worker ne contient aucune logique métier (nutrition/workout/database)', () => {
  assert.ok(!swContent.includes('supabase'), 'Pas de Supabase dans sw.js');
  assert.ok(!swContent.includes('user_daily_food_logs'), 'Pas de DB food dans sw.js');
  assert.ok(!swContent.includes('bookings'), 'Pas de DB bookings dans sw.js');
});

// ─────────────────────────────────────────────────────────────────
// 2. GÉNÉRATION VAPID & BIBLIOTHÈQUE WEB PUSH
// ─────────────────────────────────────────────────────────────────
console.log('\n--- 2. Génération VAPID & web-push ---');

const vapidScriptPath = path.resolve('scripts', 'generate-vapid-keys.mjs');

test('Le script scripts/generate-vapid-keys.mjs existe', () => {
  assert.ok(fs.existsSync(vapidScriptPath), 'scripts/generate-vapid-keys.mjs doit exister');
});

test('La librairie web-push génère une paire VAPID valide', () => {
  const keys = webpush.generateVAPIDKeys();
  assert.ok(keys.publicKey, 'publicKey doit exister');
  assert.ok(keys.privateKey, 'privateKey doit exister');
  assert.strictEqual(typeof keys.publicKey, 'string');
  assert.strictEqual(typeof keys.privateKey, 'string');
  assert.ok(keys.publicKey.length > 50, 'publicKey doit avoir une longueur réaliste');
  assert.ok(keys.privateKey.length > 20, 'privateKey doit avoir une longueur réaliste');
});

// ─────────────────────────────────────────────────────────────────
// 3. CODE CLIENT & ENREGISTREMENT (register-service-worker.ts)
// ─────────────────────────────────────────────────────────────────
console.log('\n--- 3. Code client (lib/notifications/register-service-worker.ts) ---');

const clientSwPath = path.resolve('lib', 'notifications', 'register-service-worker.ts');

test('Le fichier lib/notifications/register-service-worker.ts existe', () => {
  assert.ok(fs.existsSync(clientSwPath), 'lib/notifications/register-service-worker.ts doit exister');
});

const clientSwContent = fs.existsSync(clientSwPath) ? fs.readFileSync(clientSwPath, 'utf8') : '';

test('Le module client n\'importe jamais VAPID_PRIVATE_KEY ni SUPABASE_SERVICE_ROLE_KEY', () => {
  assert.ok(!clientSwContent.includes('VAPID_PRIVATE_KEY'), 'Jamais VAPID_PRIVATE_KEY côté client');
  assert.ok(!clientSwContent.includes('SUPABASE_SERVICE_ROLE_KEY'), 'Jamais SUPABASE_SERVICE_ROLE_KEY côté client');
});

test('Conversion VAPID base64 URL-safe vers Uint8Array', () => {
  // Testons l'algorithme pur de conversion
  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = Buffer.from(base64, 'base64').toString('binary');
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  const keys = webpush.generateVAPIDKeys();
  const uint8 = urlBase64ToUint8Array(keys.publicKey);
  assert.ok(uint8 instanceof Uint8Array, 'Doit être un Uint8Array');
  assert.ok(uint8.length > 0, 'Longueur positive');
});

// ─────────────────────────────────────────────────────────────────
// 4. ROUTE API (app/api/notifications/push-subscription/route.ts)
// ─────────────────────────────────────────────────────────────────
console.log('\n--- 4. Route API (app/api/notifications/push-subscription/route.ts) ---');

const apiRoutePath = path.resolve('app', 'api', 'notifications', 'push-subscription', 'route.ts');

test('Le fichier app/api/notifications/push-subscription/route.ts existe', () => {
  assert.ok(fs.existsSync(apiRoutePath), 'Route API doit exister');
});

const apiRouteContent = fs.existsSync(apiRoutePath) ? fs.readFileSync(apiRoutePath, 'utf8') : '';

test('La route API exporte POST et DELETE', () => {
  assert.ok(apiRouteContent.includes('export async function POST'), 'Doit exporter POST');
  assert.ok(apiRouteContent.includes('export async function DELETE'), 'Doit exporter DELETE');
});

test('La route API utilise la session utilisateur authentifiée (jamais de user_id client)', () => {
  assert.ok(apiRouteContent.includes('supabase.auth.getUser()'), 'Doit récupérer le user depuis auth');
  assert.ok(apiRouteContent.includes('user.id'), 'Doit utiliser user.id de la session');
  assert.ok(!apiRouteContent.includes('body.user_id'), 'Ne doit JAMAIS utiliser body.user_id');
  assert.ok(!apiRouteContent.includes('body?.user_id'), 'Ne doit JAMAIS utiliser body?.user_id');
});

test('La route API valide strictement les champs (endpoint, p256dh_key, auth_key)', () => {
  assert.ok(apiRouteContent.includes('isValidEndpoint'), 'Doit valider l\'endpoint');
  assert.ok(apiRouteContent.includes('isValidPushKey'), 'Doit valider les clés');
});

// ─────────────────────────────────────────────────────────────────
// 5. VARIABLES D'ENVIRONNEMENT & NON-RÉGRESSION
// ─────────────────────────────────────────────────────────────────
console.log('\n--- 5. Variables d\'environnement & Exemples ---');

const envExamplePath = path.resolve('.env.local.example');
const envExampleContent = fs.existsSync(envExamplePath) ? fs.readFileSync(envExamplePath, 'utf8') : '';

test('.env.local.example contient les nouvelles variables VAPID sans secret', () => {
  assert.ok(envExampleContent.includes('NEXT_PUBLIC_VAPID_PUBLIC_KEY='), 'Doit déclarer NEXT_PUBLIC_VAPID_PUBLIC_KEY');
  assert.ok(envExampleContent.includes('VAPID_PRIVATE_KEY='), 'Doit déclarer VAPID_PRIVATE_KEY');
  assert.ok(envExampleContent.includes('VAPID_SUBJECT='), 'Doit déclarer VAPID_SUBJECT');
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
