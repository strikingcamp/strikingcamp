"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";

export default function CtaSection() {
  return (
    <section id="contact" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto font-sans relative">
      <div className="relative rounded-3xl bg-gradient-to-br from-[#0c1626] via-[#101e35] to-[#070c16] border border-brand-blue/30 p-8 sm:p-14 lg:p-16 text-center shadow-[0_0_50px_rgba(47,174,224,0.15)] overflow-hidden">
        
        {/* Ambient Radial Glow */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-brand-blue/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-brand-blue/10 border border-brand-blue/20 rounded-full text-brand-blue text-xs font-semibold uppercase tracking-widest">
            <Sparkles size={14} />
            Rejoignez le Camp
          </div>

          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="font-heading text-4xl sm:text-5xl md:text-6xl font-black text-brand-white uppercase tracking-tight"
          >
            PRÊT À RELEVER <span className="text-brand-blue">LE DÉFI ?</span>
          </motion.h2>
          
          <motion.p 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="text-brand-white/70 font-light text-base sm:text-lg leading-relaxed max-w-xl mx-auto"
          >
            Découvrez le Striking Camp et venez vous entraîner dans un environnement d&apos;excellence dédié aux sports de percussion et au dépassement de soi.
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Link 
              href="/connexion"
              className="inline-flex items-center gap-2 px-8 py-4 bg-brand-blue text-brand-black font-heading font-bold text-sm uppercase tracking-wider rounded-sm hover:bg-brand-white transition-all shadow-lg shadow-brand-blue/30"
            >
              REJOINDRE LE CAMP
              <ArrowRight size={16} />
            </Link>
            <Link 
              href="/tarifs"
              className="inline-flex items-center gap-2 px-6 py-4 bg-brand-white/5 text-brand-white font-heading font-bold text-sm uppercase tracking-wider rounded-sm border border-brand-white/10 hover:bg-brand-white/10 transition-colors"
            >
              DÉCOUVRIR LES FORMULES
            </Link>
          </motion.div>
        </div>

      </div>
    </section>
  );
}
