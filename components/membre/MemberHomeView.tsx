"use client";

import { motion } from "framer-motion";
import {
  Calendar,
  Clock,
  Flame,
  ShieldCheck,
  XCircle,
  Sparkles,
  Trophy,
  Target,
  Award,
  Zap,
  Lock,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { useMember } from "./MemberContext";
import { cn } from "@/lib/utils";

interface MemberHomeViewProps {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

export default function MemberHomeView({
  firstName,
  lastName,
  email,
  role,
}: MemberHomeViewProps) {
  const { userBookings, openBookingCancel, hasPrivateAccess, privateQuota } = useMember();

  const greetingName = firstName ? ` ${firstName}` : "";
  const quotaRemaining = privateQuota?.sessionsRemaining ?? 6;
  const quotaTotal = privateQuota?.quotaTotal ?? 8;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8 pt-2 pb-12">
      
      {/* ━━━━━━━━━━━━━━━━━━━━
          MESSAGE D'ACCUEIL
          ━━━━━━━━━━━━━━━━━━━━ */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-1.5"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-blue/10 border border-brand-blue/20 rounded-full text-brand-blue text-xs font-semibold uppercase tracking-wider mb-2">
          <span className="w-2 h-2 rounded-full bg-brand-blue animate-pulse" />
          Espace Membre
        </div>
        <h1 className="text-3xl sm:text-4xl font-heading font-black uppercase tracking-wide text-brand-white">
          Bonjour{greetingName},
        </h1>
        <p className="text-lg sm:text-xl font-heading uppercase tracking-wide text-brand-blue font-bold">
          Prêt à vous dépasser aujourd’hui ?
        </p>
      </motion.div>

      {/* ━━━━━━━━━━━━━━━━━━━━
          BANDEAU QUOTA COURS PRIVÉS (SI ABONNÉ PRIVÉ)
          ━━━━━━━━━━━━━━━━━━━━ */}
      {hasPrivateAccess && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-[#0b1b33] to-[#0f172a] border border-[#00d8ff]/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#00d8ff]/15 text-[#00d8ff] flex items-center justify-center border border-[#00d8ff]/30 shrink-0">
              <Sparkles size={20} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider font-bold text-[#00d8ff]">
                Formule Cours Privés active
              </p>
              <p className="text-xs text-brand-white/70">
                Solde : <strong className="text-[#00d8ff]">{quotaRemaining}</strong> sur <strong>{quotaTotal} séances restantes</strong> ce cycle.
              </p>
            </div>
          </div>

          <Link
            href="/membre/planning"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#00d8ff] hover:bg-brand-white text-black font-heading font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-[#00d8ff]/20"
          >
            Réserver un cours privé
            <ArrowRight size={14} />
          </Link>
        </motion.div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━
          SECTION : MES DÉFIS (REMPLACE LES CARTES PLANNING/RÉSERVER)
          ━━━━━━━━━━━━━━━━━━━━ */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-brand-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <Trophy size={22} className="text-[#00d8ff]" />
            <h2 className="text-xl font-heading font-black uppercase tracking-wider text-brand-white">
              Mes Défis
            </h2>
          </div>
          <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-[#00d8ff]/15 text-[#00d8ff] border border-[#00d8ff]/30">
            Bientôt disponible
          </span>
        </div>

        {/* Card Teaser Visuel & Attractif */}
        <div className="bg-gradient-to-br from-[#0c182c] via-[#0f172a] to-[#131f37] border border-[#00d8ff]/25 rounded-2xl p-6 shadow-xl relative overflow-hidden space-y-5">
          {/* Subtle Cyber Grid Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#00d8ff]/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 max-w-lg">
              <div className="flex items-center gap-2">
                <span className="text-xs font-heading font-bold uppercase tracking-wider text-[#00d8ff] flex items-center gap-1.5">
                  <Flame size={15} />
                  Système de progression & accomplissements
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-heading font-black uppercase tracking-wide text-brand-white">
                Défis prochainement disponibles
              </h3>
              <p className="text-xs text-brand-white/60 leading-relaxed">
                Repoussez vos limites ! Bientôt, vous pourrez relever des défis hebdomadaires, débloquer des badges de combattant exclusifs et accumuler des points d’expérience à chaque entraînement.
              </p>
            </div>

            <Link
              href="/membre/defis"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white border border-brand-white/10 hover:border-[#00d8ff]/50 rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition-all shrink-0 cursor-pointer"
            >
              Découvrir l&apos;arène des défis
              <ArrowRight size={14} className="text-[#00d8ff]" />
            </Link>
          </div>

          {/* Mini Aperçu des Futurs Défis (Verrouillés) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-brand-white/10">
            <div className="p-3.5 bg-black/30 border border-brand-white/5 rounded-xl flex items-center gap-3 opacity-75">
              <div className="w-9 h-9 rounded-lg bg-[#00d8ff]/10 text-[#00d8ff] flex items-center justify-center shrink-0 border border-[#00d8ff]/20">
                <Target size={18} />
              </div>
              <div className="space-y-0.5">
                <div className="text-xs font-heading font-bold uppercase text-brand-white flex items-center gap-1">
                  <span>Assiduité 4 Semaines</span>
                  <Lock size={10} className="text-brand-white/40" />
                </div>
                <div className="text-[10px] text-brand-white/40">4 cours / mois consécutifs</div>
              </div>
            </div>

            <div className="p-3.5 bg-black/30 border border-brand-white/5 rounded-xl flex items-center gap-3 opacity-75">
              <div className="w-9 h-9 rounded-lg bg-[#00d8ff]/10 text-[#00d8ff] flex items-center justify-center shrink-0 border border-[#00d8ff]/20">
                <Zap size={18} />
              </div>
              <div className="space-y-0.5">
                <div className="text-xs font-heading font-bold uppercase text-brand-white flex items-center gap-1">
                  <span>100 Rounds Club</span>
                  <Lock size={10} className="text-brand-white/40" />
                </div>
                <div className="text-[10px] text-brand-white/40">Volume de frappe cumulé</div>
              </div>
            </div>

            <div className="p-3.5 bg-black/30 border border-brand-white/5 rounded-xl flex items-center gap-3 opacity-75">
              <div className="w-9 h-9 rounded-lg bg-[#00d8ff]/10 text-[#00d8ff] flex items-center justify-center shrink-0 border border-[#00d8ff]/20">
                <Award size={18} />
              </div>
              <div className="space-y-0.5">
                <div className="text-xs font-heading font-bold uppercase text-brand-white flex items-center gap-1">
                  <span>Master Striking</span>
                  <Lock size={10} className="text-brand-white/40" />
                </div>
                <div className="text-[10px] text-brand-white/40">Validation technique coach</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━
          SECTION : MES PROCHAINES RÉSERVATIONS (SYNCHRONISÉE)
          ━━━━━━━━━━━━━━━━━━━━ */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-brand-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Calendar size={20} className="text-[#00d8ff]" />
            <h2 className="text-xl font-heading font-bold uppercase tracking-wider text-brand-white">
              Mes prochaines réservations
            </h2>
          </div>
          {userBookings.length > 0 && (
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#00d8ff]/20 text-[#00d8ff] border border-[#00d8ff]/30">
              {userBookings.length} {userBookings.length === 1 ? "séance" : "séances"}
            </span>
          )}
        </div>

        {/* Liste des réservations synchronisées */}
        {userBookings.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-[#0f172a]/60 border border-brand-white/10 border-dashed rounded-2xl p-8 text-center space-y-4"
          >
            <div className="w-12 h-12 rounded-full bg-brand-white/5 text-brand-white/30 flex items-center justify-center mx-auto">
              <Calendar size={24} />
            </div>
            <div>
              <p className="text-base font-heading font-bold uppercase tracking-wider text-brand-white/80">
                Aucune réservation à venir.
              </p>
              <p className="text-xs text-brand-white/40 mt-1 max-w-sm mx-auto">
                Consultez les créneaux disponibles dans le planning et réservez votre prochaine session.
              </p>
            </div>
            <Link
              href="/membre/planning"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#00d8ff] text-black font-heading font-black text-xs uppercase tracking-wider rounded-xl hover:bg-brand-white transition-colors cursor-pointer shadow-lg shadow-[#00d8ff]/20"
            >
              Réserver une séance
              <ArrowRight size={14} />
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {userBookings.map((booking, idx) => {
              const isPrivate = booking.sessionType === "Cours Privé";

              return (
                <motion.div
                  key={booking.id || idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                  className={cn(
                    "border rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-200",
                    isPrivate
                      ? "bg-gradient-to-r from-[#0b1b33]/40 to-[#0f172a] border-[#00d8ff]/30 hover:border-[#00d8ff]"
                      : "bg-[#0f172a] hover:bg-[#162032] border-brand-white/10 hover:border-brand-white/20"
                  )}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="text-lg font-heading font-black uppercase tracking-wider text-brand-white">
                        {booking.discipline}
                      </h3>
                      <span className={cn(
                        "text-[10px] font-black uppercase px-2.5 py-0.5 rounded border",
                        isPrivate
                          ? "bg-[#00d8ff]/15 text-[#00d8ff] border-[#00d8ff]/30"
                          : "bg-brand-blue/20 text-brand-blue border-brand-blue/30"
                      )}>
                        {booking.sessionType}
                      </span>
                      {booking.level && (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-brand-white/10 text-brand-white/70">
                          {booking.level}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-brand-white/70 font-medium">
                      <span className="flex items-center gap-1 text-brand-white">
                        <Clock size={13} className="text-[#00d8ff]" />
                        {booking.day}
                        {booking.date ? ` (${booking.date})` : ""} · {booking.time}
                      </span>
                      <span className="flex items-center gap-1 text-[#22c55e]">
                        <ShieldCheck size={13} />
                        {booking.status || "Confirmé"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-brand-white/5">
                    <Link
                      href="/membre/planning"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      <XCircle size={14} />
                      Gérer / Annuler
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━
          INFO CLUB & PRÉPARATION
          ━━━━━━━━━━━━━━━━━━━━ */}
      <div className="bg-[#0f172a]/50 border border-brand-white/10 rounded-2xl p-5 flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-[#00d8ff]/10 text-[#00d8ff] flex items-center justify-center shrink-0 mt-0.5 border border-[#00d8ff]/20">
          <Flame size={20} />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-heading font-bold uppercase tracking-wider text-brand-white">
            Striking Camp Marseille
          </h4>
          <p className="text-xs text-brand-white/60 leading-relaxed">
            Pensez à apporter vos gants, bandages, protège-tibias et une bouteille d’eau. Arrivée recommandée 10 minutes avant le début de votre séance.
          </p>
        </div>
      </div>

    </div>
  );
}
