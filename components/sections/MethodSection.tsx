"use client";

import { motion } from "framer-motion";

const methods = [
  {
    title: "BIOMÉCANIQUE & PRÉCISION",
    desc: "Inspirée des meilleures écoles de Kick-Boxing et de Muay Thaï mondiales, notre méthode repose sur une biomécanique parfaite. La puissance dévastatrice naît de la précision des appuis et du transfert de poids, pas seulement de la force brute."
  },
  {
    title: "CONDITIONNEMENT ÉLITE",
    desc: "Un striker n'est rien sans le cardio et l'explosivité. Nos circuits d'entraînement sont calqués sur les préparations physiques des combattants professionnels pour vous garantir une lucidité totale même sous une fatigue extrême."
  },
  {
    title: "FIGHT IQ & INTELLIGENCE DE COMBAT",
    desc: "Le striking est une partie d'échecs à haute vitesse. Nous vous apprenons à lire la garde de votre adversaire, à créer des ouvertures, à gérer la distance (footwork) et à anticiper les contres pour imposer votre rythme."
  },
  {
    title: "MENTALITÉ DE CHAMPION",
    desc: "La progression vient de la rigueur et de la discipline. Au Striking Camp, nous cultivons une culture du dépassement de soi. Chaque entraînement vous pousse à franchir un cap psychologique essentiel pour la compétition et le haut niveau."
  }
];

export default function MethodSection() {
  return (
    <section className="bg-[#0a1120] py-32 relative border-y border-[#1e2530]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-4xl mx-auto mb-20">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="font-heading text-4xl md:text-5xl font-black text-white uppercase tracking-widest mb-6"
          >
            LA MÉTHODE <span className="text-[#00d8ff]">STRIKING CAMP</span>
          </motion.h2>
          <motion.div 
            initial={{ opacity: 0, scaleX: 0 }}
            whileInView={{ opacity: 1, scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="w-24 h-1 bg-[#00d8ff] mx-auto mb-8"
          />
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-gray-300 font-light text-lg md:text-xl leading-relaxed"
          >
            Conçue par le meilleur coach individuel de Marseille et approuvée par les professionnels du circuit, notre méthodologie d'entraînement transforme votre approche du combat. Nous fusionnons la technique pure avec une préparation physique de pointe.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {methods.map((method, index) => (
            <motion.div
              key={method.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
              className="bg-[#1e2530] border border-gray-700/50 p-8 rounded-xl hover:border-[#00d8ff]/50 hover:shadow-[0_0_30px_rgba(0,216,255,0.1)] transition-all duration-500 group"
            >
              <h3 className="font-heading text-xl font-bold text-white uppercase tracking-wider mb-4 group-hover:text-[#00d8ff] transition-colors">
                {method.title}
              </h3>
              <p className="text-gray-400 font-light leading-relaxed">
                {method.desc}
              </p>
            </motion.div>
          ))}
        </div>
        
      </div>
    </section>
  );
}
