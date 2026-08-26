"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  UserCheck,
  Calendar,
  Clock,
  CheckCircle2,
  Lock,
  AlertCircle,
  Loader2,
  ShieldAlert,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { useMember } from "../MemberContext";
import { cn } from "@/lib/utils";

const defaultMorningSlots = [
  "08:00 – 08:50",
  "09:00 – 09:50",
  "10:00 – 10:50",
];

const defaultAfternoonSlots = [
  "14:00 – 14:50",
  "15:00 – 15:50",
  "16:00 – 16:50",
];

const defaultDays = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

const disciplines = [
  "Kick Boxing",
  "Boxe Thaï / Muay Thaï",
  "Boxe Anglaise",
  "Préparation Physique & Striking",
];

export default function PrivateSessionModal() {
  const {
    isPrivateSessionOpen,
    closePrivateSession,
    hasPrivateAccess,
    privateQuota,
    privateSlots,
    bookPrivateSession,
    refreshMemberData,
  } = useMember();

  const [selectedDay, setSelectedDay] = useState("Lundi");
  const [selectedSlotTime, setSelectedSlotTime] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [selectedDiscipline, setSelectedDiscipline] = useState("Kick Boxing");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Available days dynamically discovered from Supabase slots or defaults
  const availableDays = useMemo(() => {
    if (privateSlots.length > 0) {
      const distinct = Array.from(new Set(privateSlots.map((s) => s.dayName)));
      if (distinct.length > 0) return distinct;
    }
    return defaultDays;
  }, [privateSlots]);

  // Group slots for the active selected day
  const { morningSlots, afternoonSlots } = useMemo(() => {
    if (privateSlots.length > 0) {
      const daySlots = privateSlots.filter(
        (s) => s.dayName.toLowerCase() === selectedDay.toLowerCase()
      );

      if (daySlots.length > 0) {
        const morning = daySlots
          .filter((s) => {
            const h = new Date(s.startsAt).getHours();
            return h < 12;
          })
          .map((s) => ({
            id: s.id,
            time: s.timeSlot,
            isReserved: s.isReserved,
          }));

        const afternoon = daySlots
          .filter((s) => {
            const h = new Date(s.startsAt).getHours();
            return h >= 12;
          })
          .map((s) => ({
            id: s.id,
            time: s.timeSlot,
            isReserved: s.isReserved,
          }));

        return { morningSlots: morning, afternoonSlots: afternoon };
      }
    }

    // Fallback if no Supabase slots yet
    return {
      morningSlots: defaultMorningSlots.map((time) => ({
        id: `mock-m-${time}`,
        time,
        isReserved: false,
      })),
      afternoonSlots: defaultAfternoonSlots.map((time) => ({
        id: `mock-a-${time}`,
        time,
        isReserved: false,
      })),
    };
  }, [privateSlots, selectedDay]);

  const isQuotaExhausted =
    privateQuota !== null &&
    privateQuota.hasPrivateAccess &&
    privateQuota.remainingQuota <= 0;

  const handleSelectSlot = (slot: { id: string; time: string; isReserved: boolean }) => {
    if (slot.isReserved) return;
    setSelectedSlotTime(slot.time);
    setSelectedSlotId(slot.id);
    setErrorMessage(null);
  };

  const handleConfirmReservation = async () => {
    if (!selectedSlotTime || !hasPrivateAccess || isQuotaExhausted) return;

    setIsLoading(true);
    setErrorMessage(null);

    // If we have a real slot ID from Supabase
    if (selectedSlotId && !selectedSlotId.startsWith("mock-")) {
      const result = await bookPrivateSession(selectedSlotId, selectedDiscipline);

      if (!result.success) {
        setErrorMessage(
          result.error || "Ce créneau vient d'être réservé par un autre membre."
        );
        setSelectedSlotTime(null);
        setSelectedSlotId(null);
        setIsLoading(false);
        await refreshMemberData();
        return;
      }
    }

    setIsLoading(false);
    setIsSuccess(true);
  };

  const handleClose = () => {
    setIsSuccess(false);
    setIsLoading(false);
    setSelectedSlotTime(null);
    setSelectedSlotId(null);
    setErrorMessage(null);
    closePrivateSession();
  };

  return (
    <AnimatePresence>
      {isPrivateSessionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/85 backdrop-blur-md"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-lg bg-[#0c1322] border border-brand-white/10 rounded-2xl p-5 sm:p-7 shadow-2xl z-10 max-h-[92vh] flex flex-col justify-between overflow-y-auto"
          >
            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-brand-white/50 hover:text-brand-white p-2 rounded-full hover:bg-brand-white/5 transition-colors"
              aria-label="Fermer"
            >
              <X size={18} />
            </button>

            {!isSuccess ? (
              <div className="space-y-5">
                {/* Header */}
                <div>
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-brand-blue/15 border border-brand-blue/30 rounded-full text-brand-blue text-xs font-semibold uppercase tracking-wider w-fit mb-3">
                    <UserCheck size={14} />
                    Coaching 1 to 1
                  </div>

                  <h3 className="text-2xl font-heading font-black uppercase tracking-wider text-brand-white">
                    Séance Privée Sur-Mesure
                  </h3>
                  <p className="text-xs text-brand-white/50 mt-1">
                    Sélectionnez un créneau individuel avec Coach Mahfoud Mohamed.
                  </p>
                </div>

                {/* Quota Banner */}
                {hasPrivateAccess && privateQuota && (
                  <div className="p-3 bg-brand-blue/10 border border-brand-blue/20 rounded-xl flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <Sparkles size={16} className="text-brand-blue shrink-0" />
                      <span className="text-brand-white font-medium">
                        Quota de séances privées :
                      </span>
                    </div>
                    <span className="font-heading font-bold text-brand-blue bg-brand-blue/20 px-2.5 py-0.5 rounded-full border border-brand-blue/30">
                      Il vous reste {privateQuota.remainingQuota} séance{privateQuota.remainingQuota > 1 ? "s" : ""} sur {privateQuota.totalQuota}
                    </span>
                  </div>
                )}

                {/* Warning if no access */}
                {!hasPrivateAccess && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-xs text-red-300"
                  >
                    <ShieldAlert size={18} className="shrink-0 mt-0.5 text-red-400" />
                    <div>
                      <strong className="block text-red-200 font-bold uppercase tracking-wide">
                        Accès non inclus
                      </strong>
                      Votre abonnement actuel ne comprend pas les séances privées 1 to 1. Veuillez contacter le club pour activer cette option.
                    </div>
                  </motion.div>
                )}

                {/* Warning if quota exhausted */}
                {hasPrivateAccess && isQuotaExhausted && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3 text-xs text-amber-300"
                  >
                    <AlertCircle size={18} className="shrink-0 mt-0.5 text-amber-400" />
                    <div>
                      <strong className="block text-amber-200 font-bold uppercase tracking-wide">
                        Quota épuisé
                      </strong>
                      Votre quota de séances privées est épuisé pour cette période.
                    </div>
                  </motion.div>
                )}

                {/* Error banner (e.g. race condition / slot taken) */}
                {errorMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-red-500/10 border border-red-500/25 rounded-xl flex items-center gap-2.5 text-xs text-red-300"
                  >
                    <AlertCircle size={16} className="shrink-0 text-red-400" />
                    <span>{errorMessage}</span>
                  </motion.div>
                )}

                {/* 1. Choix de la discipline */}
                <div className="space-y-2">
                  <label className="block text-xs font-heading font-bold uppercase tracking-wider text-brand-white/60">
                    1. Discipline
                  </label>
                  <select
                    value={selectedDiscipline}
                    onChange={(e) => setSelectedDiscipline(e.target.value)}
                    className="w-full bg-[#162032] border border-brand-white/10 rounded-lg px-3.5 py-2.5 text-sm text-brand-white focus:outline-none focus:border-brand-blue"
                  >
                    {disciplines.map((d) => (
                      <option key={d} value={d} className="bg-[#0f172a]">
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Choix du jour */}
                <div className="space-y-2">
                  <label className="block text-xs font-heading font-bold uppercase tracking-wider text-brand-white/60">
                    2. Jour de la séance
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {availableDays.map((day) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          setSelectedDay(day);
                          setSelectedSlotTime(null);
                          setSelectedSlotId(null);
                          setErrorMessage(null);
                        }}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-heading font-bold uppercase tracking-wider transition-all cursor-pointer",
                          selectedDay === day
                            ? "bg-brand-blue text-brand-black shadow-md shadow-brand-blue/20"
                            : "bg-[#162032] text-brand-white/60 hover:text-brand-white border border-brand-white/5"
                        )}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Choix du créneau horaire */}
                <div className="space-y-3">
                  <label className="block text-xs font-heading font-bold uppercase tracking-wider text-brand-white/60">
                    3. Créneau disponible ({selectedDay})
                  </label>

                  {/* Matin */}
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-semibold text-brand-white/40 uppercase tracking-wider flex items-center gap-1">
                      <Clock size={12} className="text-brand-blue" /> Matin
                    </p>
                    {morningSlots.length === 0 ? (
                      <p className="text-xs text-brand-white/30 italic py-1">
                        Aucun créneau matin ce jour-là.
                      </p>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {morningSlots.map((slot) => {
                          const isSelected = selectedSlotTime === slot.time;

                          if (slot.isReserved) {
                            return (
                              <div
                                key={slot.id || slot.time}
                                className="p-2.5 rounded-lg bg-brand-white/[0.02] border border-brand-white/5 text-brand-white/30 text-center cursor-not-allowed select-none opacity-50 flex flex-col justify-center items-center"
                              >
                                <span className="text-xs font-bold line-through">
                                  {slot.time}
                                </span>
                                <span className="text-[9px] font-heading font-bold uppercase tracking-wider text-red-400 mt-0.5">
                                  RÉSERVÉ
                                </span>
                              </div>
                            );
                          }

                          return (
                            <button
                              key={slot.id || slot.time}
                              type="button"
                              onClick={() => handleSelectSlot(slot)}
                              className={cn(
                                "p-2.5 rounded-lg border text-center transition-all cursor-pointer flex flex-col justify-center items-center",
                                isSelected
                                  ? "bg-brand-blue text-brand-black border-brand-blue font-bold shadow-md shadow-brand-blue/30 scale-[1.02]"
                                  : "bg-[#162032] text-brand-white/80 hover:text-brand-white border-brand-white/10 hover:border-brand-blue/40"
                              )}
                            >
                              <span className="text-xs font-bold">{slot.time}</span>
                              <span
                                className={cn(
                                  "text-[9px] font-semibold uppercase mt-0.5",
                                  isSelected
                                    ? "text-brand-black/80"
                                    : "text-[#22c55e]"
                                )}
                              >
                                Disponible
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Après-midi */}
                  <div className="space-y-1.5 pt-1">
                    <p className="text-[11px] font-semibold text-brand-white/40 uppercase tracking-wider flex items-center gap-1">
                      <Clock size={12} className="text-brand-blue" /> Après-midi
                    </p>
                    {afternoonSlots.length === 0 ? (
                      <p className="text-xs text-brand-white/30 italic py-1">
                        Aucun créneau après-midi ce jour-là.
                      </p>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {afternoonSlots.map((slot) => {
                          const isSelected = selectedSlotTime === slot.time;

                          if (slot.isReserved) {
                            return (
                              <div
                                key={slot.id || slot.time}
                                className="p-2.5 rounded-lg bg-brand-white/[0.02] border border-brand-white/5 text-brand-white/30 text-center cursor-not-allowed select-none opacity-50 flex flex-col justify-center items-center"
                              >
                                <span className="text-xs font-bold line-through">
                                  {slot.time}
                                </span>
                                <span className="text-[9px] font-heading font-bold uppercase tracking-wider text-red-400 mt-0.5">
                                  RÉSERVÉ
                                </span>
                              </div>
                            );
                          }

                          return (
                            <button
                              key={slot.id || slot.time}
                              type="button"
                              onClick={() => handleSelectSlot(slot)}
                              className={cn(
                                "p-2.5 rounded-lg border text-center transition-all cursor-pointer flex flex-col justify-center items-center",
                                isSelected
                                  ? "bg-brand-blue text-brand-black border-brand-blue font-bold shadow-md shadow-brand-blue/30 scale-[1.02]"
                                  : "bg-[#162032] text-brand-white/80 hover:text-brand-white border-brand-white/10 hover:border-brand-blue/40"
                              )}
                            >
                              <span className="text-xs font-bold">{slot.time}</span>
                              <span
                                className={cn(
                                  "text-[9px] font-semibold uppercase mt-0.5",
                                  isSelected
                                    ? "text-brand-black/80"
                                    : "text-[#22c55e]"
                                )}
                              >
                                Disponible
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 py-3 px-4 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white/70 text-xs font-heading font-bold uppercase tracking-wider rounded-sm transition-all cursor-pointer"
                  >
                    ANNULER
                  </button>

                  <button
                    type="button"
                    disabled={
                      !selectedSlotTime ||
                      !hasPrivateAccess ||
                      isQuotaExhausted ||
                      isLoading
                    }
                    onClick={handleConfirmReservation}
                    className={cn(
                      "flex-1 py-3 px-4 font-heading font-bold text-xs sm:text-sm uppercase tracking-wider rounded-sm transition-all flex items-center justify-center gap-2",
                      !selectedSlotTime || !hasPrivateAccess || isQuotaExhausted
                        ? "bg-brand-white/10 text-brand-white/30 cursor-not-allowed"
                        : "bg-brand-blue hover:bg-brand-white text-brand-black cursor-pointer shadow-lg shadow-brand-blue/25"
                    )}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Réservation…
                      </>
                    ) : !hasPrivateAccess ? (
                      "Accès privé requis"
                    ) : isQuotaExhausted ? (
                      "Quota épuisé"
                    ) : !selectedSlotTime ? (
                      "Choisir un créneau"
                    ) : (
                      "CONFIRMER LA SÉANCE"
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* Success State */
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6"
              >
                <div className="w-16 h-16 rounded-full bg-[#22c55e]/20 text-[#22c55e] flex items-center justify-center mx-auto mb-4 border border-[#22c55e]/30">
                  <CheckCircle2 size={36} />
                </div>
                <h3 className="text-2xl font-heading font-bold uppercase tracking-wider text-brand-white mb-2">
                  Réservation confirmée
                </h3>
                <p className="text-xs text-brand-white/60 mb-6 leading-relaxed max-w-sm mx-auto">
                  Votre séance privée de{" "}
                  <strong className="text-brand-white">{selectedDiscipline}</strong>{" "}
                  avec Coach Mahfoud est confirmée pour le{" "}
                  <strong className="text-brand-white">
                    {selectedDay} ({selectedSlotTime})
                  </strong>
                  .
                </p>

                <div className="bg-[#162032] rounded-xl p-4 text-xs text-brand-white/70 mb-6 border border-brand-white/10 text-left space-y-1.5">
                  <p className="font-bold text-brand-white flex items-center gap-1.5">
                    <ShieldCheck size={15} className="text-brand-blue" />
                    Coaching individuel personnalisé
                  </p>
                  <p className="text-brand-white/50 text-[11px]">
                    📍 Striking Camp Marseille. Matériel recommandé : gants,
                    bandages et tenue sportive.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full py-3.5 px-4 bg-brand-blue hover:bg-brand-white text-brand-black font-heading font-bold text-sm uppercase tracking-wider rounded-sm transition-colors cursor-pointer"
                >
                  VOIR DANS MON ESPACE MEMBRE
                </button>
              </motion.div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
