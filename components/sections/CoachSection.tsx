"use client";

import { motion } from "framer-motion";
import Image from "next/image";

export default function CoachSection() {
  return (
    <section id="le-coach" className="bg-[#0a1120] pt-8 pb-24 relative z-10 font-sans">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* ========================================================= */}
        {/* HERO / INTRODUCTION */}
        {/* ========================================================= */}
        <div className="mb-16 md:mb-20 text-left">
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="font-heading text-5xl sm:text-6xl md:text-7xl font-bold text-brand-white uppercase tracking-tighter mb-4"
          >
            MAHFOUD MOHAMED
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-brand-blue font-bold tracking-widest uppercase text-sm sm:text-base"
          >
            COACH &amp; FONDATEUR DE STRIKING CAMP
          </motion.p>
        </div>

        <div className="space-y-20 md:space-y-24">
          
          {/* ========================================================= */}
          {/* PHOTO 1 + MON PARCOURS */}
          {/* ========================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Photo 1 (Combat short orange Venum) */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8 }}
              className="lg:col-span-5 relative w-full aspect-square rounded-xl overflow-hidden border border-brand-white/10 shadow-2xl bg-brand-black"
            >
              <Image
                src="/coach-parcours.jpg"
                alt="Mahfoud Mohamed - Combat Kick-Boxing"
                width={960}
                height={960}
                priority
                className="w-full h-full object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 45vw, 400px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a1120]/40 via-transparent to-transparent pointer-events-none" />
            </motion.div>

            {/* Texte Mon Parcours */}
            <div className="lg:col-span-7">
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6 }}
                className="font-heading text-3xl md:text-4xl font-bold text-brand-white uppercase tracking-wide mb-6"
              >
                MON PARCOURS
              </motion.h2>

              <div className="space-y-4 text-brand-white/80 font-light text-lg leading-relaxed">
                <motion.p
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  Je m&apos;appelle Mahfoud Mohamed et je suis originaire de Marseille. Je pratique les sports de combat depuis l&apos;âge de 6 ans.
                </motion.p>
                <motion.p
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  Mon parcours a commencé par le karaté traditionnel, notamment le kata, avant de découvrir d&apos;autres disciplines comme l&apos;Aïkido et le Jiu-Jitsu japonais, que j&apos;ai pratiqué pendant deux ans.
                </motion.p>
                <motion.p
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  À partir de mes 18 ans, je me suis consacré au Kick Boxing et à la Boxe Thaï, deux disciplines qui ont profondément marqué ma façon de pratiquer et d&apos;enseigner les sports de combat.
                </motion.p>
                <motion.p
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                >
                  Au fil des années, j&apos;ai construit ma propre approche en m&apos;appuyant sur les différentes expériences acquises dans ces disciplines.
                </motion.p>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* COMMENT JE SUIS DEVENU COACH */}
          {/* ========================================================= */}
          <div className="pt-4 border-t border-brand-white/10">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
              className="font-heading text-3xl md:text-4xl font-bold text-brand-white uppercase tracking-wide mb-6"
            >
              COMMENT JE SUIS DEVENU COACH
            </motion.h2>

            <div className="space-y-4 text-brand-white/80 font-light text-lg leading-relaxed">
              <motion.p
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                Le coaching n&apos;était pas forcément un objectif que j&apos;avais fixé au départ.
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                Deux personnes de mon entourage m&apos;ont un jour demandé de leur tenir les paos et de leur donner des séances privées.
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                Ils ont apprécié ma manière de travailler, ma façon de tenir les paos et surtout ma méthode d&apos;entraînement. Ils m&apos;ont alors encouragé à me lancer dans le coaching.
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                J&apos;ai suivi leur conseil et j&apos;exerce depuis 2019.
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="text-brand-white font-normal"
              >
                Cette expérience m&apos;a permis de découvrir quelque chose d&apos;important : j&apos;aime transmettre et voir une personne progresser grâce au travail que nous construisons ensemble.
              </motion.p>
            </div>
          </div>

          {/* ========================================================= */}
          {/* MA VISION DU COACHING + PHOTO 2 */}
          {/* ========================================================= */}
          <div className="pt-4 border-t border-brand-white/10 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Texte Ma Vision du Coaching */}
            <div className="lg:col-span-7 order-2 lg:order-1">
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6 }}
                className="font-heading text-3xl md:text-4xl font-bold text-brand-white uppercase tracking-wide mb-6"
              >
                MA VISION DU COACHING
              </motion.h2>

              <div className="space-y-4 text-brand-white/80 font-light text-lg leading-relaxed">
                <motion.p
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  Pour moi, le sport de combat ne se résume pas à apprendre à frapper.
                </motion.p>
                <motion.p
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  Il doit aussi permettre de développer la pédagogie, le respect et l&apos;estime de soi.
                </motion.p>
                <motion.p
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  Je considère également qu&apos;il n&apos;y a pas d&apos;âge pour apprendre. Quel que soit votre niveau ou votre expérience, il suffit parfois simplement de commencer pour découvrir ce dont on est capable.
                </motion.p>
                <motion.p
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                >
                  Mon rôle est donc d&apos;accompagner chaque pratiquant dans sa progression, en adaptant le travail à son niveau et à ses objectifs.
                </motion.p>
              </div>
            </div>

            {/* Photo 2 (Combat short blanc PACA / Kick) */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8 }}
              className="lg:col-span-5 order-1 lg:order-2 relative w-full aspect-[795/960] rounded-xl overflow-hidden border border-brand-white/10 shadow-2xl bg-brand-black"
            >
              <Image
                src="/coach-vision.jpg"
                alt="Mahfoud Mohamed - Technique et combat"
                width={795}
                height={960}
                className="w-full h-full object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 45vw, 400px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a1120]/40 via-transparent to-transparent pointer-events-none" />
            </motion.div>
          </div>

          {/* ========================================================= */}
          {/* MA MÉTHODE */}
          {/* ========================================================= */}
          <div className="pt-4 border-t border-brand-white/10">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
              className="font-heading text-3xl md:text-4xl font-bold text-brand-white uppercase tracking-wide mb-6"
            >
              MA MÉTHODE
            </motion.h2>

            <div className="space-y-4 text-brand-white/80 font-light text-lg leading-relaxed mb-6">
              <motion.p
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                Dans le Kick Boxing, mon approche s&apos;inspire principalement de la méthode hollandaise, que j&apos;apprécie pour son travail explosif, ses enchaînements, ainsi que l&apos;association entre puissance et vitesse.
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                Je cherche à construire une pratique où la technique reste au centre du travail, tout en développant progressivement la vitesse, la puissance, les déplacements et le conditionnement physique.
              </motion.p>
            </div>

            {/* Citation stylisée */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="p-6 bg-brand-white/5 border-l-4 border-brand-blue rounded-r-lg"
            >
              <p className="text-brand-white text-lg md:text-xl font-medium italic">
                « L&apos;objectif n&apos;est pas simplement de faire plus, mais de mieux faire. »
              </p>
            </motion.div>
          </div>

          {/* ========================================================= */}
          {/* POURQUOI STRIKING CAMP ? */}
          {/* ========================================================= */}
          <div className="pt-4 border-t border-brand-white/10">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
              className="font-heading text-3xl md:text-4xl font-bold text-brand-white uppercase tracking-wide mb-6"
            >
              POURQUOI STRIKING CAMP ?
            </motion.h2>

            <div className="space-y-4 text-brand-white/80 font-light text-lg leading-relaxed mb-8">
              <motion.p
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                J&apos;ai créé Striking Camp pour proposer un environnement dans lequel les personnes qui souhaitent pratiquer les sports de combat peuvent apprendre, progresser et développer leur potentiel avec une méthode structurée.
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                Je veux transmettre ce que j&apos;ai appris au fil de mon parcours et permettre à chacun d&apos;accéder à un enseignement sérieux, progressif et adapté à son niveau.
              </motion.p>
            </div>

            {/* Message de motivation */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="p-6 bg-brand-white/5 border border-brand-white/10 rounded-xl"
            >
              <p className="text-brand-white text-lg md:text-xl font-semibold">
                Il n&apos;est jamais trop tard pour commencer. Le plus important est de faire le premier pas.
              </p>
            </motion.div>
          </div>


        </div>
      </div>
    </section>
  );
}
