"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  X,
  Target,
  Flame,
  Award,
  Zap,
  Calendar,
  Lock,
  Eye,
  Sliders,
  Sparkles,
  RefreshCw,
  Video,
  ListOrdered,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  Play,
  ExternalLink,
  Layers,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Power,
  Dumbbell,
  HeartPulse,
  Apple,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  getAdminChallenges,
  getAdminChallengeWithSteps,
  createAdminChallenge,
  updateAdminChallenge,
  deleteAdminChallenge,
  createAdminChallengeStep,
  updateAdminChallengeStep,
  deleteAdminChallengeStep,
  reorderAdminChallengeSteps,
  type Challenge,
  type ChallengeStep,
  type ChallengeCategory,
  type ChallengeLevel,
  type ChallengeStatus,
} from "@/lib/supabase/challenges";
import { cn } from "@/lib/utils";

const CATEGORIES: ChallengeCategory[] = ["Technique", "Physique", "Cardio", "Nutrition"];
const LEVELS: ChallengeLevel[] = ["Débutant", "Intermédiaire", "Confirmé", "Tous niveaux"];

export default function AdminDefisView() {
  const [supabase] = useState(() => createClient());
  const [challenges, setChallenges] = useState<(Challenge & { stepsCount: number; activeParticipantsCount: number })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<"Tous" | ChallengeStatus>("Tous");
  const [filterCategory, setFilterCategory] = useState<"Toutes" | ChallengeCategory>("Toutes");

  // Notifications
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modals
  const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);
  const [challengeToDelete, setChallengeToDelete] = useState<Challenge | null>(null);
  const [isDeletingChallenge, setIsDeletingChallenge] = useState(false);

  // Formulaire défi
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState<ChallengeCategory>("Technique");
  const [formLevel, setFormLevel] = useState<ChallengeLevel>("Débutant");
  const [formShortDescription, setFormShortDescription] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCoverImageUrl, setFormCoverImageUrl] = useState("");
  const [formPointsXp, setFormPointsXp] = useState(500);
  const [formBadgeReward, setFormBadgeReward] = useState("Champion du Camp");
  const [formStatus, setFormStatus] = useState<ChallengeStatus>("draft");
  const [formIsActive, setFormIsActive] = useState(true);
  const [isSubmittingChallenge, setIsSubmittingChallenge] = useState(false);

  // Modal Gestion des Étapes
  const [stepsModalChallenge, setStepsModalChallenge] = useState<Challenge | null>(null);
  const [challengeSteps, setChallengeSteps] = useState<ChallengeStep[]>([]);
  const [isLoadingSteps, setIsLoadingSteps] = useState(false);

  // Formulaire Étape
  const [isStepFormOpen, setIsStepFormOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<ChallengeStep | null>(null);
  const [stepTitle, setStepTitle] = useState("");
  const [stepDescription, setStepDescription] = useState("");
  const [stepVideoUrl, setStepVideoUrl] = useState("");
  const [stepIsActive, setStepIsActive] = useState(true);
  const [isSubmittingStep, setIsSubmittingStep] = useState(false);

  const showNotification = (text: string, type: "success" | "error" = "success") => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Chargement des défis
  const fetchChallenges = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getAdminChallenges(supabase);
      setChallenges(data);
    } catch (err) {
      console.error("[AdminDefisView] Erreur chargement :", err);
      showNotification("Erreur lors du chargement des défis.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchChallenges();
  }, [fetchChallenges]);

  // Ouverture modal création
  const handleOpenCreateChallenge = () => {
    setEditingChallenge(null);
    setFormTitle("");
    setFormCategory("Technique");
    setFormLevel("Débutant");
    setFormShortDescription("");
    setFormDescription("");
    setFormCoverImageUrl("");
    setFormPointsXp(500);
    setFormBadgeReward("Gant de Bronze");
    setFormStatus("draft");
    setFormIsActive(true);
    setIsChallengeModalOpen(true);
  };

  // Ouverture modal édition
  const handleOpenEditChallenge = (c: Challenge) => {
    setEditingChallenge(c);
    setFormTitle(c.title);
    setFormCategory(c.category);
    setFormLevel(c.level);
    setFormShortDescription(c.short_description || "");
    setFormDescription(c.description || "");
    setFormCoverImageUrl(c.cover_image_url || "");
    setFormPointsXp(c.points_xp || 500);
    setFormBadgeReward(c.badge_reward || "");
    setFormStatus(c.status);
    setFormIsActive(c.is_active);
    setIsChallengeModalOpen(true);
  };

  // Sauvegarde Défi (Création ou Mise à jour)
  const handleSaveChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      showNotification("Le titre du défi est obligatoire.", "error");
      return;
    }

    setIsSubmittingChallenge(true);
    try {
      const payload: Partial<Challenge> = {
        title: formTitle.trim(),
        category: formCategory,
        level: formLevel,
        short_description: formShortDescription.trim() || null,
        description: formDescription.trim() || null,
        cover_image_url: formCoverImageUrl.trim() || null,
        points_xp: Number(formPointsXp) || 500,
        badge_reward: formBadgeReward.trim() || null,
        status: formStatus,
        is_active: formIsActive,
      };

      if (editingChallenge) {
        // Protection : si on veut passer en "published", vérifier qu'il a au moins 1 étape
        if (formStatus === "published") {
          const match = challenges.find((c) => c.id === editingChallenge.id);
          if (match && match.stepsCount === 0) {
            showNotification(
              "Impossible de publier ce défi : il doit comporter au moins 1 étape active. Veuillez d'abord ajouter une étape.",
              "error"
            );
            setIsSubmittingChallenge(false);
            return;
          }
        }

        const res = await updateAdminChallenge(supabase, editingChallenge.id, payload);
        if (res.success) {
          showNotification(`Défi « ${formTitle} » mis à jour avec succès.`);
          setIsChallengeModalOpen(false);
          await fetchChallenges();
        } else {
          showNotification(res.error || "Erreur lors de la mise à jour.", "error");
        }
      } else {
        const res = await createAdminChallenge(supabase, payload);
        if (res.success) {
          showNotification(`Défi « ${formTitle} » créé avec succès en statut ${formStatus}.`);
          setIsChallengeModalOpen(false);
          await fetchChallenges();
        } else {
          showNotification(res.error || "Erreur lors de la création.", "error");
        }
      }
    } catch (err) {
      console.error("[handleSaveChallenge] Exception :", err);
      showNotification("Une erreur inattendue est survenue.", "error");
    } finally {
      setIsSubmittingChallenge(false);
    }
  };

  // Toggle activation directe
  const handleToggleActive = async (c: Challenge) => {
    const newStatus = !c.is_active;
    const res = await updateAdminChallenge(supabase, c.id, { is_active: newStatus });
    if (res.success) {
      showNotification(`Défi « ${c.title} » ${newStatus ? "activé" : "désactivé"}.`);
      await fetchChallenges();
    } else {
      showNotification(res.error || "Erreur lors du changement de statut.", "error");
    }
  };

  // Changement rapide de statut (Publier / Dépublier / Archiver)
  const handleChangeStatus = async (c: Challenge, newStatus: ChallengeStatus) => {
    if (newStatus === "published") {
      const match = challenges.find((item) => item.id === c.id);
      if (match && match.stepsCount === 0) {
        showNotification(
          "Impossible de publier ce défi : il ne possède aucune étape active. Ajoutez d'abord des étapes via le gestionnaire d'étapes.",
          "error"
        );
        return;
      }
    }

    const res = await updateAdminChallenge(supabase, c.id, { status: newStatus });
    if (res.success) {
      showNotification(`Statut du défi « ${c.title} » passé à ${newStatus}.`);
      await fetchChallenges();
    } else {
      showNotification(res.error || "Erreur de mise à jour du statut.", "error");
    }
  };

  // Suppression Défi
  const handleConfirmDeleteChallenge = async () => {
    if (!challengeToDelete) return;
    setIsDeletingChallenge(true);
    try {
      const res = await deleteAdminChallenge(supabase, challengeToDelete.id);
      if (res.success) {
        showNotification(`Défi « ${challengeToDelete.title} » et ses étapes supprimés définitivement.`);
        setChallengeToDelete(null);
        await fetchChallenges();
      } else {
        showNotification(res.error || "Erreur lors de la suppression.", "error");
      }
    } finally {
      setIsDeletingChallenge(false);
    }
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // GESTION DES ÉTAPES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const handleOpenStepsModal = async (c: Challenge) => {
    setStepsModalChallenge(c);
    setIsStepFormOpen(false);
    setEditingStep(null);
    setIsLoadingSteps(true);
    try {
      const res = await getAdminChallengeWithSteps(supabase, c.id);
      if (res) {
        setChallengeSteps(res.steps);
      }
    } catch (err) {
      console.error("[handleOpenStepsModal] Erreur :", err);
    } finally {
      setIsLoadingSteps(false);
    }
  };

  const handleOpenAddStep = () => {
    setEditingStep(null);
    setStepTitle("");
    setStepDescription("");
    setStepVideoUrl("");
    setStepIsActive(true);
    setIsStepFormOpen(true);
  };

  const handleOpenEditStep = (step: ChallengeStep) => {
    setEditingStep(step);
    setStepTitle(step.title);
    setStepDescription(step.description || "");
    setStepVideoUrl(step.video_url || "");
    setStepIsActive(step.is_active);
    setIsStepFormOpen(true);
  };

  const handleSaveStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stepsModalChallenge || !stepTitle.trim()) {
      showNotification("Le titre de l'étape est obligatoire.", "error");
      return;
    }

    setIsSubmittingStep(true);
    try {
      if (editingStep) {
        const res = await updateAdminChallengeStep(supabase, editingStep.id, {
          title: stepTitle.trim(),
          description: stepDescription.trim() || null,
          video_url: stepVideoUrl.trim() || null,
          is_active: stepIsActive,
        });

        if (res.success) {
          showNotification("Étape mise à jour avec succès.");
          setIsStepFormOpen(false);
          // Recharger
          const refreshed = await getAdminChallengeWithSteps(supabase, stepsModalChallenge.id);
          if (refreshed) setChallengeSteps(refreshed.steps);
          await fetchChallenges();
        } else {
          showNotification(res.error || "Erreur lors de la mise à jour de l'étape.", "error");
        }
      } else {
        const res = await createAdminChallengeStep(supabase, stepsModalChallenge.id, {
          title: stepTitle.trim(),
          description: stepDescription.trim() || null,
          video_url: stepVideoUrl.trim() || null,
          is_active: stepIsActive,
        });

        if (res.success) {
          showNotification("Nouvelle étape ajoutée au défi.");
          setIsStepFormOpen(false);
          // Recharger
          const refreshed = await getAdminChallengeWithSteps(supabase, stepsModalChallenge.id);
          if (refreshed) setChallengeSteps(refreshed.steps);
          await fetchChallenges();
        } else {
          showNotification(res.error || "Erreur lors de l'ajout de l'étape.", "error");
        }
      }
    } finally {
      setIsSubmittingStep(false);
    }
  };

  const handleDeleteStep = async (stepId: string) => {
    if (!stepsModalChallenge) return;
    const res = await deleteAdminChallengeStep(supabase, stepId);
    if (res.success) {
      showNotification("Étape supprimée.");
      const refreshed = await getAdminChallengeWithSteps(supabase, stepsModalChallenge.id);
      if (refreshed) setChallengeSteps(refreshed.steps);
      await fetchChallenges();
    } else {
      showNotification(res.error || "Erreur suppression étape.", "error");
    }
  };

  const handleMoveStep = async (index: number, direction: "up" | "down") => {
    if (!stepsModalChallenge) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= challengeSteps.length) return;

    const newSteps = [...challengeSteps];
    const [moved] = newSteps.splice(index, 1);
    newSteps.splice(targetIndex, 0, moved);

    setChallengeSteps(newSteps);

    const stepIdsInOrder = newSteps.map((s) => s.id);
    const res = await reorderAdminChallengeSteps(supabase, stepsModalChallenge.id, stepIdsInOrder);

    if (res.success) {
      showNotification("Ordre des étapes réorganisé.");
      const refreshed = await getAdminChallengeWithSteps(supabase, stepsModalChallenge.id);
      if (refreshed) setChallengeSteps(refreshed.steps);
    } else {
      showNotification(res.error || "Erreur réorganisation des étapes.", "error");
    }
  };

  // Helper styles catégorie
  const getCategoryTheme = (cat: ChallengeCategory) => {
    switch (cat) {
      case "Technique":
        return {
          badge: "bg-[#00d8ff]/15 text-[#00d8ff] border-[#00d8ff]/30",
          icon: <Flame size={14} className="text-[#00d8ff]" />,
          border: "hover:border-[#00d8ff]/50",
          glow: "shadow-[#00d8ff]/10",
        };
      case "Physique":
        return {
          badge: "bg-amber-500/15 text-amber-400 border-amber-500/30",
          icon: <Dumbbell size={14} className="text-amber-400" />,
          border: "hover:border-amber-500/50",
          glow: "shadow-amber-500/10",
        };
      case "Cardio":
        return {
          badge: "bg-rose-500/15 text-rose-400 border-rose-500/30",
          icon: <HeartPulse size={14} className="text-rose-400" />,
          border: "hover:border-rose-500/50",
          glow: "shadow-rose-500/10",
        };
      case "Nutrition":
        return {
          badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
          icon: <Apple size={14} className="text-emerald-400" />,
          border: "hover:border-emerald-500/50",
          glow: "shadow-emerald-500/10",
        };
    }
  };

  // Filtrage
  const filteredChallenges = challenges.filter((c) => {
    if (filterStatus !== "Tous" && c.status !== filterStatus) return false;
    if (filterCategory !== "Toutes" && c.category !== filterCategory) return false;
    return true;
  });

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-7xl mx-auto pb-24">
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          EN-TÊTE PRINCIPAL
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-white/10 pb-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#00d8ff]/10 border border-[#00d8ff]/30 rounded-full text-[#00d8ff] text-xs font-semibold uppercase tracking-wider mb-1">
            <Trophy size={13} />
            <span>Gamification & Progression</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-heading font-black uppercase tracking-wider text-brand-white">
            GESTION DES <span className="text-[#00d8ff]">DÉFIS</span>
          </h1>
          <p className="text-xs sm:text-sm text-brand-white/60 max-w-2xl">
            Créez des défis par étapes avec vidéos pédagogiques, gérez leur publication et suivez la progression des membres.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchChallenges}
            disabled={isLoading}
            className="p-2.5 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white rounded-xl border border-brand-white/10 transition-all cursor-pointer disabled:opacity-50"
            title="Actualiser"
          >
            <RefreshCw size={16} className={cn(isLoading && "animate-spin")} />
          </button>

          <button
            onClick={handleOpenCreateChallenge}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#00d8ff] hover:bg-brand-white text-black font-heading font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-[#00d8ff]/20 cursor-pointer shrink-0"
          >
            <Plus size={16} />
            Créer un défi
          </button>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          NOTIFICATION TOAST
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn(
              "fixed top-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-heading font-bold uppercase border",
              notification.type === "success"
                ? "bg-[#0f172a] border-[#00d8ff] text-[#00d8ff]"
                : "bg-red-950 border-red-500 text-red-300"
            )}
          >
            {notification.type === "success" ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
            <span>{notification.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          BARRE DE FILTRES
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Filtre Statut */}
        <div className="flex items-center gap-1.5 bg-[#0f172a] p-1 rounded-xl border border-brand-white/10">
          {(["Tous", "published", "draft", "archived"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterStatus(tab)}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-heading font-bold uppercase tracking-wider transition-all cursor-pointer",
                filterStatus === tab
                  ? "bg-[#00d8ff] text-black shadow-md"
                  : "text-brand-white/60 hover:text-brand-white"
              )}
            >
              {tab === "Tous" ? "Tous" : tab === "published" ? "Publiés" : tab === "draft" ? "Brouillons" : "Archivés"}
            </button>
          ))}
        </div>

        {/* Filtre Catégorie */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setFilterCategory("Toutes")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-heading font-bold uppercase tracking-wider transition-all cursor-pointer border",
              filterCategory === "Toutes"
                ? "bg-brand-white text-black border-brand-white"
                : "bg-brand-white/5 text-brand-white/60 border-brand-white/10 hover:text-brand-white"
            )}
          >
            Toutes
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-heading font-bold uppercase tracking-wider transition-all cursor-pointer border",
                filterCategory === cat
                  ? "bg-[#00d8ff] text-black border-[#00d8ff]"
                  : "bg-brand-white/5 text-brand-white/60 border-brand-white/10 hover:text-brand-white"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          GRILLE DES DÉFIS
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {isLoading ? (
        <div className="py-16 text-center space-y-3">
          <RefreshCw size={24} className="mx-auto text-[#00d8ff] animate-spin" />
          <p className="text-xs text-brand-white/50 uppercase font-heading">Chargement des défis...</p>
        </div>
      ) : filteredChallenges.length === 0 ? (
        <div className="bg-[#0f172a]/60 border border-brand-white/10 border-dashed rounded-2xl p-12 text-center space-y-4">
          <Trophy size={36} className="mx-auto text-brand-white/30" />
          <h3 className="text-base font-heading font-bold uppercase text-brand-white">Aucun défi trouvé</h3>
          <p className="text-xs text-brand-white/50 max-w-md mx-auto">
            {filterStatus !== "Tous" || filterCategory !== "Toutes"
              ? "Aucun défi ne correspond aux filtres sélectionnés."
              : "Créez votre premier défi pour commencer à engager vos membres."}
          </p>
          <button
            onClick={handleOpenCreateChallenge}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#00d8ff] hover:bg-brand-white text-black font-heading font-black text-xs uppercase rounded-xl transition-all cursor-pointer"
          >
            <Plus size={14} /> Créer un défi
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredChallenges.map((c) => {
            const theme = getCategoryTheme(c.category);

            return (
              <div
                key={c.id}
                className={cn(
                  "rounded-2xl border p-5 flex flex-col justify-between gap-5 transition-all shadow-xl",
                  c.is_active
                    ? `bg-[#0f172a] border-brand-white/10 ${theme.border}`
                    : "bg-zinc-900/60 border-zinc-800 opacity-65"
                )}
              >
                {/* Top Info */}
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "text-[10px] font-black uppercase px-2.5 py-1 rounded-full border flex items-center gap-1.5",
                        theme.badge
                      )}
                    >
                      {theme.icon}
                      {c.category}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "text-[9px] font-black uppercase px-2 py-0.5 rounded border",
                          c.status === "published"
                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                            : c.status === "draft"
                            ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                            : "bg-zinc-800 text-zinc-400 border-zinc-700"
                        )}
                      >
                        {c.status === "published" ? "Publié" : c.status === "draft" ? "Brouillon" : "Archivé"}
                      </span>

                      <button
                        onClick={() => handleToggleActive(c)}
                        className={cn(
                          "text-[9px] font-black uppercase px-2 py-0.5 rounded border transition-colors cursor-pointer",
                          c.is_active
                            ? "bg-emerald-950/60 text-emerald-300 border-emerald-500/40"
                            : "bg-red-950/60 text-red-400 border-red-500/40"
                        )}
                        title="Cliquer pour activer/désactiver"
                      >
                        {c.is_active ? "Actif" : "Inactif"}
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] font-bold text-brand-white/50 uppercase tracking-wider mb-1">
                      Niveau : {c.level}
                    </div>
                    <h3 className="text-lg font-heading font-black uppercase tracking-wider text-brand-white line-clamp-1">
                      {c.title}
                    </h3>
                    <p className="text-xs text-brand-white/70 mt-1 line-clamp-2 min-h-[32px]">
                      {c.short_description || c.description || "Aucune description renseignée."}
                    </p>
                  </div>

                  {/* Métriques */}
                  <div className="bg-black/30 border border-brand-white/5 rounded-xl p-3 grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <span className="text-[10px] text-brand-white/50 uppercase font-bold block">Étapes</span>
                      <span className="font-heading font-black text-brand-white flex items-center justify-center gap-1">
                        <ListOrdered size={12} className="text-[#00d8ff]" />
                        {c.stepsCount}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-brand-white/50 uppercase font-bold block">Points XP</span>
                      <span className="font-heading font-black text-[#00d8ff] flex items-center justify-center gap-1">
                        <Sparkles size={12} />
                        +{c.points_xp}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-brand-white/50 uppercase font-bold block">Inscrits</span>
                      <span className="font-heading font-black text-amber-400 flex items-center justify-center gap-1">
                        <Award size={12} />
                        {c.activeParticipantsCount}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-2 border-t border-brand-white/10">
                  <button
                    onClick={() => handleOpenStepsModal(c)}
                    className="w-full py-2.5 bg-[#00d8ff]/15 hover:bg-[#00d8ff] text-[#00d8ff] hover:text-black border border-[#00d8ff]/30 rounded-xl font-heading font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    <ListOrdered size={14} />
                    Gérer les étapes ({c.stepsCount})
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEditChallenge(c)}
                      className="flex-1 py-2 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white rounded-lg text-xs font-heading font-bold uppercase transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Edit2 size={12} />
                      Modifier
                    </button>

                    {c.status !== "published" && (
                      <button
                        onClick={() => handleChangeStatus(c, "published")}
                        className="py-2 px-3 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-heading font-bold uppercase transition-colors cursor-pointer"
                        title="Publier ce défi"
                      >
                        Publier
                      </button>
                    )}

                    {c.status === "published" && (
                      <button
                        onClick={() => handleChangeStatus(c, "draft")}
                        className="py-2 px-3 bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-heading font-bold uppercase transition-colors cursor-pointer"
                        title="Passer en brouillon"
                      >
                        Dépublier
                      </button>
                    )}

                    <button
                      onClick={() => setChallengeToDelete(c)}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                      title="Supprimer définitivement"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MODAL 1 : CRÉATION / MODIFICATION DE DÉFI
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatePresence>
        {isChallengeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsChallengeModalOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-2xl bg-[#0f172a] border border-[#00d8ff]/30 rounded-2xl p-6 sm:p-8 shadow-2xl z-10 max-h-[90vh] overflow-y-auto space-y-6"
            >
              <div className="flex items-center justify-between pb-3 border-b border-brand-white/10">
                <div className="flex items-center gap-2.5">
                  <Trophy size={20} className="text-[#00d8ff]" />
                  <h3 className="text-xl font-heading font-black uppercase tracking-wider text-brand-white">
                    {editingChallenge ? "Modifier le défi" : "Créer un nouveau défi"}
                  </h3>
                </div>
                <button
                  onClick={() => setIsChallengeModalOpen(false)}
                  className="text-brand-white/50 hover:text-brand-white cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveChallenge} className="space-y-4 text-xs">
                {/* Titre */}
                <div>
                  <label className="text-brand-white/70 uppercase font-bold block mb-1.5">Titre du défi *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Maîtrise du Jab & Déplacements"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-brand-white focus:border-[#00d8ff] outline-none"
                  />
                </div>

                {/* Catégorie & Niveau */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-brand-white/70 uppercase font-bold block mb-1.5">Catégorie *</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as ChallengeCategory)}
                      className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-brand-white focus:border-[#00d8ff] outline-none"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-brand-white/70 uppercase font-bold block mb-1.5">Niveau *</label>
                    <select
                      value={formLevel}
                      onChange={(e) => setFormLevel(e.target.value as ChallengeLevel)}
                      className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-brand-white focus:border-[#00d8ff] outline-none"
                    >
                      {LEVELS.map((lvl) => (
                        <option key={lvl} value={lvl}>
                          {lvl}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Description courte */}
                <div>
                  <label className="text-brand-white/70 uppercase font-bold block mb-1.5">Description courte (aperçu carte)</label>
                  <input
                    type="text"
                    placeholder="Ex: Perfectionnez votre coup le plus rapide en 4 étapes clés."
                    value={formShortDescription}
                    onChange={(e) => setFormShortDescription(e.target.value)}
                    className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-brand-white focus:border-[#00d8ff] outline-none"
                  />
                </div>

                {/* Description complète */}
                <div>
                  <label className="text-brand-white/70 uppercase font-bold block mb-1.5">Description complète</label>
                  <textarea
                    rows={3}
                    placeholder="Détails du programme, objectifs et consignes générales..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-brand-white focus:border-[#00d8ff] outline-none"
                  />
                </div>

                {/* Image de couverture */}
                <div>
                  <label className="text-brand-white/70 uppercase font-bold block mb-1.5">URL image de couverture (optionnel)</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={formCoverImageUrl}
                    onChange={(e) => setFormCoverImageUrl(e.target.value)}
                    className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-brand-white focus:border-[#00d8ff] outline-none"
                  />
                </div>

                {/* Gamification : Points XP & Badge */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-brand-white/70 uppercase font-bold block mb-1.5">Points XP</label>
                    <input
                      type="number"
                      min={0}
                      step={50}
                      value={formPointsXp}
                      onChange={(e) => setFormPointsXp(Number(e.target.value))}
                      className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-brand-white focus:border-[#00d8ff] outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-brand-white/70 uppercase font-bold block mb-1.5">Nom du Badge de récompense</label>
                    <input
                      type="text"
                      placeholder="Ex: Gant d'Or"
                      value={formBadgeReward}
                      onChange={(e) => setFormBadgeReward(e.target.value)}
                      className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-brand-white focus:border-[#00d8ff] outline-none"
                    />
                  </div>
                </div>

                {/* Statut & Visibilité */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-brand-white/10">
                  <div>
                    <label className="text-brand-white/70 uppercase font-bold block mb-1.5">Statut de publication</label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as ChallengeStatus)}
                      className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-brand-white focus:border-[#00d8ff] outline-none"
                    >
                      <option value="draft">Brouillon (non visible des membres)</option>
                      <option value="published">Publié (accessible aux membres)</option>
                      <option value="archived">Archivé</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-black/30 border border-brand-white/5 rounded-xl self-end">
                    <span className="text-brand-white font-bold uppercase text-[11px]">Actif dans l&apos;application</span>
                    <input
                      type="checkbox"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                      className="w-5 h-5 accent-[#00d8ff] rounded cursor-pointer"
                    />
                  </div>
                </div>

                {/* Boutons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsChallengeModalOpen(false)}
                    className="flex-1 py-3 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white/70 font-heading font-bold text-xs uppercase rounded-xl transition-all cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingChallenge}
                    className="flex-1 py-3 bg-[#00d8ff] hover:bg-brand-white text-black font-heading font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg shadow-[#00d8ff]/20 disabled:opacity-50"
                  >
                    {isSubmittingChallenge ? "Enregistrement..." : editingChallenge ? "Mettre à jour" : "Créer le défi"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MODAL 2 : GESTIONNAIRE D'ÉTAPES & VIDÉOS
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatePresence>
        {stepsModalChallenge && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setStepsModalChallenge(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-3xl bg-[#0f172a] border border-[#00d8ff]/30 rounded-2xl p-6 sm:p-8 shadow-2xl z-10 max-h-[90vh] overflow-y-auto space-y-6"
            >
              {/* En-tête modal étapes */}
              <div className="flex items-center justify-between pb-4 border-b border-brand-white/10">
                <div>
                  <div className="text-[10px] uppercase font-bold text-[#00d8ff] tracking-wider">
                    Gestion des Étapes & Vidéos
                  </div>
                  <h3 className="text-xl font-heading font-black uppercase tracking-wider text-brand-white mt-0.5">
                    {stepsModalChallenge.title}
                  </h3>
                </div>
                <button
                  onClick={() => setStepsModalChallenge(null)}
                  className="text-brand-white/50 hover:text-brand-white cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Liste des étapes actuelles */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-heading font-bold uppercase tracking-wider text-brand-white">
                    Étapes du programme ({challengeSteps.length})
                  </span>

                  {!isStepFormOpen && (
                    <button
                      onClick={handleOpenAddStep}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#00d8ff] hover:bg-brand-white text-black font-heading font-bold text-xs uppercase rounded-lg transition-all cursor-pointer"
                    >
                      <Plus size={14} /> Ajouter une étape
                    </button>
                  )}
                </div>

                {isLoadingSteps ? (
                  <div className="py-8 text-center">
                    <RefreshCw size={20} className="mx-auto text-[#00d8ff] animate-spin" />
                  </div>
                ) : challengeSteps.length === 0 && !isStepFormOpen ? (
                  <div className="bg-black/30 border border-brand-white/10 rounded-xl p-8 text-center space-y-2">
                    <ListOrdered size={24} className="mx-auto text-brand-white/40" />
                    <p className="text-xs text-brand-white/60">Ce défi ne contient encore aucune étape.</p>
                    <button
                      onClick={handleOpenAddStep}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#00d8ff] text-black font-heading font-bold text-xs uppercase rounded-lg mt-2 cursor-pointer"
                    >
                      <Plus size={14} /> Créer la 1ère étape
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {challengeSteps.map((step, idx) => (
                      <div
                        key={step.id}
                        className="bg-[#0b1322] border border-brand-white/10 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg hover:border-[#00d8ff]/30 transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <span className="w-7 h-7 rounded-lg bg-[#00d8ff]/20 text-[#00d8ff] font-heading font-black text-xs flex items-center justify-center shrink-0 border border-[#00d8ff]/30">
                            {step.step_order}
                          </span>

                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-heading font-bold uppercase text-brand-white">
                                {step.title}
                              </h4>
                              {!step.is_active && (
                                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                                  Désactivée
                                </span>
                              )}
                            </div>

                            {step.description && (
                              <p className="text-xs text-brand-white/70 line-clamp-1">{step.description}</p>
                            )}

                            {step.video_url && (
                              <div className="flex items-center gap-1.5 text-[11px] text-[#00d8ff]">
                                <Video size={12} />
                                <a
                                  href={step.video_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="underline hover:text-brand-white line-clamp-1 max-w-xs"
                                >
                                  {step.video_url}
                                </a>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions Réordonnancement & Modification */}
                        <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                          <button
                            disabled={idx === 0}
                            onClick={() => handleMoveStep(idx, "up")}
                            className="p-1.5 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white rounded-lg disabled:opacity-30 cursor-pointer"
                            title="Monter"
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            disabled={idx === challengeSteps.length - 1}
                            onClick={() => handleMoveStep(idx, "down")}
                            className="p-1.5 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white rounded-lg disabled:opacity-30 cursor-pointer"
                            title="Descendre"
                          >
                            <ArrowDown size={14} />
                          </button>
                          <button
                            onClick={() => handleOpenEditStep(step)}
                            className="p-1.5 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white rounded-lg cursor-pointer ml-1"
                            title="Modifier"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteStep(step.id)}
                            className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg cursor-pointer"
                            title="Supprimer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Formulaire Ajout / Édition Étape */}
              {isStepFormOpen && (
                <div className="bg-black/40 border border-[#00d8ff]/30 rounded-xl p-5 space-y-4 pt-4">
                  <div className="flex items-center justify-between border-b border-brand-white/10 pb-2">
                    <span className="font-heading font-black uppercase text-xs text-[#00d8ff]">
                      {editingStep ? `Modifier l'étape ${editingStep.step_order}` : "Nouvelle étape"}
                    </span>
                    <button onClick={() => setIsStepFormOpen(false)} className="text-brand-white/50 hover:text-brand-white">
                      <X size={16} />
                    </button>
                  </div>

                  <form onSubmit={handleSaveStep} className="space-y-3 text-xs">
                    <div>
                      <label className="text-brand-white/70 uppercase font-bold block mb-1">Titre de l&apos;étape *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Fondamentaux du Jab et posture"
                        value={stepTitle}
                        onChange={(e) => setStepTitle(e.target.value)}
                        className="w-full bg-[#0a1120] border border-brand-white/10 rounded-lg p-2.5 text-brand-white focus:border-[#00d8ff] outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-brand-white/70 uppercase font-bold block mb-1">Description & Consignes de validation</label>
                      <textarea
                        rows={2}
                        placeholder="Explication technique, erreurs à éviter, critères pour valider..."
                        value={stepDescription}
                        onChange={(e) => setStepDescription(e.target.value)}
                        className="w-full bg-[#0a1120] border border-brand-white/10 rounded-lg p-2.5 text-brand-white focus:border-[#00d8ff] outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-brand-white/70 uppercase font-bold block mb-1">URL Vidéo démonstrative (YouTube, Vimeo, MP4)</label>
                      <input
                        type="url"
                        placeholder="https://www.youtube.com/watch?v=..."
                        value={stepVideoUrl}
                        onChange={(e) => setStepVideoUrl(e.target.value)}
                        className="w-full bg-[#0a1120] border border-brand-white/10 rounded-lg p-2.5 text-brand-white focus:border-[#00d8ff] outline-none"
                      />
                    </div>

                    {/* Aperçu vidéo simple si URL renseignée */}
                    {stepVideoUrl && (
                      <div className="p-3 bg-[#0a1120] border border-brand-white/10 rounded-lg flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-xs text-brand-white/80">
                          <Play size={14} className="text-[#00d8ff]" />
                          <span className="line-clamp-1">{stepVideoUrl}</span>
                        </div>
                        <a
                          href={stepVideoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-[#00d8ff] hover:underline flex items-center gap-1 shrink-0"
                        >
                          Tester le lien <ExternalLink size={10} />
                        </a>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={stepIsActive}
                          onChange={(e) => setStepIsActive(e.target.checked)}
                          className="w-4 h-4 accent-[#00d8ff] rounded"
                        />
                        <span className="text-brand-white font-bold uppercase text-[11px]">Étape active</span>
                      </label>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsStepFormOpen(false)}
                          className="px-3 py-1.5 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white rounded-lg text-xs font-bold uppercase"
                        >
                          Annuler
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmittingStep}
                          className="px-4 py-1.5 bg-[#00d8ff] hover:bg-brand-white text-black rounded-lg text-xs font-heading font-black uppercase tracking-wider disabled:opacity-50"
                        >
                          {isSubmittingStep ? "Enregistrement..." : editingStep ? "Mettre à jour" : "Ajouter"}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}

              <div className="pt-2 border-t border-brand-white/10 flex justify-end">
                <button
                  onClick={() => setStepsModalChallenge(null)}
                  className="px-5 py-2.5 bg-brand-white/10 hover:bg-brand-white/20 text-brand-white rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MODAL 3 : CONFIRMATION DE SUPPRESSION
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatePresence>
        {challengeToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setChallengeToDelete(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-[#0f172a] border border-red-500/40 rounded-2xl p-6 sm:p-8 shadow-2xl z-10 space-y-5 text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto">
                <AlertTriangle size={28} />
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-heading font-black uppercase tracking-wider text-brand-white">
                  Supprimer définitivement ce défi ?
                </h3>
                <p className="text-xs text-brand-white/70 leading-relaxed">
                  Êtes-vous sûr de vouloir supprimer le défi <strong className="text-red-400">« {challengeToDelete.title} »</strong> ?
                </p>
                <p className="text-[11px] text-brand-white/50 bg-red-950/30 p-2.5 rounded-xl border border-red-500/20 text-left">
                  ⚠️ <strong>Attention :</strong> Toutes les étapes associées ainsi que les données de progression des membres sur ce défi seront définitivement supprimées en cascade.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setChallengeToDelete(null)}
                  disabled={isDeletingChallenge}
                  className="flex-1 py-3 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white/70 font-heading font-bold text-xs uppercase rounded-xl transition-all cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteChallenge}
                  disabled={isDeletingChallenge}
                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-heading font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg shadow-red-500/20 disabled:opacity-50"
                >
                  {isDeletingChallenge ? "Suppression..." : "Supprimer"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
