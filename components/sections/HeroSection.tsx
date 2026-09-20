"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { siteData } from "@/data/content";
import TrialBookingModal from "@/components/modals/TrialBookingModal";

export default function HeroSection() {
  const [isTrialModalOpen, setIsTrialModalOpen] = useState(false);

  return (
    <section id="accueil" className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#020817] pt-20 pb-12 px-4">
      {/* Background Image with optimized darkening */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-top bg-no-repeat grayscale opacity-50"
        style={{ backgroundImage: `url('/BGround.jpeg')` }}
      />
      {/* Dark overlay ensuring high legibility while keeping fighters visible */}
      <div className="absolute inset-0 z-10 bg-gradient-to-b from-[#020817]/75 via-[#020817]/55 to-[#020817]/85 pointer-events-none" />

      <div className="relative z-20 max-w-4xl mx-auto w-full flex flex-col items-center text-center">
        {/* 1. LOGO & TITRE */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="flex flex-col items-center"
        >
          {/* SC Emblem Icon */}
          <div className="relative w-20 h-14 sm:w-28 sm:h-18 md:w-32 md:h-20 mb-1 sm:mb-2">
            <Image
              src="/logo-sc.png"
              alt="Striking Camp"
              fill
              priority
              sizes="(max-width: 640px) 80px, (max-width: 768px) 112px, 128px"
              className="object-contain"
            />
          </div>

          {/* Main Title: STRIKING CAMP */}
          <h1 className="font-heading text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-black uppercase leading-[0.88] tracking-tighter">
            <span className="text-brand-white">{siteData.hero.title}</span>{" "}
            <span className="text-brand-blue">{siteData.hero.title2}</span>
          </h1>
        </motion.div>

        {/* 2. SLOGAN : RELÈVE LE DÉFI (avec filets bleus) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
          className="flex items-center justify-center gap-3 sm:gap-4 mt-2 sm:mt-3 mb-1.5 sm:mb-2 w-full"
        >
          <div className="h-[2px] w-6 sm:w-12 md:w-20 bg-brand-blue rounded-full" />
          <h2 className="font-heading text-base sm:text-xl md:text-2xl font-black italic tracking-widest text-brand-white uppercase whitespace-nowrap">
            RELÈVE LE DÉFI
          </h2>
          <div className="h-[2px] w-6 sm:w-12 md:w-20 bg-brand-blue rounded-full" />
        </motion.div>

        {/* 3. PHRASE DESCRIPTIVE (non grasse, italique) */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="font-heading text-xs sm:text-sm md:text-base font-normal italic tracking-wide text-brand-white uppercase max-w-xl px-2 leading-tight"
        >
          VENEZ DÉCOUVRIR L’UNIVERS DES SPORTS DE COMBAT DEBOUT
        </motion.p>

        {/* 4. DISCIPLINES (non grasses, rapprochées, avec puces bleues) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="flex flex-wrap items-center justify-center gap-x-2 sm:gap-x-3 gap-y-1 font-heading text-xs sm:text-sm font-normal tracking-wider text-brand-white uppercase mt-1.5 sm:mt-2"
        >
          <span>BOXE</span>
          <span className="text-brand-blue text-[9px] sm:text-[11px]">•</span>
          <span>KICK BOXING</span>
          <span className="text-brand-blue text-[9px] sm:text-[11px]">•</span>
          <span>BOXE THAÏ</span>
          <span className="text-brand-blue text-[9px] sm:text-[11px]">•</span>
          <span>STRIKING</span>
          <span className="text-brand-blue text-[9px] sm:text-[11px]">•</span>
          <span>MMA</span>
        </motion.div>

        {/* 5. BOUTONS D'ACTION (largeur contrôlée sur mobile, proportionnée aux disciplines) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.55 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mt-7 sm:mt-9 w-full sm:w-auto"
        >
          <button
            type="button"
            onClick={() => setIsTrialModalOpen(true)}
            className="w-[290px] max-w-[calc(100vw-48px)] sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 bg-brand-blue text-brand-black font-heading font-bold text-xs sm:text-sm uppercase tracking-wider hover:bg-brand-white transition-colors duration-300 rounded-md text-center shadow-lg shadow-brand-blue/20 cursor-pointer"
          >
            RÉSERVER UN COURS D’ESSAI
          </button>
          <a
            href="/connexion"
            className="w-[290px] max-w-[calc(100vw-48px)] sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 bg-brand-black/30 border border-brand-white/80 hover:border-brand-white text-brand-white hover:bg-brand-white hover:text-brand-black font-heading font-bold text-xs sm:text-sm uppercase tracking-wider transition-colors duration-300 rounded-md text-center"
          >
            {siteData.hero.secondaryCta}
          </a>
        </motion.div>
      </div>

      {/* Modale de Réservation de Cours d'Essai */}
      <TrialBookingModal
        isOpen={isTrialModalOpen}
        onClose={() => setIsTrialModalOpen(false)}
      />
    </section>
  );
}
