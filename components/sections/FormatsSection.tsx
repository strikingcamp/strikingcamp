"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { publicFormatList } from "@/data/formats";

export default function FormatsSection() {
  return (
    <section id="cours" className="bg-transparent py-16 sm:py-24 relative z-10 font-sans border-t border-brand-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* En-tête de section (Design System) */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-blue/10 border border-brand-blue/20 rounded-full text-brand-blue text-xs font-semibold uppercase tracking-widest mb-4">
            <Sparkles size={12} />
            <span>Formats d&apos;Entraînement</span>
          </div>
          <h2 className="font-heading text-4xl sm:text-5xl md:text-6xl font-black text-brand-white uppercase tracking-tight">
            NOS <span className="text-brand-blue">COURS</span>
          </h2>
          <p className="mt-4 text-brand-white/70 text-sm sm:text-base font-light max-w-2xl mx-auto leading-relaxed">
            Choisissez le format d’entraînement qui correspond à vos objectifs et à votre manière de progresser.
          </p>
        </div>

        {/* Grille des 3 cartes de formats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
          {publicFormatList.map((card, index) => (
            <motion.div
              key={card.slug}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.35, delay: index * 0.08 }}
              className="group relative overflow-hidden min-h-[380px] rounded-2xl flex flex-col justify-end p-6 sm:p-8 border border-brand-white/10 bg-[#0c1322] transition-all duration-300 hover:border-brand-blue/40 shadow-xl hover:shadow-brand-blue/5 hover:-translate-y-1"
            >
              {/* Image Next.js avec alt descriptif */}
              <div className="absolute inset-0 opacity-30 group-hover:opacity-50 transition-opacity duration-500 overflow-hidden">
                <Image
                  src={card.image}
                  alt={card.alt}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              </div>

              {/* Overlay Dégradé pour lisibilité parfaite */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#020817] via-[#020817]/85 to-[#020817]/30 opacity-95" />

              {/* Contenu textuel */}
              <div className="relative z-10 flex flex-col justify-end h-full">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-brand-blue/15 text-brand-blue border border-brand-blue/30">
                    {card.category}
                  </span>
                </div>

                <h3 className="font-heading text-2xl sm:text-3xl font-bold text-brand-white tracking-wider uppercase mb-2 group-hover:text-brand-blue transition-colors duration-300">
                  {card.title}
                </h3>

                <p className="text-brand-white/75 font-light text-xs sm:text-sm leading-relaxed mb-6">
                  {card.shortDescription}
                </p>

                <div className="pt-3 border-t border-brand-white/10 flex items-center justify-between gap-2 mt-auto">
                  <Link
                    href={`/cours/${card.slug}`}
                    aria-label={`En savoir plus sur le format ${card.title}`}
                    className="inline-flex items-center gap-1.5 text-xs font-heading font-bold text-brand-blue hover:text-brand-white uppercase tracking-wider transition-colors duration-200"
                  >
                    <span>EN SAVOIR PLUS</span>
                    <ArrowRight size={13} className="transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
                  </Link>

                  <Link
                    href="/tarifs"
                    aria-label={`Consulter les tarifs et formules pour ${card.title}`}
                    className="inline-flex items-center gap-1 text-[11px] font-heading font-medium text-brand-white/75 hover:text-brand-white uppercase tracking-wider transition-colors"
                  >
                    <span>Formules</span>
                    <ArrowRight size={11} aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
