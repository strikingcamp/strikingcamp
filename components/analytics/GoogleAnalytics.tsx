"use client";

import { useEffect } from "react";
import Script from "next/script";
import { GA_TRACKING_ID, CONSENT_STORAGE_KEY } from "@/lib/analytics";

export default function GoogleAnalytics() {
  useEffect(() => {
    if (!GA_TRACKING_ID) return;

    const handleConsentUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ status: "granted" | "denied" }>;
      if (typeof window.gtag === "function" && customEvent.detail?.status) {
        window.gtag("consent", "update", {
          analytics_storage: customEvent.detail.status === "granted" ? "granted" : "denied",
          ad_storage: "denied",
          ad_user_data: "denied",
          ad_personalization: "denied",
        });
      }
    };

    window.addEventListener("cookie_consent_updated", handleConsentUpdate);
    return () => {
      window.removeEventListener("cookie_consent_updated", handleConsentUpdate);
    };
  }, []);

  if (!GA_TRACKING_ID) {
    return null;
  }

  return (
    <>
      {/* 1. Google Consent Mode v2 Default Denied Init */}
      <Script
        id="google-consent-mode-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}

            // État par défaut : Strictement refusé (RGPD)
            var currentConsent = 'denied';
            try {
              var stored = localStorage.getItem('${CONSENT_STORAGE_KEY}');
              if (stored === 'granted') {
                currentConsent = 'granted';
              }
            } catch(e) {}

            gtag('consent', 'default', {
              'analytics_storage': currentConsent,
              'ad_storage': 'denied',
              'ad_user_data': 'denied',
              'ad_personalization': 'denied'
            });
          `,
        }}
      />

      {/* 2. Chargement du tag GA4 */}
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`}
      />

      {/* 3. Configuration de la propriété GA4 */}
      <Script
        id="google-analytics-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_TRACKING_ID}', {
              page_path: window.location.pathname,
              anonymize_ip: true,
              send_page_view: true
            });
          `,
        }}
      />
    </>
  );
}
