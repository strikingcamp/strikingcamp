"use client";

import {
  Users,
  CreditCard,
  BookmarkCheck,
  Percent,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Clock,
  MapPin,
} from "lucide-react";
import Link from "next/link";
import type { AdminDashboardStats } from "@/lib/supabase/admin";

interface AdminDashboardViewProps {
  initialData: AdminDashboardStats;
}

export default function AdminDashboardView({
  initialData,
}: AdminDashboardViewProps) {
  const {
    totalMembers,
    activeSubscriptionsCount,
    smallGroupSubscriptionsCount,
    collectiveSubscriptionsCount,
    todayBookingsCount,
    upcomingSessionsToday,
    recentBookings,
    featuredEvents,
  } = initialData;

  // Calcul du taux d'occupation moyen du jour (sur base 20 places par session Small Group)
  const totalCapacityToday = upcomingSessionsToday.reduce(
    (acc, s) => acc + (s.max_capacity || 20),
    0
  );
  const occupancyRate =
    totalCapacityToday > 0
      ? Math.round((todayBookingsCount / totalCapacityToday) * 100)
      : 0;

  return (
    <div className="space-y-8">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-white/10 pb-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-heading font-black uppercase tracking-wider text-brand-white">
            Tableau de bord <span className="text-brand-blue">Admin</span>
          </h1>
          <p className="text-xs sm:text-sm text-brand-white/60 mt-1">
            Vue d&apos;ensemble en temps réel des membres, réservations et séances de Striking Camp.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/planning"
            className="px-4 py-2 bg-brand-blue hover:bg-brand-white text-brand-black font-heading font-bold text-xs uppercase tracking-wider rounded-sm transition-all shadow-md shadow-brand-blue/20 cursor-pointer"
          >
            Gérer le Planning
          </Link>
          <Link
            href="/admin/membres"
            className="px-4 py-2 bg-brand-white/10 hover:bg-brand-white/20 text-brand-white font-heading font-bold text-xs uppercase tracking-wider rounded-sm transition-all border border-brand-white/15 cursor-pointer"
          >
            Voir les Membres
          </Link>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━
          KPI STAT CARDS
          ━━━━━━━━━━━━━━━━━━━━ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Total Membres */}
        <div className="bg-[#0f172a]/80 border border-brand-white/10 rounded-xl p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-white/50">
              Total Membres
            </span>
            <div className="w-9 h-9 rounded-lg bg-brand-blue/15 text-brand-blue flex items-center justify-center border border-brand-blue/30">
              <Users size={18} />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-3xl font-heading font-black text-brand-white">
              {totalMembers}
            </div>
            <p className="text-[11px] text-brand-white/40">
              Comptes enregistrés dans la base
            </p>
          </div>
        </div>

        {/* Abonnements Actifs */}
        <div className="bg-[#0f172a]/80 border border-brand-white/10 rounded-xl p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-white/50">
              Abonnements Actifs
            </span>
            <div className="w-9 h-9 rounded-lg bg-[#22c55e]/15 text-[#22c55e] flex items-center justify-center border border-[#22c55e]/30">
              <CreditCard size={18} />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-3xl font-heading font-black text-brand-white">
              {activeSubscriptionsCount}
            </div>
            <p className="text-[11px] text-[#22c55e] font-semibold">
              {smallGroupSubscriptionsCount} Small Group · {collectiveSubscriptionsCount} Collectif
            </p>
          </div>
        </div>

        {/* Réservations du Jour */}
        <div className="bg-[#0f172a]/80 border border-brand-white/10 rounded-xl p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-white/50">
              Inscrits Aujourd&apos;hui
            </span>
            <div className="w-9 h-9 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <BookmarkCheck size={18} />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-3xl font-heading font-black text-brand-white">
              {todayBookingsCount}
            </div>
            <p className="text-[11px] text-brand-white/40">
              Sur {upcomingSessionsToday.length} séance(s) programmée(s)
            </p>
          </div>
        </div>

        {/* Taux d'Occupation Small Group */}
        <div className="bg-[#0f172a]/80 border border-brand-white/10 rounded-xl p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-white/50">
              Remplissage Moyen
            </span>
            <div className="w-9 h-9 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center border border-purple-500/30">
              <Percent size={18} />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-3xl font-heading font-black text-brand-white">
              {occupancyRate}%
            </div>
            <p className="text-[11px] text-brand-white/40">
              Base capacité max 20 pers / cours
            </p>
          </div>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━
          MAIN CONTENT GRID
          ━━━━━━━━━━━━━━━━━━━━ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Cols: Cours du Jour & Dernières Réservations */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Cours du Jour */}
          <div className="bg-[#0b1322] border border-brand-white/10 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-brand-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-brand-blue" />
                <h2 className="text-lg font-heading font-black uppercase tracking-wider text-brand-white">
                  Séances du Jour ({upcomingSessionsToday.length})
                </h2>
              </div>
              <Link
                href="/admin/planning"
                className="text-xs text-brand-blue hover:underline flex items-center gap-1 font-bold uppercase"
              >
                Planning complet <ArrowRight size={12} />
              </Link>
            </div>

            {upcomingSessionsToday.length === 0 ? (
              <div className="text-center py-8 text-brand-white/40 text-xs space-y-2">
                <Calendar size={28} className="mx-auto text-brand-white/20" />
                <p>Aucune séance enregistrée pour aujourd&apos;hui.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingSessionsToday.map((session) => {
                  const startTime = new Date(session.starts_at).toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  const endTime = session.ends_at
                    ? new Date(session.ends_at).toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "";

                  const fillPercentage = Math.min(
                    100,
                    Math.round((session.bookedCount / session.max_capacity) * 100)
                  );

                  return (
                    <div
                      key={session.id}
                      className="bg-[#0f172a] hover:bg-[#162032] border border-brand-white/5 hover:border-brand-blue/30 rounded-xl p-4 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="font-heading font-bold text-base uppercase text-brand-white">
                            {session.discipline}
                          </span>
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-brand-blue/15 text-brand-blue border border-brand-blue/20">
                            {session.type === "small_group" ? "Small Group" : "Collectif"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-brand-white/60">
                          <Clock size={13} className="text-brand-blue" />
                          <span>
                            {startTime} {endTime ? `– ${endTime}` : ""}
                          </span>
                        </div>
                      </div>

                      {/* Remplissage Indicator */}
                      <div className="flex items-center gap-4">
                        <div className="w-28 text-right space-y-1">
                          <div className="text-xs font-bold text-brand-white">
                            {session.bookedCount} / {session.max_capacity} pers.
                          </div>
                          <div className="w-full bg-brand-white/10 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-brand-blue h-full rounded-full transition-all duration-300"
                              style={{ width: `${fillPercentage}%` }}
                            />
                          </div>
                        </div>

                        <Link
                          href={`/admin/reservations?session=${session.id}`}
                          className="px-3 py-1.5 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white text-xs font-semibold rounded uppercase tracking-wider transition-colors border border-brand-white/10"
                        >
                          Émargement
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Dernières Réservations */}
          <div className="bg-[#0b1322] border border-brand-white/10 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-brand-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-[#22c55e]" />
                <h2 className="text-lg font-heading font-black uppercase tracking-wider text-brand-white">
                  Dernières Inscriptions
                </h2>
              </div>
              <Link
                href="/admin/reservations"
                className="text-xs text-brand-blue hover:underline flex items-center gap-1 font-bold uppercase"
              >
                Toutes les réservations <ArrowRight size={12} />
              </Link>
            </div>

            {recentBookings.length === 0 ? (
              <div className="text-center py-6 text-brand-white/40 text-xs">
                Aucune réservation récente.
              </div>
            ) : (
              <div className="divide-y divide-brand-white/5">
                {recentBookings.map((b) => (
                  <div
                    key={b.id}
                    className="py-3 flex items-center justify-between text-xs"
                  >
                    <div className="space-y-0.5">
                      <span className="font-bold text-brand-white block">
                        {b.memberName}
                      </span>
                      <span className="text-brand-white/50">
                        {b.sessionName} · {b.sessionDate} ({b.sessionTime})
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/20">
                      <ShieldCheck size={10} />
                      {b.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Événements & Stages officiels */}
        <div className="space-y-6">
          <div className="bg-[#0b1322] border border-brand-white/10 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-brand-white/10 pb-4">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-brand-blue" />
                <h2 className="text-lg font-heading font-black uppercase tracking-wider text-brand-white">
                  Stages & Événements
                </h2>
              </div>
              <Link
                href="/admin/evenements"
                className="text-xs text-brand-blue hover:underline font-bold uppercase"
              >
                Gérer
              </Link>
            </div>

            <div className="space-y-4">
              {featuredEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="bg-[#0f172a] border border-brand-white/5 hover:border-brand-blue/30 rounded-xl p-4 transition-all space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-brand-blue/20 text-brand-blue border border-brand-blue/30">
                      {evt.categoryLabel}
                    </span>
                    {evt.spots && (
                      <span className="text-[10px] font-bold text-[#22c55e]">
                        {evt.spots}
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-heading font-bold uppercase tracking-wider text-brand-white leading-snug">
                    {evt.title}
                  </h3>

                  <div className="space-y-1 text-[11px] text-brand-white/60">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={12} className="text-brand-blue" />
                      <span>{evt.date}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin size={12} className="text-brand-blue" />
                      <span className="truncate">{evt.location}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-brand-white/5 flex items-center justify-between text-xs">
                    <span className="font-bold text-brand-blue">{evt.price}</span>
                    <Link
                      href="/evenements"
                      target="_blank"
                      className="text-[11px] text-brand-white/50 hover:text-brand-white hover:underline flex items-center gap-1"
                    >
                      Voir page publique <ArrowRight size={10} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
