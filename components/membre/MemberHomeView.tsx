"use client";

import { motion } from "framer-motion";
import {
  Calendar,
  Clock,
  Plus,
  Flame,
  ChevronRight,
  ShieldCheck,
  XCircle,
  Bell,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";
import { useMember, type BookingSlot } from "./MemberContext";
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
  const { userBookings, openBookingCancel, openQuickAction } = useMember();

  // Dynamic greeting: "Bonjour [Prénom]," or "Bonjour,"
  const greetingName = firstName ? ` ${firstName}` : "";

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8 pt-2">
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
          RACCOURCIS RAPIDES (Cards)
          ━━━━━━━━━━━━━━━━━━━━ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {/* Card 1: Réserver */}
        <button
          onClick={openQuickAction}
          className="bg-gradient-to-br from-[#0f172a] to-[#1e293b] border border-brand-blue/30 rounded-xl p-4 text-left hover:border-brand-blue transition-all duration-200 group cursor-pointer relative overflow-hidden"
        >
          <div className="w-9 h-9 rounded-lg bg-brand-blue/20 text-brand-blue group-hover:bg-brand-blue group-hover:text-brand-black flex items-center justify-center mb-3 transition-colors">
            <Plus size={20} />
          </div>
          <p className="text-xs uppercase tracking-wider text-brand-white/50 font-semibold">
            Action
          </p>
          <p className="text-sm sm:text-base font-heading font-bold uppercase tracking-wider text-brand-white group-hover:text-brand-blue transition-colors">
            Réserver un cours
          </p>
        </button>

        {/* Card 2: Planning */}
        <Link
          href="/membre/planning"
          className="bg-gradient-to-br from-[#0f172a] to-[#1e293b] border border-brand-white/10 rounded-xl p-4 text-left hover:border-brand-white/30 transition-all duration-200 group"
        >
          <div className="w-9 h-9 rounded-lg bg-brand-white/5 text-brand-white/80 group-hover:bg-brand-white/10 flex items-center justify-center mb-3 transition-colors">
            <Calendar size={18} />
          </div>
          <p className="text-xs uppercase tracking-wider text-brand-white/50 font-semibold">
            Horaires
          </p>
          <p className="text-sm sm:text-base font-heading font-bold uppercase tracking-wider text-brand-white group-hover:text-brand-blue transition-colors">
            Voir le planning
          </p>
        </Link>

        {/* Card 3: Alertes (Desktop / 3ème colonne) */}
        <Link
          href="/membre/alertes"
          className="col-span-2 sm:col-span-1 bg-gradient-to-br from-[#0f172a] to-[#1e293b] border border-brand-white/10 rounded-xl p-4 text-left hover:border-brand-white/30 transition-all duration-200 group flex sm:block items-center justify-between"
        >
          <div>
            <div className="w-9 h-9 rounded-lg bg-brand-white/5 text-brand-white/80 group-hover:bg-brand-white/10 flex items-center justify-center mb-0 sm:mb-3 transition-colors">
              <Bell size={18} />
            </div>
            <div className="mt-2 sm:mt-0">
              <p className="text-xs uppercase tracking-wider text-brand-white/50 font-semibold">
                Notifications
              </p>
              <p className="text-sm sm:text-base font-heading font-bold uppercase tracking-wider text-brand-white group-hover:text-brand-blue transition-colors">
                Mes alertes
              </p>
            </div>
          </div>
          <ChevronRight size={18} className="text-brand-white/40 sm:hidden" />
        </Link>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━
          SECTION : MES PROCHAINES RÉSERVATIONS
          ━━━━━━━━━━━━━━━━━━━━ */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-brand-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Calendar size={20} className="text-brand-blue" />
            <h2 className="text-xl font-heading font-bold uppercase tracking-wider text-brand-white">
              Mes prochaines réservations
            </h2>
          </div>
          {userBookings.length > 0 && (
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-brand-blue/20 text-brand-blue border border-brand-blue/30">
              {userBookings.length}{" "}
              {userBookings.length === 1 ? "séance" : "séances"}
            </span>
          )}
        </div>

        {/* État vide ou Cartes de réservation */}
        {userBookings.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-[#0f172a]/60 border border-brand-white/10 border-dashed rounded-xl p-8 text-center space-y-4"
          >
            <div className="w-12 h-12 rounded-full bg-brand-white/5 text-brand-white/30 flex items-center justify-center mx-auto">
              <Calendar size={24} />
            </div>
            <div>
              <p className="text-base font-heading font-bold uppercase tracking-wider text-brand-white/80">
                Aucune réservation à venir.
              </p>
              <p className="text-xs text-brand-white/40 mt-1 max-w-sm mx-auto">
                Consultez les créneaux disponibles dans le planning et réservez
                votre prochaine session Small Group ou Privée.
              </p>
            </div>
            <button
              onClick={() => openQuickAction()}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-blue text-brand-black font-heading font-bold text-xs uppercase tracking-wider rounded-sm hover:bg-brand-white transition-colors cursor-pointer"
            >
              <Plus size={16} />
              Réserver une séance
            </button>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {userBookings.map((booking, idx) => (
              <motion.div
                key={booking.id || idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                className="bg-gradient-to-r from-[#0f172a] to-[#162032] border border-brand-white/10 hover:border-brand-blue/40 rounded-xl p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-200"
              >
                {/* Discipline & Details */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-lg font-heading font-black uppercase tracking-wider text-brand-white">
                      {booking.discipline}
                    </h3>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-brand-blue/20 text-brand-blue border border-brand-blue/30">
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
                      <Calendar size={13} className="text-brand-blue" />
                      {booking.day}
                      {booking.date ? ` (${booking.date})` : ""} · {booking.time}
                    </span>
                    <span className="flex items-center gap-1 text-[#22c55e]">
                      <ShieldCheck size={13} />
                      {booking.status || "Réservation confirmée"}
                    </span>
                  </div>
                </div>

                {/* Cancel action */}
                <div className="flex items-center justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-brand-white/5">
                  <button
                    onClick={() => openBookingCancel(booking)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 rounded-sm text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    <XCircle size={14} />
                    Annuler
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━
          INFO CLUB & PRÉPARATION
          ━━━━━━━━━━━━━━━━━━━━ */}
      <div className="bg-[#0f172a]/50 border border-brand-white/10 rounded-xl p-5 flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-brand-blue/10 text-brand-blue flex items-center justify-center shrink-0 mt-0.5">
          <Flame size={20} />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-heading font-bold uppercase tracking-wider text-brand-white">
            Striking Camp Marseille
          </h4>
          <p className="text-xs text-brand-white/60 leading-relaxed">
            Pensez à apporter vos gants, bandages, protège-tibias et une bouteille
            d’eau. Arrivée recommandée 10 minutes avant le début de votre séance.
          </p>
        </div>
      </div>
    </div>
  );
}
