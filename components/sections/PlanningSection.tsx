"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Clock, Users, ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import TrialBookingModal from "@/components/modals/TrialBookingModal";

import {
  type DayName as Day,
  type PlanningCategory as Category,
  type ScheduleCourse,
  DAYS_ORDER as days,
  publicScheduleData as defaultScheduleData,
} from "@/data/planning";

type DayFilter = "Tous" | Day;

const categories: Category[] = ["Collectifs", "Small Group"];

function getBadgeColor(level?: string) {
  if (!level) return "bg-brand-white/10 text-brand-white/70 border-brand-white/15";
  const lvl = level.toLowerCase();
  if (lvl.includes("fondament")) return "bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/30";
  if (lvl.includes("performance")) return "bg-brand-blue/15 text-brand-blue border-brand-blue/30";
  if (lvl.includes("sparring")) return "bg-[#ef4444]/15 text-[#ef4444] border-[#ef4444]/30";
  if (lvl.includes("femme") || lvl.includes("féminin") || lvl.includes("feminin")) return "bg-pink-500/15 text-pink-400 border-pink-500/30";
  if (lvl.includes("tous niveaux")) return "bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/30";
  if (lvl.includes("élite") || lvl.includes("elite")) return "bg-purple-500/15 text-purple-400 border-purple-500/30";
  if (lvl.includes("cardio")) return "bg-amber-500/15 text-amber-400 border-amber-500/30";
  return "bg-brand-white/10 text-brand-white/70 border-brand-white/15";
}

interface PlanningSectionProps {
  initialScheduleData?: Record<Category, Record<Day, ScheduleCourse[]>>;
}

export default function PlanningSection({ initialScheduleData }: PlanningSectionProps = {}) {
  const scheduleData = initialScheduleData || defaultScheduleData;
  const [activeCategory, setActiveCategory] = useState<Category>("Collectifs");
  const [activeDay, setActiveDay] = useState<DayFilter>("Tous");
  const [isTrialModalOpen, setIsTrialModalOpen] = useState(false);
  const [selectedDisciplineForModal, setSelectedDisciplineForModal] = useState<string | undefined>(undefined);

  // Jours ayant au moins un créneau dans la catégorie active
  const activeDays = days.filter(
    (day) => scheduleData[activeCategory]?.[day]?.length > 0
  );

  const daysToRender = activeDay === "Tous" ? activeDays : [activeDay as Day];

  return (
    <section className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto font-sans">
      
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-brand-blue/10 border border-brand-blue/20 rounded-full text-brand-blue text-xs font-semibold uppercase tracking-widest mb-4">
          <Sparkles size={14} />
          Horaires & Créneaux
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-heading font-black uppercase tracking-tight text-brand-white">
          PLANNING <span className="text-brand-blue">DES COURS</span>
        </h1>
        <p className="mt-4 text-brand-white/70 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
          Découvrez nos créneaux du matin, du midi et du soir : Boxe Anglaise, Kick Boxing, Muay Thaï, Lady Striking et KB Shred.
        </p>
      </div>

      {/* Category Switcher Tabs */}
      <div className="flex justify-center mb-6 sm:mb-8">
        <div className="inline-flex p-1.5 rounded-full bg-[#0c1322] border border-brand-white/10 shadow-xl max-w-md w-full">
          {categories.map((category) => {
            const isActive = activeCategory === category;
            return (
              <button
                key={category}
                onClick={() => {
                  setActiveCategory(category);
                  setActiveDay("Tous");
                }}
                className={cn(
                  "flex-1 py-3 px-6 rounded-full text-xs sm:text-sm font-heading font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer text-center",
                  isActive
                    ? "bg-brand-blue text-brand-black shadow-lg shadow-brand-blue/25 font-black"
                    : "text-brand-white/70 hover:text-brand-white hover:bg-brand-white/5"
                )}
              >
                {category}
              </button>
            );
          })}
        </div>
      </div>

      {/* Days Filter (Pills) */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-10 sm:mb-12">
        <button
          onClick={() => setActiveDay("Tous")}
          className={cn(
            "px-5 py-2.5 rounded-full text-xs font-heading font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer",
            activeDay === "Tous"
              ? "bg-brand-blue text-brand-black shadow-lg shadow-brand-blue/20 font-black"
              : "bg-brand-white/5 text-brand-white/70 hover:bg-brand-white/10 hover:text-brand-white border border-brand-white/10"
          )}
        >
          Tous les jours
        </button>
        {activeDays.map((day) => (
          <button
            key={day}
            onClick={() => setActiveDay(day)}
            className={cn(
              "px-5 py-2.5 rounded-full text-xs font-heading font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer",
              activeDay === day
                ? "bg-brand-blue text-brand-black shadow-lg shadow-brand-blue/20 font-black"
                : "bg-brand-white/5 text-brand-white/70 hover:bg-brand-white/10 hover:text-brand-white border border-brand-white/10"
            )}
          >
            {day}
          </button>
        ))}
      </div>

      {/* Schedule Content */}
      <div className="max-w-4xl mx-auto min-h-[380px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${activeCategory}-${activeDay}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="space-y-10"
          >
            {daysToRender.map((day) => {
              const courses = scheduleData[activeCategory][day];
              if (!courses || courses.length === 0) return null;

              return (
                <div key={day} className="space-y-4">
                  {/* Day Header with accent */}
                  <div className="flex items-center gap-3 pb-3 border-b border-brand-white/10">
                    <div className="w-2 h-2 rounded-full bg-brand-blue shadow-[0_0_8px_rgba(47,174,224,0.8)]" />
                    <h2 className="text-xl sm:text-2xl font-heading font-bold uppercase tracking-wider text-brand-white">
                      {day}
                    </h2>
                    <span className="text-xs text-brand-white/40 font-medium">
                      ({courses.length} créneau{courses.length > 1 ? "x" : ""})
                    </span>
                  </div>

                  {/* Course Cards Grid */}
                  <div className="grid grid-cols-1 gap-3 sm:gap-4">
                    {courses.map((course, idx) => (
                      <div
                        key={idx}
                        className="bg-[#0c1322] border border-brand-white/10 hover:border-brand-blue/40 rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-xl hover:shadow-brand-blue/5 transition-all duration-200 group flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        {/* Course Info */}
                        <div className="flex items-start sm:items-center gap-3.5">
                          <div className="w-10 h-10 rounded-lg bg-brand-blue/10 border border-brand-blue/20 text-brand-blue flex items-center justify-center shrink-0">
                            <Clock size={18} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <h3 className="text-base sm:text-lg font-heading font-bold uppercase tracking-wider text-brand-white group-hover:text-brand-blue transition-colors">
                                {course.name}
                              </h3>
                              {course.level && (
                                <span
                                  className={cn(
                                    "px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase border tracking-wider",
                                    getBadgeColor(course.level)
                                  )}
                                >
                                  {course.level}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-brand-white/50 font-light block mt-0.5">
                              Séance encadrée par le coach
                            </span>
                          </div>
                        </div>

                        {/* Right: Time & Places */}
                        <div className="flex items-center justify-between sm:justify-end gap-4 pt-2 sm:pt-0 border-t border-brand-white/5 sm:border-0">
                          {course.places ? (
                            <span className="text-xs font-semibold text-[#22c55e] flex items-center gap-1 bg-[#22c55e]/10 px-2.5 py-1 rounded-full border border-[#22c55e]/20">
                              <Users size={12} />
                              {course.places} places max
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-brand-white/60 bg-brand-white/5 px-2.5 py-1 rounded-full border border-brand-white/10">
                              Accès libre
                            </span>
                          )}
                          <div className="text-right">
                            <span className="text-xl sm:text-2xl font-heading font-bold text-brand-blue">
                              {course.time}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Notice / Reservation Banner */}
      <div className="mt-14 sm:mt-16 text-center p-8 bg-[#0c1322] border border-brand-white/10 rounded-2xl max-w-2xl mx-auto space-y-4">
        <h3 className="text-lg font-heading font-bold uppercase tracking-wider text-brand-white">
          Envie de rejoindre une séance ?
        </h3>
        <p className="text-xs sm:text-sm text-brand-white/60 leading-relaxed max-w-lg mx-auto">
          Venez tester un premier entraînement encadré par le coach. Choisissez votre discipline et votre créneau pour réserver votre cours d&apos;essai gratuit.
        </p>
        <div className="pt-2 flex items-center justify-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setSelectedDisciplineForModal(undefined);
              setIsTrialModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-6 py-3.5 bg-brand-blue hover:bg-brand-white text-brand-black font-heading font-bold text-xs uppercase tracking-wider rounded-sm transition-all shadow-lg shadow-brand-blue/20 cursor-pointer"
          >
            RÉSERVER MON COURS D’ESSAI
            <ArrowRight size={14} />
          </button>
          <Link
            href="/tarifs"
            className="inline-flex items-center gap-2 px-5 py-3.5 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white/80 font-heading font-bold text-xs uppercase tracking-wider rounded-sm border border-brand-white/10 transition-colors"
          >
            VOIR LES FORMULES
          </Link>
        </div>
      </div>

      {/* Modale de Réservation de Cours d'Essai */}
      <TrialBookingModal
        isOpen={isTrialModalOpen}
        onClose={() => setIsTrialModalOpen(false)}
        preselectedDiscipline={selectedDisciplineForModal}
      />

    </section>
  );
}
