/**
 * Module Analytics sécurisé et respectueux de la vie privée (RGPD).
 * Aucune donnée personnelle (nom, email, téléphone, identifiant) n'est transmise.
 * Ne s'exécute que si Google Analytics est explicitement configuré et initialisé.
 */

declare global {
  interface Window {
    gtag?: (
      command: "event" | "config" | "js" | "consent",
      action: string,
      params?: Record<string, unknown>
    ) => void;
    dataLayer?: unknown[];
  }
}

export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_ID || "";

export function isAnalyticsActive(): boolean {
  return typeof window !== "undefined" && typeof window.gtag === "function" && Boolean(GA_TRACKING_ID);
}

export function trackEvent(action: string, params?: Record<string, unknown>) {
  if (!isAnalyticsActive() || !window.gtag) return;
  try {
    window.gtag("event", action, params);
  } catch {
    // Silently ignore tracking errors
  }
}

export function trackCtaClick(ctaName: string, location: string) {
  trackEvent("cta_click", {
    event_category: "Engagement",
    event_label: ctaName,
    location,
  });
}

export function trackNavigationClick(destination: string) {
  trackEvent("navigation_click", {
    event_category: "Navigation",
    event_label: destination,
  });
}
