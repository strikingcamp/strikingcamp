"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getStoredConsent, setStoredConsent, type ConsentStatus } from "@/lib/analytics";

export default function CookieConsent() {
  const [consent, setConsent] = useState<ConsentStatus | null>(null);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const initialConsent = getStoredConsent();
    setConsent(initialConsent);

    const handleOpenPreferences = () => {
      setShowPreferencesModal(true);
    };

    const handleConsentUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<{ status: ConsentStatus }>;
      if (customEvent.detail?.status) {
        setConsent(customEvent.detail.status);
      }
    };

    window.addEventListener("open_cookie_preferences", handleOpenPreferences);
    window.addEventListener("cookie_consent_updated", handleConsentUpdated);

    return () => {
      window.removeEventListener("open_cookie_preferences", handleOpenPreferences);
      window.removeEventListener("cookie_consent_updated", handleConsentUpdated);
    };
  }, []);

  const handleAcceptAll = useCallback(() => {
    setStoredConsent("granted");
    setConsent("granted");
    setShowPreferencesModal(false);
  }, []);

  const handleRefuseAll = useCallback(() => {
    setStoredConsent("denied");
    setConsent("denied");
    setShowPreferencesModal(false);
  }, []);

  // Fermeture par la touche Escape si le modal de préférences est ouvert
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showPreferencesModal) {
        setShowPreferencesModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showPreferencesModal]);

  if (!mounted || consent === null) {
    return null;
  }

  const isBannerVisible = consent === "unknown" && !showPreferencesModal;

  return (
    <>
      {/* 1. BANDEAU INITIAL (Si aucun choix effectué) */}
      {isBannerVisible && (
        <aside
          role="region"
          aria-labelledby="cookie-banner-title"
          aria-describedby="cookie-banner-desc"
          className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6 bg-[#030712]/95 backdrop-blur-md border-t border-brand-white/15 shadow-2xl animate-fade-in"
        >
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-3xl">
              <h2
                id="cookie-banner-title"
                className="font-heading font-bold text-lg text-brand-white uppercase tracking-wider flex items-center gap-2"
              >
                <span className="inline-block w-2 h-2 rounded-full bg-brand-blue" aria-hidden="true"></span>
                Respect de votre vie privée
              </h2>
              <p id="cookie-banner-desc" className="text-brand-white/80 text-sm leading-relaxed">
                Striking Camp utilise des cookies nécessaires au bon fonctionnement du site et, avec votre accord, des cookies de mesure d'audience anonymisée (Google Analytics) pour améliorer nos services. Vous pouvez accepter, refuser ou modifier votre choix à tout moment.{" "}
                <Link
                  href="/cookies"
                  className="text-brand-blue underline underline-offset-2 hover:text-brand-white transition-colors"
                >
                  En savoir plus
                </Link>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <button
                type="button"
                onClick={handleRefuseAll}
                className="flex-1 md:flex-initial px-5 py-2.5 rounded-sm bg-brand-white/5 border border-brand-white/20 text-brand-white hover:bg-brand-white/10 hover:border-brand-white/35 font-heading font-bold text-xs uppercase tracking-wider transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-white cursor-pointer"
              >
                Refuser
              </button>

              <button
                type="button"
                onClick={() => setShowPreferencesModal(true)}
                className="flex-1 md:flex-initial px-4 py-2.5 rounded-sm bg-transparent border border-brand-white/10 text-brand-white/70 hover:text-brand-white hover:border-brand-white/25 font-heading font-medium text-xs uppercase tracking-wider transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue cursor-pointer"
              >
                Personnaliser
              </button>

              <button
                type="button"
                onClick={handleAcceptAll}
                className="flex-1 md:flex-initial px-6 py-2.5 rounded-sm bg-brand-blue text-brand-black hover:bg-brand-blue/90 font-heading font-black text-xs uppercase tracking-wider transition-all shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue cursor-pointer"
              >
                Accepter
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* 2. MODAL DE GESTION DES PRÉFÉRENCES (Accessible à tout moment) */}
      {showPreferencesModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-cookie-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
        >
          <div className="w-full max-w-xl bg-[#0a0f1d] border border-brand-white/15 rounded-md p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-brand-white/10 pb-4">
              <h2
                id="modal-cookie-title"
                className="font-heading font-bold text-xl text-brand-white uppercase tracking-wider"
              >
                Gestion des cookies & traceurs
              </h2>
              {consent !== "unknown" && (
                <button
                  type="button"
                  onClick={() => setShowPreferencesModal(false)}
                  aria-label="Fermer le panneau des cookies"
                  className="text-brand-white/60 hover:text-brand-white transition-colors p-1 rounded-sm focus-visible:ring-2 focus-visible:ring-brand-blue"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              )}
            </div>

            <p className="text-brand-white/80 text-sm leading-relaxed">
              Choisissez les catégories de cookies que vous souhaitez autoriser sur votre appareil. Vous pouvez modifier ces paramètres à tout moment depuis le bas de page.
            </p>

            <div className="space-y-4">
              {/* Catégorie 1 : Nécessaires */}
              <div className="p-4 rounded-sm bg-brand-white/5 border border-brand-white/10 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-heading font-bold text-sm text-brand-white uppercase">Cookies essentiels</span>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-brand-white/10 text-brand-white/70">
                      Toujours actif
                    </span>
                  </div>
                  <p className="text-brand-white/60 text-xs mt-1 leading-relaxed">
                    Indispensables au fonctionnement technique, à la sécurité et à la mémorisation de vos préférences de consentement.
                  </p>
                </div>
              </div>

              {/* Catégorie 2 : Mesure d'audience (Analytics) */}
              <div className="p-4 rounded-sm bg-brand-white/5 border border-brand-white/10 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-heading font-bold text-sm text-brand-white uppercase">Mesure d'audience (Google Analytics)</span>
                    <span
                      className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                        consent === "granted"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-brand-white/10 text-brand-white/60"
                      }`}
                    >
                      {consent === "granted" ? "Actif" : "Inactif"}
                    </span>
                  </div>
                  <p className="text-brand-white/60 text-xs mt-1 leading-relaxed">
                    Permet de mesurer anonymement la fréquentation des pages et d'optimiser l'expérience utilisateur sans collecter aucune information personnelle.
                  </p>
                </div>
              </div>
            </div>

            {/* Statut actuel clair */}
            <div className="text-xs text-brand-white/60 bg-brand-black/40 p-3 rounded border border-brand-white/5 flex items-center justify-between">
              <span>Votre choix actuel :</span>
              <strong className="text-brand-white uppercase font-bold">
                {consent === "granted" ? "Analytics Accepté" : consent === "denied" ? "Analytics Refusé" : "Non défini"}
              </strong>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2 border-t border-brand-white/10">
              <button
                type="button"
                onClick={handleRefuseAll}
                className="w-full sm:w-auto px-5 py-2.5 rounded-sm bg-brand-white/5 border border-brand-white/20 text-brand-white hover:bg-brand-white/10 hover:border-brand-white/35 font-heading font-bold text-xs uppercase tracking-wider transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-white cursor-pointer"
              >
                Refuser tout
              </button>

              <button
                type="button"
                onClick={handleAcceptAll}
                className="w-full sm:w-auto px-6 py-2.5 rounded-sm bg-brand-blue text-brand-black hover:bg-brand-blue/90 font-heading font-black text-xs uppercase tracking-wider transition-all shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue cursor-pointer"
              >
                Accepter tout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
