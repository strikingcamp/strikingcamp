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
  places: string;
};

const scheduleData: Record<Category, Record<Day, Course[]>> = {
  "Small Group": {
    Lundi: [
      { name: "Boxe Anglaise", time: "09:00 - 09:45", places: "2/5" },
      { name: "Pieds Poings", time: "10:00 - 10:45", places: "3/5" },
      { name: "KB Shred", time: "12:15 - 13:00", places: "4/5" },
      { name: "Boxe Anglaise", time: "15:00 - 15:45", places: "1/5" },
      { name: "Pieds Poings", time: "16:00 - 16:45", places: "2/5" },
      { name: "Boxe Anglaise", time: "20:30 - 21:15", places: "4/5" },
    ],
    Mardi: [
      { name: "Pieds Poings", time: "10:00 - 10:45", places: "3/5" },
      { name: "KB Shred", time: "12:15 - 13:00", places: "5/5" },
      { name: "Boxe Anglaise", time: "15:00 - 15:45", places: "2/5" },
      { name: "Pieds Poings", time: "16:45 - 17:30", places: "3/5" },
      { name: "Lady Boxing", time: "17:30 - 18:15", places: "1/5" },
      { name: "Pieds Poings", time: "21:00 - 21:45", places: "4/5" },
    ],
    Mercredi: [
      { name: "Boxe Anglaise", time: "12:15 - 13:00", places: "3/5" },
      { name: "Pieds Poings", time: "15:00 - 15:45", places: "2/5" },
      { name: "KB Shred", time: "16:00 - 16:45", places: "4/5" },
      { name: "Lady Boxing", time: "16:45 - 17:30", places: "1/5" },
      { name: "Pieds Poings", time: "17:30 - 18:15", places: "3/5" },
      { name: "Boxe Anglaise", time: "21:00 - 21:45", places: "2/5" },
    ],
    Jeudi: [
      { name: "Pieds Poings", time: "09:00 - 09:45", places: "2/5" },
      { name: "Boxe Anglaise", time: "10:00 - 10:45", places: "3/5" },
      { name: "KB Shred", time: "12:15 - 13:00", places: "4/5" },
      { name: "Pieds Poings", time: "15:00 - 15:45", places: "1/5" },
      { name: "Boxe Anglaise", time: "16:00 - 16:45", places: "2/5" },
      { name: "Lady Boxing", time: "17:00 - 17:45", places: "3/5" },
      { name: "Pieds Poings", time: "20:30 - 21:15", places: "5/5" },
    ],
    Vendredi: [
      { name: "KB Shred", time: "09:00 - 09:45", places: "4/5" },
      { name: "Pieds Poings", time: "10:00 - 10:45", places: "2/5" },
      { name: "Boxe Anglaise", time: "15:00 - 15:45", places: "1/5" },
      { name: "Pieds Poings", time: "16:00 - 16:45", places: "3/5" },
      { name: "Boxe Anglaise", time: "17:15 - 18:00", places: "2/5" },
      { name: "KB Shred", time: "21:00 - 21:45", places: "4/5" },
    ],
    Samedi: [
      { name: "KB Shred", time: "08:00 - 08:45", places: "5/5" },
      { name: "Pieds Poings", time: "08:45 - 09:30", places: "3/5" },
      { name: "Boxe Anglaise", time: "09:30 - 10:15", places: "2/5" },
    ],
  },
  "Collectifs": {
    Lundi: [
      { name: "Pieds-Poings", level: "Fondamental", time: "11:00 - 12:00", places: "12/20" },
      { name: "Striking", level: "Tous niveaux", time: "12:15 - 13:15", places: "15/20" },
      { name: "Pieds-Poings", level: "Tous niveaux", time: "20:30 - 21:30", places: "18/20" },
    ],
    Mardi: [
      { name: "Boxe Thaï", level: "Fondamental", time: "11:00 - 12:00", places: "10/20" },
      { name: "Pieds-Poings", level: "100% Femme", time: "17:30 - 18:30", places: "16/20" },
      { name: "Striking", level: "Tous niveaux", time: "20:00 - 21:00", places: "19/20" },
    ],
    Mercredi: [
      { name: "Kick Boxing", level: "Ados (11-15 ans)", time: "10:00 - 11:00", places: "7/20" },
      { name: "Pieds-Poings", level: "Fondamental", time: "11:00 - 12:00", places: "11/20" },
    ],
    Jeudi: [
      { name: "Boxe Thaï", level: "Tous niveaux", time: "11:00 - 12:00", places: "9/20" },
      { name: "Striking", level: "Élite", time: "12:15 - 13:15", places: "14/20" },
      { name: "Pieds-Poings", level: "Fondamental", time: "19:30 - 20:30", places: "20/20" },
    ],
    Vendredi: [
      { name: "Boxe Thaï", level: "100% Femme", time: "17:00 - 18:00", places: "13/20" },
      { name: "Pieds-Poings", level: "Tous niveaux", time: "18:00 - 19:00", places: "17/20" },
      { name: "Striking", level: "Élite", time: "19:00 - 20:00", places: "15/20" },
    ],
    Samedi: [
      { name: "Kick Boxing", level: "Ados (11-15 ans)", time: "10:00 - 11:00", places: "8/20" },
      { name: "Sparring", level: "Élite", time: "12:00 - 13:30", places: "10/20" },
    ],
  },
};

const days: Day[] = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const categories: Category[] = ["Small Group", "Collectifs"];

function getBadgeColor(level?: string) {
  if (!level) return "bg-gray-500";
  if (level.toLowerCase().includes("fondamental")) return "bg-[#3b82f6]"; // Blue
  if (level.toLowerCase().includes("tous niveaux")) return "bg-[#22c55e]"; // Green
  if (level.toLowerCase().includes("femme")) return "bg-pink-500";
  if (level.toLowerCase().includes("élite")) return "bg-purple-500";
  return "bg-gray-500";
}

export default function PlanningSection() {
  const [activeCategory, setActiveCategory] = useState<Category>("Collectifs");
  const [activeDay, setActiveDay] = useState<DayFilter>("Tous");

  const daysToRender = activeDay === "Tous" ? days : [activeDay as Day];

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
                onClick={() => setActiveCategory(category)}
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

        {/* Days Filter */}
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
          {days.map((day) => (
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
                          
                          <div className="flex items-center mt-2 md:mt-0">
                            <span className="text-[#22c55e] font-bold text-sm">
                              {course.places} places
                            </span>
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

      </div>
    </section>
  );
}
