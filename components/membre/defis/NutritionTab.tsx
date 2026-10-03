"use client";

import React, { useState } from "react";
import {
  Plus,
  Trash2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  X,
  Search,
  Clock,
  ArrowRight,
  Lock,
  Check,
} from "lucide-react";
import {
  MealType,
  Recipe,
  RecipeCategory,
  RecipeTargetGoal,
} from "@/lib/supabase/defis-platform";
import { DailyFoodLogSummary } from "@/lib/supabase/defis";
import { NutritionPlanResult, NutritionPlanSuccess } from "@/lib/nutrition-engine";
import { MemberDigitalEntitlementsResult } from "@/lib/access-control";
import {
  addFoodLogEntryAction,
  addRecipeToFoodLogAction,
  deleteFoodLogEntryAction,
} from "@/app/(membre)/membre/defis/actions";
import RecipesTab from "./RecipesTab";

interface NutritionTabProps {
  nutritionPlan: NutritionPlanResult | null;
  dailyFoodLog: DailyFoodLogSummary | null;
  currentDate: string;
  recipes: Recipe[];
  entitlements: MemberDigitalEntitlementsResult;
  onDateChange: (date: string) => void;
  onReloadData: () => void;
  onOpenUpgradeModal: () => void;
}

export default function NutritionTab({
  nutritionPlan,
  dailyFoodLog,
  currentDate,
  recipes,
  entitlements,
  onDateChange,
  onReloadData,
  onOpenUpgradeModal,
}: NutritionTabProps) {
  const [subSection, setSubSection] = useState<"journal" | "recipes">("journal");

  const successPlan = nutritionPlan?.status === "success" ? (nutritionPlan as NutritionPlanSuccess) : null;

  // Modal States
  const [isAddFoodOpen, setIsAddFoodOpen] = useState(false);
  const [isAddRecipeOpen, setIsAddRecipeOpen] = useState(false);
  const [activeMealType, setActiveMealType] = useState<MealType>("breakfast");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add Custom Food Form State
  const [foodName, setFoodName] = useState("");
  const [servingSize, setServingSize] = useState("1 portion");
  const [calories, setCalories] = useState("");
  const [proteins, setProteins] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fats, setFats] = useState("");

  // Add Recipe Form State
  const [selectedRecipeId, setSelectedRecipeId] = useState("");
  const [portionsCount, setPortionsCount] = useState(1);

  // Date Navigation Helpers
  const handlePrevDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    onDateChange(d.toISOString().split("T")[0]);
  };

  const handleNextDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 1);
    onDateChange(d.toISOString().split("T")[0]);
  };

  const openAddFoodModal = (meal: MealType) => {
    setActiveMealType(meal);
    setFoodName("");
    setServingSize("1 portion");
    setCalories("");
    setProteins("");
    setCarbs("");
    setFats("");
    setIsAddFoodOpen(true);
  };

  const openAddRecipeModal = (meal: MealType) => {
    setActiveMealType(meal);
    setSelectedRecipeId(recipes[0]?.id || "");
    setPortionsCount(1);
    setIsAddRecipeOpen(true);
  };

  const handleSaveCustomFood = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodName.trim() || !calories) return;

    setIsSubmitting(true);
    const res = await addFoodLogEntryAction({
      log_date: currentDate,
      meal_type: activeMealType,
      food_name: foodName,
      serving_size: servingSize,
      calories: Number(calories) || 0,
      proteins_g: Number(proteins) || 0,
      carbs_g: Number(carbs) || 0,
      fats_g: Number(fats) || 0,
    });
    setIsSubmitting(false);

    if (res.success) {
      setIsAddFoodOpen(false);
      onReloadData();
    }
  };

  const handleSaveRecipeFood = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecipeId) return;

    setIsSubmitting(true);
    const res = await addRecipeToFoodLogAction({
      recipe_id: selectedRecipeId,
      meal_type: activeMealType,
      log_date: currentDate,
      portions: portionsCount,
    });
    setIsSubmitting(false);

    if (res.success) {
      setIsAddRecipeOpen(false);
      onReloadData();
    }
  };

  const handleDeleteItem = async (entryId: string) => {
    const res = await deleteFoodLogEntryAction(entryId);
    if (res.success) {
      onReloadData();
    }
  };

  const MEAL_CONFIGS: { type: MealType; title: string; defaultKcalRatio: number }[] = [
    { type: "breakfast", title: "Petit-déjeuner", defaultKcalRatio: 0.25 },
    { type: "lunch", title: "Déjeuner", defaultKcalRatio: 0.35 },
    { type: "dinner", title: "Dîner", defaultKcalRatio: 0.30 },
    { type: "snack", title: "Collation & Récupération", defaultKcalRatio: 0.10 },
  ];

  const targetKcal = successPlan?.targetCalories.value || 2000;
  const currentKcal = dailyFoodLog?.totalCalories || 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          1. SUB-NAVIGATION : JOURNAL ALIMENTAIRE & RECETTES STRIKING CAMP
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-[#0c1322] border border-brand-white/10 shadow-xl">
        <button
          onClick={() => setSubSection("journal")}
          className={`py-3 px-4 rounded-xl text-xs font-heading font-black uppercase tracking-wider transition-all cursor-pointer ${
            subSection === "journal"
              ? "bg-brand-blue text-brand-black shadow-md shadow-brand-blue/20"
              : "text-brand-white/60 hover:text-brand-white hover:bg-brand-white/5"
          }`}
        >
          Journal Alimentaire
        </button>

        <button
          onClick={() => setSubSection("recipes")}
          className={`py-3 px-4 rounded-xl text-xs font-heading font-black uppercase tracking-wider transition-all cursor-pointer ${
            subSection === "recipes"
              ? "bg-brand-blue text-brand-black shadow-md shadow-brand-blue/20"
              : "text-brand-white/60 hover:text-brand-white hover:bg-brand-white/5"
          }`}
        >
          Recettes Striking Camp ({recipes.length})
        </button>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          2. VUE JOURNAL ALIMENTAIRE
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {subSection === "journal" && (
        <div className="space-y-6">
          {/* Header & Date Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#0c1322] border border-brand-white/10 shadow-xl">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevDay}
                className="p-2.5 rounded-xl bg-brand-white/5 hover:bg-brand-white/10 text-brand-white/70 hover:text-brand-white transition-colors cursor-pointer"
              >
                <ChevronLeft size={18} />
              </button>

              <div className="px-4 py-2 rounded-xl bg-[#070c16]/80 border border-brand-white/10 flex items-center gap-2 text-xs sm:text-sm font-heading font-bold uppercase text-brand-white">
                <Calendar size={14} className="text-brand-blue" />
                <span>
                  {new Date(currentDate).toLocaleDateString("fr-FR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </span>
              </div>

              <button
                onClick={handleNextDay}
                className="p-2.5 rounded-xl bg-brand-white/5 hover:bg-brand-white/10 text-brand-white/70 hover:text-brand-white transition-colors cursor-pointer"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Daily Calorie Summary Badge */}
            <div className="flex items-center gap-3 self-end sm:self-center">
              <div className="text-right">
                <p className="text-[10px] font-semibold text-brand-white/40 uppercase">Total Calories</p>
                <p className="text-sm font-heading font-black text-brand-white">
                  {currentKcal} / <span className="text-brand-blue">{targetKcal} kcal</span>
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-brand-blue/15 border border-brand-blue/30 text-brand-blue flex items-center justify-center font-heading font-black text-xs">
                {Math.round((currentKcal / targetKcal) * 100)}%
              </div>
            </div>
          </div>

          {/* Macros Recap */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-[#0c1322] border border-brand-white/10 shadow-lg space-y-1">
              <p className="text-[10px] font-bold text-brand-blue uppercase">Protéines</p>
              <p className="text-base font-heading font-black text-brand-white">
                {dailyFoodLog?.totalProteinsGrams || 0}{" "}
                <span className="text-xs font-normal text-brand-white/40">/ {successPlan?.macros.proteins.grams || 150}g</span>
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#0c1322] border border-brand-white/10 shadow-lg space-y-1">
              <p className="text-[10px] font-bold text-brand-white/80 uppercase">Glucides</p>
              <p className="text-base font-heading font-black text-brand-white">
                {dailyFoodLog?.totalCarbsGrams || 0}{" "}
                <span className="text-xs font-normal text-brand-white/40">/ {successPlan?.macros.carbs.grams || 200}g</span>
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#0c1322] border border-brand-white/10 shadow-lg space-y-1">
              <p className="text-[10px] font-bold text-brand-white/60 uppercase">Lipides</p>
              <p className="text-base font-heading font-black text-brand-white">
                {dailyFoodLog?.totalFatsGrams || 0}{" "}
                <span className="text-xs font-normal text-brand-white/40">/ {successPlan?.macros.fats.grams || 65}g</span>
              </p>
            </div>
          </div>

          {/* Liste des 4 Repas */}
          <div className="space-y-4">
            {MEAL_CONFIGS.map((meal) => {
              const items = dailyFoodLog?.meals[meal.type] || [];
              const mealKcal = items.reduce((sum, item) => sum + item.calories, 0);
              const mealProt = items.reduce((sum, item) => sum + Number(item.proteins_g || 0), 0);

              return (
                <div
                  key={meal.type}
                  className="p-5 rounded-2xl bg-[#0c1322] border border-brand-white/10 shadow-xl space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-brand-white/5 pb-3">
                    <div>
                      <h4 className="text-base font-heading font-bold uppercase text-brand-white tracking-wide">
                        {meal.title}
                      </h4>
                      <p className="text-xs text-brand-white/40">
                        {mealKcal} kcal • {mealProt.toFixed(1)}g protéines
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center">
                      <button
                        onClick={() => openAddFoodModal(meal.type)}
                        className="px-3.5 py-2 rounded-xl bg-brand-white/5 hover:bg-brand-white/10 border border-brand-white/10 text-brand-white text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Plus size={14} className="text-brand-blue" />
                        <span>Aliment</span>
                      </button>

                      <button
                        onClick={() => openAddRecipeModal(meal.type)}
                        className="px-3.5 py-2 rounded-xl bg-brand-blue/15 hover:bg-brand-blue/25 border border-brand-blue/30 text-brand-blue text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <BookOpen size={14} />
                        <span>Recette</span>
                      </button>
                    </div>
                  </div>

                  {items.length === 0 ? (
                    <p className="text-xs text-brand-white/30 italic py-2">
                      Aucun aliment enregistré pour ce repas.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="p-3.5 rounded-xl bg-[#070c16]/80 border border-brand-white/5 flex items-center justify-between gap-3 group hover:border-brand-blue/30 transition-all"
                        >
                          <div className="space-y-0.5">
                            <p className="text-sm font-bold text-brand-white leading-tight">
                              {item.food_name}
                            </p>
                            <p className="text-[11px] text-brand-white/40">
                              {item.serving_size || "1 portion"} • {item.proteins_g}g Prot • {item.carbs_g}g Gluc • {item.fats_g}g Lip
                            </p>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-sm font-heading font-black text-brand-blue">
                              {item.calories} <span className="text-[10px] font-normal text-brand-white/40">kcal</span>
                            </span>

                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1.5 rounded-lg text-brand-white/30 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                              title="Supprimer"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          3. VUE RECETTES STRIKING CAMP
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {subSection === "recipes" && (
        <RecipesTab
          recipes={recipes}
          entitlements={entitlements}
          onOpenUpgradeModal={onOpenUpgradeModal}
          onReloadFoodLogs={onReloadData}
        />
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MODAL 1 : AJOUT D'ALIMENT MANUEL
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {isAddFoodOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#0c1322] border border-brand-white/15 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-brand-white/10 pb-3">
              <h3 className="text-lg font-heading font-black uppercase text-brand-white">
                Ajouter un aliment
              </h3>
              <button
                onClick={() => setIsAddFoodOpen(false)}
                className="text-brand-white/50 hover:text-brand-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCustomFood} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-brand-white/70 uppercase">Nom de l'aliment</label>
                <input
                  type="text"
                  required
                  value={foodName}
                  onChange={(e) => setFoodName(e.target.value)}
                  className="w-full p-3.5 rounded-xl bg-[#070c16] border border-brand-white/10 text-brand-white text-sm focus:border-brand-blue outline-none"
                  placeholder="ex: Flocons d'avoine, Blanc de poulet..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-brand-white/70 uppercase">Portion</label>
                <input
                  type="text"
                  value={servingSize}
                  onChange={(e) => setServingSize(e.target.value)}
                  className="w-full p-3.5 rounded-xl bg-[#070c16] border border-brand-white/10 text-brand-white text-sm focus:border-brand-blue outline-none"
                  placeholder="ex: 100g, 1 bol, 2 tranches"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-brand-white/70 uppercase">Calories (kcal)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={calories}
                    onChange={(e) => setCalories(e.target.value)}
                    className="w-full p-3.5 rounded-xl bg-[#070c16] border border-brand-white/10 text-brand-white text-sm focus:border-brand-blue outline-none"
                    placeholder="ex: 350"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-brand-white/70 uppercase">Protéines (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={proteins}
                    onChange={(e) => setProteins(e.target.value)}
                    className="w-full p-3.5 rounded-xl bg-[#070c16] border border-brand-white/10 text-brand-white text-sm focus:border-brand-blue outline-none"
                    placeholder="ex: 25.0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-brand-white/70 uppercase">Glucides (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={carbs}
                    onChange={(e) => setCarbs(e.target.value)}
                    className="w-full p-3.5 rounded-xl bg-[#070c16] border border-brand-white/10 text-brand-white text-sm focus:border-brand-blue outline-none"
                    placeholder="ex: 45.0"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-brand-white/70 uppercase">Lipides (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={fats}
                    onChange={(e) => setFats(e.target.value)}
                    className="w-full p-3.5 rounded-xl bg-[#070c16] border border-brand-white/10 text-brand-white text-sm focus:border-brand-blue outline-none"
                    placeholder="ex: 8.0"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-brand-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddFoodOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-brand-white/60 hover:text-brand-white uppercase cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-brand-blue hover:bg-brand-white text-brand-black text-xs font-heading font-black uppercase tracking-wider transition-all shadow-md shadow-brand-blue/20 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? "Ajout..." : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MODAL 2 : AJOUT D'UNE RECETTE CERTIFIÉE
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {isAddRecipeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#0c1322] border border-brand-white/15 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-brand-white/10 pb-3">
              <h3 className="text-lg font-heading font-black uppercase text-brand-white">
                Ajouter une recette certifiée
              </h3>
              <button
                onClick={() => setIsAddRecipeOpen(false)}
                className="text-brand-white/50 hover:text-brand-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveRecipeFood} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-brand-white/70 uppercase">Sélectionnez la recette</label>
                <select
                  value={selectedRecipeId}
                  onChange={(e) => setSelectedRecipeId(e.target.value)}
                  className="w-full p-3.5 rounded-xl bg-[#070c16] border border-brand-white/10 text-brand-white text-sm focus:border-brand-blue outline-none"
                >
                  {recipes.map((r) => (
                    <option key={r.id} value={r.id} className="bg-[#070c16] text-brand-white">
                      {r.title} ({r.calories} kcal • {r.proteins_g}g prot)
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-brand-white/70 uppercase">Nombre de portions</label>
                <div className="flex gap-2">
                  {[1, 1.5, 2, 3].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPortionsCount(p)}
                      className={`flex-1 py-2.5 rounded-xl border text-xs font-heading font-bold uppercase transition-all cursor-pointer ${
                        portionsCount === p
                          ? "bg-brand-blue border-brand-blue text-brand-black shadow-md shadow-brand-blue/20"
                          : "bg-[#070c16]/80 border-brand-white/10 text-brand-white/60 hover:text-brand-white"
                      }`}
                    >
                      {p} {p > 1 ? "portions" : "portion"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-brand-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddRecipeOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-brand-white/60 hover:text-brand-white uppercase cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-brand-blue hover:bg-brand-white text-brand-black text-xs font-heading font-black uppercase tracking-wider transition-all shadow-md shadow-brand-blue/20 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? "Ajout..." : "Ajouter au repas"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
