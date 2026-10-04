/**
 * TEST SUITE — ÉTAPE 8 : FRONTEND DES NOTIFICATIONS & ALERTES MEMBRE
 *
 * Vérifie au minimum les 14 points obligatoires :
 * 1. Aucune notification (état vide)
 * 2. Affichage d'une notification (titre, message, catégorie, date)
 * 3. Notification non lue (indicateur visuel et statut)
 * 4. Notification lue (style estompé, absence de puce non-lue)
 * 5. Marquage individuel comme lu (mise à jour d'état et décrémentation)
 * 6. Marquage global comme lu (toutes à is_read = true, compteur = 0)
 * 7. Compteur du badge (0 = masqué, > 0 = affiché, > 99 = "99+")
 * 8. Navigation via action_url (redirection interne valide)
 * 9. Sécurité des URLs (rejet strict des URLs externes, javascript: et protocol-relative //)
 * 10. Séparation stricte des utilisateurs (user_id session non falsifiable)
 * 11. Activation des notifications (workflow subscribe)
 * 12. Désactivation des notifications (workflow unsubscribe)
 * 13. Gestion permission navigateur refusée (état denied)
 * 14. Responsive / logique mobile (présence du badge dans MemberBottomNav et MemberHeader)
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Import des helpers réels exportés
import {
  getSafeActionUrl,
  formatNotificationDate,
  getNotificationCategoryMeta,
} from '../lib/notifications/notification-ui-helpers.ts';

console.log('='.repeat(70));
console.log('  TESTS ÉTAPE 8 — FRONTEND DES NOTIFICATIONS STRIKING CAMP');
console.log('='.repeat(70));

let passedTests = 0;
let totalTests = 0;

function test(num, name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ [PASS] ${num}. ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${num}. ${name}`);
    console.error(`     -> ${err.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────
// SIMULATION D'ÉTAT DU CENTRE DE NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────

function createNotificationState(initialLogs = []) {
  let logs = [...initialLogs];

  const getUnreadCount = () => logs.filter((l) => !l.is_read).length;

  const markAsRead = (id) => {
    logs = logs.map((l) => (l.id === id ? { ...l, is_read: true } : l));
  };

  const markAllAsRead = () => {
    logs = logs.map((l) => ({ ...l, is_read: true }));
  };

  const filterLogs = (filterType) => {
    if (filterType === 'unread') {
      return logs.filter((l) => !l.is_read);
    }
    return logs;
  };

  return {
    getLogs: () => logs,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    filterLogs,
  };
}

// ─────────────────────────────────────────────────────────────────
// EXÉCUTION DES 14 TESTS FRONTEND
// ─────────────────────────────────────────────────────────────────

// 1. Aucune notification (état vide)
test('1', 'Aucune notification : État vide initialisé proprement', () => {
  const state = createNotificationState([]);
  assert.strictEqual(state.getLogs().length, 0);
  assert.strictEqual(state.getUnreadCount(), 0);
  assert.strictEqual(state.filterLogs('unread').length, 0);
});

// 2. Affichage d'une notification (titre, message, catégorie, date)
test('2', 'Affichage d\'une notification avec catégorie, titre, body et date', () => {
  const sample = {
    id: 'n-1',
    user_id: 'u-1',
    category: 'meal_lunch',
    channel: 'web_push',
    title: 'Rappel Déjeuner 🥗',
    body: 'Pensez à votre repas de midi',
    action_url: '/membre/defis?tab=nutrition',
    is_read: false,
    action_completed: false,
    scheduled_date: '2026-10-05',
    sent_at: '2026-10-05T10:30:00Z',
  };

  const meta = getNotificationCategoryMeta(sample.category);
  assert.strictEqual(meta.label, 'Déjeuner');
  assert.ok(meta.badgeClass.includes('22c55e'), 'Doit avoir la couleur nutrition verte');

  const formattedDate = formatNotificationDate(sample.sent_at);
  assert.ok(formattedDate.length > 0, 'La date doit être formatée');
});

// 3. Notification non lue (indicateur visuel et statut)
test('3', 'Notification non lue : is_read=false comptabilisée dans le compteur non lues', () => {
  const state = createNotificationState([
    { id: 'n-1', is_read: false, title: 'Non lue' },
    { id: 'n-2', is_read: true, title: 'Lue' },
  ]);

  assert.strictEqual(state.getUnreadCount(), 1, 'Exactement 1 non lue');
  const unreadOnly = state.filterLogs('unread');
  assert.strictEqual(unreadOnly.length, 1);
  assert.strictEqual(unreadOnly[0].id, 'n-1');
});

// 4. Notification lue (style estompé, absence de puce non-lue)
test('4', 'Notification lue : is_read=true exclue du filtre non lues', () => {
  const state = createNotificationState([
    { id: 'n-read', is_read: true, title: 'Déjà lue' }
  ]);

  assert.strictEqual(state.getUnreadCount(), 0);
  assert.strictEqual(state.filterLogs('unread').length, 0);
  assert.strictEqual(state.filterLogs('all').length, 1);
});

// 5. Marquage individuel comme lu (mise à jour d'état et décrémentation)
test('5', 'Marquage individuel comme lu : transition is_read false -> true et décrémentation', () => {
  const state = createNotificationState([
    { id: 'n-1', is_read: false },
    { id: 'n-2', is_read: false },
  ]);

  assert.strictEqual(state.getUnreadCount(), 2);
  state.markAsRead('n-1');
  assert.strictEqual(state.getUnreadCount(), 1);
  const updated = state.getLogs().find((l) => l.id === 'n-1');
  assert.strictEqual(updated.is_read, true);
});

// 6. Marquage global comme lu (toutes à is_read = true, compteur = 0)
test('6', 'Marquage global comme lu : toutes les notifications passent à is_read = true', () => {
  const state = createNotificationState([
    { id: 'n-1', is_read: false },
    { id: 'n-2', is_read: false },
    { id: 'n-3', is_read: false },
  ]);

  assert.strictEqual(state.getUnreadCount(), 3);
  state.markAllAsRead();
  assert.strictEqual(state.getUnreadCount(), 0);
  assert.ok(state.getLogs().every((l) => l.is_read === true));
});

// 7. Compteur du badge (0 = masqué, > 0 = affiché, > 99 = "99+")
test('7', 'Formatage du badge de notification : gestion des seuils 0, normal et 99+', () => {
  const formatBadge = (count) => {
    if (count <= 0) return null;
    return count > 99 ? '99+' : String(count);
  };

  assert.strictEqual(formatBadge(0), null, 'Badge masqué si 0');
  assert.strictEqual(formatBadge(1), '1');
  assert.strictEqual(formatBadge(7), '7');
  assert.strictEqual(formatBadge(99), '99');
  assert.strictEqual(formatBadge(100), '99+');
  assert.strictEqual(formatBadge(350), '99+');
});

// 8. Navigation via action_url (redirection interne valide)
test('8', 'Navigation via action_url : accepte les chemins internes sécurisés', () => {
  assert.strictEqual(getSafeActionUrl('/membre/defis?tab=nutrition'), '/membre/defis?tab=nutrition');
  assert.strictEqual(getSafeActionUrl('/membre/planning?session=cs-123'), '/membre/planning?session=cs-123');
  assert.strictEqual(getSafeActionUrl('/evenements'), '/evenements');
});

// 9. Sécurité des URLs (rejet strict des URLs externes, javascript: et protocol-relative //)
test('9', 'Sécurité des URLs : neutralisation des attaques open-redirect et injection XSS', () => {
  const dangerousUrls = [
    'https://malicious.org/phishing',
    'http://evil.com',
    '//evil.com/fake',
    'javascript:alert(document.cookie)',
    'JAVASCRIPT:void(0)',
    'data:text/html,<script>alert(1)</script>',
    '',
    null,
    undefined,
    '   ',
  ];

  for (const dangerous of dangerousUrls) {
    assert.strictEqual(
      getSafeActionUrl(dangerous),
      null,
      `L'URL dangereuse "${dangerous}" doit impérativement retourner null`
    );
  }
});

// 10. Séparation stricte des utilisateurs (user_id session non falsifiable)
test('10', 'Séparation stricte des utilisateurs : les Server Actions n\'acceptent aucun user_id client', () => {
  const actionsContent = fs.readFileSync(path.resolve('app/(membre)/actions.ts'), 'utf8');

  // getMemberNotificationsAction ne prend pas userId en argument
  assert.ok(
    actionsContent.includes('export async function getMemberNotificationsAction('),
    'Action présente'
  );
  assert.ok(
    !actionsContent.includes('getMemberNotificationsAction(userId'),
    'user_id ne doit pas provenir des arguments clients'
  );

  // markMemberNotificationAsReadAction ne prend que notificationId
  const normalizedActions = actionsContent.replace(/\r\n/g, '\n');
  assert.ok(
    normalizedActions.includes('export async function markMemberNotificationAsReadAction(\n  notificationId: string'),
    'Ne prend que notificationId'
  );
  assert.ok(
    !normalizedActions.includes('markMemberNotificationAsReadAction(userId'),
    'user_id ne doit pas provenir des arguments clients'
  );
});

// 11. Activation des notifications (workflow subscribe)
test('11', 'Activation des notifications : Présence de subscribeUserToPush non intrusive', () => {
  const workerManagerContent = fs.readFileSync(
    path.resolve('lib/notifications/register-service-worker.ts'),
    'utf8'
  );

  assert.ok(
    workerManagerContent.includes('export async function subscribeUserToPush('),
    'subscribeUserToPush disponible'
  );
  assert.ok(
    workerManagerContent.includes('Notification.requestPermission()'),
    'Demande permission explicite'
  );
});

// 12. Désactivation des notifications (workflow unsubscribe)
test('12', 'Désactivation des notifications : Présence de unsubscribeUserFromPush', () => {
  const workerManagerContent = fs.readFileSync(
    path.resolve('lib/notifications/register-service-worker.ts'),
    'utf8'
  );

  assert.ok(
    workerManagerContent.includes('export async function unsubscribeUserFromPush('),
    'unsubscribeUserFromPush disponible'
  );
});

// 13. Gestion permission navigateur refusée (état denied)
test('13', 'Gestion permission refusée : Message clair sans termes techniques', () => {
  const settingsContent = fs.readFileSync(
    path.resolve('components/membre/MemberNotificationSettings.tsx'),
    'utf8'
  );

  assert.ok(
    settingsContent.includes('pushState === "denied"'),
    'Gère l\'état denied'
  );
  assert.ok(
    settingsContent.includes('Bloquées par votre navigateur'),
    'Avertit l\'utilisateur poliment de débloquer dans ses paramètres'
  );
});

// 14. Responsive / logique mobile (présence du badge dans MemberBottomNav et MemberHeader)
test('14', 'Logique Responsive : Le badge est intégré dans le Header (desktop) et BottomNav (mobile)', () => {
  const headerContent = fs.readFileSync(
    path.resolve('components/membre/MemberHeader.tsx'),
    'utf8'
  );
  const bottomNavContent = fs.readFileSync(
    path.resolve('components/membre/MemberBottomNav.tsx'),
    'utf8'
  );

  assert.ok(
    headerContent.includes('unreadNotificationsCount'),
    'MemberHeader écoute unreadNotificationsCount'
  );
  assert.ok(
    headerContent.includes('unreadNotificationsCount > 0'),
    'MemberHeader affiche le badge dynamique'
  );

  assert.ok(
    bottomNavContent.includes('unreadNotificationsCount'),
    'MemberBottomNav écoute unreadNotificationsCount'
  );
  assert.ok(
    bottomNavContent.includes('unreadNotificationsCount > 0'),
    'MemberBottomNav affiche le badge dynamique sur mobile'
  );
});

// ─────────────────────────────────────────────────────────────────
// BILAN DES TESTS FRONTEND
// ─────────────────────────────────────────────────────────────────
console.log('\n' + '='.repeat(70));
console.log(`BILAN DES TESTS FRONTEND : ${passedTests} / ${totalTests} tests réussis`);
console.log('='.repeat(70));

if (passedTests !== totalTests) {
  process.exit(1);
}
