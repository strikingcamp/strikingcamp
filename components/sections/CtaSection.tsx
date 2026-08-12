"use client";

import { motion } from "framer-motion";

export default function CtaSection() {
  return (
    <section id="contact" className="bg-brand-blue py-32 relative overflow-hidden">
      {/* Abstract Background Element */}
      <div className="absolute inset-0 opacity-10 flex items-center justify-center pointer-events-none">
        <div className="w-[120%] h-[120%] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-brand-white via-transparent to-transparent blur-3xl transform rotate-12" />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        <motion.h2 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="font-heading text-5xl md:text-7xl font-black text-brand-black uppercase tracking-tighter mb-6"
        >
          PRÊT À ENTRER DANS LE CAMP ?
        </motion.h2>
        
        <motion.p 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-brand-black/80 font-medium text-xl md:text-2xl mb-12"
        >
          Découvre Striking Camp et viens t'entraîner dans un environnement dédié au striking et à la progression.
        </motion.p>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <a 
            href="/planning"
            className="inline-block px-12 py-5 bg-brand-black text-brand-white font-black text-lg md:text-xl uppercase tracking-widest hover:bg-brand-white hover:text-brand-black transition-colors duration-500 shadow-2xl"
          >
            REJOINDRE STRIKING CAMP
          </a>
        </motion.div>
      </div>
    </section>
  );
}
