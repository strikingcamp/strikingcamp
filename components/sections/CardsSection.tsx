"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";

const disciplines = [
  {
    title: "BOXE ANGLAISE",
    alt: "Cours de Boxe Anglaise à Marseille 13010 - Striking Camp",
    shortDescription: "La Boxe Anglaise : le noble art par excellence, axé sur la précision des poings, les esquives, la mobilité et la stratégie de combat.",
    fullDescription: "La Boxe Anglaise développe l'art de frapper sans être touché. L'entraînement au Striking Camp met l'accent sur le jeu de jambes, les esquives rotatives et axiales, la gestion de la distance, la vitesse de réaction et la précision des combinaisons. Chaque session combine apprentissage technique pas-à-pas, travail aux paos, sacs de frappe et drills guidés adaptés aux débutants comme aux confirmés.",
    image: "/boxe.webp"
  },
  {
    title: "KICK BOXING",
    alt: "Entraînement de Kick Boxing à Marseille - Striking Camp",
    shortDescription: "Notre programme de Kick Boxing intègre la fluidité des enchaînements pieds-poings, la puissance et le cardio.",
    fullDescription: "Notre programme de Kick Boxing intègre les techniques de poings et les coups de pied sous toutes leurs formes (low kicks, middle, high kicks). L’accent est mis sur la fluidité des enchaînements pieds-poings, la gestion du timing et le développement de la puissance explosive. Un travail complet permettant de forger à la fois la technique de combat et une condition physique athlétique.",
    image: "/kickboxing.jpg"
  },
  {
    title: "BOXE THAÏ (MUAY THAÏ)",
    alt: "Cours de Boxe Thaï et Muay Thaï à Marseille 10e - Striking Camp",
    shortDescription: "L'art des 8 membres : poings, pieds, coudes, genoux et travail du corps-à-corps (clinch).",
    fullDescription: "La Boxe Thaï, ou Muay Thaï, est une discipline ancestrale et complète utilisant les poings, les pieds, les coudes et les genoux. Les entraînements encadrés par le coach Mahfoud comprennent le travail technique aux paos thaï, le clinch (saisie et corps-à-corps), les balayages et le conditionnement physique spécifique, dans le respect et la sécurité de chacun.",
    image: "/muaythai.jpg"
  },
  {
    title: "STRIKING (MMA DEBOUT)",
    alt: "Cours de Striking MMA à Marseille - Striking Camp",
    shortDescription: "Développez votre jeu de percussion debout adapté au MMA : transitions frappes-lutte, coudes et genoux en clinch.",
    fullDescription: "Ce cours spécialisé s'adresse aux pratiquants souhaitant maîtriser le combat debout moderne et les spécificités du MMA. Nous travaillons les feintes, les trajectoires de frappe imprévisibles, les genoux et coudes au corps-à-corps, la défense active contre les amenées au sol (sprawls) et les transitions fluides entre la frappe et la cage.",
    image: "/striking.jpg"
  },
  {
    title: "LADY STRIKING (100% FEMMES)",
    alt: "Cours de Boxe et Striking 100% Femmes à Marseille - Lady Striking",
    shortDescription: "Cours exclusivement réservé aux femmes. Apprentissage technique, cardio intense et renforcement dans un cadre bienveillant.",
    fullDescription: "Le Lady Striking est un programme 100 % féminin accessible à toutes, sans aucun prérequis sportif. Conçu pour apprendre les techniques de frappe (boxe et pieds-poings) sans risque de coups violents, chaque cours associe apprentissage technique, défoulement au sac et renforcement musculaire complet. Une ambiance motivante, sécurisante et stimulante pour gagner en confiance, en tonicité et en énergie.",
    image: "/fille.jpg"
  },
  {
    title: "BOXING BAG",
    alt: "Séance de Boxing Bag frappe au sac à Marseille - Striking Camp",
    shortDescription: "Séance rythmée axée sur les combinaisons au sac de frappe, la dépense calorique et le perfectionnement de l'impact.",
    fullDescription: "Le cours de Boxing Bag se concentre sur les fondamentaux de la boxe et l'intensité du travail au sac lourd. Vous perfectionnez vos combinaisons, votre placement, votre souffle et votre puissance de frappe sans opposition directe. Idéal pour un défoulement total, brûler un maximum de calories et améliorer sa technique de frappe.",
    image: "/sacSalle.jpg"
  },
  {
    title: "KB SHRED (CONDITIONNEMENT)",
    alt: "Entraînement KB Shred Kettlebell et renforcement à Marseille - Striking Camp",
    shortDescription: "Conditionnement physique de haute intensité avec kettlebells et mouvements fonctionnels pour explosivité et endurance.",
    fullDescription: "KB Shred est notre programme de préparation physique basé sur l'utilisation des kettlebells et du poids du corps. Les séances combinent mouvements balistiques (swings, snatches), exercices de force fonctionnelle et intervalles cardio pour développer l'endurance musculaire, le gainage et l'explosivité indispensables aux sports de combat.",
    image: "/boxe.webp"
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
    <section id="disciplines" className="bg-transparent py-28 relative z-10 border-t border-brand-white/5 font-sans">
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
            className="w-24 h-1 bg-brand-blue mx-auto mb-4"
          />
          <p className="text-brand-white/70 text-base sm:text-lg font-light max-w-2xl mx-auto">
            Des programmes d’entraînement complets et progressifs, encadrés par le coach Mahfoud, adaptés aux débutants comme aux compétiteurs.
          </p>
        </div>

        {/* Grille des cartes de disciplines */}
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
                className="group relative overflow-hidden min-h-[320px] rounded-xl flex flex-col justify-end p-6 sm:p-8 border border-brand-white/10 bg-brand-white/5 transition-colors duration-300 hover:border-brand-blue/50"
              >
                {/* Image Next.js avec alt descriptif */}
                <div className="absolute inset-0 opacity-35 group-hover:opacity-55 transition-opacity duration-500 overflow-hidden">
                  <Image
                    src={card.image}
                    alt={card.alt}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                </div>
                
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
                    <span>{isExpanded ? "Lire moins" : "En savoir plus"}</span>
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
