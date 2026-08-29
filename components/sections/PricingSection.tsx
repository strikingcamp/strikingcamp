"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type PlanCategory = "Cours Privés" | "Small Group" | "Collectifs";
type BillingCycle = "Annuel" | "Mensuel";

type PlanDetails = {
  price: string;
  subtitle?: string;
  features: string[];
};

// Données par défaut des 8 formules synchronisées avec public.plans
const defaultPricing: Record<
  PlanCategory,
  {
    cycles: BillingCycle[];
    plans: Record<string, PlanDetails>;
    privatePacks?: {
      "8 séances": Record<BillingCycle, PlanDetails>;
      "12 séances": Record<BillingCycle, PlanDetails>;
    };
  }
> = {
  "Cours Privés": {
    cycles: ["Annuel", "Mensuel"],
    plans: {},
    privatePacks: {
      "8 séances": {
        Annuel: {
          price: "190€ / mois",
          subtitle: "Engagement 12 mois • 8 séances privées",
          features: [
            "8 séances privées par mois",
            "Suivi technique & style personnalisé",
            "Accès illimité au Small Group",
            "Accès illimité aux cours collectifs",
            "Engagement 12 mois",
          ],
        },
        Mensuel: {
          price: "290€ / mois",
          subtitle: "Sans engagement long • 8 séances privées",
          features: [
            "8 séances privées par mois",
            "Suivi technique & style personnalisé",
            "Accès illimité aux cours collectifs",
            "Engagement 1 mois",
          ],
        },
      },
      "12 séances": {
        Annuel: {
          price: "290€ / mois",
          subtitle: "Engagement 12 mois • 12 séances privées",
          features: [
            "12 séances privées par mois",
            "Suivi technique intensif",
            "Accès illimité au Small Group",
            "Accès illimité aux cours collectifs",
            "Engagement 12 mois",
          ],
        },
        Mensuel: {
          price: "390€ / mois",
          subtitle: "Sans engagement long • 12 séances privées",
          features: [
            "12 séances privées par mois",
            "Suivi technique intensif",
            "Accès illimité aux cours collectifs",
            "Engagement 1 mois",
          ],
        },
      },
    },
  },
  "Small Group": {
    cycles: ["Annuel", "Mensuel"],
    plans: {
      Annuel: {
        price: "80€ / mois",
        subtitle: "Engagement 12 mois",
        features: [
          "Engagement 12 mois",
          "Séances Small Group illimitées (20 max)",
          "Accès illimité aux cours collectifs",
          "Suivi technique personnalisé",
          "Frais d'inscription offerts",
        ],
      },
      Mensuel: {
        price: "120€ / mois",
        subtitle: "Engagement 1 mois",
        features: [
          "Engagement 1 mois",
          "Séances Small Group illimitées (20 max)",
          "Accès illimité aux cours collectifs",
          "Suivi technique personnalisé",
          "Frais d'inscription : 39,00€",
        ],
      },
    },
  },
  Collectifs: {
    cycles: ["Annuel", "Mensuel"],
    plans: {
      Annuel: {
        price: "39€ / mois",
        subtitle: "Engagement 12 mois",
        features: [
          "Engagement 12 mois",
          "Cours collectifs illimités",
          "Kickboxing, Boxe Thaï, Boxing Bag, KB Shred",
          "Suivi technique",
        ],
      },
      Mensuel: {
        price: "79€ / mois",
        subtitle: "Engagement 1 mois",
        features: [
          "Engagement 1 mois",
          "Cours collectifs illimités",
          "Kickboxing, Boxe Thaï, Boxing Bag, KB Shred",
          "Suivi technique",
        ],
      },
    },
  },
};

const categories: PlanCategory[] = ["Cours Privés", "Small Group", "Collectifs"];

export default function PricingSection() {
  const supabase = createClient();
  const [activeCategory, setActiveCategory] = useState<PlanCategory>("Cours Privés");
  const [activeCycle, setActiveCycle] = useState<BillingCycle>("Annuel");
  const [privatePack, setPrivatePack] = useState<"8 séances" | "12 séances">("8 séances");
  const [livePricing, setLivePricing] = useState(defaultPricing);

  // Synchronisation dynamique avec public.plans
  useEffect(() => {
    async function syncPlans() {
      try {
        const { data: plansData } = await supabase
          .from("plans")
          .select("name, code, type, commitment, price_cents, private_sessions_per_period, is_active")
          .eq("is_active", true);

        if (plansData && plansData.length > 0) {
          setLivePricing((prev) => {
            const updated = JSON.parse(JSON.stringify(prev));

            for (const p of plansData) {
              const euros = Math.round(p.price_cents / 100);
              const cycle: BillingCycle = p.commitment === "annual" ? "Annuel" : "Mensuel";

              if (p.type === "small_group") {
                if (updated["Small Group"].plans[cycle]) {
                  updated["Small Group"].plans[cycle].price = `${euros}€ / mois`;
                }
              } else if (p.type === "collective") {
                if (updated["Collectifs"].plans[cycle]) {
                  updated["Collectifs"].plans[cycle].price = `${euros}€ / mois`;
                }
              } else if (p.type === "private" && updated["Cours Privés"].privatePacks) {
                const packKey = p.private_sessions_per_period === 12 ? "12 séances" : "8 séances";
                if (updated["Cours Privés"].privatePacks[packKey]?.[cycle]) {
                  updated["Cours Privés"].privatePacks[packKey][cycle].price = `${euros}€ / mois`;
                }
              }
            }

            return updated;
          });
        }
      } catch (err) {
        console.warn("Utilisation des tarifs par défaut :", err);
      }
    }

    syncPlans();
  }, [supabase]);

  const currentCategoryData = livePricing[activeCategory];
  const availableCycles = currentCategoryData.cycles;
  const selectedCycle = availableCycles.includes(activeCycle)
    ? activeCycle
    : availableCycles[0];

  let currentPlan: PlanDetails;
  if (activeCategory === "Cours Privés" && currentCategoryData.privatePacks) {
    currentPlan = currentCategoryData.privatePacks[privatePack][selectedCycle];
  } else {
    currentPlan = currentCategoryData.plans[selectedCycle];
  }

  return (
    <section className="py-12 bg-[#0a1120] font-sans">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10">
          <h2 className="text-4xl md:text-5xl font-black text-[#00d8ff] uppercase tracking-wide">
            NOS TARIFS
          </h2>
          <p className="text-sm text-gray-400 mt-2">
            Des formules adaptées à votre niveau, vos objectifs et votre rythme
          </p>
        </div>

        {/* Category Tabs */}
        <div className="flex justify-center mb-6">
          <div className="flex bg-[#2a3441] rounded-lg p-1 w-full max-w-3xl">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={cn(
                  "flex-1 py-3 rounded-md text-sm md:text-base font-bold transition-all duration-300 cursor-pointer",
                  activeCategory === category
                    ? "bg-[#00d8ff] text-white shadow-md"
                    : "text-gray-300 hover:text-white"
                )}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Private Pack Selector (si Cours Privés) */}
        {activeCategory === "Cours Privés" && (
          <div className="flex justify-center mb-4">
            <div className="inline-flex bg-[#1e293b] border border-amber-500/30 rounded-lg p-1">
              {(["8 séances", "12 séances"] as const).map((pack) => (
                <button
                  key={pack}
                  onClick={() => setPrivatePack(pack)}
                  className={cn(
                    "px-5 py-2 rounded-md text-xs sm:text-sm font-bold uppercase tracking-wider transition-all cursor-pointer",
                    privatePack === pack
                      ? "bg-amber-500 text-black shadow-md"
                      : "text-gray-300 hover:text-white"
                  )}
                >
                  Pack {pack}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Billing Cycle Tabs */}
        <div className="flex justify-center mb-10">
          <div className="flex bg-[#2a3441] rounded-lg p-1 w-full max-w-md">
            {availableCycles.map((cycle) => (
              <button
                key={cycle}
                onClick={() => setActiveCycle(cycle)}
                className={cn(
                  "flex-1 py-2.5 rounded-md text-xs sm:text-sm font-bold transition-all duration-300 cursor-pointer uppercase tracking-wider",
                  selectedCycle === cycle
                    ? "bg-[#00d8ff] text-white shadow-md"
                    : "text-gray-300 hover:text-white"
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
              key={`${activeCategory}-${selectedCycle}-${activeCategory === "Cours Privés" ? privatePack : ""}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-lg bg-[#2a3441] rounded-xl p-8 shadow-2xl border border-gray-700/50"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <h3 className="text-2xl font-black text-white uppercase">
                  {activeCategory}
                </h3>
                {activeCategory === "Cours Privés" && (
                  <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full text-xs font-bold uppercase">
                    {privatePack}
                  </span>
                )}
              </div>

              <div className="mb-6">
                <div className="text-4xl md:text-5xl font-black text-[#00d8ff] uppercase">
                  {currentPlan.price}
                </div>
                {currentPlan.subtitle && (
                  <p className="text-sm font-medium text-gray-400 mt-1">
                    {currentPlan.subtitle}
                  </p>
                )}
              </div>

              <ul className="space-y-3.5 mb-6">
                {currentPlan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start">
                    <Check
                      className="w-5 h-5 text-[#22c55e] mr-3 shrink-0 mt-0.5"
                      strokeWidth={3}
                    />
                    <span className="text-gray-200 text-sm sm:text-base">{feature}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

