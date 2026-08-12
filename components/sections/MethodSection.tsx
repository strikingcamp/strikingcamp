"use client";

import { motion } from "framer-motion";

const methods = [
  {
    title: "TECHNIQUE",
    desc: "Maîtriser les fondamentaux avant de rechercher la complexité."
  },
  {
    title: "INTENSITÉ",
    desc: "Apprendre à maintenir la qualité technique sous fatigue."
  },
  {
    title: "DISCIPLINE",
    desc: "La progression vient de la régularité."
  },
  {
    title: "ADAPTATION",
    desc: "Savoir lire et répondre à un adversaire."
  }
];

export default function MethodSection() {
  return (
    <section className="bg-brand-black py-32 relative border-y border-brand-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-3xl mx-auto mb-20">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="font-heading text-4xl md:text-5xl font-bold text-brand-white uppercase tracking-widest mb-6"
          >
            LA MÉTHODE <span className="text-brand-blue">STRIKING CAMP</span>
          </motion.h2>
          <motion.div 
            initial={{ opacity: 0, scaleX: 0 }}
            whileInView={{ opacity: 1, scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="w-24 h-1 bg-brand-blue mx-auto"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {methods.map((method, index) => (
            <motion.div
              key={method.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
              className="bg-brand-white/5 border border-brand-white/10 p-8 rounded-sm hover:bg-brand-white/10 transition-colors duration-500"
            >
              <h3 className="font-heading text-2xl font-bold text-brand-white uppercase tracking-wider mb-4">
                {method.title}
              </h3>
              <p className="text-brand-white/70 font-light leading-relaxed">
                {method.desc}
              </p>
            </motion.div>
          ))}
        </div>
        
      </div>
    </section>
  );
}
