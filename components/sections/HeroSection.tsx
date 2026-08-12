"use client";

import { motion } from "framer-motion";
import { siteData } from "@/data/content";

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-brand-black pt-20">
      {/* Background Image Placeholder */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-t from-brand-black via-brand-black/80 to-transparent z-10" />
        <div className="absolute inset-0 bg-brand-black/40 z-10" />
        {/* Background Image */}
        <div 
          className="w-full h-full bg-cover bg-center bg-no-repeat grayscale opacity-50"
          style={{ backgroundImage: `url('/BGround.jpeg')` }}
        />
      </div>

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
          className="font-heading text-6xl md:text-8xl lg:text-9xl font-black text-brand-white uppercase leading-[0.85] tracking-tighter mb-6"
        >
          {siteData.hero.title}
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-br from-brand-white to-brand-white/40">{siteData.hero.title2}</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.6 }}
          className="max-w-2xl mx-auto text-lg md:text-xl text-brand-white/70 mb-10 font-light"
        >
          {siteData.hero.description}
        </motion.p>

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
