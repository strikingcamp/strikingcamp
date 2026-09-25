"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Users, ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import TrialBookingModal from "@/components/modals/TrialBookingModal";
import { trackScheduleView, trackBookingClick } from "@/lib/analytics";

import {
  type DayName as Day,
  type PlanningCategory as Category,
  type ScheduleCourse,
  DAYS_ORDER as days,
  publicScheduleData as defaultScheduleData,
  getLevelBadgeClasses,
} from "@/data/planning";

type DayFilter = "Tous" | Day;

interface PlanningSectionProps {
  initialScheduleData?: Record<Category, Record<Day, ScheduleCourse[]>>;
  isSmallGroupActive?: boolean;
}

export default function PlanningSection({
  initialScheduleData,
  isSmallGroupActive = true,
}: PlanningSectionProps = {}) {
  const scheduleData = initialScheduleData || defaultScheduleData;
  const currentCategory: Category = "Small Group";

  const [activeDay, setActiveDay] = useState<DayFilter>("Tous");
  const [isTrialModalOpen, setIsTrialModalOpen] = useState(false);
  const [selectedDisciplineForModal, setSelectedDisciplineForModal] = useState<string | undefined>(undefined);

  // Jours ayant au moins un créneau dans la catégorie active
  const activeDays = days.filter(
    (day) => scheduleData[currentCategory]?.[day]?.length > 0
  );

  const daysToRender = activeDay === "Tous" ? activeDays : [activeDay as Day];

  return (
    <section className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto font-sans">
      
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
        <div className="inline-flex items-center px-3.5 py-1.5 bg-brand-blue/10 border border-brand-blue/20 rounded-full text-brand-blue text-xs font-semibold uppercase tracking-widest mb-4">
          Horaires & Créneaux
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-heading font-black uppercase tracking-tight text-brand-white">
          PLANNING <span className="text-brand-blue">DES COURS</span>
        </h1>
        <p className="mt-4 text-brand-white/70 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
          Découvrez nos créneaux en petit comité (12 places max), avec un accès illimité à toutes nos disciplines.
        </p>

        {!isSmallGroupActive && (
          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs font-semibold max-w-md mx-auto">
            Les créneaux Small Group sont actuellement en pause ou en réorganisation.
          </div>
        )}
      </div>

      {/* Days Filter (Pills) */}
      <div role="group" aria-label="Filtrer par jour" className="flex flex-wrap items-center justify-center gap-2 mb-10 sm:mb-12">
        <button
          aria-pressed={activeDay === "Tous"}
          onClick={() => {
            setActiveDay("Tous");
            trackScheduleView("Tous");
          }}
          className={cn(
            "px-5 py-2.5 rounded-full text-xs font-heading font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue",
            activeDay === "Tous"
              ? "bg-brand-blue text-brand-black shadow-lg shadow-brand-blue/20 font-black"
              : "bg-brand-white/5 text-brand-white/80 hover:bg-brand-white/10 hover:text-brand-white border border-brand-white/10"
          )}
        >
          Tous les jours
        </button>
        {activeDays.map((day) => (
          <button
            key={day}
            aria-pressed={activeDay === day}
            onClick={() => {
              setActiveDay(day);
              trackScheduleView(day);
            }}
            className={cn(
              "px-5 py-2.5 rounded-full text-xs font-heading font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue",
              activeDay === day
                ? "bg-brand-blue text-brand-black shadow-lg shadow-brand-blue/20 font-black"
                : "bg-brand-white/5 text-brand-white/80 hover:bg-brand-white/10 hover:text-brand-white border border-brand-white/10"
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
            key={activeDay}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="space-y-10"
          >
            {daysToRender.map((day) => {
              const courses = scheduleData["Small Group"][day];
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
                                    getLevelBadgeClasses(course.level, course.name)
                                  )}
                                >
                                  {course.name === "Lady Striking" ? "100% féminin" : course.level}
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
      <div className="mt-14 sm:mt-16 text-center p-8 bg-gradient-to-br from-[#0c1626] via-[#101e35] to-[#070c16] border border-brand-blue/30 rounded-3xl max-w-2xl mx-auto space-y-4 shadow-2xl shadow-brand-blue/10 relative overflow-hidden">
        <div className="inline-flex items-center px-3 py-1 rounded-full bg-brand-blue/15 border border-brand-blue/30 text-brand-blue text-[11px] font-heading font-black uppercase tracking-wider">
          Cours d&apos;Essai • 15 €
        </div>
        <h3 className="text-xl sm:text-2xl font-heading font-black uppercase tracking-wider text-brand-white">
          Envie de tester une première séance ?
        </h3>
        <p className="text-xs sm:text-sm text-brand-white/70 leading-relaxed max-w-lg mx-auto">
          Venez tester un premier entraînement encadré par le coach au club de Marseille (Small Group 15 €). Choisissez votre discipline et votre créneau en 1 minute.
        </p>
        <div className="pt-2 flex items-center justify-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => {
              trackBookingClick("trial_modal", "planning_cta");
              setSelectedDisciplineForModal(undefined);
              setIsTrialModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-6 py-3.5 bg-brand-blue hover:bg-brand-white text-brand-black font-heading font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-brand-blue/25 hover:shadow-brand-blue/40 cursor-pointer"
          >
            RÉSERVER MON COURS D’ESSAI
            <ArrowRight size={14} />
          </button>
          <Link
            href="/tarifs"
            className="inline-flex items-center gap-2 px-5 py-3.5 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white/80 hover:text-brand-white font-heading font-bold text-xs uppercase tracking-wider rounded-xl border border-brand-white/10 transition-colors"
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
