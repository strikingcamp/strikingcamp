"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import {
  ChevronRight,
} from "lucide-react";
import {
  UserFitnessProfile,
  WorkoutProgram,
  Recipe,
  PersonalizedWeeklyGuidance,
} from "@/lib/supabase/defis-platform";
import { DailyFoodLogSummary, WeightProgressionStats, UserWorkoutCompletionHistoryItem } from "@/lib/supabase/defis";
import { NutritionPlanResult, NutritionPlanSuccess } from "@/lib/nutrition-engine";
import { MemberDigitalEntitlementsResult } from "@/lib/access-control";
import { buildWeeklyGuidance } from "@/lib/personalization-engine";

interface TodayTabProps {
  profile: UserFitnessProfile | null;
  nutritionPlan: NutritionPlanResult | null;
  dailyFoodLog: DailyFoodLogSummary | null;
  programs?: WorkoutProgram[];
  kbShredProgram: WorkoutProgram | null;
  workoutCompletions?: UserWorkoutCompletionHistoryItem[];
  recipes?: Recipe[];
  weightStats?: WeightProgressionStats | null;
  allClubBookings?: any[];
  todayClubBookings: any[];
  entitlements: MemberDigitalEntitlementsResult;
  onNavigateTab: (tabId: string) => void;
  onOpenUpgradeModal: () => void;
  onOpenProgression?: () => void;
  onOpenChallenges?: () => void;
  guidance?: PersonalizedWeeklyGuidance | null;
}

export default function TodayTab({
  profile,
  nutritionPlan,
  dailyFoodLog,
  programs = [],
  kbShredProgram,
  workoutCompletions = [],
  recipes = [],
  weightStats = null,
  allClubBookings = [],
  todayClubBookings,
  entitlements,
  onNavigateTab,
  onOpenUpgradeModal,
  onOpenProgression,
  onOpenChallenges,
  guidance: propGuidance,
}: TodayTabProps) {
  const successPlan = nutritionPlan?.status === "success" ? (nutritionPlan as NutritionPlanSuccess) : null;

  // Calcul des calories et macros consommées
  const targetCalories = successPlan?.targetCalories.value || 2000;
  const consumedCalories = dailyFoodLog?.totalCalories || 0;
  const calPercent = Math.min(100, Math.round((consumedCalories / targetCalories) * 100));

  const targetProteins = successPlan?.macros.proteins.grams || 150;
  const consumedProteins = dailyFoodLog?.totalProteinsGrams || 0;

  const targetCarbs = successPlan?.macros.carbs.grams || 200;
  const consumedCarbs = dailyFoodLog?.totalCarbsGrams || 0;

  const targetFats = successPlan?.macros.fats.grams || 65;
  const consumedFats = dailyFoodLog?.totalFatsGrams || 0;

  // Poids et progression
  const initialWeight = weightStats?.initialWeightKg ?? profile?.current_weight_kg ?? 75;
  const currentWeight = weightStats?.currentWeightKg ?? profile?.current_weight_kg ?? 75;
  const targetWeight = weightStats?.targetWeightKg ?? profile?.target_weight_kg ?? null;
  const totalDelta = weightStats?.totalDeltaKg ?? (targetWeight ? Number((currentWeight - initialWeight).toFixed(1)) : 0);

  // Progression en % vers l'objectif
  const goalProgressPercentage = useMemo(() => {
    if (!targetWeight || initialWeight === targetWeight) return 0;
    const totalToChange = Math.abs(targetWeight - initialWeight);
    const changedSoFar = Math.abs(currentWeight - initialWeight);
    return Math.min(100, Math.max(0, Math.round((changedSoFar / totalToChange) * 100)));
  }, [initialWeight, currentWeight, targetWeight]);

  // Construction de la guidance hebdomadaire dynamique
  const guidance = useMemo(() => {
    if (propGuidance) return propGuidance;

    const targetNutrition = successPlan
      ? {
          targetCalories: successPlan.targetCalories.value,
          targetProtein: successPlan.macros.proteins.grams,
          targetCarbs: successPlan.macros.carbs.grams,
          targetFats: successPlan.macros.fats.grams,
        }
      : null;

    return buildWeeklyGuidance({
      profile,
      weightLogs: weightStats?.logs || [],
      dailyFoodLogs: dailyFoodLog ? [dailyFoodLog] : [],
      sessionCompletions: (workoutCompletions || []).map((c) => ({
        completed_at: c.completedAt,
        program_session_id: c.sessionId,
      })),
      clubBookings: allClubBookings,
      availablePrograms: programs,
      availableRecipes: recipes,
      entitlements: {
        nutrition: entitlements.canAccessNutritionEngine,
        food_log: entitlements.canLogFoodJournal,
        recipes_all: entitlements.canAccessAllRecipes,
        digital_programs: entitlements.canAccessDigitalPrograms,
        kb_shred_digital: entitlements.canAccessKBShredDigital,
        advanced_stats: entitlements.canAccessAdvancedStats,
      },
      targetNutrition,
    });
  }, [
    propGuidance,
    profile,
    weightStats,
    dailyFoodLog,
    workoutCompletions,
    allClubBookings,
    programs,
    recipes,
    entitlements,
    successPlan,
  ]);

  // Sélection du programme cible et de la prochaine séance non complétée
  const activeProgram = useMemo(() => {
    if (!profile || programs.length === 0) return kbShredProgram || null;
    return (
      programs.find(
        (p) =>
          p.location === profile.training_environment &&
          (p.primary_goal === profile.primary_goal || p.primary_goal === "both")
      ) ||
      programs.find((p) => p.location === profile.training_environment) ||
      programs.find((p) => p.primary_goal === profile.primary_goal) ||
      programs[0] ||
      kbShredProgram ||
      null
    );
  }, [profile, programs, kbShredProgram]);

  const activeSessions = activeProgram?.sessions || [];
  const completedSessionsCount = activeSessions.filter((s) => s.is_completed).length;
  const isProgramFullyCompleted = activeSessions.length > 0 && completedSessionsCount === activeSessions.length;

  // 1. Première séance non complétée
  // 2. Si tout est complété, on prend la dernière séance ou null
  const featuredSession = useMemo(() => {
    if (activeSessions.length === 0) return null;
    const firstUncompleted = activeSessions.find((s) => !s.is_completed);
    return firstUncompleted || activeSessions[activeSessions.length - 1];
  }, [activeSessions]);

  const featuredProgramTitle = activeProgram?.title || "Programme Maison";
  const hasClubSessionToday = todayClubBookings && todayClubBookings.length > 0;

  // Mini Chart Calculations
  const logs = weightStats?.logs || [];
  const chartWidth = 320;
  const chartHeight = 65;
  const padding = 10;
  const minWeight = logs.length > 0 ? Math.min(...logs.map((l) => l.weight_kg)) - 0.5 : 60;
  const maxWeight = logs.length > 0 ? Math.max(...logs.map((l) => l.weight_kg)) + 0.5 : 100;
  const range = maxWeight - minWeight || 1;

  const points = logs.slice(-7).map((log, index, arr) => {
    const x = padding + (index / Math.max(1, arr.length - 1)) * (chartWidth - padding * 2);
    const y = chartHeight - padding - ((log.weight_kg - minWeight) / range) * (chartHeight - padding * 2);
    return { x, y, weight: log.weight_kg };
  });

  const pathD = points.length > 0
    ? points.reduce((acc, pt, i) => (i === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`), "")
    : "";

  const handleOpenProgressionView = () => {
    if (onOpenProgression) onOpenProgression();
    else onNavigateTab("progression");
  };

  const handleOpenChallengesView = () => {
    if (onOpenChallenges) onOpenChallenges();
    else onNavigateTab("challenges");
  };

  const totalMealsLogged = dailyFoodLog
    ? Object.values(dailyFoodLog.meals).reduce((sum, list) => sum + list.length, 0)
    : 0;

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          1. TON OBJECTIF (CARTE COMPACTE & INTERACTIVE)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div
        onClick={() => onNavigateTab("profile")}
        className="p-5 sm:p-6 rounded-2xl bg-[#0c1322] border border-brand-white/10 hover:border-brand-blue/40 shadow-xl transition-all duration-200 cursor-pointer group space-y-3"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-heading font-black uppercase tracking-widest text-brand-blue">
            Ton Objectif
          </span>
          <div className="flex items-center gap-1 text-xs text-brand-white/40 group-hover:text-brand-white transition-colors">
            <span className="text-[11px] font-semibold uppercase">Modifier</span>
            <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
          <h2 className="text-xl sm:text-2xl font-heading font-black uppercase text-brand-white tracking-wide">
            {profile?.primary_goal === "weight_loss" && "Perte de Poids"}
            {profile?.primary_goal === "muscle_gain" && "Gain Musculaire"}
            {profile?.primary_goal === "maintenance" && "Maintien Athlétique"}
            {profile?.primary_goal === "recomposition" && "Recomposition"}
            {!profile && "Configurer mon objectif"}
          </h2>

          <div className="text-sm sm:text-base font-heading font-black text-brand-blue">
            {currentWeight} kg {targetWeight ? `→ ${targetWeight} kg` : ""}
          </div>
        </div>

        {/* Barre de progression visuelle */}
        <div className="space-y-1.5 pt-1">
          <div className="w-full h-2 bg-black/60 border border-brand-white/10 rounded-full overflow-hidden p-0.5">
            <div
              className="h-full bg-brand-blue rounded-full transition-all duration-500 shadow-sm shadow-brand-blue/50"
              style={{ width: `${goalProgressPercentage}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] font-semibold text-brand-white/50 uppercase">
            <span>Progression</span>
            <span className="font-heading font-bold text-brand-white">{goalProgressPercentage}%</span>
          </div>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          2. AUJOURD'HUI (FUSION NUTRITION & ENTRAÎNEMENT COMPACTE)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {(entitlements.canAccessNutritionEngine || entitlements.canAccessDigitalPrograms || hasClubSessionToday) && (
        <div className="p-5 sm:p-6 rounded-2xl bg-[#0c1322] border border-brand-white/10 shadow-xl space-y-4">
          <span className="text-[10px] font-heading font-black uppercase tracking-widest text-brand-blue block">
            Aujourd'hui
          </span>

          <div className={`grid grid-cols-1 ${entitlements.canAccessNutritionEngine && (entitlements.canAccessDigitalPrograms || hasClubSessionToday) ? "sm:grid-cols-2" : "sm:grid-cols-1"} gap-3`}>
            {/* Bloc Nutrition */}
            {entitlements.canAccessNutritionEngine && (
              <div
                onClick={() => onNavigateTab("nutrition")}
                className="p-4 rounded-xl bg-[#070c16]/80 border border-brand-white/5 hover:border-brand-blue/40 transition-all cursor-pointer group space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-heading font-bold uppercase text-brand-white">
                      Nutrition
                    </div>
                    <span className="text-[11px] font-heading font-black text-brand-blue">
                      {consumedCalories} / {targetCalories} kcal
                    </span>
                  </div>

                  {/* Jauge calories */}
                  <div className="w-full h-1.5 bg-black/60 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        calPercent > 105 ? "bg-rose-500" : "bg-brand-blue"
                      }`}
                      style={{ width: `${Math.min(100, calPercent)}%` }}
                    />
                  </div>

                  {/* 3 Macros compactes */}
                  <div className="flex items-center justify-between text-[11px] text-brand-white/60 pt-0.5">
                    <span>
                      <strong className="text-brand-white">{consumedProteins}g</strong> Prot
                    </span>
                    <span>•</span>
                    <span>
                      <strong className="text-brand-white">{consumedCarbs}g</strong> Gluc
                    </span>
                    <span>•</span>
                    <span>
                      <strong className="text-brand-white">{consumedFats}g</strong> Lip
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] font-semibold text-brand-white/40 group-hover:text-brand-white pt-1 border-t border-brand-white/5 transition-colors">
                  <span>{totalMealsLogged} aliment(s) enregistré(s)</span>
                  <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            )}

            {/* Bloc Entraînement Digital OU Séance Club */}
            {entitlements.canAccessDigitalPrograms ? (
              <div
                onClick={() => onNavigateTab("workouts")}
                className="p-4 rounded-xl bg-[#070c16]/80 border border-brand-white/5 hover:border-brand-blue/40 transition-all cursor-pointer group space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-heading font-bold uppercase text-brand-white">
                      Entraînement
                    </div>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                      hasClubSessionToday
                        ? "bg-brand-blue/15 text-brand-blue border-brand-blue/30"
                        : isProgramFullyCompleted
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                        : "bg-brand-blue/15 text-brand-blue border-brand-blue/30"
                    }`}>
                      {hasClubSessionToday
                        ? "Séance Club"
                        : isProgramFullyCompleted
                        ? "Programme Terminé"
                        : "Prochaine séance"}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-brand-white truncate">
                      {hasClubSessionToday
                        ? todayClubBookings[0].discipline || "Cours Club"
                        : isProgramFullyCompleted
                        ? `${featuredProgramTitle} (${completedSessionsCount}/${activeSessions.length || 3})`
                        : featuredSession?.title || "Séance Découverte Fondations"}
                    </h4>
                    <p className="text-[11px] text-brand-white/50 mt-0.5">
                      {hasClubSessionToday
                        ? `${todayClubBookings[0].time || "Aujourd'hui"} • Confirmée`
                        : isProgramFullyCompleted
                        ? "Toutes les séances du programme ont été validées !"
                        : `${featuredProgramTitle} • Jour ${featuredSession?.day_number || 1} • ${featuredSession?.duration_minutes || 45} min`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] font-semibold text-brand-white/40 group-hover:text-brand-white pt-1 border-t border-brand-white/5 transition-colors">
                  <span>
                    {hasClubSessionToday
                      ? "Voir planning"
                      : isProgramFullyCompleted
                      ? "Voir les programmes"
                      : "Lancer la séance"}
                  </span>
                  <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            ) : hasClubSessionToday ? (
              <Link
                href="/membre/planning"
                className="p-4 rounded-xl bg-[#070c16]/80 border border-brand-white/5 hover:border-brand-blue/40 transition-all cursor-pointer group space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-heading font-bold uppercase text-brand-white">
                      Séance en Club
                    </div>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded border bg-brand-blue/15 text-brand-blue border-brand-blue/30">
                      Confirmée
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-brand-white truncate">
                      {todayClubBookings[0].discipline || "Cours Club"}
                    </h4>
                    <p className="text-[11px] text-brand-white/50 mt-0.5">
                      {todayClubBookings[0].time || "Aujourd'hui"} • Présentiel Striking Camp
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] font-semibold text-brand-white/40 group-hover:text-brand-white pt-1 border-t border-brand-white/5 transition-colors">
                  <span>Accéder au planning</span>
                  <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>
            ) : null}
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          3. PROGRESSION (CARTE DE SYNTHÈSE UNIQUE & INTERACTIVE)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div
        onClick={handleOpenProgressionView}
        className="p-5 sm:p-6 rounded-2xl bg-[#0c1322] border border-brand-white/10 hover:border-brand-blue/40 shadow-xl transition-all duration-200 cursor-pointer group space-y-3"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-heading font-black uppercase tracking-widest text-brand-blue">
            Progression
          </span>
          <div className="flex items-center gap-1 text-xs text-brand-white/40 group-hover:text-brand-white transition-colors">
            <span className="text-[11px] font-semibold uppercase">Historique</span>
            <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-2xl font-heading font-black text-brand-white">
              {currentWeight} <span className="text-xs font-normal text-brand-white/40">kg</span>
            </div>
            <div className="text-xs text-brand-white/70 mt-0.5">
              Évolution :{" "}
              <strong className="text-brand-white">
                {totalDelta > 0 ? `+${totalDelta}` : totalDelta} kg
              </strong>
            </div>
          </div>

          {/* Mini Courbe SVG Sparkline */}
          {points.length >= 2 ? (
            <div className="w-32 sm:w-48 h-12 overflow-visible">
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible">
                <path
                  d={pathD}
                  fill="none"
                  stroke="#2faee0"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {points.map((pt, i) => (
                  <circle
                    key={i}
                    cx={pt.x}
                    cy={pt.y}
                    r={i === points.length - 1 ? "4" : "2"}
                    fill="#070c16"
                    stroke="#2faee0"
                    strokeWidth="2"
                  />
                ))}
              </svg>
            </div>
          ) : (
            <div className="text-[11px] text-brand-white/40 italic">
              {logs.length} pesée enregistrée
            </div>
          )}
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          4. DÉFIS & BADGES (CARTE DE SYNTHÈSE UNIQUE & INTERACTIVE)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div
        onClick={handleOpenChallengesView}
        className="p-5 sm:p-6 rounded-2xl bg-[#0c1322] border border-brand-white/10 hover:border-brand-blue/40 shadow-xl transition-all duration-200 cursor-pointer group space-y-3"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-heading font-black uppercase tracking-widest text-brand-blue">
            Défis & Badges
          </span>
          <div className="flex items-center gap-1 text-xs text-brand-white/40 group-hover:text-brand-white transition-colors">
            <span className="text-[11px] font-semibold uppercase">Consulter</span>
            <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-base font-heading font-bold uppercase text-brand-white">
              Paliers Club & Protocoles
            </h4>
            <p className="text-xs text-brand-white/50 leading-relaxed">
              Technique • Physique • Cardio
            </p>
          </div>

          <div className="px-3.5 py-2 rounded-xl bg-[#070c16]/80 border border-brand-white/5 text-right shrink-0">
            <span className="text-[10px] font-bold text-brand-white/40 uppercase block">Progression</span>
            <span className="text-sm font-heading font-black text-brand-blue">
              Actif
            </span>
          </div>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          5. CETTE SEMAINE (RÉSUMÉ TRÈS COMPACT)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#0c1322] border border-brand-white/10 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-heading font-black uppercase tracking-widest text-brand-blue">
            Cette Semaine
          </span>
          <span className="text-brand-white/30 hidden sm:inline">•</span>
          <span className="text-brand-white/80 font-medium">
            {guidance.trainingAdherence.completedSessions} entraînement(s) · {totalMealsLogged} repas enregistré(s)
          </span>
        </div>

        <div className="text-[11px] font-semibold text-brand-blue uppercase px-2.5 py-1 rounded-full bg-brand-blue/15 border border-brand-blue/30 self-start sm:self-center">
          {guidance.priorityTitle}
        </div>
      </div>
    </div>
  );
}
