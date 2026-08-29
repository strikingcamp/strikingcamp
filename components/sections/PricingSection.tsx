"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ArrowRight, ShieldCheck, Users, Layers } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type PlanCategory = "Cours Privés" | "Small Group" | "Collectifs";
type BillingCycle = "Annuel" | "Mensuel";

type PlanDetails = {
  price: string;
  priceValue: number;
  subtitle: string;
  planKey: string;
  commitmentKey: "annual" | "monthly";
  features: string[];
};

const defaultPricing: Record<
  PlanCategory,
  Record<BillingCycle, PlanDetails>
> = {
  "Cours Privés": {
    Annuel: {
      price: "299€",
      priceValue: 299,
      subtitle: "Engagement 12 mois",
      planKey: "private_8_annual",
      commitmentKey: "annual",
      features: [
        "8 séances privées",
        "Suivi technique sur mesure",
        "Accès illimité aux Small Group",
        "Accès illimité aux cours collectifs",
        "Frais d'adhésion : Offerts",
      ],
    },
    Mensuel: {
      price: "390€",
      priceValue: 390,
      subtitle: "Sans engagement",
      planKey: "private_8_monthly",
      commitmentKey: "monthly",
      features: [
        "8 séances privées",
        "Suivi technique sur mesure",
        "Accès illimité aux Small Group",
        "Accès illimité aux cours collectifs",
        "Inviter un(e) ami(e)",
        "Frais d'adhésion : Offerts",
      ],
    },
  },
  "Small Group": {
    Annuel: {
      price: "80€",
      priceValue: 80,
      subtitle: "Engagement 12 mois",
      planKey: "small_group_annual",
      commitmentKey: "annual",
      features: [
        "Accès illimité aux Small Group",
        "Accès limité aux cours collectifs",
        "Suivi technique personnalisé",
        "Toutes les disciplines",
        "Frais d'adhésion : 39€",
      ],
    },
    Mensuel: {
      price: "120€",
      priceValue: 120,
      subtitle: "Sans engagement",
      planKey: "small_group_monthly",
      commitmentKey: "monthly",
      features: [
        "Accès illimité aux Small Group",
        "Accès limité aux cours collectifs",
        "Suivi technique personnalisé",
        "Toutes les disciplines",
        "Frais d'adhésion : 39€",
      ],
    },
  },
  Collectifs: {
    Annuel: {
      price: "35€",
      priceValue: 35,
      subtitle: "Engagement 12 mois",
      planKey: "collective_annual",
      commitmentKey: "annual",
      features: [
        "Accès illimité aux cours collectifs",
        "Kick Boxing",
        "Striking",
        "Frais d'adhésion : 39€",
      ],
    },
    Mensuel: {
      price: "60€",
      priceValue: 60,
      subtitle: "Sans engagement",
      planKey: "collective_monthly",
      commitmentKey: "monthly",
      features: [
        "Accès illimité aux cours collectifs",
        "Kick Boxing",
        "Striking",
        "Frais d'adhésion : 39€",
      ],
    },
  },
};

const categories: { id: PlanCategory; label: string; icon: typeof ShieldCheck }[] = [
  { id: "Cours Privés", label: "Cours Privés", icon: ShieldCheck },
  { id: "Small Group", label: "Small Group", icon: Users },
  { id: "Collectifs", label: "Collectifs", icon: Layers },
];

export default function PricingSection() {
  const supabase = createClient();
  const [activeCategory, setActiveCategory] = useState<PlanCategory>("Small Group");
  const [activeCycle, setActiveCycle] = useState<BillingCycle>("Annuel");
  const [livePricing, setLivePricing] = useState(defaultPricing);

  // Synchronisation dynamique optionnelle avec public.plans
  useEffect(() => {
    async function syncPlans() {
      try {
        const { data: plansData } = await supabase
          .from("plans")
          .select("id, name, code, type, commitment, price_cents, private_sessions_per_period, is_active")
          .eq("is_active", true);

        if (plansData && plansData.length > 0) {
          setLivePricing((prev) => {
            const updated = JSON.parse(JSON.stringify(prev));

            for (const p of plansData) {
              const euros = Math.round(p.price_cents / 100);
              const cycle: BillingCycle = p.commitment === "annual" ? "Annuel" : "Mensuel";

              if (p.type === "small_group") {
                if (updated["Small Group"]?.[cycle]) {
                  updated["Small Group"][cycle].price = `${euros}€`;
                  updated["Small Group"][cycle].priceValue = euros;
                  updated["Small Group"][cycle].planKey = p.code || p.id;
                }
              } else if (p.type === "collective") {
                if (updated["Collectifs"]?.[cycle]) {
                  updated["Collectifs"][cycle].price = `${euros}€`;
                  updated["Collectifs"][cycle].priceValue = euros;
                  updated["Collectifs"][cycle].planKey = p.code || p.id;
                }
              } else if (p.type === "private" && (p.private_sessions_per_period === 8 || !p.private_sessions_per_period)) {
                if (updated["Cours Privés"]?.[cycle]) {
                  updated["Cours Privés"][cycle].price = `${euros}€`;
                  updated["Cours Privés"][cycle].priceValue = euros;
                  updated["Cours Privés"][cycle].planKey = p.code || p.id;
                }
              }
            }

            return updated;
          });
        }
      } catch (err) {
        console.warn("Utilisation des tarifs locaux :", err);
      }
    }

    syncPlans();
  }, [supabase]);

  const currentPlan = livePricing[activeCategory][activeCycle];

  // URL d'inscription pré-remplie
  const registerUrl = `/inscription?plan=${encodeURIComponent(currentPlan.planKey)}&category=${encodeURIComponent(activeCategory)}&commitment=${encodeURIComponent(currentPlan.commitmentKey)}&price=${currentPlan.priceValue}`;

  return (
    <section className="py-12 sm:py-20 bg-[#0a1120] font-sans">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-10 sm:mb-14">
          <h2 className="text-4xl md:text-5xl font-black text-[#00d8ff] uppercase tracking-wide">
            NOS TARIFS
          </h2>
          <p className="text-sm sm:text-base text-gray-300 mt-2 max-w-xl mx-auto font-light">
            Choisissez la formule qui correspond à vos objectifs et entraînez-vous dans les meilleures conditions.
          </p>
        </div>

        {/* Category Tabs */}
        <div className="flex justify-center mb-6">
          <div className="grid grid-cols-3 bg-[#1e2530] rounded-xl p-1.5 w-full max-w-2xl border border-gray-700/50 shadow-lg">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={cn(
                    "py-3 px-2 sm:px-4 rounded-lg text-xs sm:text-sm font-heading font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 sm:gap-2",
                    isActive
                      ? "bg-[#00d8ff] text-[#0a1120] shadow-md shadow-[#00d8ff]/20 font-black"
                      : "text-gray-300 hover:text-white hover:bg-white/5"
                  )}
                >
                  <Icon size={16} className={cn("shrink-0", isActive ? "text-[#0a1120]" : "text-[#00d8ff]")} />
                  <span className="truncate">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Billing Cycle Tabs (Annuel / Mensuel) */}
        <div className="flex justify-center mb-10">
          <div className="flex bg-[#1e2530] rounded-lg p-1 w-full max-w-xs border border-gray-700/50">
            {(["Annuel", "Mensuel"] as BillingCycle[]).map((cycle) => (
              <button
                key={cycle}
                onClick={() => setActiveCycle(cycle)}
                className={cn(
                  "flex-1 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer",
                  activeCycle === cycle
                    ? "bg-[#00d8ff] text-[#0a1120] font-black shadow-sm"
                    : "text-gray-400 hover:text-white"
                )}
              >
                {cycle}
              </button>
            ))}
          </div>
        </div>

        {/* Pricing Card */}
        <div className="flex justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeCategory}-${activeCycle}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="w-full max-w-lg bg-[#1e2530] rounded-2xl p-6 sm:p-8 shadow-2xl border border-gray-700/60 flex flex-col justify-between"
            >
              <div>
                {/* Card Header */}
                <div className="flex items-center justify-between gap-3 mb-4 pb-4 border-b border-gray-700/50">
                  <div>
                    <span className="text-[11px] font-bold text-[#00d8ff] uppercase tracking-widest block">
                      Formule
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-heading font-black text-white uppercase tracking-wide">
                      {activeCategory}
                    </h3>
                  </div>

                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#00d8ff]/10 text-[#00d8ff] border border-[#00d8ff]/30">
                    {activeCycle}
                  </span>
                </div>

                {/* Price Display */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl sm:text-5xl font-black text-[#00d8ff] font-heading">
                      {currentPlan.price}
                    </span>
                    <span className="text-gray-400 text-sm font-medium uppercase tracking-wider">
                      / mois
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-300 mt-1 font-light">
                    {currentPlan.subtitle}
                  </p>
                </div>

                {/* Features List */}
                <div className="space-y-3 mb-8">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Ce qui est inclus :
                  </p>
                  <ul className="space-y-3">
                    {currentPlan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-xs sm:text-sm text-gray-200">
                        <div className="w-5 h-5 rounded-full bg-[#00d8ff]/15 text-[#00d8ff] flex items-center justify-center shrink-0 mt-0.5 border border-[#00d8ff]/30">
                          <Check size={12} strokeWidth={3} />
                        </div>
                        <span className="leading-relaxed">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action Button: S'INSCRIRE */}
              <div className="pt-4 border-t border-gray-700/50">
                <Link
                  href={registerUrl}
                  className="w-full py-4 px-6 bg-[#00d8ff] hover:bg-white text-[#0a1120] font-heading font-black text-sm uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#00d8ff]/20 cursor-pointer"
                >
                  <span>S&apos;INSCRIRE</span>
                  <ArrowRight size={16} />
                </Link>
                <p className="text-center text-[11px] text-gray-400 mt-2.5">
                  Sans frais cachés • Accompagnement dès la première séance
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

      </div>
    </section>
  );
}

