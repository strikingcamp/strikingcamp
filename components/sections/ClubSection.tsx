"use client";

import { motion } from "framer-motion";

const items = [
  { num: "01", title: "TECHNIQUE", desc: "La précision avant la puissance. Les fondamentaux sont la clé de la progression." },
  { num: "02", title: "CONDITIONNEMENT", desc: "Un corps préparé pour l'impact et l'endurance. Repousser ses limites." },
  { num: "03", title: "COMBAT", desc: "L'épreuve de vérité. Mettre en application face à une opposition réelle." },
  { num: "04", title: "PROGRESSION", desc: "Une évolution constante encadrée par une méthode éprouvée au haut niveau." }
];

export default function ClubSection() {
  return (
    <section id="le-club" className="bg-brand-black py-32 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-16 lg:gap-24 items-start">
          
          <div className="w-full lg:w-1/3 lg:sticky lg:top-32">
            <motion.h2 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8 }}
              className="font-heading text-5xl md:text-7xl font-bold text-brand-white uppercase tracking-tighter mb-8"
            >
              LE CLUB
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-brand-white/70 font-light text-lg mb-8"
            >
              Striking Camp n'est pas une simple salle de sport. C'est un lieu dédié au développement du combattant. L'exigence et la répétition y forgent la technique.
            </motion.p>
          </div>

          <div className="w-full lg:w-2/3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-16">
              {items.map((item, index) => (
                <motion.div
                  key={item.num}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.6, delay: index * 0.15 }}
                  className="flex flex-col"
                >
                  <div className="text-brand-blue font-heading font-black text-6xl mb-4 opacity-50">
                    {item.num}
                  </div>
                  <h4 className="text-xl font-bold text-brand-white uppercase tracking-wider mb-3">
                    <span className="text-brand-white/40 mr-2">—</span>
                    {item.title}
                  </h4>
                  <p className="text-brand-white/60 font-light">
                    {item.desc}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
          
        </div>
      </div>
    </section>
  );
}
