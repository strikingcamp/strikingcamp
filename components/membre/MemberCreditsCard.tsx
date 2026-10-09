"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  Calendar,
  ArrowRight,
  Clock,
  AlertCircle,
  Sparkles,
  Hourglass,
  Plus,
  Loader2,
  CheckCircle2,
  X,
  ShoppingBag,
} from "lucide-react";
import Link from "next/link";
import { type MemberSessionCreditPack } from "@/lib/supabase/session-credits";
import {
  type MembershipRequestItem,
  submitPackRequest,
} from "@/lib/supabase/membership-requests";
import { createClient } from "@/lib/supabase/client";
import { useMember } from "@/components/membre/MemberContext";
import { cn } from "@/lib/utils";

interface MemberCreditsCardProps {
  packs?: MemberSessionCreditPack[];
  pendingRequest?: MembershipRequestItem | null;
  className?: string;
}

export default function MemberCreditsCard({
  packs = [],
  pendingRequest,
  className,
}: MemberCreditsCardProps) {
  const supabase = createClient();
  const { refreshMemberData } = useMember();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [packNotes, setPackNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const activePacks = packs.filter(
    (p) => p.status === "active" && p.remainingCredits > 0
  );

  const handleOpenModal = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setPackNotes("");
    setIsModalOpen(true);
  };

  const handleConfirmOrder = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await submitPackRequest(supabase, {
        planCode: "pack_10_small_group",
        memberNotes: packNotes.trim() || undefined,
      });

      if (res.success) {
        setSuccessMessage(
          res.message ||
            "Votre demande pour le Pack 10 séances a été transmise avec succès."
        );
        await refreshMemberData();
      } else {
        setErrorMessage(res.error || "Impossible de passer la commande.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Une erreur est survenue.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          ÉTAT DEMANDE DE PACK EN ATTENTE (PENDING)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {pendingRequest && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-2xl bg-gradient-to-r from-[#172033] via-[#0c182c] to-[#0f172a] border border-amber-400/40 p-5 sm:p-6 shadow-[0_0_25px_rgba(251,191,36,0.1)] space-y-3"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
                <Hourglass size={20} className="animate-pulse" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-heading font-black text-amber-400 uppercase tracking-widest px-2.5 py-0.5 rounded bg-amber-400/10 border border-amber-400/20 inline-block">
                    Demande en attente de validation
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-heading font-black uppercase tracking-wide text-brand-white">
                  {pendingRequest.plan?.name || "Pack Small Group"}
                </h3>
              </div>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-300 text-xs font-heading font-bold uppercase tracking-wider self-start sm:self-auto">
              Validation Striking Camp en cours
            </div>
          </div>

          <p className="text-xs text-brand-white/70 leading-relaxed max-w-2xl">
            Votre demande pour le <strong className="text-brand-white">{pendingRequest.plan?.name || "Pack Small Group"}</strong> a bien été enregistrée et est actuellement en attente de validation par l&apos;équipe Striking Camp. Vos crédits seront automatiquement disponibles pour réserver vos cours dès confirmation.
          </p>
        </motion.div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          ÉTAT PACKS ACTIFS (APPROVED AVEC CRÉDITS DISPONIBLES)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {activePacks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-2xl bg-gradient-to-br from-[#101e38] via-[#0c1626] to-[#070c16] border border-amber-400/40 p-5 sm:p-6 shadow-[0_0_30px_rgba(251,191,36,0.1)] space-y-4"
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
                <Zap size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-heading font-black text-amber-400 uppercase tracking-widest px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/20 inline-block">
                    Mes Séances Small Group
                  </span>
                  <span className="text-xs text-brand-white/60 font-semibold">
                    {activePacks.length} pack{activePacks.length > 1 ? "s" : ""} actif{activePacks.length > 1 ? "s" : ""}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-heading font-black uppercase tracking-wide text-brand-white mt-0.5">
                  Solde de crédits disponible
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleOpenModal}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-brand-white/10 hover:bg-brand-white/20 text-brand-white font-heading font-bold text-xs uppercase tracking-wider rounded-xl transition-all border border-brand-white/10 cursor-pointer"
              >
                <Plus size={13} />
                <span>Recharger (Pack 10)</span>
              </button>
              <Link
                href="/membre/planning"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-brand-black font-heading font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-amber-400/20 shrink-0 cursor-pointer"
              >
                <span>Réserver un cours</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>

          {/* Liste des packs actifs */}
          <div className="space-y-3.5 pt-1">
            {activePacks.map((pack) => {
              const percentRemaining = Math.round(
                (pack.remainingCredits / pack.totalCredits) * 100
              );
              const formattedExpiration = new Intl.DateTimeFormat("fr-FR", {
                timeZone: "Europe/Paris",
                day: "numeric",
                month: "long",
                year: "numeric",
              }).format(new Date(pack.expiresAt));

              return (
                <div
                  key={pack.id}
                  className="rounded-xl bg-[#060c17]/80 border border-brand-white/10 p-4 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-heading font-black uppercase text-brand-white tracking-wide">
                        {pack.planName || "Pack Small Group"}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold uppercase">
                        Actif
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-amber-300 text-[11px] font-semibold">
                      <Calendar size={13} className="shrink-0" />
                      <span>Expire le {formattedExpiration}</span>
                    </div>
                  </div>

                  {/* Jauge de progression */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-brand-white/70">Séances disponibles</span>
                      <span className="font-heading font-black text-amber-400 text-sm">
                        {pack.remainingCredits} / {pack.totalCredits} restantes
                      </span>
                    </div>

                    <div className="w-full h-2.5 rounded-full bg-brand-white/10 overflow-hidden p-0.5">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentRemaining}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300 shadow-sm"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          POINT D'ACCÈS PACK 10 (SI AUCUN PACK ACTIF ET AUCUNE DEMANDE EN ATTENTE)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {activePacks.length === 0 && !pendingRequest && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-2xl bg-gradient-to-br from-[#101d36] via-[#0c1628] to-[#070c16] border border-brand-blue/40 p-5 sm:p-6 shadow-xl space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-heading font-black text-brand-blue uppercase tracking-widest px-2.5 py-0.5 rounded bg-brand-blue/15 border border-brand-blue/30 inline-block">
                  Packs de Séances Small Group
                </span>
                <span className="text-xs text-brand-white/60">
                  Sans engagement
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-heading font-black uppercase tracking-wide text-brand-white">
                Pack 10 séances — Small Group
              </h3>
              <p className="text-xs text-brand-white/70 max-w-lg">
                10 séances — 180 € — validité de 90 jours (3 mois). Accédez librement à toutes les disciplines adultes selon vos disponibilités.
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenModal}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-brand-blue hover:bg-brand-white text-brand-black font-heading font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-brand-blue/20 shrink-0 cursor-pointer"
            >
              <ShoppingBag size={14} />
              <span>Commander le Pack 10 (180 €)</span>
            </button>
          </div>
        </motion.div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MODAL DE COMMANDE DU PACK 10 SÉANCES
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isSubmitting) {
                  setIsModalOpen(false);
                }
              }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-[#0f172a] border border-brand-blue/40 rounded-3xl p-6 sm:p-8 shadow-2xl z-10 space-y-6"
            >
              <div className="flex items-center justify-between border-b border-brand-white/10 pb-4">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-heading font-black text-brand-blue uppercase tracking-widest block">
                    Packs de séances
                  </span>
                  <h3 className="text-xl font-heading font-black uppercase tracking-wide text-brand-white">
                    Pack 10 séances — Small Group
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="p-1.5 text-brand-white/40 hover:text-brand-white rounded-lg transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Récapitulatif du Pack */}
              <div className="bg-[#0a1120] border border-brand-white/10 rounded-2xl p-4 space-y-3 text-xs">
                <div className="flex justify-between items-center text-brand-white/80 pb-2 border-b border-brand-white/5">
                  <span>Volume de séances</span>
                  <strong className="text-brand-white font-heading font-black">10 séances</strong>
                </div>
                <div className="flex justify-between items-center text-brand-white/80 pb-2 border-b border-brand-white/5">
                  <span>Tarif</span>
                  <strong className="text-brand-blue text-sm font-heading font-black">180 € (soit 18 €/séance)</strong>
                </div>
                <div className="flex justify-between items-center text-brand-white/80 pb-2 border-b border-brand-white/5">
                  <span>Durée de validité</span>
                  <strong className="text-brand-white">90 jours (3 mois)</strong>
                </div>
                <div className="flex justify-between items-center text-brand-white/80">
                  <span>Type d&apos;offre</span>
                  <span className="text-emerald-400 font-semibold">Sans abonnement ni engagement</span>
                </div>
              </div>

              {/* Messages d'erreur et de succès */}
              {errorMessage && (
                <div className="p-3.5 bg-red-950/80 border border-red-500/40 rounded-xl text-red-300 text-xs flex items-center gap-2.5">
                  <AlertCircle size={16} className="shrink-0 text-red-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="p-3.5 bg-brand-blue/15 border border-brand-blue/30 rounded-xl text-brand-blue text-xs flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="shrink-0 text-brand-blue" />
                  <span>{successMessage}</span>
                </div>
              )}

              {!successMessage ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-heading font-bold uppercase tracking-wider text-brand-white/70 block mb-2">
                      Précisions ou commentaire (optionnel)
                    </label>
                    <textarea
                      rows={2}
                      value={packNotes}
                      onChange={(e) => setPackNotes(e.target.value)}
                      placeholder="Ex : Objectifs, créneaux souhaités..."
                      className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-xs text-brand-white placeholder:text-brand-white/30 focus:border-brand-blue outline-none resize-none"
                    />
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      disabled={isSubmitting}
                      className="w-full sm:w-auto px-5 py-3 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white text-xs font-heading font-bold uppercase tracking-wider rounded-xl transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmOrder}
                      disabled={isSubmitting}
                      className="w-full sm:w-auto px-6 py-3 bg-brand-blue hover:bg-brand-white text-brand-black font-heading font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-brand-blue/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 size={15} className="animate-spin" />
                          <span>Validation en cours...</span>
                        </>
                      ) : (
                        <>
                          <span>Confirmer la commande (180 €)</span>
                          <ArrowRight size={14} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-2.5 bg-brand-blue hover:bg-brand-white text-brand-black text-xs font-heading font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-brand-blue/20"
                  >
                    Fermer
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

