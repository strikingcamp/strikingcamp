"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Target, Zap, Flame, HeartPulse, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const MAIN_LEVELS = [
  {
    step: "01",
    name: "FONDAMENTAUX",
    tagline: "Construire les bases",
    description:
      "Apprentissage et consolidation des bases techniques, de la posture, des appuis et de la gestion de la distance. Idéal pour débuter ou perfectionner ses fondamentaux.",
    colorClasses: {
      border: "border-emerald-500/30 hover:border-emerald-500/60",
      badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
      glow: "group-hover:shadow-[0_0_25px_rgba(16,185,129,0.15)]",
      number: "text-emerald-400/30 group-hover:text-emerald-400/60",
      accent: "text-emerald-400",
    },
    icon: ShieldCheck,
  },
  {
    step: "02",
    name: "DRILLS",
    tagline: "Développer la technique",
    description:
      "Automatisation des combinaisons, travail aux paos et pattes d'ours, fluidité du timing et précision du geste à intensité progressive.",
    colorClasses: {
      border: "border-[#00d8ff]/30 hover:border-[#00d8ff]/60",
      badge: "bg-[#00d8ff]/15 text-[#00d8ff] border-[#00d8ff]/30",
      glow: "group-hover:shadow-[0_0_25px_rgba(0,216,255,0.15)]",
      number: "text-[#00d8ff]/30 group-hover:text-[#00d8ff]/60",
      accent: "text-[#00d8ff]",
    },
    icon: Target,
  },
  {
    step: "03",
    name: "PERFORMANCE",
    tagline: "Mettre la technique sous pression",
    description:
      "Exercices à intensité élevée, réactivité face aux situations de combat et renforcement de la lucidité sous fatigue physique.",
    colorClasses: {
      border: "border-amber-500/30 hover:border-amber-500/60",
      badge: "bg-amber-500/15 text-amber-400 border-amber-500/30",
      glow: "group-hover:shadow-[0_0_25px_rgba(245,158,11,0.15)]",
      number: "text-amber-400/30 group-hover:text-amber-400/60",
      accent: "text-amber-400",
    },
    icon: Zap,
  },
  {
    step: "04",
    name: "ELITE",
    tagline: "Repousser ses limites",
    description:
      "Mises en situation thématiques avancées, travail d'opposition technique contrôlée et engagement physique maximal pour les pratiquants confirmés.",
    colorClasses: {
      border: "border-red-500/30 hover:border-red-500/60",
      badge: "bg-red-500/15 text-red-400 border-red-500/30",
      glow: "group-hover:shadow-[0_0_25px_rgba(239,68,68,0.15)]",
      number: "text-red-400/30 group-hover:text-red-400/60",
      accent: "text-red-400",
    },
    icon: Flame,
  },
];

const SPECIAL_CATEGORIES = [
  {
    name: "CARDIO",
    badge: "Tous niveaux",
    tagline: "Dépense énergétique & condition physique",
    description:
      "Séances rythmées de 50 minutes au sac et au poids du corps (Boxing Bag, KB Shred) pour brûler des calories, renforcer le cœur et se défouler sans contact.",
    colorClasses: {
      border: "border-purple-500/30 hover:border-purple-500/60",
      badge: "bg-purple-500/15 text-purple-400 border-purple-500/30",
      glow: "group-hover:shadow-[0_0_25px_rgba(168,85,247,0.15)]",
      accent: "text-purple-400",
    },
    icon: HeartPulse,
  },
  {
    name: "LADY STRIKING",
    badge: "100% féminin",
    tagline: "Réservé exclusivement aux femmes",
    description:
      "Un créneau dédié aux femmes pour pratiquer la boxe et le kick boxing dans une ambiance bienveillante, dynamique et stimulante, encadrée par nos coachs.",
    colorClasses: {
      border: "border-pink-500/30 hover:border-pink-500/60",
      badge: "bg-pink-500/15 text-pink-400 border-pink-500/30",
      glow: "group-hover:shadow-[0_0_25px_rgba(236,72,153,0.15)]",
      accent: "text-pink-400",
    },
    icon: Sparkles,
  },
];

export default function MethodSection() {
  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto font-sans relative">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center px-3.5 py-1.5 bg-[#00d8ff]/10 border border-[#00d8ff]/20 rounded-full text-[#00d8ff] text-xs font-semibold uppercase tracking-widest mb-4"
        >
          Progression & Pédagogie
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-3xl sm:text-4xl md:text-5xl font-heading font-black uppercase tracking-tight text-brand-white"
        >
          LA MÉTHODE <span className="text-[#00d8ff]">STRIKING CAMP</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-4 text-brand-white/80 text-base sm:text-lg leading-relaxed font-light"
        >
          Une progression claire. Un entraînement adapté. Une méthode pensée pour chaque pratiquant.
        </motion.p>
      </div>

      {/* 4 Piliers de progression */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6 mb-10">
        {MAIN_LEVELS.map((lvl, idx) => {
          const IconComponent = lvl.icon;
          return (
            <motion.div
              key={lvl.name}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className={cn(
                "group relative bg-[#0c1322] border rounded-2xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-300",
                lvl.colorClasses.border,
                lvl.colorClasses.glow
              )}
            >
              <div>
                {/* Header Card : Step + Icon */}
                <div className="flex items-center justify-between mb-4">
                  <span
                    className={cn(
                      "font-heading font-black text-2xl sm:text-3xl tracking-tight transition-colors",
                      lvl.colorClasses.number
                    )}
                  >
                    {lvl.step}
                  </span>
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl border flex items-center justify-center transition-transform group-hover:scale-110",
                      lvl.colorClasses.badge
                    )}
                  >
                    <IconComponent size={20} />
                  </div>
                </div>

                {/* Nom + Badge */}
                <h3 className="text-lg sm:text-xl font-heading font-black uppercase tracking-wide text-brand-white mb-1.5">
                  {lvl.name}
                </h3>
                <p className={cn("text-xs font-semibold uppercase tracking-wider mb-4", lvl.colorClasses.accent)}>
                  {lvl.tagline}
                </p>

                {/* Description */}
                <p className="text-xs sm:text-sm text-brand-white/70 leading-relaxed font-light">
                  {lvl.description}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Catégories Spécifiques : Cardio & Lady Striking */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 mb-12 sm:mb-16">
        {SPECIAL_CATEGORIES.map((cat, idx) => {
          const IconComponent = cat.icon;
          return (
            <motion.div
              key={cat.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 + idx * 0.1 }}
              className={cn(
                "group relative bg-[#0c1322] border rounded-2xl p-6 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center gap-5 transition-all duration-300",
                cat.colorClasses.border,
                cat.colorClasses.glow
              )}
            >
              <div
                className={cn(
                  "w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 transition-transform group-hover:scale-110",
                  cat.colorClasses.badge
                )}
              >
                <IconComponent size={24} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 flex-wrap mb-1">
                  <h3 className="text-lg sm:text-xl font-heading font-black uppercase tracking-wide text-brand-white">
                    {cat.name}
                  </h3>
                  <span
                    className={cn(
                      "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                      cat.colorClasses.badge
                    )}
                  >
                    {cat.badge}
                  </span>
                </div>
                <p className={cn("text-xs font-semibold uppercase tracking-wider mb-2", cat.colorClasses.accent)}>
                  {cat.tagline}
                </p>
                <p className="text-xs sm:text-sm text-brand-white/70 leading-relaxed font-light">
                  {cat.description}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Note Pédagogique et Réassurance (Non Scolaire) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="bg-[#0b172a]/70 border border-brand-white/10 rounded-2xl p-6 sm:p-8 max-w-4xl mx-auto text-center backdrop-blur-sm"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-white/5 border border-brand-white/10 text-brand-white/80 text-xs font-semibold mb-3">
          💡 Philosophie d&apos;apprentissage
        </div>
        <h4 className="text-base sm:text-lg font-heading font-bold uppercase text-brand-white tracking-wide mb-3">
          L&apos;objectif de la séance, pas une étiquette définitive.
        </h4>
        <p className="text-xs sm:text-sm text-brand-white/70 leading-relaxed max-w-2xl mx-auto font-light mb-6">
          À Striking Camp, il n&apos;y a ni examen, ni diplôme, ni passage imposé. Les niveaux indiquent la dynamique et l&apos;intensité de la séance. Nos coachs adaptent chaque exercice à votre niveau réel pour que vous progressiez avec plaisir et sécurité.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/contact#essai"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#00d8ff] hover:bg-[#00d8ff]/90 text-brand-black font-heading font-black text-xs uppercase tracking-wider shadow-lg shadow-[#00d8ff]/20 transition-all cursor-pointer"
          >
            Réserver une séance d&apos;essai
            <ArrowRight size={14} />
          </Link>
          <Link
            href="/planning"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-white/5 hover:bg-brand-white/10 text-brand-white border border-brand-white/10 font-heading font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
          >
            Consulter le planning des cours
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
