"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, Calendar, Clock, Award, ShieldCheck, Loader2, AlertCircle } from "lucide-react";
import { useMember } from "../MemberContext";
import { cn } from "@/lib/utils";

export default function BookingConfirmModal() {
  const { isBookingConfirmOpen, selectedSlot, closeBookingConfirm, bookSmallGroup } = useMember();
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!selectedSlot && !isSuccess) return null;

  const handleConfirm = async () => {
    if (!selectedSlot) return;

    setIsLoading(true);
    setError(null);

    const result = await bookSmallGroup(selectedSlot);

    if (!result.success) {
      setError(result.error || "Impossible de réserver ce cours.");
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
    setIsSuccess(true);
  };

  const handleClose = () => {
    setIsSuccess(false);
    setIsLoading(false);
    setError(null);
    closeBookingConfirm();
  };

  return (
    <AnimatePresence>
      {isBookingConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md bg-[#0f172a] border border-brand-white/10 rounded-xl p-6 sm:p-8 shadow-2xl z-10"
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
              <div>
                {/* Header */}
                <div className="mb-6">
                  <div
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-3 border",
                      selectedSlot?.sessionType === "Cours Privé"
                        ? "bg-amber-400/10 border-amber-400/20 text-amber-400"
                        : "bg-brand-blue/10 border-brand-blue/20 text-brand-blue"
                    )}
                  >
                    <ShieldCheck size={14} />
                    {selectedSlot?.sessionType === "Cours Privé"
                      ? "Réservation Cours Privé"
                      : "Réservation Small Group"}
                  </div>
                  <h3 className="text-2xl font-heading font-bold uppercase tracking-wider text-brand-white">
                    Confirmer votre réservation
                  </h3>
                  <p className="text-xs text-brand-white/50 mt-1">
                    Veuillez vérifier les informations de votre séance ci-dessous :
                  </p>
                </div>

                {/* Session Card Info */}
                <div className="bg-brand-white/5 border border-brand-white/10 rounded-lg p-5 mb-6 space-y-3.5">
                  <div className="flex items-center justify-between border-b border-brand-white/10 pb-3">
                    <span className="text-xs uppercase tracking-wider text-brand-white/50">Discipline</span>
                    <span className="text-base font-bold text-brand-white">
                      {selectedSlot?.discipline}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-b border-brand-white/10 pb-3">
                    <span className="text-xs uppercase tracking-wider text-brand-white/50">Type de séance</span>
                    <span
                      className={cn(
                        "text-xs font-semibold px-2 py-0.5 rounded border uppercase",
                        selectedSlot?.sessionType === "Cours Privé"
                          ? "bg-amber-400/20 text-amber-400 border-amber-400/30"
                          : "bg-brand-blue/20 text-brand-blue border-brand-blue/30"
                      )}
                    >
                      {selectedSlot?.sessionType || "Séance"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-b border-brand-white/10 pb-3">
                    <span className="text-xs uppercase tracking-wider text-brand-white/50 flex items-center gap-1.5">
                      <Calendar size={14} className="text-brand-blue" />
                      Jour
                    </span>
                    <span className="text-sm font-semibold text-brand-white">
                      {selectedSlot?.day}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider text-brand-white/50 flex items-center gap-1.5">
                      <Clock size={14} className="text-brand-blue" />
                      Heure
                    </span>
                    <span className="text-base font-bold text-[#00d8ff]">
                      {selectedSlot?.time}
                    </span>
                  </div>

                  {selectedSlot?.level && (
                    <div className="pt-2 border-t border-brand-white/5 flex items-center justify-between text-xs">
                      <span className="text-brand-white/40 flex items-center gap-1">
                        <Award size={13} className="text-brand-blue" />
                        Niveau
                      </span>
                      <span className="text-brand-white/80 font-medium">
                        {selectedSlot.level}
                      </span>
                    </div>
                  )}
                </div>

                {/* Message d'erreur */}
                {error && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-300 flex items-center gap-2">
                    <AlertCircle size={15} className="text-red-400 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isLoading}
                    className="flex-1 py-3 px-4 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white/70 hover:text-brand-white text-xs font-bold uppercase tracking-wider rounded-sm transition-all cursor-pointer border border-brand-white/10"
                  >
                    ANNULER
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={isLoading}
                    className="flex-1 py-3 px-4 bg-brand-blue hover:bg-brand-white text-brand-black font-heading font-bold text-sm uppercase tracking-wider rounded-sm transition-all cursor-pointer shadow-lg shadow-brand-blue/20 flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Confirmation…
                      </>
                    ) : (
                      "CONFIRMER"
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
                  <CheckCircle size={36} />
                </div>
                <h3 className="text-2xl font-heading font-bold uppercase tracking-wider text-brand-white mb-2">
                  Réservation confirmée
                </h3>
                <p className="text-xs text-brand-white/60 mb-6 leading-relaxed max-w-xs mx-auto">
                  Votre place pour la séance de <strong className="text-brand-white">{selectedSlot?.discipline}</strong> du <strong className="text-brand-white">{selectedSlot?.day} à {selectedSlot?.time}</strong> a bien été enregistrée.
                </p>

                <div className="bg-brand-white/5 rounded-lg p-3 text-xs text-brand-white/70 mb-6 border border-brand-white/10">
                  📍 Striking Camp — Arrivez 10 minutes avant le début de la séance.
                </div>

                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full py-3 px-4 bg-brand-blue hover:bg-brand-white text-brand-black font-heading font-bold text-sm uppercase tracking-wider rounded-sm transition-colors cursor-pointer"
                >
                  VOIR MES RÉSERVATIONS
                </button>
              </motion.div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
