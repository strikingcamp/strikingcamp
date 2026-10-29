"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ChevronRight, Calendar } from "lucide-react";
import { DisciplineDetail, publicDisciplineList } from "@/data/disciplines";
import TrialBookingModal from "@/components/modals/TrialBookingModal";
import { trackDisciplineView, trackBookingClick } from "@/lib/analytics";
import { getTrialPriceFormatted } from "@/lib/trial-pricing";

interface KickBoxingDetailViewProps {
  discipline: DisciplineDetail;
}

// Les 3 styles techniques constituant les fondations de la méthode Striking Camp
const TECHNICAL_INFLUENCES = [
  {
    id: "dutch-style",
    name: "DUTCH STYLE",
    image: "/kickboxing.jpg",
    approach: "Pression · Combinaisons · Enchaînements",
    description:
      "Une approche axée sur les combinaisons poings-jambes, le travail offensif, la pression et les transitions entre défense et attaque.",
    axes: [
      "Combinaisons poings-jambes.",
      "Enchaînements au sac et aux paos.",
      "Gestion de la pression offensive.",
      "Défense et contre-attaque.",
    ],
  },
  {
    id: "soviet-style",
    name: "SOVIET STYLE",
    image: "/boxe.webp",
    approach: "Déplacements · Précision · Distance",
    description:
      "Une approche mettant l'accent sur les fondamentaux, l'équilibre, les déplacements, la précision et la construction des attaques.",
    axes: [
      "Garde et équilibre.",
      "Déplacements et gestion de la distance.",
      "Précision des frappes.",
      "Construction des attaques et contre-attaques.",
    ],
  },
  {
    id: "style-japonais",
    name: "STYLE JAPONAIS",
    image: "/striking.jpg",
    approach: "Timing · Explosivité · Coordination",
    description:
      "Une approche axée sur le timing, la coordination entre les poings et les jambes, l'explosivité et la variété des actions techniques.",
    axes: [
      "Coordination poings-jambes.",
      "Timing et déclenchement des attaques.",
      "Explosivité et précision.",
      "Transitions entre attaque et défense.",
    ],
  },
];

// Les 5 étapes de la méthode d'entraînement Striking Camp
const TRAINING_STEPS = [
  {
    step: "01",
    title: "ÉCHAUFFEMENT PHYSIQUE",
    tagline: "Préparation musculaire & mobilité",
    description:
      "Mobilité, activation physique, coordination et déplacements pour préparer progressivement le corps à l'effort.",
  },
  {
    step: "02",
    title: "ÉCHAUFFEMENT TECHNIQUE",
    tagline: "Seul ou en binôme",
    description:
      "Travail individuel ou en binôme pour préparer les gestes, la garde, les déplacements et les fondamentaux nécessaires à la séance.",
  },
  {
    step: "03",
    title: "TECHNIQUE DU JOUR",
    tagline: "Apprentissage & précision",
    description:
      "Apprentissage et perfectionnement d'une technique précise sous la conduite du coach : attaque, défense, déplacement ou contre-attaque.",
  },
  {
    step: "04",
    title: "ENCHAÎNEMENT DU JOUR",
    tagline: "Mise en pratique & fluidité",
    description:
      "Mise en pratique de la technique étudiée dans un enchaînement progressif, au sac, aux paos ou en binôme. L'objectif est de développer la coordination, la précision et la fluidité.",
  },
  {
    step: "05",
    title: "RETOUR AU CALME OU SPARRING VOLONTAIRE",
    tagline: "Facultatif, encadré & adapté",
    description:
      "La séance se termine par un retour au calme ou, lorsque le coach le prévoit, par un sparring facultatif, encadré et adapté au niveau des participants.",
  },
];

export default function KickBoxingDetailView({ discipline }: KickBoxingDetailViewProps) {
  const [isTrialModalOpen, setIsTrialModalOpen] = useState(false);

  useEffect(() => {
    trackDisciplineView("kick-boxing");
  }, []);

  // Autres disciplines pour la navigation en fin de page (maillage interne)
  const otherDisciplines = publicDisciplineList.filter((d) => d.slug !== "kick-boxing");

  return (
    <div className="min-h-screen bg-transparent text-brand-white font-sans">
      {/* 1. Fil d'Ariane (Breadcrumbs) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-4">
        <nav aria-label="Fil d'ariane" className="flex items-center gap-2 text-xs text-brand-white/75 font-medium">
          <Link href="/" className="hover:text-brand-blue transition-colors">
            Accueil
          </Link>
          <ChevronRight size={13} className="text-brand-white/50" aria-hidden="true" />
          <Link href="/#disciplines" className="hover:text-brand-blue transition-colors">
            Disciplines
          </Link>
          <ChevronRight size={13} className="text-brand-white/50" aria-hidden="true" />
          <span className="text-brand-blue font-semibold">Kick Boxing</span>
        </nav>
      </div>

      {/* 2. SECTION 1 — PRÉSENTATION (HERO) */}
      <section className="relative py-12 sm:py-20 overflow-hidden">
        {/* Background Image avec dégradé sombre immersif */}
        <div className="absolute inset-0 z-0 opacity-25">
          <Image
            src={discipline.image || "/kickboxing.jpg"}
            alt="Entraînement de Kick Boxing au Striking Camp Marseille"
            fill
            priority
            className="object-cover object-center filter grayscale contrast-125"
            sizes="100vw"
          />
        </div>
        <div className="absolute inset-0 z-10 bg-gradient-to-b from-[#020817] via-[#020817]/85 to-[#020817]" />

        {/* Ambient Glow discret (cyan/bleu uniquement) */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-brand-blue/15 rounded-full blur-3xl pointer-events-none z-10" />

        <div className="relative z-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Badge Catégorie sobre, sans icône décorative */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center px-3.5 py-1.5 bg-brand-blue/10 border border-brand-blue/30 rounded-full text-brand-blue text-xs font-semibold uppercase tracking-widest mb-6 shadow-lg shadow-brand-blue/10"
          >
            MÉTHODE TECHNIQUE HYBRIDE
          </motion.div>

          {/* Titre Principal H1 */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-heading text-4xl sm:text-6xl md:text-7xl font-black uppercase tracking-tight text-brand-white leading-[0.95]"
          >
            KICK BOXING
          </motion.h1>

          {/* Accroche */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-4 sm:mt-5 text-lg sm:text-2xl text-brand-blue font-heading font-bold uppercase tracking-wide max-w-2xl mx-auto"
          >
            Trois influences. Une méthode. Votre progression.
          </motion.p>

          {/* Texte de présentation */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="mt-5 sm:mt-6 text-sm sm:text-base text-brand-white/80 font-light max-w-3xl mx-auto leading-relaxed space-y-3"
          >
            <p>
              Au Striking Camp, notre méthode de Kick Boxing s&apos;appuie sur trois influences techniques : le{" "}
              <strong className="text-brand-white font-medium">Dutch Style</strong>, le{" "}
              <strong className="text-brand-white font-medium">Soviet Style</strong> et le{" "}
              <strong className="text-brand-white font-medium">style japonais</strong>.
            </p>
            <p className="text-brand-white/70 text-xs sm:text-sm">
              Nous combinons et adaptons leurs principes au sein d&apos;un enseignement structuré, axé sur les
              fondamentaux, la maîtrise technique, les enchaînements et la progression de chaque pratiquant.
            </p>
          </motion.div>

          {/* Badges sobres de réassurance & localisation (sans icônes décoratives) */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 mt-6 sm:mt-8"
          >
            <span className="px-3.5 py-1.5 rounded-lg bg-[#0c1322]/80 border border-brand-white/10 text-brand-white/80 text-xs font-heading font-medium tracking-wide shadow-sm">
              Groupe réduit
            </span>
            <span className="px-3.5 py-1.5 rounded-lg bg-[#0c1322]/80 border border-brand-white/10 text-brand-white/80 text-xs font-heading font-medium tracking-wide shadow-sm">
              Coach Mahfoud Mohamed
            </span>
            <span className="px-3.5 py-1.5 rounded-lg bg-[#0c1322]/80 border border-brand-white/10 text-brand-white/80 text-xs font-heading font-medium tracking-wide shadow-sm">
              Marseille 13010
            </span>
          </motion.div>

          {/* Boutons d'action Hero */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mt-8 sm:mt-10"
          >
            <button
              type="button"
              onClick={() => {
                trackBookingClick("trial_modal", "kick_boxing_hero");
                setIsTrialModalOpen(true);
              }}
              className="w-full sm:w-auto px-7 sm:px-8 py-3.5 sm:py-4 bg-brand-blue text-brand-black font-heading font-bold text-xs sm:text-sm uppercase tracking-wider hover:bg-brand-white transition-all duration-300 rounded-md text-center shadow-lg shadow-brand-blue/25 hover:shadow-brand-blue/40 cursor-pointer flex items-center justify-center gap-2"
            >
              RÉSERVER UN COURS D’ESSAI
              <ArrowRight size={15} />
            </button>
            <Link
              href="/planning"
              className="w-full sm:w-auto px-6 sm:px-7 py-3.5 sm:py-4 bg-brand-white/5 border border-brand-white/15 text-brand-white hover:bg-brand-white/10 font-heading font-bold text-xs sm:text-sm uppercase tracking-wider transition-colors duration-300 rounded-md text-center flex items-center justify-center gap-2"
            >
              <Calendar size={15} className="text-brand-blue" />
              VOIR LES CRÉNEAUX
            </Link>
          </motion.div>
        </div>
      </section>

      {/* 3. SECTION 2 — LES TROIS STYLES (FONDATIONS TECHNIQUES) */}
      <section className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center px-3.5 py-1.5 bg-brand-blue/10 border border-brand-blue/20 rounded-full text-brand-blue text-xs font-semibold uppercase tracking-widest mb-3">
            Fondations Techniques
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-black text-brand-white uppercase tracking-tight">
            LES TROIS STYLES <span className="text-brand-blue">DE NOTRE MÉTHODE</span>
          </h2>
          <p className="mt-3 text-brand-white/70 text-xs sm:text-sm font-light leading-relaxed max-w-2xl mx-auto">
            Ces caractéristiques constituent les axes pédagogiques retenus par le Striking Camp. Nous combinons leurs
            principes de façon complémentaire pour forger un striking complet, intelligent et percutant.
          </p>
        </div>

        {/* 3 Cartes simplifiées : Photo épurée, Nom du style, Approche courte, Axes de travail en texte sans icônes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-stretch">
          {TECHNICAL_INFLUENCES.map((style, idx) => (
            <motion.div
              key={style.id}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.45, delay: idx * 0.1 }}
              className="group relative rounded-3xl bg-[#0c1322] border border-brand-white/10 hover:border-brand-blue/40 transition-all duration-300 overflow-hidden shadow-2xl flex flex-col justify-between"
            >
              <div>
                {/* 1. Photographie représentative du style (épurée, sans étiquette redondante par-dessus) */}
                <div className="relative h-60 sm:h-64 w-full overflow-hidden">
                  <Image
                    src={style.image}
                    alt={`Style de Kick Boxing : ${style.name}`}
                    fill
                    className="object-cover object-center filter contrast-110 brightness-90 transition-transform duration-700 group-hover:scale-105"
                    sizes="(max-width: 1024px) 100vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0c1322] via-[#0c1322]/40 to-transparent" />
                </div>

                {/* Contenu textuel sobre et lisible */}
                <div className="p-6 sm:p-8 space-y-4">
                  {/* 2. Nom du style */}
                  <div>
                    <h3 className="font-heading text-2xl sm:text-3xl font-black uppercase tracking-wider text-brand-white group-hover:text-brand-blue transition-colors duration-300">
                      {style.name}
                    </h3>
                    {/* 3. Courte phrase présentant son approche */}
                    <p className="text-xs sm:text-sm font-heading font-semibold text-brand-blue tracking-wide mt-1">
                      {style.approach}
                    </p>
                  </div>

                  {/* Description détaillée */}
                  <p className="text-xs sm:text-sm text-brand-white/80 font-light leading-relaxed">
                    « {style.description} »
                  </p>

                  {/* 4. Axes de travail sous forme de texte, sans icônes décoratives */}
                  <div className="pt-4 border-t border-brand-white/10 space-y-2">
                    <p className="text-[11px] font-heading font-bold uppercase tracking-wider text-brand-white/50">
                      Axes de travail :
                    </p>
                    <ul className="space-y-1.5 text-xs text-brand-white/75 font-light">
                      {style.axes.map((axe, aIdx) => (
                        <li key={aIdx} className="leading-relaxed">
                          {axe}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Ligne de finition sobre (cyan/bleu uniquement) */}
              <div className="px-6 sm:px-8 pb-6 pt-2">
                <div className="h-0.5 w-full bg-brand-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-blue/30 w-1/3 group-hover:w-full transition-all duration-500" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 4. SECTION 3 — NOTRE MÉTHODE D'ENTRAÎNEMENT (5 ÉTAPES) */}
      <section className="py-16 sm:py-24 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center px-3.5 py-1.5 bg-brand-blue/10 border border-brand-blue/20 rounded-full text-brand-blue text-xs font-semibold uppercase tracking-widest mb-3">
            Structure d&apos;une Séance
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-black text-brand-white uppercase tracking-tight">
            UNE MÉTHODE. <span className="text-brand-blue">CINQ ÉTAPES.</span>
          </h2>
          <p className="mt-3 text-brand-white/70 text-xs sm:text-sm font-light leading-relaxed">
            Chaque entraînement suit un protocole rigoureux et progressif, conçu pour construire la technique, la
            coordination et la condition physique en toute sécurité.
          </p>
        </div>

        {/* Parcours visuel numéroté de 01 à 05 — sans icônes décoratives */}
        <div className="space-y-4 sm:space-y-5">
          {TRAINING_STEPS.map((step, idx) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, x: -15 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ duration: 0.4, delay: idx * 0.08 }}
              className="group p-6 sm:p-7 rounded-2xl bg-[#0c1322] border border-brand-white/10 hover:border-brand-blue/40 transition-all duration-300 shadow-xl hover:shadow-brand-blue/5"
            >
              <div className="flex items-center gap-3.5 mb-2.5">
                {/* Numéro sobre en badge cyan/bleu */}
                <div className="w-10 h-10 rounded-xl bg-brand-blue/10 border border-brand-blue/30 flex items-center justify-center font-heading font-black text-sm text-brand-blue shrink-0 shadow-inner">
                  {step.step}
                </div>
                <div>
                  <h3 className="font-heading text-lg sm:text-xl font-bold uppercase tracking-wider text-brand-white group-hover:text-brand-blue transition-colors">
                    {step.title}
                  </h3>
                  <p className="text-[11px] font-heading font-medium text-brand-white/50 uppercase tracking-wide">
                    {step.tagline}
                  </p>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-brand-white/80 font-light leading-relaxed pl-0 sm:pl-13.5">
                « {step.description} »
              </p>
            </motion.div>
          ))}
        </div>

        {/* Encadré de sécurité : Sparring Facultatif & Priorité Technique (sobre, sans icônes, palette sombre/bleue) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mt-8 p-6 rounded-2xl bg-[#0c1322] border border-brand-blue/30 shadow-xl space-y-2"
        >
          <div className="flex flex-wrap items-center gap-2.5">
            <h4 className="text-sm font-heading font-bold uppercase tracking-wider text-brand-white">
              Sécurité & Maîtrise Technique Prioritaires
            </h4>
            <span className="px-2.5 py-0.5 text-[11px] rounded bg-brand-blue/15 text-brand-blue border border-brand-blue/30 font-semibold uppercase tracking-wider">
              Sparring non obligatoire
            </span>
          </div>
          <p className="text-xs sm:text-sm text-brand-white/70 font-light leading-relaxed">
            Le sparring n&apos;est jamais une obligation. Il reste toujours facultatif, encadré sous la surveillance
            attentive du coach et strictement adapté au niveau et au consentement de chaque pratiquant.
          </p>
        </motion.div>
      </section>

      {/* 5. SECTION 4 — UNE MÉTHODE ÉVOLUTIVE */}
      <section className="py-16 sm:py-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl bg-gradient-to-br from-[#0c1626] via-[#0e192c] to-[#070c16] border border-brand-blue/30 p-8 sm:p-12 shadow-2xl space-y-6 overflow-hidden">
          {/* Liseré lumineux (cyan/bleu uniquement) */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-brand-blue/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-brand-blue shadow-[0_0_8px_rgba(47,174,224,0.8)]" />
            <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-black text-brand-white uppercase tracking-wider">
              TROIS INFLUENCES. <span className="text-brand-blue">UNE APPROCHE COMPLÉMENTAIRE.</span>
            </h2>
          </div>

          <div className="relative z-10 space-y-4 text-brand-white/80 font-light text-sm sm:text-base leading-relaxed">
            <p>
              « Chaque séance possède son objectif technique. Nous pouvons mettre l&apos;accent sur une influence
              particulière ou combiner les principes des trois styles selon le thème travaillé.
            </p>
            <p>
              Notre méthode privilégie la compréhension du geste, sa répétition, son intégration dans les enchaînements et
              sa mise en pratique progressive. »
            </p>
          </div>

          {/* 3 Piliers visuels sobres */}
          <div className="relative z-10 pt-4 border-t border-brand-white/10 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-brand-white/5 border border-brand-white/5 space-y-1">
              <p className="text-[11px] font-heading font-bold uppercase tracking-wider text-brand-blue">Pilier 1</p>
              <p className="text-xs sm:text-sm font-semibold text-brand-white">Compréhension du geste</p>
              <p className="text-[11px] text-brand-white/60">Analyse de la mécanique et de la posture.</p>
            </div>
            <div className="p-4 rounded-xl bg-brand-white/5 border border-brand-white/5 space-y-1">
              <p className="text-[11px] font-heading font-bold uppercase tracking-wider text-brand-blue">Pilier 2</p>
              <p className="text-xs sm:text-sm font-semibold text-brand-white">Répétition & Précision</p>
              <p className="text-[11px] text-brand-white/60">Automatisation au sac, aux paos et en binôme.</p>
            </div>
            <div className="p-4 rounded-xl bg-brand-white/5 border border-brand-white/5 space-y-1">
              <p className="text-[11px] font-heading font-bold uppercase tracking-wider text-brand-blue">Pilier 3</p>
              <p className="text-xs sm:text-sm font-semibold text-brand-white">Intégration & Fluidité</p>
              <p className="text-[11px] text-brand-white/60">Liaison poings-pieds et application en situation.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. SECTION 5 — APPEL À L'ACTION (CTA RÉSERVATION) */}
      <section className="py-16 sm:py-24 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl bg-gradient-to-br from-[#0c1626] via-[#101e35] to-[#070c16] border border-brand-blue/30 p-8 sm:p-14 text-center shadow-[0_0_50px_rgba(47,174,224,0.15)] overflow-hidden space-y-6">
          <div className="inline-flex items-center px-3.5 py-1.5 bg-brand-blue/10 border border-brand-blue/20 rounded-full text-brand-blue text-xs font-semibold uppercase tracking-widest">
            Première Séance • {getTrialPriceFormatted("small_group")}
          </div>

          <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-black text-brand-white uppercase tracking-tight">
            DÉVELOPPEZ <span className="text-brand-blue">VOTRE STRIKING.</span>
          </h2>

          <p className="text-brand-white/70 font-light text-sm sm:text-base leading-relaxed max-w-xl mx-auto">
            « Travaillez vos fondamentaux, développez vos enchaînements et progressez avec la méthode Striking Camp. »
          </p>

          <p className="text-xs text-brand-white/50 max-w-md mx-auto">
            Club situé au 268 avenue de la Capelette (13010 Marseille). Séances en groupe réduit avec le coach Mahfoud.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => {
                trackBookingClick("trial_modal", "kick_boxing_bottom");
                setIsTrialModalOpen(true);
              }}
              className="w-full sm:w-auto px-8 py-4 bg-brand-blue text-brand-black font-heading font-bold text-xs sm:text-sm uppercase tracking-wider rounded-md hover:bg-brand-white transition-all shadow-lg shadow-brand-blue/30 cursor-pointer flex items-center justify-center gap-2"
            >
              RÉSERVER MON COURS D’ESSAI
              <ArrowRight size={16} />
            </button>
            <Link
              href="/tarifs"
              className="w-full sm:w-auto px-7 py-4 bg-brand-white/5 text-brand-white font-heading font-bold text-xs sm:text-sm uppercase tracking-wider rounded-md border border-brand-white/10 hover:bg-brand-white/10 transition-colors"
            >
              VOIR LES FORMULES
            </Link>
          </div>
        </div>
      </section>

      {/* 7. NAVIGATION VERS LES AUTRES DISCIPLINES (MAILLAGE INTERNE SEO) */}
      <section className="py-12 sm:py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-brand-white/10">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="font-heading text-2xl sm:text-3xl font-black text-brand-white uppercase tracking-wider">
            DÉCOUVRIR NOS <span className="text-brand-blue">AUTRES DISCIPLINES</span>
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-brand-white/60 font-light">
            Développez une pratique martiale complète au Striking Camp Marseille.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {otherDisciplines.map((item) => (
            <Link
              key={item.slug}
              href={`/disciplines/${item.slug}`}
              className="group p-5 rounded-xl bg-[#0c1322] border border-brand-white/10 hover:border-brand-blue/40 shadow-lg transition-all duration-300 hover:-translate-y-0.5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-brand-blue/10 text-brand-blue border border-brand-blue/20">
                    {item.category}
                  </span>
                </div>
                <h3 className="font-heading text-lg font-bold uppercase tracking-wider text-brand-white group-hover:text-brand-blue transition-colors">
                  {item.title}
                </h3>
                <p className="mt-2 text-xs text-brand-white/60 font-light line-clamp-2 leading-relaxed">
                  {item.shortDescription}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-brand-white/5 flex items-center justify-between text-xs font-bold text-brand-blue group-hover:text-brand-white transition-colors">
                <span>En savoir plus</span>
                <ArrowRight size={13} className="transition-transform duration-200 group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Modale de Réservation de Cours d'Essai réutilisée avec Kick Boxing présélectionné */}
      <TrialBookingModal
        isOpen={isTrialModalOpen}
        onClose={() => setIsTrialModalOpen(false)}
        preselectedDiscipline="Kick Boxing"
      />
    </div>
  );
}
