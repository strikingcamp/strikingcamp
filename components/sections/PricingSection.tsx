"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, ShieldCheck, Users, ArrowRight } from "lucide-react";
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

type PlanCategory = "Cours Privés" | "Small Group";
type BillingCycle = "Annuel" | "Mensuel";

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
  "Cours Privés": {
    Annuel: {
      subtitle: "Engagement 12 mois",
      commitmentKey: "annual",
      features: [
        "8 séances privées par mois",
        "Suivi technique sur-mesure avec le coach",
        "Accès illimité aux séances Small Group",
        "Frais d'adhésion offerts",
      ],
    },
    Mensuel: {
      subtitle: "Sans engagement",
      commitmentKey: "monthly",
      features: [
        "8 séances privées par mois",
        "Suivi technique sur-mesure avec le coach",
        "Accès illimité aux séances Small Group",
        "Possibilité d'inviter un(e) ami(e)",
        "Frais d'adhésion offerts",
      ],
    },
  },
  "Small Group": {
    Annuel: {
      subtitle: "Engagement 12 mois",
      commitmentKey: "annual",
      features: [
        "Accès illimité aux séances Small Group",
        "Suivi technique personnalisé en groupe réduit (12 max)",
        "Toutes disciplines incluses",
        "Frais d'adhésion : 90€",
      ],
    },
    Mensuel: {
      subtitle: "Sans engagement",
      commitmentKey: "monthly",
      features: [
        "Accès illimité aux séances Small Group",
        "Suivi technique personnalisé en groupe réduit (12 max)",
        "Toutes disciplines incluses",
        "Frais d'adhésion : 90€",
      ],
    },
  },
};

function formatPricingFromPlans(plans: PublicPlan[] = []): Record<PlanCategory, Record<BillingCycle, PlanDetails>> {
  const result: Record<PlanCategory, Record<BillingCycle, PlanDetails>> = {
    "Cours Privés": {
      Annuel: {
        ...basePricingStructure["Cours Privés"]["Annuel"],
        price: "—€",
        priceValue: 0,
        planKey: "private_annual",
      },
      Mensuel: {
        ...basePricingStructure["Cours Privés"]["Mensuel"],
        price: "—€",
        priceValue: 0,
        planKey: "private_monthly",
      },
    },
    "Small Group": {
      Annuel: {
        ...basePricingStructure["Small Group"]["Annuel"],
        price: "—€",
        priceValue: 0,
        planKey: "small_group_annual",
      },
      Mensuel: {
        ...basePricingStructure["Small Group"]["Mensuel"],
        price: "—€",
        priceValue: 0,
        planKey: "small_group_monthly",
      },
    },
  };

  for (const p of plans) {
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

interface PricingSectionProps {
  isSmallGroupActive?: boolean;
  isPrivateActive?: boolean;
  initialPlans?: PublicPlan[];
}

const ALL_CATEGORIES: { id: PlanCategory; label: string; icon: typeof ShieldCheck; badge: string }[] = [
  { id: "Small Group", label: "Small Group", icon: Users, badge: "Recommandé" },
  { id: "Cours Privés", label: "Cours Privés", icon: ShieldCheck, badge: "Sur-mesure" },
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

  const pricingData = useMemo(() => formatPricingFromPlans(initialPlans), [initialPlans]);

  // Sécurisation : si la catégorie active n'est pas dans les catégories autorisées, basculer vers la première disponible
  const currentCategory: PlanCategory = categories.some((c) => c.id === activeCategory)
    ? activeCategory
    : (categories[0]?.id || "Small Group");

  const currentPlan =
    pricingData[currentCategory]?.[activeCycle] ||
    pricingData["Small Group"][activeCycle];

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
          Choisissez l’engagement adapté à vos objectifs.
        </p>
      </div>

      {/* Category Tabs (Pills) */}
      <div className="flex justify-center mb-6">
        <div role="tablist" aria-label="Catégories d'abonnements" className="flex flex-wrap items-center justify-center gap-2 max-w-2xl w-full">
          {categories.map((cat) => {
            const Icon = cat.icon;
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
                  "py-3 px-5 sm:px-6 rounded-full text-xs sm:text-sm font-heading font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue",
                  isActive
                    ? "bg-brand-blue text-brand-black shadow-lg shadow-brand-blue/20 font-black"
                    : "bg-brand-white/5 text-brand-white/80 hover:bg-brand-white/10 hover:text-brand-white border border-brand-white/10"
                )}
              >
                <Icon size={16} className={cn("shrink-0", isActive ? "text-brand-black" : "text-brand-blue")} aria-hidden="true" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Billing Cycle Switcher (Annuel / Mensuel) */}
      <div className="flex justify-center mb-10 sm:mb-12">
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
      </div>

      {/* Pricing Featured Card (Matching /evenements Hero Card Style) */}
      <div className="max-w-3xl mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${currentCategory}-${activeCycle}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="relative rounded-2xl bg-gradient-to-br from-[#0c1626] via-[#101e35] to-[#070c16] border border-brand-blue/40 p-6 sm:p-10 shadow-[0_0_50px_rgba(47,174,224,0.15)] overflow-hidden"
          >
            {/* Ambient Radial Glow */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-brand-blue/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
              
              {/* Left & Center: Details & Features */}
              <div className="md:col-span-2 space-y-5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="px-3 py-1 rounded-full bg-brand-blue text-brand-black font-heading font-bold text-xs uppercase tracking-wider">
                    FORMULE {currentCategory.toUpperCase()}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase border bg-brand-blue/20 text-brand-blue border-brand-blue/30">
                    {activeCycle === "Annuel" ? "12 Mois" : "Mensuel"}
                  </span>
                  <span className="text-xs text-[#22c55e] font-bold">
                    • Accès immédiat
                  </span>
                </div>

                <div>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold uppercase tracking-wider text-brand-white">
                    {currentCategory}
                  </h2>
                  <p className="text-xs sm:text-sm text-brand-white/75 mt-1">
                    {currentPlan.subtitle} • Accompagnement pédagogique complet
                  </p>
                </div>

                {/* Features list */}
                <div className="space-y-2.5 pt-2">
                  <p className="text-xs font-heading font-bold uppercase tracking-wider text-brand-blue">
                    Inclus dans votre formule :
                  </p>
                  <div className="space-y-2 text-xs sm:text-sm text-brand-white/80">
                    {currentPlan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-2.5">
                        <CheckCircle2 size={16} className="text-[#22c55e] shrink-0 mt-0.5" aria-hidden="true" />
                        <span className="leading-relaxed">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: CTA & Price Card */}
              <div className="bg-[#070c16]/80 border border-brand-white/10 rounded-xl p-6 text-center space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-brand-white/75">
                    Tarif d&apos;abonnement
                  </p>
                  <div className="flex items-baseline justify-center gap-1 mt-1">
                    <span className="text-4xl sm:text-5xl font-heading font-black text-brand-blue">
                      {currentPlan.price}
                    </span>
                    <span className="text-xs text-brand-white/75 font-medium uppercase tracking-wider">
                      / mois
                    </span>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <Link
                    href="/connexion"
                    onClick={() => trackBookingClick("membership", "pricing_card")}
                    className="w-full py-3.5 px-6 bg-brand-blue hover:bg-brand-white text-brand-black font-heading font-bold text-sm uppercase tracking-wider rounded-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-blue/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
                  >
                    SOUSCRIRE EN LIGNE
                    <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                  <Link
                    href="/contact"
                    className="block w-full py-2.5 px-4 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white/80 text-xs font-semibold uppercase tracking-wider rounded-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
                  >
                    Une question sur les tarifs ?
                  </Link>
                </div>

                <p className="text-[11px] text-brand-white/70 leading-tight">
                  Paiement sécurisé • Aucun engagement caché.
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
          Contactez le coach Mahfoud pour échanger sur vos objectifs et déterminer le programme le plus adapté à votre progression.
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
