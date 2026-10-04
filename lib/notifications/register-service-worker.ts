/**
 * CLIENT-SIDE SERVICE WORKER & WEB PUSH MANAGER — STRIKING CAMP
 *
 * Ce module gère l'enregistrement du Service Worker et l'abonnement Web Push côté navigateur.
 *
 * RÈGLES DE SÉCURITÉ :
 * - Aucune demande de permission automatique au chargement.
 * - Utilise uniquement NEXT_PUBLIC_VAPID_PUBLIC_KEY côté client.
 * - Aucune clé secrète ni clé service_role dans ce fichier.
 */

import type { PushSubscriptionInput } from "@/lib/supabase/notifications";

/**
 * Vérifie si le navigateur supporte les Service Workers et le Web Push
 */
export function isPushNotificationSupported(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * Enregistre le Service Worker /sw.js de manière non intrusive
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });
    return registration;
  } catch (error) {
    console.error("[registerServiceWorker] Échec d'enregistrement :", error);
    return null;
  }
}

/**
 * Récupère le ServiceWorkerRegistration actif
 */
export async function getActiveServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    return registration;
  } catch (error) {
    console.error("[getActiveServiceWorkerRegistration] Erreur :", error);
    return null;
  }
}

/**
 * Convertit une clé publique VAPID encodée en base64 URL-safe en Uint8Array
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Extrait les clés p256dh et auth au format base64 standard depuis une PushSubscription
 */
function extractSubscriptionKeys(subscription: PushSubscription): {
  p256dh_key: string;
  auth_key: string;
} {
  const rawKey = subscription.getKey("p256dh");
  const rawAuth = subscription.getKey("auth");

  if (!rawKey || !rawAuth) {
    throw new Error("Impossible d'extraire les clés de la souscription push.");
  }

  const p256dh_key = btoa(
    String.fromCharCode.apply(null, Array.from(new Uint8Array(rawKey)))
  );
  const auth_key = btoa(
    String.fromCharCode.apply(null, Array.from(new Uint8Array(rawAuth)))
  );

  return { p256dh_key, auth_key };
}

/**
 * Récupère la souscription Web Push existante sur cet appareil
 */
export async function getCurrentPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushNotificationSupported()) return null;

  try {
    const registration = await getActiveServiceWorkerRegistration();
    if (!registration) return null;
    return await registration.pushManager.getSubscription();
  } catch (error) {
    console.error("[getCurrentPushSubscription] Erreur :", error);
    return null;
  }
}

/**
 * Demande la permission et crée une souscription Web Push
 * ⚠️ Doit être appelé suite à un clic ou une action explicite de l'utilisateur.
 */
export async function subscribeUserToPush(
  customVapidPublicKey?: string
): Promise<PushSubscriptionInput | null> {
  if (!isPushNotificationSupported()) {
    console.warn("[subscribeUserToPush] Web Push non supporté sur ce navigateur.");
    return null;
  }

  const publicKey =
    customVapidPublicKey || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  if (!publicKey) {
    console.error(
      "[subscribeUserToPush] Clé publique VAPID manquante (NEXT_PUBLIC_VAPID_PUBLIC_KEY)."
    );
    return null;
  }

  try {
    // 1. Demande de permission
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("[subscribeUserToPush] Permission refusée par l'utilisateur.");
      return null;
    }

    // 2. Enregistrement du Service Worker
    const registration = await registerServiceWorker();
    if (!registration) {
      throw new Error("Impossible d'initialiser le Service Worker.");
    }

    await navigator.serviceWorker.ready;

    // 3. Récupération ou création de la subscription
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const applicationServerKey = urlBase64ToUint8Array(publicKey);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as any,
      });
    }

    // 4. Conversion au format Striking Camp
    const { p256dh_key, auth_key } = extractSubscriptionKeys(subscription);

    const subscriptionData: PushSubscriptionInput = {
      endpoint: subscription.endpoint,
      p256dh_key,
      auth_key,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    };

    return subscriptionData;
  } catch (error) {
    console.error("[subscribeUserToPush] Erreur lors de la souscription :", error);
    return null;
  }
}

/**
 * Désabonne le navigateur actuel des notifications Web Push
 */
export async function unsubscribeUserFromPush(): Promise<{
  success: boolean;
  endpoint?: string;
}> {
  if (!isPushNotificationSupported()) return { success: false };

  try {
    const registration = await getActiveServiceWorkerRegistration();
    if (!registration) return { success: false };

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return { success: true };

    const endpoint = subscription.endpoint;
    const unsubscribed = await subscription.unsubscribe();

    return {
      success: unsubscribed,
      endpoint,
    };
  } catch (error) {
    console.error("[unsubscribeUserFromPush] Erreur lors du désabonnement :", error);
    return { success: false };
  }
}
