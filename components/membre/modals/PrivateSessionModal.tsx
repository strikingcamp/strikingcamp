"use client";

import { useState } from "react";
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

const morningSlots = [
  "08:00 – 08:50",
  "09:00 – 09:50",
  "10:00 – 10:50",
];

const afternoonSlots = [
  "14:00 – 14:50",
  "15:00 – 15:50",
  "16:00 – 16:50",
];

const days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

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
    isPrivateSlotReserved,
    addBooking,
  } = useMember();

  const [selectedDay, setSelectedDay] = useState("Lundi");
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedDiscipline, setSelectedDiscipline] = useState("Kick Boxing");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleConfirmReservation = () => {
    if (!selectedSlot || !hasPrivateAccess) return;

    setIsLoading(true);
    setTimeout(() => {
      addBooking({
        discipline: selectedDiscipline,
        sessionType: "Séance Privée",
        day: selectedDay,
        time: selectedSlot,
        level: "1 to 1 Sur-Mesure",
        status: "Réservation confirmée",
      });
      setIsLoading(false);
      setIsSuccess(true);
    }, 600);
  };

  const handleClose = () => {
    setIsSuccess(false);
    setIsLoading(false);
    setSelectedSlot(null);
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
                    {days.map((day) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          setSelectedDay(day);
                          setSelectedSlot(null);
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
                    <div className="grid grid-cols-3 gap-2">
                      {morningSlots.map((slot) => {
                        const isReserved = isPrivateSlotReserved(selectedDay, slot);
                        const isSelected = selectedSlot === slot;

                        if (isReserved) {
                          return (
                            <div
                              key={slot}
                              className="p-2.5 rounded-lg bg-brand-white/[0.02] border border-brand-white/5 text-brand-white/30 text-center cursor-not-allowed select-none opacity-50 flex flex-col justify-center items-center"
                            >
                              <span className="text-xs font-bold line-through">{slot}</span>
                              <span className="text-[9px] font-heading font-bold uppercase tracking-wider text-red-400 mt-0.5">
                                RÉSERVÉ
                              </span>
                            </div>
                          );
                        }

                        return (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setSelectedSlot(slot)}
                            className={cn(
                              "p-2.5 rounded-lg border text-center transition-all cursor-pointer flex flex-col justify-center items-center",
                              isSelected
                                ? "bg-brand-blue text-brand-black border-brand-blue font-bold shadow-md shadow-brand-blue/30 scale-[1.02]"
                                : "bg-[#162032] text-brand-white/80 hover:text-brand-white border-brand-white/10 hover:border-brand-blue/40"
                            )}
                          >
                            <span className="text-xs font-bold">{slot}</span>
                            <span className={cn(
                              "text-[9px] font-semibold uppercase mt-0.5",
                              isSelected ? "text-brand-black/80" : "text-[#22c55e]"
                            )}>
                              Disponible
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Après-midi */}
                  <div className="space-y-1.5 pt-1">
                    <p className="text-[11px] font-semibold text-brand-white/40 uppercase tracking-wider flex items-center gap-1">
                      <Clock size={12} className="text-brand-blue" /> Après-midi
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {afternoonSlots.map((slot) => {
                        const isReserved = isPrivateSlotReserved(selectedDay, slot);
                        const isSelected = selectedSlot === slot;

                        if (isReserved) {
                          return (
                            <div
                              key={slot}
                              className="p-2.5 rounded-lg bg-brand-white/[0.02] border border-brand-white/5 text-brand-white/30 text-center cursor-not-allowed select-none opacity-50 flex flex-col justify-center items-center"
                            >
                              <span className="text-xs font-bold line-through">{slot}</span>
                              <span className="text-[9px] font-heading font-bold uppercase tracking-wider text-red-400 mt-0.5">
                                RÉSERVÉ
                              </span>
                            </div>
                          );
                        }

                        return (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setSelectedSlot(slot)}
                            className={cn(
                              "p-2.5 rounded-lg border text-center transition-all cursor-pointer flex flex-col justify-center items-center",
                              isSelected
                                ? "bg-brand-blue text-brand-black border-brand-blue font-bold shadow-md shadow-brand-blue/30 scale-[1.02]"
                                : "bg-[#162032] text-brand-white/80 hover:text-brand-white border-brand-white/10 hover:border-brand-blue/40"
                            )}
                          >
                            <span className="text-xs font-bold">{slot}</span>
                            <span className={cn(
                              "text-[9px] font-semibold uppercase mt-0.5",
                              isSelected ? "text-brand-black/80" : "text-[#22c55e]"
                            )}>
                              Disponible
                            </span>
                          </button>
                        );
                      })}
                    </div>
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
                    disabled={!selectedSlot || !hasPrivateAccess || isLoading}
                    onClick={handleConfirmReservation}
                    className={cn(
                      "flex-1 py-3 px-4 font-heading font-bold text-xs sm:text-sm uppercase tracking-wider rounded-sm transition-all flex items-center justify-center gap-2",
                      !selectedSlot || !hasPrivateAccess
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
                    ) : !selectedSlot ? (
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
                  Votre séance privée de <strong className="text-brand-white">{selectedDiscipline}</strong> avec Coach Mahfoud est confirmée pour le <strong className="text-brand-white">{selectedDay} ({selectedSlot})</strong>.
                </p>

                <div className="bg-[#162032] rounded-xl p-4 text-xs text-brand-white/70 mb-6 border border-brand-white/10 text-left space-y-1.5">
                  <p className="font-bold text-brand-white flex items-center gap-1.5">
                    <ShieldCheck size={15} className="text-brand-blue" />
                    Coaching individuel personnalisé
                  </p>
                  <p className="text-brand-white/50 text-[11px]">
                    📍 Striking Camp Marseille. Matériel recommandé : gants, bandages et tenue sportive.
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
