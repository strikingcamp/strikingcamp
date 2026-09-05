"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronLeft,
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Shield,
  Phone,
  Mail,
  User,
  Flame,
  Target,
  Award,
  Dumbbell,
  Heart,
  ChevronRight,
  Users,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  getAvailableTrialSessions,
  type TrialSessionOption,
} from "@/lib/supabase/trial-bookings";

interface TrialBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedDiscipline?: string;
  preselectedType?: "small_group" | "collective";
}

export type Step = 1 | 2 | 3 | 4 | 5 | 6;

const DISCIPLINE_ICONS: Record<string, typeof Flame> = {
  "Kick Boxing": Target,
  "Boxe Anglaise": Flame,
  Boxing: Flame,
  "Boxe Thaï": Award,
  Striking: Dumbbell,
  "Boxing Shred": Sparkles,
  "Lady Striking": Heart,
  "Boxing Bag": Dumbbell,
};

const DISCIPLINE_DESCRIPTIONS: Record<string, string> = {
  "Kick Boxing": "Pieds-poings, cardio et précision technique",
  "Boxe Anglaise": "Frappe aux poings, esquives et combinaisons",
  Boxing: "Fondamentaux de frappe, rythme et explosivité",
  "Boxe Thaï": "Muay Thaï complet, corps-à-corps et percussions",
  Striking: "Percussions martiales hybrides et puissance",
  "Boxing Shred": "Conditioning martiale haute intensité & renforcement",
  "Lady Striking": "Cours 100% féminin, technique et cardio-boxing",
  "Boxing Bag": "Travail intensif aux sacs de frappe et endurance",
};

const VENUE_NAME = "Marseille Fight Club";
const VENUE_ADDRESS = "268 avenue de la Capelette, 13010 Marseille";

export default function TrialBookingModal({
  isOpen,
  onClose,
  preselectedDiscipline,
  preselectedType,
}: TrialBookingModalProps) {
  const supabase = useMemo(() => createClient(), []);

  // 1. État du parcours multi-étapes (1 à 6)
  const [step, setStep] = useState<Step>(1);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [sessions, setSessions] = useState<TrialSessionOption[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  // 2. Données sélectionnées par le prospect
  const [selectedType, setSelectedType] = useState<"small_group" | "collective" | null>(
    preselectedType || null
  );
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>(
    preselectedDiscipline || ""
  );
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [consentContact, setConsentContact] = useState(true);
  const [honeypot, setHoneypot] = useState("");

  // 3. État de soumission et erreurs
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmedBookingData, setConfirmedBookingData] = useState<{
    discipline: string;
    type: "small_group" | "collective";
    date: string;
    time: string;
  } | null>(null);

  // Chargement des créneaux réels dès l'ouverture de la modale
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedType(null);
      setSelectedDiscipline("");
      setSelectedSessionId("");
      setSubmitError(null);
      setLoadingSessions(true);
      setLoadError(null);

      getAvailableTrialSessions(supabase)
        .then((data) => {
          setSessions(data);
        })
        .catch((err) => {
          console.error("Erreur chargement créneaux d'essai :", err);
          setLoadError("Impossible de charger le planning en direct. Veuillez réessayer.");
        })
        .finally(() => {
          setLoadingSessions(false);
        });
    }
  }, [isOpen, supabase]);

  // Fermeture sur touche Échap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  // Nombre de créneaux disponibles par type de cours
  const availableCountsByType = useMemo(() => {
    let smallGroupCount = 0;
    let collectiveCount = 0;

    for (const s of sessions) {
      if (s.isAvailable) {
        if (s.type === "small_group") smallGroupCount++;
        else if (s.type === "collective") collectiveCount++;
      }
    }

    return {
      small_group: smallGroupCount,
      collective: collectiveCount,
    };
  }, [sessions]);

  // Liste des disciplines disponibles pour le format sélectionné (Étape 2)
  const availableDisciplinesForType = useMemo(() => {
    if (!selectedType) return [];

    const map = new Map<string, { name: string; count: number }>();

    for (const s of sessions) {
      if (s.type === selectedType && s.isAvailable) {
        const existing = map.get(s.discipline);
        if (existing) {
          existing.count += 1;
        } else {
          map.set(s.discipline, { name: s.discipline, count: 1 });
        }
      }
    }

    if (map.size === 0) {
      const fallbackList =
        selectedType === "collective"
          ? ["Kick Boxing", "Boxe Anglaise", "Boxe Thaï"]
          : [
              "Boxing Bag",
              "Boxing",
              "Boxing Shred",
              "Lady Striking",
              "Kick Boxing",
              "Boxe Anglaise",
              "Boxe Thaï",
            ];

      return fallbackList.map((d) => ({
        name: d,
        count: 0,
        desc: DISCIPLINE_DESCRIPTIONS[d] || "Discipline de combat et perfectionnement",
      }));
    }

    return Array.from(map.values()).map((item) => ({
      name: item.name,
      count: item.count,
      desc: DISCIPLINE_DESCRIPTIONS[item.name] || "Discipline encadrée par le coach",
    }));
  }, [sessions, selectedType]);

  // Créneaux filtrés par type ET par discipline (Étape 3)
  const filteredSessions = useMemo(() => {
    if (!selectedType || !selectedDiscipline) return [];
    return sessions.filter(
      (s) =>
        s.type === selectedType &&
        s.discipline.toLowerCase() === selectedDiscipline.toLowerCase() &&
        s.isAvailable
    );
  }, [sessions, selectedType, selectedDiscipline]);

  // Séance sélectionnée
  const selectedSession = useMemo(() => {
    return sessions.find((s) => s.id === selectedSessionId) || null;
  }, [sessions, selectedSessionId]);

  // ───────────────────────────────────────────────────────────────────────────
  // Gestionnaires de navigation du parcours
  // ───────────────────────────────────────────────────────────────────────────

  // Étape 1 ➔ Étape 2 : Choix du format
  const handleSelectType = (type: "small_group" | "collective") => {
    setSelectedType(type);
    setSelectedDiscipline("");
    setSelectedSessionId("");
    setSubmitError(null);
    setStep(2);
  };

  // Étape 2 ➔ Étape 3 : Choix de la discipline
  const handleSelectDiscipline = (disc: string) => {
    setSelectedDiscipline(disc);
    setSelectedSessionId("");
    setSubmitError(null);
    setStep(3);
  };

  // Étape 3 ➔ Étape 4 : Choix du créneau
  const handleSelectSession = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setSubmitError(null);
    setStep(4);
  };

  // Étape 4 ➔ Étape 5 : Coordonnées ➔ Récapitulatif
  const handleGoToStep5 = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!firstName.trim() || !lastName.trim()) {
      setSubmitError("Veuillez renseigner votre nom et prénom.");
      return;
    }

    if (!email.trim() || !email.includes("@") || !email.includes(".")) {
      setSubmitError("Veuillez renseigner une adresse email valide.");
      return;
    }

    const cleanPhone = phone.replace(/[^0-9+]/g, "");
    if (cleanPhone.length < 8) {
      setSubmitError("Veuillez renseigner un numéro de téléphone valide.");
      return;
    }

    if (!consentContact) {
      setSubmitError("Veuillez accepter d'être contacté pour votre cours d'essai.");
      return;
    }

    setStep(5);
  };

  // Étape 5 ➔ Étape 6 : Confirmation finale et soumission serveur
  const handleConfirmBooking = async () => {
    if (!selectedSessionId || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/trial-bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classSessionId: selectedSessionId,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          consentContact: true,
          honeypot,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        const errorMap: Record<string, string> = {
          SPAM_DETECTED: "Requête invalide.",
          INVALID_SESSION: "Veuillez sélectionner un créneau valide.",
          INVALID_NAME: "Veuillez renseigner votre nom et prénom.",
          INVALID_EMAIL: "Veuillez renseigner une adresse email valide.",
          INVALID_PHONE: "Veuillez renseigner un numéro de téléphone valide.",
          CONSENT_REQUIRED: "Veuillez accepter les conditions pour être contacté.",
          SESSION_NOT_FOUND: "Ce créneau n'est plus disponible. Veuillez en choisir un autre.",
          SESSION_INACTIVE: "Cette séance a été désactivée.",
          SESSION_ALREADY_FINISHED: "Cette séance est déjà terminée.",
          SESSION_ALREADY_STARTED: "Cette séance a déjà débuté.",
          PRIVATE_SESSION_NOT_ALLOWED: "Les cours privés ne sont pas éligibles aux cours d'essai.",
          INVALID_SESSION_TYPE: "Ce type de séance n'est pas éligible aux cours d'essai.",
          ALREADY_BOOKED_THIS_SESSION: "Tu as déjà réservé un cours d'essai pour ce créneau !",
          ACTIVE_TRIAL_ALREADY_EXISTS:
            "Tu as déjà un cours d'essai actif à venir. Contacte le club pour modifier ton créneau.",
          SESSION_FULL: "Désolé, ce cours est désormais complet. Choisis un autre créneau disponible.",
        };

        const msg =
          errorMap[data.error] ||
          data.message ||
          "Une erreur est survenue lors de la réservation. Veuillez réessayer.";

        setSubmitError(msg);
        setIsSubmitting(false);
        return;
      }

      // Succès : Passage à l'étape 6 (Confirmation)
      setConfirmedBookingData({
        discipline: data.discipline || selectedSession?.discipline || "Cours d'essai",
        type: selectedType || "small_group",
        date: data.date || selectedSession?.dateFormatted || "",
        time: data.time || selectedSession?.timeFormatted || "",
      });

      setStep(6);
    } catch (err) {
      console.error("[TrialBookingModal] Erreur soumission :", err);
      setSubmitError("Une erreur de communication est survenue. Veuillez vérifier votre connexion.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto font-sans">
        {/* Backdrop sombre flouté */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => !isSubmitting && onClose()}
          className="fixed inset-0 bg-[#020817]/90 backdrop-blur-md"
        />

        {/* Conteneur principal de la modale — Design Striking Camp 100% natif */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative w-full max-w-2xl bg-[#080e1a] border border-brand-blue/30 rounded-3xl shadow-2xl shadow-brand-blue/10 overflow-hidden my-auto z-10 max-h-[92vh] flex flex-col"
        >
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
              EN-TÊTE DE LA MODALE
              ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          <div className="relative p-5 sm:p-6 border-b border-brand-white/10 bg-gradient-to-b from-[#0c1626] to-transparent shrink-0">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                {step > 1 && step < 6 && (
                  <button
                    onClick={() => {
                      setSubmitError(null);
                      setStep((prev) => (prev - 1) as Step);
                    }}
                    disabled={isSubmitting}
                    className="p-1.5 rounded-full bg-brand-white/5 hover:bg-brand-white/10 text-brand-white/70 hover:text-brand-white transition-colors cursor-pointer mr-1"
                    title="Étape précédente"
                  >
                    <ChevronLeft size={18} />
                  </button>
                )}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-blue/15 border border-brand-blue/30 text-brand-blue text-[11px] font-heading font-black uppercase tracking-wider">
                  <Sparkles size={12} />
                  Cours d&apos;Essai Gratuit
                </div>
              </div>

              <button
                onClick={() => !isSubmitting && onClose()}
                disabled={isSubmitting}
                className="p-2 rounded-full bg-brand-white/5 hover:bg-brand-white/10 text-brand-white/60 hover:text-brand-white transition-colors cursor-pointer"
                title="Fermer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-3">
              <h2 className="text-xl sm:text-2xl font-heading font-black uppercase tracking-wider text-brand-white">
                {step === 1 && "Choisis ton format d'entraînement"}
                {step === 2 && "Choisis ta discipline"}
                {step === 3 && "Sélectionne ton créneau"}
                {step === 4 && "Tes coordonnées"}
                {step === 5 && "Vérification & Confirmation"}
                {step === 6 && "Séance confirmée !"}
              </h2>
              <p className="text-xs sm:text-sm text-brand-white/60 mt-0.5">
                {step === 1 && "Sélectionne le format de cours qui correspond à tes objectifs."}
                {step === 2 && `Créneaux disponibles pour le format ${selectedType === "collective" ? "Cours Collectif" : "Small Group"}.`}
                {step === 3 && "Séances disponibles en temps réel au club de Marseille."}
                {step === 4 && "Indique où t'envoyer ta confirmation et tes accès."}
                {step === 5 && "Vérifie les informations avant de valider ta séance."}
                {step === 6 && "Nous avons hâte de t'accueillir sur le ring !"}
              </p>
            </div>

            {/* Barre de progression des 6 étapes en Cyan Striking Camp */}
            {step < 6 && (
              <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-brand-white/5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-1.5 flex-1 rounded-full transition-all duration-300",
                      step === i
                        ? "bg-brand-blue shadow-[0_0_8px_rgba(47,174,224,0.6)]"
                        : step > i
                        ? "bg-brand-blue/60"
                        : "bg-brand-white/10"
                    )}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
              CORPS DU CONTENU
              ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
            {/* État de chargement initial */}
            {loadingSessions && (
              <div className="py-16 text-center space-y-3">
                <Loader2 size={32} className="mx-auto text-brand-blue animate-spin" />
                <p className="text-sm font-heading font-bold uppercase tracking-wider text-brand-white/70">
                  Chargement des disponibilités en direct...
                </p>
              </div>
            )}

            {/* Erreur de chargement */}
            {loadError && !loadingSessions && (
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs space-y-3 text-center">
                <AlertCircle size={24} className="mx-auto text-red-400" />
                <p>{loadError}</p>
                <button
                  onClick={() => {
                    setLoadError(null);
                    setLoadingSessions(true);
                    getAvailableTrialSessions(supabase)
                      .then((data) => setSessions(data))
                      .catch(() => setLoadError("Erreur lors de la tentative de reconnexion."))
                      .finally(() => setLoadingSessions(false));
                  }}
                  className="px-4 py-2 rounded-xl bg-brand-white/10 hover:bg-brand-white/20 text-brand-white font-heading font-bold text-xs uppercase cursor-pointer"
                >
                  Réessayer
                </button>
              </div>
            )}

            {/* ─────────────────────────────────────────────────────────────────
                ÉTAPE 1 : CHOIX DU TYPE DE COURS (Small Group vs Collectif)
                ───────────────────────────────────────────────────────────────── */}
            {!loadingSessions && !loadError && step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Format A : SMALL GROUP */}
                  <button
                    type="button"
                    onClick={() => handleSelectType("small_group")}
                    className={cn(
                      "group p-6 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between relative overflow-hidden",
                      selectedType === "small_group"
                        ? "bg-[#0c1626] border-2 border-brand-blue shadow-[0_0_30px_rgba(47,174,224,0.18)]"
                        : "bg-[#0c1626] border-brand-white/10 hover:border-brand-blue/50 hover:bg-[#101e35]"
                    )}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="w-12 h-12 rounded-xl bg-brand-blue/15 border border-brand-blue/30 text-brand-blue flex items-center justify-center group-hover:scale-105 transition-transform">
                          <Users size={24} />
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-brand-white/5 border border-brand-white/10 text-[10px] font-heading font-bold uppercase text-brand-white/70">
                          {availableCountsByType.small_group} créneau{availableCountsByType.small_group > 1 ? "x" : ""}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-lg font-heading font-black uppercase text-brand-white tracking-wider group-hover:text-brand-blue transition-colors">
                          Small Group
                        </h3>
                        <p className="text-xs text-brand-white/50 font-medium mt-0.5">
                          Séance en petit groupe • 20 pers. max
                        </p>
                      </div>

                      <p className="text-xs text-brand-white/70 leading-relaxed">
                        Encadrement rapproché par le coach, perfectionnement technique, suivi individualisé et haute intensité.
                      </p>
                    </div>

                    <div className="pt-4 mt-4 border-t border-brand-white/5 flex items-center justify-between text-xs font-heading font-bold uppercase text-brand-blue">
                      <span>Choisir ce format</span>
                      <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>

                  {/* Format B : COURS COLLECTIF */}
                  <button
                    type="button"
                    onClick={() => handleSelectType("collective")}
                    className={cn(
                      "group p-6 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between relative overflow-hidden",
                      selectedType === "collective"
                        ? "bg-[#0c1626] border-2 border-brand-blue shadow-[0_0_30px_rgba(47,174,224,0.18)]"
                        : "bg-[#0c1626] border-brand-white/10 hover:border-brand-blue/50 hover:bg-[#101e35]"
                    )}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="w-12 h-12 rounded-xl bg-brand-blue/15 border border-brand-blue/30 text-brand-blue flex items-center justify-center group-hover:scale-105 transition-transform">
                          <Flame size={24} />
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-brand-white/5 border border-brand-white/10 text-[10px] font-heading font-bold uppercase text-brand-white/70">
                          {availableCountsByType.collective} créneau{availableCountsByType.collective > 1 ? "x" : ""}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-lg font-heading font-black uppercase text-brand-white tracking-wider group-hover:text-brand-blue transition-colors">
                          Cours Collectif
                        </h3>
                        <p className="text-xs text-brand-white/50 font-medium mt-0.5">
                          Séance collective
                        </p>
                      </div>

                      <p className="text-xs text-brand-white/70 leading-relaxed">
                        Dynamique d&apos;équipe stimulante, travail cardio-boxing explosif, puissance et dépassement de soi.
                      </p>
                    </div>

                    <div className="pt-4 mt-4 border-t border-brand-white/5 flex items-center justify-between text-xs font-heading font-bold uppercase text-brand-blue">
                      <span>Choisir ce format</span>
                      <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                </div>

                {/* Note d'exclusion claire des cours privés */}
                <div className="p-3.5 rounded-xl bg-brand-white/5 border border-brand-white/10 flex items-center gap-2.5 text-[11px] text-brand-white/50">
                  <Shield size={14} className="shrink-0 text-brand-blue" />
                  <span>
                    Les cours d&apos;essai gratuits sont proposés exclusivement sur nos formats collectifs et Small Group.
                  </span>
                </div>
              </div>
            )}

            {/* ─────────────────────────────────────────────────────────────────
                ÉTAPE 2 : CHOIX DE LA DISCIPLINE
                ───────────────────────────────────────────────────────────────── */}
            {!loadingSessions && !loadError && step === 2 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-brand-white/5 pb-2">
                  <span className="text-xs font-bold uppercase text-brand-white/60">
                    Format sélectionné :{" "}
                    <strong className="text-brand-blue">
                      {selectedType === "collective" ? "Cours Collectif" : "Small Group"}
                    </strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-[11px] font-bold text-brand-blue hover:underline cursor-pointer"
                  >
                    Changer de format
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {availableDisciplinesForType.map((d) => {
                    const IconComponent = DISCIPLINE_ICONS[d.name] || Flame;
                    const isSelected = selectedDiscipline === d.name;

                    return (
                      <button
                        key={d.name}
                        type="button"
                        onClick={() => handleSelectDiscipline(d.name)}
                        className={cn(
                          "group p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex items-center justify-between gap-3",
                          isSelected
                            ? "bg-[#0c1626] border-2 border-brand-blue shadow-lg shadow-brand-blue/15"
                            : "bg-[#0b1322] border-brand-white/10 hover:border-brand-blue/50 hover:bg-[#101e35]"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center border transition-colors",
                              isSelected
                                ? "bg-brand-blue text-brand-black border-brand-blue"
                                : "bg-brand-white/5 border-brand-white/10 text-brand-blue group-hover:bg-brand-blue/20"
                            )}
                          >
                            <IconComponent size={20} />
                          </div>
                          <div>
                            <span className="font-heading font-black text-sm uppercase text-brand-white tracking-wider block">
                              {d.name}
                            </span>
                            <span className="text-[11px] text-brand-white/50 block">
                              {d.desc}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-brand-white/40 group-hover:text-brand-white">
                          <span className="text-[10px] font-bold uppercase text-brand-blue">
                            {d.count > 0 ? `${d.count} créneau${d.count > 1 ? "s" : ""}` : "Sélectionner"}
                          </span>
                          <ChevronRight size={14} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ─────────────────────────────────────────────────────────────────
                ÉTAPE 3 : CHOIX DU CRÉNEAU DISPONIBLE
                ───────────────────────────────────────────────────────────────── */}
            {!loadingSessions && !loadError && step === 3 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-brand-white/5 pb-2">
                  <span className="text-xs font-bold uppercase text-brand-white/60">
                    Discipline : <strong className="text-brand-blue">{selectedDiscipline}</strong> ({selectedType === "collective" ? "Collectif" : "Small Group"})
                  </span>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="text-[11px] font-bold text-brand-blue hover:underline cursor-pointer"
                  >
                    Changer de discipline
                  </button>
                </div>

                {filteredSessions.length === 0 ? (
                  <div className="py-12 text-center bg-[#0c1626] border border-brand-white/10 rounded-2xl p-6 space-y-3">
                    <Calendar size={32} className="mx-auto text-brand-white/30" />
                    <p className="text-sm font-heading font-bold uppercase text-brand-white/80">
                      Aucun créneau immédiat disponible pour cette discipline
                    </p>
                    <p className="text-xs text-brand-white/50 max-w-sm mx-auto">
                      Les créneaux de cette semaine sont complets. Choisis une autre discipline ou reviens très prochainement.
                    </p>
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="px-4 py-2 rounded-xl bg-brand-blue text-brand-black font-heading font-black text-xs uppercase tracking-wider cursor-pointer shadow-md shadow-brand-blue/20"
                    >
                      Voir les autres disciplines
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                    {filteredSessions.map((s) => {
                      const isSelected = selectedSessionId === s.id;

                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => handleSelectSession(s.id)}
                          className={cn(
                            "w-full p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group",
                            isSelected
                              ? "bg-[#0c1626] border-2 border-brand-blue shadow-lg shadow-brand-blue/15"
                              : "bg-[#0b1322] border-brand-white/10 hover:border-brand-blue/50 hover:bg-[#101e35]"
                          )}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-heading font-black text-sm uppercase text-brand-white tracking-wider">
                                {s.dayName} {s.dateFormatted.split(" ").slice(1).join(" ")}
                              </span>
                              {s.level && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-brand-white/5 text-brand-white/70 border border-brand-white/10">
                                  {s.level}
                                </span>
                              )}
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-brand-blue/15 text-brand-blue border border-brand-blue/30">
                                {s.type === "collective" ? "Collectif" : "Small Group"}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 text-xs text-brand-white/60">
                              <span className="flex items-center gap-1 font-semibold text-brand-blue">
                                <Clock size={13} />
                                {s.timeFormatted}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <MapPin size={13} />
                                {VENUE_NAME}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-brand-white/5">
                            {s.type === "small_group" && (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-heading font-bold uppercase bg-brand-blue/15 text-brand-blue border border-brand-blue/30">
                                {s.placesAvailable} place{s.placesAvailable > 1 ? "s" : ""} restante{s.placesAvailable > 1 ? "s" : ""}
                              </span>
                            )}

                            <div
                              className={cn(
                                "w-7 h-7 rounded-full border flex items-center justify-center transition-colors",
                                isSelected
                                  ? "bg-brand-blue text-brand-black border-brand-blue"
                                  : "bg-brand-white/5 border-brand-white/10 text-brand-white/40 group-hover:text-brand-white"
                              )}
                            >
                              <ChevronRight size={14} />
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ─────────────────────────────────────────────────────────────────
                ÉTAPE 4 : COORDONNÉES DU PROSPECT
                ───────────────────────────────────────────────────────────────── */}
            {!loadingSessions && !loadError && step === 4 && selectedSession && (
              <form onSubmit={handleGoToStep5} className="space-y-4">
                {/* Rappel du créneau choisi */}
                <div className="p-3.5 rounded-2xl bg-[#0c1626] border border-brand-blue/30 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-blue/15 border border-brand-blue/30 text-brand-blue flex items-center justify-center shrink-0">
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <span className="text-xs font-heading font-black uppercase text-brand-white block">
                        {selectedSession.discipline} ({selectedSession.type === "collective" ? "Collectif" : "Small Group"})
                      </span>
                      <span className="text-[11px] text-brand-white/60 block">
                        📅 {selectedSession.dateFormatted} à {selectedSession.timeFormatted}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="text-[11px] font-bold text-brand-blue hover:underline cursor-pointer shrink-0"
                  >
                    Modifier
                  </button>
                </div>

                {submitError && (
                  <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                    <AlertCircle size={14} className="shrink-0 text-red-400" />
                    <span>{submitError}</span>
                  </div>
                )}

                {/* Champs formulaire */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-heading font-bold uppercase tracking-wider text-brand-white/70 mb-1.5">
                      Prénom <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-white/40" />
                      <input
                        type="text"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Jean"
                        className="w-full bg-[#0b1322] border border-brand-white/10 rounded-xl py-2.5 pl-10 pr-3.5 text-sm text-brand-white placeholder:text-brand-white/30 focus:outline-none focus:border-brand-blue transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-heading font-bold uppercase tracking-wider text-brand-white/70 mb-1.5">
                      Nom <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-white/40" />
                      <input
                        type="text"
                        required
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Dupont"
                        className="w-full bg-[#0b1322] border border-brand-white/10 rounded-xl py-2.5 pl-10 pr-3.5 text-sm text-brand-white placeholder:text-brand-white/30 focus:outline-none focus:border-brand-blue transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-heading font-bold uppercase tracking-wider text-brand-white/70 mb-1.5">
                      Email <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-white/40" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="jean.dupont@email.com"
                        className="w-full bg-[#0b1322] border border-brand-white/10 rounded-xl py-2.5 pl-10 pr-3.5 text-sm text-brand-white placeholder:text-brand-white/30 focus:outline-none focus:border-brand-blue transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-heading font-bold uppercase tracking-wider text-brand-white/70 mb-1.5">
                      Téléphone <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-white/40" />
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="06 12 34 56 78"
                        className="w-full bg-[#0b1322] border border-brand-white/10 rounded-xl py-2.5 pl-10 pr-3.5 text-sm text-brand-white placeholder:text-brand-white/30 focus:outline-none focus:border-brand-blue transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* Honeypot invisible anti-robot */}
                <input
                  type="text"
                  name="user_organization_honey"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                  className="hidden"
                  aria-hidden="true"
                />

                {/* Consentement RGPD */}
                <div className="pt-2">
                  <label className="flex items-start gap-2.5 cursor-pointer text-xs text-brand-white/70">
                    <input
                      type="checkbox"
                      checked={consentContact}
                      onChange={(e) => setConsentContact(e.target.checked)}
                      className="mt-0.5 rounded border-brand-white/20 bg-[#0b1322] text-brand-blue focus:ring-0 cursor-pointer"
                    />
                    <span>
                      J&apos;accepte d&apos;être contacté par le Striking Camp par email ou téléphone concernant mon cours d&apos;essai gratuit.
                    </span>
                  </label>
                </div>

                {/* Bouton de progression vers le récapitulatif */}
                <div className="pt-3">
                  <button
                    type="submit"
                    className="w-full py-3.5 px-6 rounded-xl bg-brand-blue hover:bg-brand-white text-brand-black font-heading font-black text-sm uppercase tracking-wider shadow-lg shadow-brand-blue/20 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Continuer vers le récapitulatif</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </form>
            )}

            {/* ─────────────────────────────────────────────────────────────────
                ÉTAPE 5 : RÉCAPITULATIF COMPLET
                ───────────────────────────────────────────────────────────────── */}
            {!loadingSessions && !loadError && step === 5 && selectedSession && (
              <div className="space-y-4">
                {submitError && (
                  <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0 text-red-400" />
                    <span>{submitError}</span>
                  </div>
                )}

                {/* Carte Récapitulative Officielle */}
                <div className="bg-[#0c1626] border border-brand-blue/30 rounded-2xl p-5 sm:p-6 shadow-[0_0_30px_rgba(47,174,224,0.1)] space-y-4 relative overflow-hidden">
                  <div className="flex items-center justify-between border-b border-brand-white/10 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-brand-blue/15 border border-brand-blue/30 text-brand-blue font-heading font-black text-xs uppercase tracking-wider">
                        Cours d&apos;Essai Gratuit
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-brand-white/5 border border-brand-white/10 text-brand-white/80 font-heading font-black text-xs uppercase tracking-wider">
                        {selectedSession.type === "collective" ? "Cours Collectif" : "Small Group"}
                      </span>
                    </div>

                    <span className="text-xs font-bold text-brand-blue uppercase">
                      100% Offert
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-brand-white/40 block">
                        Discipline
                      </span>
                      <span className="text-base font-heading font-black uppercase text-brand-white block">
                        {selectedSession.discipline}
                      </span>
                      {selectedSession.level && (
                        <span className="text-xs text-brand-white/60">
                          Niveau : {selectedSession.level}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-brand-white/40 block">
                        Date & Horaire
                      </span>
                      <span className="text-sm font-bold text-brand-white block">
                        {selectedSession.dateFormatted}
                      </span>
                      <span className="text-xs font-semibold text-brand-blue block">
                        {selectedSession.timeFormatted}
                      </span>
                    </div>

                    <div className="space-y-1 sm:col-span-2 pt-2 border-t border-brand-white/5">
                      <span className="text-[10px] uppercase font-bold text-brand-white/40 block">
                        Lieu de la séance
                      </span>
                      <span className="text-xs text-brand-white/80 font-medium block">
                        {VENUE_NAME} — {VENUE_ADDRESS}
                      </span>
                    </div>

                    <div className="space-y-1 sm:col-span-2 pt-2 border-t border-brand-white/5">
                      <span className="text-[10px] uppercase font-bold text-brand-white/40 block">
                        Participant
                      </span>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-brand-white/80">
                        <span className="font-bold text-brand-white">
                          {firstName} {lastName}
                        </span>
                        <span>{phone}</span>
                        <span>{email}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bouton de confirmation finale */}
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(4)}
                    disabled={isSubmitting}
                    className="w-full sm:w-auto px-5 py-3 rounded-xl bg-brand-white/5 hover:bg-brand-white/10 text-brand-white/70 hover:text-brand-white font-heading font-bold text-xs uppercase transition-colors cursor-pointer text-center"
                  >
                    Modifier mes infos
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmBooking}
                    disabled={isSubmitting}
                    className="flex-1 w-full py-3.5 px-6 rounded-xl bg-brand-blue hover:bg-brand-white text-brand-black font-heading font-black text-sm uppercase tracking-wider shadow-lg shadow-brand-blue/25 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin text-brand-black" />
                        <span>Confirmation en cours...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={18} className="text-brand-black" />
                        <span>Confirmer mon cours d&apos;essai gratuit</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* ─────────────────────────────────────────────────────────────────
                ÉTAPE 6 : CONFIRMATION & SUCCÈS
                ───────────────────────────────────────────────────────────────── */}
            {step === 6 && confirmedBookingData && (
              <div className="py-6 text-center space-y-5">
                <div className="w-16 h-16 rounded-full bg-brand-blue/20 border border-brand-blue/40 text-brand-blue flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(47,174,224,0.2)]">
                  <Check size={32} />
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-2xl sm:text-3xl font-heading font-black uppercase tracking-wider text-brand-white">
                    Ton cours d&apos;essai est réservé !
                  </h3>
                  <p className="text-sm text-brand-white/70 max-w-md mx-auto">
                    Nous avons bien bloqué ta place pour ta séance découverte au Striking Camp.
                  </p>
                </div>

                <div className="bg-[#0c1626] border border-brand-blue/30 rounded-2xl p-5 text-left max-w-lg mx-auto space-y-3 shadow-[0_0_20px_rgba(47,174,224,0.1)]">
                  <div className="flex items-center justify-between border-b border-brand-white/10 pb-2.5">
                    <span className="font-heading font-black uppercase text-brand-white text-sm">
                      {confirmedBookingData.discipline}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-brand-blue/15 text-brand-blue border border-brand-blue/30 text-[10px] font-heading font-bold uppercase">
                      {confirmedBookingData.type === "collective" ? "Cours Collectif" : "Small Group"}
                    </span>
                  </div>

                  <div className="text-xs space-y-1 text-brand-white/70">
                    <p>📅 <strong>Date :</strong> {confirmedBookingData.date}</p>
                    <p>⏰ <strong>Horaire :</strong> {confirmedBookingData.time}</p>
                    <p>📍 <strong>Lieu :</strong> {VENUE_NAME} — {VENUE_ADDRESS}</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-brand-blue/10 border border-brand-blue/20 text-xs text-brand-white/80 max-w-lg mx-auto text-left space-y-1.5">
                  <p className="font-bold text-brand-blue flex items-center gap-1.5">
                    <Mail size={14} />
                    Un email de confirmation vient de t&apos;être envoyé à {email}.
                  </p>
                  <p className="text-[11px] text-brand-white/60">
                    Pense à vérifier tes courriers indésirables (spams) si tu ne le vois pas dans ta boîte de réception.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-8 py-3 rounded-xl bg-brand-blue hover:bg-brand-white text-brand-black font-heading font-black text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-lg shadow-brand-blue/20"
                  >
                    Fermer la fenêtre
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
