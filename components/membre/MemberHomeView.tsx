"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  Clock,
  Flame,
  ShieldCheck,
  XCircle,
  Sparkles,
  Trophy,
  Target,
  Award,
  Zap,
  Lock,
  ArrowRight,
  Play,
  CheckCircle2,
  Dumbbell,
  HeartPulse,
  Apple,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { useMember } from "./MemberContext";
import { createClient } from "@/lib/supabase/client";
import {
  getMemberChallenges,
  type MemberChallengeCardData,
  type ChallengeCategory,
} from "@/lib/supabase/challenges";
import { cn } from "@/lib/utils";

interface MemberHomeViewProps {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

export default function MemberHomeView({
  firstName,
  lastName,
  email,
  role,
}: MemberHomeViewProps) {
  const [supabase] = useState(() => createClient());
  const {
    currentUserId,
    userBookings,
    openBookingCancel,
    hasActiveSubscription,
    hasPrivateAccess,
    isPrivateEnabled,
    privateQuota,
  } = useMember();

  const [challenges, setChallenges] = useState<MemberChallengeCardData[]>([]);
  const [isLoadingChallenges, setIsLoadingChallenges] = useState(true);

  const fetchChallenges = useCallback(async () => {
    setIsLoadingChallenges(true);
    try {
      const data = await getMemberChallenges(supabase, currentUserId || null);
      setChallenges(data);
    } catch (err) {
      console.error("[MemberHomeView] Erreur chargement défis :", err);
    } finally {
      setIsLoadingChallenges(false);
    }
  }, [supabase, currentUserId]);

  useEffect(() => {
    fetchChallenges();
  }, [fetchChallenges]);

  const greetingName = firstName ? ` ${firstName}` : "";
  const quotaRemaining = privateQuota?.sessionsRemaining ?? 6;
  const quotaTotal = privateQuota?.quotaTotal ?? 8;

  // Trouver le défi prioritaire à mettre en avant :
  // 1. Défi en cours (progressStatus === 'in_progress')
  // 2. Ou premier défi non commencé (progressStatus === 'not_started')
  // 3. Ou premier défi terminé
  const inProgressChallenge = challenges.find((c) => c.progressStatus === "in_progress");
  const newChallenge = challenges.find((c) => c.progressStatus === "not_started");
  const completedChallenge = challenges.find((c) => c.progressStatus === "completed");

  const featuredChallenge = inProgressChallenge || newChallenge || completedChallenge || null;

  const getCategoryIcon = (cat: ChallengeCategory) => {
    switch (cat) {
      case "Technique":
        return <Flame size={14} className="text-[#00d8ff]" />;
      case "Physique":
        return <Dumbbell size={14} className="text-amber-400" />;
      case "Cardio":
        return <HeartPulse size={14} className="text-rose-400" />;
      case "Nutrition":
        return <Apple size={14} className="text-emerald-400" />;
    }
  };

  const getCategoryBadgeClass = (cat: ChallengeCategory) => {
    switch (cat) {
      case "Technique":
        return "bg-[#00d8ff]/15 text-[#00d8ff] border-[#00d8ff]/30";
      case "Physique":
        return "bg-amber-500/15 text-amber-400 border-amber-500/30";
      case "Cardio":
        return "bg-rose-500/15 text-rose-400 border-rose-500/30";
      case "Nutrition":
        return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8 pt-2 pb-12">
      {/* ━━━━━━━━━━━━━━━━━━━━
          MESSAGE D'ACCUEIL
          ━━━━━━━━━━━━━━━━━━━━ */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-1.5"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-blue/10 border border-brand-blue/20 rounded-full text-brand-blue text-xs font-semibold uppercase tracking-wider mb-2">
          <span className="w-2 h-2 rounded-full bg-brand-blue animate-pulse" />
          Espace Membre
        </div>
        <h1 className="text-3xl sm:text-4xl font-heading font-black uppercase tracking-wide text-brand-white">
          Bonjour{greetingName},
        </h1>
        <p className="text-lg sm:text-xl font-heading uppercase tracking-wide text-brand-blue font-bold">
          Prêt à vous dépasser aujourd’hui ?
        </p>
      </motion.div>

      {/* ━━━━━━━━━━━━━━━━━━━━
          BANDEAU ADHÉSION (SI SANS ABONNEMENT ACTIF)
          ━━━━━━━━━━━━━━━━━━━━ */}
      {!hasActiveSubscription && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-[#172033] to-[#0f172a] border border-brand-blue/30 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-brand-blue/15 text-brand-blue flex items-center justify-center border border-brand-blue/30 shrink-0">
              <Sparkles size={24} />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-heading font-black text-brand-blue uppercase tracking-widest px-2.5 py-0.5 rounded bg-brand-blue/10 border border-brand-blue/20 inline-block">
                Finaliser votre adhésion
              </span>
              <h3 className="text-base font-heading font-black uppercase text-brand-white">
                Choisissez votre formule d&apos;entraînement
              </h3>
              <p className="text-xs text-brand-white/60 max-w-md">
                Sélectionnez votre formule (Cours Privé, Small Group ou Collectif) pour activer vos réservations.
              </p>
            </div>
          </div>

          <Link
            href="/membre/adhesion"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-brand-blue hover:bg-brand-white text-brand-black font-heading font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-brand-blue/20 shrink-0"
          >
            Choisir une formule
            <ArrowRight size={14} />
          </Link>
        </motion.div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━
          BANDEAU QUOTA COURS PRIVÉS (SI ABONNÉ PRIVÉ ET SERVICE ACTIVÉ)
          ━━━━━━━━━━━━━━━━━━━━ */}
      {hasPrivateAccess && isPrivateEnabled && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-[#0b1b33] to-[#0f172a] border border-[#00d8ff]/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#00d8ff]/15 text-[#00d8ff] flex items-center justify-center border border-[#00d8ff]/30 shrink-0">
              <Sparkles size={20} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider font-bold text-[#00d8ff]">
                Formule Cours Privés active
              </p>
              <h3 className="text-sm font-heading font-black uppercase text-brand-white">
                Solde mensuel de séances individuelles
              </h3>
              <p className="text-xs text-brand-white/60">
                Il vous reste{" "}
                <span className="font-bold text-[#00d8ff]">
                  {quotaRemaining} sur {quotaTotal}
                </span>{" "}
                séances privées ce mois-ci.
              </p>
            </div>
          </div>

          <Link
            href="/membre/planning"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#00d8ff] hover:bg-brand-white text-black font-heading font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-[#00d8ff]/20 shrink-0"
          >
            Réserver un cours privé
            <ArrowRight size={14} />
          </Link>
        </motion.div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━
          SECTION : MES DÉFIS (DYNAMIQUE & CONNECTÉE)
          ━━━━━━━━━━━━━━━━━━━━ */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-brand-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <Trophy size={22} className="text-[#00d8ff]" />
            <h2 className="text-xl font-heading font-black uppercase tracking-wider text-brand-white">
              Mes Défis
            </h2>
          </div>
          <Link
            href="/membre/defis"
            className="text-xs font-heading font-bold uppercase tracking-wider text-[#00d8ff] hover:text-brand-white flex items-center gap-1 transition-colors"
          >
            Voir tous les défis ({challenges.length})
            <ArrowRight size={13} />
          </Link>
        </div>

        {/* Chargement ou Affichage du Défi mis en avant */}
        {isLoadingChallenges ? (
          <div className="bg-[#0f172a]/60 border border-brand-white/10 rounded-2xl p-8 text-center space-y-2">
            <RefreshCw size={22} className="mx-auto text-[#00d8ff] animate-spin" />
            <p className="text-xs font-heading uppercase text-brand-white/50">Chargement de vos défis...</p>
          </div>
        ) : !featuredChallenge ? (
          /* Aucun défi publié */
          <div className="bg-gradient-to-br from-[#0c182c] via-[#0f172a] to-[#131f37] border border-[#00d8ff]/20 rounded-2xl p-6 shadow-xl relative overflow-hidden space-y-4 text-center">
            <Trophy size={36} className="mx-auto text-[#00d8ff]/60" />
            <div className="space-y-1">
              <h3 className="text-base font-heading font-black uppercase text-brand-white">
                Nouveaux défis en préparation
              </h3>
              <p className="text-xs text-brand-white/60 max-w-md mx-auto">
                Vos coachs Striking Camp préparent de nouveaux programmes d’entraînement par étapes.
              </p>
            </div>
            <Link
              href="/membre/defis"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#00d8ff]/15 hover:bg-[#00d8ff] text-[#00d8ff] hover:text-black border border-[#00d8ff]/30 rounded-xl text-xs font-heading font-bold uppercase transition-all"
            >
              Accéder à l&apos;arène des défis
              <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          /* Carte Défi Principal */
          <div className="bg-gradient-to-br from-[#0c182c] via-[#0f172a] to-[#131f37] border border-[#00d8ff]/30 rounded-2xl p-6 shadow-xl relative overflow-hidden space-y-5">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#00d8ff]/5 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-2 max-w-xl">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={cn(
                      "text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border flex items-center gap-1.5",
                      getCategoryBadgeClass(featuredChallenge.category)
                    )}
                  >
                    {getCategoryIcon(featuredChallenge.category)}
                    {featuredChallenge.category}
                  </span>

                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-brand-white/10 text-brand-white/70 border border-brand-white/10">
                    {featuredChallenge.level}
                  </span>

                  {featuredChallenge.progressStatus === "in_progress" ? (
                    <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-[#00d8ff]/20 text-[#00d8ff] border border-[#00d8ff]/40 flex items-center gap-1">
                      <Flame size={12} />
                      En cours — {featuredChallenge.progressPercentage}%
                    </span>
                  ) : featuredChallenge.progressStatus === "completed" ? (
                    <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                      <CheckCircle2 size={12} />
                      Terminé à 100%
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                      Nouveau défi disponible
                    </span>
                  )}
                </div>

                <h3 className="text-lg sm:text-xl font-heading font-black uppercase tracking-wide text-brand-white">
                  {featuredChallenge.title}
                </h3>

                <p className="text-xs text-brand-white/70 leading-relaxed line-clamp-2">
                  {featuredChallenge.short_description || featuredChallenge.description || "Suivez ce programme étape par étape."}
                </p>
              </div>

              <div className="flex sm:flex-col items-center sm:items-end gap-3 shrink-0">
                <Link
                  href="/membre/defis"
                  className={cn(
                    "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-heading font-black text-xs uppercase tracking-wider transition-all shadow-lg cursor-pointer shrink-0",
                    featuredChallenge.progressStatus === "in_progress"
                      ? "bg-[#00d8ff] hover:bg-brand-white text-black shadow-[#00d8ff]/25"
                      : featuredChallenge.progressStatus === "completed"
                      ? "bg-brand-white/10 hover:bg-[#00d8ff] text-brand-white hover:text-black border border-brand-white/20"
                      : "bg-[#00d8ff] hover:bg-brand-white text-black shadow-[#00d8ff]/25"
                  )}
                >
                  {featuredChallenge.progressStatus === "in_progress" ? (
                    <>
                      <Play size={14} />
                      Continuer ({featuredChallenge.progressPercentage}%)
                    </>
                  ) : featuredChallenge.progressStatus === "completed" ? (
                    <>
                      <CheckCircle2 size={14} />
                      Revoir le défi
                    </>
                  ) : (
                    <>
                      <Play size={14} />
                      Découvrir le défi
                    </>
                  )}
                </Link>
              </div>
            </div>

            {/* Barre de Progression Visuelle */}
            <div className="space-y-2 pt-2 border-t border-brand-white/10">
              <div className="flex items-center justify-between text-xs font-heading font-bold uppercase tracking-wider">
                <span className="text-brand-white/60">
                  {featuredChallenge.completedStepsCount} / {featuredChallenge.stepsCount} {featuredChallenge.stepsCount > 1 ? "étapes validées" : "étape validée"}
                </span>
                <span className="text-[#00d8ff] flex items-center gap-1.5">
                  <Sparkles size={12} />
                  +{featuredChallenge.points_xp} XP
                </span>
              </div>

              <div className="w-full h-2.5 bg-black/50 rounded-full overflow-hidden border border-brand-white/10 p-0.5">
                <div
                  style={{ width: `${featuredChallenge.progressPercentage}%` }}
                  className={cn(
                    "h-full rounded-full transition-all",
                    featuredChallenge.progressStatus === "completed"
                      ? "bg-emerald-400"
                      : "bg-gradient-to-r from-[#00d8ff] to-cyan-300"
                  )}
                />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━
          SECTION : MES PROCHAINES RÉSERVATIONS (SYNCHRONISÉE)
          ━━━━━━━━━━━━━━━━━━━━ */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-brand-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Calendar size={20} className="text-[#00d8ff]" />
            <h2 className="text-xl font-heading font-bold uppercase tracking-wider text-brand-white">
              Mes prochaines réservations
            </h2>
          </div>
          {userBookings.length > 0 && (
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#00d8ff]/20 text-[#00d8ff] border border-[#00d8ff]/30">
              {userBookings.length} {userBookings.length === 1 ? "séance" : "séances"}
            </span>
          )}
        </div>

        {/* Liste des réservations synchronisées */}
        {userBookings.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-[#0f172a]/60 border border-brand-white/10 border-dashed rounded-2xl p-8 text-center space-y-4"
          >
            <div className="w-12 h-12 rounded-full bg-brand-white/5 text-brand-white/30 flex items-center justify-center mx-auto">
              <Calendar size={24} />
            </div>
            <div>
              <p className="text-base font-heading font-bold uppercase tracking-wider text-brand-white/80">
                Aucune réservation à venir.
              </p>
              <p className="text-xs text-brand-white/40 mt-1 max-w-sm mx-auto">
                Consultez les créneaux disponibles dans le planning et réservez votre prochaine session.
              </p>
            </div>
            <Link
              href="/membre/planning"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#00d8ff] text-black font-heading font-black text-xs uppercase tracking-wider rounded-xl hover:bg-brand-white transition-colors cursor-pointer shadow-lg shadow-[#00d8ff]/20"
            >
              Réserver une séance
              <ArrowRight size={14} />
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {userBookings.map((slot, index) => (
              <motion.div
                key={slot.id || `booking-${index}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="bg-[#0f172a] border border-brand-white/10 hover:border-[#00d8ff]/40 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all shadow-lg"
              >
                <div className="flex items-start sm:items-center gap-4">
                  <div
                    className={cn(
                      "w-11 h-11 rounded-xl flex items-center justify-center font-heading font-black text-xs uppercase shrink-0 border",
                      slot.sessionType === "Cours Privé"
                        ? "bg-[#00d8ff]/15 text-[#00d8ff] border-[#00d8ff]/30"
                        : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                    )}
                  >
                    {slot.sessionType === "Cours Privé" ? "PRIVÉ" : "GROUP"}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-heading font-black uppercase text-sm text-brand-white">
                        {slot.discipline}
                      </span>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-brand-white/5 text-brand-white/70 border border-brand-white/10">
                        {slot.sessionType}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-brand-white/60">
                      <span className="flex items-center gap-1">
                        <Calendar size={13} className="text-[#00d8ff]" />
                        {slot.day} {slot.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={13} className="text-[#00d8ff]" />
                        {slot.time}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-brand-white/5">
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                    <ShieldCheck size={14} />
                    <span>Confirmée</span>
                  </div>

                  <button
                    onClick={() => openBookingCancel(slot)}
                    className="p-2 text-brand-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer"
                    title="Annuler cette réservation"
                  >
                    <XCircle size={18} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
