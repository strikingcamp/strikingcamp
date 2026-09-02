"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Sparkles, ArrowRight, ShieldCheck, Target, HeartHandshake } from "lucide-react";

const pillars = [
  {
    title: "L'INTENSITÉ COMME MOTEUR",
    desc: "Nous croyons que la véritable croissance se trouve hors de la zone de confort. Nos entraînements sont conçus pour vous pousser à votre maximum, forgeant non seulement un corps plus fort mais aussi un mental d'acier.",
    image: "/kickboxing.jpg",
    icon: Target
  },
  {
    title: "LA TECHNIQUE COMME FONDATION",
    desc: "La puissance sans la maîtrise est vaine. Chaque coup, chaque mouvement est enseigné avec une attention méticuleuse au détail. Nous construisons des combattants intelligents, pas seulement des cogneurs.",
    image: "/muaythai.jpg",
    icon: ShieldCheck
  },
  {
    title: "LE RESPECT COMME CODE",
    desc: "L'ego reste à la porte. Striking Camp est une communauté soudée par la passion et l'entraide. Nous nous élevons ensemble, dans le respect de nos partenaires, de nos coachs et de l'art que nous pratiquons.",
    image: "/striking.jpg",
    icon: HeartHandshake
  }
];

export default function ClubSection() {
  return (
    <section id="le-club" className="bg-transparent py-12 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto font-sans">
      
      <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-start">
        
        {/* Colonne gauche (Sticky Header + Image d'ambiance) */}
        <div className="w-full lg:w-1/3 lg:sticky lg:top-28 space-y-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-brand-blue/10 border border-brand-blue/20 rounded-full text-brand-blue text-xs font-semibold uppercase tracking-widest mb-4">
              <Sparkles size={14} />
              Le Club
            </div>
            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="font-heading text-4xl sm:text-5xl font-black text-brand-white uppercase tracking-tight mb-4"
            >
              LE CLUB <span className="text-brand-blue">STRIKING CAMP</span>
            </motion.h1>
            <p className="text-brand-white/70 text-sm leading-relaxed font-light">
              Notre club, notre méthode et notre philosophie d’entraînement au cœur du 10e arrondissement de Marseille.
            </p>
          </div>

          {/* Photo Salle Principale / Sacs */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="relative h-72 rounded-2xl overflow-hidden border border-brand-white/10 group shadow-2xl hidden lg:block bg-[#0c1322]"
          >
            <Image
              src="/sacSalle.jpg"
              alt="Salle de Boxe et Striking Camp à Marseille 13010"
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              sizes="(max-width: 1024px) 100vw, 33vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#020817] via-[#020817]/40 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-brand-blue bg-brand-blue/15 px-2 py-0.5 rounded-full border border-brand-blue/30 inline-block mb-1">
                Salle d&apos;entraînement
              </span>
              <p className="text-xs text-brand-white font-medium">
                268 avenue de la Capelette, 13010 Marseille
              </p>
            </div>
          </motion.div>
        </div>

        {/* Colonne droite (Contenu & Sections) */}
        <div className="w-full lg:w-2/3 space-y-12">
          
          {/* 1. BIENVENUE AU STRIKING CAMP */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bg-[#0c1322] border border-brand-white/10 rounded-2xl p-6 sm:p-8 shadow-xl space-y-4"
          >
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-brand-white uppercase tracking-wider pb-3 border-b border-brand-white/5">
              BIENVENUE AU <span className="text-brand-blue">STRIKING CAMP</span>
            </h2>
            
            {/* Image mobile de la salle */}
            <div className="relative h-52 rounded-xl overflow-hidden border border-brand-white/10 mb-4 lg:hidden">
              <Image
                src="/sacSalle.jpg"
                alt="Salle de Boxe Striking Camp Marseille"
                fill
                className="object-cover"
                sizes="100vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#020817] via-transparent to-transparent" />
            </div>

            <div className="space-y-4 text-brand-white/80 font-light text-sm sm:text-base leading-relaxed">
              <p>
                <strong className="text-brand-white font-medium">Striking Camp</strong> est un camp d’entraînement nouvelle génération dédié aux sports de percussion (striking), situé au <strong className="text-brand-white font-medium">268 avenue de la Capelette dans le 10e arrondissement de Marseille</strong>.
              </p>
              <p>
                Notre mission est d’accompagner chaque personne dans sa progression, qu’elle souhaite découvrir l’univers des sports de combat, améliorer sa condition physique ou développer ses compétences techniques.
              </p>
              <p>
                Nous accueillons aussi bien les débutants que les pratiquants confirmés et les combattants qui souhaitent continuer à progresser.
              </p>
              <p>
                Notre approche repose sur trois piliers fondamentaux : <strong className="text-brand-blue font-medium">la technique</strong>, <strong className="text-brand-blue font-medium">la progression</strong> et <strong className="text-brand-blue font-medium">la régularité</strong>. Chaque entraînement est pensé pour permettre à chacun de travailler à son rythme dans un cadre structuré, exigeant et bienveillant.
              </p>
            </div>
          </motion.div>

          {/* SECTION COACH & EXPERTISE */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bg-[#0c1322] border border-brand-white/10 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6"
          >
            <div>
              <span className="text-xs font-heading font-bold uppercase tracking-widest text-brand-blue">
                Direction technique & pédagogie
              </span>
              <h2 className="font-heading text-2xl sm:text-3xl font-bold text-brand-white uppercase tracking-wider mt-1">
                MAHFOUD MOHAMED — <span className="text-brand-blue">COACH & FONDATEUR</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="space-y-3.5 text-brand-white/80 font-light text-xs sm:text-sm leading-relaxed">
                <p>
                  Originaire de Marseille, Mahfoud Mohamed pratique les sports de combat depuis l’âge de 6 ans.
                </p>
                <p>
                  Son parcours a débuté par le Karaté traditionnel (kata), avant d’explorer l’Aïkido et le Jiu-Jitsu japonais pendant deux ans. À partir de ses 18 ans, il s’est entièrement consacré au Kick Boxing et à la Boxe Thaï (Muay Thaï).
                </p>
                <p>
                  Au fil des années, il a forgé une méthode d’enseignement moderne et accessible : privilégier l’apprentissage technique fin, la motricité, la sécurité et le dépassement de soi, pour amener chaque élève au sommet de son potentiel.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="relative h-48 rounded-xl overflow-hidden border border-brand-white/10 shadow-md">
                  <Image
                    src="/coach-parcours.jpg"
                    alt="Coach Mahfoud Mohamed en entraînement au Striking Camp Marseille"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#020817] via-transparent to-transparent" />
                  <span className="absolute bottom-2 left-2 text-[10px] font-heading font-bold text-brand-white uppercase bg-[#020817]/70 px-1.5 py-0.5 rounded">
                    Expérience & Rigueur
                  </span>
                </div>
                <div className="relative h-48 rounded-xl overflow-hidden border border-brand-white/10 shadow-md">
                  <Image
                    src="/coach-vision.jpg"
                    alt="Vision technique et pédagogique de Mahfoud Mohamed"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#020817] via-transparent to-transparent" />
                  <span className="absolute bottom-2 left-2 text-[10px] font-heading font-bold text-brand-white uppercase bg-[#020817]/70 px-1.5 py-0.5 rounded">
                    Méthode & Précision
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ACCOMPAGNEMENT & LADY STRIKING (Cartes Grid) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Accompagnement adapté */}
            <div className="bg-[#0c1322] border border-brand-white/10 rounded-2xl p-6 shadow-xl space-y-4 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-heading font-bold uppercase tracking-widest text-brand-blue bg-brand-blue/10 px-2 py-0.5 rounded-full border border-brand-blue/20">
                  Tous Niveaux
                </span>
                <h3 className="font-heading text-xl font-bold text-brand-white uppercase tracking-wider mt-2 mb-2">
                  UN ACCOMPAGNEMENT ADAPTÉ
                </h3>
                <p className="text-xs sm:text-sm text-brand-white/75 font-light leading-relaxed">
                  Que vous soyez débutant sans condition préalable, pratiquant confirmé ou combattant, les entraînements sont construits autour de vos objectifs : technique, motricité et sécurité.
                </p>
              </div>
              <div className="relative h-40 rounded-xl overflow-hidden border border-brand-white/10">
                <Image
                  src="/striking.jpg"
                  alt="Accompagnement technique personnalisé Striking Camp Marseille"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              </div>
            </div>

            {/* Lady Striking */}
            <div className="bg-[#0c1322] border border-brand-white/10 rounded-2xl p-6 shadow-xl space-y-4 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-heading font-bold uppercase tracking-widest text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded-full border border-pink-500/20">
                  Section 100% Féminine
                </span>
                <h3 className="font-heading text-xl font-bold text-brand-white uppercase tracking-wider mt-2 mb-2">
                  LADY STRIKING (FEMMES)
                </h3>
                <p className="text-xs sm:text-sm text-brand-white/75 font-light leading-relaxed">
                  Un cadre bienveillant et stimulant pour apprendre la boxe et le striking, se défouler au sac et renforcer sa silhouette sans opposition brutale.
                </p>
              </div>
              <div className="relative h-40 rounded-xl overflow-hidden border border-brand-white/10">
                <Image
                  src="/fille.jpg"
                  alt="Cours de boxe et Lady Striking 100% Femmes à Marseille 13010"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              </div>
            </div>

          </div>

          {/* Citation mise en valeur (Featured Box) */}
          <div className="p-6 sm:p-8 bg-gradient-to-r from-[#0c1626] to-[#070c16] border border-brand-blue/30 rounded-2xl shadow-[0_0_30px_rgba(47,174,224,0.1)]">
            <p className="text-brand-white text-base sm:text-lg font-medium italic leading-relaxed text-center">
              « Ici, chacun vient avec son objectif. Nous vous aidons à construire votre progression. »
            </p>
          </div>

          {/* 3 PILIERS */}
          <div className="space-y-6 pt-4">
            <div>
              <h2 className="font-heading text-2xl sm:text-3xl font-bold text-brand-white uppercase tracking-wider">
                NOTRE PHILOSOPHIE <span className="text-brand-blue">D&apos;ENTRAÎNEMENT</span>
              </h2>
              <p className="text-brand-white/70 font-light text-xs sm:text-sm mt-1">
                Plus qu&apos;une séance, une expérience transformative.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {pillars.map((pillar, index) => {
                const Icon = pillar.icon;
                return (
                  <motion.div
                    key={pillar.title}
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className="bg-[#0c1322] border border-brand-white/10 rounded-2xl overflow-hidden hover:border-brand-blue/40 transition-all duration-300 group flex flex-col justify-between shadow-xl hover:-translate-y-0.5"
                  >
                    <div className="relative h-36 w-full overflow-hidden">
                      <Image
                        src={pillar.image}
                        alt={pillar.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0c1322] via-[#0c1322]/40 to-transparent" />
                    </div>
                    
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-2">
                      <div className="flex items-center gap-2 mb-1">
                        <Icon size={16} className="text-brand-blue shrink-0" />
                        <h3 className="font-heading text-base font-bold text-brand-white uppercase tracking-wider group-hover:text-brand-blue transition-colors">
                          {pillar.title}
                        </h3>
                      </div>
                      <p className="text-brand-white/70 font-light leading-relaxed text-xs">
                        {pillar.desc}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Bottom Action */}
          <div className="pt-4 text-center sm:text-left">
            <Link 
              href="/planning"
              className="inline-flex items-center gap-2 px-8 py-4 bg-brand-blue text-brand-black font-heading font-bold text-xs sm:text-sm uppercase tracking-wider hover:bg-brand-white transition-all duration-300 rounded-sm shadow-lg shadow-brand-blue/20"
            >
              DÉCOUVRIR LES COURS & LE PLANNING
              <ArrowRight size={15} />
            </Link>
          </div>

        </div>

      </div>

    </section>
  );
}
