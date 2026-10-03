"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  RefreshCw,
  Plus,
} from "lucide-react";
import { getAdminDefisOverviewAction, DefisOverviewStats } from "@/app/(admin)/admin/defis/actions";

interface AdminOverviewTabProps {
  onNavigateTab: (tabId: string) => void;
}

export default function AdminOverviewTab({ onNavigateTab }: AdminOverviewTabProps) {
  const [stats, setStats] = useState<DefisOverviewStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setIsLoading(true);
    setError(null);
    const res = await getAdminDefisOverviewAction();
    if (res.success && res.data) {
      setStats(res.data);
    } else {
      setError(res.error || "Impossible de charger les statistiques.");
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const kpis = [
    {
      title: "Recettes Référencées",
      value: stats ? `${stats.totalActiveRecipes} / ${stats.totalRecipes}` : "—",
      sub: `${stats?.totalActiveRecipes || 0} actives au catalogue`,
      tab: "recipes",
    },
    {
      title: "Programmes d'Entraînement",
      value: stats ? `${stats.totalActivePrograms} / ${stats.totalPrograms}` : "—",
      sub: "Maison, Salle & KB SHRED",
      tab: "programs",
    },
    {
      title: "Offres & Formules",
      value: stats ? `${stats.totalPlans}` : "—",
      sub: "Formules digitales & club",
      tab: "plans",
    },
    {
      title: "Profils Fitness Actifs",
      value: stats ? `${stats.totalActiveProfiles}` : "—",
      sub: "Membres avec objectifs définis",
      tab: "members",
    },
    {
      title: "Pesées Enregistrées",
      value: stats ? `${stats.totalWeightLogs}` : "—",
      sub: "Points sur les courbes de poids",
      tab: "members",
    },
    {
      title: "Repas Journalisés",
      value: stats ? `${stats.totalFoodLogs}` : "—",
      sub: "Entrées dans les journaux alimentaires",
      tab: "members",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header avec action de rafraîchissement */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-heading font-black uppercase text-white tracking-wider">
            Vue d'Ensemble — Plateforme Défis & Progression
          </h2>
          <p className="text-xs sm:text-sm text-white/60">
            Supervision globale du contenu digital, des offres commerciales et de l'engagement des membres.
          </p>
        </div>

        <button
          onClick={fetchStats}
          disabled={isLoading}
          className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
          <span>Actualiser</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-3">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Cartes KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((kpi, idx) => {
          return (
            <motion.div
              key={kpi.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => onNavigateTab(kpi.tab)}
              className="p-5 rounded-2xl bg-black border border-white/10 hover:border-[#5E4075] transition-all cursor-pointer group space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">
                  {kpi.title}
                </span>
                <div className="w-2 h-2 rounded-full bg-[#5E4075]" />
              </div>

              <div className="space-y-0.5">
                <div className="text-2xl sm:text-3xl font-heading font-black text-white group-hover:text-[#F8F9ED] transition-colors">
                  {isLoading ? "..." : kpi.value}
                </div>
                <p className="text-[11px] text-white/40">{kpi.sub}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Raccourcis d'administration */}
      <div className="p-6 rounded-2xl bg-black border border-white/10 space-y-4">
        <h3 className="text-sm font-heading font-bold uppercase text-white tracking-wider">
          Actions Rapides d'Administration
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => onNavigateTab("recipes")}
            className="p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-all group cursor-pointer"
          >
            <div className="text-xs font-bold text-white group-hover:text-[#F8F9ED] uppercase flex items-center gap-1.5">
              <Plus size={14} className="text-[#5E4075]" />
              <span>Gérer les Recettes</span>
            </div>
            <p className="text-[11px] text-white/50 mt-1">Créer ou éditer une recette et ses ingrédients</p>
          </button>

          <button
            onClick={() => onNavigateTab("programs")}
            className="p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-all group cursor-pointer"
          >
            <div className="text-xs font-bold text-white group-hover:text-[#F8F9ED] uppercase flex items-center gap-1.5">
              <Plus size={14} className="text-[#5E4075]" />
              <span>Gérer les Programmes</span>
            </div>
            <p className="text-[11px] text-white/50 mt-1">Structurer séances, exercices et niveaux</p>
          </button>

          <button
            onClick={() => onNavigateTab("plans")}
            className="p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-all group cursor-pointer"
          >
            <div className="text-xs font-bold text-white group-hover:text-[#F8F9ED] uppercase flex items-center gap-1.5">
              <Plus size={14} className="text-[#5E4075]" />
              <span>Offres & Tarifs</span>
            </div>
            <p className="text-[11px] text-white/50 mt-1">Configurer prix en base et entitlements</p>
          </button>

          <button
            onClick={() => onNavigateTab("nutrition_settings")}
            className="p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-all group cursor-pointer"
          >
            <div className="text-xs font-bold text-white group-hover:text-[#F8F9ED] uppercase flex items-center gap-1.5">
              <Plus size={14} className="text-[#5E4075]" />
              <span>Paramètres Nutrition</span>
            </div>
            <p className="text-[11px] text-white/50 mt-1">Ajuster formules BMR, deltas et seuils</p>
          </button>
        </div>
      </div>
    </div>
  );
}
