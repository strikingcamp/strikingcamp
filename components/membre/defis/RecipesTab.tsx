"use client";

import React, { useState } from "react";
import {
  Clock,
  Plus,
  Check,
  X,
  ArrowRight,
  Search,
  Lock,
  Utensils,
} from "lucide-react";
import {
  Recipe,
  RecipeCategory,
  RecipeTargetGoal,
  MealType,
} from "@/lib/supabase/defis-platform";
import { MemberDigitalEntitlementsResult } from "@/lib/access-control";
import { addRecipeToFoodLogAction } from "@/app/(membre)/membre/defis/actions";

interface RecipesTabProps {
  recipes: Recipe[];
  entitlements: MemberDigitalEntitlementsResult;
  onOpenUpgradeModal: () => void;
  onReloadFoodLogs: () => void;
}

function RecipeImage({
  src,
  alt,
  category,
  className = "",
  aspectRatio = "aspect-[4/3]",
}: {
  src?: string | null;
  alt: string;
  category: RecipeCategory;
  className?: string;
  aspectRatio?: string;
}) {
  const [hasError, setHasError] = useState(false);
  const isValidSrc = Boolean(src && src.trim().length > 0 && !hasError);

  return (
    <div
      className={`relative w-full ${aspectRatio} overflow-hidden bg-gradient-to-br from-[#121c30] via-[#0c1322] to-[#070c16] flex items-center justify-center select-none ${className}`}
    >
      {isValidSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src!}
          alt={alt}
          onError={() => setHasError(true)}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
          <div className="w-11 h-11 rounded-xl bg-brand-blue/10 border border-brand-blue/20 flex items-center justify-center text-brand-blue mb-1.5 shadow-inner">
            <Utensils size={20} className="opacity-80" />
          </div>
          <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-brand-white/40">
            Striking Kitchen
          </span>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0c1322] via-transparent to-black/20 pointer-events-none" />
    </div>
  );
}

export default function RecipesTab({
  recipes,
  entitlements,
  onOpenUpgradeModal,
  onReloadFoodLogs,
}: RecipesTabProps) {
  // Filters
  const [selectedCategory, setSelectedCategory] = useState<RecipeCategory | "all">("all");
  const [selectedGoal, setSelectedGoal] = useState<RecipeTargetGoal | "all">("all");
  const [onlyHighProtein, setOnlyHighProtein] = useState(false);
  const [onlyQuick, setOnlyQuick] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal Detail State
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [heroImgError, setHeroImgError] = useState(false);
  const [targetMealType, setTargetMealType] = useState<MealType>("lunch");
  const [portions, setPortions] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [addSuccessMessage, setAddSuccessMessage] = useState(false);

  const filteredRecipes = recipes.filter((r) => {
    if (selectedCategory !== "all" && r.category !== selectedCategory) return false;
    if (selectedGoal !== "all" && r.target_goal !== "both" && r.target_goal !== "all" && r.target_goal !== selectedGoal) return false;
    if (onlyHighProtein && !r.tags.includes("high_protein")) return false;
    if (onlyQuick && r.prep_time_minutes > 10) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = r.title.toLowerCase().includes(q);
      const matchTag = r.tags.some((t) => t.toLowerCase().includes(q));
      if (!matchTitle && !matchTag) return false;
    }
    return true;
  });

  const handleAddToJournal = async () => {
    if (!selectedRecipe) return;

    setIsAdding(true);
    const todayStr = new Date().toISOString().split("T")[0];
    const res = await addRecipeToFoodLogAction({
      recipe_id: selectedRecipe.id,
      meal_type: targetMealType,
      log_date: todayStr,
      portions,
    });
    setIsAdding(false);

    if (res.success) {
      setAddSuccessMessage(true);
      onReloadFoodLogs();
      setTimeout(() => {
        setAddSuccessMessage(false);
        setSelectedRecipe(null);
      }, 1500);
    }
  };

  const getCategoryLabel = (cat: RecipeCategory) => {
    switch (cat) {
      case "breakfast": return "Petit-déjeuner";
      case "lunch": return "Déjeuner";
      case "dinner": return "Dîner";
      case "snack": return "Collation";
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          1. HEADER & SEARCH / FILTERS BAR
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="space-y-4 p-5 sm:p-6 rounded-2xl bg-[#0c1322] border border-brand-white/10 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-heading font-black uppercase text-brand-white tracking-wide">
              Recettes Sportives Striking Camp
            </h3>
            <p className="text-xs text-brand-white/50">
              Repas équilibrés certifiés pour la performance, perte de gras et gain musculaire.
            </p>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une recette..."
              className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#070c16] border border-brand-white/10 text-brand-white text-xs placeholder:text-brand-white/30 focus:border-brand-blue outline-none"
            />
          </div>
        </div>

        {/* Filter Pills - Catégories & Objectifs */}
        <div className="space-y-2.5 pt-2 border-t border-brand-white/5">
          {/* Row 1 : Catégories de repas */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-brand-white/40 mr-1">Repas :</span>
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-heading font-bold uppercase transition-all cursor-pointer ${
                selectedCategory === "all"
                  ? "bg-brand-blue text-brand-black shadow-md shadow-brand-blue/20"
                  : "bg-brand-white/5 text-brand-white/60 hover:text-brand-white border border-brand-white/10"
              }`}
            >
              Tous ({recipes.length})
            </button>

            {(["breakfast", "lunch", "dinner", "snack"] as RecipeCategory[]).map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-heading font-bold uppercase transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-brand-blue text-brand-black shadow-md shadow-brand-blue/20"
                    : "bg-brand-white/5 text-brand-white/60 hover:text-brand-white border border-brand-white/10"
                }`}
              >
                {getCategoryLabel(cat)}
              </button>
            ))}
          </div>

          {/* Row 2 : Objectifs & Critères spécifiques */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[10px] uppercase font-bold text-brand-white/40 mr-1">Filtres :</span>
            <button
              onClick={() => setSelectedGoal("all")}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold uppercase transition-colors cursor-pointer ${
                selectedGoal === "all"
                  ? "bg-brand-white/20 text-brand-white border border-brand-white/30"
                  : "bg-brand-white/5 text-brand-white/50 hover:text-brand-white border border-brand-white/10"
              }`}
            >
              Tous
            </button>
            <button
              onClick={() => setSelectedGoal("weight_loss")}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold uppercase transition-colors cursor-pointer ${
                selectedGoal === "weight_loss"
                  ? "bg-brand-blue/20 text-brand-blue border border-brand-blue/40"
                  : "bg-brand-white/5 text-brand-white/50 hover:text-brand-white border border-brand-white/10"
              }`}
            >
              Perte de poids
            </button>
            <button
              onClick={() => setSelectedGoal("muscle_gain")}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold uppercase transition-colors cursor-pointer ${
                selectedGoal === "muscle_gain"
                  ? "bg-brand-blue/20 text-brand-blue border border-brand-blue/40"
                  : "bg-brand-white/5 text-brand-white/50 hover:text-brand-white border border-brand-white/10"
              }`}
            >
              Prise de muscle
            </button>
            <button
              onClick={() => setSelectedGoal("recomposition")}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold uppercase transition-colors cursor-pointer ${
                selectedGoal === "recomposition"
                  ? "bg-brand-blue/20 text-brand-blue border border-brand-blue/40"
                  : "bg-brand-white/5 text-brand-white/50 hover:text-brand-white border border-brand-white/10"
              }`}
            >
              Recomposition
            </button>
            <button
              onClick={() => setSelectedGoal("maintenance")}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold uppercase transition-colors cursor-pointer ${
                selectedGoal === "maintenance"
                  ? "bg-brand-blue/20 text-brand-blue border border-brand-blue/40"
                  : "bg-brand-white/5 text-brand-white/50 hover:text-brand-white border border-brand-white/10"
              }`}
            >
              Maintien
            </button>

            <div className="w-px h-5 bg-brand-white/10 mx-1 hidden sm:block" />

            <button
              onClick={() => setOnlyHighProtein((prev) => !prev)}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold uppercase transition-colors flex items-center gap-1.5 cursor-pointer ${
                onlyHighProtein
                  ? "bg-brand-blue/20 text-brand-blue border border-brand-blue/40"
                  : "bg-brand-white/5 text-brand-white/60 hover:text-brand-white border border-brand-white/10"
              }`}
            >
              <span>Riche en protéines</span>
            </button>

            <button
              onClick={() => setOnlyQuick((prev) => !prev)}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold uppercase transition-colors flex items-center gap-1.5 cursor-pointer ${
                onlyQuick
                  ? "bg-brand-blue/20 text-brand-blue border border-brand-blue/40"
                  : "bg-brand-white/5 text-brand-white/60 hover:text-brand-white border border-brand-white/10"
              }`}
            >
              <Clock size={12} />
              <span>Rapide (≤ 10 min)</span>
            </button>
          </div>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          2. GRILLE DES RECETTES
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {filteredRecipes.length === 0 ? (
        <div className="p-8 rounded-2xl bg-[#0c1322] border border-brand-white/10 text-center space-y-3 shadow-xl">
          <p className="text-sm font-bold text-brand-white">
            {recipes.length === 0 ? "Aucune recette enregistrée" : "Aucune recette trouvée"}
          </p>
          <p className="text-xs text-brand-white/40">
            {recipes.length === 0
              ? "Le catalogue de recettes se synchronise avec la base de données."
              : "Essayez de modifier vos filtres ou votre terme de recherche."}
          </p>
          {(selectedCategory !== "all" || selectedGoal !== "all" || onlyHighProtein || onlyQuick || searchQuery) && (
            <button
              onClick={() => {
                setSelectedCategory("all");
                setSelectedGoal("all");
                setOnlyHighProtein(false);
                setOnlyQuick(false);
                setSearchQuery("");
              }}
              className="px-4 py-2 rounded-xl bg-brand-white/10 hover:bg-brand-white/15 text-brand-white text-xs font-semibold uppercase transition-colors cursor-pointer"
            >
              Réinitialiser tous les filtres
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredRecipes.map((recipe) => {
            const isLocked = recipe.is_premium && !entitlements.canAccessAllRecipes;
            return (
              <div
                key={recipe.id}
                onClick={() => {
                  if (isLocked) {
                    onOpenUpgradeModal();
                    return;
                  }
                  setSelectedRecipe(recipe);
                  setHeroImgError(false);
                  setPortions(1);
                  setTargetMealType(recipe.category);
                }}
                className="flex flex-col rounded-2xl bg-[#0c1322] border border-brand-white/10 hover:border-brand-blue/40 shadow-xl cursor-pointer transition-all overflow-hidden group hover:translate-y-[-2px]"
              >
                {/* Photo Top Container */}
                <div className="relative">
                  <RecipeImage
                    src={recipe.image_url}
                    alt={recipe.title}
                    category={recipe.category}
                    aspectRatio="aspect-[16/10] sm:aspect-[4/3]"
                  />

                  {/* Floating Badges */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                    <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-brand-white border border-brand-white/20">
                      {getCategoryLabel(recipe.category)}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {recipe.is_premium && (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-brand-blue/90 text-brand-black shadow-md flex items-center gap-1 font-heading">
                          {isLocked && <Lock size={10} />}
                          <span>Premium</span>
                        </span>
                      )}
                      <div className="px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md border border-brand-white/20 text-[10px] font-semibold text-brand-white flex items-center gap-1">
                        <Clock size={10} className="text-brand-blue" />
                        <span>{recipe.prep_time_minutes} min</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <h4 className="text-base font-bold text-brand-white group-hover:text-brand-blue transition-colors leading-snug line-clamp-2">
                      {recipe.title}
                    </h4>
                  </div>

                  <div className="space-y-3">
                    {/* Macros Row */}
                    <div className="grid grid-cols-4 gap-1.5 p-2 rounded-xl bg-[#070c16]/80 border border-brand-white/5 text-center">
                      <div>
                        <p className="text-[9px] font-semibold text-brand-white/40 uppercase">Calories</p>
                        <p className="text-xs font-bold text-brand-blue">{recipe.calories}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-semibold text-brand-white/40 uppercase">Prot</p>
                        <p className="text-xs font-bold text-brand-white">{recipe.proteins_g}g</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-semibold text-brand-white/40 uppercase">Gluc</p>
                        <p className="text-xs font-bold text-brand-white/80">{recipe.carbs_g}g</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-semibold text-brand-white/40 uppercase">Lip</p>
                        <p className="text-xs font-bold text-brand-white/60">{recipe.fats_g}g</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs font-heading font-bold uppercase tracking-wider text-brand-blue group-hover:translate-x-1 transition-transform pt-1">
                      <span>{isLocked ? "Débloquer avec Premium" : "Voir la recette & ingrédients"}</span>
                      <ArrowRight size={14} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          3. MODAL DÉTAIL RECETTE & AJOUT AU JOURNAL
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {selectedRecipe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-lg bg-[#0c1322] border border-brand-white/15 rounded-2xl overflow-hidden my-8 shadow-2xl">
            {/* Hero Image / Banner */}
            <div className="relative w-full h-52 sm:h-60 overflow-hidden bg-gradient-to-br from-[#121c30] via-[#0c1322] to-[#070c16] flex items-center justify-center">
              {selectedRecipe.image_url && !heroImgError ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedRecipe.image_url}
                  alt={selectedRecipe.title}
                  onError={() => setHeroImgError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-brand-blue/10 border border-brand-blue/20 flex items-center justify-center text-brand-blue mb-2">
                    <Utensils size={28} className="opacity-80" />
                  </div>
                  <span className="text-xs font-heading font-black uppercase tracking-wider text-brand-white/40">
                    Striking Nutrition • Recette Certifiée
                  </span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0c1322] via-[#0c1322]/40 to-black/60 pointer-events-none" />

              {/* Close Button */}
              <button
                onClick={() => setSelectedRecipe(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/60 hover:bg-black/80 border border-brand-white/20 text-brand-white transition-all cursor-pointer z-10"
              >
                <X size={18} />
              </button>

              {/* Floating Hero Info */}
              <div className="absolute bottom-4 left-4 right-4 space-y-1.5 z-10">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-brand-blue text-brand-black font-heading shadow-md">
                    {getCategoryLabel(selectedRecipe.category)}
                  </span>
                  <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-brand-white border border-brand-white/20">
                    {selectedRecipe.difficulty}
                  </span>
                  <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-brand-white/80 border border-brand-white/20 flex items-center gap-1">
                    <Clock size={10} className="text-brand-blue" />
                    {selectedRecipe.prep_time_minutes} min
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-heading font-black uppercase text-brand-white drop-shadow-md leading-tight">
                  {selectedRecipe.title}
                </h3>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 sm:p-7 space-y-5">
              {/* Nutrition per portion */}
              <div className="grid grid-cols-4 gap-2 p-3 rounded-xl bg-[#070c16]/80 border border-brand-white/10 text-center">
                <div>
                  <p className="text-[10px] font-semibold text-brand-white/40 uppercase">Calories</p>
                  <p className="text-sm font-heading font-black text-brand-blue">
                    {Math.round(selectedRecipe.calories * portions)} kcal
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-brand-white/40 uppercase">Protéines</p>
                  <p className="text-sm font-heading font-black text-brand-white">
                    {(selectedRecipe.proteins_g * portions).toFixed(1)}g
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-brand-white/40 uppercase">Glucides</p>
                  <p className="text-sm font-heading font-black text-brand-white/80">
                    {(selectedRecipe.carbs_g * portions).toFixed(1)}g
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-brand-white/40 uppercase">Lipides</p>
                  <p className="text-sm font-heading font-black text-brand-white/60">
                    {(selectedRecipe.fats_g * portions).toFixed(1)}g
                  </p>
                </div>
              </div>

              {/* Ingrédients */}
              {selectedRecipe.ingredients && selectedRecipe.ingredients.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-heading font-bold uppercase text-brand-white/80 tracking-wider">
                    Ingrédients nécessaires
                  </h4>
                  <div className="space-y-1.5 p-3 rounded-xl bg-[#070c16]/80 border border-brand-white/5">
                    {selectedRecipe.ingredients.map((ing, i) => (
                      <div key={i} className="flex items-center justify-between text-xs text-brand-white/80">
                        <span>• {ing.name}</span>
                        <span className="font-semibold text-brand-white/50">
                          {ing.quantity ? `${ing.quantity * portions} ${ing.unit || ""}` : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Instructions */}
              {selectedRecipe.instructions && (
                <div className="space-y-2">
                  <h4 className="text-xs font-heading font-bold uppercase text-brand-white/80 tracking-wider">
                    Préparation
                  </h4>
                  <div className="p-3.5 rounded-xl bg-[#070c16]/80 border border-brand-white/5 text-xs text-brand-white/70 leading-relaxed whitespace-pre-line">
                    {selectedRecipe.instructions}
                  </div>
                </div>
              )}

              {/* Action Section : Ajouter au journal */}
              <div className="p-4 rounded-xl bg-[#070c16] border border-brand-blue/30 space-y-3">
                <h4 className="text-xs font-heading font-bold uppercase text-brand-white tracking-wider flex items-center gap-1.5">
                  <Plus size={14} className="text-brand-blue" />
                  <span>Ajouter à votre journal aujourd'hui</span>
                </h4>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-brand-white/60">Repas cible</label>
                    <select
                      value={targetMealType}
                      onChange={(e) => setTargetMealType(e.target.value as MealType)}
                      className="w-full p-2.5 rounded-xl bg-[#0c1322] border border-brand-white/10 text-brand-white text-xs outline-none focus:border-brand-blue"
                    >
                      <option value="breakfast">Petit-déjeuner</option>
                      <option value="lunch">Déjeuner</option>
                      <option value="dinner">Dîner</option>
                      <option value="snack">Collation</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-brand-white/60">Portions</label>
                    <div className="flex gap-1">
                      {[1, 1.5, 2].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPortions(p)}
                          className={`flex-1 py-2 rounded-xl border text-xs font-heading font-bold cursor-pointer ${
                            portions === p
                              ? "bg-brand-blue border-brand-blue text-brand-black shadow-md shadow-brand-blue/20"
                              : "bg-[#0c1322] border-brand-white/10 text-brand-white/60 hover:text-brand-white"
                          }`}
                        >
                          {p}x
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {addSuccessMessage ? (
                  <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center gap-2">
                    <Check size={16} />
                    <span>Recette ajoutée à votre journal !</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={isAdding}
                    onClick={handleAddToJournal}
                    className="w-full py-3 rounded-xl bg-brand-blue hover:bg-brand-white text-brand-black font-heading font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md shadow-brand-blue/20 disabled:opacity-50 cursor-pointer"
                  >
                    <Plus size={16} />
                    <span>{isAdding ? "Ajout..." : "Valider l'ajout au journal"}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

