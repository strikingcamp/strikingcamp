"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Users, Info, ShieldCheck, Check, Clock } from "lucide-react";
import { useMember } from "./MemberContext";
import { cn } from "@/lib/utils";

type Category = "Small Group" | "Collectifs";
type Day = "Lundi" | "Mardi" | "Mercredi" | "Jeudi" | "Vendredi" | "Samedi";
type DayFilter = "Tous" | Day;

type Course = {
  name: string;
  level?: string;
  time: string;
  places?: string;
};

const memberSchedule: Record<Category, Record<Day, Course[]>> = {
  "Small Group": {
    Lundi: [
      { name: "Boxing Bag", level: "Fondamentaux", time: "07:00", places: "8" },
      { name: "Kick Boxing", level: "Fondamentaux", time: "11:00", places: "8" },
      { name: "KB Shred", level: "Performance", time: "12:15", places: "8" },
    ],
    Mardi: [
      { name: "KB Shred", level: "Performance", time: "11:00", places: "8" },
      { name: "Striking", level: "Fondamentaux", time: "12:15", places: "8" },
      { name: "Kick Boxing", level: "Fondamentaux", time: "17:00", places: "8" },
      { name: "Lady Striking", level: "Fondamentaux", time: "18:00", places: "8" },
      { name: "Boxe Thaï", level: "Performance", time: "20:00", places: "8" },
    ],
    Mercredi: [
      { name: "Boxing Bag", level: "Performance", time: "07:00", places: "8" },
      { name: "Kick Boxing", level: "Fondamentaux", time: "11:00", places: "8" },
      { name: "KB Shred", level: "Performance", time: "12:15", places: "8" },
      { name: "Striking", level: "Performance", time: "18:30", places: "8" },
      { name: "Boxe Thaï", level: "Fondamentaux", time: "19:30", places: "8" },
      { name: "Kick Boxing", level: "Performance", time: "20:30", places: "8" },
    ],
    Jeudi: [
      { name: "Boxing Bag", level: "Fondamentaux", time: "11:00", places: "8" },
      { name: "Striking", level: "Performance", time: "12:15", places: "8" },
      { name: "Lady Striking", level: "100% féminin", time: "17:30", places: "8" },
      { name: "Kick Boxing", level: "Fondamentaux", time: "19:30", places: "8" },
      { name: "Boxe Thaï", level: "Performance", time: "20:30", places: "8" },
    ],
    Vendredi: [
      { name: "Boxing Bag", level: "Performance", time: "07:00", places: "8" },
      { name: "Boxe Thaï", level: "Performance", time: "17:00", places: "8" },
      { name: "Striking", level: "Fondamentaux", time: "18:00", places: "8" },
      { name: "Kick Boxing", level: "Performance", time: "19:30", places: "8" },
    ],
    Samedi: [
      { name: "Kick Boxing", level: "Sparring guidé", time: "11:00", places: "8" },
      { name: "Lady Striking", level: "Sparring guidé", time: "12:00", places: "8" },
    ],
  },
  "Collectifs": {
    Lundi: [],
    Mardi: [
      { name: "Kick Boxing", level: "Fondamentaux", time: "19:00" },
    ],
    Mercredi: [
      { name: "Kick Boxing", level: "Performance", time: "17:30" },
    ],
    Jeudi: [
      { name: "Kick Boxing", level: "Fondamentaux", time: "18:30" },
    ],
    Vendredi: [],
    Samedi: [
      { name: "Kick Boxing", level: "Sparring guidé", time: "11:00" },
    ],
  },
};

const days: Day[] = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

function getBadgeColor(level?: string) {
  if (!level) return "bg-gray-500/20 text-gray-300 border-gray-500/30";
  const lvl = level.toLowerCase();
  if (lvl.includes("fondament")) return "bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/30";
  if (lvl.includes("performance")) return "bg-[#3b82f6]/15 text-[#3b82f6] border-[#3b82f6]/30";
  if (lvl.includes("sparring")) return "bg-[#ef4444]/15 text-[#ef4444] border-[#ef4444]/30";
  if (lvl.includes("femme") || lvl.includes("féminin")) return "bg-pink-500/15 text-pink-400 border-pink-500/30";
  return "bg-brand-blue/15 text-brand-blue border-brand-blue/30";
}

export default function MemberPlanningView() {
  const [activeCategory, setActiveCategory] = useState<Category>("Small Group");
  const [activeDay, setActiveDay] = useState<DayFilter>("Tous");
  const { openBookingConfirm, userBookings } = useMember();

  const activeDays = days.filter(
    (day) => memberSchedule[activeCategory][day].length > 0
  );

  const daysToRender = activeDay === "Tous" ? activeDays : [activeDay as Day];

  const handleBook = (day: string, course: Course) => {
    openBookingConfirm({
      discipline: course.name,
      sessionType: "Small Group",
      day,
      time: course.time,
      level: course.level,
    });
  };

  const isAlreadyBooked = (day: string, time: string, discipline: string) => {
    return userBookings.some(
      (b) => b.day === day && b.time === time && b.discipline === discipline
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6 pt-2">
      
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-heading font-black uppercase tracking-wider text-brand-white">
          Planning des cours
        </h1>
        <p className="text-xs sm:text-sm text-brand-white/50">
          Consultez les créneaux de la semaine et réservez vos séances Small Group.
        </p>
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
          SMALL GROUP
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
          COLLECTIFS
        </button>
      </div>

      {/* Notice Banner */}
      {activeCategory === "Small Group" ? (
        <div className="bg-brand-blue/10 border border-brand-blue/20 rounded-lg p-3.5 flex items-center gap-3 text-xs text-brand-blue">
          <ShieldCheck size={18} className="shrink-0" />
          <span>
            <strong>Small Group (max 8 pers.) :</strong> Réservation obligatoire pour garantir votre place. Cliquez sur <strong>RÉSERVER</strong>.
          </span>
        </div>
      ) : (
        <div className="bg-brand-white/5 border border-brand-white/10 rounded-lg p-3.5 flex items-center gap-3 text-xs text-brand-white/70">
          <Info size={18} className="shrink-0 text-brand-white/50" />
          <span>
            <strong>Cours Collectifs :</strong> Accès libre selon votre formule. Aucune réservation nécessaire.
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

        {activeDays.map((day) => (
          <button
            key={day}
            onClick={() => setActiveDay(day)}
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-heading font-bold uppercase tracking-wider transition-all cursor-pointer",
              activeDay === day
                ? "bg-brand-blue text-brand-black"
                : "bg-brand-white/5 text-brand-white/60 hover:bg-brand-white/10 hover:text-brand-white border border-brand-white/10"
            )}
          >
            {day}
          </button>
        ))}
      </div>

      {/* Schedule Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${activeCategory}-${activeDay}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
          className="space-y-6"
        >
          {daysToRender.map((day) => {
            const courses = memberSchedule[activeCategory][day];
            if (!courses || courses.length === 0) return null;

            return (
              <div key={day} className="space-y-3">
                {/* Day Header */}
                <div className="flex items-center gap-2 border-b border-brand-white/10 pb-2">
                  <span className="w-1.5 h-4 bg-brand-blue rounded-full" />
                  <h2 className="text-xl font-heading font-bold uppercase tracking-wider text-brand-white">
                    {day}
                  </h2>
                  <span className="text-xs text-brand-white/40 ml-auto font-semibold">
                    {courses.length} {courses.length === 1 ? "créneau" : "créneaux"}
                  </span>
                </div>

                {/* Courses List */}
                <div className="space-y-2.5">
                  {courses.map((course, idx) => {
                    const booked = isAlreadyBooked(day, course.time, course.name);

                    return (
                      <div
                        key={idx}
                        className="bg-[#0f172a] hover:bg-[#162032] border border-brand-white/10 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-200"
                      >
                        {/* Course Info */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="text-base sm:text-lg font-heading font-bold uppercase tracking-wide text-brand-white">
                              {course.name}
                            </span>
                            {course.level && (
                              <span
                                className={cn(
                                  "text-[10px] font-bold uppercase px-2 py-0.5 rounded border tracking-wider",
                                  getBadgeColor(course.level)
                                )}
                              >
                                {course.level}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-brand-white/60">
                            <span className="flex items-center gap-1 font-bold text-[#00d8ff]">
                              <Clock size={13} />
                              {course.time}
                            </span>
                            {activeCategory === "Small Group" && (
                              <span className="text-brand-white/40">
                                • Effectif max 8 pers.
                              </span>
                            )}
                          </div>
                        </div>

                        {/* CTA: ONLY FOR SMALL GROUP */}
                        {activeCategory === "Small Group" && (
                          <div className="flex items-center justify-end">
                            {booked ? (
                              <div className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#22c55e]/15 border border-[#22c55e]/30 text-[#22c55e] rounded-sm text-xs font-bold uppercase tracking-wider">
                                <Check size={14} />
                                Inscription active
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleBook(day, course)}
                                className="w-full sm:w-auto px-5 py-2.5 bg-brand-blue hover:bg-brand-white text-brand-black font-heading font-bold text-xs uppercase tracking-wider rounded-sm transition-all cursor-pointer shadow-md shadow-brand-blue/20 hover:shadow-none"
                              >
                                RÉSERVER
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </motion.div>
      </AnimatePresence>

    </div>
  );
}
