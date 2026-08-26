"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Users, UserCheck, Calendar, Sparkles } from "lucide-react";
import { useMember } from "../MemberContext";
import { useRouter } from "next/navigation";

export default function QuickActionModal() {
  const { isQuickActionOpen, closeQuickAction, openPrivateSession } = useMember();
  const router = useRouter();

  const handleSmallGroup = () => {
    closeQuickAction();
    router.push("/membre/planning");
  };

  const handlePrivateSession = () => {
    closeQuickAction();
    openPrivateSession();
  };

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
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-brand-blue/20 flex items-center justify-center text-brand-blue">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-heading font-bold uppercase tracking-wider text-brand-white">
                    Nouvelle Réservation
                  </h3>
                  <p className="text-xs text-brand-white/50">
                    Choisissez votre formule d’entraînement
                  </p>
                </div>
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
              {/* Option 1: Séance Privée */}
              <button
                onClick={handlePrivateSession}
                className="w-full text-left p-4 rounded-lg bg-brand-white/[0.03] hover:bg-brand-blue/10 border border-brand-white/10 hover:border-brand-blue/40 transition-all duration-200 group flex items-start gap-4 cursor-pointer"
              >
                <div className="w-12 h-12 rounded-lg bg-brand-blue/10 group-hover:bg-brand-blue text-brand-blue group-hover:text-brand-black flex items-center justify-center shrink-0 transition-colors">
                  <UserCheck size={24} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-base font-heading font-bold uppercase tracking-wide text-brand-white group-hover:text-brand-blue transition-colors">
                      1. Réserver une séance privée
                    </h4>
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-brand-blue/20 text-brand-blue">
                      1 to 1
                    </span>
                  </div>
                  <p className="text-xs text-brand-white/60 mt-1 leading-relaxed">
                    Coaching individuel personnalisé avec Mahfoud Mohamed. Travail sur-mesure de vos objectifs et de votre technique.
                  </p>
                </div>
              </button>

              {/* Option 2: Séance Small Group */}
              <button
                onClick={handleSmallGroup}
                className="w-full text-left p-4 rounded-lg bg-brand-white/[0.03] hover:bg-brand-blue/10 border border-brand-white/10 hover:border-brand-blue/40 transition-all duration-200 group flex items-start gap-4 cursor-pointer"
              >
                <div className="w-12 h-12 rounded-lg bg-brand-blue/10 group-hover:bg-brand-blue text-brand-blue group-hover:text-brand-black flex items-center justify-center shrink-0 transition-colors">
                  <Users size={24} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-base font-heading font-bold uppercase tracking-wide text-brand-white group-hover:text-brand-blue transition-colors">
                      2. Réserver une séance Small Group
                    </h4>
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-[#22c55e]/20 text-[#22c55e]">
                      Max 8 pers.
                    </span>
                  </div>
                  <p className="text-xs text-brand-white/60 mt-1 leading-relaxed">
                    Entraînement intensif en effectif réduit : Boxing Bag, Kick Boxing, KB Shred, Striking, Lady Striking, Boxe Thaï.
                  </p>
                </div>
              </button>
            </div>

            {/* Footer note */}
            <div className="mt-6 pt-4 border-t border-brand-white/5 flex items-center justify-between text-xs text-brand-white/40">
              <span className="flex items-center gap-1">
                <Calendar size={14} className="text-brand-blue" />
                Planning en temps réel
              </span>
              <span>Striking Camp Marseille</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
