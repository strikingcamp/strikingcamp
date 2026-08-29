"use client";

import { motion } from "framer-motion";
import Image from "next/image";

const pillars = [
  {
    title: "L'INTENSITÉ COMME MOTEUR",
    desc: "Nous croyons que la véritable croissance se trouve hors de la zone de confort. Nos entraînements sont conçus pour vous pousser à votre maximum, forgeant non seulement un corps plus fort mais aussi un mental d'acier.",
    image: "/kickboxing.jpg"
  },
  {
    title: "LA TECHNIQUE COMME FONDATION",
    desc: "La puissance sans la maîtrise est vaine. Chaque coup, chaque mouvement est enseigné avec une attention méticuleuse au détail. Nous construisons des combattants intelligents, pas seulement des cogneurs.",
    image: "/muaythai.jpg"
  },
  {
    title: "LE RESPECT COMME CODE",
    desc: "L'ego reste à la porte. Striking Camp est une communauté soudée par la passion et l'entraide. Nous nous élevons ensemble, dans le respect de nos partenaires, de nos coachs et de l'art que nous pratiquons.",
    image: "/striking.jpg"
  }
];

export default function ClubSection() {
  return (
    <section id="le-club" className="bg-transparent pt-8 pb-24 relative overflow-hidden min-h-[calc(100vh-80px)] font-sans">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* En-tête de section */}
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-start">
          
          {/* Colonne gauche (Sticky Header + Image d'ambiance) */}
          <div className="w-full lg:w-1/3 lg:sticky lg:top-32 pt-4 lg:pt-12 space-y-8">
            <div>
              <motion.h2 
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8 }}
                className="font-heading text-5xl md:text-7xl font-bold text-brand-white uppercase tracking-tighter mb-4"
              >
                LE CLUB
              </motion.h2>
              <div className="w-20 h-1 bg-brand-blue mb-6" />
              <p className="text-brand-white/60 text-sm leading-relaxed">
                Un environnement dédié à l’exigence, au dépassement de soi et à l’apprentissage des sports de percussion.
              </p>
            </div>

            {/* Photo Salle Principale / Sacs */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="relative h-72 rounded-2xl overflow-hidden border border-brand-white/10 group shadow-2xl hidden lg:block"
            >
              <Image
                src="/sacSalle.jpg"
                alt="Salle d'entraînement Striking Camp"
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                sizes="(max-width: 1024px) 100vw, 33vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-black via-brand-black/40 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <span className="text-[11px] font-heading font-bold uppercase tracking-wider text-brand-blue">
                  Salle d&apos;entraînement
                </span>
                <p className="text-xs text-brand-white/80 font-medium mt-0.5">
                  Équipements professionnels & sacs de frappe
                </p>
              </div>
            </motion.div>
          </div>

          {/* Colonne droite (Contenu & Photos immersives) */}
          <div className="w-full lg:w-2/3 pt-4 lg:pt-12">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
              className="space-y-12"
            >
              {/* 1. BIENVENUE AU STRIKING CAMP */}
              <div>
                <h3 className="font-heading text-3xl md:text-4xl font-bold text-brand-blue uppercase tracking-wide mb-6">
                  BIENVENUE AU STRIKING CAMP
                </h3>
                
                {/* Image mobile de la salle */}
                <div className="relative h-56 rounded-xl overflow-hidden border border-brand-white/10 mb-6 lg:hidden">
                  <Image
                    src="/sacSalle.jpg"
                    alt="Salle Striking Camp"
                    fill
                    className="object-cover"
                    sizes="100vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-black via-transparent to-transparent" />
                </div>

                <div className="space-y-4 text-brand-white/80 font-light text-lg leading-relaxed">
                  <p>
                    <strong>Striking Camp</strong> est un camp d’entraînement nouvelle génération dédié aux sports de percussion (striking).
                  </p>
                  <p>
                    Notre mission est d’accompagner chaque personne dans sa progression, qu’elle souhaite découvrir l’univers des sports de combat, améliorer sa condition physique ou développer ses compétences techniques.
                  </p>
                  <p>
                    Nous accueillons aussi bien les débutants que les pratiquants confirmés et les combattants qui souhaitent continuer à progresser.
                  </p>
                  <p>
                    Notre approche repose sur trois éléments essentiels : <strong>la technique</strong>, <strong>la progression</strong> et <strong>la régularité</strong>. Chaque entraînement est pensé pour permettre à chacun de travailler à son niveau, dans un cadre structuré, exigeant et bienveillant.
                  </p>
                </div>
              </div>

              {/* UN ACCOMPAGNEMENT ADAPTÉ À CHACUN */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div>
                  <h4 className="font-heading text-2xl font-bold text-brand-white uppercase tracking-wider mb-4">
                    UN ACCOMPAGNEMENT ADAPTÉ À CHACUN
                  </h4>
                  <div className="space-y-3 text-brand-white/80 font-light text-base md:text-lg leading-relaxed">
                    <p>
                      Que vous soyez débutant, pratiquant confirmé ou combattant, les entraînements sont construits autour de vos objectifs.
                    </p>
                    <p>
                      Nous travaillons les fondamentaux, la technique, les déplacements, la précision, le conditionnement physique et la mise en situation.
                    </p>
                    <p>
                      Pour les pratiquants de MMA, le travail du striking peut également être adapté aux exigences spécifiques du combat en cage.
                    </p>
                  </div>
                </div>

                <div className="relative h-64 sm:h-72 rounded-xl overflow-hidden border border-brand-white/10 shadow-xl group">
                  <Image
                    src="/striking.jpg"
                    alt="Accompagnement Striking Camp"
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-black/80 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 text-xs font-heading font-bold text-brand-white uppercase tracking-wider">
                    Technique & Précision
                  </div>
                </div>
              </div>

              {/* UN ESPACE DÉDIÉ AUX FEMMES */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="order-2 md:order-1 relative h-64 sm:h-72 rounded-xl overflow-hidden border border-brand-white/10 shadow-xl group">
                  <Image
                    src="/fille.jpg"
                    alt="Lady Striking Marseille"
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-black/80 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 text-xs font-heading font-bold text-brand-white uppercase tracking-wider">
                    Section 100% Féminine
                  </div>
                </div>

                <div className="order-1 md:order-2">
                  <h4 className="font-heading text-2xl font-bold text-brand-white uppercase tracking-wider mb-4">
                    UN ESPACE DÉDIÉ AUX FEMMES
                  </h4>
                  <div className="space-y-3 text-brand-white/80 font-light text-base md:text-lg leading-relaxed">
                    <p>
                      Striking Camp propose également des séances 100 % féminines avec le <strong>Lady Striking</strong>.
                    </p>
                    <p>
                      L’objectif est de permettre à chacune de découvrir ou de pratiquer les sports de combat dans un cadre bienveillant et motivant, tout en conservant une véritable exigence technique et physique.
                    </p>
                  </div>
                </div>
              </div>

              {/* Phrase de conclusion */}
              <div className="p-6 bg-brand-white/5 border-l-4 border-brand-blue rounded-r-lg">
                <p className="text-brand-white text-lg md:text-xl font-medium italic">
                  « Ici, chacun vient avec son objectif. Nous vous aidons à construire votre progression. »
                </p>
              </div>

              {/* 2. NOTRE PHILOSOPHIE D'ENTRAÎNEMENT */}
              <div className="pt-8 border-t border-brand-white/10">
                <h3 className="font-heading text-3xl md:text-4xl font-bold text-brand-white uppercase tracking-wide mb-2">
                  NOTRE PHILOSOPHIE <span className="text-brand-blue">D&apos;ENTRAÎNEMENT</span>
                </h3>
                <p className="text-brand-white/70 font-light text-lg mb-8">
                  Plus qu&apos;une séance, une expérience transformative.
                </p>

                {/* Les 3 Piliers avec visuels immersifs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {pillars.map((pillar, index) => (
                    <motion.div
                      key={pillar.title}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-100px" }}
                      transition={{ duration: 0.5, delay: index * 0.15 }}
                      className="bg-brand-white/5 border border-brand-white/10 rounded-xl overflow-hidden hover:border-brand-blue/50 transition-all duration-500 group flex flex-col"
                    >
                      <div className="relative h-36 w-full overflow-hidden">
                        <Image
                          src={pillar.image}
                          alt={pillar.title}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          sizes="(max-width: 768px) 100vw, 33vw"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1d] via-brand-black/50 to-transparent" />
                      </div>
                      
                      <div className="p-6 flex-1 flex flex-col justify-between">
                        <div>
                          <h5 className="font-heading text-lg font-bold text-brand-white uppercase tracking-wider mb-2 group-hover:text-brand-blue transition-colors">
                            {pillar.title}
                          </h5>
                          <p className="text-brand-white/70 font-light leading-relaxed text-sm">
                            {pillar.desc}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* CTA actuel de la page */}
              <div className="pt-8">
                <a 
                  href="/planning"
                  className="inline-block px-8 py-4 bg-brand-blue text-brand-black font-bold uppercase tracking-wider hover:bg-brand-white transition-colors duration-300 rounded-md shadow-lg"
                >
                  Découvrir les cours
                </a>
              </div>

            </motion.div>
          </div>
          
        </div>
      </div>
    </section>
  );
}
