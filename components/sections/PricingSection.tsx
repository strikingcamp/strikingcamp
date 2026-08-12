"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type PlanCategory = "Cours Privés" | "Small Group" | "Collectifs";
type BillingCycle = "Mensuel" | "Annuel";

type PlanDetails = {
  price: string;
  features: string[];
};

const pricingData: Record<PlanCategory, Record<BillingCycle, PlanDetails>> = {
  "Cours Privés": {
    Mensuel: {
      price: "490€/MOIS",
      features: [
        "12 Séances privées (60 min)",
        "Entraînement pattes d'ours",
        "Accès aux Small Groups",
        "Accès aux cours collectifs",
        "Circuit training",
        "Matériel offert (gants + bandes)",
        "Possibilité d'inviter un(e) ami(e)",
        "Sans engagement",
        "Frais d'inscription: 39,99€",
      ],
    },
    Annuel: {
      price: "390€/MOIS",
      features: [
        "12 Séances privées (60 min)",
        "Entraînement pattes d'ours",
        "Accès aux Small Groups",
        "Accès aux cours collectifs",
        "Circuit training",
        "Matériel offert (gants + bandes)",
        "Possibilité d'inviter un(e) ami(e)",
        "Engagement 12 mois",
        "Frais d'inscription: 39,99€",
      ],
    },
  },
  "Small Group": {
    Mensuel: {
      price: "199€/MOIS",
      features: [
        "12 Séances en small group (max 5)",
        "Entraînement pattes d'ours",
        "Suivi technique individuel",
        "Circuit training",
        "Matériel offert (gants + bandes)",
        "Sans engagement",
      ],
    },
    Annuel: {
      price: "150€/MOIS",
      features: [
        "12 Séances en small group (max 5)",
        "Entraînement pattes d'ours",
        "Suivi technique individuel",
        "Circuit training",
        "Matériel offert (gants + bandes)",
        "Engagement 12 mois",
        "Frais d'inscription OFFERTS",
      ],
    },
  },
  Collectifs: {
    Mensuel: {
      price: "80€/MOIS",
      features: [
        "Accès illimité Cours Collectifs",
        "Ambiance de groupe",
        "Sans engagement",
      ],
    },
    Annuel: {
      price: "50€/MOIS",
      features: [
        "Accès illimité Cours Collectifs",
        "Ambiance de groupe",
        "Engagement 12 mois",
      ],
    },
  },
};

const categories: PlanCategory[] = ["Cours Privés", "Small Group", "Collectifs"];
const cycles: BillingCycle[] = ["Mensuel", "Annuel"];

export default function PricingSection() {
  const [activeCategory, setActiveCategory] = useState<PlanCategory>("Cours Privés");
  const [activeCycle, setActiveCycle] = useState<BillingCycle>("Annuel");

  const currentPlan = pricingData[activeCategory][activeCycle];

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
            {cycles.map((cycle) => (
              <button
                key={cycle}
                onClick={() => setActiveCycle(cycle)}
                className={cn(
                  "flex-1 py-3 rounded-md text-sm md:text-base font-bold transition-all duration-300",
                  activeCycle === cycle
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
              key={`${activeCategory}-${activeCycle}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-lg bg-[#2a3441] rounded-xl p-8 shadow-2xl border border-gray-700/50"
            >
              <h3 className="text-2xl font-black text-white uppercase mb-2">
                {activeCategory}
              </h3>
              <div className="text-4xl md:text-5xl font-black text-[#00d8ff] uppercase mb-8">
                {currentPlan.price}
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
