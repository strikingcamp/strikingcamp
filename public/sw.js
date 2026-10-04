/* eslint-disable no-restricted-globals */
// Service Worker Web Push — Striking Camp
// Ce fichier gère exclusivement la réception des notifications Web Push et les clics utilisateur.

const FALLBACK_TITLE = 'Striking Camp';
const FALLBACK_BODY = 'Vous avez un nouveau rappel Striking Camp.';
const FALLBACK_ICON = '/logo-sc.png';
const FALLBACK_BADGE = '/logo-sc.png';
const FALLBACK_ACTION_URL = '/membre';

// Cycle de vie : installation immédiate
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Cycle de vie : activation et prise de contrôle des clients
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Réception d'un événement Web Push
self.addEventListener('push', (event) => {
  let payload = {};

  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      try {
        payload = { body: event.data.text() };
      } catch {
        payload = {};
      }
    }
  }

  const title = payload.title || FALLBACK_TITLE;
  const actionUrl = payload.action_url || payload.data?.action_url || FALLBACK_ACTION_URL;

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

  event.waitUntil(self.registration.showNotification(title, options));
});

// Gestion du clic sur la notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  let targetUrl = (event.notification.data && event.notification.data.action_url)
    ? event.notification.data.action_url
    : FALLBACK_ACTION_URL;

  // Sécurité anti-redirection externe : vérifie que l'URL est relative au domaine de l'application
  if (typeof targetUrl !== 'string' || !targetUrl.startsWith('/') || targetUrl.startsWith('//')) {
    targetUrl = FALLBACK_ACTION_URL;
  }

  const urlToOpen = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Si un onglet Striking Camp est déjà ouvert, on le focus et on le navigue si besoin
      for (const client of windowClients) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          if ('navigate' in client && client.url !== urlToOpen) {
            client.navigate(urlToOpen);
          }
          return client.focus();
        }
      }

      // Sinon, on ouvre une nouvelle fenêtre/onglet
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
      return null;
    })
  );
});
