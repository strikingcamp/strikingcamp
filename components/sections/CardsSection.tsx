"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";

const disciplines = [
  {
    title: "BOXING BAG",
    shortDescription: "Le cours de Boxing Bag se concentre sur les fondamentaux de la boxe anglaise et les techniques avancées.",
    fullDescription: "Le cours de Boxing Bag se concentre sur les fondamentaux de la boxe anglaise et les techniques avancées. Vous apprendrez à perfectionner votre jeu de jambes, vos esquives, votre head movement et vos combinaisons de coups. Chaque séance inclut du travail au sac, avec le coach et du sparring à thème pour une mise en application contrôlée.",
    image: "/sacSalle.jpg"
  },
  {
    title: "KICK BOXING",
    shortDescription: "Notre programme de Kick Boxing intègre les techniques de poings et les coups de pied.",
    fullDescription: "Notre programme de Kick Boxing intègre les techniques de poings et les coups de pied. L’accent est mis sur la fluidité des enchaînements pieds-poings, la gestion de la distance et le développement de la puissance explosive. Un travail complet permettant de développer à la fois la technique et la condition physique.",
    image: "/kickboxing.jpg"
  },
  {
    title: "STRIKING",
    shortDescription: "Ce cours est destiné aux pratiquants souhaitant développer leur jeu debout, notamment dans le contexte du MMA.",
    fullDescription: "Ce cours est destiné aux pratiquants souhaitant développer leur jeu debout, notamment dans le contexte du MMA. Nous travaillons les techniques de frappe, les coudes et les genoux en clinch, la défense contre les amenées au sol et les transitions entre la frappe et la lutte.",
    image: "/striking.jpg"
  },
  {
    title: "BOXE THAÏ",
    shortDescription: "La Boxe Thaï, ou Muay Thai, utilise les poings, les pieds, les coudes et les genoux.",
    fullDescription: "La Boxe Thaï, ou Muay Thai, utilise les poings, les pieds, les coudes et les genoux. Les cours comprennent le travail technique, le clinch, les projections et le conditionnement physique spécifique à la discipline.",
    image: "/muaythai.jpg"
  },
  {
    title: "KB SHRED",
    shortDescription: "KB Shred est notre cours de conditionnement physique basé notamment sur le travail avec kettlebells.",
    fullDescription: "KB Shred est notre cours de conditionnement physique basé notamment sur le travail avec kettlebells. Les séances combinent mouvements balistiques, exercices de force et travail cardio afin de développer la condition physique, la force fonctionnelle et l’explosivité.",
    image: "/boxe.webp"
  },
  {
    title: "LADY STRIKING",
    shortDescription: "Le Lady Striking est un cours 100 % féminin destiné à tous les niveaux.",
    fullDescription: "Le Lady Striking est un cours 100 % féminin destiné à tous les niveaux. Les séances combinent technique, cardio et renforcement musculaire dans un cadre bienveillant et motivant.",
    image: "/fille.jpg"
  }
];

export default function CardsSection() {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleExpand = (title: string) => {
    setExpanded((prev) => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  return (
    <section id="disciplines" className="bg-brand-black py-28 relative z-10 border-t border-brand-white/5 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* En-tête de section */}
        <div className="text-center max-w-4xl mx-auto mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="font-heading text-4xl md:text-5xl font-black text-brand-white uppercase tracking-widest mb-6"
          >
            NOS <span className="text-brand-blue">DISCIPLINES</span>
          </motion.h2>
          <motion.div 
            initial={{ opacity: 0, scaleX: 0 }}
            whileInView={{ opacity: 1, scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="w-24 h-1 bg-brand-blue mx-auto"
          />
        </div>

        {/* Grille des 6 cartes de disciplines */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
          {disciplines.map((card, index) => {
            const isExpanded = !!expanded[card.title];

            return (
              <motion.div
                key={card.title}
                layout
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                className="group relative overflow-hidden min-h-[300px] rounded-xl flex flex-col justify-end p-6 sm:p-8 border border-brand-white/10 bg-brand-white/5 transition-colors duration-300 hover:border-brand-blue/50"
              >
                {/* Image de fond */}
                <div 
                  className="absolute inset-0 opacity-35 group-hover:opacity-55 transition-opacity duration-500 bg-cover bg-center"
                  style={{ backgroundImage: `url(${card.image})` }}
                />
                
                {/* Overlay Dégradé pour lisibilité parfaite */}
                <div className="absolute inset-0 bg-gradient-to-t from-brand-black via-brand-black/90 to-brand-black/40 opacity-95" />
                
                {/* Contenu textuel */}
                <div className="relative z-10">
                  <h3 className="font-heading text-2xl sm:text-3xl font-bold text-brand-white tracking-wider uppercase mb-3 group-hover:text-brand-blue transition-colors duration-300">
                    {card.title}
                  </h3>
                  
                  <motion.div layout className="overflow-hidden">
                    <p className="text-brand-white/80 font-light text-sm sm:text-base leading-relaxed">
                      {isExpanded ? card.fullDescription : card.shortDescription}
                    </p>
                  </motion.div>

                  <button
                    type="button"
                    onClick={() => toggleExpand(card.title)}
                    className="mt-4 inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-brand-blue hover:text-brand-white uppercase tracking-wider transition-colors duration-200 cursor-pointer focus:outline-none"
                    aria-expanded={isExpanded}
                  >
                    <span>{isExpanded ? "Lire moins" : "Lire plus"}</span>
                    {isExpanded ? (
                      <ChevronUp size={16} className="transition-transform duration-200" />
                    ) : (
                      <ChevronDown size={16} className="transition-transform duration-200" />
                    )}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
