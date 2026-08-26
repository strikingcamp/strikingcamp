"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Clock,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useMember } from "../MemberContext";

export default function BookingCancelModal() {
  const {
    isBookingCancelOpen,
    slotToCancel,
    closeBookingCancel,
    removeBooking,
  } = useMember();
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!slotToCancel && !isSuccess) return null;

  const handleCancelConfirm = () => {
    setIsLoading(true);
    setError(null);

    if (slotToCancel) {
      removeBooking(
        slotToCancel.id || `${slotToCancel.day}-${slotToCancel.time}`
      );
    }

    setIsLoading(false);
    setIsSuccess(true);
  };

  const handleClose = () => {
    setIsSuccess(false);
    setIsLoading(false);
    setError(null);
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
                  <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mb-4">
                    <AlertTriangle size={24} />
                  </div>
                  <h3 className="text-2xl font-heading font-bold uppercase tracking-wider text-brand-white">
                    Annuler la réservation ?
                  </h3>
                  <p className="text-xs text-brand-white/50 mt-1">
                    Cette action libérera votre place pour un autre membre.
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
                    <span className="font-medium text-brand-blue">
                      {slotToCancel?.sessionType || "Small Group"}
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
              </div>
            ) : (
              /* Success State */
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6"
              >
                <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                  <CheckCircle2 size={36} />
                </div>
                <h3 className="text-2xl font-heading font-bold uppercase tracking-wider text-brand-white mb-2">
                  Réservation annulée
                </h3>
                <p className="text-xs text-brand-white/60 mb-6 leading-relaxed max-w-xs mx-auto">
                  Votre réservation a bien été annulée. Votre place a été libérée.
                </p>

                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full py-3 px-4 bg-brand-white/10 hover:bg-brand-white/20 text-brand-white font-heading font-bold text-sm uppercase tracking-wider rounded-sm transition-colors cursor-pointer"
                >
                  FERMER
                </button>
              </motion.div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
