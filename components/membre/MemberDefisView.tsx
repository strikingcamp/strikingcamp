"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, X, ArrowLeft } from "lucide-react";
import { useMember } from "@/components/membre/MemberContext";
import {
  UserFitnessProfile,
  Recipe,
  WorkoutProgram,
} from "@/lib/supabase/defis-platform";
import {
  DailyFoodLogSummary,
  WeightProgressionStats,
  KbShredHybridStats,
  UserWorkoutCompletionHistoryItem,
} from "@/lib/supabase/defis";
import { NutritionPlanResult } from "@/lib/nutrition-engine";
import { MemberDigitalEntitlementsResult } from "@/lib/access-control";

// Server Actions
import {
  getMemberFitnessProfileAction,
  getDailyFoodLogsAction,
  getRecipesAction,
  getWorkoutProgramsAction,
  getWeightHistoryAction,
  getKbShredHybridOverviewAction,
  getUserSessionCompletionsHistoryAction,
} from "@/app/(membre)/membre/defis/actions";

// Sub-components
import TodayTab from "./defis/TodayTab";
import GoalTab from "./defis/GoalTab";
import NutritionTab from "./defis/NutritionTab";
import WorkoutsTab from "./defis/WorkoutsTab";
import ProgressionTab from "./defis/ProgressionTab";
import ChallengesLegacyTab from "./defis/ChallengesLegacyTab";
import PremiumUpgradeModal from "./defis/PremiumUpgradeModal";

export type DefisTabKey =
  | "today"
  | "workouts"
  | "nutrition"
  | "profile";

interface TabItem {
  key: DefisTabKey;
  label: string;
  shortLabel: string;
}

export default function MemberDefisView() {
  const { userBookings } = useMember();

  const [activeTab, setActiveTab] = useState<DefisTabKey>("today");
  const [isLoading, setIsLoading] = useState(true);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  // Modals for sub-sections accessible from "Aujourd'hui"
  const [isProgressionModalOpen, setIsProgressionModalOpen] = useState(false);
  const [isChallengesModalOpen, setIsChallengesModalOpen] = useState(false);

  // Platform Data State
  const [profile, setProfile] = useState<UserFitnessProfile | null>(null);
  const [birthDate, setBirthDate] = useState<string | null>(null);
  const [nutritionPlan, setNutritionPlan] = useState<NutritionPlanResult | null>(null);
  const [entitlements, setEntitlements] = useState<MemberDigitalEntitlementsResult>({
    tier: "free",
    hasActiveSubscription: false,
    hasPhysicalAccess: false,
    canAccessNutritionEngine: false,
    canLogFoodJournal: false,
    canAccessAllRecipes: false,
    canAccessDigitalPrograms: false,
    canAccessKBShredDigital: false,
    canAccessAdvancedStats: false,
  });

  const [currentFoodDate, setCurrentFoodDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [dailyFoodLog, setDailyFoodLog] = useState<DailyFoodLogSummary | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [programs, setPrograms] = useState<WorkoutProgram[]>([]);
  const [weightStats, setWeightStats] = useState<WeightProgressionStats | null>(null);
  const [kbShredStats, setKbShredStats] = useState<KbShredHybridStats | null>(null);
  const [workoutCompletions, setWorkoutCompletions] = useState<UserWorkoutCompletionHistoryItem[]>([]);

  // Onglets visibles calculés dynamiquement selon les droits
  const visibleTabs: TabItem[] = React.useMemo(() => {
    const list: TabItem[] = [
      { key: "today", label: "Aujourd'hui", shortLabel: "Aujourd'hui" },
    ];
    if (entitlements.canAccessDigitalPrograms) {
      list.push({ key: "workouts", label: "Entraînement", shortLabel: "Training" });
    }
    if (entitlements.canAccessNutritionEngine) {
      list.push({ key: "nutrition", label: "Nutrition", shortLabel: "Nutrition" });
    }
    list.push({ key: "profile", label: "Profil", shortLabel: "Profil" });
    return list;
  }, [entitlements.canAccessDigitalPrograms, entitlements.canAccessNutritionEngine]);

  // Redirection de sécurité si l'onglet actif n'est plus autorisé
  useEffect(() => {
    if (activeTab === "workouts" && !entitlements.canAccessDigitalPrograms) {
      setActiveTab("today");
    }
    if (activeTab === "nutrition" && !entitlements.canAccessNutritionEngine) {
      setActiveTab("today");
    }
  }, [activeTab, entitlements]);

  // Filter today's club bookings from user bookings
  const todayDateStr = new Date().toISOString().split("T")[0];
  const todayClubBookings = userBookings.filter((b) => {
    if (!b.startsAt && !b.date) return false;
    const bookingDate = b.startsAt
      ? b.startsAt.split("T")[0]
      : b.date;
    return bookingDate === todayDateStr;
  });

  // Load Initial Fitness Profile & Entitlements
  const loadFitnessProfile = useCallback(async () => {
    try {
      const res = await getMemberFitnessProfileAction();
      if (res.success && res.data) {
        setProfile(res.data.profile);
        setBirthDate(res.data.birthDate);
        setNutritionPlan(res.data.nutritionPlan);
        setEntitlements(res.data.entitlements);

        // Premier accès : si profil non configuré, rediriger sur Profil
        if (!res.data.profile || !res.data.profile.primary_goal || !res.data.profile.current_weight_kg) {
          setActiveTab("profile");
        }
      } else {
        setActiveTab("profile");
      }
    } catch (err) {
      console.error("[MemberDefisView] Erreur profil fitness :", err);
    }
  }, []);

  // Load Daily Food Logs for date
  const loadDailyFoodLogs = useCallback(async (date: string) => {
    try {
      const res = await getDailyFoodLogsAction(date);
      if (res.success && res.data) {
        setDailyFoodLog(res.data);
      }
    } catch (err) {
      console.error("[MemberDefisView] Erreur food log :", err);
    }
  }, []);

  // Load Recipes & Programs
  const loadRecipesAndPrograms = useCallback(async () => {
    try {
      const [recipesRes, progRes, weightRes, kbRes, completionsRes] = await Promise.all([
        getRecipesAction(),
        getWorkoutProgramsAction(),
        getWeightHistoryAction(),
        getKbShredHybridOverviewAction(),
        getUserSessionCompletionsHistoryAction(),
      ]);

      if (recipesRes.success && recipesRes.data) setRecipes(recipesRes.data);
      if (progRes.success && progRes.data) setPrograms(progRes.data);
      if (weightRes.success && weightRes.data) setWeightStats(weightRes.data);
      if (kbRes.success && kbRes.data) setKbShredStats(kbRes.data);
      if (completionsRes.success && completionsRes.data) setWorkoutCompletions(completionsRes.data);
    } catch (err) {
      console.error("[MemberDefisView] Erreur données :", err);
    }
  }, []);

  // Initial Data Bootstrap
  useEffect(() => {
    async function init() {
      setIsLoading(true);
      await Promise.all([
        loadFitnessProfile(),
        loadDailyFoodLogs(currentFoodDate),
        loadRecipesAndPrograms(),
      ]);
      setIsLoading(false);
    }
    init();
  }, [loadFitnessProfile, loadDailyFoodLogs, loadRecipesAndPrograms, currentFoodDate]);

  return (
    <div className="w-full max-w-5xl lg:max-w-5xl xl:max-w-6xl 2xl:max-w-6xl mx-auto px-3.5 sm:px-6 space-y-5 sm:space-y-6 pt-1 sm:pt-2 pb-24 sm:pb-28">
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          1. HUB HEADER & TITLE
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4 pb-4 border-b border-brand-white/10">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-heading font-black uppercase tracking-wider text-brand-white">
              Défis & Progression
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-brand-blue/15 text-brand-blue border border-brand-blue/30 text-[10px] font-bold uppercase tracking-wider shrink-0">
              {entitlements.canAccessDigitalPrograms ? "Digital + Club" : "Club"}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-brand-white/60 max-w-2xl leading-relaxed">
            Plateforme d&apos;entraînement, nutrition et transformation sportive Striking Camp.
          </p>
        </div>

        {/* Status Badge */}
        {profile ? (
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-white/5 hover:bg-brand-white/10 border border-brand-white/10 self-start sm:self-center shrink-0 transition-colors cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-brand-blue shrink-0" />
            <span className="text-[11px] sm:text-xs font-bold text-brand-white uppercase tracking-wider">
              {profile.primary_goal === "weight_loss" && "Perte de Poids"}
              {profile.primary_goal === "muscle_gain" && "Gain Musculaire"}
              {profile.primary_goal === "maintenance" && "Maintien"}
              {profile.primary_goal === "recomposition" && "Recomposition"}
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className="px-4 py-2 rounded-xl bg-brand-blue hover:bg-brand-white text-brand-black text-xs font-heading font-black uppercase tracking-wider self-start sm:self-center shrink-0 transition-all shadow-md shadow-brand-blue/20 cursor-pointer"
          >
            Configurer profil
          </button>
        )}
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          2. NAVIGATION PRINCIPALE DYNAMIQUE
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="sticky top-14 sm:top-16 z-30 -mx-3.5 px-3.5 sm:mx-0 sm:px-0 py-1.5 sm:py-2 bg-[#070c16]/95 backdrop-blur-xl border-y sm:border sm:rounded-2xl border-brand-white/10 shadow-lg">
        <div className={`grid ${visibleTabs.length === 4 ? "grid-cols-4" : visibleTabs.length === 3 ? "grid-cols-3" : "grid-cols-2"} gap-1 sm:gap-2`}>
          {visibleTabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`py-2 sm:py-2.5 px-1 sm:px-2 rounded-xl text-[11px] sm:text-xs font-heading uppercase font-bold tracking-tight sm:tracking-wider text-center truncate transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "bg-brand-blue text-brand-black shadow-lg shadow-brand-blue/20"
                    : "bg-brand-white/5 text-brand-white/70 hover:bg-brand-white/10 hover:text-brand-white border border-brand-white/10"
                }`}
              >
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          3. TAB CONTENT
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {isLoading ? (
        <div className="p-12 text-center text-brand-white/40 space-y-3">
          <RefreshCw size={22} className="animate-spin mx-auto text-brand-blue" />
          <p className="text-xs font-heading uppercase tracking-wider font-bold text-brand-white/50">
            Chargement de la plateforme...
          </p>
        </div>
      ) : (
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
        >
          {/* 1. AUJOURD'HUI */}
          {activeTab === "today" && (
            <TodayTab
              profile={profile}
              nutritionPlan={nutritionPlan}
              dailyFoodLog={dailyFoodLog}
              programs={programs}
              kbShredProgram={kbShredStats?.digitalProgram || programs.find((p) => p.is_kb_shred) || null}
              workoutCompletions={workoutCompletions}
              recipes={recipes}
              weightStats={weightStats}
              allClubBookings={userBookings}
              todayClubBookings={todayClubBookings}
              entitlements={entitlements}
              onNavigateTab={(tabKey) => {
                if (tabKey === "progression") {
                  setIsProgressionModalOpen(true);
                } else if (tabKey === "challenges") {
                  setIsChallengesModalOpen(true);
                } else if (tabKey === "goal") {
                  setActiveTab("profile");
                } else {
                  setActiveTab(tabKey as DefisTabKey);
                }
              }}
              onOpenUpgradeModal={() => setIsUpgradeModalOpen(true)}
              onOpenProgression={() => setIsProgressionModalOpen(true)}
              onOpenChallenges={() => setIsChallengesModalOpen(true)}
            />
          )}

          {/* 2. ENTRAÎNEMENT (MAISON & STRIKING CAMP/KB SHRED) */}
          {activeTab === "workouts" && (
            <WorkoutsTab
              programs={programs}
              kbShredStats={kbShredStats}
              entitlements={entitlements}
              onOpenUpgradeModal={() => setIsUpgradeModalOpen(true)}
              onNavigateTab={(tabKey) => {
                if (tabKey === "progression") {
                  setIsProgressionModalOpen(true);
                } else if (tabKey === "challenges") {
                  setIsChallengesModalOpen(true);
                } else {
                  setActiveTab(tabKey as DefisTabKey);
                }
              }}
              onReloadKbShredStats={() => {
                getKbShredHybridOverviewAction().then((res) => {
                  if (res.success && res.data) setKbShredStats(res.data);
                });
              }}
              onReloadWorkouts={loadRecipesAndPrograms}
            />
          )}

          {/* 3. NUTRITION & RECETTES STRIKING CAMP */}
          {activeTab === "nutrition" && (
            <NutritionTab
              nutritionPlan={nutritionPlan}
              dailyFoodLog={dailyFoodLog}
              currentDate={currentFoodDate}
              recipes={recipes}
              entitlements={entitlements}
              onDateChange={(d) => {
                setCurrentFoodDate(d);
                loadDailyFoodLogs(d);
              }}
              onReloadData={() => loadDailyFoodLogs(currentFoodDate)}
              onOpenUpgradeModal={() => setIsUpgradeModalOpen(true)}
            />
          )}

          {/* 4. PROFIL (OBJECTIF & DONNÉES PHYSIQUES) */}
          {activeTab === "profile" && (
            <GoalTab
              initialProfile={profile}
              initialBirthDate={birthDate}
              nutritionPlan={nutritionPlan}
              onProfileUpdated={() => {
                loadFitnessProfile();
                setActiveTab("today");
              }}
            />
          )}
        </motion.div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          4. MODAL PROGRESSION DÉTAILLÉE (ACCÈS DEPUIS AUJOURD'HUI)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatePresence>
        {isProgressionModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-4xl max-h-[92vh] sm:max-h-[88vh] flex flex-col bg-[#0c1322] border border-brand-white/15 rounded-2xl shadow-2xl relative overflow-hidden my-auto"
            >
              <div className="shrink-0 p-4 sm:p-5 md:p-6 flex items-center justify-between border-b border-brand-white/10 bg-[#0c1322]">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setIsProgressionModalOpen(false)}
                    aria-label="Retour"
                    className="p-1.5 sm:p-2 rounded-xl bg-brand-white/5 hover:bg-brand-white/10 text-brand-white transition-colors cursor-pointer"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <h3 className="text-lg sm:text-xl font-heading font-black uppercase text-brand-white truncate">
                    Suivi de Progression
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setIsProgressionModalOpen(false)}
                  aria-label="Fermer"
                  className="p-1.5 rounded-lg text-brand-white/50 hover:text-brand-white transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 p-3.5 sm:p-6 md:p-8">
                <ProgressionTab
                  weightStats={weightStats}
                  workoutCompletions={workoutCompletions}
                  onReloadHistory={() => {
                    loadRecipesAndPrograms();
                    getWeightHistoryAction().then((res) => {
                      if (res.success && res.data) setWeightStats(res.data);
                    });
                  }}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          5. MODAL DÉFIS & BADGES (ACCÈS DEPUIS AUJOURD'HUI)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatePresence>
        {isChallengesModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-4xl max-h-[92vh] sm:max-h-[88vh] flex flex-col bg-[#0c1322] border border-brand-white/15 rounded-2xl shadow-2xl relative overflow-hidden my-auto"
            >
              <div className="shrink-0 p-4 sm:p-5 md:p-6 flex items-center justify-between border-b border-brand-white/10 bg-[#0c1322]">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setIsChallengesModalOpen(false)}
                    aria-label="Retour"
                    className="p-1.5 sm:p-2 rounded-xl bg-brand-white/5 hover:bg-brand-white/10 text-brand-white transition-colors cursor-pointer"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <h3 className="text-lg sm:text-xl font-heading font-black uppercase text-brand-white truncate">
                    Défis Striking Camp
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setIsChallengesModalOpen(false)}
                  aria-label="Fermer"
                  className="p-1.5 rounded-lg text-brand-white/50 hover:text-brand-white transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 p-3.5 sm:p-6 md:p-8">
                <ChallengesLegacyTab />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          6. MODAL PREMIUM UNIVERSELLE
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <PremiumUpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
      />
    </div>
  );
}
