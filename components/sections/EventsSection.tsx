"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Tag,
  CheckCircle2,
  Sparkles,
  Flame,
  ArrowRight,
  ShieldCheck,
  History,
} from "lucide-react";
import Link from "next/link";
import { clubEvents, type EventCategory, type ClubEvent } from "@/data/events";
import { cn } from "@/lib/utils";

type FilterTab = "all" | "featured" | "stage" | "camp" | "special" | "passe";

const filterTabs: { id: FilterTab; label: string }[] = [
  { id: "all", label: "Tous les événements" },
  { id: "stage", label: "Stages" },
  { id: "camp", label: "Camps" },
  { id: "special", label: "Événements spéciaux" },
  { id: "passe", label: "Événements passés" },
];

export default function EventsSection() {
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  const featuredEvent = clubEvents.find((e) => e.isFeatured);

  const filteredEvents = clubEvents.filter((event) => {
    if (activeTab === "all") return true;
    if (activeTab === "featured") return event.isFeatured;
    return event.category === activeTab;
  });

  const getCategoryBadge = (category: EventCategory) => {
    switch (category) {
      case "stage":
        return "bg-brand-blue/20 text-brand-blue border-brand-blue/30";
      case "camp":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "special":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "passe":
        return "bg-brand-white/10 text-brand-white/50 border-brand-white/15";
    }
  };

  return (
    <section className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto font-sans">
      
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-blue/10 border border-brand-blue/20 rounded-full text-brand-blue text-xs font-semibold uppercase tracking-widest mb-4">
          <Sparkles size={14} />
          Stages & Immersion Striking
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-heading font-black uppercase tracking-tight text-brand-white">
          ÉVÉNEMENTS <span className="text-brand-blue">& STAGES</span>
        </h1>
        <p className="mt-4 text-brand-white/60 text-sm sm:text-base leading-relaxed">
          Participez à nos stages techniques exclusifs, camps intensifs et rassemblements inter-clubs animés par Mahfoud Mohamed au Striking Camp Marseille.
        </p>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━
          PROCHAIN ÉVÉNEMENT (FEATURED HIGHLIGHT)
          ━━━━━━━━━━━━━━━━━━━━ */}
      {featuredEvent && (
        <div className="mb-16">
          <div className="relative rounded-2xl bg-gradient-to-br from-[#0c1626] via-[#101e35] to-[#070c16] border border-brand-blue/40 p-6 sm:p-10 shadow-[0_0_50px_rgba(47,174,224,0.15)] overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-brand-blue/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
              {/* Left Details */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="px-3 py-1 rounded-full bg-brand-blue text-brand-black font-heading font-bold text-xs uppercase tracking-wider">
                    PROCHAIN ÉVÉNEMENT
                  </span>
                  <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase border", getCategoryBadge(featuredEvent.category))}>
                    {featuredEvent.categoryLabel}
                  </span>
                  {featuredEvent.spots && (
                    <span className="text-xs text-[#22c55e] font-bold">
                      • {featuredEvent.spots}
                    </span>
                  )}
                </div>

                <h2 className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold uppercase tracking-wider text-brand-white">
                  {featuredEvent.title}
                </h2>

                <p className="text-sm text-brand-white/70 leading-relaxed">
                  {featuredEvent.description}
                </p>

                {/* Key metadata */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="flex items-center gap-2.5 text-xs sm:text-sm text-brand-white">
                    <Calendar size={16} className="text-brand-blue shrink-0" />
                    <span>{featuredEvent.date}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs sm:text-sm text-brand-white">
                    <Clock size={16} className="text-brand-blue shrink-0" />
                    <span>{featuredEvent.time}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs sm:text-sm text-brand-white">
                    <MapPin size={16} className="text-brand-blue shrink-0" />
                    <span className="truncate">{featuredEvent.location}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs sm:text-sm text-brand-white">
                    <User size={16} className="text-brand-blue shrink-0" />
                    <span>Coach : {featuredEvent.coach}</span>
                  </div>
                </div>

                {/* Highlights */}
                <div className="space-y-1.5 pt-2">
                  <p className="text-xs font-heading font-bold uppercase tracking-wider text-brand-blue">
                    Au programme :
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-brand-white/80">
                    {featuredEvent.highlights.map((hl, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-[#22c55e] shrink-0" />
                        <span>{hl}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right CTA Card */}
              <div className="bg-[#070c16]/80 border border-brand-white/10 rounded-xl p-6 text-center space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-brand-white/50">Tarif de participation</p>
                  <p className="text-2xl sm:text-3xl font-heading font-bold text-brand-blue mt-1">
                    {featuredEvent.price}
                  </p>
                </div>

                <div className="space-y-2">
                  <Link
                    href="/connexion"
                    className="w-full py-3.5 px-6 bg-brand-blue hover:bg-brand-white text-brand-black font-heading font-bold text-sm uppercase tracking-wider rounded-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-blue/30"
                  >
                    RÉSERVER MA PLACE
                    <ArrowRight size={16} />
                  </Link>
                  <Link
                    href="/contact"
                    className="block w-full py-2.5 px-4 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white/80 text-xs font-semibold uppercase tracking-wider rounded-sm transition-colors"
                  >
                    Poser une question
                  </Link>
                </div>

                <p className="text-[11px] text-brand-white/40">
                  Réservation recommandée • Places limitées pour garantir la qualité pédagogique.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━
          FILTRE PAR CATÉGORIES
          ━━━━━━━━━━━━━━━━━━━━ */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
        {filterTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-5 py-2.5 rounded-full text-xs font-heading font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer",
              activeTab === tab.id
                ? "bg-brand-blue text-brand-black shadow-lg shadow-brand-blue/20"
                : "bg-brand-white/5 text-brand-white/70 hover:bg-brand-white/10 hover:text-brand-white border border-brand-white/10"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━
          GRILLE DES ÉVÉNEMENTS
          ━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {filteredEvents.map((event) => {
            const isPast = event.category === "passe";

            return (
              <div
                key={event.id}
                className={cn(
                  "rounded-2xl p-6 sm:p-7 border flex flex-col justify-between transition-all duration-200",
                  isPast
                    ? "bg-[#0a0f1d]/50 border-brand-white/5 opacity-80"
                    : "bg-[#0c1322] border-brand-white/10 hover:border-brand-blue/40 shadow-xl"
                )}
              >
                <div className="space-y-4">
                  {/* Badge & Price */}
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase border", getCategoryBadge(event.category))}>
                      {event.categoryLabel}
                    </span>
                    <span className={cn(
                      "text-xs font-bold uppercase",
                      isPast ? "text-brand-white/40" : "text-brand-blue"
                    )}>
                      {event.price}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-xl sm:text-2xl font-heading font-bold uppercase tracking-wider text-brand-white">
                    {event.title}
                  </h3>

                  {/* Description */}
                  <p className="text-xs sm:text-sm text-brand-white/60 leading-relaxed">
                    {event.description}
                  </p>

                  {/* Metadata */}
                  <div className="space-y-1.5 pt-2 text-xs text-brand-white/70 border-t border-brand-white/5">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-brand-blue shrink-0" />
                      <span>{event.date}</span>
                      <span className="text-brand-white/30">•</span>
                      <Clock size={14} className="text-brand-blue shrink-0" />
                      <span>{event.time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-brand-blue shrink-0" />
                      <span>{event.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-brand-blue shrink-0" />
                      <span>Encadré par {event.coach}</span>
                    </div>
                  </div>

                  {/* Highlights list */}
                  {event.highlights && (
                    <div className="space-y-1 pt-1">
                      {event.highlights.map((hl, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-brand-white/60">
                          <CheckCircle2 size={12} className={cn("shrink-0", isPast ? "text-brand-white/30" : "text-[#22c55e]")} />
                          <span>{hl}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {event.recap && (
                    <p className="text-xs italic text-brand-white/50 bg-brand-white/[0.02] p-3 rounded border border-brand-white/5">
                      « {event.recap} »
                    </p>
                  )}
                </div>

                {/* Bottom Action */}
                <div className="pt-6 mt-4 border-t border-brand-white/5">
                  {isPast ? (
                    <div className="flex items-center gap-1.5 text-xs text-brand-white/40 font-medium">
                      <History size={14} />
                      Édition terminée
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      {event.spots && (
                        <span className="text-xs text-brand-white/50 font-medium">
                          {event.spots}
                        </span>
                      )}
                      <Link
                        href="/connexion"
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-blue hover:bg-brand-white text-brand-black font-heading font-bold text-xs uppercase tracking-wider rounded-sm transition-colors"
                      >
                        S'INSCRIRE
                        <ArrowRight size={13} />
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </motion.div>
      </AnimatePresence>

      {/* Club notice at bottom */}
      <div className="mt-16 text-center p-8 bg-[#0c1322] border border-brand-white/10 rounded-2xl max-w-2xl mx-auto space-y-3">
        <h4 className="text-lg font-heading font-bold uppercase tracking-wider text-brand-white">
          Vous souhaitez organiser un stage ou une masterclass ?
        </h4>
        <p className="text-xs text-brand-white/60 leading-relaxed">
          Le Striking Camp propose également des interventions sur-mesure pour les clubs, comités d’entreprises et groupes privés.
        </p>
        <div className="pt-2">
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-white/10 hover:bg-brand-white/20 text-brand-white font-heading font-bold text-xs uppercase tracking-wider rounded-sm transition-colors"
          >
            CONTACTER LE COACH
          </Link>
        </div>
      </div>

    </section>
  );
}
