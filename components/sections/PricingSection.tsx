"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type PlanCategory = "Cours Privés" | "Small Group" | "Collectifs";
type BillingCycle = "Unitaire" | "Mensuel" | "Annuel";

type PlanDetails = {
  price: string;
  subtitle?: string;
  features: string[];
};

const pricingData: Record<PlanCategory, { cycles: BillingCycle[]; plans: Record<string, PlanDetails> }> = {
  "Cours Privés": {
    cycles: ["Unitaire", "Mensuel", "Annuel"],
    plans: {
      Unitaire: {
        price: "50€",
        subtitle: "(la séance)",
        features: [
          "Séance privée",
          "Suivi technique",
          "Style personnalisé",
        ],
      },
      Mensuel: {
        price: "390€ / mois",
        features: [
          "10 séances privées",
          "Suivi technique",
          "Style personnalisé",
          "Accès illimité aux cours collectifs",
        ],
      },
      Annuel: {
        price: "290€ / mois",
        features: [
          "10 séances privées",
          "Suivi technique",
          "Style personnalisé",
          "Accès illimité au Small Group",
          "Deux mois offerts",
        ],
      },
    },
  },
  "Small Group": {
    cycles: ["Annuel", "Mensuel"],
    plans: {
      Annuel: {
        price: "80€ / mois",
        features: [
          "Engagement 12 mois",
          "Séances illimitées",
          "Suivi technique",
          "Frais d'inscription offerts",
        ],
      },
      Mensuel: {
        price: "120€ / mois",
        features: [
          "Engagement 1 mois",
          "Séances illimitées",
          "Suivi technique",
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
        features: [
          "Engagement 12 mois",
          "Suivi technique",
          "Cours collectifs illimités",
        ],
      },
      Mensuel: {
        price: "79€ / mois",
        features: [
          "Cours collectifs illimités",
          "Suivi technique",
        ],
      },
    },
  },
};

const categories: PlanCategory[] = ["Cours Privés", "Small Group", "Collectifs"];

export default function PricingSection() {
  const [activeCategory, setActiveCategory] = useState<PlanCategory>("Cours Privés");
  const [activeCycle, setActiveCycle] = useState<BillingCycle>("Annuel");

  const currentCategoryData = pricingData[activeCategory];
  const availableCycles = currentCategoryData.cycles;
  const selectedCycle = availableCycles.includes(activeCycle) ? activeCycle : availableCycles[0];
  const currentPlan = currentCategoryData.plans[selectedCycle];

  return (
    <section className="py-12 bg-[#0a1120] font-sans">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-black text-[#00d8ff] uppercase tracking-wide">
            NOS TARIFS
          </h2>
        </div>

        {/* Category Tabs */}
        <div className="flex justify-center mb-6">
          <div className="flex bg-[#2a3441] rounded-lg p-1 w-full max-w-3xl">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={cn(
                  "flex-1 py-3 rounded-md text-sm md:text-base font-bold transition-all duration-300",
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

        {/* Billing Cycle Tabs */}
        <div className="flex justify-center mb-12">
          <div className="flex bg-[#2a3441] rounded-lg p-1 w-full max-w-3xl">
            {availableCycles.map((cycle) => (
              <button
                key={cycle}
                onClick={() => setActiveCycle(cycle)}
                className={cn(
                  "flex-1 py-3 rounded-md text-sm md:text-base font-bold transition-all duration-300",
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
              key={`${activeCategory}-${selectedCycle}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-lg bg-[#2a3441] rounded-xl p-8 shadow-2xl border border-gray-700/50"
            >
              <h3 className="text-2xl font-black text-white uppercase mb-2">
                {activeCategory}
              </h3>
              <div className="mb-8">
                <div className="text-4xl md:text-5xl font-black text-[#00d8ff] uppercase">
                  {currentPlan.price}
                </div>
                {currentPlan.subtitle && (
                  <p className="text-sm font-medium text-gray-400 mt-1">
                    {currentPlan.subtitle}
                  </p>
                )}
              </div>

              <ul className="space-y-4 mb-8">
                {currentPlan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start">
                    <Check className="w-5 h-5 text-[#22c55e] mr-3 shrink-0 mt-0.5" strokeWidth={3} />
                    <span className="text-gray-200">{feature}</span>
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
