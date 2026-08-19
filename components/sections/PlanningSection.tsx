"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
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

const scheduleData: Record<Category, Record<Day, Course[]>> = {
  "Small Group": {
    Lundi: [
      { name: "Boxing Bag", level: "Fondamentaux", time: "07:00" },
      { name: "Kick Boxing", level: "Fondamentaux", time: "11:00" },
      { name: "KB Shred", level: "Performance", time: "12:15" },
    ],
    Mardi: [
      { name: "KB Shred", level: "Performance", time: "11:00" },
      { name: "Striking", level: "Fondamentaux", time: "12:15" },
      { name: "Kick Boxing", level: "Fondamentaux", time: "17:00" },
      { name: "Lady Striking", level: "Fondamentaux", time: "18:00" },
      { name: "Boxe Thaï", level: "Performance", time: "20:00" },
    ],
    Mercredi: [
      { name: "Boxing Bag", level: "Performance", time: "07:00" },
      { name: "Kick Boxing", level: "Fondamentaux", time: "11:00" },
      { name: "KB Shred", level: "Performance", time: "12:15" },
      { name: "Striking", level: "Performance", time: "18:30" },
      { name: "Boxe Thaï", level: "Fondamentaux", time: "19:30" },
      { name: "Kick Boxing", level: "Performance", time: "20:30" },
    ],
    Jeudi: [
      { name: "Boxing Bag", level: "Fondamentaux", time: "11:00" },
      { name: "Striking", level: "Performance", time: "12:15" },
      { name: "Lady Striking", level: "100% féminin", time: "17:30" },
      { name: "Kick Boxing", level: "Fondamentaux", time: "19:30" },
      { name: "Boxe Thaï", level: "Performance", time: "20:30" },
    ],
    Vendredi: [
      { name: "Boxing Bag", level: "Performance", time: "07:00" },
      { name: "Boxe Thaï", level: "Performance", time: "17:00" },
      { name: "Striking", level: "Fondamentaux", time: "18:00" },
      { name: "Kick Boxing", level: "Performance", time: "19:30" },
    ],
    Samedi: [
      { name: "Kick Boxing", level: "Sparring guidé", time: "11:00" },
      { name: "Lady Striking", level: "Sparring guidé", time: "12:00" },
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
const categories: Category[] = ["Small Group", "Collectifs"];

function getBadgeColor(level?: string) {
  if (!level) return "bg-gray-500";
  const lvl = level.toLowerCase();
  if (lvl.includes("fondament")) return "bg-[#22c55e]"; // Green
  if (lvl.includes("performance")) return "bg-[#3b82f6]"; // Blue
  if (lvl.includes("sparring")) return "bg-[#ef4444]"; // Red
  if (lvl.includes("femme") || lvl.includes("féminin") || lvl.includes("feminin")) return "bg-pink-500";
  if (lvl.includes("tous niveaux")) return "bg-[#22c55e]"; // Green
  if (lvl.includes("élite") || lvl.includes("elite")) return "bg-purple-500";
  return "bg-gray-500";
}

export default function PlanningSection() {
  const [activeCategory, setActiveCategory] = useState<Category>("Collectifs");
  const [activeDay, setActiveDay] = useState<DayFilter>("Tous");

  // Jours ayant au moins un créneau dans la catégorie active
  const activeDays = days.filter(
    (day) => scheduleData[activeCategory][day].length > 0
  );

  const daysToRender = activeDay === "Tous" ? activeDays : [activeDay as Day];

  return (
    <section className="pt-8 pb-24 bg-[#0a1120] font-sans">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-4xl md:text-5xl font-black text-[#00d8ff] uppercase tracking-wide">
            PLANNING DES COURS
          </h2>
        </div>

        {/* Category Tabs */}
        <div className="flex justify-center mb-8">
          <div className="flex bg-[#2a3441] rounded-lg p-1 w-full max-w-2xl">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => {
                  setActiveCategory(category);
                  setActiveDay("Tous");
                }}
                className={cn(
                  "flex-1 py-3 rounded-md text-sm md:text-base font-bold transition-all duration-300",
                  activeCategory === category
                    ? "bg-[#00d8ff] text-white shadow-md"
                    : "text-gray-300 hover:text-white"
                )}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Days Filter — n'affiche que les jours ayant des cours dans la catégorie active */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          <button
            onClick={() => setActiveDay("Tous")}
            className={cn(
              "px-5 py-2 rounded-full text-sm font-bold transition-all duration-300",
              activeDay === "Tous"
                ? "bg-[#00d8ff] text-white"
                : "bg-[#334155] text-gray-300 hover:bg-[#475569]"
            )}
          >
            Tous
          </button>
          {activeDays.map((day) => (
            <button
              key={day}
              onClick={() => setActiveDay(day)}
              className={cn(
                "px-5 py-2 rounded-full text-sm font-bold transition-all duration-300",
                activeDay === day
                  ? "bg-[#00d8ff] text-white"
                  : "bg-[#334155] text-gray-300 hover:bg-[#475569]"
              )}
            >
              {day}
            </button>
          ))}
        </div>

        {/* Schedule Content */}
        <div className="min-h-[400px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeCategory}-${activeDay}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-10"
            >
              {daysToRender.map((day) => {
                const courses = scheduleData[activeCategory][day];
                if (!courses || courses.length === 0) return null;

                return (
                  <div key={day} className="space-y-4">
                    {/* Day Header */}
                    <div className="border-b-2 border-[#00d8ff] pb-2 mb-4">
                      <h3 className="text-2xl font-bold text-white">{day}</h3>
                    </div>

                    {/* Course Cards */}
                    <div className="space-y-3">
                      {courses.map((course, idx) => (
                        <div
                          key={idx}
                          className="bg-[#2a3441] rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between shadow-lg"
                        >
                          <div className="mb-2 md:mb-0 flex flex-col">
                            <div className="flex items-center gap-3 mb-1">
                              <span className="text-lg font-bold text-white">{course.name}</span>
                              {course.level && (
                                <span className={cn(
                                  "text-[10px] font-bold text-white px-2 py-0.5 rounded-full uppercase tracking-wider",
                                  getBadgeColor(course.level)
                                )}>
                                  {course.level}
                                </span>
                              )}
                            </div>
                            <span className="text-[#00d8ff] font-medium">{course.time}</span>
                          </div>
                          
                          {course.places && (
                            <div className="flex items-center mt-2 md:mt-0">
                              <span className="text-[#22c55e] font-bold text-sm">
                                {course.places} places
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>

      </div>
    </section>
  );
}
