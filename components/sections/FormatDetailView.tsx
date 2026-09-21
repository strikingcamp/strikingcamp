"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ChevronRight,
  CheckCircle2,
  Shield,
  Calendar,
  Users,
  MapPin,
  Sparkles,
  Clock,
  Target
} from "lucide-react";
import { FormatDetail, publicFormatList } from "@/data/formats";
import TrialBookingModal from "@/components/modals/TrialBookingModal";

interface FormatDetailViewProps {
  format: FormatDetail;
}

export default function FormatDetailView({ format }: FormatDetailViewProps) {
  const [isTrialModalOpen, setIsTrialModalOpen] = useState(false);

  // Other formats for bottom navigation
  const otherFormats = publicFormatList.filter((f) => f.slug !== format.slug);

  return (
    <div className="min-h-screen bg-transparent text-brand-white font-sans">
      {/* 1. Fil d'Ariane (Breadcrumbs) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-4">
        <nav aria-label="Fil d'ariane" className="flex items-center gap-2 text-xs text-brand-white/75 font-medium">
          <Link href="/" className="hover:text-brand-blue transition-colors">
            Accueil
          </Link>
          <ChevronRight size={13} className="text-brand-white/50" aria-hidden="true" />
          <Link href="/#cours" className="hover:text-brand-blue transition-colors">
            Nos cours
          </Link>
          <ChevronRight size={13} className="text-brand-white/50" aria-hidden="true" />
          <span className="text-brand-blue font-semibold">{format.h1}</span>
        </nav>
      </div>

      {/* 2. Hero du Format */}
      <section className="relative py-12 sm:py-20 overflow-hidden">
        {/* Background Image avec dégradé sombre immersif */}
        <div className="absolute inset-0 z-0 opacity-30">
          <Image
            src={format.image}
            alt={format.alt}
            fill
            priority
            className="object-cover object-center filter grayscale contrast-125"
            sizes="100vw"
          />
        </div>
        <div className="absolute inset-0 z-10 bg-gradient-to-b from-[#020817] via-[#020817]/85 to-[#020817]" />

        {/* Ambient Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-brand-blue/15 rounded-full blur-3xl pointer-events-none z-10" />

        <div className="relative z-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Badge Catégorie */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-brand-blue/10 border border-brand-blue/30 rounded-full text-brand-blue text-xs font-semibold uppercase tracking-widest mb-6 shadow-lg shadow-brand-blue/10"
          >
            <Sparkles size={13} />
            <span>{format.category}</span>
          </motion.div>

          {/* H1 : Nom officiel du format */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-heading text-4xl sm:text-6xl md:text-7xl font-black uppercase tracking-tight text-brand-white leading-[0.95]"
          >
            {format.h1}
          </motion.h1>

          {/* Sous-titre */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-4 sm:mt-6 text-base sm:text-xl text-brand-white/80 font-light max-w-2xl mx-auto leading-relaxed"
          >
            {format.subtitle}
          </motion.p>

          {/* Avantages clés */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 mt-6 sm:mt-8"
          >
            {format.benefits.map((benefit, idx) => (
              <span
                key={idx}
                className="px-3.5 py-1.5 rounded-lg bg-[#0c1322]/80 border border-brand-white/10 text-brand-white/80 text-xs font-heading font-medium tracking-wide flex items-center gap-1.5 shadow-sm"
              >
                <CheckCircle2 size={13} className="text-brand-blue" />
                {benefit}
              </span>
            ))}
          </motion.div>

          {/* Boutons d'action Hero */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mt-8 sm:mt-10"
          >
            <button
              type="button"
              onClick={() => setIsTrialModalOpen(true)}
              className="w-full sm:w-auto px-7 sm:px-8 py-3.5 sm:py-4 bg-brand-blue text-brand-black font-heading font-bold text-xs sm:text-sm uppercase tracking-wider hover:bg-brand-white transition-all duration-300 rounded-md text-center shadow-lg shadow-brand-blue/25 hover:shadow-brand-blue/40 cursor-pointer flex items-center justify-center gap-2"
            >
              RÉSERVER UN COURS D’ESSAI
              <ArrowRight size={15} />
            </button>
            <Link
              href="/planning"
              className="w-full sm:w-auto px-6 sm:px-7 py-3.5 sm:py-4 bg-brand-white/5 border border-brand-white/15 text-brand-white hover:bg-brand-white/10 font-heading font-bold text-xs sm:text-sm uppercase tracking-wider transition-colors duration-300 rounded-md text-center flex items-center justify-center gap-2"
            >
              <Calendar size={15} className="text-brand-blue" />
              VOIR LE PLANNING
            </Link>
          </motion.div>
        </div>
      </section>

      {/* 3. Section Présentation Complète & Infos Pratiques */}
      <section className="py-12 sm:py-16 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-[#0c1626] via-[#0e192c] to-[#070c16] border border-brand-blue/20 shadow-2xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-brand-blue shadow-[0_0_8px_rgba(47,174,224,0.8)]" />
            <h2 className="font-heading text-2xl sm:text-3xl font-black text-brand-white uppercase tracking-wider">
              PRÉSENTATION DU FORMAT
            </h2>
          </div>

          <div className="space-y-4 text-brand-white/80 font-light text-sm sm:text-base leading-relaxed">
            {format.intro.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>

          {/* Quick Info Badges */}
          <div className="pt-4 border-t border-brand-white/10 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-brand-white/5 border border-brand-white/5">
              <Shield className="text-brand-blue shrink-0" size={20} />
              <div>
                <p className="text-[11px] text-brand-white/50 uppercase font-heading">Niveau requis</p>
                <p className="text-xs sm:text-sm font-semibold text-brand-white">Tous niveaux (Débutant à Confirmé)</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-brand-white/5 border border-brand-white/5">
              <Users className="text-brand-blue shrink-0" size={20} />
              <div>
                <p className="text-[11px] text-brand-white/50 uppercase font-heading">Encadrement</p>
                <p className="text-xs sm:text-sm font-semibold text-brand-white">Coach Mahfoud Mohamed</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-brand-white/5 border border-brand-white/5">
              <MapPin className="text-brand-blue shrink-0" size={20} />
              <div>
                <p className="text-[11px] text-brand-white/50 uppercase font-heading">Lieu du club</p>
                <p className="text-xs sm:text-sm font-semibold text-brand-white">268 av. de la Capelette, 13010 Marseille</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Section Pour quel public ? */}
      <section className="py-8 sm:py-12 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 sm:p-10 rounded-2xl bg-[#0c1322] border border-brand-white/10 shadow-xl space-y-6">
          <div className="flex items-center gap-3">
            <Target className="text-brand-blue shrink-0" size={24} />
            <h2 className="font-heading text-2xl sm:text-3xl font-black text-brand-white uppercase tracking-wider">
              {format.targetAudience.title}
            </h2>
          </div>

          <p className="text-sm sm:text-base text-brand-white/80 font-light leading-relaxed">
            {format.targetAudience.description}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
            {format.targetAudience.items.map((item, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3.5 rounded-xl bg-brand-white/5 border border-brand-white/5"
              >
                <CheckCircle2 size={16} className="text-brand-blue mt-0.5 shrink-0" />
                <span className="text-xs sm:text-sm text-brand-white/80 font-light leading-snug">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Section Comment se déroule une séance ? */}
      <section className="py-12 sm:py-16 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-blue/10 border border-brand-blue/20 rounded-full text-brand-blue text-xs font-semibold uppercase tracking-widest mb-3">
            <Clock size={12} />
            <span>Structure de l&apos;Entraînement</span>
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl font-black text-brand-white uppercase tracking-tight">
            {format.sessionFlow.title}
          </h2>
          <p className="mt-2 text-brand-white/70 text-xs sm:text-sm font-light">
            Une méthodologie éprouvée et rigoureuse pour optimiser chaque minute de votre séance.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
          {format.sessionFlow.steps.map((step, idx) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.35, delay: idx * 0.08 }}
              className="p-6 rounded-2xl bg-[#0c1322] border border-brand-white/10 hover:border-brand-blue/30 transition-all duration-300 shadow-lg flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <span className="font-heading text-2xl sm:text-3xl font-black text-brand-blue">
                    {step.number}
                  </span>
                  <div className="h-px flex-1 bg-brand-white/10" />
                </div>
                <h3 className="font-heading text-lg sm:text-xl font-bold uppercase tracking-wider text-brand-white mb-2">
                  {step.title}
                </h3>
                <p className="text-xs sm:text-sm text-brand-white/70 font-light leading-relaxed">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 6. Section Contenu & Méthode (sections détaillées) */}
      <section className="py-12 sm:py-16 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center px-3.5 py-1.5 bg-brand-blue/10 border border-brand-blue/20 rounded-full text-brand-blue text-xs font-semibold uppercase tracking-widest mb-3">
            Programme & Objectifs
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-black text-brand-white uppercase tracking-tight">
            CONTENU PÉDAGOGIQUE <span className="text-brand-blue">& OBJECTIFS</span>
          </h2>
          <p className="mt-3 text-brand-white/70 text-xs sm:text-sm font-light leading-relaxed">
            Une progression méthodique, technique et sécurisée conçue pour maximiser votre progression.
          </p>
        </div>

        {/* Grille des sections */}
        <div className="grid grid-cols-1 gap-6 sm:gap-8">
          {format.sections.map((section, index) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              className="p-6 sm:p-8 rounded-2xl bg-[#0c1322] border border-brand-white/10 hover:border-brand-blue/40 shadow-xl hover:shadow-brand-blue/5 transition-all duration-300"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-blue/10 border border-brand-blue/20 text-brand-blue flex items-center justify-center font-heading font-black text-sm">
                    {index + 1}
                  </div>
                  <h3 className="font-heading text-xl sm:text-2xl font-bold uppercase tracking-wider text-brand-white">
                    {section.title}
                  </h3>
                </div>
                {section.badge && (
                  <span className="self-start sm:self-auto px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-brand-blue/15 text-brand-blue border border-brand-blue/30">
                    {section.badge}
                  </span>
                )}
              </div>

              <p className="text-sm sm:text-base text-brand-white/80 font-light mb-4 leading-relaxed">
                {section.description}
              </p>

              {section.points && section.points.length > 0 && (
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-2 border-t border-brand-white/5">
                  {section.points.map((point, pIdx) => (
                    <li key={pIdx} className="flex items-start gap-2.5 text-xs sm:text-sm text-brand-white/70 font-light">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-blue mt-1.5 shrink-0" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          ))}
        </div>
      </section>

      {/* 7. Navigation vers les autres formats */}
      <section className="py-12 sm:py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-brand-white/10">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="font-heading text-2xl sm:text-3xl font-black text-brand-white uppercase tracking-wider">
            DÉCOUVRIR LES <span className="text-brand-blue">AUTRES FORMATS</span>
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-brand-white/60 font-light">
            Explorez nos autres formules d&apos;entraînement adaptées à chaque rythme de progression.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {otherFormats.map((item) => (
            <Link
              key={item.slug}
              href={`/cours/${item.slug}`}
              className="group p-6 sm:p-7 rounded-2xl bg-[#0c1322] border border-brand-white/10 hover:border-brand-blue/40 shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-brand-blue/10 text-brand-blue border border-brand-blue/20">
                    {item.category}
                  </span>
                </div>
                <h3 className="font-heading text-xl sm:text-2xl font-bold uppercase tracking-wider text-brand-white group-hover:text-brand-blue transition-colors">
                  {item.title}
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-brand-white/70 font-light leading-relaxed">
                  {item.shortDescription}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-brand-white/5 flex items-center justify-between text-xs font-bold text-brand-blue group-hover:text-brand-white transition-colors">
                <span>EN SAVOIR PLUS</span>
                <ArrowRight size={14} className="transition-transform duration-200 group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 8. Grand CTA de Réservation Cours d'Essai */}
      <section className="py-16 sm:py-24 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl bg-gradient-to-br from-[#0c1626] via-[#101e35] to-[#070c16] border border-brand-blue/30 p-8 sm:p-14 text-center shadow-[0_0_50px_rgba(47,174,224,0.15)] overflow-hidden space-y-6">
          <div className="inline-flex items-center px-3.5 py-1.5 bg-brand-blue/10 border border-brand-blue/20 rounded-full text-brand-blue text-xs font-semibold uppercase tracking-widest">
            Première Séance • Dès 10 €
          </div>

          <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-black text-brand-white uppercase tracking-tight">
            PRÊT À TESTER LE FORMAT <span className="text-brand-blue">{format.title}</span> ?
          </h2>

          <p className="text-brand-white/70 font-light text-sm sm:text-base leading-relaxed max-w-xl mx-auto">
            Venez découvrir notre club au 268 avenue de la Capelette (13010 Marseille) et bénéficiez d&apos;une première séance d&apos;entraînement avec le coach Mahfoud.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => setIsTrialModalOpen(true)}
              className="w-full sm:w-auto px-8 py-4 bg-brand-blue text-brand-black font-heading font-bold text-xs sm:text-sm uppercase tracking-wider rounded-md hover:bg-brand-white transition-all shadow-lg shadow-brand-blue/30 cursor-pointer flex items-center justify-center gap-2"
            >
              RÉSERVER UN COURS D’ESSAI
              <ArrowRight size={16} />
            </button>
            <Link
              href="/tarifs"
              className="w-full sm:w-auto px-7 py-4 bg-brand-white/5 text-brand-white font-heading font-bold text-xs sm:text-sm uppercase tracking-wider rounded-md border border-brand-white/10 hover:bg-brand-white/10 transition-colors"
            >
              VOIR LES FORMULES & TARIFS
            </Link>
          </div>
        </div>
      </section>

      {/* Modale de Réservation de Cours d'Essai réutilisée */}
      <TrialBookingModal
        isOpen={isTrialModalOpen}
        onClose={() => setIsTrialModalOpen(false)}
        preselectedType={format.preselectedType}
      />
    </div>
  );
}
