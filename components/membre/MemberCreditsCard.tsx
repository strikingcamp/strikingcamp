"use client";

import { motion } from "framer-motion";
import { Zap, Calendar, ArrowRight, Clock, AlertCircle, Sparkles, Hourglass } from "lucide-react";
import Link from "next/link";
import { type MemberSessionCreditPack } from "@/lib/supabase/session-credits";
import { type MembershipRequestItem } from "@/lib/supabase/membership-requests";
import { cn } from "@/lib/utils";

interface MemberCreditsCardProps {
  packs?: MemberSessionCreditPack[];
  pendingRequest?: MembershipRequestItem | null;
  className?: string;
}

export default function MemberCreditsCard({ packs = [], pendingRequest, className }: MemberCreditsCardProps) {
  const activePacks = packs.filter(
    (p) => p.status === "active" && p.remainingCredits > 0
  );

  // Si aucun pack actif et aucune demande en attente, ne rien afficher
  if (activePacks.length === 0 && !pendingRequest) {
    return null;
  }

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

            <Link
              href="/membre/planning"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-brand-black font-heading font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-amber-400/20 shrink-0 cursor-pointer"
            >
              <span>Réserver un cours</span>
              <ArrowRight size={13} />
            </Link>
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
    </div>
  );
}
