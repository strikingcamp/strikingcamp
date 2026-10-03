"use client";

import React, { useState } from "react";
import {
  Calendar,
  CheckCircle2,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { ProgramSession } from "@/lib/supabase/defis-platform";
import { KbShredHybridStats } from "@/lib/supabase/defis";
import { MemberDigitalEntitlementsResult } from "@/lib/access-control";
import { completeProgramSessionAction } from "@/app/(membre)/membre/defis/actions";

interface KbShredTabProps {
  kbShredStats: KbShredHybridStats | null;
  entitlements: MemberDigitalEntitlementsResult;
  onOpenUpgradeModal: () => void;
  onReloadStats: () => void;
}

export default function KbShredTab({
  kbShredStats,
  entitlements,
  onOpenUpgradeModal,
  onReloadStats,
}: KbShredTabProps) {
  const program = kbShredStats?.digitalProgram;
  const [selectedSession, setSelectedSession] = useState<ProgramSession | null>(
    program?.sessions?.[0] || null
  );
  const [isCompleting, setIsCompleting] = useState(false);
  const [completedSuccess, setCompletedSuccess] = useState(false);

  const handleCompleteSession = async (sessionId: string) => {
    setIsCompleting(true);
    const res = await completeProgramSessionAction(sessionId);
    setIsCompleting(false);

    if (res.success) {
      setCompletedSuccess(true);
      onReloadStats();
      setTimeout(() => setCompletedSuccess(false), 2000);
    }
  };

  const digitalDone = kbShredStats?.digitalCompletedCount || 0;
  const clubBooked = kbShredStats?.clubBookedCount || 0;
  const clubAttended = kbShredStats?.clubAttendedCount || 0;
  const totalCompleted = digitalDone + clubAttended;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          1. HERO KB SHRED HYBRID
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#0c1322] border border-brand-white/10 shadow-xl relative overflow-hidden space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-blue/15 text-brand-blue border border-brand-blue/30 text-xs font-bold uppercase tracking-wider">
              Protocole Signature Hybride
            </div>
            <h2 className="text-2xl sm:text-3xl font-heading font-black uppercase text-brand-white tracking-wide">
              KB SHRED — Kettlebell & Combat
            </h2>
            <p className="text-xs sm:text-sm text-brand-white/60 max-w-xl leading-relaxed">
              Le protocole métabolique exclusif Striking Camp combinant circuits Kettlebell à haute densité à domicile et créneaux physiques encadrés par nos coachs au club.
            </p>
          </div>

          <Link
            href="/membre/planning"
            className="px-5 py-3 rounded-xl bg-brand-blue hover:bg-brand-white text-brand-black font-heading font-black text-xs uppercase tracking-wider flex items-center gap-2 shrink-0 shadow-md shadow-brand-blue/20 transition-all self-start sm:self-center"
          >
            <Calendar size={15} />
            <span>Réserver au Club</span>
          </Link>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          2. BILAN HEBDOMADAIRE HYBRIDE (RÈGLE STRICTE: BOOKED !== COMPLETED)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="p-6 rounded-2xl bg-[#0c1322] border border-brand-white/10 shadow-xl space-y-4">
        <h3 className="text-xs font-heading font-bold uppercase text-brand-white/70 tracking-wider">
          Bilan KB SHRED & Conditionnement
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Digital Completed */}
          <div className="p-4 rounded-xl bg-[#070c16]/80 border border-brand-white/10 space-y-1">
            <p className="text-[10px] font-semibold text-brand-white/40 uppercase">Digital Réalisé</p>
            <p className="text-2xl font-heading font-black text-brand-white">
              {digitalDone} <span className="text-xs font-normal text-brand-white/40">séances</span>
            </p>
          </div>

          {/* Club Réservées (booked !== completed) */}
          <div className="p-4 rounded-xl bg-[#070c16]/80 border border-brand-white/10 space-y-1">
            <p className="text-[10px] font-semibold text-brand-white/40 uppercase">Club Réservées</p>
            <p className="text-2xl font-heading font-black text-brand-white/80">
              {clubBooked} <span className="text-xs font-normal text-brand-white/40">à venir</span>
            </p>
          </div>

          {/* Club Effectuées */}
          <div className="p-4 rounded-xl bg-[#070c16]/80 border border-brand-white/10 space-y-1">
            <p className="text-[10px] font-semibold text-brand-white/40 uppercase">Club Effectuées</p>
            <p className="text-2xl font-heading font-black text-[#22c55e]">
              {clubAttended} <span className="text-xs font-normal text-brand-white/40">séances</span>
            </p>
          </div>

          {/* Total Effectué */}
          <div className="p-4 rounded-xl bg-brand-blue/15 border border-brand-blue/30 space-y-1">
            <p className="text-[10px] font-bold text-brand-blue uppercase">Total Effectué</p>
            <p className="text-2xl font-heading font-black text-brand-white">
              {totalCompleted} <span className="text-xs font-normal text-brand-white/40">séances</span>
            </p>
          </div>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          3. SÉANCES DU PROTOCOLE DIGITAL KB SHRED
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {program && (
        <div className="p-6 rounded-2xl bg-[#0c1322] border border-brand-white/10 shadow-xl space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-heading font-bold uppercase text-brand-white tracking-wide">
              Séances Numériques KB SHRED
            </h3>
            <span className="text-xs text-brand-white/40">{program.sessions_per_week} séances / semaine</span>
          </div>

          {/* Sessions List */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(program.sessions || []).map((sess, idx) => (
              <button
                key={sess.id}
                onClick={() => setSelectedSession(sess)}
                className={`p-4 rounded-xl border text-left space-y-2 transition-all cursor-pointer ${
                  selectedSession?.id === sess.id
                    ? "bg-brand-blue border-brand-blue text-brand-black shadow-md shadow-brand-blue/20"
                    : "bg-[#070c16]/80 border-brand-white/10 text-brand-white/70 hover:text-brand-white"
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className={selectedSession?.id === sess.id ? "font-bold uppercase text-brand-black" : "font-bold uppercase text-brand-blue"}>
                    Jour {sess.day_number || idx + 1}
                  </span>
                  <span className={selectedSession?.id === sess.id ? "text-[11px] text-brand-black/70" : "text-[11px] text-brand-white/40"}>
                    {sess.duration_minutes} min
                  </span>
                </div>
                <p className={selectedSession?.id === sess.id ? "text-xs sm:text-sm font-bold text-brand-black line-clamp-2 leading-snug" : "text-xs sm:text-sm font-bold text-brand-white line-clamp-2 leading-snug"}>
                  {sess.title}
                </p>
              </button>
            ))}
          </div>

          {/* Detailed Selected Session Card */}
          {selectedSession && (
            <div className="p-5 rounded-2xl bg-[#070c16]/80 border border-brand-white/10 space-y-4 pt-4">
              <div className="space-y-1">
                <h4 className="text-base font-bold text-brand-white">{selectedSession.title}</h4>
                <p className="text-xs text-brand-white/50">{selectedSession.description}</p>
              </div>

              {/* Exercises */}
              {selectedSession.exercises && selectedSession.exercises.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-[11px] font-bold uppercase text-brand-white/60 tracking-wider">
                    Circuit & Exercices :
                  </h5>
                  {selectedSession.exercises.map((exo, i) => (
                    <div
                      key={exo.id || i}
                      className="p-3.5 rounded-xl bg-[#0c1322] border border-brand-white/5 space-y-1"
                    >
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-brand-white">{i + 1}. {exo.name}</span>
                        <span className="text-brand-blue">{exo.sets} séries × {exo.reps_or_duration}</span>
                      </div>
                      {exo.instructions && (
                        <p className="text-[11px] text-brand-white/50 leading-relaxed">{exo.instructions}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Complete Action Button */}
              <div className="pt-2">
                {completedSuccess ? (
                  <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center gap-2">
                    <CheckCircle2 size={16} />
                    <span>Séance KB SHRED validée !</span>
                  </div>
                ) : (
                  <button
                    onClick={() => handleCompleteSession(selectedSession.id)}
                    disabled={isCompleting}
                    className="w-full py-3 rounded-xl bg-brand-blue hover:bg-brand-white text-brand-black font-heading font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-brand-blue/20 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <CheckCircle2 size={16} />
                    <span>{isCompleting ? "Validation..." : "Valider la séance KB SHRED"}</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
