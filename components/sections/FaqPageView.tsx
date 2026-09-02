"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, HelpCircle, Shield, Users, Sparkles, MapPin, Layers } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { allFaqItems, faqCategories } from "@/data/faq";

const categoryIcons: Record<string, React.ElementType> = {
  all: HelpCircle,
  debuter: Sparkles,
  disciplines: Shield,
  lady: Users,
  formules: Layers,
  pratique: MapPin,
};

export default function FaqPageView() {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [openQuestions, setOpenQuestions] = useState<Record<string, boolean>>({});

  const filteredItems = allFaqItems.filter(
    (item) => activeCategory === "all" || item.category === activeCategory
  );

  const toggleQuestion = (question: string) => {
    setOpenQuestions((prev) => ({
      ...prev,
      [question]: !prev[question],
    }));
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 font-sans">
      
      {/* En-tête de la page */}
      <div className="text-center mb-12 sm:mb-16">
        <span className="inline-block text-xs font-heading font-bold uppercase tracking-widest text-brand-blue bg-brand-blue/10 border border-brand-blue/20 px-3.5 py-1.5 rounded-full mb-4">
          Centre d&apos;aide & Questions Fréquentes
        </span>
        <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl font-black text-brand-white uppercase tracking-tight mb-4">
          FOIRE AUX QUESTIONS <span className="text-brand-blue">(FAQ)</span>
        </h1>
        <p className="text-brand-white/70 text-base sm:text-lg font-light max-w-2xl mx-auto leading-relaxed">
          Retrouvez toutes les réponses sur nos cours de boxe, kick-boxing, muay thaï, notre section Lady Striking et nos formules d&apos;entraînement.
        </p>
      </div>

      {/* Filtres par Catégorie */}
      <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-12">
        {faqCategories.map((cat) => {
          const Icon = categoryIcons[cat.id] || HelpCircle;
          const isActive = activeCategory === cat.id;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "px-4 py-2.5 rounded-xl text-xs sm:text-sm font-heading font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center gap-2 border",
                isActive
                  ? "bg-brand-blue text-brand-black border-brand-blue shadow-lg shadow-brand-blue/20"
                  : "bg-brand-white/5 text-brand-white/70 border-brand-white/10 hover:border-brand-white/20 hover:text-brand-white"
              )}
            >
              <Icon size={16} />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Liste des Questions / Réponses */}
      <div className="space-y-4 mb-16">
        {filteredItems.map((item, index) => {
          const isOpen = !!openQuestions[item.question];

          return (
            <motion.div
              key={item.question}
              layout
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.02 }}
              className={cn(
                "border rounded-xl transition-all duration-300 overflow-hidden",
                isOpen
                  ? "border-brand-blue/50 bg-[#070e20]"
                  : "border-brand-white/10 bg-brand-white/5 hover:border-brand-white/20"
              )}
            >
              <button
                type="button"
                onClick={() => toggleQuestion(item.question)}
                className="w-full text-left p-5 sm:p-6 flex justify-between items-center gap-4 cursor-pointer focus:outline-none"
                aria-expanded={isOpen}
              >
                <span className="font-heading text-base sm:text-lg md:text-xl font-bold uppercase tracking-wide text-brand-white">
                  {item.question}
                </span>
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border transition-all duration-300",
                    isOpen
                      ? "bg-brand-blue text-brand-black border-brand-blue rotate-180"
                      : "bg-transparent text-brand-white/60 border-brand-white/20"
                  )}
                >
                  <ChevronDown size={18} />
                </div>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  >
                    <div className="px-5 sm:px-6 pb-6 pt-2 text-brand-white/80 font-light text-sm sm:text-base leading-relaxed border-t border-brand-white/5">
                      {item.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Bloc CTA vers Contact */}
      <div className="rounded-2xl border border-brand-white/10 bg-gradient-to-r from-brand-white/5 via-[#0b1426] to-brand-white/5 p-8 sm:p-10 text-center">
        <h2 className="font-heading text-2xl sm:text-3xl font-bold uppercase tracking-wide text-brand-white mb-3">
          Une question qui n&apos;est pas listée ici ?
        </h2>
        <p className="text-brand-white/70 text-sm sm:text-base max-w-xl mx-auto mb-6 font-light">
          Notre équipe est à votre disposition pour vous orienter vers la formule et le créneau les plus adaptés à vos objectifs.
        </p>
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
          <Link
            href="/contact"
            className="px-8 py-3.5 bg-brand-blue text-brand-black font-heading font-bold uppercase tracking-wider rounded-lg hover:bg-brand-white transition-colors duration-300 shadow-lg shadow-brand-blue/20"
          >
            Nous contacter →
          </Link>
          <a
            href="tel:0614958849"
            className="px-6 py-3.5 bg-brand-white/5 text-brand-white font-heading font-semibold uppercase tracking-wider rounded-lg border border-brand-white/10 hover:border-brand-blue/40 transition-colors"
          >
            Appeler au 06.14.95.88.49
          </a>
        </div>
      </div>

    </div>
  );
}
