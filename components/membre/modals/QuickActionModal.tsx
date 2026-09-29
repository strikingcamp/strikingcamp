"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight } from "lucide-react";
import { useMember } from "../MemberContext";
import { useRouter } from "next/navigation";

export default function QuickActionModal() {
  const {
    isQuickActionOpen,
    closeQuickAction,
    hasPrivateAccess,
    privateQuota,
    isPrivateEnabled,
    isSmallGroupEnabled,
  } = useMember();
  const router = useRouter();

  const handleNavigate = () => {
    closeQuickAction();
    router.push("/membre/planning");
  };

  const quotaRemaining = privateQuota?.sessionsRemaining ?? 0;

  return (
    <AnimatePresence>
      {isQuickActionOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeQuickAction}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-lg bg-[#0f172a] border border-brand-white/10 rounded-t-2xl sm:rounded-xl p-6 shadow-2xl z-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-brand-white/10 mb-6">
              <div>
                <h3 className="text-lg font-heading font-bold uppercase tracking-wider text-brand-white">
                  Nouvelle Réservation
                </h3>
                <p className="text-xs text-brand-white/50">
                  Choisissez le type de séance que vous souhaitez réserver
                </p>
              </div>

              <button
                onClick={closeQuickAction}
                className="text-brand-white/50 hover:text-brand-white p-2 rounded-full hover:bg-brand-white/5 transition-colors"
                aria-label="Fermer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Options */}
            <div className="space-y-3">
              {/* Option: Cours Privé (si abonné privé et service activé) */}
              {hasPrivateAccess && isPrivateEnabled && (
                <button
                  onClick={() => handleNavigate()}
                  className="w-full text-left p-4 rounded-xl bg-gradient-to-r from-[#062c1d]/40 to-[#0f172a] hover:from-[#062c1d]/60 border border-emerald-500/30 hover:border-emerald-500/50 transition-all duration-200 group flex flex-col gap-1 cursor-pointer"
                >
                  <div className="flex items-center justify-between w-full">
                    <h4 className="text-base font-heading font-bold uppercase tracking-wide text-brand-white group-hover:text-emerald-400 transition-colors">
                      Cours Privé (Individuel)
                    </h4>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {quotaRemaining} restante{quotaRemaining > 1 ? "s" : ""}
                    </span>
                  </div>
                  <p className="text-xs text-brand-white/60 mt-0.5 leading-relaxed">
                    Séance privée 1-à-1 sur mesure (50 min) avec suivi personnalisé.
                  </p>
                </button>
              )}

              {/* Option: Séance Small Group (si service activé) */}
              {isSmallGroupEnabled && (
                <button
                  onClick={() => handleNavigate()}
                  className="w-full text-left p-4 rounded-xl bg-brand-white/[0.03] hover:bg-brand-blue/10 border border-brand-white/10 hover:border-brand-blue/40 transition-all duration-200 group flex flex-col gap-1 cursor-pointer"
                >
                  <div className="flex items-center justify-between w-full">
                    <h4 className="text-base font-heading font-bold uppercase tracking-wide text-brand-white group-hover:text-brand-blue transition-colors">
                      Séance Cours Adulte
                    </h4>
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-[#22c55e]/20 text-[#22c55e]">
                      Max 12 pers.
                    </span>
                  </div>
                  <p className="text-xs text-brand-white/60 mt-0.5 leading-relaxed">
                    Entraînement technique en petit groupe : Boxing Bag, Kick Boxing, KB Shred, Striking.
                  </p>
                </button>
              )}

              {/* Option: Consulter le planning */}
              <button
                onClick={() => handleNavigate()}
                className="w-full text-left p-4 rounded-xl bg-brand-white/[0.02] hover:bg-brand-white/5 border border-brand-white/5 hover:border-brand-white/20 transition-all duration-200 group flex items-center justify-between cursor-pointer"
              >
                <div>
                  <h4 className="text-sm font-heading font-bold uppercase tracking-wide text-brand-white">
                    Voir tout le planning
                  </h4>
                  <p className="text-xs text-brand-white/40">
                    Horaires de tous les cours de la semaine
                  </p>
                </div>
                <ArrowRight size={18} className="text-brand-white/40 group-hover:text-brand-white transition-colors" />
              </button>
            </div>

            {/* Footer note */}
            <div className="mt-6 pt-4 border-t border-brand-white/5 flex items-center justify-between text-xs text-brand-white/40">
              <span>Planning en direct</span>
              <span>Striking Camp Marseille</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
