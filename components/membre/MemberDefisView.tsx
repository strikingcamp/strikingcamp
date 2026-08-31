"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  Flame,
  Target,
  Award,
  Zap,
  Lock,
  CheckCircle2,
  Play,
  ArrowLeft,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Dumbbell,
  HeartPulse,
  Apple,
  AlertCircle,
  Clock,
  Check,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useMember } from "@/components/membre/MemberContext";
import {
  getMemberChallenges,
  getMemberChallengeDetail,
  completeChallengeStep,
  type MemberChallengeCardData,
  type MemberChallengeDetailData,
  type MemberStepDetail,
  type ChallengeCategory,
} from "@/lib/supabase/challenges";
import { cn } from "@/lib/utils";

const CATEGORIES: { label: string; value: "Tous" | ChallengeCategory }[] = [
  { label: "Tous", value: "Tous" },
  { label: "Technique", value: "Technique" },
  { label: "Physique", value: "Physique" },
  { label: "Cardio", value: "Cardio" },
  { label: "Nutrition", value: "Nutrition" },
];

/**
 * Transforme les URLs de vidéos en iframe embed sécurisé pour YouTube / Vimeo
 */
function formatEmbedVideoUrl(rawUrl?: string | null): { type: "embed" | "video" | "direct"; url: string } | null {
  if (!rawUrl || !rawUrl.trim()) return null;
  const url = rawUrl.trim();

  // YouTube standard: youtube.com/watch?v=ID
  const ytWatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  if (ytWatch && ytWatch[1]) {
    return { type: "embed", url: `https://www.youtube-nocookie.com/embed/${ytWatch[1]}?rel=0&modestbranding=1` };
  }

  // Vimeo: vimeo.com/ID
  const vimeoMatch = url.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)/);
  if (vimeoMatch && vimeoMatch[1]) {
    return { type: "embed", url: `https://player.vimeo.com/video/${vimeoMatch[1]}` };
  }

  // Fichier vidéo direct (.mp4, .webm)
  if (url.match(/\.(mp4|webm|ogg)($|\?)/i)) {
    return { type: "video", url };
  }

  return { type: "direct", url };
}

export default function MemberDefisView() {
  const [supabase] = useState(() => createClient());
  const { currentUserId } = useMember();

  const [challenges, setChallenges] = useState<MemberChallengeCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<"Tous" | ChallengeCategory>("Tous");

  // Défi sélectionné pour affichage détaillé
  const [activeChallengeId, setActiveChallengeId] = useState<string | null>(null);
  const [challengeDetail, setChallengeDetail] = useState<MemberChallengeDetailData | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // État de validation d'étape en cours
  const [validatingStepId, setValidatingStepId] = useState<string | null>(null);
  const [completionMessage, setCompletionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modal de félicitations pour défi 100% terminé
  const [showCelebrationModal, setShowCelebrationModal] = useState(false);

  // Chargement de la liste des défis
  const fetchChallengesList = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getMemberChallenges(supabase, currentUserId || null);
      setChallenges(data);
    } catch (err) {
      console.error("[MemberDefisView] Erreur chargement défis :", err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, currentUserId]);

  useEffect(() => {
    fetchChallengesList();
  }, [fetchChallengesList]);

  // Chargement des détails du défi sélectionné
  const fetchChallengeDetail = useCallback(
    async (challengeId: string) => {
      setIsLoadingDetail(true);
      setCompletionMessage(null);
      try {
        const detail = await getMemberChallengeDetail(supabase, challengeId, currentUserId || null);
        setChallengeDetail(detail);
      } catch (err) {
        console.error("[MemberDefisView] Erreur détail défi :", err);
      } finally {
        setIsLoadingDetail(false);
      }
    },
    [supabase, currentUserId]
  );

  const handleOpenChallenge = (challengeId: string) => {
    setActiveChallengeId(challengeId);
    fetchChallengeDetail(challengeId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBackToList = () => {
    setActiveChallengeId(null);
    setChallengeDetail(null);
    setCompletionMessage(null);
    fetchChallengesList();
  };

  // Validation d'une étape
  const handleValidateStep = async (stepId: string) => {
    if (!challengeDetail) return;
    setValidatingStepId(stepId);
    setCompletionMessage(null);

    try {
      const res = await completeChallengeStep(supabase, challengeDetail.id, stepId);

      if (res.success) {
        setCompletionMessage({
          type: "success",
          text: res.message || "Étape validée avec succès !",
        });

        // Recharger le détail pour actualiser l'état et débloquer l'étape suivante
        await fetchChallengeDetail(challengeDetail.id);

        if (res.isCompleted) {
          setShowCelebrationModal(true);
        }
      } else {
        let errorMsg = res.error || "Impossible de valider cette étape.";
        if (res.error === "PREVIOUS_STEPS_REQUIRED") {
          errorMsg = "Vous devez d'abord terminer les étapes précédentes.";
        } else if (res.error === "ALREADY_COMPLETED") {
          errorMsg = "Vous avez déjà validé cette étape.";
        } else if (res.error === "CHALLENGE_NOT_ACTIVE") {
          errorMsg = "Ce défi n'est plus disponible actuellement.";
        }
        setCompletionMessage({ type: "error", text: errorMsg });
      }
    } catch (err) {
      console.error("[handleValidateStep] Exception :", err);
      setCompletionMessage({ type: "error", text: "Une erreur réseau est survenue." });
    } finally {
      setValidatingStepId(null);
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
          glow: "from-[#0c182c] via-[#0f172a] to-[#131f37]",
          accent: "#00d8ff",
        };
      case "Physique":
        return {
          badge: "bg-amber-500/15 text-amber-400 border-amber-500/30",
          icon: <Dumbbell size={14} className="text-amber-400" />,
          border: "hover:border-amber-500/50",
          glow: "from-[#22160b] via-[#1a130f] to-[#14100c]",
          accent: "#f59e0b",
        };
      case "Cardio":
        return {
          badge: "bg-rose-500/15 text-rose-400 border-rose-500/30",
          icon: <HeartPulse size={14} className="text-rose-400" />,
          border: "hover:border-rose-500/50",
          glow: "from-[#240c15] via-[#1c0f16] to-[#140b10]",
          accent: "#f43f5e",
        };
      case "Nutrition":
        return {
          badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
          icon: <Apple size={14} className="text-emerald-400" />,
          border: "hover:border-emerald-500/50",
          glow: "from-[#0a1e16] via-[#0b1713] to-[#08120e]",
          accent: "#10b981",
        };
    }
  };

  // Filtrage
  const filteredChallenges = challenges.filter((c) => {
    if (selectedCategory !== "Tous" && c.category !== selectedCategory) return false;
    return true;
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // VUE 1 : DÉTAIL D'UN DÉFI SÉLECTIONNÉ (ENTRAÎNEMENT & ÉTAPES)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (activeChallengeId) {
    if (isLoadingDetail || !challengeDetail) {
      return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center space-y-4">
          <RefreshCw size={28} className="mx-auto text-[#00d8ff] animate-spin" />
          <p className="text-xs font-heading uppercase text-brand-white/60 tracking-wider">
            Chargement du défi et de vos étapes...
          </p>
        </div>
      );
    }

    const theme = getCategoryTheme(challengeDetail.category);

    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8 pt-2 pb-24">
        {/* Bouton Retour */}
        <button
          onClick={handleBackToList}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white/80 hover:text-brand-white rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition-all border border-brand-white/10 cursor-pointer"
        >
          <ArrowLeft size={14} />
          Retour aux défis
        </button>

        {/* En-tête du Défi */}
        <div
          className={cn(
            "bg-gradient-to-br border rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden space-y-6",
            theme.glow,
            "border-brand-white/15"
          )}
        >
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={cn(
                    "text-[10px] font-black uppercase px-2.5 py-1 rounded-full border flex items-center gap-1.5",
                    theme.badge
                  )}
                >
                  {theme.icon}
                  {challengeDetail.category}
                </span>

                <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-brand-white/10 text-brand-white/80 border border-brand-white/15">
                  Niveau : {challengeDetail.level}
                </span>

                {challengeDetail.progressStatus === "completed" && (
                  <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                    <CheckCircle2 size={12} />
                    Défi Terminé
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-heading font-black uppercase tracking-wider text-brand-white">
                {challengeDetail.title}
              </h1>

              {challengeDetail.description && (
                <p className="text-xs sm:text-sm text-brand-white/80 leading-relaxed pt-1">
                  {challengeDetail.description}
                </p>
              )}
            </div>

            {/* Récompenses */}
            <div className="flex sm:flex-col items-center sm:items-end gap-3 shrink-0 bg-black/40 p-4 rounded-xl border border-brand-white/10">
              <div className="flex items-center gap-1.5 text-[#00d8ff] font-heading font-black text-sm">
                <Sparkles size={16} />
                +{challengeDetail.points_xp} XP
              </div>
              {challengeDetail.badge_reward && (
                <div className="flex items-center gap-1.5 text-amber-400 font-heading font-bold text-xs">
                  <Award size={14} />
                  {challengeDetail.badge_reward}
                </div>
              )}
            </div>
          </div>

          {/* Barre de Progression Globale */}
          <div className="space-y-2 pt-2 border-t border-brand-white/10">
            <div className="flex items-center justify-between text-xs font-heading font-bold uppercase tracking-wider">
              <span className="text-brand-white/70">
                {challengeDetail.completedStepsCount} sur {challengeDetail.steps.length} étapes validées
              </span>
              <span className="text-[#00d8ff]">{challengeDetail.progressPercentage} %</span>
            </div>

            <div className="w-full h-3 bg-black/50 rounded-full overflow-hidden border border-brand-white/10 p-0.5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${challengeDetail.progressPercentage}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className={cn(
                  "h-full rounded-full transition-all",
                  challengeDetail.progressPercentage === 100
                    ? "bg-gradient-to-r from-emerald-500 to-[#00d8ff]"
                    : "bg-gradient-to-r from-[#00d8ff] to-cyan-300"
                )}
              />
            </div>
          </div>
        </div>

        {/* Message de notification validation */}
        <AnimatePresence>
          {completionMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={cn(
                "p-4 rounded-xl border text-xs font-heading font-bold uppercase flex items-center gap-2.5 shadow-lg",
                completionMessage.type === "success"
                  ? "bg-emerald-950/60 border-emerald-500 text-emerald-300"
                  : "bg-red-950/60 border-red-500 text-red-300"
              )}
            >
              {completionMessage.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{completionMessage.text}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            LISTE DES ÉTAPES SÉQUENTIELLES
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-brand-white/10 pb-3">
            <h2 className="text-lg font-heading font-black uppercase tracking-wider text-brand-white flex items-center gap-2">
              <Target size={18} className="text-[#00d8ff]" />
              Programme & Étapes à valider
            </h2>
            <span className="text-xs text-brand-white/50 font-heading uppercase">
              Progression séquentielle
            </span>
          </div>

          <div className="space-y-5">
            {challengeDetail.steps.map((step, index) => {
              const videoData = formatEmbedVideoUrl(step.video_url);

              return (
                <div
                  key={step.id}
                  className={cn(
                    "rounded-2xl border transition-all overflow-hidden shadow-xl",
                    step.isCompleted
                      ? "bg-[#0b1424] border-emerald-500/40"
                      : step.isUnlocked
                      ? "bg-[#0f172a] border-[#00d8ff]/50 shadow-[#00d8ff]/5 ring-1 ring-[#00d8ff]/20"
                      : "bg-zinc-950/70 border-zinc-800 opacity-60"
                  )}
                >
                  {/* En-tête Étape */}
                  <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-white/5">
                    <div className="flex items-start sm:items-center gap-3.5">
                      <div
                        className={cn(
                          "w-9 h-9 rounded-xl font-heading font-black text-sm flex items-center justify-center shrink-0 border",
                          step.isCompleted
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                            : step.isUnlocked
                            ? "bg-[#00d8ff]/20 text-[#00d8ff] border-[#00d8ff]/40"
                            : "bg-zinc-800 text-zinc-500 border-zinc-700"
                        )}
                      >
                        {step.isCompleted ? <Check size={18} /> : step.isUnlocked ? step.step_order : <Lock size={16} />}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-brand-white/50">
                            Étape {step.step_order}
                          </span>
                          {step.isCompleted ? (
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              Validée
                            </span>
                          ) : step.isUnlocked ? (
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[#00d8ff]/15 text-[#00d8ff] border border-[#00d8ff]/30">
                              Étape en cours
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 flex items-center gap-1">
                              <Lock size={10} /> Verrouillée
                            </span>
                          )}
                        </div>

                        <h3 className="text-base sm:text-lg font-heading font-black uppercase tracking-wider text-brand-white mt-0.5">
                          {step.title}
                        </h3>
                      </div>
                    </div>

                    {/* Statut ou Bouton d'action */}
                    <div className="self-end sm:self-center">
                      {step.isCompleted ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/50 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-heading font-bold uppercase">
                          <CheckCircle2 size={14} />
                          Terminée
                        </div>
                      ) : step.isUnlocked ? (
                        <button
                          onClick={() => handleValidateStep(step.id)}
                          disabled={validatingStepId === step.id}
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#00d8ff] hover:bg-brand-white text-black font-heading font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-[#00d8ff]/25 cursor-pointer disabled:opacity-50"
                        >
                          {validatingStepId === step.id ? (
                            <>
                              <RefreshCw size={14} className="animate-spin" />
                              Validation...
                            </>
                          ) : (
                            <>
                              <Check size={14} />
                              Valider cette étape
                            </>
                          )}
                        </button>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 text-zinc-500 border border-zinc-800 rounded-xl text-xs font-heading font-bold uppercase">
                          <Lock size={12} />
                          Étape verrouillée
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Contenu Débloqué : Consignes & Lecteur Vidéo */}
                  {step.isUnlocked ? (
                    <div className="p-5 sm:p-6 space-y-4">
                      {step.description && (
                        <div className="p-4 bg-black/40 border border-brand-white/5 rounded-xl space-y-1">
                          <span className="text-[10px] font-heading font-bold uppercase text-[#00d8ff] tracking-wider block">
                            Consignes & Objectifs techniques
                          </span>
                          <p className="text-xs sm:text-sm text-brand-white/80 leading-relaxed whitespace-pre-line">
                            {step.description}
                          </p>
                        </div>
                      )}

                      {/* Intégration du lecteur vidéo si présent */}
                      {videoData && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 text-xs font-heading font-bold uppercase text-brand-white/70">
                            <Play size={13} className="text-[#00d8ff]" />
                            <span>Démonstration vidéo du coach</span>
                          </div>

                          <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black border border-brand-white/10 shadow-2xl">
                            {videoData.type === "embed" ? (
                              <iframe
                                src={videoData.url}
                                title={step.title}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                className="w-full h-full border-0"
                              />
                            ) : videoData.type === "video" ? (
                              <video
                                src={videoData.url}
                                controls
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-3 bg-[#0c1322]">
                                <Play size={36} className="text-[#00d8ff]" />
                                <a
                                  href={videoData.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#00d8ff] text-black font-heading font-bold text-xs uppercase rounded-xl hover:bg-brand-white transition-colors"
                                >
                                  Ouvrir la vidéo démonstrative <ExternalLink size={12} />
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Message de verrouillage */
                    <div className="p-6 text-center space-y-1.5 bg-black/20">
                      <Lock size={20} className="mx-auto text-zinc-600 mb-1" />
                      <p className="text-xs font-heading font-bold uppercase text-brand-white/40">
                        Étape suivante verrouillée
                      </p>
                      <p className="text-[11px] text-brand-white/30">
                        Terminez et validez l&apos;étape {index} pour débloquer ces consignes et la vidéo.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            MODAL DE FÉLICITATIONS (DÉFI 100% COMPLÉTÉ)
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <AnimatePresence>
          {showCelebrationModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowCelebrationModal(false)}
                className="fixed inset-0 bg-black/85 backdrop-blur-md"
              />

              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative w-full max-w-md bg-gradient-to-b from-[#0c1b33] via-[#0f172a] to-[#0a0f1d] border border-[#00d8ff]/40 rounded-3xl p-6 sm:p-8 shadow-2xl z-10 text-center space-y-6 overflow-hidden"
              >
                {/* Glow d'arrière plan */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-[#00d8ff]/20 rounded-full blur-3xl pointer-events-none" />

                <div className="w-20 h-20 rounded-3xl bg-[#00d8ff]/20 border border-[#00d8ff]/40 text-[#00d8ff] flex items-center justify-center mx-auto shadow-xl shadow-[#00d8ff]/20 relative">
                  <Trophy size={42} />
                  <Sparkles size={18} className="absolute top-1 right-1 text-amber-300 animate-pulse" />
                </div>

                <div className="space-y-2">
                  <span className="text-[11px] font-black uppercase px-3 py-1 rounded-full bg-[#00d8ff]/20 text-[#00d8ff] border border-[#00d8ff]/30 tracking-wider">
                    Défi 100 % Accompli
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-heading font-black uppercase tracking-wider text-brand-white pt-1">
                    Félicitations !
                  </h3>
                  <p className="text-xs sm:text-sm text-brand-white/80 leading-relaxed">
                    Vous avez validé toutes les étapes du défi <strong className="text-[#00d8ff]">« {challengeDetail.title} »</strong>.
                  </p>
                </div>

                {/* Récompenses obtenues */}
                <div className="p-4 bg-black/40 border border-brand-white/10 rounded-2xl grid grid-cols-2 gap-3 text-center">
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-brand-white/50 block">Expérience</span>
                    <span className="text-sm font-heading font-black text-[#00d8ff] flex items-center justify-center gap-1">
                      <Sparkles size={14} /> +{challengeDetail.points_xp} XP
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-brand-white/50 block">Récompense</span>
                    <span className="text-xs font-heading font-black text-amber-400 flex items-center justify-center gap-1 line-clamp-1">
                      <Award size={14} /> {challengeDetail.badge_reward || "Badge Striker"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5 pt-2">
                  <button
                    onClick={() => setShowCelebrationModal(false)}
                    className="w-full py-3 bg-[#00d8ff] hover:bg-brand-white text-black font-heading font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg shadow-[#00d8ff]/30"
                  >
                    Revoir mes étapes
                  </button>
                  <button
                    onClick={handleBackToList}
                    className="w-full py-2.5 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white/70 font-heading font-bold text-xs uppercase rounded-xl transition-colors cursor-pointer"
                  >
                    Explorer d&apos;autres défis
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // VUE 2 : GRILLE D'ACCUEIL DES DÉFIS PUBLIÉS (LISTE & FILTRES)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8 pt-2 pb-24">
      {/* En-tête */}
      <div className="space-y-1">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#00d8ff]/10 border border-[#00d8ff]/30 rounded-full text-[#00d8ff] text-xs font-semibold uppercase tracking-wider mb-2">
          <Sparkles size={13} />
          <span>Gamification & Performance</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-heading font-black uppercase tracking-wider text-brand-white">
          Arène des <span className="text-[#00d8ff]">Défis</span>
        </h1>
        <p className="text-xs sm:text-sm text-brand-white/60 max-w-2xl">
          Suivez des programmes vidéo par étapes, progressez à votre rythme et remportez des récompenses exclusives Striking Camp.
        </p>
      </div>

      {/* Barre de filtres par catégorie */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setSelectedCategory(cat.value)}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer border",
              selectedCategory === cat.value
                ? "bg-[#00d8ff] text-black border-[#00d8ff] shadow-lg shadow-[#00d8ff]/20"
                : "bg-[#0f172a] text-brand-white/60 border-brand-white/10 hover:text-brand-white hover:bg-brand-white/5"
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Grille des défis disponibles */}
      {isLoading ? (
        <div className="py-20 text-center space-y-3">
          <RefreshCw size={28} className="mx-auto text-[#00d8ff] animate-spin" />
          <p className="text-xs font-heading uppercase text-brand-white/50 tracking-wider">
            Chargement de vos défis...
          </p>
        </div>
      ) : filteredChallenges.length === 0 ? (
        <div className="bg-[#0f172a]/60 border border-brand-white/10 rounded-2xl p-12 text-center space-y-3">
          <Trophy size={40} className="mx-auto text-brand-white/30" />
          <h3 className="text-base font-heading font-bold uppercase text-brand-white">
            Aucun défi disponible pour le moment
          </h3>
          <p className="text-xs text-brand-white/50 max-w-md mx-auto">
            {selectedCategory !== "Tous"
              ? "Aucun défi dans cette catégorie pour l'instant. Consultez les autres catégories !"
              : "De nouveaux défis d'entraînement seront bientôt publiés par vos coachs."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredChallenges.map((c) => {
            const theme = getCategoryTheme(c.category);

            return (
              <div
                key={c.id}
                onClick={() => handleOpenChallenge(c.id)}
                className={cn(
                  "group rounded-2xl border p-6 flex flex-col justify-between gap-5 transition-all shadow-xl cursor-pointer relative overflow-hidden bg-gradient-to-br",
                  theme.glow,
                  "border-brand-white/10",
                  theme.border
                )}
              >
                {/* Glow subtil au survol */}
                <div className="absolute top-0 right-0 w-36 h-36 bg-[#00d8ff]/5 rounded-full blur-2xl pointer-events-none group-hover:bg-[#00d8ff]/10 transition-colors" />

                <div className="space-y-4">
                  {/* Badge Catégorie & Niveau */}
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

                    <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded bg-brand-white/10 text-brand-white/70 border border-brand-white/10">
                      {c.level}
                    </span>
                  </div>

                  {/* Titre & Description */}
                  <div className="space-y-1.5">
                    <h3 className="text-lg font-heading font-black uppercase tracking-wider text-brand-white group-hover:text-[#00d8ff] transition-colors line-clamp-1">
                      {c.title}
                    </h3>
                    <p className="text-xs text-brand-white/70 leading-relaxed line-clamp-2 min-h-[34px]">
                      {c.short_description || c.description || "Perfectionnez votre technique avec ce défi."}
                    </p>
                  </div>

                  {/* Badges d'information : Étapes & Récompense */}
                  <div className="flex items-center justify-between text-xs pt-1 text-brand-white/70">
                    <span className="flex items-center gap-1 text-[#00d8ff] font-heading font-bold">
                      <Target size={13} />
                      {c.stepsCount} {c.stepsCount > 1 ? "étapes" : "étape"}
                    </span>
                    <span className="flex items-center gap-1 text-amber-400 font-heading font-bold">
                      <Sparkles size={13} />
                      +{c.points_xp} XP
                    </span>
                  </div>

                  {/* Barre de Progression Personnelle */}
                  <div className="space-y-1.5 pt-2 border-t border-brand-white/10">
                    <div className="flex items-center justify-between text-[11px] font-heading font-bold uppercase">
                      <span className="text-brand-white/60">
                        {c.progressStatus === "completed"
                          ? "Terminé !"
                          : c.progressStatus === "in_progress"
                          ? `Progression : ${c.progressPercentage}%`
                          : "Nouveau défi"}
                      </span>
                      {c.progressStatus === "completed" && (
                        <CheckCircle2 size={13} className="text-emerald-400" />
                      )}
                    </div>

                    <div className="w-full h-2 bg-black/50 rounded-full overflow-hidden border border-brand-white/10">
                      <div
                        style={{ width: `${c.progressPercentage}%` }}
                        className={cn(
                          "h-full rounded-full transition-all",
                          c.progressStatus === "completed"
                            ? "bg-emerald-400"
                            : "bg-[#00d8ff]"
                        )}
                      />
                    </div>
                  </div>
                </div>

                {/* Bouton d'action */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenChallenge(c.id);
                  }}
                  className={cn(
                    "w-full py-2.5 rounded-xl font-heading font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md",
                    c.progressStatus === "completed"
                      ? "bg-brand-white/10 text-brand-white hover:bg-[#00d8ff] hover:text-black"
                      : c.progressStatus === "in_progress"
                      ? "bg-[#00d8ff] text-black hover:bg-brand-white"
                      : "bg-[#00d8ff]/15 hover:bg-[#00d8ff] text-[#00d8ff] hover:text-black border border-[#00d8ff]/30"
                  )}
                >
                  {c.progressStatus === "completed" ? (
                    <>
                      <CheckCircle2 size={14} />
                      Revoir le défi
                    </>
                  ) : c.progressStatus === "in_progress" ? (
                    <>
                      <Play size={14} />
                      Continuer ({c.progressPercentage}%)
                    </>
                  ) : (
                    <>
                      <Play size={14} />
                      Démarrer le défi
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
