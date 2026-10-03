"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  X,
  RefreshCw,
  ListOrdered,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
} from "lucide-react";
import {
  getAdminChallengesServerAction,
  getAdminChallengeWithStepsServerAction,
  createAdminChallengeServerAction,
  updateAdminChallengeServerAction,
  deleteAdminChallengeServerAction,
  createAdminChallengeStepServerAction,
  updateAdminChallengeStepServerAction,
  deleteAdminChallengeStepServerAction,
  reorderAdminChallengeStepsServerAction,
} from "@/app/(admin)/admin/defis/actions";
import type {
  Challenge,
  ChallengeStep,
  ChallengeCategory,
  ChallengeLevel,
  ChallengeStatus,
} from "@/lib/supabase/challenges";
import { cn } from "@/lib/utils";

const CATEGORIES: ChallengeCategory[] = ["Technique", "Physique", "Cardio", "Nutrition"];
const LEVELS: ChallengeLevel[] = ["Débutant", "Intermédiaire", "Confirmé", "Tous niveaux"];

export default function AdminChallengesTab() {
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

  const fetchChallenges = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getAdminChallengesServerAction();
      if (res.success && res.data) {
        setChallenges(res.data);
      } else {
        showNotification(res.error || "Erreur lors du chargement des défis.", "error");
      }
    } catch (err) {
      console.error("[AdminChallengesTab] Erreur chargement :", err);
      showNotification("Erreur lors du chargement des défis.", "error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChallenges();
  }, [fetchChallenges]);

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
        if (formStatus === "published") {
          const match = challenges.find((c) => c.id === editingChallenge.id);
          if (match && match.stepsCount === 0) {
            showNotification(
              "Impossible de publier ce défi : il doit comporter au moins 1 étape active.",
              "error"
            );
            setIsSubmittingChallenge(false);
            return;
          }
        }

        const res = await updateAdminChallengeServerAction(editingChallenge.id, payload);
        if (res.success) {
          showNotification(`Défi « ${formTitle} » mis à jour avec succès.`);
          setIsChallengeModalOpen(false);
          await fetchChallenges();
        } else {
          showNotification(res.error || "Erreur lors de la mise à jour.", "error");
        }
      } else {
        const res = await createAdminChallengeServerAction(payload);
        if (res.success) {
          showNotification(`Défi « ${formTitle} » créé avec succès.`);
          setIsChallengeModalOpen(false);
          await fetchChallenges();
        } else {
          showNotification(res.error || "Erreur lors de la création.", "error");
        }
      }
    } finally {
      setIsSubmittingChallenge(false);
    }
  };

  const handleToggleActive = async (c: Challenge) => {
    const newStatus = !c.is_active;
    const res = await updateAdminChallengeServerAction(c.id, { is_active: newStatus });
    if (res.success) {
      showNotification(`Défi « ${c.title} » ${newStatus ? "activé" : "désactivé"}.`);
      await fetchChallenges();
    } else {
      showNotification(res.error || "Erreur lors du changement de statut.", "error");
    }
  };

  const handleConfirmDeleteChallenge = async () => {
    if (!challengeToDelete) return;
    setIsDeletingChallenge(true);
    try {
      const res = await deleteAdminChallengeServerAction(challengeToDelete.id);
      if (res.success) {
        showNotification(`Défi supprimé avec succès.`);
        setChallengeToDelete(null);
        await fetchChallenges();
      } else {
        showNotification(res.error || "Erreur lors de la suppression.", "error");
      }
    } finally {
      setIsDeletingChallenge(false);
    }
  };

  // Steps
  const handleOpenStepsModal = async (c: Challenge) => {
    setStepsModalChallenge(c);
    setIsStepFormOpen(false);
    setEditingStep(null);
    setIsLoadingSteps(true);
    try {
      const res = await getAdminChallengeWithStepsServerAction(c.id);
      if (res.success && res.data) {
        setChallengeSteps(res.data.steps);
      }
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
    if (!stepsModalChallenge || !stepTitle.trim()) return;

    setIsSubmittingStep(true);
    try {
      const payload: Partial<ChallengeStep> = {
        title: stepTitle.trim(),
        description: stepDescription.trim() || null,
        video_url: stepVideoUrl.trim() || null,
        is_active: stepIsActive,
      };

      if (editingStep) {
        const res = await updateAdminChallengeStepServerAction(editingStep.id, payload);
        if (res.success) {
          showNotification(`Étape mise à jour.`);
          setIsStepFormOpen(false);
          await handleOpenStepsModal(stepsModalChallenge);
          await fetchChallenges();
        }
      } else {
        const res = await createAdminChallengeStepServerAction(stepsModalChallenge.id, payload);
        if (res.success) {
          showNotification(`Étape ajoutée.`);
          setIsStepFormOpen(false);
          await handleOpenStepsModal(stepsModalChallenge);
          await fetchChallenges();
        }
      }
    } finally {
      setIsSubmittingStep(false);
    }
  };

  const handleDeleteStep = async (stepId: string) => {
    if (!confirm("Voulez-vous supprimer cette étape ?")) return;
    const res = await deleteAdminChallengeStepServerAction(stepId);
    if (res.success && stepsModalChallenge) {
      showNotification("Étape supprimée.");
      await handleOpenStepsModal(stepsModalChallenge);
      await fetchChallenges();
    }
  };

  const handleMoveStep = async (index: number, direction: "up" | "down") => {
    if (!stepsModalChallenge) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= challengeSteps.length) return;

    const newSteps = [...challengeSteps];
    const temp = newSteps[index];
    newSteps[index] = newSteps[targetIndex];
    newSteps[targetIndex] = temp;

    setChallengeSteps(newSteps);
    const stepIdsInOrder = newSteps.map((s) => s.id);
    await reorderAdminChallengeStepsServerAction(stepsModalChallenge.id, stepIdsInOrder);
  };

  const filteredChallenges = challenges.filter((c) => {
    const matchesStatus = filterStatus === "Tous" || c.status === filterStatus;
    const matchesCategory = filterCategory === "Toutes" || c.category === filterCategory;
    return matchesStatus && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Toast */}
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
            {notification.type === "success" ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
            <span>{notification.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-heading font-black uppercase text-white tracking-wider">
            Défis & Gamification (V1)
          </h2>
          <p className="text-xs sm:text-sm text-white/60">
            Gestion des défis sportifs par étapes, points XP et paliers.
          </p>
        </div>

        <button
          onClick={handleOpenCreateChallenge}
          className="px-4 py-2 rounded-xl bg-[#5E4075] text-white hover:bg-[#6f4d8b] font-heading font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Plus size={16} />
          <span>Créer un Défi</span>
        </button>
      </div>

      {/* Tableau des Défis */}
      <div className="bg-black border border-white/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs text-white/80">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 text-[11px] font-heading font-bold uppercase tracking-wider text-white/60">
                <th className="p-4">Défi</th>
                <th className="p-4">Catégorie / Niveau</th>
                <th className="p-4">Étapes</th>
                <th className="p-4">XP</th>
                <th className="p-4">Statut</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-white/40">
                    <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-[#F8F9ED]" />
                    <span>Chargement des défis...</span>
                  </td>
                </tr>
              ) : filteredChallenges.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-white/40">
                    Aucun défi trouvé.
                  </td>
                </tr>
              ) : (
                filteredChallenges.map((c) => (
                  <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-white">{c.title}</div>
                      <p className="text-[11px] text-white/40 line-clamp-1">{c.short_description || c.description}</p>
                    </td>

                    <td className="p-4">
                      <div className="space-y-0.5">
                        <span className="px-2 py-0.5 rounded bg-white/5 text-[10px] font-semibold">{c.category}</span>
                        <div className="text-[10px] text-white/50">{c.level}</div>
                      </div>
                    </td>

                    <td className="p-4">
                      <button
                        onClick={() => handleOpenStepsModal(c)}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[#F8F9ED] font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <ListOrdered size={13} />
                        <span>{c.stepsCount} étape{c.stepsCount > 1 ? "s" : ""}</span>
                      </button>
                    </td>

                    <td className="p-4">
                      <div className="space-y-0.5">
                        <span className="text-[#F8F9ED] font-bold">+{c.points_xp} XP</span>
                        {c.badge_reward && <div className="text-[10px] text-white/50">{c.badge_reward}</div>}
                      </div>
                    </td>

                    <td className="p-4">
                      <button
                        onClick={() => handleToggleActive(c)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                          c.is_active
                            ? "bg-[#5E4075]/20 border-[#5E4075]/40 text-[#F8F9ED]"
                            : "bg-white/5 border-white/10 text-white/40"
                        }`}
                      >
                        {c.is_active ? "Actif" : "Inactif"}
                      </button>
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEditChallenge(c)}
                          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white cursor-pointer"
                          title="Modifier"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => setChallengeToDelete(c)}
                          className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 cursor-pointer"
                          title="Supprimer"
                        >
                          <Trash2 size={13} />
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

      {/* Modal Défi */}
      <AnimatePresence>
        {isChallengeModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-black border border-white/15 rounded-2xl w-full max-w-xl p-6 space-y-4 shadow-2xl text-xs text-white"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h3 className="text-base font-heading font-black uppercase text-white">
                  {editingChallenge ? "Modifier le Défi" : "Nouveau Défi"}
                </h3>
                <button onClick={() => setIsChallengeModalOpen(false)} className="text-white/60 hover:text-white cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveChallenge} className="space-y-3">
                <div className="space-y-1">
                  <label className="font-bold text-white/70 uppercase">Titre du défi *</label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-[#5E4075]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-white/70 uppercase">Catégorie</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as ChallengeCategory)}
                      className="w-full px-3 py-2 rounded-lg bg-black border border-white/10 text-white"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-white/70 uppercase">Niveau</label>
                    <select
                      value={formLevel}
                      onChange={(e) => setFormLevel(e.target.value as ChallengeLevel)}
                      className="w-full px-3 py-2 rounded-lg bg-black border border-white/10 text-white"
                    >
                      {LEVELS.map((lvl) => (
                        <option key={lvl} value={lvl}>{lvl}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-white/70 uppercase">Description courte</label>
                  <input
                    type="text"
                    value={formShortDescription}
                    onChange={(e) => setFormShortDescription(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-[#5E4075]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-white/70 uppercase">Points XP</label>
                    <input
                      type="number"
                      value={formPointsXp}
                      onChange={(e) => setFormPointsXp(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-white/70 uppercase">Palier / Récompense</label>
                    <input
                      type="text"
                      value={formBadgeReward}
                      onChange={(e) => setFormBadgeReward(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsChallengeModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingChallenge}
                    className="px-5 py-2 rounded-xl bg-[#5E4075] hover:bg-[#6f4d8b] text-white font-heading font-black uppercase cursor-pointer"
                  >
                    {isSubmittingChallenge ? "Enregistrement..." : editingChallenge ? "Mettre à jour" : "Créer"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Étapes */}
      <AnimatePresence>
        {stepsModalChallenge && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-black border border-white/15 rounded-2xl w-full max-w-2xl p-6 space-y-4 shadow-2xl text-xs text-white max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div>
                  <h3 className="text-base font-heading font-black uppercase text-white">
                    Étapes du Défi : {stepsModalChallenge.title}
                  </h3>
                  <p className="text-[11px] text-white/50">{challengeSteps.length} étape(s) configurée(s)</p>
                </div>
                <button onClick={() => setStepsModalChallenge(null)} className="text-white/60 hover:text-white cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleOpenAddStep}
                  className="px-3 py-1.5 rounded-lg bg-[#5E4075] hover:bg-[#6f4d8b] text-white font-bold text-xs uppercase flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Ajouter une Étape</span>
                </button>
              </div>

              {/* Formulaire étape inline */}
              {isStepFormOpen && (
                <form onSubmit={handleSaveStep} className="p-4 rounded-xl bg-white/[0.03] border border-white/15 space-y-3">
                  <div className="font-bold uppercase text-[#F8F9ED]">
                    {editingStep ? "Modifier l'Étape" : "Nouvelle Étape"}
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Titre de l'étape"
                    value={stepTitle}
                    onChange={(e) => setStepTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-black border border-white/10 text-white font-bold focus:outline-none focus:border-[#5E4075]"
                  />
                  <textarea
                    rows={2}
                    placeholder="Description & consignes..."
                    value={stepDescription}
                    onChange={(e) => setStepDescription(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-black border border-white/10 text-white focus:outline-none focus:border-[#5E4075]"
                  />
                  <input
                    type="text"
                    placeholder="URL Vidéo démonstration (optionnel)"
                    value={stepVideoUrl}
                    onChange={(e) => setStepVideoUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-black border border-white/10 text-white font-mono text-[11px] focus:outline-none focus:border-[#5E4075]"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsStepFormOpen(false)}
                      className="px-3 py-1.5 rounded-lg bg-white/5 text-white cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingStep}
                      className="px-4 py-1.5 rounded-lg bg-[#5E4075] hover:bg-[#6f4d8b] text-white font-bold uppercase cursor-pointer"
                    >
                      {isSubmittingStep ? "Enregistrement..." : "Valider"}
                    </button>
                  </div>
                </form>
              )}

              {/* Liste des étapes */}
              <div className="space-y-2">
                {isLoadingSteps ? (
                  <div className="p-4 text-center text-white/40">Chargement...</div>
                ) : challengeSteps.length === 0 ? (
                  <div className="p-6 text-center text-white/40 bg-white/[0.02] rounded-xl border border-white/5">
                    Aucune étape pour l'instant.
                  </div>
                ) : (
                  challengeSteps.map((step, idx) => (
                    <div
                      key={step.id}
                      className="p-3 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-[#5E4075]/30 text-[#F8F9ED] text-xs font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div>
                          <h5 className="font-bold text-white text-xs">{step.title}</h5>
                          {step.description && <p className="text-[11px] text-white/50">{step.description}</p>}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleMoveStep(idx, "up")}
                          disabled={idx === 0}
                          className="p-1 rounded text-white/40 hover:text-white disabled:opacity-20 cursor-pointer"
                        >
                          <ArrowUp size={13} />
                        </button>
                        <button
                          onClick={() => handleMoveStep(idx, "down")}
                          disabled={idx === challengeSteps.length - 1}
                          className="p-1 rounded text-white/40 hover:text-white disabled:opacity-20 cursor-pointer"
                        >
                          <ArrowDown size={13} />
                        </button>
                        <button
                          onClick={() => handleOpenEditStep(step)}
                          className="p-1 rounded text-white/60 hover:text-white ml-1 cursor-pointer"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteStep(step.id)}
                          className="p-1 rounded text-rose-400 hover:text-rose-300 cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
