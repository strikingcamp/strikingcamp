"use client";

import { motion } from "framer-motion";

const philosophies = [
  {
    title: "L'INTENSITÉ COMME MOTEUR",
    desc: "Nous croyons que la véritable croissance se trouve hors de la zone de confort. Nos entraînements sont conçus pour vous pousser à votre maximum, forgeant non seulement un corps plus fort mais aussi un mental d'acier."
  },
  {
    title: "LA TECHNIQUE COMME FONDATION",
    desc: "La puissance sans la maîtrise est vaine. Chaque coup, chaque mouvement est enseigné avec une attention méticuleuse au détail. Nous construisons des combattants intelligents, pas seulement des cogneurs."
  },
  {
    title: "LE RESPECT COMME CODE",
    desc: "L'ego reste à la porte. Striking Camp est une communauté soudée par la passion et l'entraide. Nous nous élevons ensemble, dans le respect de nos partenaires, de nos coachs et de l'art que nous pratiquons."
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
            NOTRE PHILOSOPHIE <span className="text-[#00d8ff]">D&apos;ENTRAÎNEMENT</span>
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
            Plus qu&apos;une séance, une expérience transformative.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {philosophies.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
              className="bg-[#1e2530] border border-gray-700/50 p-8 rounded-xl hover:border-[#00d8ff]/50 hover:shadow-[0_0_30px_rgba(0,216,255,0.1)] transition-all duration-500 group"
            >
              <h3 className="font-heading text-xl font-bold text-white uppercase tracking-wider mb-4 group-hover:text-[#00d8ff] transition-colors">
                {item.title}
              </h3>
              <p className="text-gray-400 font-light leading-relaxed">
                {item.desc}
              </p>
            </motion.div>
          ))}
        </div>
        
      </div>
    </section>
  );
}
