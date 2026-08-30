"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, Calendar, Clock, Award, ShieldCheck, Loader2, AlertCircle, Sparkles } from "lucide-react";
import { useMember } from "../MemberContext";
import { cn } from "@/lib/utils";

export default function BookingConfirmModal() {
  const { isBookingConfirmOpen, selectedSlot, closeBookingConfirm, bookSlot, privateQuota } = useMember();
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!selectedSlot && !isSuccess) return null;

  const isPrivate = selectedSlot?.sessionType === "Cours Privé";
  const quotaRemaining = privateQuota?.sessionsRemaining ?? 0;
  const isQuotaExhausted = isPrivate && quotaRemaining <= 0;

  const handleConfirm = async () => {
    if (!selectedSlot) return;

    setIsLoading(true);
    setError(null);

    const result = await bookSlot(selectedSlot);

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
                      isPrivate
                        ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                        : "bg-brand-blue/10 border-brand-blue/20 text-brand-blue"
                    )}
                  >
                    <ShieldCheck size={14} />
                    {isPrivate ? "Réservation Cours Privé" : "Réservation Small Group"}
                  </div>
                  <h3 className="text-2xl font-heading font-bold uppercase tracking-wider text-brand-white">
                    Confirmer votre réservation
                  </h3>
                  <p className="text-xs text-brand-white/50 mt-1">
                    Veuillez vérifier les informations de votre séance ci-dessous :
                  </p>
                </div>

                {/* Quota Banner for Private Session */}
                {isPrivate && (
                  <div className="mb-4 p-3.5 bg-emerald-950/30 border border-emerald-500/30 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles size={16} className="text-emerald-400 shrink-0" />
                      <div>
                        <p className="text-xs font-bold uppercase text-emerald-300">
                          Quota mensuel Cours Privés
                        </p>
                        <p className="text-[11px] text-emerald-400/80">
                          {quotaRemaining} / {privateQuota?.quotaTotal || 8} séance{quotaRemaining > 1 ? "s" : ""} restante{quotaRemaining > 1 ? "s" : ""} ce cycle
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-black px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      -1 séance
                    </span>
                  </div>
                )}

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
                        isPrivate
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 font-bold"
                          : "bg-brand-blue/20 text-brand-blue border-brand-blue/30"
                      )}
                    >
                      {selectedSlot?.sessionType || "Séance"} · {isPrivate ? "1 personne" : "Capacité 20"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-b border-brand-white/10 pb-3">
                    <span className="text-xs uppercase tracking-wider text-brand-white/50 flex items-center gap-1.5">
                      <Calendar size={14} className={isPrivate ? "text-emerald-400" : "text-brand-blue"} />
                      Jour
                    </span>
                    <span className="text-sm font-semibold text-brand-white">
                      {selectedSlot?.day} {selectedSlot?.date ? `(${selectedSlot.date})` : ""}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider text-brand-white/50 flex items-center gap-1.5">
                      <Clock size={14} className={isPrivate ? "text-emerald-400" : "text-brand-blue"} />
                      Heure & Durée
                    </span>
                    <span className={cn("text-base font-bold", isPrivate ? "text-emerald-400" : "text-[#00d8ff]")}>
                      {selectedSlot?.time} {isPrivate ? "(50 min)" : ""}
                    </span>
                  </div>

                  {selectedSlot?.level && (
                    <div className="pt-2 border-t border-brand-white/5 flex items-center justify-between text-xs">
                      <span className="text-brand-white/40 flex items-center gap-1">
                        <Award size={13} className={isPrivate ? "text-emerald-400" : "text-brand-blue"} />
                        Format
                      </span>
                      <span className="text-brand-white/80 font-medium">
                        {isPrivate ? "Cours individuel sur mesure" : selectedSlot.level}
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
                    className={cn(
                      "flex-1 py-3 px-4 font-heading font-bold text-sm uppercase tracking-wider rounded-sm transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2",
                      isPrivate
                        ? "bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20"
                        : "bg-brand-blue hover:bg-brand-white text-brand-black shadow-brand-blue/20"
                    )}
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
                <div className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border",
                  isPrivate
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                    : "bg-[#22c55e]/20 text-[#22c55e] border-[#22c55e]/30"
                )}>
                  <CheckCircle size={36} />
                </div>
                <h3 className="text-2xl font-heading font-bold uppercase tracking-wider text-brand-white mb-2">
                  Réservation confirmée
                </h3>
                <p className="text-xs text-brand-white/60 mb-4 leading-relaxed max-w-xs mx-auto">
                  Votre place pour le <strong className="text-brand-white">{selectedSlot?.discipline}</strong> du <strong className="text-brand-white">{selectedSlot?.day} à {selectedSlot?.time}</strong> a bien été enregistrée.
                </p>

                {isPrivate && (
                  <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-lg p-3 text-xs text-emerald-300 mb-6">
                    🎯 Il vous reste <strong>{Math.max(0, quotaRemaining - 1)} / {privateQuota?.quotaTotal || 8} séance{Math.max(0, quotaRemaining - 1) > 1 ? "s" : ""}</strong> sur votre cycle en cours.
                  </div>
                )}

                <div className="bg-brand-white/5 rounded-lg p-3 text-xs text-brand-white/70 mb-6 border border-brand-white/10">
                  📍 Striking Camp — Arrivez 10 minutes avant le début de votre cours.
                </div>

                <button
                  type="button"
                  onClick={handleClose}
                  className={cn(
                    "w-full py-3 px-4 font-heading font-bold text-sm uppercase tracking-wider rounded-sm transition-colors cursor-pointer",
                    isPrivate
                      ? "bg-emerald-500 hover:bg-emerald-400 text-black"
                      : "bg-brand-blue hover:bg-brand-white text-brand-black"
                  )}
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
