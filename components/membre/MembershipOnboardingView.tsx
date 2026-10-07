"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Loader2,
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
  const supabase = createClient();
  const {
    hasActiveSubscription,
    planName,
    refreshMemberData,
    isSmallGroupEnabled,
    isPrivateEnabled,
  } = useMember();

  const [plans, setPlans] = useState<MembershipPlanOption[]>([]);
  const [latestRequest, setLatestRequest] = useState<MembershipRequestItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Formulaire de sélection
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>("Kick Boxing");
  const [birthDate, setBirthDate] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [memberNotes, setMemberNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const ADULT_DISCIPLINES = [
    "Kick Boxing",
    "Boxe Thaï",
    "Boxe anglaise",
    "Striking",
    "Boxing Bag",
    "KB Shred",
  ];

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [plansList, req] = await Promise.all([
        getAvailablePlansForMembership(supabase),
        getMyLatestMembershipRequest(supabase),
      ]);
      const classicPlans = plansList.filter(
        (p) =>
          p.tier !== "credit_pack" &&
          p.tier !== "discovery_pass" &&
          p.code !== "discovery_monthly" &&
          !p.code?.startsWith("decouverte")
      );
      setPlans(classicPlans);
      setLatestRequest(req);
      if (classicPlans.length > 0 && !selectedPlanId) {
        const defaultPlan = classicPlans.find((p) => p.code === "adult_all_access") || classicPlans[0];
        setSelectedPlanId(defaultPlan.id);
      }
    } catch (err) {
      console.error("[MembershipOnboardingView] Erreur chargement :", err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, selectedPlanId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanId) {
      setErrorMessage("Veuillez sélectionner une formule.");
      return;
    }

    const currentPlan = plans.find((p) => p.id === selectedPlanId);
    const commitment: CommitmentType = (currentPlan?.commitment as CommitmentType) || "annual";
    const isEssential = currentPlan?.code === "adult_essential" || currentPlan?.name?.toLowerCase().includes("essentiel");
    const isKid = currentPlan?.code === "kid_boxing_season" || currentPlan?.name?.toLowerCase().includes("kid");

    if (isKid && !birthDate) {
      setErrorMessage("Veuillez renseigner la date de naissance pour l'inscription Kid Boxing.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const res = await submitMembershipRequest(supabase, {
      planId: selectedPlanId,
      commitmentType: commitment,
      selectedDiscipline: isEssential ? selectedDiscipline : undefined,
      birthDate: isKid ? birthDate : undefined,
      memberNotes: memberNotes.trim() || undefined,
    });

    if (res.success) {
      setSuccessMessage(res.message || "Votre demande d'adhésion a été transmise avec succès.");
      await loadData();
      await refreshMemberData();
    } else {
      setErrorMessage(res.error || "Impossible de soumettre la demande.");
    }
    setIsSubmitting(false);
  };

  // Filtrer les formules selon les services actifs et la catégorie sélectionnée
  const filteredPlans = plans.filter((p) => {
    if (p.tier === "credit_pack") return false;
    if (p.type === "private" && !isPrivateEnabled) return false;
    if (p.type === "small_group" && !isSmallGroupEnabled) return false;

    if (categoryFilter === "adult") {
      return p.code === "adult_essential" || p.code === "adult_all_access" || (p.type === "small_group" && !p.code?.includes("lady") && !p.code?.includes("kid"));
    }
    if (categoryFilter === "lady") {
      return p.code === "lady_striking_annual" || p.name.toLowerCase().includes("lady");
    }
    if (categoryFilter === "kid") {
      return p.code === "kid_boxing_season" || p.name.toLowerCase().includes("kid");
    }
    if (categoryFilter === "private") {
      return p.type === "private";
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
              className="w-full sm:w-auto px-6 py-3.5 bg-brand-blue hover:bg-brand-white text-brand-black font-heading font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-brand-blue/20 flex items-center justify-center cursor-pointer"
            >
              Accéder au planning & Réserver
            </Link>
            <Link
              href="/membre"
              className="w-full sm:w-auto px-6 py-3.5 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white text-xs font-heading font-bold uppercase tracking-wider rounded-xl border border-brand-white/10 transition-colors flex items-center justify-center"
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
    const isAnnual = latestRequest.commitment_type === "annual";
    return (
      <div className="max-w-3xl mx-auto space-y-6 pt-4 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#0f172a] border border-brand-blue/30 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-brand-white/10">
            <div>
              <span className="text-[10px] font-heading font-black uppercase tracking-widest text-brand-blue block mb-0.5">
                Dossier en cours d&apos;examen
              </span>
              <h1 className="text-xl sm:text-2xl font-heading font-black uppercase tracking-wider text-brand-white">
                Demande d&apos;adhésion en attente
              </h1>
            </div>

            <div className="px-3.5 py-1.5 rounded-full bg-brand-blue/15 border border-brand-blue/30 text-brand-blue text-xs font-heading font-black uppercase tracking-wider">
              En cours de validation
            </div>
          </div>

          {/* Corps de l'explication */}
          <div className="space-y-4 text-xs text-brand-white/80 leading-relaxed">
            <p>
              Votre demande pour la formule <strong className="text-brand-white text-sm">{latestRequest.plan?.name || "Sélectionnée"}</strong> ({isAnnual ? "Engagement annuel" : "Formule mensuelle"}) a bien été reçue le <strong>{new Date(latestRequest.created_at).toLocaleDateString("fr-FR")}</strong>.
            </p>
            <div className="bg-[#0a1120] border border-brand-blue/20 rounded-2xl p-4 sm:p-5">
              <p className="text-brand-blue/90 text-xs leading-relaxed">
                <strong>Important :</strong> Les réservations de cours restent verrouillées jusqu&apos;à l&apos;activation de votre adhésion par le club. Vous recevrez une confirmation dès que votre dossier sera validé.
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
                {isAnnual ? "Annuel" : "Mensuel"}
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
        <div className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-brand-blue/15 border border-brand-blue/30 text-brand-blue text-xs font-heading font-black uppercase tracking-widest">
          Adhésion Striking Camp
        </div>
        <h1 className="text-3xl sm:text-4xl font-heading font-black uppercase tracking-wider text-brand-white">
          Choisissez votre <span className="text-brand-blue">Formule</span>
        </h1>
        <p className="text-xs sm:text-sm text-brand-white/60 leading-relaxed">
          Sélectionnez la formule d&apos;entraînement adaptée à votre pratique.
        </p>

        {/* Filtres par catégorie */}
        <div className="pt-4 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setCategoryFilter("all")}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-heading font-black uppercase tracking-wider transition-all cursor-pointer",
              categoryFilter === "all"
                ? "bg-brand-blue text-brand-black shadow-md shadow-brand-blue/20"
                : "bg-brand-white/5 text-brand-white/60 hover:text-brand-white"
            )}
          >
            Toutes les formules
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter("adult")}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-heading font-black uppercase tracking-wider transition-all cursor-pointer",
              categoryFilter === "adult"
                ? "bg-brand-blue text-brand-black shadow-md shadow-brand-blue/20"
                : "bg-brand-white/5 text-brand-white/60 hover:text-brand-white"
            )}
          >
            Cours Adultes
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter("lady")}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-heading font-black uppercase tracking-wider transition-all cursor-pointer",
              categoryFilter === "lady"
                ? "bg-pink-500 text-white shadow-md shadow-pink-500/20"
                : "bg-brand-white/5 text-brand-white/60 hover:text-brand-white"
            )}
          >
            Lady Striking
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter("kid")}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-heading font-black uppercase tracking-wider transition-all cursor-pointer",
              categoryFilter === "kid"
                ? "bg-brand-blue text-brand-black font-black shadow-md shadow-brand-blue/20"
                : "bg-brand-white/5 text-brand-white/60 hover:text-brand-white"
            )}
          >
            Kid Boxing
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter("private")}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-heading font-black uppercase tracking-wider transition-all cursor-pointer",
              categoryFilter === "private"
                ? "bg-brand-blue text-brand-black font-black shadow-md shadow-brand-blue/20"
                : "bg-brand-white/5 text-brand-white/60 hover:text-brand-white"
            )}
          >
            Cours Privés
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
        <div className="p-4 bg-brand-blue/15 border border-brand-blue/30 rounded-2xl text-brand-blue text-xs flex items-center gap-3">
          <CheckCircle2 size={18} className="shrink-0 text-brand-blue" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Grille des formules disponibles */}
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredPlans.map((plan) => {
            const isSelected = selectedPlanId === plan.id;
            const isPriv = plan.allows_private || plan.type === "private";
            const isAllAccess = plan.code === "adult_all_access";
            const isEssential = plan.code === "adult_essential";
            const isLady = plan.code === "lady_striking_annual" || plan.name.toLowerCase().includes("lady");
            const isKid = plan.code === "kid_boxing_season" || plan.name.toLowerCase().includes("kid");

            let periodLabel = "/ AN";
            let commitmentLabel = "ENGAGEMENT ANNUEL";

            if (isPriv) {
              periodLabel = "/ MOIS";
              commitmentLabel = plan.commitment === "annual" ? "ENGAGEMENT ANNUEL" : "ENGAGEMENT MENSUEL";
            } else if (isKid) {
              periodLabel = "/ SAISON";
              commitmentLabel = "SAISON";
            }

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
                <div className="absolute top-4 right-4 flex items-center gap-2">
                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-brand-blue text-brand-black flex items-center justify-center font-bold shadow-md shadow-brand-blue/30">
                      <Check size={14} strokeWidth={3} />
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {/* Catégorie & Nom */}
                  <div>
                    <span className="text-[10px] font-heading font-black uppercase tracking-wider text-brand-white/40 block mb-1">
                      {isPriv
                        ? "Coaching Individuel Privé"
                        : isLady
                        ? "Section 100% Féminine"
                        : isKid
                        ? "Enfants (5–13 ans)"
                        : "Cours Adultes"}
                    </span>
                    <h3 className="text-lg font-heading font-black uppercase tracking-wider text-brand-white">
                      {plan.name}
                    </h3>
                  </div>

                  {/* Prix & Engagement */}
                  <div className="pt-2 flex items-baseline gap-1.5 flex-wrap">
                    <span className="text-3xl font-heading font-black text-brand-white">
                      {(plan.price_cents / 100).toFixed(0)} €
                    </span>
                    <span className="text-xs text-brand-white/75 font-heading uppercase font-bold">
                      {periodLabel}
                    </span>
                    <span className="text-[11px] text-brand-blue font-semibold ml-2 block sm:inline">
                      • {commitmentLabel}
                    </span>
                  </div>

                  {/* Inclusions conformes */}
                  <div className="space-y-2 pt-3 border-t border-brand-white/5 text-xs text-brand-white/85">
                    <p className="text-[11px] font-heading font-bold uppercase tracking-wider text-brand-blue mb-1">
                      INCLUS DANS VOTRE FORMULE :
                    </p>

                    {isEssential && (
                      <>
                        <div className="flex items-center gap-2">
                          <Check size={14} className="text-brand-blue shrink-0" />
                          <span>Une discipline au choix</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check size={14} className="text-brand-blue shrink-0" />
                          <span>Suivi technique personnalisé en groupe réduit</span>
                        </div>
                      </>
                    )}

                    {isAllAccess && (
                      <>
                        <div className="flex items-center gap-2">
                          <Check size={14} className="text-brand-blue shrink-0" />
                          <span>Accès illimité aux séances Cours Adulte</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check size={14} className="text-brand-blue shrink-0" />
                          <span>Suivi technique personnalisé en groupe réduit</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check size={14} className="text-brand-blue shrink-0" />
                          <span>Toutes disciplines incluses</span>
                        </div>
                      </>
                    )}

                    {isLady && (
                      <>
                        <div className="flex items-center gap-2">
                          <Check size={14} className="text-pink-400 shrink-0" />
                          <span>Accès aux créneaux Lady Striking</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check size={14} className="text-pink-400 shrink-0" />
                          <span>Coaching et suivi personnalisé</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check size={14} className="text-pink-400 shrink-0" />
                          <span>Boxe, kick boxing, boxe thaï — tous niveaux (débutantes à confirmées)</span>
                        </div>
                      </>
                    )}

                    {isKid && (
                      <>
                        <div className="flex items-center gap-2">
                          <Check size={14} className="text-brand-blue shrink-0" />
                          <span>Accès aux créneaux dédiés 5–8 ans ou 9–13 ans</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check size={14} className="text-brand-blue shrink-0" />
                          <span>Motricité, coordination, discipline et respect</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check size={14} className="text-brand-blue shrink-0" />
                          <span>Encadrement pédagogique adapté</span>
                        </div>
                      </>
                    )}

                    {isPriv && (
                      <>
                        <div className="flex items-center gap-2">
                          <Check size={14} className="text-brand-blue shrink-0" />
                          <span>8 séances privées par mois</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check size={14} className="text-brand-blue shrink-0" />
                          <span>Suivi technique sur-mesure avec le coach</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check size={14} className="text-brand-blue shrink-0" />
                          <span>Accès illimité aux séances Cours Adulte</span>
                        </div>
                      </>
                    )}

                    {/* Inclusions communes obligatoires */}
                    <div className="flex items-center gap-2">
                      <Check size={14} className="text-brand-blue shrink-0" />
                      <span>Parking privé inclus</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check size={14} className="text-brand-blue shrink-0" />
                      <span>Accès aux événements (stages)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check size={14} className="text-brand-blue shrink-0" />
                      <span>Frais d&apos;adhésion : 90 €</span>
                    </div>
                  </div>
                </div>

                {/* Bouton de sélection visuel */}
                <div className="pt-4">
                  <div
                    className={cn(
                      "w-full py-2.5 rounded-xl text-center text-xs font-heading font-bold uppercase tracking-wider transition-all",
                      isSelected
                        ? "bg-brand-blue text-brand-black font-black shadow-md shadow-brand-blue/20"
                        : "bg-brand-white/5 text-brand-white/60 hover:text-brand-white hover:bg-brand-white/10"
                    )}
                  >
                    {isSelected ? "Formule Sélectionnée" : "Choisir cette formule"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Options spécifiques selon la formule sélectionnée */}
        {(() => {
          const activeSelectedPlan = plans.find((p) => p.id === selectedPlanId);
          const isEssentialSelected = activeSelectedPlan?.code === "adult_essential" || activeSelectedPlan?.name?.toLowerCase().includes("essentiel");
          const isKidSelected = activeSelectedPlan?.code === "kid_boxing_season" || activeSelectedPlan?.name?.toLowerCase().includes("kid");

          if (isEssentialSelected) {
            return (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-[#11223f] to-[#0a1120] border border-brand-blue/30 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-brand-blue animate-pulse" />
                  <h4 className="text-sm font-heading font-black uppercase tracking-wider text-brand-white">
                    Choisissez votre discipline autorisée (Formule Essentiel)
                  </h4>
                </div>
                <p className="text-xs text-brand-white/70 leading-relaxed">
                  Votre formule Essentiel vous donne accès à tous les créneaux de la discipline que vous choisissez ci-dessous, dans la limite de 3 séances par semaine.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                  {ADULT_DISCIPLINES.map((disc) => {
                    const isDiscActive = selectedDiscipline === disc;
                    return (
                      <button
                        key={disc}
                        type="button"
                        onClick={() => setSelectedDiscipline(disc)}
                        className={cn(
                          "py-3 px-4 rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition-all border text-center cursor-pointer",
                          isDiscActive
                            ? "bg-brand-blue text-brand-black border-brand-blue font-black shadow-lg shadow-brand-blue/25"
                            : "bg-[#0a1120] text-brand-white/80 border-brand-white/10 hover:border-brand-white/30 hover:text-brand-white"
                        )}
                      >
                        {disc}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            );
          }

          if (isKidSelected) {
            return (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-[#11223f] to-[#0a1120] border border-brand-blue/30 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-brand-blue animate-pulse" />
                  <h4 className="text-sm font-heading font-black uppercase tracking-wider text-brand-white">
                    Date de naissance de l&apos;enfant (Kid Boxing)
                  </h4>
                </div>
                <p className="text-xs text-brand-white/70 leading-relaxed">
                  Indiquez la date de naissance pour attribuer le groupe d&apos;âge approprié (5–8 ans ou 9–13 ans) et sécuriser les créneaux autorisés.
                </p>
                <div className="max-w-xs pt-1">
                  <input
                    type="date"
                    required
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full bg-[#0a1120] border border-brand-white/15 rounded-xl p-3 text-xs text-brand-white focus:border-brand-blue outline-none"
                  />
                </div>
              </motion.div>
            );
          }

          return null;
        })()}

        {/* Section Notes Optionnelles & Bouton de Validation */}
        <div className="bg-[#0f172a] border border-brand-white/10 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xl">
          <div>
            <label className="text-xs font-heading font-bold uppercase tracking-wider text-brand-white/70 block mb-2">
              Commentaire ou précision pour l&apos;équipe (optionnel)
            </label>
            <textarea
              rows={2}
              value={memberNotes}
              onChange={(e) => setMemberNotes(e.target.value)}
              placeholder="Ex: Disponibilités souhaitées, objectifs sportifs, antécédents médicaux..."
              className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3.5 text-xs text-brand-white placeholder:text-brand-white/30 focus:border-brand-blue outline-none resize-none transition-colors"
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
                  <span>Transmission en cours...</span>
                </>
              ) : (
                <>
                  <span>Confirmer ma demande d&apos;adhésion</span>
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
