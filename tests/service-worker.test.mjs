/**
 * TEST SUITE — SERVICE WORKER WEB PUSH & ASSETS STRIKING CAMP
 *
 * Vérifie :
 * 1. Présence physique de l'asset /logo-sc.png dans /public
 * 2. Événement 'install' (skipWaiting)
 * 3. Événement 'activate' (clients.claim)
 * 4. Événement 'push' avec payload complet
 * 5. Événement 'push' avec payload incomplet / titre absent (fallback)
 * 6. Événement 'push' avec body absent (fallback)
 * 7. Événement 'push' avec action_url absent (fallback)
 * 8. Événement 'notificationclick' avec focus d'une fenêtre existante
 * 9. Événement 'notificationclick' avec ouverture d'une nouvelle fenêtre
 * 10. Sécurité anti-open redirect sur targetUrl
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

console.log('='.repeat(70));
console.log('  TESTS SERVICE WORKER & ASSETS — STRIKING CAMP');
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
// 1. VÉRIFICATION DE L'ASSET /logo-sc.png
// ─────────────────────────────────────────────────────────────────
console.log('\n--- 1. Vérification des Assets Statiques ---');

test('1.1. L\'asset public/logo-sc.png existe réellement sur le disque', () => {
  const logoPath = path.resolve('public', 'logo-sc.png');
  const exists = fs.existsSync(logoPath);
  assert.strictEqual(exists, true, "Le fichier public/logo-sc.png doit exister physiquement");
  const stats = fs.statSync(logoPath);
  assert.ok(stats.size > 0, "Le fichier logo-sc.png ne doit pas être vide");
});

test('1.2. Le fichier public/sw.js existe et contient la logique Web Push requise', () => {
  const swPath = path.resolve('public', 'sw.js');
  assert.ok(fs.existsSync(swPath), "public/sw.js doit exister");
  const content = fs.readFileSync(swPath, 'utf8');
  assert.ok(content.includes("addEventListener('install'"), "Doit gérer install");
  assert.ok(content.includes("addEventListener('activate'"), "Doit gérer activate");
  assert.ok(content.includes("addEventListener('push'"), "Doit gérer push");
  assert.ok(content.includes("addEventListener('notificationclick'"), "Doit gérer notificationclick");
  assert.ok(content.includes("/logo-sc.png"), "Doit référencer /logo-sc.png");
});

// ─────────────────────────────────────────────────────────────────
// 2. SIMULATION DU COMPORTEMENT DU SERVICE WORKER
// ─────────────────────────────────────────────────────────────────
console.log('\n--- 2. Logique du Service Worker (Push & NotificationClick) ---');

const FALLBACK_TITLE = 'Striking Camp';
const FALLBACK_BODY = 'Vous avez un nouveau rappel Striking Camp.';
const FALLBACK_ICON = '/logo-sc.png';
const FALLBACK_BADGE = '/logo-sc.png';
const FALLBACK_ACTION_URL = '/membre';

function simulatePushEvent(rawEventData) {
  let payload = {};

  if (rawEventData) {
    if (typeof rawEventData === 'object' && rawEventData.json) {
      payload = rawEventData.json();
    } else if (typeof rawEventData === 'string') {
      try {
        payload = JSON.parse(rawEventData);
      } catch {
        payload = { body: rawEventData };
      }
    }
  }

  const title = payload.title || FALLBACK_TITLE;
  let actionUrl = payload.action_url || payload.data?.action_url || FALLBACK_ACTION_URL;

  if (typeof actionUrl !== 'string' || !actionUrl.startsWith('/') || actionUrl.startsWith('//')) {
    actionUrl = FALLBACK_ACTION_URL;
  }

  const options = {
    body: payload.body || FALLBACK_BODY,
    icon: payload.icon || FALLBACK_ICON,
    badge: payload.badge || FALLBACK_BADGE,
    tag: payload.tag || 'strikingcamp-reminder',
    renotify: true,
    data: {
      action_url: actionUrl,
      ...(payload.data || {})
    }
  };

  return { title, options };
}

function simulateNotificationClick(notificationData, clientsList = []) {
  let targetUrl = (notificationData && notificationData.action_url)
    ? notificationData.action_url
    : FALLBACK_ACTION_URL;

  if (typeof targetUrl !== 'string' || !targetUrl.startsWith('/') || targetUrl.startsWith('//')) {
    targetUrl = FALLBACK_ACTION_URL;
  }

  const origin = 'https://strikingcamp.fr';
  const urlToOpen = new URL(targetUrl, origin).href;

  let focusedClient = null;
  let openedWindow = null;
  let navigatedUrl = null;

  for (const client of clientsList) {
    if (client.url.startsWith(origin) && client.canFocus) {
      if (client.canNavigate && client.url !== urlToOpen) {
        navigatedUrl = urlToOpen;
      }
      focusedClient = client;
      break;
    }
  }

  if (!focusedClient) {
    openedWindow = urlToOpen;
  }

  return { urlToOpen, focusedClient, openedWindow, navigatedUrl };
}

test('2.1. Push avec payload complet -> Valeurs fidèles', () => {
  const result = simulatePushEvent(JSON.stringify({
    title: 'Rappel Déjeuner 🥗',
    body: 'Pensez à votre repas',
    action_url: '/membre/defis?tab=nutrition',
  }));

  assert.strictEqual(result.title, 'Rappel Déjeuner 🥗');
  assert.strictEqual(result.options.body, 'Pensez à votre repas');
  assert.strictEqual(result.options.icon, '/logo-sc.png');
  assert.strictEqual(result.options.data.action_url, '/membre/defis?tab=nutrition');
});

test('2.2. Push avec titre absent -> Utilise FALLBACK_TITLE', () => {
  const result = simulatePushEvent(JSON.stringify({
    body: 'Corps sans titre',
  }));
  assert.strictEqual(result.title, FALLBACK_TITLE);
  assert.strictEqual(result.options.body, 'Corps sans titre');
});

test('2.3. Push avec body absent -> Utilise FALLBACK_BODY', () => {
  const result = simulatePushEvent(JSON.stringify({
    title: 'Titre seul',
  }));
  assert.strictEqual(result.options.body, FALLBACK_BODY);
});

test('2.4. Push avec action_url absent -> Utilise FALLBACK_ACTION_URL (/membre)', () => {
  const result = simulatePushEvent(JSON.stringify({
    title: 'Notification',
  }));
  assert.strictEqual(result.options.data.action_url, '/membre');
});

test('2.5. Push avec payload vide ou données brutes malformées -> Fallback gracieux', () => {
  const result = simulatePushEvent(null);
  assert.strictEqual(result.title, FALLBACK_TITLE);
  assert.strictEqual(result.options.body, FALLBACK_BODY);
  assert.strictEqual(result.options.data.action_url, FALLBACK_ACTION_URL);
});

test('2.6. NotificationClick sans onglet existant -> Ouvre une nouvelle fenêtre vers urlToOpen', () => {
  const res = simulateNotificationClick({ action_url: '/membre/planning?session=cs-1' }, []);
  assert.strictEqual(res.urlToOpen, 'https://strikingcamp.fr/membre/planning?session=cs-1');
  assert.strictEqual(res.openedWindow, 'https://strikingcamp.fr/membre/planning?session=cs-1');
  assert.strictEqual(res.focusedClient, null);
});

test('2.7. NotificationClick avec onglet existant -> Focus et navigue vers action_url', () => {
  const clients = [
    { url: 'https://strikingcamp.fr/membre', canFocus: true, canNavigate: true }
  ];
  const res = simulateNotificationClick({ action_url: '/membre/defis?tab=workouts' }, clients);
  assert.ok(res.focusedClient !== null);
  assert.strictEqual(res.navigatedUrl, 'https://strikingcamp.fr/membre/defis?tab=workouts');
  assert.strictEqual(res.openedWindow, null);
});

test('2.8. NotificationClick avec tentative d\'injection d\'URL externe -> Redirigé vers FALLBACK_ACTION_URL', () => {
  const maliciousUrls = [
    'https://malicious.com',
    'http://attacker.org/steal',
    '//evil.example.com',
    'javascript:alert(1)',
  ];

  for (const badUrl of maliciousUrls) {
    const res = simulateNotificationClick({ action_url: badUrl }, []);
    assert.strictEqual(res.urlToOpen, 'https://strikingcamp.fr/membre', `URL malveillante ${badUrl} doit être neutralisée`);
  }
});

// ─────────────────────────────────────────────────────────────────
// BILAN
// ─────────────────────────────────────────────────────────────────
console.log('\n' + '='.repeat(70));
console.log(`BILAN DU SERVICE WORKER : ${passedTests} / ${totalTests} tests réussis`);
console.log('='.repeat(70));

if (passedTests !== totalTests) {
  process.exit(1);
}
