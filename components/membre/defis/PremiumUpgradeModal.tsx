"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

interface PremiumUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureTitle?: string;
  featureDescription?: string;
}

export default function PremiumUpgradeModal({
  isOpen,
  onClose,
  featureTitle = "Accès Digital Premium Striking Camp",
  featureDescription = "Débloquez l'intégralité du suivi nutritionnel personnalisé, des programmes d'entraînement et du protocole KB SHRED Digital.",
}: PremiumUpgradeModalProps) {
  if (!isOpen) return null;

  const features = [
    {
      title: "Moteur Nutritionnel & Macros Déterministes",
      desc: "Calculs personnalisés, cibles calories & protéines adaptées à votre profil et objectif.",
    },
    {
      title: "Journal Alimentaire & Recettes Sportives",
      desc: "Suivi quotidien des repas et bibliothèque complète de recettes calibrées.",
    },
    {
      title: "Protocole KB SHRED Digital",
      desc: "Circuits Kettlebell haute intensité pour optimiser condition physique et composition corporelle.",
    },
    {
      title: "Programmes d'Entraînement Maison & Salle",
      desc: "Séances structurées et progressives (Poids du corps, Haltères, Salle de sport).",
    },
    {
      title: "Suivi de Progression & Courbes de Poids",
      desc: "Historiques des pesées, analyses d'évolution et indicateurs de régularité.",
    },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/85 backdrop-blur-sm"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="relative w-full max-w-lg bg-[#0c1322] border border-brand-white/15 rounded-2xl shadow-2xl overflow-hidden z-10 p-6 sm:p-8 space-y-6"
        >
          {/* Header & Badge */}
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-brand-blue/15 border border-brand-blue/30 text-brand-blue text-xs font-bold uppercase tracking-wider">
              Accès Premium
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-brand-white/5 hover:bg-brand-white/10 text-brand-white/60 hover:text-brand-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Title & Description */}
          <div className="space-y-2">
            <h3 className="text-2xl font-heading font-black uppercase tracking-wide text-brand-white">
              {featureTitle}
            </h3>
            <p className="text-sm text-brand-white/60 leading-relaxed">
              {featureDescription}
            </p>
          </div>

          {/* Feature List */}
          <div className="space-y-2.5 pt-1">
            {features.map((item, idx) => {
              return (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-[#070c16]/70 border border-brand-white/5 space-y-0.5"
                >
                  <p className="text-xs sm:text-sm font-bold text-brand-white">
                    {item.title}
                  </p>
                  <p className="text-[11px] sm:text-xs text-brand-white/50 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Footer Note & CTAs */}
          <div className="space-y-3 pt-2">
            <Link
              href="/tarifs"
              onClick={onClose}
              className="w-full py-3.5 px-6 rounded-xl bg-brand-blue hover:bg-brand-white text-brand-black font-heading font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-brand-blue/20"
            >
              <span>Découvrir les Offres Digitales</span>
              <ArrowRight size={18} />
            </Link>

            <button
              onClick={onClose}
              className="w-full py-2.5 text-xs font-semibold text-brand-white/50 hover:text-brand-white transition-colors text-center cursor-pointer"
            >
              Continuer avec l'accès gratuit
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
