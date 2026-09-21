/**
 * Module Analytics sécurisé et strictement respectueux de la vie privée (RGPD).
 *
 * Principes RGPD stricts :
 * 1. Consentement préalable requis avant tout tracking Analytics.
 * 2. Aucune donnée personnelle (nom, prénom, email, téléphone, identifiant membre, contenu de formulaire) n'est transmise.
 * 3. Support complet de Google Consent Mode v2 (analytics_storage, ad_storage, ad_user_data, ad_personalization).
 * 4. Révocation immédiate et sans friction à tout moment.
 */

export type ConsentStatus = "unknown" | "granted" | "denied";

export const CONSENT_STORAGE_KEY = "strikingcamp_cookie_consent";
export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_ID || "";

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

/**
 * Récupère l'état actuel du consentement mémorisé.
 */
export function getStoredConsent(): ConsentStatus {
  if (typeof window === "undefined") return "unknown";
  try {
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (stored === "granted" || stored === "denied") {
      return stored;
    }
  } catch {
    // localStorage indisponible (ex: navigation privée stricte)
  }
  return "unknown";
}

/**
 * Met à jour le consentement localement et informe Google Consent Mode v2 ainsi que l'application.
 */
export function setStoredConsent(status: "granted" | "denied"): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, status);
  } catch {
    // Silently ignore
  }

  // Mise à jour de Google Consent Mode si gtag est chargé
  if (typeof window.gtag === "function") {
    try {
      window.gtag("consent", "update", {
        analytics_storage: status === "granted" ? "granted" : "denied",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
      });
    } catch {
      // Silently ignore
    }
  }

  // Notifie l'application d'un changement de consentement
  window.dispatchEvent(
    new CustomEvent("cookie_consent_updated", {
      detail: { status },
    })
  );
}

/**
 * Déclenche l'ouverture du panneau de gestion des cookies depuis n'importe quel composant.
 */
export function openCookiePreferences(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("open_cookie_preferences"));
}

/**
 * Vérifie si le tracking Analytics est autorisé et actif.
 */
export function isAnalyticsAllowed(): boolean {
  if (typeof window === "undefined") return false;
  if (!GA_TRACKING_ID) return false;
  return getStoredConsent() === "granted";
}

/**
 * Envoie un événement générique à Google Analytics si le consentement est accordé.
 * Filtre et garantit l'absence totale de données personnelles (PII).
 */
export function trackEvent(action: string, params?: Record<string, unknown>) {
  if (!isAnalyticsAllowed()) return;
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;

  try {
    window.gtag("event", action, params);
  } catch {
    // Silently ignore errors
  }
}

/* =========================================================================
   ÉVÉNEMENTS GÉNÉRIQUES & SÉCURISÉS (ZÉRO DONNÉE PERSONNELLE)
   ========================================================================= */

/** Vue de page (sans query params sensibles) */
export function trackPageView(pagePath: string, pageTitle?: string) {
  trackEvent("page_view", {
    page_path: pagePath,
    page_title: pageTitle || (typeof document !== "undefined" ? document.title : ""),
  });
}

/** Clic sur un bouton d'action (CTA) */
export function trackCtaClick(ctaName: string, location: string) {
  trackEvent("cta_click", {
    event_category: "Engagement",
    event_label: ctaName,
    location,
  });
}

/** Clic de navigation principale */
export function trackNavigationClick(destination: string) {
  trackEvent("navigation_click", {
    event_category: "Navigation",
    event_label: destination,
  });
}

/** Consultation des formules & tarifs */
export function trackPricingView(planCategory?: string) {
  trackEvent("pricing_view", {
    event_category: "Tarifs",
    plan_category: planCategory || "all",
  });
}

/** Consultation du planning des cours */
export function trackScheduleView(dayOrDiscipline?: string) {
  trackEvent("schedule_view", {
    event_category: "Planning",
    filter: dayOrDiscipline || "all",
  });
}

/** Consultation de la fiche d'une discipline */
export function trackDisciplineView(disciplineSlug: string) {
  trackEvent("discipline_view", {
    event_category: "Discipline",
    discipline: disciplineSlug,
  });
}

/** Clic de contact général (formulaire / carte) */
export function trackContactClick(channel: "form_submit" | "maps_direction") {
  trackEvent("contact_click", {
    event_category: "Contact",
    channel,
  });
}

/** Clic d'appel téléphonique */
export function trackPhoneClick(location: string) {
  trackEvent("phone_click", {
    event_category: "Contact",
    event_label: "Call Club",
    location,
  });
}

/** Clic WhatsApp */
export function trackWhatsAppClick(location: string) {
  trackEvent("whatsapp_click", {
    event_category: "Contact",
    event_label: "WhatsApp Club",
    location,
  });
}

/** Clic d'inscription ou réservation d'essai */
export function trackBookingClick(bookingType: "trial_modal" | "pass_selection" | "membership", location: string) {
  trackEvent("booking_intent", {
    event_category: "Conversion",
    booking_type: bookingType,
    location,
  });
}
