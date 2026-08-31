"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
  Flame,
  Users,
  Award,
  ChevronRight,
  Loader2,
  Calendar,
  Lock,
  ArrowRight,
  ShieldCheck,
  PhoneCall,
  Check,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  type MembershipRequestItem,
  type MembershipPlanOption,
  type CommitmentType,
  getMyLatestMembershipRequest,
  getAvailablePlansForMembership,
  submitMembershipRequest,
} from "@/lib/supabase/membership-requests";
import { useMember } from "@/components/membre/MemberContext";
import { cn } from "@/lib/utils";

export default function MembershipOnboardingView() {
  const router = useRouter();
  const supabase = createClient();
  const { hasActiveSubscription, planName, refreshMemberData } = useMember();

  const [plans, setPlans] = useState<MembershipPlanOption[]>([]);
  const [latestRequest, setLatestRequest] = useState<MembershipRequestItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Formulaire de sélection
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [commitmentType, setCommitmentType] = useState<CommitmentType>("monthly");
  const [memberNotes, setMemberNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [plansList, req] = await Promise.all([
        getAvailablePlansForMembership(supabase),
        getMyLatestMembershipRequest(supabase),
      ]);
      setPlans(plansList);
      setLatestRequest(req);
      if (plansList.length > 0 && !selectedPlanId) {
        setSelectedPlanId(plansList[0].id);
      }
    } catch (err) {
      console.error("[MembershipOnboardingView] Erreur chargement :", err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanId) {
      setErrorMessage("Veuillez sélectionner une formule.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const res = await submitMembershipRequest(supabase, {
      planId: selectedPlanId,
      commitmentType,
      memberNotes: memberNotes.trim() || undefined,
    });

    if (res.success) {
      setSuccessMessage(res.message || "Votre demande a été transmise avec succès.");
      await loadData();
      await refreshMemberData();
    } else {
      setErrorMessage(res.error || "Impossible de soumettre la demande.");
    }
    setIsSubmitting(false);
  };

  // Filtrer les formules selon le type d'engagement sélectionné si renseigné, ou afficher les formules uniques
  const filteredPlans = plans.filter((p) => {
    if (p.commitment) {
      return p.commitment === commitmentType;
    }
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 size={36} className="text-brand-blue animate-spin" />
        <p className="text-xs text-brand-white/50 font-heading uppercase tracking-wider">
          Chargement de votre dossier d&apos;adhésion...
        </p>
      </div>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ÉTAT 1 : MEMBRE AVEC ABONNEMENT ACTIF
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (hasActiveSubscription) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 pt-4 pb-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-br from-[#0c1f38] to-[#0a1120] border border-brand-blue/30 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-brand-blue/20 text-brand-blue border border-brand-blue/40 flex items-center justify-center mx-auto shadow-lg shadow-brand-blue/10">
            <ShieldCheck size={32} />
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-heading font-black text-brand-blue uppercase tracking-widest px-3 py-1 bg-brand-blue/10 rounded-full border border-brand-blue/20 inline-block">
              Adhésion Validée & Active
            </span>
            <h1 className="text-2xl sm:text-3xl font-heading font-black uppercase tracking-wider text-brand-white">
              Votre formule <span className="text-brand-blue">{planName}</span> est opérationnelle
            </h1>
            <p className="text-xs sm:text-sm text-brand-white/70 max-w-lg mx-auto leading-relaxed">
              Votre compte est pleinement actif. Vous avez accès à l&apos;ensemble de vos créneaux et réservations selon votre formule.
            </p>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/membre/planning"
              className="w-full sm:w-auto px-6 py-3.5 bg-brand-blue hover:bg-brand-white text-brand-black font-heading font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-brand-blue/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Calendar size={16} />
              Accéder au planning & Réserver
            </Link>
            <Link
              href="/membre"
              className="w-full sm:w-auto px-6 py-3.5 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white text-xs font-heading font-bold uppercase tracking-wider rounded-xl border border-brand-white/10 transition-colors flex items-center justify-center gap-2"
            >
              Retour à l&apos;accueil
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ÉTAT 2 : DEMANDE EN ATTENTE (PENDING)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (latestRequest && latestRequest.status === "pending") {
    return (
      <div className="max-w-3xl mx-auto space-y-6 pt-4 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#0f172a] border border-amber-500/30 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-brand-white/10">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                <Clock size={24} className="animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] font-heading font-black uppercase tracking-widest text-amber-400 block mb-0.5">
                  Dossier en cours d&apos;examen
                </span>
                <h1 className="text-xl sm:text-2xl font-heading font-black uppercase tracking-wider text-brand-white">
                  Demande d&apos;adhésion en attente
                </h1>
              </div>
            </div>

            <div className="px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-heading font-black uppercase tracking-wider">
              En cours de validation
            </div>
          </div>

          {/* Corps de l'explication */}
          <div className="space-y-4 text-xs text-brand-white/80 leading-relaxed">
            <p>
              Votre demande pour la formule <strong className="text-brand-white text-sm">{latestRequest.plan?.name || "Sélectionnée"}</strong> ({latestRequest.commitment_type === "annual" ? "Engagement 12 mois" : "Sans engagement / Mensuel"}) a bien été reçue le <strong>{new Date(latestRequest.created_at).toLocaleDateString("fr-FR")}</strong>.
            </p>
            <div className="bg-[#0a1120] border border-amber-500/20 rounded-2xl p-4 sm:p-5 flex items-start gap-3">
              <Lock size={18} className="text-amber-400 shrink-0 mt-0.5" />
              <p className="text-amber-300/90 text-xs leading-relaxed">
                <strong>Important :</strong> Les réservations de cours restent verrouillées jusqu&apos;à l&apos;activation manuelle de votre adhésion par le club. Vous recevrez une confirmation dès que votre dossier sera validé.
              </p>
            </div>
          </div>

          {/* Détails du récapitulatif */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="bg-[#0a1120] border border-brand-white/5 rounded-2xl p-4 space-y-1">
              <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-brand-white/40 block">
                Formule choisie
              </span>
              <p className="text-sm font-heading font-bold text-brand-white">
                {latestRequest.plan?.name || "Formule Striking Camp"}
              </p>
            </div>
            <div className="bg-[#0a1120] border border-brand-white/5 rounded-2xl p-4 space-y-1">
              <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-brand-white/40 block">
                Type d&apos;engagement
              </span>
              <p className="text-sm font-heading font-bold text-brand-white">
                {latestRequest.commitment_type === "annual" ? "Annuel (12 mois)" : "Mensuel (Sans engagement)"}
              </p>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-brand-white/10">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 text-xs text-brand-white/60 hover:text-brand-blue transition-colors"
            >
              <PhoneCall size={14} />
              Une question ? Contacter le club
            </Link>
            <Link
              href="/membre"
              className="px-4 py-2 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white text-xs font-heading font-bold uppercase tracking-wider rounded-lg border border-brand-white/10 transition-colors"
            >
              Retour accueil
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ÉTAT 3 : AUCUN ABONNEMENT ACTIF / CHOIX D'UNE FORMULE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  return (
    <div className="max-w-5xl mx-auto space-y-8 pt-4 pb-16">
      
      {/* En-tête */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-blue/15 border border-brand-blue/30 text-brand-blue text-xs font-heading font-black uppercase tracking-widest">
          <Sparkles size={14} />
          Adhésion Striking Camp
        </div>
        <h1 className="text-3xl sm:text-4xl font-heading font-black uppercase tracking-wider text-brand-white">
          Choisissez votre <span className="text-brand-blue">Formule</span>
        </h1>
        <p className="text-xs sm:text-sm text-brand-white/60 leading-relaxed">
          Sélectionnez la formule d&apos;entraînement adaptée à vos objectifs. Après soumission, votre demande sera validée par l&apos;équipe pour activer vos réservations.
        </p>

        {/* Sélecteur d'engagement */}
        <div className="pt-4 inline-flex items-center p-1.5 bg-[#0f172a] border border-brand-white/10 rounded-2xl">
          <button
            type="button"
            onClick={() => setCommitmentType("monthly")}
            className={cn(
              "px-5 py-2 rounded-xl text-xs font-heading font-black uppercase tracking-wider transition-all cursor-pointer",
              commitmentType === "monthly"
                ? "bg-brand-blue text-brand-black shadow-md shadow-brand-blue/20"
                : "text-brand-white/60 hover:text-brand-white"
            )}
          >
            Sans engagement (Mensuel)
          </button>
          <button
            type="button"
            onClick={() => setCommitmentType("annual")}
            className={cn(
              "px-5 py-2 rounded-xl text-xs font-heading font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5",
              commitmentType === "annual"
                ? "bg-brand-blue text-brand-black shadow-md shadow-brand-blue/20"
                : "text-brand-white/60 hover:text-brand-white"
            )}
          >
            <span>Engagement 12 mois</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-400 text-black font-black">
              Meilleur tarif
            </span>
          </button>
        </div>
      </div>

      {/* Messages d'erreur et de succès */}
      {errorMessage && (
        <div className="p-4 bg-red-950/80 border border-red-500/40 rounded-2xl text-red-300 text-xs flex items-center gap-3">
          <AlertCircle size={18} className="shrink-0 text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-950/80 border border-emerald-500/40 rounded-2xl text-emerald-300 text-xs flex items-center gap-3">
          <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Grille des formules disponibles */}
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {filteredPlans.map((plan) => {
            const isSelected = selectedPlanId === plan.id;
            const isPriv = plan.allows_private || plan.type === "private";
            const isSg = plan.allows_small_group || plan.type === "small_group";

            return (
              <div
                key={plan.id}
                onClick={() => setSelectedPlanId(plan.id)}
                className={cn(
                  "relative rounded-3xl p-6 sm:p-7 transition-all cursor-pointer border flex flex-col justify-between space-y-6",
                  isSelected
                    ? "bg-gradient-to-b from-[#11223f] to-[#0a1120] border-brand-blue shadow-2xl shadow-brand-blue/15 scale-[1.02]"
                    : "bg-[#0f172a] border-brand-white/10 hover:border-brand-white/20 hover:bg-[#121c33]"
                )}
              >
                {/* Badge sélectionné */}
                {isSelected && (
                  <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-brand-blue text-brand-black flex items-center justify-center font-bold">
                    <Check size={14} strokeWidth={3} />
                  </div>
                )}

                <div className="space-y-4">
                  {/* Icône & Catégorie */}
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      isPriv ? "bg-[#00d8ff]/15 text-[#00d8ff]" : isSg ? "bg-amber-500/15 text-amber-400" : "bg-blue-500/15 text-blue-400"
                    )}>
                      {isPriv ? <Flame size={20} /> : isSg ? <Users size={20} /> : <Award size={20} />}
                    </div>
                    <div>
                      <span className="text-[10px] font-heading font-black uppercase tracking-wider text-brand-white/40 block">
                        {isPriv ? "Formule Premium" : isSg ? "Formule Semi-Privée" : "Accès Collectif"}
                      </span>
                      <h3 className="text-lg font-heading font-black uppercase tracking-wider text-brand-white">
                        {plan.name}
                      </h3>
                    </div>
                  </div>

                  {/* Prix */}
                  <div className="pt-2">
                    <span className="text-3xl font-heading font-black text-brand-white">
                      {(plan.price_cents / 100).toFixed(0)}€
                    </span>
                    <span className="text-xs text-brand-white/40 font-heading uppercase ml-1">
                      / mois
                    </span>
                  </div>

                  {/* Caractéristiques */}
                  <div className="space-y-2.5 pt-3 border-t border-brand-white/5 text-xs text-brand-white/70">
                    {isPriv && (
                      <div className="flex items-center gap-2 text-brand-white font-medium">
                        <Check size={14} className="text-brand-blue shrink-0" />
                        <span><strong>8 Cours Privés</strong> personnalisés / mois</span>
                      </div>
                    )}
                    {(isPriv || isSg) && (
                      <div className="flex items-center gap-2">
                        <Check size={14} className="text-brand-blue shrink-0" />
                        <span>Accès illimité aux <strong>Small Groups</strong> (20 max)</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Check size={14} className="text-brand-blue shrink-0" />
                      <span>Accès illimité aux <strong>Cours Collectifs</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check size={14} className="text-brand-blue shrink-0" />
                      <span>Suivi de progression & Accès aux Défis</span>
                    </div>
                  </div>
                </div>

                {/* Bouton de sélection visuel */}
                <div className="pt-4">
                  <div
                    className={cn(
                      "w-full py-2.5 rounded-xl text-center text-xs font-heading font-bold uppercase tracking-wider transition-all",
                      isSelected
                        ? "bg-brand-blue text-brand-black font-black"
                        : "bg-brand-white/5 text-brand-white/60 hover:text-brand-white"
                    )}
                  >
                    {isSelected ? "Formule Choisie" : "Sélectionner cette formule"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Section Notes Optionnelles & Bouton de Validation */}
        <div className="bg-[#0f172a] border border-brand-white/10 rounded-3xl p-6 sm:p-8 space-y-5">
          <div>
            <label className="text-xs font-heading font-bold uppercase tracking-wider text-brand-white/70 block mb-2">
              Commentaire ou précision pour l&apos;équipe (optionnel)
            </label>
            <textarea
              rows={2}
              value={memberNotes}
              onChange={(e) => setMemberNotes(e.target.value)}
              placeholder="Ex: Disponibilités souhaitées, objectifs spécifiques, antécédents sportifs..."
              className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3.5 text-xs text-brand-white placeholder:text-brand-white/30 focus:border-brand-blue outline-none resize-none"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <p className="text-[11px] text-brand-white/40">
              En envoyant votre demande, vous ne serez pas débité immédiatement. L&apos;activation se fera après validation par le club.
            </p>

            <button
              type="submit"
              disabled={isSubmitting || !selectedPlanId}
              className="w-full sm:w-auto px-8 py-3.5 bg-brand-blue hover:bg-brand-white text-brand-black font-heading font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-brand-blue/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <span>Envoyer ma demande d&apos;adhésion</span>
                  <ChevronRight size={16} />
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
