"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  X,
  Search,
  Lock,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import {
  getAdminRecipesAction,
  upsertAdminRecipeAction,
  deleteAdminRecipeAction,
  toggleAdminRecipeActiveAction,
} from "@/app/(admin)/admin/defis/actions";
import {
  Recipe,
  RecipeIngredient,
  RecipeCategory,
  RecipeTargetGoal,
  RecipeDifficulty,
} from "@/lib/supabase/defis-platform";

export default function AdminRecipesTab() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterGoal, setFilterGoal] = useState<string>("all");
  const [filterPremium, setFilterPremium] = useState<string>("all");

  // Notification
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modals & form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [recipeToDelete, setRecipeToDelete] = useState<Recipe | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formTitle, setFormTitle] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formCategory, setFormCategory] = useState<RecipeCategory>("lunch");
  const [formGoal, setFormGoal] = useState<RecipeTargetGoal>("both");
  const [formPrepTime, setFormPrepTime] = useState(15);
  const [formDifficulty, setFormDifficulty] = useState<RecipeDifficulty>("Facile");
  const [formCalories, setFormCalories] = useState(400);
  const [formProteins, setFormProteins] = useState(30);
  const [formCarbs, setFormCarbs] = useState(40);
  const [formFats, setFormFats] = useState(12);
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formInstructions, setFormInstructions] = useState("");
  const [formTags, setFormTags] = useState<string[]>(["high_protein"]);
  const [formIsPremium, setFormIsPremium] = useState(false);
  const [formIsActive, setFormIsActive] = useState(true);
  const [formDisplayOrder, setFormDisplayOrder] = useState(10);
  const [formIngredients, setFormIngredients] = useState<Partial<RecipeIngredient>[]>([
    { name: "", quantity: null, unit: "" },
  ]);

  const showNotification = (text: string, type: "success" | "error" = "success") => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchRecipes = async () => {
    setIsLoading(true);
    const res = await getAdminRecipesAction();
    if (res.success && res.data) {
      setRecipes(res.data);
    } else {
      showNotification(res.error || "Erreur de chargement des recettes.", "error");
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchRecipes();
  }, []);

  const openCreateModal = () => {
    setEditingRecipe(null);
    setFormTitle("");
    setFormSlug("");
    setFormCategory("lunch");
    setFormGoal("both");
    setFormPrepTime(15);
    setFormDifficulty("Facile");
    setFormCalories(400);
    setFormProteins(30);
    setFormCarbs(40);
    setFormFats(12);
    setFormImageUrl("");
    setFormInstructions("");
    setFormTags(["high_protein"]);
    setFormIsPremium(false);
    setFormIsActive(true);
    setFormDisplayOrder(10);
    setFormIngredients([{ name: "", quantity: null, unit: "" }]);
    setIsModalOpen(true);
  };

  const openEditModal = (r: Recipe) => {
    setEditingRecipe(r);
    setFormTitle(r.title);
    setFormSlug(r.slug);
    setFormCategory(r.category);
    setFormGoal(r.target_goal);
    setFormPrepTime(r.prep_time_minutes);
    setFormDifficulty(r.difficulty);
    setFormCalories(r.calories);
    setFormProteins(r.proteins_g);
    setFormCarbs(r.carbs_g);
    setFormFats(r.fats_g);
    setFormImageUrl(r.image_url || "");
    setFormInstructions(r.instructions || "");
    setFormTags(r.tags || []);
    setFormIsPremium(r.is_premium);
    setFormIsActive(r.is_active);
    setFormDisplayOrder(r.display_order);
    setFormIngredients(
      r.ingredients && r.ingredients.length > 0
        ? r.ingredients.map((ing) => ({
            name: ing.name,
            quantity: ing.quantity,
            unit: ing.unit,
          }))
        : [{ name: "", quantity: null, unit: "" }]
    );
    setIsModalOpen(true);
  };

  const handleSaveRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      showNotification("Le titre de la recette est obligatoire.", "error");
      return;
    }

    setIsSubmitting(true);
    const validIngredients = formIngredients.filter((ing) => ing.name && ing.name.trim().length > 0);

    const res = await upsertAdminRecipeAction(
      {
        id: editingRecipe?.id,
        title: formTitle.trim(),
        slug: formSlug.trim() || undefined,
        category: formCategory,
        target_goal: formGoal,
        prep_time_minutes: Number(formPrepTime),
        difficulty: formDifficulty,
        calories: Number(formCalories),
        proteins_g: Number(formProteins),
        carbs_g: Number(formCarbs),
        fats_g: Number(formFats),
        image_url: formImageUrl.trim() || null,
        instructions: formInstructions.trim() || null,
        tags: formTags,
        is_premium: formIsPremium,
        is_active: formIsActive,
        display_order: Number(formDisplayOrder),
      },
      validIngredients
    );

    if (res.success) {
      showNotification(editingRecipe ? "Recette mise à jour avec succès !" : "Recette créée avec succès !");
      setIsModalOpen(false);
      fetchRecipes();
    } else {
      showNotification(res.error || "Erreur lors de l'enregistrement.", "error");
    }
    setIsSubmitting(false);
  };

  const handleDeleteRecipe = async () => {
    if (!recipeToDelete) return;
    setIsSubmitting(true);
    const res = await deleteAdminRecipeAction(recipeToDelete.id);
    if (res.success) {
      showNotification("Recette supprimée.");
      setRecipeToDelete(null);
      fetchRecipes();
    } else {
      showNotification(res.error || "Erreur de suppression.", "error");
    }
    setIsSubmitting(false);
  };

  const handleToggleActive = async (r: Recipe) => {
    const res = await toggleAdminRecipeActiveAction(r.id, !r.is_active);
    if (res.success) {
      showNotification(`Recette ${!r.is_active ? "activée" : "désactivée"}.`);
      setRecipes((prev) => prev.map((item) => (item.id === r.id ? { ...item, is_active: !r.is_active } : item)));
    } else {
      showNotification(res.error || "Erreur de mise à jour.", "error");
    }
  };

  // Filtrage
  const filteredRecipes = recipes.filter((r) => {
    const matchesSearch =
      searchTerm === "" ||
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.slug.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = filterCategory === "all" || r.category === filterCategory;
    const matchesGoal = filterGoal === "all" || r.target_goal === filterGoal || r.target_goal === "both";
    const matchesPremium =
      filterPremium === "all" ||
      (filterPremium === "premium" && r.is_premium) ||
      (filterPremium === "free" && !r.is_premium);

    return matchesSearch && matchesCategory && matchesGoal && matchesPremium;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-xl border flex items-center gap-2 shadow-2xl text-xs font-bold ${
              notification.type === "success"
                ? "bg-black border-[#5E4075] text-[#F8F9ED]"
                : "bg-black border-rose-500/50 text-rose-300"
            }`}
          >
            {notification.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            <span>{notification.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Barre d'actions & Filtres */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Rechercher une recette..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-black border border-white/10 rounded-xl text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-[#5E4075] w-60"
            />
          </div>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 bg-black border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#5E4075]"
          >
            <option value="all">Toutes Catégories</option>
            <option value="breakfast">Petit-déjeuner</option>
            <option value="lunch">Déjeuner</option>
            <option value="dinner">Dîner</option>
            <option value="snack">Collation</option>
          </select>

          <select
            value={filterGoal}
            onChange={(e) => setFilterGoal(e.target.value)}
            className="px-3 py-2 bg-black border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#5E4075]"
          >
            <option value="all">Tous Objectifs</option>
            <option value="weight_loss">Perte de poids</option>
            <option value="muscle_gain">Prise de muscle</option>
            <option value="recomposition">Recomposition</option>
            <option value="maintenance">Maintien</option>
            <option value="both">Hybride (Both)</option>
          </select>

          <select
            value={filterPremium}
            onChange={(e) => setFilterPremium(e.target.value)}
            className="px-3 py-2 bg-black border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#5E4075]"
          >
            <option value="all">Tous Accès</option>
            <option value="free">Gratuit / Free</option>
            <option value="premium">Premium Uniquement</option>
          </select>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2 rounded-xl bg-[#5E4075] text-white hover:bg-[#6f4d8b] font-heading font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-colors self-start md:self-auto cursor-pointer"
        >
          <Plus size={16} />
          <span>Créer une Recette</span>
        </button>
      </div>

      {/* Tableau des Recettes */}
      <div className="bg-black border border-white/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 text-[11px] font-heading font-bold uppercase tracking-wider text-white/60">
                <th className="p-4">Recette</th>
                <th className="p-4">Catégorie</th>
                <th className="p-4">Objectif</th>
                <th className="p-4">Calories & Macros</th>
                <th className="p-4">Préparation</th>
                <th className="p-4">Statut</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs text-white/80">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-white/40">
                    <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-[#F8F9ED]" />
                    <span>Chargement des recettes...</span>
                  </td>
                </tr>
              ) : filteredRecipes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-white/40">
                    Aucune recette trouvée pour ces critères.
                  </td>
                </tr>
              ) : (
                filteredRecipes.map((r) => (
                  <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4">
                      <div>
                        <div className="font-bold text-white flex items-center gap-2">
                          <span>{r.title}</span>
                          {r.is_premium && (
                            <span className="px-1.5 py-0.5 rounded bg-white/10 text-[#F8F9ED] border border-white/20 text-[9px] font-bold uppercase tracking-wider flex items-center gap-0.5">
                              <Lock size={9} />
                              <span>Premium</span>
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-white/40 font-mono">{r.slug}</p>
                      </div>
                    </td>

                    <td className="p-4">
                      <span className="capitalize px-2 py-1 rounded bg-white/5 text-white/70 text-[11px]">
                        {r.category === "breakfast" && "Petit-déj"}
                        {r.category === "lunch" && "Déjeuner"}
                        {r.category === "dinner" && "Dîner"}
                        {r.category === "snack" && "Collation"}
                      </span>
                    </td>

                    <td className="p-4">
                      <span className="px-2 py-1 rounded text-[11px] font-semibold bg-white/5 text-[#F8F9ED] border border-white/10">
                        {r.target_goal === "weight_loss" && "Perte de Poids"}
                        {r.target_goal === "muscle_gain" && "Prise de Muscle"}
                        {r.target_goal === "both" && "Recomposition"}
                      </span>
                    </td>

                    <td className="p-4">
                      <div className="space-y-0.5">
                        <div className="font-bold text-white">
                          <span>{r.calories} kcal</span>
                        </div>
                        <div className="text-[10px] text-white/50 space-x-1.5 font-mono">
                          <span className="text-[#F8F9ED] font-bold">P: {r.proteins_g}g</span>
                          <span className="text-white/60">G: {r.carbs_g}g</span>
                          <span className="text-white/40">L: {r.fats_g}g</span>
                        </div>
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="text-white/70">
                        <span>{r.prep_time_minutes} min</span>
                        <span className="text-white/30 mx-1.5">•</span>
                        <span className="text-white/50">{r.difficulty}</span>
                      </div>
                    </td>

                    <td className="p-4">
                      <button
                        onClick={() => handleToggleActive(r)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border cursor-pointer transition-all ${
                          r.is_active
                            ? "bg-[#5E4075]/20 border-[#5E4075]/40 text-[#F8F9ED]"
                            : "bg-white/5 border-white/10 text-white/40"
                        }`}
                      >
                        {r.is_active ? "Actif" : "Inactif"}
                      </button>
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(r)}
                          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
                          title="Modifier"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => setRecipeToDelete(r)}
                          className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors cursor-pointer"
                          title="Supprimer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Création / Modification de Recette */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-black border border-white/15 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto"
            >
              {/* Header Modal */}
              <div className="p-5 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-heading font-black uppercase text-white tracking-wider">
                    {editingRecipe ? "Modifier la Recette" : "Créer une Recette"}
                  </h3>
                  <p className="text-[11px] text-white/50">Catalogue nutritionnel STRIKING CAMP</p>
                </div>

                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-lg bg-white/5 text-white/60 hover:text-white cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Formulaire */}
              <form onSubmit={handleSaveRecipe} className="p-6 overflow-y-auto space-y-6 text-xs text-white">
                {/* 1. Titre, Slug, Catégorie, Objectif */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-bold text-white/70 uppercase">Titre de la recette *</label>
                    <input
                      type="text"
                      required
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="Ex: Salade Thaï au Bœuf Saisi"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-[#5E4075]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-white/70 uppercase">Slug URL (optionnel)</label>
                    <input
                      type="text"
                      value={formSlug}
                      onChange={(e) => setFormSlug(e.target.value)}
                      placeholder="ex: salade-thai-boeuf-saisi"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-[#5E4075] font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-white/70 uppercase">Catégorie de Repas</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as RecipeCategory)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-white/10 text-white focus:outline-none focus:border-[#5E4075]"
                    >
                      <option value="breakfast">Petit-déjeuner</option>
                      <option value="lunch">Déjeuner</option>
                      <option value="dinner">Dîner</option>
                      <option value="snack">Collation</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-white/70 uppercase">Objectif Cible</label>
                    <select
                      value={formGoal}
                      onChange={(e) => setFormGoal(e.target.value as RecipeTargetGoal)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-white/10 text-white focus:outline-none focus:border-[#5E4075]"
                    >
                      <option value="weight_loss">Perte de Poids (Déficit)</option>
                      <option value="muscle_gain">Gain Musculaire (Surplus)</option>
                      <option value="recomposition">Recomposition Corporelle</option>
                      <option value="maintenance">Maintien & Performance</option>
                      <option value="both">Hybride (Both)</option>
                      <option value="all">Tous Objectifs (All)</option>
                    </select>
                  </div>
                </div>

                {/* 2. Macros & Calories par portion */}
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
                  <div className="font-bold uppercase tracking-wider text-[#F8F9ED]">
                    Valeurs Nutritionnelles (par portion)
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <label className="text-white/60">Calories (kcal)</label>
                      <input
                        type="number"
                        min="0"
                        value={formCalories}
                        onChange={(e) => setFormCalories(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg bg-black border border-white/10 text-white focus:outline-none focus:border-[#5E4075] font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[#F8F9ED] font-semibold">Protéines (g)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={formProteins}
                        onChange={(e) => setFormProteins(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg bg-black border border-white/10 text-white focus:outline-none focus:border-[#5E4075] font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-white/60 font-semibold">Glucides (g)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={formCarbs}
                        onChange={(e) => setFormCarbs(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg bg-black border border-white/10 text-white focus:outline-none focus:border-[#5E4075] font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-white/40 font-semibold">Lipides (g)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={formFats}
                        onChange={(e) => setFormFats(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg bg-black border border-white/10 text-white focus:outline-none focus:border-[#5E4075] font-bold"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Préparation, Difficulté, Ordre */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-bold text-white/70 uppercase">Temps (minutes)</label>
                    <input
                      type="number"
                      min="1"
                      value={formPrepTime}
                      onChange={(e) => setFormPrepTime(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-white/70 uppercase">Difficulté</label>
                    <select
                      value={formDifficulty}
                      onChange={(e) => setFormDifficulty(e.target.value as RecipeDifficulty)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-white/10 text-white"
                    >
                      <option value="Facile">Facile</option>
                      <option value="Moyen">Moyen</option>
                      <option value="Avancé">Avancé</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-white/70 uppercase">Ordre d'affichage</label>
                    <input
                      type="number"
                      value={formDisplayOrder}
                      onChange={(e) => setFormDisplayOrder(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white"
                    />
                  </div>
                </div>

                {/* 4. Ingrédients dynamiques */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-white/70 uppercase">Ingrédients de la recette</label>
                    <button
                      type="button"
                      onClick={() => setFormIngredients([...formIngredients, { name: "", quantity: null, unit: "" }])}
                      className="text-[#F8F9ED] hover:underline font-bold text-xs flex items-center gap-1 uppercase cursor-pointer"
                    >
                      <Plus size={14} />
                      <span>Ajouter ingrédient</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {formIngredients.map((ing, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Nom (ex: Bœuf, Tomates, Épinards)"
                          value={ing.name || ""}
                          onChange={(e) => {
                            const updated = [...formIngredients];
                            updated[idx].name = e.target.value;
                            setFormIngredients(updated);
                          }}
                          className="flex-1 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white"
                        />
                        <input
                          type="number"
                          placeholder="Qté"
                          value={ing.quantity ?? ""}
                          onChange={(e) => {
                            const updated = [...formIngredients];
                            updated[idx].quantity = e.target.value ? Number(e.target.value) : null;
                            setFormIngredients(updated);
                          }}
                          className="w-20 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white"
                        />
                        <input
                          type="text"
                          placeholder="Unité (g, ml, c.à.s)"
                          value={ing.unit || ""}
                          onChange={(e) => {
                            const updated = [...formIngredients];
                            updated[idx].unit = e.target.value;
                            setFormIngredients(updated);
                          }}
                          className="w-24 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white"
                        />
                        {formIngredients.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setFormIngredients(formIngredients.filter((_, i) => i !== idx))}
                            className="p-2 text-rose-400 hover:text-rose-300 cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 5. Instructions */}
                <div className="space-y-1.5">
                  <label className="font-bold text-white/70 uppercase">Instructions de préparation</label>
                  <textarea
                    rows={4}
                    value={formInstructions}
                    onChange={(e) => setFormInstructions(e.target.value)}
                    placeholder="1. Émincer le bœuf...&#10;2. Saisir à feu vif...&#10;3. Dresser avec la menthe et le citron vert."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-[#5E4075]"
                  />
                </div>

                {/* 6. Switches Premium & Actif */}
                <div className="flex flex-wrap items-center gap-6 p-4 rounded-xl bg-white/[0.03] border border-white/10">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIsPremium}
                      onChange={(e) => setFormIsPremium(e.target.checked)}
                      className="w-4 h-4 rounded text-[#5E4075] bg-black border-white/20"
                    />
                    <span className="font-bold text-white">Réservé aux membres Premium (Verrouillé en Free)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                      className="w-4 h-4 rounded text-[#5E4075] bg-black border-white/20"
                    />
                    <span className="font-bold text-white">Recette active & visible au catalogue</span>
                  </label>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 rounded-xl bg-[#5E4075] hover:bg-[#6f4d8b] text-white font-heading font-black uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    {isSubmitting ? "Enregistrement..." : editingRecipe ? "Mettre à jour" : "Créer la Recette"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Confirmation de Suppression */}
      <AnimatePresence>
        {recipeToDelete && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-black border border-rose-500/30 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl text-xs text-white"
            >
              <div className="flex items-center gap-3 text-rose-400">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                  <Trash2 size={20} />
                </div>
                <div>
                  <h4 className="text-base font-heading font-black uppercase text-white">Confirmer la Suppression</h4>
                  <p className="text-[11px] text-white/50">Cette action est irréversible.</p>
                </div>
              </div>

              <p className="text-white/70">
                Êtes-vous sûr de vouloir supprimer définitivement la recette{" "}
                <span className="font-bold text-white">« {recipeToDelete.title} »</span> ?
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setRecipeToDelete(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold uppercase cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDeleteRecipe}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold uppercase cursor-pointer"
                >
                  {isSubmitting ? "Suppression..." : "Supprimer"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
