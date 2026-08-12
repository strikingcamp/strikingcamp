"use client";

import { motion } from "framer-motion";
import { siteData } from "@/data/content";

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-brand-black pt-20">
      {/* Background Image */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-top bg-no-repeat grayscale opacity-60"
        style={{ backgroundImage: `url('/BGround.jpeg')` }}
      />
      {/* Light Uniform Overlay (No dark bottom gradient) */}
      <div className="absolute inset-0 z-10 bg-brand-black/20" />

      <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-6 flex space-x-4 text-xs font-bold tracking-[0.2em] text-brand-blue uppercase"
        >
          <span>Kickboxing</span>
          <span className="text-brand-white/30">•</span>
          <span>Muay Thai</span>
          <span className="text-brand-white/30">•</span>
          <span>Marseille</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
          className="font-heading text-5xl md:text-7xl lg:text-8xl font-black text-brand-white uppercase leading-[0.85] tracking-tighter mb-6"
        >
          {siteData.hero.title}{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-br from-brand-blue to-brand-blue/50">{siteData.hero.title2}</span>
        </motion.h1>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.6 }}
          className="max-w-2xl mx-auto mb-10"
        >
          <h3 className="text-2xl md:text-3xl font-bold text-brand-white mb-2 uppercase tracking-wide">
            RELEVE LE DEFI
          </h3>
          <p className="text-lg md:text-xl text-brand-white/70 font-light">
            Votre transformation commence ici
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="flex flex-col sm:flex-row gap-6 w-full sm:w-auto"
        >
          <a
            href="#le-club"
            className="px-8 py-4 bg-brand-blue text-brand-black font-bold uppercase tracking-wider hover:bg-brand-white transition-colors duration-300 rounded-sm text-center"
          >
            {siteData.hero.primaryCta}
          </a>
          <a
            href="#le-coach"
            className="px-8 py-4 border border-brand-white/20 text-brand-white font-bold uppercase tracking-wider hover:bg-brand-white hover:text-brand-black transition-colors duration-300 rounded-sm text-center"
          >
            {siteData.hero.secondaryCta}
          </a>
        </motion.div>
      </div>
    </section>
  );
}
