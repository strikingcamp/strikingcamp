"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import AdminOverviewTab from "./defis/AdminOverviewTab";
import AdminRecipesTab from "./defis/AdminRecipesTab";
import AdminProgramsTab from "./defis/AdminProgramsTab";
import AdminKbShredTab from "./defis/AdminKbShredTab";
import AdminPlansTab from "./defis/AdminPlansTab";
import AdminNutritionSettingsTab from "./defis/AdminNutritionSettingsTab";
import AdminChallengesTab from "./defis/AdminChallengesTab";
import { cn } from "@/lib/utils";

type AdminDefisTab =
  | "overview"
  | "recipes"
  | "programs"
  | "kb_shred"
  | "plans"
  | "nutrition_settings"
  | "challenges";

export default function AdminDefisView() {
  const [activeTab, setActiveTab] = useState<AdminDefisTab>("overview");

  const tabs = [
    { id: "overview" as AdminDefisTab, label: "Vue d'ensemble" },
    { id: "recipes" as AdminDefisTab, label: "Recettes" },
    { id: "programs" as AdminDefisTab, label: "Programmes" },
    { id: "kb_shred" as AdminDefisTab, label: "KB SHRED" },
    { id: "plans" as AdminDefisTab, label: "Offres Premium" },
    { id: "nutrition_settings" as AdminDefisTab, label: "Paramètres Nutrition" },
    { id: "challenges" as AdminDefisTab, label: "Défis V1" },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* En-tête Administration */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="inline-flex items-center px-3 py-1 bg-white/10 border border-white/15 rounded-full text-[#F8F9ED] text-[11px] font-bold uppercase tracking-widest mb-2">
            Module Striking Performance & Défis
          </div>
          <h1 className="text-3xl sm:text-4xl font-heading font-black uppercase text-white tracking-wide">
            Administration <span className="text-[#F8F9ED]">Défis & Progression</span>
          </h1>
          <p className="text-xs sm:text-sm text-white/60 mt-1">
            Gestion centralisée du catalogue nutritionnel, programmes d'entraînement, offres commerciales et paramétrage du moteur.
          </p>
        </div>
      </div>

      {/* Barre d'onglets de navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-white/10 no-scrollbar">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-2.5 rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer border shrink-0",
                isActive
                  ? "bg-[#5E4075] text-white border-[#5E4075] shadow-lg font-black"
                  : "bg-black text-white/70 border-white/10 hover:border-white/20 hover:text-white"
              )}
            >
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Contenu de l'onglet actif */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === "overview" && (
          <AdminOverviewTab onNavigateTab={(t) => setActiveTab(t as AdminDefisTab)} />
        )}
        {activeTab === "recipes" && <AdminRecipesTab />}
        {activeTab === "programs" && <AdminProgramsTab />}
        {activeTab === "kb_shred" && (
          <AdminKbShredTab onNavigateTab={(t) => setActiveTab(t as AdminDefisTab)} />
        )}
        {activeTab === "plans" && <AdminPlansTab />}
        {activeTab === "nutrition_settings" && <AdminNutritionSettingsTab />}
        {activeTab === "challenges" && <AdminChallengesTab />}
      </motion.div>
    </div>
  );
}
