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
  commitment: "monthly" | "annual" | string | null;
  price_cents: number;
  private_sessions_per_period?: number | null;
  is_active?: boolean;
}

type PlanCategory = "Cours Privés" | "Small Group" | "Lady Striking" | "Kid Boxing";
type BillingCycle = "Annuel" | "Mensuel";
type KidAgeGroup = "5-8" | "9-13";

const kidBoxingData: Record<KidAgeGroup, { title: string; subtitle: string; features: string[] }> = {
  "5-8": {
    title: "KID BOXING (5–8 ANS)",
    subtitle:
      "Un cadre sécurisé et bienveillant pour canaliser l'énergie de votre enfant, développer sa motricité et lui faire découvrir la boxe en s'amusant.",
    features: [
      "Accès aux créneaux dédiés 5–8 ans",
      "Éveil corporel, motricité globale et équilibre",
      "Découverte ludique de la boxe et jeux éducatifs",
      "Encadrement pédagogique adapté",
      "Parking privé inclus",
    ],
  },
  "9-13": {
    title: "KID BOXING (9–13 ANS)",
    subtitle:
      "Un cadre sécurisé et bienveillant pour canaliser l'énergie de votre enfant, développer sa motricité et lui faire découvrir la boxe en s'amusant.",
    features: [
      "Accès aux créneaux dédiés 9–13 ans",
      "Bases techniques pieds-poings et frappe aux paos",
      "Développement de la coordination, des réflexes et du cardio",
      "Discipline, respect et confiance en soi",
      "Parking privé inclus",
    ],
  },
};

type PlanDetails = {
  price: string;
  priceValue: number;
  subtitle: string;
  planKey: string;
  commitmentKey: "annual" | "monthly";
  features: string[];
};

const basePricingStructure: Record<
  PlanCategory,
  Record<BillingCycle, Omit<PlanDetails, "price" | "priceValue" | "planKey">>
> = {
  "Small Group": {
    Annuel: {
      subtitle: "Engagement 12 mois",
      commitmentKey: "annual",
      features: [
        "Accès illimité aux séances Cours Adulte",
        "Suivi technique personnalisé en groupe réduit (12 max)",
        "Toutes disciplines incluses",
        "Parking privé inclus",
        "Frais d'adhésion : 90€",
      ],
    },
    Mensuel: {
      subtitle: "Sans engagement",
      commitmentKey: "monthly",
      features: [
        "Accès illimité aux séances Cours Adulte",
        "Suivi technique personnalisé en groupe réduit (12 max)",
        "Toutes disciplines incluses",
        "Parking privé inclus",
        "Frais d'adhésion : 90€",
      ],
    },
  },
  "Lady Striking": {
    Annuel: {
      subtitle: "Cours 100 % féminin",
      commitmentKey: "monthly",
      features: [
        "Accès aux créneaux Lady Striking",
        "Coaching et suivi personnalisé",
        "Technique boxe, travail au sac et cardio",
        "Tous niveaux (débutantes à confirmées)",
        "Parking privé inclus",
      ],
    },
    Mensuel: {
      subtitle: "Cours 100 % féminin",
      commitmentKey: "monthly",
      features: [
        "Accès aux créneaux Lady Striking",
        "Coaching et suivi personnalisé",
        "Technique boxe, travail au sac et cardio",
        "Tous niveaux (débutantes à confirmées)",
        "Parking privé inclus",
      ],
    },
  },
  "Kid Boxing": {
    Annuel: {
      subtitle: "5 à 8 ans",
      commitmentKey: "annual",
      features: [
        "Accès aux créneaux dédiés 5–8 ans",
        "Éveil corporel, motricité globale et équilibre",
        "Découverte ludique de la boxe et jeux éducatifs",
        "Encadrement pédagogique adapté",
        "Parking privé inclus",
      ],
    },
    Mensuel: {
      subtitle: "5 à 8 ans",
      commitmentKey: "annual",
      features: [
        "Accès aux créneaux dédiés 5–8 ans",
        "Éveil corporel, motricité globale et équilibre",
        "Découverte ludique de la boxe et jeux éducatifs",
        "Encadrement pédagogique adapté",
        "Parking privé inclus",
      ],
    },
  },
  "Cours Privés": {
    Annuel: {
      subtitle: "Engagement 12 mois",
      commitmentKey: "annual",
      features: [
        "8 séances privées par mois",
        "Suivi technique sur-mesure avec le coach",
        "Accès illimité aux séances Cours Adulte",
        "Parking privé inclus",
        "Frais d'adhésion offerts",
      ],
    },
    Mensuel: {
      subtitle: "Sans engagement",
      commitmentKey: "monthly",
      features: [
        "8 séances privées par mois",
        "Suivi technique sur-mesure avec le coach",
        "Accès illimité aux séances Cours Adulte",
        "Possibilité d'inviter un(e) ami(e)",
        "Parking privé inclus",
        "Frais d'adhésion offerts",
      ],
    },
  },
};

function formatPricingFromPlans(plans: PublicPlan[] = []): Record<PlanCategory, Record<BillingCycle, PlanDetails>> {
  const result: Record<PlanCategory, Record<BillingCycle, PlanDetails>> = {
    "Small Group": {
      Annuel: {
        ...basePricingStructure["Small Group"]["Annuel"],
        price: "90€",
        priceValue: 90,
        planKey: "small_group_annual",
      },
      Mensuel: {
        ...basePricingStructure["Small Group"]["Mensuel"],
        price: "120€",
        priceValue: 120,
        planKey: "small_group_monthly",
      },
    },
    "Lady Striking": {
      Annuel: {
        ...basePricingStructure["Lady Striking"]["Annuel"],
        price: "50€",
        priceValue: 50,
        planKey: "lady_striking_monthly",
      },
      Mensuel: {
        ...basePricingStructure["Lady Striking"]["Mensuel"],
        price: "50€",
        priceValue: 50,
        planKey: "lady_striking_monthly",
      },
    },
    "Kid Boxing": {
      Annuel: {
        ...basePricingStructure["Kid Boxing"]["Annuel"],
        price: "350€",
        priceValue: 350,
        planKey: "kid_boxing_season",
      },
      Mensuel: {
        ...basePricingStructure["Kid Boxing"]["Mensuel"],
        price: "350€",
        priceValue: 350,
        planKey: "kid_boxing_season",
      },
    },
    "Cours Privés": {
      Annuel: {
        ...basePricingStructure["Cours Privés"]["Annuel"],
        price: "299€",
        priceValue: 299,
        planKey: "private_annual",
      },
      Mensuel: {
        ...basePricingStructure["Cours Privés"]["Mensuel"],
        price: "399€",
        priceValue: 399,
        planKey: "private_monthly",
      },
    },
  };

  for (const p of plans) {
    if (p.is_active === false) continue;
    const euros = Math.round(p.price_cents / 100);
    const cycle: BillingCycle = p.commitment === "annual" ? "Annuel" : "Mensuel";

    if (p.type === "small_group") {
      if (result["Small Group"]?.[cycle]) {
        result["Small Group"][cycle].price = `${euros}€`;
        result["Small Group"][cycle].priceValue = euros;
        result["Small Group"][cycle].planKey = p.code || p.id;
      }
    } else if (p.type === "private" && (p.private_sessions_per_period === 8 || !p.private_sessions_per_period)) {
      if (result["Cours Privés"]?.[cycle]) {
        result["Cours Privés"][cycle].price = `${euros}€`;
        result["Cours Privés"][cycle].priceValue = euros;
        result["Cours Privés"][cycle].planKey = p.code || p.id;
      }
    }
  }

  return result;
}

function getCategoryInfoText(category: PlanCategory): string {
  switch (category) {
    case "Small Group":
      return "Cette formule vous donne un accès illimité à tous les créneaux Cours Adulte.";
    case "Lady Striking":
      return "Cours 100 % féminin, accès exclusivement aux créneaux Lady Striking.";
    case "Kid Boxing":
      return "De septembre à juin (hors vacances scolaires). Les stages organisés pendant les vacances scolaires ne sont pas inclus dans le tarif indiqué.";
    case "Cours Privés":
      return "Cette formule vous donne accès à 8 séances privées sur réservation ainsi qu'à un accès illimité aux Cours Adulte.";
    default:
      return "";
  }
}

interface PricingSectionProps {
  isSmallGroupActive?: boolean;
  isPrivateActive?: boolean;
  initialPlans?: PublicPlan[];
}

const ALL_CATEGORIES: {
  id: PlanCategory;
  label: string;
  badge: string;
}[] = [
  { id: "Small Group", label: "Cours Adulte", badge: "Recommandé" },
  { id: "Lady Striking", label: "Lady Striking", badge: "100% Femmes" },
  { id: "Kid Boxing", label: "Kid Boxing", badge: "5–13 Ans" },
  { id: "Cours Privés", label: "Cours Privés", badge: "Sur-mesure" },
];

export default function PricingSection({
  isSmallGroupActive = true,
  isPrivateActive = true,
  initialPlans = [],
}: PricingSectionProps = {}) {
  const categories = ALL_CATEGORIES.filter((cat) => {
    if (cat.id === "Small Group") return isSmallGroupActive;
    if (cat.id === "Cours Privés") return isPrivateActive;
    return true;
  });

  const defaultCategory: PlanCategory =
    categories.find((c) => c.id === "Small Group")?.id ||
    categories[0]?.id ||
    "Small Group";

  const [activeCategory, setActiveCategory] = useState<PlanCategory>(defaultCategory);
  const [activeCycle, setActiveCycle] = useState<BillingCycle>("Annuel");
  const [kidAgeGroup, setKidAgeGroup] = useState<KidAgeGroup>("5-8");

  const pricingData = useMemo(() => formatPricingFromPlans(initialPlans), [initialPlans]);

  // Sécurisation : si la catégorie active n'est pas dans les catégories autorisées, basculer vers la première disponible
  const currentCategory: PlanCategory = categories.some((c) => c.id === activeCategory)
    ? activeCategory
    : (categories[0]?.id || "Small Group");

  const currentPlan =
    pricingData[currentCategory]?.[activeCycle] ||
    pricingData["Small Group"][activeCycle];

  const isKidBoxing = currentCategory === "Kid Boxing";
  const isLadyStriking = currentCategory === "Lady Striking";

  const displayedSubtitle = isKidBoxing
    ? kidBoxingData[kidAgeGroup].subtitle
    : currentPlan.subtitle;

  const displayedFeatures = isKidBoxing
    ? kidBoxingData[kidAgeGroup].features
    : currentPlan.features;

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
      <div className={cn("flex justify-center", isLadyStriking ? "mb-10 sm:mb-12" : "mb-6")}>
        <div role="tablist" aria-label="Catégories d'abonnements" className="flex flex-wrap items-center justify-center gap-2 max-w-3xl w-full">
          {categories.map((cat) => {
            const isActive = currentCategory === cat.id;

            return (
              <button
                key={cat.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => {
                  setActiveCategory(cat.id);
                  trackPricingView(cat.id);
                }}
                className={cn(
                  "py-3 px-5 sm:px-6 rounded-full text-xs sm:text-sm font-heading font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue",
                  isActive
                    ? "bg-brand-blue text-brand-black shadow-lg shadow-brand-blue/20 font-black"
                    : "bg-brand-white/5 text-brand-white/80 hover:bg-brand-white/10 hover:text-brand-white border border-brand-white/10"
                )}
              >
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Age Group / Billing Cycle Switcher */}
      {!isLadyStriking && (
        <div className="flex justify-center mb-10 sm:mb-12">
          {isKidBoxing ? (
            <div role="tablist" aria-label="Tranche d'âge Kid Boxing" className="inline-flex p-1 rounded-full bg-[#0c1322] border border-brand-white/10 shadow-lg">
              {(["5-8", "9-13"] as KidAgeGroup[]).map((age) => {
                const isActive = kidAgeGroup === age;
                return (
                  <button
                    key={age}
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setKidAgeGroup(age)}
                    className={cn(
                      "py-2 px-5 rounded-full text-xs font-heading font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue",
                      isActive
                        ? "bg-brand-blue/20 text-brand-blue border border-brand-blue/30 font-black shadow-sm"
                        : "text-brand-white/75 hover:text-brand-white"
                    )}
                  >
                    {age === "5-8" ? "5–8 ANS" : "9–13 ANS"}
                  </button>
                );
              })}
            </div>
          ) : (
            <div role="tablist" aria-label="Engagement d'abonnement" className="inline-flex p-1 rounded-full bg-[#0c1322] border border-brand-white/10 shadow-lg">
              {(["Annuel", "Mensuel"] as BillingCycle[]).map((cycle) => {
                const isActive = activeCycle === cycle;
                return (
                  <button
                    key={cycle}
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveCycle(cycle)}
                    className={cn(
                      "py-2 px-5 rounded-full text-xs font-heading font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue",
                      isActive
                        ? "bg-brand-blue/20 text-brand-blue border border-brand-blue/30 font-black shadow-sm"
                        : "text-brand-white/75 hover:text-brand-white"
                    )}
                  >
                    {cycle === "Annuel" ? "Engagement 12 mois" : "Sans engagement"}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Pricing Featured Card */}
      <div className="max-w-3xl mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${currentCategory}-${activeCycle}-${isKidBoxing ? kidAgeGroup : ""}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className={cn(
              "relative rounded-2xl bg-gradient-to-br from-[#0c1626] via-[#101e35] to-[#070c16] border p-6 sm:p-10 shadow-[0_0_50px_rgba(47,174,224,0.15)] overflow-hidden",
              isLadyStriking
                ? "border-pink-500/40 shadow-[0_0_50px_rgba(236,72,153,0.15)]"
                : "border-brand-blue/40"
            )}
          >
            {/* Ambient Radial Glow */}
            <div
              className={cn(
                "absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none",
                isLadyStriking ? "bg-pink-500/10" : "bg-brand-blue/10"
              )}
            />

            <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
              
              {/* Left & Center: Details & Features */}
              <div className="md:col-span-2 space-y-5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span
                    className={cn(
                      "px-3 py-1 rounded-full font-heading font-bold text-xs uppercase tracking-wider",
                      isLadyStriking
                        ? "bg-pink-500 text-white"
                        : "bg-brand-blue text-brand-black"
                    )}
                  >
                    FORMULE {currentCategory === "Small Group" ? "COURS ADULTE" : currentCategory.toUpperCase()}
                  </span>
                  <span
                    className={cn(
                      "px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase border",
                      isLadyStriking
                        ? "bg-pink-500/20 text-pink-300 border-pink-500/30"
                        : "bg-brand-blue/20 text-brand-blue border-brand-blue/30"
                    )}
                  >
                    {isKidBoxing ? "SAISON" : isLadyStriking ? "ENGAGEMENT 12 MOIS" : activeCycle === "Annuel" ? "12 Mois" : "Mensuel"}
                  </span>
                  {!isKidBoxing && (
                    <span className="text-xs text-[#22c55e] font-bold">
                      • {isLadyStriking ? "100% Féminin" : "Accès immédiat"}
                    </span>
                  )}
                </div>

                <div>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold uppercase tracking-wider text-brand-white">
                    {isKidBoxing
                      ? kidBoxingData[kidAgeGroup].title
                      : currentCategory === "Small Group"
                      ? "Cours Adulte"
                      : currentCategory}
                  </h2>
                  <p className="text-xs sm:text-sm text-brand-white/75 mt-1 leading-relaxed">
                    {displayedSubtitle}
                  </p>
                </div>

                {/* Features list */}
                <div className="space-y-2.5 pt-2">
                  <p className="text-xs font-heading font-bold uppercase tracking-wider text-brand-blue">
                    Inclus dans votre formule :
                  </p>
                  <div className="space-y-2 text-xs sm:text-sm text-brand-white/80">
                    {displayedFeatures.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-2.5">
                        <CheckCircle2 size={16} className="text-[#22c55e] shrink-0 mt-0.5" aria-hidden="true" />
                        <span className="leading-relaxed">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cadre d'information unifié */}
                <div className="p-3.5 rounded-xl bg-brand-blue/10 border border-brand-blue/20 flex items-start gap-2.5 text-xs text-brand-white/90 leading-relaxed">
                  <Info size={16} className="text-brand-blue shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{getCategoryInfoText(currentCategory)}</span>
                </div>
              </div>

              {/* Right: CTA & Price Card */}
              <div className="bg-[#070c16]/80 border border-brand-white/10 rounded-xl p-6 text-center space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-brand-white/75">
                    Tarif {isKidBoxing ? "saison" : "d'abonnement"}
                  </p>
                  <div className="flex items-baseline justify-center gap-1 mt-1">
                    <span
                      className={cn(
                        "text-4xl sm:text-5xl font-heading font-black",
                        isLadyStriking ? "text-pink-400" : "text-brand-blue"
                      )}
                    >
                      {currentPlan.price}
                    </span>
                    <span className="text-xs text-brand-white/75 font-medium uppercase tracking-wider">
                      {isKidBoxing ? "/ saison" : "/ mois"}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <Link
                    href={isKidBoxing ? "/contact" : "/connexion"}
                    onClick={() => trackBookingClick("membership", "pricing_card")}
                    className={cn(
                      "w-full py-3.5 px-6 font-heading font-bold text-sm uppercase tracking-wider rounded-sm transition-all flex items-center justify-center gap-2 shadow-lg focus:outline-none focus-visible:ring-2",
                      isLadyStriking
                        ? "bg-pink-500 hover:bg-white text-white hover:text-black shadow-pink-500/30 focus-visible:ring-pink-400"
                        : "bg-brand-blue hover:bg-brand-white text-brand-black shadow-brand-blue/30 focus-visible:ring-brand-blue"
                    )}
                  >
                    {isKidBoxing ? "INSCRIRE MON ENFANT" : "SOUSCRIRE EN LIGNE"}
                    <ArrowRight size={16} aria-hidden="true" />
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
                  {isKidBoxing
                    ? "Inscriptions limitées • Saison"
                    : "Paiement sécurisé • Aucun engagement caché."}
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
