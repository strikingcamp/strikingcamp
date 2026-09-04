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
}

type Step = 1 | 2 | 3 | 4 | 5;

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
}: TrialBookingModalProps) {
  const supabase = useMemo(() => createClient(), []);

  // 1. État du parcours multi-étapes
  const [step, setStep] = useState<Step>(1);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [sessions, setSessions] = useState<TrialSessionOption[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  // 2. Données sélectionnées par le prospect
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>(preselectedDiscipline || "");
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
    date: string;
    time: string;
  } | null>(null);

  // Chargement des créneaux réels dès l'ouverture de la modale
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSubmitError(null);
      setLoadingSessions(true);
      setLoadError(null);

      getAvailableTrialSessions(supabase)
        .then((data) => {
          setSessions(data);
          if (preselectedDiscipline) {
            setSelectedDiscipline(preselectedDiscipline);
          }
        })
        .catch((err) => {
          console.error("Erreur chargement créneaux d'essai :", err);
          setLoadError("Impossible de charger le planning en direct. Veuillez réessayer.");
        })
        .finally(() => {
          setLoadingSessions(false);
        });
    }
  }, [isOpen, preselectedDiscipline, supabase]);

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

  // Liste des disciplines uniques disponibles déduites des séances réelles
  const availableDisciplines = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>();

    for (const s of sessions) {
      if (s.isAvailable) {
        const existing = map.get(s.discipline);
        if (existing) {
          existing.count += 1;
        } else {
          map.set(s.discipline, { name: s.discipline, count: 1 });
        }
      }
    }

    // Si aucune séance n'est chargée ou si la BDD est en cours, fournir les disciplines officielles de repli
    if (map.size === 0) {
      const fallbackList = [
        "Kick Boxing",
        "Boxe Anglaise",
        "Boxe Thaï",
        "Striking",
        "Boxing Shred",
        "Lady Striking",
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
  }, [sessions]);

  // Créneaux filtrés pour la discipline choisie
  const filteredSessions = useMemo(() => {
    if (!selectedDiscipline) return [];
    return sessions.filter(
      (s) =>
        s.discipline.toLowerCase() === selectedDiscipline.toLowerCase() &&
        s.isAvailable
    );
  }, [sessions, selectedDiscipline]);

  // Séance sélectionnée
  const selectedSession = useMemo(() => {
    return sessions.find((s) => s.id === selectedSessionId) || null;
  }, [sessions, selectedSessionId]);

  // Gestion des étapes
  const handleSelectDiscipline = (disc: string) => {
    setSelectedDiscipline(disc);
    setSelectedSessionId("");
    setStep(2);
  };

  const handleSelectSession = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setStep(3);
  };

  const handleGoToStep4 = (e: React.FormEvent) => {
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

    setStep(4);
  };

  // Soumission finale de la réservation
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
        setSubmitError(
          data.message ||
            "Une erreur est survenue lors de la réservation. Veuillez réessayer."
        );
        setIsSubmitting(false);
        return;
      }

      // Succès : Passage à l'écran de confirmation
      setConfirmedBookingData({
        discipline: data.discipline || selectedSession?.discipline || "Cours d'essai",
        date: data.date || selectedSession?.dateFormatted || "Date confirmée",
        time: data.time || selectedSession?.timeFormatted || "Horaire confirmé",
      });
      setStep(5);
    } catch (err) {
      console.error("Erreur soumission cours d'essai :", err);
      setSubmitError(
        "Erreur réseau lors de la communication avec le serveur. Veuillez vérifier votre connexion."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop Flouté */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => !isSubmitting && onClose()}
        className="fixed inset-0 bg-[#020817]/85 backdrop-blur-md transition-opacity"
      />

      {/* Conteneur de la Modale */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="relative w-full max-w-xl bg-[#0c1322] border border-brand-white/10 rounded-2xl sm:rounded-3xl shadow-[0_0_60px_rgba(47,174,224,0.15)] overflow-hidden z-10 my-auto"
      >
        {/* En-tête de la Modale */}
        <div className="relative px-5 sm:px-6 pt-5 sm:pt-6 pb-4 border-b border-brand-white/10 flex items-center justify-between bg-gradient-to-b from-[#101b30] to-[#0c1322]">
          <div className="flex items-center gap-2.5">
            {step > 1 && step < 5 && (
              <button
                type="button"
                onClick={() => setStep((prev) => Math.max(1, prev - 1) as Step)}
                disabled={isSubmitting}
                className="p-1.5 -ml-1 text-brand-white/60 hover:text-brand-white hover:bg-brand-white/10 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                title="Étape précédente"
              >
                <ChevronLeft size={18} />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-heading font-black tracking-widest uppercase text-brand-blue flex items-center gap-1">
                  <Sparkles size={12} />
                  COURS D’ESSAI GRATUIT
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-heading font-black uppercase text-brand-white tracking-wide">
                {step === 1 && "Choisis ta discipline"}
                {step === 2 && "Choisis ton créneau"}
                {step === 3 && "Tes coordonnées"}
                {step === 4 && "Récapitulatif de ta séance"}
                {step === 5 && "Réservation confirmée !"}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 text-brand-white/50 hover:text-brand-white hover:bg-brand-white/10 rounded-full transition-colors cursor-pointer disabled:opacity-40"
            title="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Indicateur de Progression (Étapes 1 à 4) */}
        {step < 5 && (
          <div className="px-5 sm:px-6 pt-3 pb-1 bg-[#090e1a]">
            <div className="flex items-center justify-between gap-1.5">
              {[
                { num: 1, label: "Discipline" },
                { num: 2, label: "Créneau" },
                { num: 3, label: "Infos" },
                { num: 4, label: "Confirmation" },
              ].map((s) => {
                const isActive = step === s.num;
                const isPassed = step > s.num;
                return (
                  <div key={s.num} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className={cn(
                        "h-1.5 w-full rounded-full transition-all duration-300",
                        isActive
                          ? "bg-brand-blue shadow-[0_0_8px_rgba(47,174,224,0.8)]"
                          : isPassed
                          ? "bg-brand-blue/50"
                          : "bg-brand-white/10"
                      )}
                    />
                    <span
                      className={cn(
                        "text-[10px] font-semibold uppercase tracking-wider hidden sm:block",
                        isActive
                          ? "text-brand-blue font-bold"
                          : isPassed
                          ? "text-brand-white/70"
                          : "text-brand-white/30"
                      )}
                    >
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Corps de la Modale */}
        <div className="p-5 sm:p-6 max-h-[72vh] overflow-y-auto custom-scrollbar">
          {/* ÉTAPE 1 : CHOIX DE LA DISCIPLINE */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-xs sm:text-sm text-brand-white/70 leading-relaxed">
                Sélectionne la discipline que tu souhaites découvrir lors de ton premier cours d&apos;essai gratuit :
              </p>

              {loadingSessions ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-brand-white/60">
                  <Loader2 size={28} className="animate-spin text-brand-blue" />
                  <span className="text-xs uppercase tracking-wider font-semibold">
                    Chargement des disciplines disponibles...
                  </span>
                </div>
              ) : loadError ? (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>{loadError}</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                  {availableDisciplines.map((disc) => {
                    const IconComponent = DISCIPLINE_ICONS[disc.name] || Target;
                    const isSelected = selectedDiscipline === disc.name;

                    return (
                      <button
                        key={disc.name}
                        type="button"
                        onClick={() => handleSelectDiscipline(disc.name)}
                        className={cn(
                          "p-4 rounded-xl text-left border transition-all duration-200 cursor-pointer group flex flex-col justify-between gap-3 relative overflow-hidden",
                          isSelected
                            ? "bg-brand-blue/15 border-brand-blue shadow-[0_0_15px_rgba(47,174,224,0.2)]"
                            : "bg-[#090e1a] border-brand-white/10 hover:border-brand-blue/40 hover:bg-[#0f172a]"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="w-9 h-9 rounded-lg bg-brand-blue/10 border border-brand-blue/20 text-brand-blue flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                            <IconComponent size={18} />
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-white/5 border border-brand-white/10 text-brand-white/60 font-semibold uppercase">
                            {disc.count > 0 ? `${disc.count} créneau${disc.count > 1 ? "x" : ""}` : "Planning officiel"}
                          </span>
                        </div>

                        <div>
                          <h3 className="text-sm font-heading font-black uppercase text-brand-white tracking-wide group-hover:text-brand-blue transition-colors">
                            {disc.name}
                          </h3>
                          <p className="text-[11px] text-brand-white/50 line-clamp-2 mt-0.5">
                            {disc.desc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ÉTAPE 2 : CHOIX DU CRÉNEAU */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-brand-white/10">
                <div>
                  <span className="text-[11px] text-brand-white/50 uppercase font-semibold">
                    Discipline choisie
                  </span>
                  <div className="text-sm font-heading font-black text-brand-blue uppercase">
                    {selectedDiscipline}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs text-brand-white/60 hover:text-brand-white underline cursor-pointer"
                >
                  Changer
                </button>
              </div>

              <p className="text-xs text-brand-white/70">
                Choisis la séance qui te convient le mieux parmi les prochains créneaux disponibles :
              </p>

              {filteredSessions.length === 0 ? (
                <div className="py-8 text-center p-6 bg-[#090e1a] rounded-xl border border-brand-white/10 space-y-2">
                  <Clock size={24} className="mx-auto text-brand-white/40" />
                  <h4 className="text-xs font-heading font-bold uppercase text-brand-white">
                    Aucun créneau immédiat disponible
                  </h4>
                  <p className="text-[11px] text-brand-white/50 max-w-xs mx-auto">
                    Tous les créneaux pour cette discipline sont actuellement complets. N&apos;hésite pas à choisir une autre discipline ou à contacter le club.
                  </p>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="mt-3 px-4 py-2 bg-brand-blue/15 text-brand-blue text-xs font-heading font-bold uppercase rounded-lg border border-brand-blue/30 hover:bg-brand-blue/25 transition-colors cursor-pointer"
                  >
                    Voir les autres disciplines
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredSessions.map((sess) => {
                    const isSelected = selectedSessionId === sess.id;

                    return (
                      <button
                        key={sess.id}
                        type="button"
                        onClick={() => handleSelectSession(sess.id)}
                        className={cn(
                          "w-full p-3.5 sm:p-4 rounded-xl text-left border transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 group",
                          isSelected
                            ? "bg-brand-blue/15 border-brand-blue shadow-[0_0_15px_rgba(47,174,224,0.2)]"
                            : "bg-[#090e1a] border-brand-white/10 hover:border-brand-blue/40 hover:bg-[#0f172a]"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-brand-blue/10 border border-brand-blue/20 text-brand-blue flex items-center justify-center shrink-0">
                            <Calendar size={18} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-heading font-black text-brand-white uppercase">
                                {sess.dateFormatted}
                              </span>
                              {sess.level && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-brand-white/10 text-brand-white/70 font-semibold uppercase">
                                  {sess.level}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-brand-blue font-bold tracking-wider block mt-0.5">
                              {sess.timeFormatted}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold uppercase tracking-wider hidden sm:inline-block">
                            {sess.placesAvailable} place{sess.placesAvailable > 1 ? "s" : ""} dispo
                          </span>
                          <div className="w-6 h-6 rounded-full bg-brand-white/5 border border-brand-white/10 flex items-center justify-center group-hover:bg-brand-blue group-hover:text-brand-black transition-colors">
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

          {/* ÉTAPE 3 : COORDONNÉES DU PROSPECT */}
          {step === 3 && (
            <form onSubmit={handleGoToStep4} className="space-y-4">
              {/* Récapitulatif rapide de la séance choisie */}
              {selectedSession && (
                <div className="p-3 bg-brand-blue/10 border border-brand-blue/20 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-brand-blue" />
                    <span className="font-heading font-black uppercase text-brand-white">
                      {selectedSession.discipline}
                    </span>
                    <span className="text-brand-white/60">
                      • {selectedSession.dateFormatted} à {selectedSession.timeFormatted.split("–")[0].trim()}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="text-[11px] text-brand-blue hover:underline font-semibold cursor-pointer"
                  >
                    Modifier
                  </button>
                </div>
              )}

              {submitError && (
                <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2.5">
                  <AlertCircle size={16} className="shrink-0 text-red-400" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Champ invisible Honeypot anti-spam */}
              <input
                type="text"
                name="user_token_field"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                className="hidden pointer-events-none opacity-0 h-0 w-0"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-brand-white/80 flex items-center gap-1.5">
                    <User size={13} className="text-brand-blue" />
                    Prénom <span className="text-brand-blue">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Thomas"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#090e1a] border border-brand-white/10 rounded-xl text-brand-white text-sm focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-brand-white/80 flex items-center gap-1.5">
                    <User size={13} className="text-brand-blue" />
                    Nom <span className="text-brand-blue">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Dubois"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#090e1a] border border-brand-white/10 rounded-xl text-brand-white text-sm focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-brand-white/80 flex items-center gap-1.5">
                  <Phone size={13} className="text-brand-blue" />
                  Téléphone portable <span className="text-brand-blue">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="Ex: 06 12 34 56 78"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#090e1a] border border-brand-white/10 rounded-xl text-brand-white text-sm focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-colors"
                />
                <span className="text-[10px] text-brand-white/40 block">
                  Utilisé pour vous confirmer votre créneau et vous contacter en cas d&apos;imprévu.
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-brand-white/80 flex items-center gap-1.5">
                  <Mail size={13} className="text-brand-blue" />
                  Adresse email <span className="text-brand-blue">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="Ex: thomas.dubois@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#090e1a] border border-brand-white/10 rounded-xl text-brand-white text-sm focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-colors"
                />
                <span className="text-[10px] text-brand-white/40 block">
                  Votre récapitulatif officiel et le plan d&apos;accès vous seront envoyés par email.
                </span>
              </div>

              {/* Case de consentement obligatoire */}
              <label className="flex items-start gap-2.5 pt-2 cursor-pointer group">
                <input
                  type="checkbox"
                  required
                  checked={consentContact}
                  onChange={(e) => setConsentContact(e.target.checked)}
                  className="mt-0.5 rounded border-brand-white/20 bg-[#090e1a] text-brand-blue focus:ring-brand-blue focus:ring-offset-0 shrink-0"
                />
                <span className="text-xs text-brand-white/70 group-hover:text-brand-white transition-colors leading-relaxed">
                  J’accepte d’être contacté par l’équipe de Striking Camp concernant mon cours d’essai et les informations d&apos;entraînement.
                </span>
              </label>

              <div className="pt-3">
                <button
                  type="submit"
                  className="w-full py-3.5 px-6 bg-brand-blue hover:bg-brand-white text-brand-black font-heading font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-brand-blue/20 cursor-pointer flex items-center justify-center gap-2"
                >
                  Continuer vers le récapitulatif
                  <ChevronRight size={16} />
                </button>
              </div>
            </form>
          )}

          {/* ÉTAPE 4 : RÉCAPITULATIF & VALIDATION */}
          {step === 4 && (
            <div className="space-y-5">
              <p className="text-xs text-brand-white/70">
                Vérifie les informations de ta réservation avant de valider définitivement ton cours d&apos;essai :
              </p>

              {submitError && (
                <div className="p-4 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-start gap-2.5">
                  <AlertCircle size={16} className="shrink-0 text-red-400 mt-0.5" />
                  <div>
                    <span className="font-bold block mb-0.5">Impossible de confirmer la réservation</span>
                    <span>{submitError}</span>
                  </div>
                </div>
              )}

              {/* Fiche Récapitulative */}
              <div className="bg-[#090e1a] border border-brand-white/10 rounded-2xl p-4 sm:p-5 space-y-3.5">
                <div className="flex items-center justify-between border-b border-brand-white/10 pb-3">
                  <span className="text-xs font-semibold uppercase text-brand-white/50">
                    Formule
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-brand-blue/15 text-brand-blue border border-brand-blue/30 text-[10px] font-heading font-black uppercase tracking-wider">
                    COURS D’ESSAI GRATUIT
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-brand-white/40 block text-[10px] uppercase font-bold">
                      Discipline
                    </span>
                    <span className="text-brand-white font-heading font-black text-sm uppercase">
                      {selectedSession?.discipline || selectedDiscipline}
                    </span>
                  </div>

                  <div>
                    <span className="text-brand-white/40 block text-[10px] uppercase font-bold">
                      Date & Horaire
                    </span>
                    <span className="text-brand-white font-bold block">
                      {selectedSession?.dateFormatted}
                    </span>
                    <span className="text-brand-blue font-bold">
                      {selectedSession?.timeFormatted}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-brand-white/5 space-y-1">
                  <span className="text-brand-white/40 block text-[10px] uppercase font-bold flex items-center gap-1">
                    <MapPin size={11} className="text-brand-blue" />
                    Lieu d&apos;entraînement
                  </span>
                  <div className="text-xs font-bold text-brand-white">
                    {VENUE_NAME}
                  </div>
                  <div className="text-xs text-brand-white/70">
                    {VENUE_ADDRESS}
                  </div>
                </div>

                <div className="pt-2 border-t border-brand-white/5 space-y-1">
                  <span className="text-brand-white/40 block text-[10px] uppercase font-bold">
                    Participant
                  </span>
                  <div className="text-xs text-brand-white font-semibold">
                    {firstName} {lastName}
                  </div>
                  <div className="text-[11px] text-brand-white/60">
                    {phone} • {email}
                  </div>
                </div>
              </div>

              {/* Bouton de Confirmation Finale */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleConfirmBooking}
                  disabled={isSubmitting}
                  className="w-full py-4 px-6 bg-brand-blue hover:bg-brand-white text-brand-black font-heading font-black text-sm uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-brand-blue/25 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Vérification et confirmation en cours...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={18} />
                      <span>CONFIRMER MON COURS D’ESSAI</span>
                    </>
                  )}
                </button>

                <p className="text-[10px] text-center text-brand-white/40 leading-relaxed">
                  En confirmant, vous réservez 1 place officielle encadrée par le coach. Aucun paiement n&apos;est requis.
                </p>
              </div>
            </div>
          )}

          {/* ÉTAPE 5 : CONFIRMATION & INFOS PRATIQUES */}
          {step === 5 && (
            <div className="text-center py-4 space-y-6">
              {/* Badge Succès */}
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                <CheckCircle2 size={36} />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-2xl font-heading font-black uppercase text-brand-white tracking-wide">
                  C&apos;est confirmé !
                </h3>
                <p className="text-sm font-semibold text-brand-blue uppercase tracking-wider">
                  Ton cours d&apos;essai est réservé.
                </p>
              </div>

              {/* Récapitulatif de validation */}
              <div className="bg-[#090e1a] border border-brand-white/10 rounded-2xl p-4 text-left space-y-2.5 max-w-md mx-auto text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-brand-white/50 font-bold uppercase text-[10px]">Discipline</span>
                  <span className="font-heading font-black uppercase text-brand-white text-sm">
                    {confirmedBookingData?.discipline}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-brand-white/50 font-bold uppercase text-[10px]">Date & Heure</span>
                  <span className="font-bold text-brand-white">
                    {confirmedBookingData?.date} ({confirmedBookingData?.time})
                  </span>
                </div>
                <div className="flex items-start justify-between border-t border-brand-white/5 pt-2">
                  <span className="text-brand-white/50 font-bold uppercase text-[10px]">Adresse</span>
                  <span className="text-right text-brand-white/80 font-medium text-[11px] max-w-[200px]">
                    {VENUE_NAME}<br />
                    {VENUE_ADDRESS}
                  </span>
                </div>
              </div>

              {/* Conseils pratiques pour le participant */}
              <div className="bg-brand-blue/5 border border-brand-blue/20 rounded-2xl p-4 text-left max-w-md mx-auto space-y-2">
                <h4 className="text-xs font-heading font-black uppercase text-brand-blue flex items-center gap-1.5">
                  <Sparkles size={13} />
                  Conseils pratiques pour ta venue :
                </h4>
                <ul className="text-[11px] text-brand-white/70 space-y-1.5 pl-4 list-disc">
                  <li>Arriver <strong>10 minutes en avance</strong> pour rencontrer le coach et préparer ton équipement.</li>
                  <li>Tenue conseillée : T-shirt, short ou bas de sport souple.</li>
                  <li>Penser à prendre une <strong>bouteille d&apos;eau</strong> et une serviette.</li>
                  <li>Des gants de boxe peuvent t&apos;être prêtés pour cette première séance.</li>
                </ul>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full max-w-md py-3.5 px-6 bg-brand-white/10 hover:bg-brand-white/20 text-brand-white font-heading font-black text-xs uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
                >
                  Fermer la fenêtre
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
