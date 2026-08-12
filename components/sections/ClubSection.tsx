"use client";

import { motion } from "framer-motion";

export default function ClubSection() {
  return (
    <section id="le-club" className="bg-brand-black pt-8 pb-24 relative overflow-hidden min-h-[calc(100vh-80px)] font-sans">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-start">
          
          <div className="w-full lg:w-1/3 lg:sticky lg:top-32 pt-4 lg:pt-12">
            <motion.h2 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8 }}
              className="font-heading text-5xl md:text-7xl font-bold text-brand-white uppercase tracking-tighter mb-8"
            >
              LE CLUB
            </motion.h2>
          </div>

          <div className="w-full lg:w-2/3 pt-4 lg:pt-12">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
              className="space-y-8"
            >
              <h3 className="text-3xl font-bold text-brand-blue uppercase tracking-wide mb-4">
                Le meilleur club de pieds-poings & striking de Marseille
              </h3>
              
              <p className="text-brand-white/80 font-light text-lg leading-relaxed">
                Situé au cœur de la cité phocéenne, <strong>Striking Camp</strong> s'impose aujourd'hui comme la référence absolue des sports de combat à Marseille. Conçu pour ceux qui recherchent l'excellence, notre structure accueille aussi bien les passionnés déterminés que les athlètes professionnels. Ce n'est pas un hasard si les pros qui performent au niveau mondial viennent s'y préparer : l'exigence, la rigueur et l'encadrement sont dignes du très haut niveau.
              </p>
              
              <h4 className="text-2xl font-bold text-brand-white uppercase tracking-wider mt-8 mb-4">
                Le meilleur coach individuel de la région
              </h4>
              <p className="text-brand-white/80 font-light text-lg leading-relaxed">
                Notre réputation repose sur l'expertise de notre encadrement. Sous la direction du <strong>meilleur coach individuel de Marseille</strong>, chaque séance est pensée pour décupler votre technique, votre puissance et votre conditionnement. Que vous souhaitiez maîtriser les bases, préparer un combat international, ou encore <strong>adapter votre striking aux exigences spécifiques du MMA</strong>, l'approche pédagogique reste la même : professionnelle, mature et orientée vers les résultats.
              </p>
              
              <h4 className="text-2xl font-bold text-brand-white uppercase tracking-wider mt-8 mb-4">
                Une section 100% féminine
              </h4>
              <p className="text-brand-white/80 font-light text-lg leading-relaxed">
                Striking Camp s'engage à offrir un cadre d'entraînement optimal pour toutes. À travers nos cours <strong>Lady Striking</strong> et <strong>Lady Boxing</strong>, nous proposons des sessions exclusivement réservées aux femmes. Ce format en petit comité garantit une intimité totale et une atmosphère bienveillante, permettant à chacune de s'initier, de progresser et de se dépasser, sans jamais faire de compromis sur l'exigence technique et physique.
              </p>
              
              <div className="bg-brand-white/5 border border-brand-white/10 rounded-lg p-8 mt-12">
                <h4 className="text-2xl font-bold text-brand-blue uppercase tracking-wider mb-6">
                  Nos Disciplines
                </h4>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 text-brand-white/90 font-medium text-lg">
                  <li className="flex items-center">
                    <span className="text-brand-blue mr-3">✓</span> Boxe Anglaise
                  </li>
                  <li className="flex items-center">
                    <span className="text-brand-blue mr-3">✓</span> Kick Boxing
                  </li>
                  <li className="flex items-center">
                    <span className="text-brand-blue mr-3">✓</span> Boxe Thaï
                  </li>
                  <li className="flex items-center">
                    <span className="text-brand-blue mr-3">✓</span> Lady Striking
                  </li>
                  <li className="flex items-center">
                    <span className="text-brand-blue mr-3">✓</span> Lady Boxing
                  </li>
                  <li className="flex items-center">
                    <span className="text-brand-blue mr-3">✓</span> Boxing Shred
                  </li>
                </ul>
              </div>

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
