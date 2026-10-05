"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft,
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

export default function ChallengesLegacyTab() {
  const [supabase] = useState(() => createClient());
  const { currentUserId } = useMember();

  const [challenges, setChallenges] = useState<MemberChallengeCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<"Tous" | ChallengeCategory>("Tous");

  const [activeChallengeId, setActiveChallengeId] = useState<string | null>(null);
  const [challengeDetail, setChallengeDetail] = useState<MemberChallengeDetailData | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const [validatingStepId, setValidatingStepId] = useState<string | null>(null);
  const [completionMessage, setCompletionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchChallengesList = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getMemberChallenges(supabase, currentUserId || null);
      setChallenges(data);
    } catch (err) {
      console.error("[ChallengesLegacyTab] Erreur chargement défis :", err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, currentUserId]);

  useEffect(() => {
    fetchChallengesList();
  }, [fetchChallengesList]);

  const fetchChallengeDetail = useCallback(
    async (challengeId: string) => {
      setIsLoadingDetail(true);
      setCompletionMessage(null);
      try {
        const detail = await getMemberChallengeDetail(supabase, challengeId, currentUserId || null);
        setChallengeDetail(detail);
      } catch (err) {
        console.error("[ChallengesLegacyTab] Erreur détail défi :", err);
      } finally {
        setIsLoadingDetail(false);
      }
    },
    [supabase, currentUserId]
  );

  const handleOpenChallenge = (challengeId: string) => {
    setActiveChallengeId(challengeId);
    fetchChallengeDetail(challengeId);
  };

  const handleBackToList = () => {
    setActiveChallengeId(null);
    setChallengeDetail(null);
    setCompletionMessage(null);
    fetchChallengesList();
  };

  const handleCompleteStep = async (stepId: string) => {
    if (!activeChallengeId || !currentUserId) return;

    setValidatingStepId(stepId);
    setCompletionMessage(null);

    try {
      const res = await completeChallengeStep(supabase, activeChallengeId, stepId);

      if (res.success) {
        setCompletionMessage({
          type: "success",
          text: res.isCompleted
            ? "Félicitations ! Vous avez complété 100% de ce défi !"
            : "Étape validée avec succès !",
        });

        await fetchChallengeDetail(activeChallengeId);
      } else {
        setCompletionMessage({
          type: "error",
          text: res.error || "Impossible de valider cette étape.",
        });
      }
    } catch (err) {
      console.error("[ChallengesLegacyTab] Erreur validation :", err);
      setCompletionMessage({
        type: "error",
        text: "Une erreur réseau est survenue.",
      });
    } finally {
      setValidatingStepId(null);
    }
  };

  const filteredChallenges = challenges.filter((c) => {
    if (selectedCategory === "Tous") return true;
    return c.category === selectedCategory;
  });

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* VUE DÉTAIL DÉFI */}
      {activeChallengeId && challengeDetail ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBackToList}
              className="inline-flex items-center gap-2 text-xs font-bold text-brand-white/60 hover:text-brand-white uppercase tracking-wider transition-colors cursor-pointer"
            >
              <ArrowLeft size={16} />
              <span>Retour aux défis</span>
            </button>
            <span className="text-[11px] sm:text-xs text-brand-blue font-bold uppercase tracking-wider">
              {challengeDetail.completedStepsCount} / {challengeDetail.steps.length} étapes
            </span>
          </div>

          <div className="p-4 sm:p-6 rounded-2xl bg-[#0c1322] border border-brand-white/10 space-y-4 shadow-xl">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-brand-blue/15 text-brand-blue border border-brand-blue/30 inline-block">
                {challengeDetail.category} • {challengeDetail.level}
              </span>
              <h2 className="text-xl sm:text-2xl font-heading font-black uppercase text-brand-white tracking-wide">
                {challengeDetail.title}
              </h2>
              {challengeDetail.description && (
                <p className="text-xs text-brand-white/60 leading-relaxed">{challengeDetail.description}</p>
              )}
            </div>

            {/* Étapes */}
            <div className="space-y-3 pt-2 border-t border-brand-white/5">
              {challengeDetail.steps.map((step, idx) => (
                <div
                  key={step.id}
                  className={`p-3.5 sm:p-4 rounded-xl border space-y-3 transition-all ${
                    step.isCompleted
                      ? "bg-brand-blue/10 border-brand-blue/30"
                      : step.isUnlocked
                      ? "bg-[#070c16]/80 border-brand-white/10"
                      : "bg-[#070c16]/30 border-brand-white/5 opacity-50"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-heading font-bold text-brand-white">
                          Étape {step.step_order || idx + 1}
                        </span>
                        {step.isCompleted && (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-brand-blue text-brand-black flex items-center gap-1">
                            <Check size={11} /> Validée
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-brand-white">{step.title}</h4>
                      {step.description && (
                        <p className="text-xs text-brand-white/50">{step.description}</p>
                      )}
                    </div>

                    {!step.isCompleted && step.isUnlocked && (
                      <button
                        onClick={() => handleCompleteStep(step.id)}
                        disabled={validatingStepId === step.id}
                        className="px-3 py-1.5 rounded-lg bg-brand-blue hover:bg-brand-white text-brand-black text-xs font-heading font-black uppercase tracking-wider shrink-0 transition-all shadow-md shadow-brand-blue/20 disabled:opacity-50 cursor-pointer self-start sm:self-auto"
                      >
                        {validatingStepId === step.id ? "Validation..." : "Valider"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* VUE LISTE DÉFIS V1 */
        <div className="space-y-6">
          <div className="p-4 sm:p-6 rounded-2xl bg-[#0c1322] border border-brand-white/10 space-y-3 shadow-xl">
            <div className="text-brand-blue text-xs font-bold uppercase tracking-wider">
              Défis Techniques & Protocoles Club
            </div>
            <h3 className="text-lg sm:text-xl font-heading font-black uppercase text-brand-white">
              Défis d'Évolution
            </h3>
            <p className="text-xs text-brand-white/50">
              Validez chaque étape technique, physique et cardio pour valider vos paliers Striking Camp.
            </p>

            {/* Categories */}
            <div className="flex flex-wrap gap-1.5 sm:gap-2 pt-2 border-t border-brand-white/5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-heading font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    selectedCategory === cat.value
                      ? "bg-brand-blue text-brand-black shadow-lg shadow-brand-blue/20"
                      : "bg-brand-white/5 text-brand-white/60 hover:text-brand-white hover:bg-brand-white/10 border border-brand-white/10"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Grid */}
          {isLoading ? (
            <div className="p-8 text-center text-brand-white/40 text-xs">Chargement des défis...</div>
          ) : filteredChallenges.length === 0 ? (
            <div className="p-8 text-center text-brand-white/40 text-xs">Aucun défi dans cette catégorie.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
              {filteredChallenges.map((chal) => (
                <div
                  key={chal.id}
                  onClick={() => handleOpenChallenge(chal.id)}
                  className="p-4 sm:p-5 rounded-2xl bg-[#0c1322] border border-brand-white/10 hover:border-brand-blue/40 cursor-pointer transition-all space-y-3 group shadow-lg"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-brand-blue/15 text-brand-blue border border-brand-blue/30 inline-block">
                        {chal.category} • {chal.level}
                      </span>
                      <h4 className="text-sm sm:text-base font-bold text-brand-white group-hover:text-brand-blue transition-colors truncate">
                        {chal.title}
                      </h4>
                    </div>

                    <span className="text-xs font-bold text-brand-blue shrink-0">
                      +{chal.points_xp} XP
                    </span>
                  </div>

                  <p className="text-xs text-brand-white/50 line-clamp-2">{chal.short_description || chal.description}</p>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-brand-white/5">
                    <span className="text-brand-white/40">{chal.stepsCount} étapes</span>
                    <span className="font-bold text-brand-blue group-hover:translate-x-1 transition-transform">
                      {chal.progressPercentage > 0 ? `${chal.progressPercentage}% complété` : "Démarrer →"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
