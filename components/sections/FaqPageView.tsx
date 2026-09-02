"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, HelpCircle, Shield, Users, Sparkles, MapPin, Layers, Phone, ArrowRight } from "lucide-react";
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
    <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 font-sans">
      
      {/* En-tête de la page */}
      <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-brand-blue/10 border border-brand-blue/20 rounded-full text-brand-blue text-xs font-semibold uppercase tracking-widest mb-4">
          <Sparkles size={14} />
          Centre d&apos;aide & Questions Fréquentes
        </div>
        <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl font-black text-brand-white uppercase tracking-tight mb-4">
          FOIRE AUX <span className="text-brand-blue">QUESTIONS</span>
        </h1>
        <p className="text-brand-white/70 text-sm sm:text-base font-light max-w-2xl mx-auto leading-relaxed">
          Retrouvez toutes les réponses sur nos cours de boxe, kick-boxing, muay thaï, notre section Lady Striking et nos formules d&apos;entraînement.
        </p>
      </div>

      {/* Filtres par Catégorie (Pills) */}
      <div className="flex flex-wrap justify-center gap-2 mb-10 sm:mb-12">
        {faqCategories.map((cat) => {
          const Icon = categoryIcons[cat.id] || HelpCircle;
          const isActive = activeCategory === cat.id;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "px-5 py-2.5 rounded-full text-xs font-heading font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center gap-2",
                isActive
                  ? "bg-brand-blue text-brand-black shadow-lg shadow-brand-blue/20 font-black"
                  : "bg-brand-white/5 text-brand-white/70 hover:bg-brand-white/10 hover:text-brand-white border border-brand-white/10"
              )}
            >
              <Icon size={14} className={isActive ? "text-brand-black" : "text-brand-blue"} />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Liste des Questions / Réponses */}
      <div className="space-y-3.5 mb-16">
        {filteredItems.map((item, index) => {
          const isOpen = !!openQuestions[item.question];

          return (
            <motion.div
              key={item.question}
              layout
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: index * 0.015 }}
              className={cn(
                "border rounded-2xl transition-all duration-200 overflow-hidden",
                isOpen
                  ? "border-brand-blue/40 bg-[#0c1626] shadow-xl shadow-brand-blue/5"
                  : "border-brand-white/10 bg-[#0c1322] hover:border-brand-white/20"
              )}
            >
              <button
                type="button"
                onClick={() => toggleQuestion(item.question)}
                className="w-full text-left p-5 sm:p-6 flex justify-between items-center gap-4 cursor-pointer focus:outline-none"
                aria-expanded={isOpen}
              >
                <span className={cn(
                  "font-heading text-base sm:text-lg md:text-xl font-bold uppercase tracking-wide transition-colors",
                  isOpen ? "text-brand-blue" : "text-brand-white"
                )}>
                  {item.question}
                </span>
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border transition-all duration-300",
                    isOpen
                      ? "bg-brand-blue text-brand-black border-brand-blue rotate-180"
                      : "bg-brand-white/5 text-brand-white/60 border-brand-white/15"
                  )}
                >
                  <ChevronDown size={16} />
                </div>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                  >
                    <div className="px-5 sm:px-6 pb-6 pt-2 text-brand-white/80 font-light text-xs sm:text-sm sm:leading-relaxed border-t border-brand-white/5">
                      {item.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Bloc CTA vers Contact (Featured Style) */}
      <div className="rounded-2xl border border-brand-white/10 bg-gradient-to-br from-[#0c1626] via-[#101e35] to-[#070c16] p-8 sm:p-10 text-center shadow-[0_0_50px_rgba(47,174,224,0.1)]">
        <h2 className="font-heading text-2xl sm:text-3xl font-bold uppercase tracking-wider text-brand-white mb-3">
          Une question qui n&apos;est pas listée ici ?
        </h2>
        <p className="text-brand-white/70 text-xs sm:text-sm max-w-xl mx-auto mb-6 leading-relaxed font-light">
          Le coach Mahfoud est à votre disposition pour vous conseiller sur la formule et les séances les plus adaptées.
        </p>
        <div className="flex flex-col sm:flex-row justify-center items-center gap-3">
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-6 py-3.5 bg-brand-blue text-brand-black font-heading font-bold uppercase tracking-wider text-xs sm:text-sm rounded-sm hover:bg-brand-white transition-all shadow-lg shadow-brand-blue/20"
          >
            NOUS CONTACTER
            <ArrowRight size={14} />
          </Link>
          <a
            href="tel:0614958849"
            className="inline-flex items-center gap-2 px-6 py-3.5 bg-brand-white/5 text-brand-white font-heading font-bold uppercase tracking-wider text-xs sm:text-sm rounded-sm border border-brand-white/10 hover:bg-brand-white/10 transition-colors"
          >
            <Phone size={14} className="text-brand-blue" />
            06.14.95.88.49
          </a>
        </div>
      </div>

    </section>
  );
}
