"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  ArrowRight,
  Info,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { trackPricingView, trackBookingClick } from "@/lib/analytics";

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

type MainCategory = "adult" | "lady" | "kid" | "private" | "digital";
type AdultFormula = "essential" | "all_access";
type KidAgeGroup = "5-8" | "9-13";
type PrivateCommitment = "annual" | "monthly";
type DigitalCommitment = "monthly" | "annual";

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
  const [activeCategory, setActiveCategory] = useState<MainCategory>("adult");
  const [adultFormula, setAdultFormula] = useState<AdultFormula>("all_access");
  const [kidAgeGroup, setKidAgeGroup] = useState<KidAgeGroup>("5-8");
  const [privateCommitment, setPrivateCommitment] = useState<PrivateCommitment>("annual");
  const [digitalCommitment, setDigitalCommitment] = useState<DigitalCommitment>("monthly");

  // Extraction dynamique des tarifs depuis Supabase avec fallbacks propres
  const planPrices = useMemo(() => {
    const prices = {
      adult_essential: 499,
      adult_all_access: 890,
      lady_striking: 499,
      kid_boxing: 349,
      private_annual: 299,
      private_monthly: 399,
      digital_monthly: 19.9,
      digital_annual: 179,
    };

    for (const p of initialPlans) {
      if (p.is_active === false) continue;
      const euros = p.price_cents / 100;
      const code = (p.code || "").toLowerCase();

      if (code === "adult_essential") {
        prices.adult_essential = Math.round(euros);
      } else if (code === "adult_all_access") {
        prices.adult_all_access = Math.round(euros);
      } else if (code === "lady_striking_annual" || code === "lady_striking") {
        prices.lady_striking = Math.round(euros);
      } else if (code === "kid_boxing_season" || code === "kid_boxing") {
        prices.kid_boxing = Math.round(euros);
      } else if (code === "priv_annual_8" || (p.type === "private" && p.commitment === "annual")) {
        prices.private_annual = Math.round(euros);
      } else if (code === "priv_monthly_8" || (p.type === "private" && p.commitment === "monthly")) {
        prices.private_monthly = Math.round(euros);
      } else if (code === "digital_premium_monthly" || (p.is_digital_plan && p.commitment === "monthly")) {
        prices.digital_monthly = euros > 0 ? euros : 19.9;
      } else if (code === "digital_premium_annual" || (p.is_digital_plan && p.commitment === "annual")) {
        prices.digital_annual = euros > 0 ? euros : 179;
      }
    }

    return prices;
  }, [initialPlans]);

  const categories = [
    { id: "adult" as MainCategory, label: "Cours Adulte", available: isSmallGroupActive },
    { id: "lady" as MainCategory, label: "Lady Striking", available: isSmallGroupActive },
    { id: "kid" as MainCategory, label: "Kid Boxing", available: true },
    { id: "private" as MainCategory, label: "Cours Privés", available: isPrivateActive },
    { id: "digital" as MainCategory, label: "Digital Premium", available: true },
  ].filter((c) => c.available);


  return (
    <section className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto font-sans">
      
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
        <div className="inline-flex items-center px-3.5 py-1.5 bg-brand-blue/10 border border-brand-blue/20 rounded-full text-brand-blue text-xs font-semibold uppercase tracking-widest mb-4">
          Formules & Abonnements
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-heading font-black uppercase tracking-tight text-brand-white">
          NOS <span className="text-brand-blue">TARIFS</span>
        </h1>
        <p className="mt-4 text-brand-white/70 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
          Choisissez l’offre et la formule adaptées à vos objectifs ou à ceux de vos enfants.
        </p>
      </div>

      {/* Category Tabs (Pills) */}
      <div className="flex justify-center mb-8">
        <div role="tablist" aria-label="Catégories d'abonnements" className="flex flex-wrap items-center justify-center gap-2 max-w-3xl w-full">
          {categories.map((cat) => {
            const isActive = activeCategory === cat.id;

            return (
              <button
                key={cat.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => {
                  setActiveCategory(cat.id);
                  trackPricingView(cat.label);
                }}
                className={cn(
                  "py-3 px-5 sm:px-6 rounded-full text-xs sm:text-sm font-heading font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue",
                  isActive
                    ? cat.id === "lady"
                      ? "bg-pink-500 text-white shadow-lg shadow-pink-500/20 font-black"
                      : "bg-brand-blue text-brand-black shadow-lg shadow-brand-blue/20 font-black"
                    : "bg-brand-white/5 text-brand-white/80 hover:bg-brand-white/10 hover:text-brand-white border border-brand-white/10"
                )}
              >
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-selectors depending on active category */}
      <div className="flex justify-center mb-10 sm:mb-12">
        {/* COURS ADULTE : Switcher Essentiel vs All Access */}
        {activeCategory === "adult" && (
          <div role="tablist" aria-label="Formule Cours Adulte" className="inline-flex p-1.5 rounded-full bg-[#0c1322] border border-brand-white/10 shadow-lg gap-1">
            <button
              role="tab"
              aria-selected={adultFormula === "essential"}
              onClick={() => setAdultFormula("essential")}
              className={cn(
                "py-2.5 px-6 sm:px-8 rounded-full text-xs font-heading font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue",
                adultFormula === "essential"
                  ? "bg-brand-blue text-brand-black font-black shadow-md shadow-brand-blue/30"
                  : "text-brand-white/70 hover:text-brand-white"
              )}
            >
              ESSENTIEL
            </button>
            <button
              role="tab"
              aria-selected={adultFormula === "all_access"}
              onClick={() => setAdultFormula("all_access")}
              className={cn(
                "py-2.5 px-6 sm:px-8 rounded-full text-xs font-heading font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue",
                adultFormula === "all_access"
                  ? "bg-brand-blue text-brand-black font-black shadow-md shadow-brand-blue/30"
                  : "text-brand-white/70 hover:text-brand-white"
              )}
            >
              ALL ACCESS
            </button>
          </div>
        )}

        {/* KID BOXING : Switcher 5-8 vs 9-13 ans */}
        {activeCategory === "kid" && (
          <div role="tablist" aria-label="Tranche d'âge Kid Boxing" className="inline-flex p-1.5 rounded-full bg-[#0c1322] border border-brand-white/10 shadow-lg gap-1">
            {(["5-8", "9-13"] as KidAgeGroup[]).map((age) => {
              const isActive = kidAgeGroup === age;
              return (
                <button
                  key={age}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setKidAgeGroup(age)}
                  className={cn(
                    "py-2.5 px-6 rounded-full text-xs font-heading font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue",
                    isActive
                      ? "bg-brand-blue text-brand-black font-black shadow-md shadow-brand-blue/30"
                      : "text-brand-white/70 hover:text-brand-white"
                  )}
                >
                  {age === "5-8" ? "5–8 ANS" : "9–13 ANS"}
                </button>
              );
            })}
          </div>
        )}

        {/* COURS PRIVÉS : Switcher Annuel vs Mensuel */}
        {activeCategory === "private" && (
          <div role="tablist" aria-label="Engagement Cours Privés" className="inline-flex p-1.5 rounded-full bg-[#0c1322] border border-brand-white/10 shadow-lg gap-1">
            <button
              role="tab"
              aria-selected={privateCommitment === "annual"}
              onClick={() => setPrivateCommitment("annual")}
              className={cn(
                "py-2.5 px-6 rounded-full text-xs font-heading font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue",
                privateCommitment === "annual"
                  ? "bg-brand-blue text-brand-black font-black shadow-md shadow-brand-blue/30"
                  : "text-brand-white/70 hover:text-brand-white"
              )}
            >
              ENGAGEMENT ANNUEL
            </button>
            <button
              role="tab"
              aria-selected={privateCommitment === "monthly"}
              onClick={() => setPrivateCommitment("monthly")}
              className={cn(
                "py-2.5 px-6 rounded-full text-xs font-heading font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue",
                privateCommitment === "monthly"
                  ? "bg-brand-blue text-brand-black font-black shadow-md shadow-brand-blue/30"
                  : "text-brand-white/70 hover:text-brand-white"
              )}
            >
              ENGAGEMENT MENSUEL
            </button>
          </div>
        )}

        {/* DIGITAL PREMIUM : Switcher Mensuel vs Annuel */}
        {activeCategory === "digital" && (
          <div role="tablist" aria-label="Engagement Digital Premium" className="inline-flex p-1.5 rounded-full bg-[#0c1322] border border-brand-white/10 shadow-lg gap-1">
            <button
              role="tab"
              aria-selected={digitalCommitment === "monthly"}
              onClick={() => setDigitalCommitment("monthly")}
              className={cn(
                "py-2.5 px-6 rounded-full text-xs font-heading font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue",
                digitalCommitment === "monthly"
                  ? "bg-brand-blue text-brand-black font-black shadow-md shadow-brand-blue/30"
                  : "text-brand-white/70 hover:text-brand-white"
              )}
            >
              SANS ENGAGEMENT (MENSUEL)
            </button>
            <button
              role="tab"
              aria-selected={digitalCommitment === "annual"}
              onClick={() => setDigitalCommitment("annual")}
              className={cn(
                "py-2.5 px-6 rounded-full text-xs font-heading font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue flex items-center gap-1.5",
                digitalCommitment === "annual"
                  ? "bg-brand-blue text-brand-black font-black shadow-md shadow-brand-blue/30"
                  : "text-brand-white/70 hover:text-brand-white"
              )}
            >
              <span>ANNUEL</span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                -25%
              </span>
            </button>
          </div>
        )}
      </div>


      {/* Pricing Featured Card */}
      <div className="max-w-3xl mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${activeCategory}-${adultFormula}-${kidAgeGroup}-${privateCommitment}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className={cn(
              "relative rounded-2xl bg-gradient-to-br from-[#0c1626] via-[#101e35] to-[#070c16] border p-6 sm:p-10 shadow-[0_0_50px_rgba(47,174,224,0.15)] overflow-hidden",
              activeCategory === "lady"
                ? "border-pink-500/40 shadow-[0_0_50px_rgba(236,72,153,0.15)]"
                : "border-brand-blue/40"
            )}
          >
            {/* Ambient Radial Glow */}
            <div
              className={cn(
                "absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none",
                activeCategory === "lady" ? "bg-pink-500/10" : "bg-brand-blue/10"
              )}
            />

            <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
              
              {/* Left & Center: Details & Features */}
              <div className="md:col-span-2 space-y-5">
                {/* 1. BADGE / ENGAGEMENT */}
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span
                    className={cn(
                      "px-3 py-1 rounded-full font-heading font-bold text-xs uppercase tracking-wider",
                      activeCategory === "lady"
                        ? "bg-pink-500 text-white"
                        : "bg-brand-blue text-brand-black font-black"
                    )}
                  >
                    {activeCategory === "adult"
                      ? adultFormula === "all_access"
                        ? "FORMULE ALL ACCESS"
                        : "FORMULE ESSENTIEL"
                      : activeCategory === "lady"
                      ? "FORMULE LADY STRIKING"
                      : activeCategory === "kid"
                      ? "FORMULE KID BOXING"
                      : activeCategory === "private"
                      ? "FORMULE COURS PRIVÉS"
                      : "PROGRAMME DIGITAL PREMIUM"}
                  </span>

                  <span
                    className={cn(
                      "px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase border",
                      activeCategory === "lady"
                        ? "bg-pink-500/20 text-pink-300 border-pink-500/30"
                        : "bg-brand-blue/20 text-brand-blue border-brand-blue/30"
                    )}
                  >
                    {activeCategory === "kid"
                      ? "SAISON"
                      : activeCategory === "private"
                      ? privateCommitment === "annual"
                        ? "ENGAGEMENT ANNUEL"
                        : "ENGAGEMENT MENSUEL"
                      : activeCategory === "digital"
                      ? digitalCommitment === "annual"
                        ? "ENGAGEMENT ANNUEL"
                        : "SANS ENGAGEMENT"
                      : "ENGAGEMENT ANNUEL"}
                  </span>
                </div>

                {/* 2. NOM DE LA FORMULE */}
                <div>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold uppercase tracking-wider text-brand-white">
                    {activeCategory === "adult"
                      ? adultFormula === "all_access"
                        ? "Cours Adulte — All Access"
                        : "Cours Adulte — Essentiel"
                      : activeCategory === "lady"
                      ? "Lady Striking"
                      : activeCategory === "kid"
                      ? `Kid Boxing (${kidAgeGroup === "5-8" ? "5–8 ans" : "9–13 ans"})`
                      : activeCategory === "private"
                      ? privateCommitment === "annual"
                        ? "Cours Privés — Engagement Annuel"
                        : "Cours Privés — Engagement Mensuel"
                      : digitalCommitment === "annual"
                      ? "Striking Digital Premium — Annuel"
                      : "Striking Digital Premium — Mensuel"}
                  </h2>

                  {/* 3. DESCRIPTION */}
                  <p className="text-xs sm:text-sm text-brand-white/75 mt-1.5 leading-relaxed">
                    {activeCategory === "adult" && adultFormula === "all_access" && "Accès illimité à l'ensemble des cours adultes pour une progression complète et intensive."}
                    {activeCategory === "adult" && adultFormula === "essential" && "La formule idéale pour s'entraîner régulièrement avec un encadrement technique de haut niveau."}
                    {activeCategory === "lady" && "Programme 100 % féminin alliant apprentissage technique, frappe aux sacs, renforcement et cardio combat."}
                    {activeCategory === "kid" && (kidAgeGroup === "5-8"
                      ? "Apprentissage ludique des bases de la boxe, motricité globale et discipline dans un cadre bienveillant."
                      : "Perfectionnement technique pieds-poings, coordination motrice, respect des valeurs et confiance en soi.")}
                    {activeCategory === "private" && "Coaching individuel personnalisé 1-on-1 avec le coach Mahfoud Mohamed (8 séances par mois)."}
                    {activeCategory === "digital" && "L'accompagnement digital complet Striking Camp : moteur nutritionnel Mifflin-St Jeor, journal alimentaire, bibliothèque de recettes et programmes d'entraînement Maison & Salle."}
                  </p>
                </div>


                {/* 4. INCLUS DANS VOTRE FORMULE */}
                <div className="space-y-2.5 pt-1">
                  <p className="text-xs font-heading font-bold uppercase tracking-wider text-brand-blue">
                    INCLUS DANS VOTRE FORMULE :
                  </p>

                  {/* Liste des inclusions strictement conforme */}
                  <div className="space-y-2 text-xs sm:text-sm text-brand-white/85">
                    {/* A. Cours Adulte — Essentiel */}
                    {activeCategory === "adult" && adultFormula === "essential" && (
                      <>
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 size={16} className="text-brand-blue shrink-0 mt-0.5" />
                          <span>Une discipline au choix</span>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 size={16} className="text-brand-blue shrink-0 mt-0.5" />
                          <span>Suivi technique personnalisé en groupe réduit</span>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 size={16} className="text-brand-blue shrink-0 mt-0.5" />
                          <span>Parking privé inclus</span>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 size={16} className="text-brand-blue shrink-0 mt-0.5" />
                          <span>Accès aux événements (stages)</span>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 size={16} className="text-brand-blue shrink-0 mt-0.5" />
                          <span>Frais d&apos;adhésion : 90 €</span>
                        </div>
                      </>
                    )}

                    {/* B. Cours Adulte — All Access */}
                    {activeCategory === "adult" && adultFormula === "all_access" && (
                      <>
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 size={16} className="text-brand-blue shrink-0 mt-0.5" />
                          <span>Accès illimité aux séances Cours Adulte</span>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 size={16} className="text-brand-blue shrink-0 mt-0.5" />
                          <span>Suivi technique personnalisé en groupe réduit</span>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 size={16} className="text-brand-blue shrink-0 mt-0.5" />
                          <span>Toutes disciplines incluses</span>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 size={16} className="text-brand-blue shrink-0 mt-0.5" />
                          <span>Parking privé inclus</span>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 size={16} className="text-brand-blue shrink-0 mt-0.5" />
                          <span>Accès aux événements (stages)</span>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 size={16} className="text-brand-blue shrink-0 mt-0.5" />
                          <span>Frais d&apos;adhésion : 90 €</span>
                        </div>
                      </>
                    )}

                    {/* C. Lady Striking */}
                    {activeCategory === "lady" && (
                      <>
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 size={16} className="text-pink-400 shrink-0 mt-0.5" />
                          <span>Accès aux créneaux Lady Striking</span>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 size={16} className="text-pink-400 shrink-0 mt-0.5" />
                          <span>Coaching et suivi personnalisé</span>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 size={16} className="text-pink-400 shrink-0 mt-0.5" />
                          <span>Boxe, kick boxing, boxe thaï — tous niveaux (débutantes à confirmées)</span>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 size={16} className="text-pink-400 shrink-0 mt-0.5" />
                          <span>Parking privé inclus</span>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 size={16} className="text-pink-400 shrink-0 mt-0.5" />
                          <span>Accès aux événements (stages)</span>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 size={16} className="text-pink-400 shrink-0 mt-0.5" />
                          <span>Frais d&apos;adhésion : 90 €</span>
                        </div>
                      </>
                    )}

                    {/* D. Kid Boxing (5-8 ans) */}
                    {activeCategory === "kid" && kidAgeGroup === "5-8" && (
                      <>
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 size={16} className="text-brand-blue shrink-0 mt-0.5" />
                          <span>Accès aux créneaux dédiés 5–8 ans</span>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 size={16} className="text-brand-blue shrink-0 mt-0.5" />
                          <span>Éveil corporel, motricité globale et équilibre</span>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 size={16} className="text-brand-blue shrink-0 mt-0.5" />
                          <span>Découverte ludique de la boxe et jeux éducatifs</span>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 size={16} className="text-brand-blue shrink-0 mt-0.5" />
                          <span>Encadrement pédagogique adapté</span>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 size={16} className="text-brand-blue shrink-0 mt-0.5" />
                          <span>Parking privé inclus</span>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 size={16} className="text-brand-blue shrink-0 mt-0.5" />
                          <span>Accès aux événements (stages)</span>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 size={16} className="text-brand-blue shrink-0 mt-0.5" />
                          <span>Frais d&apos;adhésion : 90 €</span>
                        </div>
                      </>
                    )}

                    {/* E. Kid Boxing (9-13 ans) */}
                    {activeCategory === "kid" && kidAgeGroup === "9-13" && (
                      <>
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 size={16} className="text-brand-blue shrink-0 mt-0.5" />
                          <span>Accès aux créneaux dédiés 9–13 ans</span>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 size={16} className="text-brand-blue shrink-0 mt-0.5" />
                          <span>Techniques pieds-poings et frappe aux paos</span>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 size={16} className="text-brand-blue shrink-0 mt-0.5" />
                          <span>Développement de la coordination, des réflexes et du cardio</span>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 size={16} className="text-brand-blue shrink-0 mt-0.5" />
                          <span>Discipline, respect et confiance en soi</span>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 size={16} className="text-brand-blue shrink-0 mt-0.5" />
                          <span>Parking privé inclus</span>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 size={16} className="text-brand-blue shrink-0 mt-0.5" />
                          <span>Accès aux événements (stages)</span>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 size={16} className="text-brand-blue shrink-0 mt-0.5" />
                          <span>Frais d&apos;adhésion : 90 €</span>
                        </div>
                      </>
                    )}

                    {/* F. Cours Privés (Annuel & Mensuel) */}
                    {activeCategory === "private" && (
                      <>
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 size={16} className="text-brand-blue shrink-0 mt-0.5" />
                          <span>8 séances privées par mois</span>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 size={16} className="text-brand-blue shrink-0 mt-0.5" />
                          <span>Suivi technique sur-mesure avec le coach</span>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 size={16} className="text-brand-blue shrink-0 mt-0.5" />
                          <span>Accès illimité aux séances Cours Adulte</span>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 size={16} className="text-brand-blue shrink-0 mt-0.5" />
                          <span>Parking privé</span>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 size={16} className="text-brand-blue shrink-0 mt-0.5" />
                          <span>Accès aux événements (stages)</span>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 size={16} className="text-brand-blue shrink-0 mt-0.5" />
                          <span>Frais d&apos;adhésion : 90 €</span>
                        </div>
                      </>
                    )}

                    {/* G. Digital Premium (Mensuel & Annuel) */}
                    {activeCategory === "digital" && (
                      <>
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 size={16} className="text-brand-blue shrink-0 mt-0.5" />
                          <span>Moteur nutritionnel personnalisé (Mifflin-St Jeor)</span>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 size={16} className="text-brand-blue shrink-0 mt-0.5" />
                          <span>Journal alimentaire 4 repas & suivi des macros</span>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 size={16} className="text-brand-blue shrink-0 mt-0.5" />
                          <span>Bibliothèque complète de recettes adaptées à votre objectif</span>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 size={16} className="text-brand-blue shrink-0 mt-0.5" />
                          <span>Programmes d'entraînement Maison & Salle</span>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 size={16} className="text-brand-blue shrink-0 mt-0.5" />
                          <span>Protocoles KB SHRED Digital à domicile</span>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 size={16} className="text-brand-blue shrink-0 mt-0.5" />
                          <span>Suivi de progression & courbe de poids interactive</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Cadre d'information */}
                <div className="p-3.5 rounded-xl bg-brand-blue/10 border border-brand-blue/20 flex items-start gap-2.5 text-xs text-brand-white/90 leading-relaxed">
                  <Info size={16} className="text-brand-blue shrink-0 mt-0.5" />
                  <span>
                    {activeCategory === "adult" && adultFormula === "all_access" && "Cette formule vous donne un accès illimité à l'ensemble des créneaux Cours Adulte du club."}
                    {activeCategory === "adult" && adultFormula === "essential" && "Cette formule vous donne accès aux séances encadrées par le coach sur les créneaux dédiés."}
                    {activeCategory === "lady" && "Cours 100 % féminin, accès exclusivement aux créneaux Lady Striking."}
                    {activeCategory === "kid" && "Formule saison de septembre à juin (hors vacances scolaires). Stages organisés inclus dans la formule."}
                    {activeCategory === "private" && "Cette formule vous donne accès à 8 séances privées sur réservation ainsi qu'à un accès illimité aux Cours Adulte."}
                    {activeCategory === "digital" && "Programme 100% digital accessible partout. L'activation des paiements Stripe en ligne sera disponible très prochainement."}
                  </span>
                </div>
              </div>

              {/* Right: CTA & Price Card */}
              <div className="bg-[#070c16]/90 border border-brand-white/10 rounded-xl p-6 text-center space-y-4">
                {/* 5. PRIX */}
                <div>
                  <p className="text-xs uppercase tracking-wider text-brand-white/75">
                    {activeCategory === "kid"
                      ? "Tarif saison"
                      : activeCategory === "private"
                      ? "Tarif mensuel"
                      : activeCategory === "digital"
                      ? digitalCommitment === "annual"
                        ? "Tarif annuel"
                        : "Tarif mensuel"
                      : "Tarif annuel"}
                  </p>
                  <div className="flex items-baseline justify-center gap-1.5 mt-2 flex-wrap">
                    <span
                      className={cn(
                        "text-4xl sm:text-5xl font-heading font-black tracking-tight",
                        activeCategory === "lady" ? "text-pink-400" : "text-brand-blue"
                      )}
                    >
                      {activeCategory === "adult"
                        ? adultFormula === "all_access"
                          ? `${planPrices.adult_all_access} €`
                          : `${planPrices.adult_essential} €`
                        : activeCategory === "lady"
                        ? `${planPrices.lady_striking} €`
                        : activeCategory === "kid"
                        ? `${planPrices.kid_boxing} €`
                        : activeCategory === "private"
                        ? privateCommitment === "annual"
                          ? `${planPrices.private_annual} €`
                          : `${planPrices.private_monthly} €`
                        : activeCategory === "digital"
                        ? digitalCommitment === "annual"
                          ? `${planPrices.digital_annual} €`
                          : `${planPrices.digital_monthly} €`
                        : ""}
                    </span>
                    <span className="text-xs sm:text-sm text-brand-white/80 font-bold uppercase tracking-wider">
                      {activeCategory === "kid"
                        ? "/ SAISON"
                        : activeCategory === "private"
                        ? "/ MOIS"
                        : activeCategory === "digital"
                        ? digitalCommitment === "annual"
                          ? "/ AN"
                          : "/ MOIS"
                        : "/ AN"}
                    </span>
                  </div>
                </div>

                {/* 6. BOUTON */}
                <div className="space-y-3 pt-2">
                  <Link
                    href={
                      activeCategory === "kid"
                        ? "/contact"
                        : activeCategory === "digital"
                        ? "/membre/defis"
                        : "/connexion"
                    }
                    onClick={() => trackBookingClick("membership", "pricing_card")}
                    className={cn(
                      "w-full py-3.5 px-6 font-heading font-bold text-sm uppercase tracking-wider rounded-sm transition-all flex items-center justify-center gap-2 shadow-lg focus:outline-none focus-visible:ring-2",
                      activeCategory === "lady"
                        ? "bg-pink-500 hover:bg-white text-white hover:text-black shadow-pink-500/30 focus-visible:ring-pink-400"
                        : "bg-brand-blue hover:bg-brand-white text-brand-black shadow-brand-blue/30 focus-visible:ring-brand-blue"
                    )}
                  >
                    {activeCategory === "kid"
                      ? "INSCRIRE MON ENFANT"
                      : activeCategory === "digital"
                      ? "DÉCOUVRIR LE PROGRAMME"
                      : "SOUSCRIRE EN LIGNE"}
                    <ArrowRight size={16} />
                  </Link>
                  <div className="pt-1 text-center">
                    <Link
                      href="/contact"
                      className="inline-block text-xs text-brand-white/70 hover:text-brand-white transition-colors underline-offset-4 hover:underline py-1"
                    >
                      Une question ? Contactez-nous
                    </Link>
                  </div>
                </div>


                <p className="text-[11px] text-brand-white/70 leading-tight">
                  {activeCategory === "kid"
                    ? "Inscriptions limitées • Saison"
                    : "Paiement sécurisé • Accompagnement premium"}
                </p>
              </div>

            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Info Notice */}
      <div className="mt-14 sm:mt-16 text-center p-8 bg-[#0c1322] border border-brand-white/10 rounded-2xl max-w-2xl mx-auto space-y-3">
        <h3 className="text-lg font-heading font-bold uppercase tracking-wider text-brand-white">
          Besoin d&apos;un conseil sur la formule adaptée ?
        </h3>
        <p className="text-xs sm:text-sm text-brand-white/75 leading-relaxed max-w-lg mx-auto">
          Contactez le coach Mahfoud pour échanger sur vos objectifs ou ceux de vos enfants et déterminer le programme le plus adapté.
        </p>
        <div className="pt-2">
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-white/10 hover:bg-brand-white/20 text-brand-white font-heading font-bold text-xs uppercase tracking-wider rounded-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
          >
            CONTACTER LE CLUB
          </Link>
        </div>
      </div>

    </section>
  );
}
