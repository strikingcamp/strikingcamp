"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const disciplines = [
  {
    title: "BOXE ANGLAISE",
    category: "Pieds-Poings",
    alt: "Cours de Boxe Anglaise à Marseille 13010 - Striking Camp",
    shortDescription: "La Boxe Anglaise : le noble art par excellence, axé sur la précision des poings, les esquives, la mobilité et la stratégie de combat.",
    fullDescription: "La Boxe Anglaise développe l'art de frapper sans être touché. L'entraînement au Striking Camp met l'accent sur le jeu de jambes, les esquives rotatives et axiales, la gestion de la distance, la vitesse de réaction et la précision des combinaisons. Chaque session combine apprentissage technique pas-à-pas, travail aux paos, sacs de frappe et drills guidés adaptés aux débutants comme aux confirmés.",
    image: "/boxe.webp"
  },
  {
    title: "KICK BOXING",
    category: "Pieds-Poings",
    alt: "Entraînement de Kick Boxing à Marseille - Striking Camp",
    shortDescription: "Notre programme de Kick Boxing intègre la fluidité des enchaînements pieds-poings, la puissance et le cardio.",
    fullDescription: "Notre programme de Kick Boxing intègre les techniques de poings et les coups de pied sous toutes leurs formes (low kicks, middle, high kicks). L’accent est mis sur la fluidité des enchaînements pieds-poings, la gestion du timing et le développement de la puissance explosive. Un travail complet permettant de forger à la fois la technique de combat et une condition physique athlétique.",
    image: "/kickboxing.jpg"
  },
  {
    title: "BOXE THAÏ (MUAY THAÏ)",
    category: "Art des 8 membres",
    alt: "Cours de Boxe Thaï et Muay Thaï à Marseille 10e - Striking Camp",
    shortDescription: "L'art des 8 membres : poings, pieds, coudes, genoux et travail du corps-à-corps (clinch).",
    fullDescription: "La Boxe Thaï, ou Muay Thaï, est une discipline ancestrale et complète utilisant les poings, les pieds, les coudes et les genoux. Les entraînements encadrés par le coach Mahfoud comprennent le travail technique aux paos thaï, le clinch (saisie et corps-à-corps), les balayages et le conditionnement physique spécifique, dans le respect et la sécurité de chacun.",
    image: "/muaythai.jpg"
  },
  {
    title: "STRIKING (MMA DEBOUT)",
    category: "Combat Debout",
    alt: "Cours de Striking MMA à Marseille - Striking Camp",
    shortDescription: "Développez votre jeu de percussion debout adapté au MMA : transitions frappes-lutte, coudes et genoux en clinch.",
    fullDescription: "Ce cours spécialisé s'adresse aux pratiquants souhaitant maîtriser le combat debout moderne et les spécificités du MMA. Nous travaillons les feintes, les trajectoires de frappe imprévisibles, les genoux et coudes au corps-à-corps, la défense active contre les amenées au sol (sprawls) et les transitions fluides entre la frappe et la cage.",
    image: "/striking.jpg"
  },
  {
    title: "LADY STRIKING (100% FEMMES)",
    category: "100% Féminin",
    alt: "Cours de Boxe et Striking 100% Femmes à Marseille - Lady Striking",
    shortDescription: "Cours exclusivement réservé aux femmes. Apprentissage technique, cardio intense et renforcement dans un cadre bienveillant.",
    fullDescription: "Le Lady Striking est un programme 100 % féminin accessible à toutes, sans aucun prérequis sportif. Conçu pour apprendre les techniques de frappe (boxe et pieds-poings) sans risque de coups violents, chaque cours associe apprentissage technique, défoulement au sac et renforcement musculaire complet. Une ambiance motivante, sécurisante et stimulante pour gagner en confiance, en tonicité et en énergie.",
    image: "/fille.jpg"
  },
  {
    title: "BOXING BAG",
    category: "Frappe au sac",
    alt: "Séance de Boxing Bag frappe au sac à Marseille - Striking Camp",
    shortDescription: "Séance rythmée axée sur les combinaisons au sac de frappe, la dépense calorique et le perfectionnement de l'impact.",
    fullDescription: "Le cours de Boxing Bag se concentre sur les fondamentaux de la boxe et l'intensité du travail au sac lourd. Vous perfectionnez vos combinaisons, votre placement, votre souffle et votre puissance de frappe sans opposition directe. Idéal pour un défoulement total, brûler un maximum de calories et améliorer sa technique de frappe.",
    image: "/sacSalle.jpg"
  },
  {
    title: "KB SHRED (CONDITIONNEMENT)",
    category: "Renforcement",
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
    <section id="disciplines" className="bg-transparent py-20 sm:py-28 relative z-10 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* En-tête de section (Design System) */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-brand-blue/10 border border-brand-blue/20 rounded-full text-brand-blue text-xs font-semibold uppercase tracking-widest mb-4">
            <Sparkles size={14} />
            Entraînements & Pratique
          </div>
          <h2 className="font-heading text-4xl sm:text-5xl md:text-6xl font-black text-brand-white uppercase tracking-tight">
            NOS <span className="text-brand-blue">DISCIPLINES</span>
          </h2>
          <p className="mt-4 text-brand-white/70 text-sm sm:text-base font-light max-w-2xl mx-auto leading-relaxed">
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
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.35, delay: index * 0.05 }}
                className="group relative overflow-hidden min-h-[340px] rounded-2xl flex flex-col justify-end p-6 sm:p-8 border border-brand-white/10 bg-[#0c1322] transition-all duration-300 hover:border-brand-blue/40 shadow-xl hover:shadow-brand-blue/5 hover:-translate-y-1"
              >
                {/* Image Next.js avec alt descriptif */}
                <div className="absolute inset-0 opacity-30 group-hover:opacity-50 transition-opacity duration-500 overflow-hidden">
                  <Image
                    src={card.image}
                    alt={card.alt}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                </div>
                
                {/* Overlay Dégradé pour lisibilité parfaite */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#020817] via-[#020817]/85 to-[#020817]/30 opacity-95" />
                
                {/* Contenu textuel */}
                <div className="relative z-10">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-brand-blue/15 text-brand-blue border border-brand-blue/30">
                      {card.category}
                    </span>
                  </div>

                  <h3 className="font-heading text-2xl sm:text-3xl font-bold text-brand-white tracking-wider uppercase mb-3 group-hover:text-brand-blue transition-colors duration-300">
                    {card.title}
                  </h3>
                  
                  <motion.div layout className="overflow-hidden">
                    <p className="text-brand-white/80 font-light text-xs sm:text-sm leading-relaxed">
                      {isExpanded ? card.fullDescription : card.shortDescription}
                    </p>
                  </motion.div>

                  <div className="mt-4 pt-3 border-t border-brand-white/5 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => toggleExpand(card.title)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-brand-blue hover:text-brand-white uppercase tracking-wider transition-colors duration-200 cursor-pointer focus:outline-none"
                      aria-expanded={isExpanded}
                    >
                      <span>{isExpanded ? "Lire moins" : "En savoir plus"}</span>
                      {isExpanded ? (
                        <ChevronUp size={14} className="transition-transform duration-200" />
                      ) : (
                        <ChevronDown size={14} className="transition-transform duration-200" />
                      )}
                    </button>

                    <Link
                      href="/planning"
                      className="inline-flex items-center gap-1 text-[11px] font-heading font-bold text-brand-white/60 hover:text-brand-white uppercase tracking-wider transition-colors"
                    >
                      Voir créneaux
                      <ArrowRight size={11} />
                    </Link>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
