"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Users, Info, ShieldCheck, Check, Clock, Lock, ChevronLeft, ChevronRight, Ban } from "lucide-react";
import { useMember } from "./MemberContext";
import { cn } from "@/lib/utils";
import type { ClassSession } from "@/lib/supabase/small-group";

type Category = "Small Group" | "Collectifs";
type DayName = "Lundi" | "Mardi" | "Mercredi" | "Jeudi" | "Vendredi" | "Samedi";
type DayFilter = "Tous" | DayName;

const DAYS_ORDER: DayName[] = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

const DAY_MAP_FR: Record<number, DayName> = {
  1: "Lundi",
  2: "Mardi",
  3: "Mercredi",
  4: "Jeudi",
  5: "Vendredi",
  6: "Samedi",
};

const MONTH_NAMES_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

function getBadgeColor(level?: string | null) {
  if (!level) return "bg-gray-500/20 text-gray-300 border-gray-500/30";
  const lvl = level.toLowerCase();
  if (lvl.includes("fondament")) return "bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/30";
  if (lvl.includes("performance")) return "bg-[#3b82f6]/15 text-[#3b82f6] border-[#3b82f6]/30";
  if (lvl.includes("sparring")) return "bg-[#ef4444]/15 text-[#ef4444] border-[#ef4444]/30";
  if (lvl.includes("femme") || lvl.includes("féminin")) return "bg-pink-500/15 text-pink-400 border-pink-500/30";
  return "bg-brand-blue/15 text-brand-blue border-brand-blue/30";
}

// Obtenir le lundi minuit d'une date
function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export default function MemberPlanningView() {
  const [activeCategory, setActiveCategory] = useState<Category>("Small Group");
  const [activeDay, setActiveDay] = useState<DayFilter>("Tous");
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0);

  const {
    openBookingConfirm,
    userBookings,
    hasSmallGroupAccess,
    availableSessions,
  } = useMember();

  // 1. Découpage dynamique des semaines disponibles dans public.class_sessions
  const weeksList = useMemo(() => {
    if (!availableSessions || availableSessions.length === 0) {
      // Semaine par défaut du 31 Août 2026
      const defaultStart = new Date("2026-08-31T00:00:00");
      return [defaultStart];
    }

    const mondaysMap = new Map<number, Date>();
    for (const session of availableSessions) {
      if (session.starts_at) {
        const mon = getMonday(new Date(session.starts_at));
        mondaysMap.set(mon.getTime(), mon);
      }
    }

    const sortedMondays = Array.from(mondaysMap.values()).sort(
      (a, b) => a.getTime() - b.getTime()
    );

    return sortedMondays.length > 0 ? sortedMondays : [new Date("2026-08-31T00:00:00")];
  }, [availableSessions]);

  const activeMonday = weeksList[selectedWeekIndex] || weeksList[0] || new Date("2026-08-31T00:00:00");
  const activeSaturday = new Date(activeMonday);
  activeSaturday.setDate(activeMonday.getDate() + 5);

  const weekLabel = `${activeMonday.getDate()} ${MONTH_NAMES_FR[activeMonday.getMonth()]} – ${activeSaturday.getDate()} ${MONTH_NAMES_FR[activeSaturday.getMonth()]} ${activeSaturday.getFullYear()}`;

  // 2. Séances de la semaine active groupées par jour
  const weekSessionsByDay = useMemo(() => {
    const grouped: Record<DayName, ClassSession[]> = {
      Lundi: [],
      Mardi: [],
      Mercredi: [],
      Jeudi: [],
      Vendredi: [],
      Samedi: [],
    };

    const monTime = activeMonday.getTime();
    const sunEnd = new Date(activeMonday);
    sunEnd.setDate(activeMonday.getDate() + 6);
    sunEnd.setHours(23, 59, 59, 999);
    const sunTime = sunEnd.getTime();

    for (const s of availableSessions) {
      if (!s.starts_at) continue;
      const sDate = new Date(s.starts_at);
      const sTime = sDate.getTime();

      if (sTime >= monTime && sTime <= sunTime) {
        const isSmallGroup = s.type === "small_group" || s.type === "smallgroup" || !s.type;
        const isCollective = s.type === "collective" || s.type === "collectif";

        if (
          (activeCategory === "Small Group" && isSmallGroup) ||
          (activeCategory === "Collectifs" && isCollective)
        ) {
          const dayIndex = sDate.getDay();
          const dayName = DAY_MAP_FR[dayIndex];
          if (dayName && grouped[dayName]) {
            grouped[dayName].push(s);
          }
        }
      }
    }

    // Trier les séances de chaque jour par heure de début
    for (const day of DAYS_ORDER) {
      grouped[day].sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
    }

    return grouped;
  }, [availableSessions, activeMonday, activeCategory]);

  // Jours ayant au moins une séance
  const activeDaysWithSessions = DAYS_ORDER.filter(
    (day) => weekSessionsByDay[day].length > 0
  );

  const daysToRender = activeDay === "Tous" ? activeDaysWithSessions : [activeDay as DayName];

  // Gestion du clic de réservation
  const handleBookSession = (session: ClassSession, dayName: string, timeFormatted: string) => {
    if (!hasSmallGroupAccess) return;
    if (session.is_active === false) return;

    openBookingConfirm({
      discipline: session.name,
      sessionType: "Small Group",
      day: dayName,
      time: timeFormatted,
      level: session.level || "Tous niveaux",
      classSessionId: session.id, // Transmission obligatoire du véritable UUID
    });
  };

  const isBooked = (session: ClassSession) => {
    return userBookings.some((b) => b.classSessionId === session.id);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6 pt-2">
      
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-heading font-black uppercase tracking-wider text-brand-white">
          Planning des cours
        </h1>
        <p className="text-xs sm:text-sm text-brand-white/50">
          Consultez les créneaux officiels de la semaine et réservez vos séances Small Group.
        </p>
      </div>

      {/* Week Selector Nav */}
      <div className="bg-[#0b1322] border border-brand-white/10 rounded-xl p-3 sm:p-4 flex items-center justify-between shadow-lg">
        <button
          onClick={() => setSelectedWeekIndex((prev) => Math.max(0, prev - 1))}
          disabled={selectedWeekIndex === 0}
          className="p-2 rounded-lg bg-brand-white/5 hover:bg-brand-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-brand-white transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold uppercase"
        >
          <ChevronLeft size={16} />
          <span className="hidden sm:inline">Précédente</span>
        </button>

        <div className="text-center">
          <span className="text-[10px] font-bold uppercase tracking-widest text-brand-blue block">
            Semaine {selectedWeekIndex + 1} / {weeksList.length}
          </span>
          <span className="text-sm sm:text-base font-heading font-bold uppercase tracking-wider text-brand-white">
            {weekLabel}
          </span>
        </div>

        <button
          onClick={() => setSelectedWeekIndex((prev) => Math.min(weeksList.length - 1, prev + 1))}
          disabled={selectedWeekIndex >= weeksList.length - 1}
          className="p-2 rounded-lg bg-brand-white/5 hover:bg-brand-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-brand-white transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold uppercase"
        >
          <span className="hidden sm:inline">Suivante</span>
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Category Tabs: SMALL GROUP vs COLLECTIFS */}
      <div className="bg-[#0f172a] p-1 rounded-xl border border-brand-white/10 flex">
        <button
          onClick={() => {
            setActiveCategory("Small Group");
            setActiveDay("Tous");
          }}
          className={cn(
            "flex-1 py-3 px-4 rounded-lg font-heading font-bold text-xs sm:text-sm uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center gap-2",
            activeCategory === "Small Group"
              ? "bg-brand-blue text-brand-black shadow-lg shadow-brand-blue/20"
              : "text-brand-white/60 hover:text-brand-white"
          )}
        >
          <Users size={16} />
          SMALL GROUP (20 PLACES)
        </button>

        <button
          onClick={() => {
            setActiveCategory("Collectifs");
            setActiveDay("Tous");
          }}
          className={cn(
            "flex-1 py-3 px-4 rounded-lg font-heading font-bold text-xs sm:text-sm uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center gap-2",
            activeCategory === "Collectifs"
              ? "bg-brand-blue text-brand-black shadow-lg shadow-brand-blue/20"
              : "text-brand-white/60 hover:text-brand-white"
          )}
        >
          <Calendar size={16} />
          COLLECTIFS (ACCÈS LIBRE)
        </button>
      </div>

      {/* Notice Banner */}
      {activeCategory === "Small Group" ? (
        hasSmallGroupAccess ? (
          <div className="bg-brand-blue/10 border border-brand-blue/20 rounded-lg p-3.5 flex items-center gap-3 text-xs text-brand-blue">
            <ShieldCheck size={18} className="shrink-0" />
            <span>
              <strong>Small Group (capacité max 20 pers.) :</strong> Réservation requise pour garantir votre place. Cliquez sur <strong>RÉSERVER</strong>.
            </span>
          </div>
        ) : (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3.5 flex items-center gap-3 text-xs text-amber-300">
            <Lock size={18} className="shrink-0 text-amber-400" />
            <span>
              <strong>Formule Collectif :</strong> Votre formule actuelle vous donne accès libre aux cours Collectifs. Pour réserver des créneaux Small Group, souscrivez à la formule Small Group.
            </span>
          </div>
        )
      ) : (
        <div className="bg-brand-white/5 border border-brand-white/10 rounded-lg p-3.5 flex items-center gap-3 text-xs text-brand-white/70">
          <Info size={18} className="shrink-0 text-brand-white/50" />
          <span>
            <strong>Cours Collectifs :</strong> En accès libre pour tous les membres actifs du club. Aucune réservation nécessaire.
          </span>
        </div>
      )}

      {/* Days Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveDay("Tous")}
          className={cn(
            "px-4 py-1.5 rounded-full text-xs font-heading font-bold uppercase tracking-wider transition-all cursor-pointer",
            activeDay === "Tous"
              ? "bg-brand-blue text-brand-black"
              : "bg-brand-white/5 text-brand-white/60 hover:bg-brand-white/10 hover:text-brand-white border border-brand-white/10"
          )}
        >
          Tous les jours
        </button>

        {DAYS_ORDER.map((day) => {
          const count = weekSessionsByDay[day].length;
          return (
            <button
              key={day}
              onClick={() => setActiveDay(day)}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-heading font-bold uppercase tracking-wider transition-all cursor-pointer",
                activeDay === day
                  ? "bg-brand-blue text-brand-black"
                  : count > 0
                  ? "bg-brand-white/5 text-brand-white/60 hover:bg-brand-white/10 hover:text-brand-white border border-brand-white/10"
                  : "bg-brand-white/5 text-brand-white/20 border border-brand-white/5 cursor-not-allowed"
              )}
            >
              {day} {count > 0 ? `(${count})` : ""}
            </button>
          );
        })}
      </div>

      {/* Schedule Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${activeCategory}-${activeDay}-${selectedWeekIndex}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          {daysToRender.length === 0 ? (
            <div className="bg-[#0f172a]/60 border border-brand-white/10 border-dashed rounded-xl p-12 text-center space-y-3">
              <Calendar size={32} className="mx-auto text-brand-white/30" />
              <p className="text-sm font-heading font-bold uppercase text-brand-white/70">
                Aucune séance programmée pour cette période.
              </p>
            </div>
          ) : (
            daysToRender.map((day) => {
              const sessions = weekSessionsByDay[day];
              if (!sessions || sessions.length === 0) return null;

              return (
                <div key={day} className="space-y-3">
                  {/* Day Header */}
                  <div className="flex items-center gap-2 border-b border-brand-white/10 pb-2">
                    <span className="w-1.5 h-4 bg-brand-blue rounded-full" />
                    <h2 className="text-xl font-heading font-bold uppercase tracking-wider text-brand-white">
                      {day}
                    </h2>
                    <span className="text-xs text-brand-white/40 ml-auto font-semibold">
                      {sessions.length} {sessions.length === 1 ? "créneau" : "créneaux"}
                    </span>
                  </div>

                  {/* Sessions List */}
                  <div className="space-y-2.5">
                    {sessions.map((session) => {
                      const startDate = new Date(session.starts_at);
                      const endDate = session.ends_at ? new Date(session.ends_at) : null;

                      const startH = String(startDate.getHours()).padStart(2, "0");
                      const startM = String(startDate.getMinutes()).padStart(2, "0");
                      const timeStr = endDate
                        ? `${startH}:${startM} – ${String(endDate.getHours()).padStart(2, "0")}:${String(endDate.getMinutes()).padStart(2, "0")}`
                        : `${startH}:${startM}`;

                      const booked = isBooked(session);
                      const isCancelled = session.is_active === false;

                      return (
                        <div
                          key={session.id}
                          className={cn(
                            "border rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-200",
                            isCancelled
                              ? "bg-[#0f172a]/40 border-red-500/20 opacity-60"
                              : "bg-[#0f172a] hover:bg-[#162032] border-brand-white/10"
                          )}
                        >
                          {/* Course Info */}
                          <div className="space-y-1">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <span
                                className={cn(
                                  "text-base sm:text-lg font-heading font-bold uppercase tracking-wide",
                                  isCancelled ? "text-brand-white/50 line-through" : "text-brand-white"
                                )}
                              >
                                {session.name}
                              </span>
                              {session.level && (
                                <span
                                  className={cn(
                                    "text-[10px] font-bold uppercase px-2 py-0.5 rounded border tracking-wider",
                                    getBadgeColor(session.level)
                                  )}
                                >
                                  {session.level}
                                </span>
                              )}
                              {isCancelled && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                                  <Ban size={10} />
                                  Annulé
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3 text-xs text-brand-white/60">
                              <span className="flex items-center gap-1 font-bold text-[#00d8ff]">
                                <Clock size={13} />
                                {timeStr}
                              </span>
                              {activeCategory === "Small Group" && (
                                <span className="text-brand-white/40">
                                  • Effectif max 20 pers.
                                </span>
                              )}
                            </div>
                          </div>

                          {/* CTA Actions */}
                          {activeCategory === "Small Group" && (
                            <div className="flex items-center justify-end">
                              {isCancelled ? (
                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-sm text-xs font-semibold uppercase">
                                  Séance non disponible
                                </div>
                              ) : booked ? (
                                <div className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#22c55e]/15 border border-[#22c55e]/30 text-[#22c55e] rounded-sm text-xs font-bold uppercase tracking-wider">
                                  <Check size={14} />
                                  Inscription active
                                </div>
                              ) : hasSmallGroupAccess ? (
                                <button
                                  type="button"
                                  onClick={() => handleBookSession(session, day, timeStr)}
                                  className="w-full sm:w-auto px-5 py-2.5 bg-brand-blue hover:bg-brand-white text-brand-black font-heading font-bold text-xs uppercase tracking-wider rounded-sm transition-all cursor-pointer shadow-md shadow-brand-blue/20 hover:shadow-none"
                                >
                                  RÉSERVER
                                </button>
                              ) : (
                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-white/5 border border-brand-white/10 text-brand-white/40 rounded-sm text-xs font-medium uppercase tracking-wider">
                                  <Lock size={12} />
                                  Formule Small Group requise
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </motion.div>
      </AnimatePresence>

    </div>
  );
}
