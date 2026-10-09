"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  ArrowRight,
  Loader2,
  X,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { trackPricingView, trackBookingClick } from "@/lib/analytics";
import { createClient } from "@/lib/supabase/client";
import {
  submitPackRequest,
  getMemberPacksEligibilityMap,
  type PackEligibilityResult,
} from "@/lib/supabase/membership-requests";
import { SESSION_PACKS, type SessionPackDefinition } from "@/lib/stripe";

export interface PublicPlan {
  id: string;
  name: string;
  code?: string | null;
  type: string;
  tier?: string | null;
  commitment: "monthly" | "annual" | string | null;
  price_cents: number;
  private_sessions_per_period?: number | null;
  is_active?: boolean;
  badge_text?: string | null;
  features?: string[] | null;
  is_digital_plan?: boolean;
}

interface PricingSectionProps {
  isSmallGroupActive?: boolean;
  isPrivateActive?: boolean;
  initialPlans?: PublicPlan[];
}

export default function PricingSection({
  isSmallGroupActive = true,
  isPrivateActive = true,
  initialPlans = [],
}: PricingSectionProps = {}) {
  const [selectedPackForModal, setSelectedPackForModal] = useState<SessionPackDefinition | null>(null);
  const [packNotes, setPackNotes] = useState("");
  const [isSubmittingPack, setIsSubmittingPack] = useState(false);
  const [packSuccessMessage, setPackSuccessMessage] = useState<string | null>(null);
  const [packError, setPackError] = useState<string | null>(null);
  const [showAuthRequiredModal, setShowAuthRequiredModal] = useState(false);

  const [packEligibility, setPackEligibility] = useState<Record<string, PackEligibilityResult>>({
    decouverte_1: { isEligible: true, alreadyUsed: false, hasPending: false, isDiscovery: true },
    decouverte_3: { isEligible: true, alreadyUsed: false, hasPending: false, isDiscovery: true },
    pack_10_small_group: { isEligible: true, alreadyUsed: false, hasPending: false, isDiscovery: false },
  });

  const loadEligibility = useCallback(async () => {
    try {
      const supabase = createClient();
      const map = await getMemberPacksEligibilityMap(supabase);
      setPackEligibility(map);
    } catch (err) {
      console.warn("[PricingSection] Erreur chargement éligibilité packs :", err);
    }
  }, []);

  useEffect(() => {
    loadEligibility();
  }, [loadEligibility]);

  const handleOpenPackModal = async (packId: string) => {
    setPackError(null);
    setPackSuccessMessage(null);
    trackBookingClick("membership", `pack_${packId}`);

    const packDef = SESSION_PACKS[packId];
    if (!packDef) return;

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setShowAuthRequiredModal(true);
        return;
      }

      // Re-vérifier l'éligibilité avant d'ouvrir
      const currentMap = await getMemberPacksEligibilityMap(supabase);
      setPackEligibility(currentMap);
      const el = currentMap[packId];

      if (el && !el.isEligible) {
        if (el.alreadyUsed) {
          setPackError(
            `Offre découverte déjà utilisée : vous avez déjà souscrit ou demandé le ${packDef.name}. Cette offre est strictement limitée à 1 fois par membre à vie.`
          );
          return;
        }
        if (el.hasPending) {
          setPackError(`Une demande pour le ${packDef.name} est déjà en cours de validation.`);
          return;
        }
      }

      setSelectedPackForModal(packDef);
      setPackNotes("");
    } catch (err: any) {
      console.error("[handleOpenPackModal] Erreur :", err);
      setSelectedPackForModal(packDef);
    }
  };

  // Alias pour la compatibilité avec les suites QA automatisées
  const handleBuyPack = handleOpenPackModal;

  const handleConfirmPackRequest = async () => {
    if (!selectedPackForModal) return;
    setIsSubmittingPack(true);
    setPackError(null);

    try {
      const supabase = createClient();
      const res = await submitPackRequest(supabase, {
        planCode: selectedPackForModal.planCode,
        memberNotes: packNotes.trim() || undefined,
      });

      if (res.success) {
        setPackSuccessMessage(
          res.message ||
            `Votre demande pour le ${selectedPackForModal.name} a été transmise avec succès.`
        );
        await loadEligibility();
      } else {
        setPackError(res.error || "Impossible de transmettre la demande.");
        await loadEligibility();
      }
    } catch (err: any) {
      console.error("[handleConfirmPackRequest] Erreur :", err);
      setPackError(err.message || "Une erreur est survenue lors de l'envoi de la demande.");
    } finally {
      setIsSubmittingPack(false);
    }
  };

  // Extraction dynamique des tarifs réels depuis Supabase avec fallbacks alignés sur la base
  const planPrices = useMemo(() => {
    const prices = {
      adult_essential: 399,
      adult_all_access: 899,
      adult_monthly: 89,
      lady_striking: 399,
      kid_boxing: 349,
      private_annual: 299,
      private_monthly: 399,
    };

    for (const p of initialPlans) {
      if (p.is_active === false) continue;
      const euros = Math.round(p.price_cents / 100);
      const code = (p.code || "").toLowerCase();

      if (code === "adult_essential") {
        prices.adult_essential = euros;
      } else if (code === "adult_all_access") {
        prices.adult_all_access = euros;
      } else if (code === "discovery_monthly" || code === "adult_monthly") {
        prices.adult_monthly = euros;
      } else if (code === "lady_striking_annual" || code === "lady_striking") {
        prices.lady_striking = euros;
      } else if (code === "kid_boxing_season" || code === "kid_boxing") {
        prices.kid_boxing = euros;
      } else if (code === "priv_annual_8" || (p.type === "private" && p.commitment === "annual")) {
        prices.private_annual = euros;
      } else if (code === "priv_monthly_8" || (p.type === "private" && p.commitment === "monthly")) {
        prices.private_monthly = euros;
      }
    }

    return prices;
  }, [initialPlans]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-20 sm:space-y-28 font-sans">
      
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          1. SECTION HERO
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="text-center max-w-3xl mx-auto space-y-6 pt-4">
        <div className="inline-flex items-center px-4 py-1.5 bg-brand-blue/10 border border-brand-blue/25 rounded-full text-brand-blue text-xs font-heading font-bold uppercase tracking-widest">
          <span>Formules & Abonnements • Marseille (13010)</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-heading font-black uppercase tracking-tight text-brand-white leading-tight">
          UNE FORMULE. <br className="hidden sm:inline" />
          <span className="text-brand-blue">PLUSIEURS DISCIPLINES.</span>
        </h1>

        <p className="text-brand-white/75 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
          Striking Camp propose plusieurs façons de pratiquer selon votre objectif, votre niveau et votre rythme.
          Entraînement en groupe réduit (12 personnes max) ou coaching privé sur-mesure avec le coach Mahfoud.
        </p>

        {/* Navigation rapide par ancres */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          <a
            href="#cours-adultes"
            className="px-4 py-2 rounded-full bg-brand-white/5 hover:bg-brand-white/10 text-brand-white/80 hover:text-brand-white text-xs font-heading font-bold uppercase tracking-wider border border-brand-white/10 transition-colors"
          >
            Cours Adultes
          </a>
          <a
            href="#pack-10"
            className="px-4 py-2 rounded-full bg-brand-white/5 hover:bg-brand-white/10 text-brand-white/80 hover:text-brand-white text-xs font-heading font-bold uppercase tracking-wider border border-brand-white/10 transition-colors"
          >
            Pack 10 Séances
          </a>
          <a
            href="#kid-boxing"
            className="px-4 py-2 rounded-full bg-brand-white/5 hover:bg-brand-white/10 text-brand-white/80 hover:text-brand-white text-xs font-heading font-bold uppercase tracking-wider border border-brand-white/10 transition-colors"
          >
            Kid Boxing
          </a>
          <a
            href="#cours-prives"
            className="px-4 py-2 rounded-full bg-brand-white/5 hover:bg-brand-white/10 text-brand-white/80 hover:text-brand-white text-xs font-heading font-bold uppercase tracking-wider border border-brand-white/10 transition-colors"
          >
            Coaching Privé
          </a>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          2. SECTION 1 — COURS ADULTES (FORMULES ANNUELLES & MENSUELLES)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {isSmallGroupActive && (
        <section id="cours-adultes" className="scroll-mt-28 space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center px-3 py-1 bg-brand-blue/10 border border-brand-blue/20 rounded-full text-brand-blue text-xs font-heading font-bold uppercase tracking-wider">
              <span>Small Group • 12 personnes max</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-heading font-black uppercase tracking-tight text-brand-white">
              COURS <span className="text-brand-blue">ADULTES</span>
            </h2>
            <p className="text-brand-white/70 text-xs sm:text-sm">
              Formules annuelles ou sans engagement d&apos;entraînement encadré en groupe réduit pour une progression technique rapide et sécurisée.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch max-w-6xl mx-auto">
            
            {/* CARTE 1 : SANS ENGAGEMENT (89 € / MOIS) */}
            <div className="rounded-2xl bg-[#0b1322] border border-brand-blue/30 p-6 sm:p-7 flex flex-col justify-between hover:border-brand-blue/60 transition-all duration-200">
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full bg-brand-blue/15 text-brand-blue text-xs font-heading font-bold uppercase tracking-wider border border-brand-blue/30">
                    SANS ENGAGEMENT
                  </span>
                  <span className="text-xs text-brand-blue font-semibold uppercase">
                    MENSUEL
                  </span>
                </div>

                <div>
                  <h3 className="text-2xl font-heading font-black uppercase text-brand-white">
                    SANS ENGAGEMENT
                  </h3>
                  <p className="text-xs text-brand-white/70 mt-1.5 leading-relaxed">
                    La liberté totale pour s&apos;entraîner en accès illimité, renouvelable chaque mois sans engagement de durée.
                  </p>
                </div>

                <div className="pt-2">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl font-heading font-black text-brand-white">
                      {planPrices.adult_monthly} €
                    </span>
                    <span className="text-xs text-brand-white/60 font-bold uppercase">
                      / MOIS
                    </span>
                  </div>
                  <p className="text-[11px] text-brand-white/50 mt-1">
                    Valable 30 jours • Renouvelable chaque mois
                  </p>
                </div>

                <div className="space-y-2.5 pt-4 border-t border-brand-white/10 text-xs text-brand-white/85">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={15} className="text-brand-blue shrink-0 mt-0.5" />
                    <span>Accès illimité aux cours adultes</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={15} className="text-brand-blue shrink-0 mt-0.5" />
                    <span>Toutes les disciplines adultes incluses</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={15} className="text-brand-blue shrink-0 mt-0.5" />
                    <span>Encadrement en groupe réduit (12 max)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={15} className="text-brand-blue shrink-0 mt-0.5" />
                    <span>Tous niveaux (débutant à confirmé)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={15} className="text-brand-blue shrink-0 mt-0.5" />
                    <span>Espace membre personnalisé</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={15} className="text-brand-blue shrink-0 mt-0.5" />
                    <span>Réservation libre sur le planning</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={15} className="text-brand-blue shrink-0 mt-0.5" />
                    <span>Parking privé inclus</span>
                  </div>
                </div>
              </div>

              <div className="pt-8">
                <Link
                  href="/membre/adhesion?plan=discovery_monthly"
                  onClick={() => trackBookingClick("membership", "discovery_monthly")}
                  className="w-full py-3.5 px-4 rounded-xl bg-brand-white/10 hover:bg-brand-blue hover:text-brand-black text-brand-white font-heading font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                >
                  <span>CHOISIR CETTE FORMULE</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>

            {/* CARTE 2 : ESSENTIEL */}
            <div className="rounded-2xl bg-[#0b1322] border border-brand-white/10 p-6 sm:p-7 flex flex-col justify-between hover:border-brand-blue/30 transition-all duration-200">
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full bg-brand-white/10 text-brand-white/90 text-xs font-heading font-bold uppercase tracking-wider">
                    1 DISCIPLINE AU CHOIX
                  </span>
                  <span className="text-xs text-brand-white/50 font-semibold uppercase">
                    ANNUEL
                  </span>
                </div>

                <div>
                  <h3 className="text-2xl font-heading font-black uppercase text-brand-white">
                    ESSENTIEL
                  </h3>
                  <p className="text-xs text-brand-white/70 mt-1.5 leading-relaxed">
                    La formule idéale pour s&apos;entraîner régulièrement dans sa discipline de prédilection avec un encadrement technique rigoureux.
                  </p>
                </div>

                <div className="pt-2">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl font-heading font-black text-brand-white">
                      {planPrices.adult_essential} €
                    </span>
                    <span className="text-xs text-brand-white/60 font-bold uppercase">
                      / AN
                    </span>
                  </div>
                  <p className="text-[11px] text-brand-white/50 mt-1">
                    + 90 € de frais d&apos;adhésion annuelle
                  </p>
                </div>

                <div className="space-y-2.5 pt-4 border-t border-brand-white/10 text-xs text-brand-white/85">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={15} className="text-brand-blue shrink-0 mt-0.5" />
                    <span>Une discipline au choix</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={15} className="text-brand-blue shrink-0 mt-0.5" />
                    <span>Encadrement en groupe réduit</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={15} className="text-brand-blue shrink-0 mt-0.5" />
                    <span>Tous niveaux (débutant à confirmé)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={15} className="text-brand-blue shrink-0 mt-0.5" />
                    <span>Espace membre personnalisé</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={15} className="text-brand-blue shrink-0 mt-0.5" />
                    <span>Réservation libre sur le planning</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={15} className="text-brand-blue shrink-0 mt-0.5" />
                    <span>Parking privé inclus</span>
                  </div>
                </div>
              </div>

              <div className="pt-8">
                <Link
                  href="/membre/adhesion?plan=adult_essential"
                  onClick={() => trackBookingClick("membership", "adult_essential")}
                  className="w-full py-3.5 px-4 rounded-xl bg-brand-white/10 hover:bg-brand-blue hover:text-brand-black text-brand-white font-heading font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                >
                  <span>CHOISIR CETTE FORMULE</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>

            {/* CARTE 2 : ALL ACCESS (FEATURED) */}
            <div className="relative rounded-2xl bg-gradient-to-b from-[#101d36] to-[#070d18] border-2 border-brand-blue p-6 sm:p-8 flex flex-col justify-between shadow-[0_0_40px_rgba(47,174,224,0.18)]">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-0.5 rounded-full bg-brand-blue text-brand-black text-[10px] font-heading font-black uppercase tracking-wider shadow-md">
                <span>FORMULE RECOMMANDÉE</span>
              </div>

              <div className="space-y-5 pt-1">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full bg-brand-blue/20 text-brand-blue text-xs font-heading font-black uppercase tracking-wider border border-brand-blue/30">
                    ACCÈS TOTAL ILLIMITÉ
                  </span>
                  <span className="text-xs text-brand-blue font-bold uppercase">
                    ANNUEL
                  </span>
                </div>

                <div>
                  <h3 className="text-2xl font-heading font-black uppercase text-brand-white">
                    ALL ACCESS
                  </h3>
                  <p className="text-xs text-brand-white/75 mt-1.5 leading-relaxed">
                    L&apos;accès complet et illimité à l&apos;ensemble des disciplines adultes pour progresser sur tous les aspects du combat.
                  </p>
                </div>

                <div className="pt-2">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl font-heading font-black text-brand-blue">
                      {planPrices.adult_all_access} €
                    </span>
                    <span className="text-xs text-brand-white/60 font-bold uppercase">
                      / AN
                    </span>
                  </div>
                  <p className="text-[11px] text-brand-white/50 mt-1">
                    + 90 € de frais d&apos;adhésion annuelle
                  </p>
                </div>

                <div className="space-y-2.5 pt-4 border-t border-brand-white/10 text-xs text-brand-white/90">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={15} className="text-brand-blue shrink-0 mt-0.5" />
                    <span>Accès illimité aux Cours Adulte</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={15} className="text-brand-blue shrink-0 mt-0.5" />
                    <span>Encadrement en groupe réduit</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={15} className="text-brand-blue shrink-0 mt-0.5" />
                    <span>Tous les niveaux (débutant à confirmé)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={15} className="text-brand-blue shrink-0 mt-0.5" />
                    <span>Espace membre personnalisé</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={15} className="text-brand-blue shrink-0 mt-0.5" />
                    <span>Réservation libre sur le planning</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={15} className="text-brand-blue shrink-0 mt-0.5" />
                    <span>Toutes les disciplines incluses</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={15} className="text-brand-blue shrink-0 mt-0.5" />
                    <span>Accès aux Défis Striking Camp</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={15} className="text-brand-blue shrink-0 mt-0.5" />
                    <span>Accès à l’Espace Nutrition</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={15} className="text-brand-blue shrink-0 mt-0.5" />
                    <span>Accès aux programmes physiques</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={15} className="text-brand-blue shrink-0 mt-0.5" />
                    <span>Parking privé inclus</span>
                  </div>
                </div>
              </div>

              <div className="pt-8">
                <Link
                  href="/membre/adhesion?plan=adult_all_access"
                  onClick={() => trackBookingClick("membership", "adult_all_access")}
                  className="w-full py-3.5 px-4 rounded-xl bg-brand-blue hover:bg-brand-white text-brand-black font-heading font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-brand-blue/25 flex items-center justify-center gap-2"
                >
                  <span>CHOISIR CETTE FORMULE</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>

          </div>
        </section>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          3. SECTION 2 — PACK 10 SÉANCES (SANS ENGAGEMENT & RÉPÉTABLE)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="pack-10" className="scroll-mt-28 space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center px-3.5 py-1 bg-brand-blue/10 border border-brand-blue/20 rounded-full text-brand-blue text-xs font-heading font-bold uppercase tracking-wider">
            <span>PACKS DE SÉANCES • Achat unique • Sans engagement</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-heading font-black uppercase tracking-tight text-brand-white">
            PRATIQUEZ À <span className="text-brand-blue">VOTRE RYTHME</span>
          </h2>
          <p className="text-brand-white/70 text-xs sm:text-sm">
            Entraînez-vous sans abonnement annuel. Achetez et rechargez votre carnet de séances selon votre emploi du temps.
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <div className="relative rounded-2xl bg-gradient-to-b from-[#101c34] to-[#080e1b] border border-brand-blue/40 p-7 sm:p-9 shadow-[0_0_35px_rgba(47,174,224,0.12)]">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
              
              <div className="md:col-span-2 space-y-4">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-full bg-brand-blue/20 text-brand-blue text-xs font-heading font-bold uppercase tracking-wider border border-brand-blue/30">
                    10 SÉANCES GROUPE RÉDUIT
                  </span>
                  <span className="text-xs text-brand-white/60 font-medium">
                    Valable 3 mois (90 jours)
                  </span>
                </div>

                <div>
                  <h3 className="text-2xl font-heading font-black uppercase text-brand-white">
                    PACK 10 SÉANCES — GROUPE RÉDUIT
                  </h3>
                  <p className="text-xs text-brand-white/75 mt-1.5 leading-relaxed">
                    La liberté totale de pratiquer toutes les disciplines Small Group. Achetable et renouvelable plusieurs fois par an.
                  </p>
                </div>

                <div className="space-y-2 pt-2 text-xs text-brand-white/85">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={15} className="text-brand-blue shrink-0 mt-0.5" />
                    <span>10 crédits en groupe réduit</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={15} className="text-brand-blue shrink-0 mt-0.5" />
                    <span>Accès à toutes les disciplines adultes</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={15} className="text-brand-blue shrink-0 mt-0.5" />
                    <span>Espace membre personnalisé</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={15} className="text-brand-blue shrink-0 mt-0.5" />
                    <span>Réservation libre sur le planning</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={15} className="text-brand-blue shrink-0 mt-0.5" />
                    <span>Parking privé inclus</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#050912]/80 border border-brand-white/10 rounded-xl p-6 text-center space-y-4">
                <div>
                  <span className="text-3xl sm:text-4xl font-heading font-black text-brand-white">
                    180 €
                  </span>
                  <p className="text-[11px] text-brand-white/60 font-bold uppercase mt-1">
                    soit 18 € / séance
                  </p>
                </div>

                {packEligibility.pack_10_small_group?.hasPending ? (
                  <button
                    type="button"
                    disabled
                    className="w-full py-3.5 px-4 rounded-xl bg-brand-blue/10 border border-brand-blue/20 text-brand-blue/80 font-heading font-bold text-xs uppercase tracking-wider cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <span>Demande en attente</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleBuyPack("pack_10_small_group")}
                    className="w-full py-3.5 px-4 rounded-xl bg-brand-blue hover:bg-brand-white text-brand-black font-heading font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-brand-blue/20"
                  >
                    <span>Choisir le Pack 10</span>
                    <ArrowRight size={14} />
                  </button>
                )}

                <p className="text-[10px] text-brand-white/50 leading-tight">
                  Paiement unique • Répétable à l&apos;épuisement
                </p>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          5. SECTION 4 — KID BOXING (5 À 13 ANS)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="kid-boxing" className="scroll-mt-28 space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center px-3 py-1 bg-brand-blue/10 border border-brand-blue/20 rounded-full text-brand-blue text-xs font-heading font-bold uppercase tracking-wider">
            <span>Enfants & Adolescents • 5 à 13 ans</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-heading font-black uppercase tracking-tight text-brand-white">
            KID <span className="text-brand-blue">BOXING</span>
          </h2>
          <p className="text-brand-white/70 text-xs sm:text-sm">
            Une approche pédagogique et bienveillante du Kick Boxing adaptée au rythme et à la maturité des enfants.
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl bg-[#0b1322] border border-brand-white/10 p-7 sm:p-9 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-brand-white/10">
              <div>
                <span className="px-3 py-1 rounded-full bg-brand-blue/15 text-brand-blue text-xs font-heading font-bold uppercase tracking-wider border border-brand-blue/25">
                  Formule Saison (Septembre à Juin)
                </span>
                <h3 className="text-2xl font-heading font-black uppercase text-brand-white mt-2">
                  Kid Boxing (5–13 ans)
                </h3>
              </div>
              <div className="sm:text-right">
                <span className="text-3xl sm:text-4xl font-heading font-black text-brand-white">
                  {planPrices.kid_boxing} €
                </span>
                <span className="text-xs text-brand-white/60 font-bold uppercase ml-1.5">
                  / saison
                </span>
                <p className="text-[11px] text-brand-white/50 mt-0.5">
                  + 90 € d&apos;adhésion annuelle
                </p>
              </div>
            </div>

            {/* Détail des 2 tranches d'âge */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-brand-white/5 border border-brand-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-heading font-bold text-sm uppercase text-brand-blue">
                    Groupe 5–8 ans
                  </h4>
                  <span className="text-[11px] text-brand-white/60">Mercredi 11h & Vendredi 17h</span>
                </div>
                <p className="text-xs text-brand-white/70 leading-relaxed">
                  Éveil corporel, motricité globale, équilibre, jeux éducatifs et découverte ludique de la boxe.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-brand-white/5 border border-brand-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-heading font-bold text-sm uppercase text-brand-blue">
                    Groupe 9–13 ans
                  </h4>
                  <span className="text-[11px] text-brand-white/60">Mercredi 10h & Samedi 10h</span>
                </div>
                <p className="text-xs text-brand-white/70 leading-relaxed">
                  Techniques pieds-poings, coordination motrice, frappe aux paos, discipline et confiance en soi.
                </p>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs text-brand-white/70">
                Accès aux événements & stages scolaires inclus • Parking privé
              </p>
              <Link
                href="/contact"
                onClick={() => trackBookingClick("membership", "kid_boxing_season")}
                className="w-full sm:w-auto px-6 py-3 bg-brand-blue hover:bg-brand-white text-brand-black font-heading font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 shrink-0"
              >
                <span>Inscrire mon enfant</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          6. SECTION 5 — COURS PRIVÉS (COACHING SUR-MESURE)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {isPrivateActive && (
        <section id="cours-prives" className="scroll-mt-28 space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center px-3 py-1 bg-brand-blue/10 border border-brand-blue/20 rounded-full text-brand-blue text-xs font-heading font-bold uppercase tracking-wider">
              <span>Coaching 1-on-1 exclusif</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-heading font-black uppercase tracking-tight text-brand-white">
              COURS <span className="text-brand-blue">PRIVÉS</span>
            </h2>
            <p className="text-brand-white/70 text-xs sm:text-sm">
              L&apos;accompagnement le plus individualisé avec le coach Mahfoud Mohamed (8 séances privées par mois sur rendez-vous).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto items-stretch">
            
            {/* PRIVÉ ANNUEL */}
            <div className="rounded-2xl bg-[#0b1322] border border-brand-blue/30 p-6 sm:p-8 flex flex-col justify-between hover:border-brand-blue/50 transition-all duration-200">
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full bg-brand-blue/20 text-brand-blue text-xs font-heading font-bold uppercase tracking-wider border border-brand-blue/30">
                    Engagement Annuel
                  </span>
                  <span className="text-xs text-brand-white/50 font-medium">
                    8 séances privées / mois
                  </span>
                </div>

                <div>
                  <h3 className="text-2xl font-heading font-black uppercase text-brand-white">
                    Coaching Privé — Annuel
                  </h3>
                  <p className="text-xs text-brand-white/70 mt-1.5 leading-relaxed">
                    Le programme le plus complet pour transformer sa condition physique et sa technique avec un suivi sur-mesure toute l&apos;année.
                  </p>
                </div>

                <div className="pt-2">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl font-heading font-black text-brand-blue">
                      {planPrices.private_annual} €
                    </span>
                    <span className="text-xs text-brand-white/60 font-bold uppercase">
                      / mois
                    </span>
                  </div>
                  <p className="text-[11px] text-brand-white/50 mt-1">
                    Engagement 12 mois • + 90 € d&apos;adhésion annuelle
                  </p>
                </div>

                <div className="space-y-2.5 pt-4 border-t border-brand-white/10 text-xs text-brand-white/85">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={15} className="text-brand-blue shrink-0 mt-0.5" />
                    <span><strong>8 séances privées 1-on-1 par mois</strong> sur rendez-vous</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={15} className="text-brand-blue shrink-0 mt-0.5" />
                    <span><strong>Accès illimité All Access</strong> à tous les cours adultes</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={15} className="text-brand-blue shrink-0 mt-0.5" />
                    <span>Accès complet à l&apos;Espace Défis & Nutrition</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={15} className="text-brand-blue shrink-0 mt-0.5" />
                    <span>Programmation personnalisée & parking privé</span>
                  </div>
                </div>
              </div>

              <div className="pt-8">
                <Link
                  href="/membre/adhesion?plan=priv_annual_8"
                  onClick={() => trackBookingClick("membership", "priv_annual_8")}
                  className="w-full py-3.5 px-4 rounded-xl bg-brand-blue hover:bg-brand-white text-brand-black font-heading font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-brand-blue/20 flex items-center justify-center gap-2"
                >
                  <span>CHOISIR CETTE FORMULE</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>

            {/* PRIVÉ MENSUEL */}
            <div className="rounded-2xl bg-[#0b1322] border border-brand-white/10 p-6 sm:p-8 flex flex-col justify-between hover:border-brand-blue/30 transition-all duration-200">
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full bg-brand-white/10 text-brand-white/90 text-xs font-heading font-bold uppercase tracking-wider">
                    Sans Engagement
                  </span>
                  <span className="text-xs text-brand-white/50 font-medium">
                    8 séances privées / mois
                  </span>
                </div>

                <div>
                  <h3 className="text-2xl font-heading font-black uppercase text-brand-white">
                    Coaching Privé — Mensuel
                  </h3>
                  <p className="text-xs text-brand-white/70 mt-1.5 leading-relaxed">
                    La flexibilité du coaching sur-mesure au mois le mois, renouvelable librement selon vos échéances.
                  </p>
                </div>

                <div className="pt-2">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl font-heading font-black text-brand-white">
                      {planPrices.private_monthly} €
                    </span>
                    <span className="text-xs text-brand-white/60 font-bold uppercase">
                      / mois
                    </span>
                  </div>
                  <p className="text-[11px] text-brand-white/50 mt-1">
                    Sans engagement • + 90 € d&apos;adhésion annuelle
                  </p>
                </div>

                <div className="space-y-2.5 pt-4 border-t border-brand-white/10 text-xs text-brand-white/85">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={15} className="text-brand-blue shrink-0 mt-0.5" />
                    <span><strong>8 séances privées 1-on-1 par mois</strong> sur rendez-vous</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={15} className="text-brand-blue shrink-0 mt-0.5" />
                    <span>Accès illimité aux cours adultes Small Group</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={15} className="text-brand-blue shrink-0 mt-0.5" />
                    <span>Suivi direct et individualisé avec le coach</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={15} className="text-brand-blue shrink-0 mt-0.5" />
                    <span>Parking privé sécurisé inclus</span>
                  </div>
                </div>
              </div>

              <div className="pt-8">
                <Link
                  href="/membre/adhesion?plan=priv_monthly_8"
                  onClick={() => trackBookingClick("membership", "priv_monthly_8")}
                  className="w-full py-3.5 px-4 rounded-xl bg-brand-white/10 hover:bg-brand-blue hover:text-brand-black text-brand-white font-heading font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                >
                  <span>CHOISIR CETTE FORMULE</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>

          </div>
        </section>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          7. SECTION INFORMATIONS & CONTACT
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="text-center p-8 bg-[#0b1322] border border-brand-white/10 rounded-2xl max-w-3xl mx-auto space-y-4">
        <h3 className="text-lg font-heading font-bold uppercase tracking-wider text-brand-white">
          Besoin d&apos;un conseil sur la formule la plus adaptée ?
        </h3>
        <p className="text-xs sm:text-sm text-brand-white/75 leading-relaxed max-w-xl mx-auto">
          Contactez directement le coach Mahfoud pour échanger sur vos objectifs ou ceux de vos enfants et trouver le programme optimal.
        </p>
        <div className="pt-2">
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-white/10 hover:bg-brand-white/20 text-brand-white font-heading font-bold text-xs uppercase tracking-wider rounded-xl transition-colors"
          >
            <span>Contacter le Club</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MODAL DE CONFIRMATION DE DEMANDE DE PACK
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatePresence>
        {selectedPackForModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isSubmittingPack) {
                  setSelectedPackForModal(null);
                  setPackSuccessMessage(null);
                }
              }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-[#0f172a] border border-brand-blue/40 rounded-3xl p-6 sm:p-8 shadow-2xl z-10 space-y-6"
            >
              {/* Header Modal */}
              <div className="flex items-center justify-between pb-3 border-b border-brand-white/10">
                <div>
                  <h3 className="text-xl font-heading font-black uppercase tracking-wider text-brand-white">
                    Demande de Pack de Séances
                  </h3>
                  <p className="text-[11px] text-brand-white/60">
                    Validation et activation de vos crédits
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedPackForModal(null);
                    setPackSuccessMessage(null);
                  }}
                  disabled={isSubmittingPack}
                  className="p-1.5 rounded-lg text-brand-white/50 hover:text-brand-white hover:bg-brand-white/10 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Message de succès */}
              {packSuccessMessage ? (
                <div className="space-y-5 text-center py-4">
                  <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 size={32} />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-lg font-heading font-black uppercase tracking-wider text-brand-white">
                      Demande enregistrée !
                    </h4>
                    <p className="text-xs text-brand-white/70 max-w-sm mx-auto leading-relaxed">
                      {packSuccessMessage}
                    </p>
                  </div>
                  <div className="p-4 bg-brand-white/5 border border-brand-white/10 rounded-2xl text-[11px] text-brand-white/80 space-y-1 text-left">
                    <p>• Votre demande est actuellement <strong>en attente de validation</strong> par l&apos;équipe.</p>
                    <p>• Vos {selectedPackForModal.totalCredits} séance(s) apparaîtront sur votre compte dès confirmation.</p>
                  </div>
                  <div className="pt-2 flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPackForModal(null);
                        setPackSuccessMessage(null);
                      }}
                      className="flex-1 py-3 bg-brand-white/10 hover:bg-brand-white/20 text-brand-white font-heading font-bold text-xs uppercase rounded-xl transition-all"
                    >
                      Fermer
                    </button>
                    <Link
                      href="/membre/planning"
                      className="flex-1 py-3 bg-brand-blue hover:bg-brand-white text-brand-black font-heading font-black text-xs uppercase tracking-wider rounded-xl transition-all text-center flex items-center justify-center gap-2"
                    >
                      <span>Voir le Planning</span>
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              ) : (
                /* Formulaire de confirmation */
                <div className="space-y-4 text-xs text-brand-white/80">
                  {packError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs">
                      {packError}
                    </div>
                  )}

                  <div className="bg-[#0a1120] border border-brand-white/10 rounded-2xl p-4 space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-brand-white/50">Offre sélectionnée :</span>
                      <strong className="text-brand-blue font-heading text-sm">
                        {selectedPackForModal.name}
                      </strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-brand-white/50">Nombre de séances :</span>
                      <strong className="text-brand-white font-bold">
                        {selectedPackForModal.totalCredits} crédit(s) Small Group
                      </strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-brand-white/50">Validité :</span>
                      <span className="text-brand-white font-medium flex items-center gap-1">
                        <Clock size={12} className="text-brand-blue" />
                        {selectedPackForModal.validityMonths
                          ? `${selectedPackForModal.validityMonths} mois`
                          : `${selectedPackForModal.validityDays} jours`}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-brand-white/5">
                      <span className="text-brand-white/50">Montant total :</span>
                      <strong className="text-lg font-heading font-black text-brand-white">
                        {selectedPackForModal.priceEuros} €
                      </strong>
                    </div>
                  </div>

                  <div className="p-3.5 bg-brand-blue/10 border border-brand-blue/20 rounded-xl text-brand-blue/90 text-[11px] leading-relaxed">
                    Votre demande de pack sera transmise à l&apos;équipe Striking Camp. Vos crédits seront activés sur votre compte dès validation de votre règlement.
                  </div>

                  <div>
                    <label className="text-[11px] font-heading font-bold uppercase tracking-wider text-brand-white/60 block mb-1.5">
                      Message / Note pour le coach (optionnel)
                    </label>
                    <textarea
                      rows={2}
                      value={packNotes}
                      onChange={(e) => setPackNotes(e.target.value)}
                      placeholder="Ex: Je souhaite démarrer la semaine prochaine..."
                      className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-xs text-brand-white placeholder:text-brand-white/30 focus:border-brand-blue outline-none"
                    />
                  </div>

                  <div className="flex gap-3 pt-3">
                    <button
                      type="button"
                      onClick={() => setSelectedPackForModal(null)}
                      disabled={isSubmittingPack}
                      className="flex-1 py-3 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white/70 font-heading font-bold text-xs uppercase rounded-xl transition-all cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmPackRequest}
                      disabled={isSubmittingPack}
                      className="flex-1 py-3 bg-brand-blue hover:bg-brand-white text-brand-black font-heading font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-brand-blue/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isSubmittingPack ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Envoi en cours...</span>
                        </>
                      ) : (
                        <>
                          <span>Confirmer la demande</span>
                          <ArrowRight size={14} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MODAL D'AUTHENTIFICATION REQUISE
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatePresence>
        {showAuthRequiredModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAuthRequiredModal(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-[#0f172a] border border-brand-blue/30 rounded-3xl p-6 sm:p-8 shadow-2xl z-10 space-y-6 text-center"
            >
              <div className="space-y-2">
                <h3 className="text-xl font-heading font-black uppercase tracking-wider text-brand-white">
                  Connexion Requise
                </h3>
                <p className="text-xs text-brand-white/70 leading-relaxed">
                  Pour commander un pack de séances et créditer votre compte, veuillez vous connecter ou créer un compte membre.
                </p>
              </div>

              <div className="flex flex-col gap-2.5 pt-2">
                <Link
                  href="/connexion?redirect=/tarifs"
                  className="w-full py-3.5 bg-brand-blue hover:bg-brand-white text-brand-black font-heading font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-brand-blue/20 flex items-center justify-center gap-2"
                >
                  <span>Se Connecter</span>
                  <ArrowRight size={14} />
                </Link>
                <Link
                  href="/inscription?redirect=/tarifs"
                  className="w-full py-3 bg-brand-white/10 hover:bg-brand-white/20 text-brand-white font-heading font-bold text-xs uppercase rounded-xl transition-all"
                >
                  Créer un compte
                </Link>
                <button
                  type="button"
                  onClick={() => setShowAuthRequiredModal(false)}
                  className="text-xs text-brand-white/50 hover:text-brand-white py-1"
                >
                  Continuer la visite
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
