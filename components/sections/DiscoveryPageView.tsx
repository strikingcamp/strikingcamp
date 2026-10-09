"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  ArrowRight,
  Loader2,
  X,
  Clock,
  UserCheck,
  CalendarCheck,
  Shield,
  Car,
  Layers,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  submitPackRequest,
  getMemberPacksEligibilityMap,
  type PackEligibilityResult,
} from "@/lib/supabase/membership-requests";
import { SESSION_PACKS, type SessionPackDefinition } from "@/lib/stripe";
import { trackBookingClick } from "@/lib/analytics";

export interface PublicPlan {
  id: string;
  name: string;
  code: string | null;
  type: string;
  tier: string | null;
  commitment: "monthly" | "annual" | null;
  price_cents: number;
  private_sessions_per_period: number | null;
  is_active: boolean;
  is_digital_plan: boolean;
  badge_text: string | null;
  features: string[] | null;
}

export interface DiscoveryPageViewProps {
  isSmallGroupActive?: boolean;
  initialPlans?: PublicPlan[];
}

export default function DiscoveryPageView({
  isSmallGroupActive = true,
  initialPlans = [],
}: DiscoveryPageViewProps = {}) {
  const searchParams = useSearchParams();
  const requestedPackParam = searchParams.get("pack");

  const [selectedPackForModal, setSelectedPackForModal] = useState<SessionPackDefinition | null>(null);
  const [packNotes, setPackNotes] = useState("");
  const [isSubmittingPack, setIsSubmittingPack] = useState(false);
  const [packSuccessMessage, setPackSuccessMessage] = useState<string | null>(null);
  const [packError, setPackError] = useState<string | null>(null);
  const [showAuthRequiredModal, setShowAuthRequiredModal] = useState(false);
  const [pendingAuthPackId, setPendingAuthPackId] = useState<string | null>(null);

  const [packEligibility, setPackEligibility] = useState<Record<string, PackEligibilityResult>>({
    decouverte_1: { isEligible: true, alreadyUsed: false, hasPending: false, isDiscovery: true },
    decouverte_3: { isEligible: true, alreadyUsed: false, hasPending: false, isDiscovery: true },
  });

  const loadEligibility = useCallback(async () => {
    try {
      const supabase = createClient();
      const map = await getMemberPacksEligibilityMap(supabase);
      setPackEligibility(map);
    } catch (err) {
      console.warn("[DiscoveryPageView] Erreur chargement éligibilité :", err);
    }
  }, []);

  useEffect(() => {
    loadEligibility();
  }, [loadEligibility]);

  // Si l'utilisateur revient après connexion avec ?pack=...
  useEffect(() => {
    if (
      requestedPackParam &&
      (requestedPackParam === "decouverte_1" ||
        requestedPackParam === "decouverte_3")
    ) {
      handleOpenPackModal(requestedPackParam);
    }
  }, [requestedPackParam]);

  const handleOpenPackModal = async (packId: string) => {
    setPackError(null);
    setPackSuccessMessage(null);
    trackBookingClick("pass_selection", `pack_${packId}`);

    const packDef = SESSION_PACKS[packId];
    if (!packDef) return;

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setPendingAuthPackId(packId);
        setShowAuthRequiredModal(true);
        return;
      }

      // Re-vérifier l'éligibilité avant d'ouvrir la modale
      const currentMap = await getMemberPacksEligibilityMap(supabase);
      setPackEligibility(currentMap);
      const el = currentMap[packId];

      if (el && !el.isEligible) {
        if (el.alreadyUsed) {
          setPackError(
            `Offre découverte déjà utilisée : vous avez déjà souscrit ou demandé le ${packDef.name}. Cette offre est strictement limitée à 1 fois par membre à vie.`
          );
          return;
        }
        if (el.hasPending) {
          setPackError(`Une demande pour le ${packDef.name} est déjà en cours de validation.`);
          return;
        }
      }

      setSelectedPackForModal(packDef);
      setPackNotes("");
    } catch (err: any) {
      console.error("[handleOpenPackModal] Erreur :", err);
      setSelectedPackForModal(packDef);
    }
  };

  const handleBuyPack = handleOpenPackModal;

  const handleConfirmPackRequest = async () => {
    if (!selectedPackForModal) return;
    setIsSubmittingPack(true);
    setPackError(null);

    try {
      const supabase = createClient();
      const res = await submitPackRequest(supabase, {
        planCode: selectedPackForModal.planCode,
        memberNotes: packNotes.trim() || undefined,
      });

      if (res.success) {
        setPackSuccessMessage(
          res.message ||
            `Votre demande pour le ${selectedPackForModal.name} a été transmise avec succès.`
        );
        await loadEligibility();
      } else {
        setPackError(res.error || "Impossible de transmettre la demande.");
        await loadEligibility();
      }
    } catch (err: any) {
      console.error("[handleConfirmPackRequest] Erreur :", err);
      setPackError(err.message || "Une erreur est survenue lors de l'envoi de la demande.");
    } finally {
      setIsSubmittingPack(false);
    }
  };

  const scrollToOffres = (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById("offres");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-[#020817] text-brand-white font-sans selection:bg-brand-blue selection:text-brand-black">
      
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          1. HERO SECTION
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center space-y-8">
        <div className="inline-flex items-center px-4 py-1.5 bg-brand-blue/10 border border-brand-blue/30 rounded-full text-brand-blue text-xs font-heading font-bold uppercase tracking-widest">
          <span>Séances Découverte • Sans engagement • Marseille (13010)</span>
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-heading font-black uppercase tracking-tight text-brand-white leading-tight">
          COMMENCEZ PAR <br className="hidden sm:inline" />
          <span className="text-brand-blue">UNE SÉANCE</span>
        </h1>

        <p className="text-brand-white/80 text-base sm:text-lg md:text-xl leading-relaxed max-w-2xl mx-auto font-light">
          Découvrez l’univers Striking Camp, entraînez-vous en groupe réduit et trouvez la discipline qui vous correspond.
        </p>

        <div className="pt-4 flex items-center justify-center">
          <a
            href="#offres"
            onClick={scrollToOffres}
            className="inline-flex items-center gap-3 px-8 py-4 bg-brand-blue hover:bg-brand-white text-brand-black font-heading font-bold text-sm uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-brand-blue/25 cursor-pointer"
          >
            <span>CHOISIR MON OFFRE</span>
            <ArrowRight size={16} />
          </a>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          2. SECTION OFFRES DÉCOUVERTE
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="offres" className="scroll-mt-24 py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center px-3.5 py-1 bg-brand-blue/10 border border-brand-blue/20 rounded-full text-brand-blue text-xs font-heading font-bold uppercase tracking-wider">
            <span>Offres Découverte • Achat unique • Sans engagement</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-heading font-black uppercase tracking-tight text-brand-white">
            NOS OFFRES <span className="text-brand-blue">DÉCOUVERTE</span>
          </h2>
          <p className="text-brand-white/70 text-sm">
            Une formule souple pour faire vos premiers pas et tester nos entraînements avant de vous engager.
          </p>
          <div className="p-3 rounded-xl bg-brand-blue/5 border border-brand-blue/15 text-xs text-brand-white/80 max-w-lg mx-auto">
            Offre découverte disponible une seule fois par membre.
          </div>
        </div>

        {packError && (
          <div className="max-w-2xl mx-auto p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs text-center">
            {packError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto items-stretch">
          
          {/* OFFRE 1 : DÉCOUVERTE — 1 SÉANCE */}
          <div className="rounded-2xl bg-[#0b1322] border border-brand-white/10 p-6 sm:p-7 flex flex-col justify-between hover:border-brand-blue/30 transition-all duration-200">
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-brand-white/10 text-brand-white/90 text-[11px] font-heading font-bold uppercase tracking-wider">
                  1 SÉANCE
                </span>
                <span className="text-xs text-brand-white/50 font-medium">
                  Validité 30 jours
                </span>
              </div>

              <div>
                <h3 className="text-xl font-heading font-black uppercase text-brand-white">
                  DÉCOUVERTE — 1 SÉANCE
                </h3>
                <p className="text-xs text-brand-white/70 mt-1.5 leading-relaxed">
                  Une première séance en groupe réduit pour découvrir le club.
                </p>
              </div>

              <div className="pt-2">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-4xl font-heading font-black text-brand-white">
                    20 €
                  </span>
                  <span className="text-xs text-brand-white/60 font-bold uppercase">
                    / paiement unique
                  </span>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-brand-white/10 text-xs text-brand-white/85">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-brand-blue shrink-0 mt-0.5" />
                  <span>1 séance en groupe réduit</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-brand-blue shrink-0 mt-0.5" />
                  <span>Sans engagement</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-brand-blue shrink-0 mt-0.5" />
                  <span>Validité 30 jours</span>
                </div>
              </div>

              <p className="text-[11px] text-brand-white/50 pt-2 border-t border-brand-white/5">
                Offre découverte utilisable une seule fois par membre.
              </p>
            </div>

            <div className="pt-6">
              {packEligibility.decouverte_1?.alreadyUsed ? (
                <button
                  type="button"
                  disabled
                  className="w-full py-3.5 px-4 rounded-xl bg-brand-white/5 border border-brand-white/10 text-brand-white/40 font-heading font-bold text-xs uppercase tracking-wider cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <span>Offre découverte déjà utilisée</span>
                </button>
              ) : packEligibility.decouverte_1?.hasPending ? (
                <button
                  type="button"
                  disabled
                  className="w-full py-3.5 px-4 rounded-xl bg-brand-blue/10 border border-brand-blue/20 text-brand-blue/80 font-heading font-bold text-xs uppercase tracking-wider cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <span>Demande en attente</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleBuyPack("decouverte_1")}
                  className="w-full py-3.5 px-4 rounded-xl bg-brand-white/10 hover:bg-brand-blue hover:text-brand-black text-brand-white font-heading font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>CHOISIR CETTE OFFRE</span>
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          </div>

          {/* OFFRE 2 : DÉCOUVERTE — 3 SÉANCES */}
          <div className="rounded-2xl bg-[#0b1322] border border-brand-blue/30 p-6 sm:p-7 flex flex-col justify-between hover:border-brand-blue/60 transition-all duration-200">
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-brand-blue/15 text-brand-blue text-[11px] font-heading font-bold uppercase tracking-wider border border-brand-blue/30">
                  3 SÉANCES
                </span>
                <span className="text-xs text-brand-white/50 font-medium">
                  Validité 30 jours
                </span>
              </div>

              <div>
                <h3 className="text-xl font-heading font-black uppercase text-brand-white">
                  DÉCOUVERTE — 3 SÉANCES
                </h3>
                <p className="text-xs text-brand-white/70 mt-1.5 leading-relaxed">
                  3 séances pour tester différentes disciplines en groupe réduit.
                </p>
              </div>

              <div className="pt-2">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-4xl font-heading font-black text-brand-white">
                    49 €
                  </span>
                  <span className="text-xs text-brand-white/60 font-bold uppercase">
                    / paiement unique
                  </span>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-brand-white/10 text-xs text-brand-white/85">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-brand-blue shrink-0 mt-0.5" />
                  <span>3 séances en groupe réduit</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-brand-blue shrink-0 mt-0.5" />
                  <span>Sans engagement</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-brand-blue shrink-0 mt-0.5" />
                  <span>Validité 30 jours</span>
                </div>
              </div>

              <p className="text-[11px] text-brand-white/50 pt-2 border-t border-brand-white/5">
                Offre découverte utilisable une seule fois par membre.
              </p>
            </div>

            <div className="pt-6">
              {packEligibility.decouverte_3?.alreadyUsed ? (
                <button
                  type="button"
                  disabled
                  className="w-full py-3.5 px-4 rounded-xl bg-brand-white/5 border border-brand-white/10 text-brand-white/40 font-heading font-bold text-xs uppercase tracking-wider cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <span>Offre découverte déjà utilisée</span>
                </button>
              ) : packEligibility.decouverte_3?.hasPending ? (
                <button
                  type="button"
                  disabled
                  className="w-full py-3.5 px-4 rounded-xl bg-brand-blue/10 border border-brand-blue/20 text-brand-blue/80 font-heading font-bold text-xs uppercase tracking-wider cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <span>Demande en attente</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleBuyPack("decouverte_3")}
                  className="w-full py-3.5 px-4 rounded-xl bg-brand-blue hover:bg-brand-white text-brand-black font-heading font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-brand-blue/25"
                >
                  <span>CHOISIR CETTE OFFRE</span>
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          </div>

        </div>

        {/* BANDEAU VERS LES FORMULES MENSUELLES & ANNUELLES */}
        <div className="max-w-4xl mx-auto mt-10 p-6 rounded-2xl bg-gradient-to-r from-[#0b162c] to-[#070d18] border border-brand-blue/30 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left shadow-lg">
          <div className="space-y-1">
            <span className="text-[10px] font-heading font-black text-brand-blue uppercase tracking-widest px-2.5 py-0.5 rounded bg-brand-blue/10 border border-brand-blue/20 inline-block">
              Entraînement régulier
            </span>
            <h3 className="text-base font-heading font-black uppercase text-brand-white">
              Vous cherchez une formule mensuelle sans engagement ou annuelle ?
            </h3>
            <p className="text-xs text-brand-white/70 max-w-lg">
              Découvrez la formule Adulte — Sans engagement à 89 €/mois (accès illimité 30 jours) et toutes nos formules d&apos;abonnement.
            </p>
          </div>
          <Link
            href="/tarifs"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-brand-blue hover:bg-brand-white text-brand-black font-heading font-black text-xs uppercase tracking-wider transition-all shrink-0 shadow-md shadow-brand-blue/20"
          >
            <span>Voir tous les tarifs</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          3. SECTION COMMENT ÇA SE PASSE (PARCOURS EN 5 ÉTAPES)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="etapes" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center px-3 py-1 bg-brand-blue/10 border border-brand-blue/20 rounded-full text-brand-blue text-xs font-heading font-bold uppercase tracking-wider">
            <span>Guide d&apos;inscription</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-heading font-black uppercase tracking-tight text-brand-white">
            COMMENT ÇA <span className="text-brand-blue">SE PASSE ?</span>
          </h2>
          <p className="text-brand-white/70 text-sm">
            Un parcours simple et transparent en 5 étapes pour démarrer vos entraînements.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 sm:gap-6 items-stretch">
          
          {/* ÉTAPE 1 */}
          <div className="rounded-2xl bg-[#0b1322] border border-brand-white/10 p-5 sm:p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <span className="text-2xl font-heading font-black text-brand-blue">01</span>
              <h3 className="font-heading font-bold text-sm uppercase text-brand-white">
                CHOISISSEZ VOTRE OFFRE
              </h3>
              <p className="text-xs text-brand-white/70 leading-relaxed">
                Choisissez entre 1 séance découverte — 20 € ou 3 séances découverte — 49 € pour tester les cours en groupe réduit.
              </p>
            </div>
          </div>

          {/* ÉTAPE 2 */}
          <div className="rounded-2xl bg-[#0b1322] border border-brand-white/10 p-5 sm:p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <span className="text-2xl font-heading font-black text-brand-blue">02</span>
              <h3 className="font-heading font-bold text-sm uppercase text-brand-white">
                CRÉEZ VOTRE COMPTE
              </h3>
              <p className="text-xs text-brand-white/70 leading-relaxed">
                Créez votre compte pour accéder à votre espace personnel.
              </p>
            </div>
          </div>

          {/* ÉTAPE 3 */}
          <div className="rounded-2xl bg-[#0b1322] border border-brand-white/10 p-5 sm:p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <span className="text-2xl font-heading font-black text-brand-blue">03</span>
              <h3 className="font-heading font-bold text-sm uppercase text-brand-white">
                VALIDEZ VOTRE DEMANDE
              </h3>
              <p className="text-xs text-brand-white/70 leading-relaxed">
                Votre demande d&apos;inscription est enregistrée et doit être validée par Striking Camp.
              </p>
            </div>
          </div>

          {/* ÉTAPE 4 */}
          <div className="rounded-2xl bg-[#0b1322] border border-brand-white/10 p-5 sm:p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <span className="text-2xl font-heading font-black text-brand-blue">04</span>
              <h3 className="font-heading font-bold text-sm uppercase text-brand-white">
                OBTENEZ VOTRE ESPACE MEMBRE
              </h3>
              <p className="text-xs text-brand-white/70 leading-relaxed">
                Une fois votre demande validée, votre offre découverte et vos accès sont activés dans votre espace membre.
              </p>
            </div>
          </div>

          {/* ÉTAPE 5 */}
          <div className="rounded-2xl bg-[#0b1322] border border-brand-white/10 p-5 sm:p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <span className="text-2xl font-heading font-black text-brand-blue">05</span>
              <h3 className="font-heading font-bold text-sm uppercase text-brand-white">
                RÉSERVEZ VOS SÉANCES
              </h3>
              <p className="text-xs text-brand-white/70 leading-relaxed">
                Accédez au planning et réservez librement vos créneaux disponibles.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          4. SECTION CE QUI EST INCLUS
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="inclus" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center px-3 py-1 bg-brand-blue/10 border border-brand-blue/20 rounded-full text-brand-blue text-xs font-heading font-bold uppercase tracking-wider">
            <span>Détails & Avantages</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-heading font-black uppercase tracking-tight text-brand-white">
            CE QUI EST <span className="text-brand-blue">INCLUS</span>
          </h2>
          <p className="text-brand-white/70 text-sm">
            Tout est pensé pour une expérience sportive complète dès votre première séance.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          
          <div className="rounded-2xl bg-[#0b1322] border border-brand-white/10 p-6 space-y-2">
            <h3 className="font-heading font-bold text-sm uppercase text-brand-blue flex items-center gap-2">
              <CheckCircle2 size={16} className="shrink-0" />
              <span>Groupe Réduit</span>
            </h3>
            <p className="text-xs text-brand-white/70 leading-relaxed">
              12 personnes maximum par séance pour garantir un encadrement technique rigoureux et sécurisé par le coach.
            </p>
          </div>

          <div className="rounded-2xl bg-[#0b1322] border border-brand-white/10 p-6 space-y-2">
            <h3 className="font-heading font-bold text-sm uppercase text-brand-blue flex items-center gap-2">
              <CheckCircle2 size={16} className="shrink-0" />
              <span>Accès Disciplines Adultes</span>
            </h3>
            <p className="text-xs text-brand-white/70 leading-relaxed">
              Liberté de choisir parmi la Boxe Anglaise, le Kick Boxing, la Boxe Thaï, le Striking et le cours Lady Striking.
            </p>
          </div>

          <div className="rounded-2xl bg-[#0b1322] border border-brand-white/10 p-6 space-y-2">
            <h3 className="font-heading font-bold text-sm uppercase text-brand-blue flex items-center gap-2">
              <CheckCircle2 size={16} className="shrink-0" />
              <span>Espace Membre</span>
            </h3>
            <p className="text-xs text-brand-white/70 leading-relaxed">
              Plateforme personnelle pour suivre vos accès, consulter vos créneaux et gérer vos réservations.
            </p>
          </div>

          <div className="rounded-2xl bg-[#0b1322] border border-brand-white/10 p-6 space-y-2">
            <h3 className="font-heading font-bold text-sm uppercase text-brand-blue flex items-center gap-2">
              <CheckCircle2 size={16} className="shrink-0" />
              <span>Réservation via Planning</span>
            </h3>
            <p className="text-xs text-brand-white/70 leading-relaxed">
              Consultez le planning en direct et réservez ou annulez en toute autonomie jusqu&apos;à 24h avant le cours.
            </p>
          </div>

          <div className="rounded-2xl bg-[#0b1322] border border-brand-white/10 p-6 space-y-2">
            <h3 className="font-heading font-bold text-sm uppercase text-brand-blue flex items-center gap-2">
              <CheckCircle2 size={16} className="shrink-0" />
              <span>Formules Flexibles</span>
            </h3>
            <p className="text-xs text-brand-white/70 leading-relaxed">
              1 séance, 3 séances ou 1 mois d&apos;accès illimité activés immédiatement dès validation de votre demande par le club.
            </p>
          </div>

          <div className="rounded-2xl bg-[#0b1322] border border-brand-white/10 p-6 space-y-2">
            <h3 className="font-heading font-bold text-sm uppercase text-brand-blue flex items-center gap-2">
              <CheckCircle2 size={16} className="shrink-0" />
              <span>Parking Privé Inclus</span>
            </h3>
            <p className="text-xs text-brand-white/70 leading-relaxed">
              Stationnement privé et sécurisé directement accessible devant le club au 268 avenue de la Capelette (13010).
            </p>
          </div>

        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          5. CTA FINAL
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto text-center space-y-6">
        <div className="rounded-3xl bg-gradient-to-b from-[#101c34] to-[#080e1b] border border-brand-blue/30 p-8 sm:p-12 space-y-6 shadow-[0_0_40px_rgba(47,174,224,0.12)]">
          <h2 className="text-3xl sm:text-4xl font-heading font-black uppercase tracking-tight text-brand-white">
            PRÊT À REJOINDRE <span className="text-brand-blue">LE CLUB ?</span>
          </h2>
          <p className="text-brand-white/75 text-sm sm:text-base max-w-lg mx-auto">
            Sélectionnez votre offre découverte et démarrez votre entraînement dès cette semaine.
          </p>
          <div className="pt-2">
            <a
              href="#offres"
              onClick={scrollToOffres}
              className="inline-flex items-center gap-2 px-8 py-4 bg-brand-blue hover:bg-brand-white text-brand-black font-heading font-bold text-xs sm:text-sm uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-brand-blue/20 cursor-pointer"
            >
              <span>COMMENCER MA DÉCOUVERTE</span>
              <ArrowRight size={16} />
            </a>
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MODAL DE CONFIRMATION DE DEMANDE
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatePresence>
        {selectedPackForModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isSubmittingPack) {
                  setSelectedPackForModal(null);
                  setPackSuccessMessage(null);
                }
              }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-[#0f172a] border border-brand-blue/40 rounded-3xl p-6 sm:p-8 shadow-2xl z-10 space-y-6"
            >
              {/* Header Modal */}
              <div className="flex items-center justify-between pb-3 border-b border-brand-white/10">
                <div>
                  <h3 className="text-xl font-heading font-black uppercase tracking-wider text-brand-white">
                    Demande d&apos;Offre Découverte
                  </h3>
                  <p className="text-[11px] text-brand-white/60">
                    Validation et activation de vos accès
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedPackForModal(null);
                    setPackSuccessMessage(null);
                  }}
                  disabled={isSubmittingPack}
                  className="p-1.5 rounded-lg text-brand-white/50 hover:text-brand-white hover:bg-brand-white/10 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* État : DEMANDE ENREGISTRÉE */}
              {packSuccessMessage ? (
                <div className="space-y-5 text-center py-4">
                  <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 size={32} />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-lg font-heading font-black uppercase tracking-wider text-brand-white">
                      DEMANDE ENREGISTRÉE
                    </h4>
                    <p className="text-xs text-brand-white/80 max-w-sm mx-auto leading-relaxed">
                      Votre demande d&apos;offre découverte a bien été enregistrée. Elle doit maintenant être validée par Striking Camp.
                    </p>
                  </div>
                  <div className="p-4 bg-brand-white/5 border border-brand-white/10 rounded-2xl text-[11px] text-brand-white/80 space-y-1.5 text-left">
                    <p>• Votre demande est actuellement <strong>en attente de validation</strong> par l&apos;équipe.</p>
                    {selectedPackForModal.isUnlimited ? (
                      <p>• Votre <strong>accès illimité de 30 jours</strong> aux cours adultes sera activé dans votre espace membre dès validation.</p>
                    ) : (
                      <p>• Vos <strong>{selectedPackForModal.totalCredits} crédit(s)</strong> seront activés dans votre espace membre dès validation.</p>
                    )}
                    <p>• Vous pourrez alors accéder au planning pour réserver vos créneaux disponibles.</p>
                  </div>
                  <div className="pt-2 flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPackForModal(null);
                        setPackSuccessMessage(null);
                      }}
                      className="flex-1 py-3 bg-brand-white/10 hover:bg-brand-white/20 text-brand-white font-heading font-bold text-xs uppercase rounded-xl transition-all cursor-pointer"
                    >
                      Fermer
                    </button>
                    <Link
                      href="/membre/planning"
                      className="flex-1 py-3 bg-brand-blue hover:bg-brand-white text-brand-black font-heading font-black text-xs uppercase tracking-wider rounded-xl transition-all text-center flex items-center justify-center gap-2"
                    >
                      <span>Voir le Planning</span>
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              ) : (
                /* Formulaire de confirmation */
                <div className="space-y-4 text-xs text-brand-white/80">
                  {packError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs">
                      {packError}
                    </div>
                  )}

                  <div className="bg-[#0a1120] border border-brand-white/10 rounded-2xl p-4 space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-brand-white/50">Offre sélectionnée :</span>
                      <strong className="text-brand-blue font-heading text-sm">
                        {selectedPackForModal.name}
                      </strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-brand-white/50">Accès :</span>
                      <strong className="text-brand-white font-bold">
                        {selectedPackForModal.isUnlimited
                          ? "Accès illimité aux cours adultes (30 jours)"
                          : `${selectedPackForModal.totalCredits} crédit(s) en groupe réduit`}
                      </strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-brand-white/50">Validité :</span>
                      <span className="text-brand-white font-medium flex items-center gap-1">
                        <Clock size={12} className="text-brand-blue" />
                        {selectedPackForModal.validityDays} jours
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-brand-white/5">
                      <span className="text-brand-white/50">Tarif :</span>
                      <strong className="text-lg font-heading font-black text-brand-white">
                        {selectedPackForModal.priceEuros} €
                      </strong>
                    </div>
                  </div>

                  <div className="p-3.5 bg-brand-blue/10 border border-brand-blue/20 rounded-xl text-brand-blue/90 text-[11px] leading-relaxed">
                    Votre demande sera transmise à l&apos;équipe Striking Camp. Vos accès seront activés dans votre espace membre dès validation par le club.
                  </div>

                  <div>
                    <label className="text-[11px] font-heading font-bold uppercase tracking-wider text-brand-white/60 block mb-1.5">
                      Message / Note pour le coach (optionnel)
                    </label>
                    <textarea
                      rows={2}
                      value={packNotes}
                      onChange={(e) => setPackNotes(e.target.value)}
                      placeholder="Ex: Je souhaite essayer la Boxe Thaï ce jeudi..."
                      className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-xs text-brand-white placeholder:text-brand-white/30 focus:border-brand-blue outline-none"
                    />
                  </div>

                  <div className="flex gap-3 pt-3">
                    <button
                      type="button"
                      onClick={() => setSelectedPackForModal(null)}
                      disabled={isSubmittingPack}
                      className="flex-1 py-3 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white/70 font-heading font-bold text-xs uppercase rounded-xl transition-all cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmPackRequest}
                      disabled={isSubmittingPack}
                      className="flex-1 py-3 bg-brand-blue hover:bg-brand-white text-brand-black font-heading font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-brand-blue/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isSubmittingPack ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Envoi en cours...</span>
                        </>
                      ) : (
                        <>
                          <span>Confirmer la demande</span>
                          <ArrowRight size={14} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MODAL D'AUTHENTIFICATION REQUISE
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatePresence>
        {showAuthRequiredModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAuthRequiredModal(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-[#0f172a] border border-brand-blue/30 rounded-3xl p-6 sm:p-8 shadow-2xl z-10 space-y-6 text-center"
            >
              <div className="space-y-2">
                <h3 className="text-xl font-heading font-black uppercase tracking-wider text-brand-white">
                  Connexion requise
                </h3>
                <p className="text-xs text-brand-white/70 leading-relaxed">
                  Pour choisir votre offre découverte et enregistrer votre demande, veuillez vous connecter ou créer votre compte membre.
                </p>
              </div>

              <div className="flex flex-col gap-2.5 pt-2">
                <Link
                  href={`/connexion?redirect=/cours-decouverte${pendingAuthPackId ? `?pack=${pendingAuthPackId}` : ""}`}
                  className="w-full py-3.5 bg-brand-blue hover:bg-brand-white text-brand-black font-heading font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-brand-blue/20 flex items-center justify-center gap-2"
                >
                  <span>Se Connecter</span>
                  <ArrowRight size={14} />
                </Link>
                <Link
                  href={`/inscription?redirect=/cours-decouverte${pendingAuthPackId ? `?pack=${pendingAuthPackId}` : ""}`}
                  className="w-full py-3 bg-brand-white/10 hover:bg-brand-white/20 text-brand-white font-heading font-bold text-xs uppercase rounded-xl transition-all"
                >
                  Créer un compte
                </Link>
                <button
                  type="button"
                  onClick={() => setShowAuthRequiredModal(false)}
                  className="text-xs text-brand-white/50 hover:text-brand-white py-1 cursor-pointer"
                >
                  Continuer la visite
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
