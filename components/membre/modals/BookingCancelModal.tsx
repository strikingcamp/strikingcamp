"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Clock,
  Loader2,
  AlertCircle,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { useMember } from "../MemberContext";
import { cn } from "@/lib/utils";

export default function BookingCancelModal() {
  const {
    isBookingCancelOpen,
    slotToCancel,
    closeBookingCancel,
    cancelSlot,
  } = useMember();
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelResultMsg, setCancelResultMsg] = useState<string | null>(null);
  const [isLateResult, setIsLateResult] = useState<boolean>(false);

  const isPrivate = slotToCancel?.sessionType === "Cours Privé";

  // Calcul précis du délai restant avant la séance
  const { isLateWarning } = useMemo(() => {
    if (!slotToCancel || !isPrivate) return { isLateWarning: false };

    let sessionDate: Date | null = null;
    if (slotToCancel.startsAt) {
      sessionDate = new Date(slotToCancel.startsAt);
    } else if (slotToCancel.date && slotToCancel.time) {
      sessionDate = new Date(`${slotToCancel.date}T${slotToCancel.time}:00`);
    }

    if (!sessionDate || isNaN(sessionDate.getTime())) {
      return { isLateWarning: false };
    }

    const diffHours = (sessionDate.getTime() - Date.now()) / (1000 * 3600);
    return {
      isLateWarning: diffHours < 24,
    };
  }, [slotToCancel, isPrivate]);

  if (!slotToCancel && !isSuccess) return null;

  const handleCancelConfirm = async () => {
    setIsLoading(true);
    setError(null);

    if (slotToCancel?.id) {
      const result = await cancelSlot(slotToCancel.id);
      if (!result.success) {
        setError(result.error || "Une erreur est survenue lors de l'annulation.");
        setIsLoading(false);
        return;
      }

      setIsLateResult(Boolean(result.isLateCancellation));
      setCancelResultMsg(result.message || null);
    }

    setIsLoading(false);
    setIsSuccess(true);
  };

  const handleClose = () => {
    setIsSuccess(false);
    setIsLoading(false);
    setError(null);
    setCancelResultMsg(null);
    setIsLateResult(false);
    closeBookingCancel();
  };

  return (
    <AnimatePresence>
      {isBookingCancelOpen && (
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
            className="relative w-full max-w-md bg-[#0f172a] border border-red-500/20 rounded-xl p-6 sm:p-8 shadow-2xl z-10"
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
                      "w-12 h-12 rounded-full flex items-center justify-center mb-4 border",
                      isLateWarning
                        ? "bg-red-500/15 border-red-500/30 text-red-400"
                        : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                    )}
                  >
                    {isLateWarning ? <ShieldAlert size={24} /> : <AlertTriangle size={24} />}
                  </div>
                  <h3 className="text-2xl font-heading font-bold uppercase tracking-wider text-brand-white">
                    {isLateWarning ? "Annulation impossible" : "Annuler la réservation ?"}
                  </h3>
                  <p className="text-xs text-brand-white/50 mt-1">
                    {isLateWarning
                      ? "La séance commence dans moins de 24 heures."
                      : "Veuillez confirmer l'annulation de votre séance."}
                  </p>
                </div>

                {/* Avertissement Règle des 24 heures */}
                <div
                  className={cn(
                    "mb-5 p-3.5 rounded-lg border text-xs space-y-1.5",
                    isLateWarning
                      ? "bg-red-950/40 border-red-500/40 text-red-300"
                      : "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                  )}
                >
                  <div className="flex items-center gap-2 font-bold uppercase tracking-wider">
                    {isLateWarning ? (
                      <>
                        <ShieldAlert size={16} className="text-red-400 shrink-0" />
                        <span>Délai de prévenance dépassé (&lt; 24h)</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
                        <span>Annulation à plus de 24h</span>
                      </>
                    )}
                  </div>
                  <p className="text-xs leading-relaxed font-medium">
                    {isLateWarning
                      ? "Cette réservation ne peut plus être annulée en ligne car la séance commence dans moins de 24 heures. Pour toute demande exceptionnelle, veuillez contacter votre coach."
                      : isPrivate
                      ? "La séance sera restituée à votre quota."
                      : "Votre place sera libérée pour les autres membres."}
                  </p>
                </div>

                {/* Session Card Info */}
                <div className="bg-brand-white/5 border border-brand-white/10 rounded-lg p-4 mb-6 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-brand-white/10">
                    <span className="text-brand-white/50 uppercase tracking-wider">
                      Discipline
                    </span>
                    <span className="font-bold text-brand-white text-sm">
                      {slotToCancel?.discipline}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-brand-white/10">
                    <span className="text-brand-white/50 uppercase tracking-wider">
                      Type
                    </span>
                    <span
                      className={cn(
                        "font-semibold uppercase px-2 py-0.5 rounded border text-[11px]",
                        isPrivate
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                          : "bg-brand-blue/20 text-brand-blue border-brand-blue/30"
                      )}
                    >
                      {slotToCancel?.sessionType || "Séance"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-brand-white/50 uppercase tracking-wider flex items-center gap-1">
                      <Calendar size={13} className="text-brand-blue" />
                      Créneau
                    </span>
                    <span className="font-semibold text-brand-white flex items-center gap-1.5">
                      {slotToCancel?.day}
                      {slotToCancel?.date ? ` (${slotToCancel.date})` : ""} ·{" "}
                      <Clock size={12} className="text-[#00d8ff]" />{" "}
                      {slotToCancel?.time}
                    </span>
                  </div>
                </div>

                {/* Message d'erreur */}
                {error && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-300 flex items-center gap-2">
                    <AlertCircle size={15} className="text-red-400 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Buttons */}
                {isLateWarning ? (
                  <div className="space-y-2">
                    <a
                      href="https://wa.me/33660309999"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3 bg-[#25D366] hover:bg-[#1EBE5D] text-black font-heading font-black text-xs uppercase tracking-wider rounded-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#25D366]/20 cursor-pointer text-center"
                    >
                      Contacter le coach sur WhatsApp
                    </a>
                    <button
                      type="button"
                      onClick={handleClose}
                      className="w-full py-2.5 bg-brand-white/10 hover:bg-brand-white/20 text-brand-white font-heading font-bold text-xs uppercase tracking-wider rounded-sm transition-colors cursor-pointer text-center"
                    >
                      FERMER
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <button
                      type="button"
                      onClick={handleClose}
                      disabled={isLoading}
                      className="w-full sm:flex-1 py-3 px-4 bg-brand-white/10 hover:bg-brand-white/20 text-brand-white font-heading font-bold text-xs uppercase tracking-wider rounded-sm transition-colors cursor-pointer text-center"
                    >
                      GARDER MA PLACE
                    </button>

                    <button
                      type="button"
                      onClick={handleCancelConfirm}
                      disabled={isLoading}
                      className="w-full sm:flex-1 py-3 px-4 bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white border border-red-500/30 hover:border-red-500 font-heading font-bold text-xs uppercase tracking-wider rounded-sm transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Annulation…
                        </>
                      ) : (
                        "CONFIRMER L’ANNULATION"
                      )}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Success State */
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6"
              >
                <div
                  className={cn(
                    "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border",
                    isLateResult
                      ? "bg-red-500/10 text-red-400 border-red-500/20"
                      : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  )}
                >
                  <CheckCircle2 size={36} />
                </div>
                <h3 className="text-2xl font-heading font-bold uppercase tracking-wider text-brand-white mb-2">
                  Annulation enregistrée
                </h3>
                <p className="text-xs text-brand-white/60 mb-4 leading-relaxed max-w-xs mx-auto">
                  {cancelResultMsg ||
                    (isLateResult
                      ? "Votre réservation a été annulée. La séance a été décomptée de votre quota car l'annulation est intervenue à moins de 24h."
                      : "Votre réservation a été annulée avec succès et votre place est libérée. La séance a été restituée à votre quota.")}
                </p>

                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full py-3 px-4 bg-brand-white/10 hover:bg-brand-white/20 text-brand-white font-heading font-bold text-xs uppercase tracking-wider rounded-sm transition-colors cursor-pointer"
                >
                  RETOURNER AU PLANNING
                </button>
              </motion.div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
