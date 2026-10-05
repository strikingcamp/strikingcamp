"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  ArrowRight,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  WorkoutProgram,
  ProgramSession,
} from "@/lib/supabase/defis-platform";
import { WorkoutBlock, WorkoutFormat } from "@/lib/training/types";
import { V1_REFERENCE_PROGRAMS } from "@/lib/training/reference-programs";
import { KbShredHybridStats } from "@/lib/supabase/defis";
import { MemberDigitalEntitlementsResult } from "@/lib/access-control";
import {
  completeProgramSessionAction,
  getProgramDetailAction,
} from "@/app/(membre)/membre/defis/actions";

interface WorkoutsTabProps {
  programs: WorkoutProgram[];
  kbShredStats: KbShredHybridStats | null;
  entitlements: MemberDigitalEntitlementsResult;
  onOpenUpgradeModal: () => void;
  onNavigateTab: (tab: string) => void;
  onReloadKbShredStats?: () => void;
  onReloadWorkouts?: () => void;
}

/** Helper pour badge de format de bloc */
function getFormatBadgeLabel(format: WorkoutFormat, block: WorkoutBlock) {
  switch (format) {
    case "emom":
      return `EMOM — ${block.time_cap_minutes || block.duration_minutes || 16} MIN`;
    case "amrap":
      return `AMRAP — ${block.time_cap_minutes || 10} MIN`;
    case "tabata":
      return `TABATA — ${block.work_seconds || 20}s / ${block.rest_seconds || 10}s (${block.rounds || 8} rounds)`;
    case "circuit":
      return `CIRCUIT — ${block.rounds || 3} TOURS`;
    case "intervals":
      return `INTERVALLES — ${block.rounds || 2} ROUNDS`;
    case "rounds":
      return `ROUNDS — ${block.rounds || 3} TOURS`;
    case "for_time":
      return `FOR TIME`;
    case "straight_sets":
    default:
      return block.type === "warmup"
        ? `ÉCHAUFFEMENT — ${block.duration_minutes || 5} MIN`
        : block.type === "cooldown"
        ? `RETOUR AU CALME — ${block.duration_minutes || 5} MIN`
        : `SÉRIES DIRECTES`;
  }
}

/** Composant de rendu d'un bloc de séance structuré */
function WorkoutBlockCard({ block }: { block: WorkoutBlock }) {
  const badgeText = getFormatBadgeLabel(block.format, block);

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-[#0c1322] border border-brand-white/10 space-y-3">
      {/* Header du bloc */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-brand-white/5 pb-2.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-heading font-black uppercase px-2.5 py-0.5 rounded-full bg-brand-blue/15 text-brand-blue border border-brand-blue/30 tracking-wider">
              {badgeText}
            </span>
            {block.type === "warmup" && (
              <span className="text-[10px] font-bold uppercase text-brand-white/40">Préparation</span>
            )}
            {block.type === "cooldown" && (
              <span className="text-[10px] font-bold uppercase text-brand-white/40">Récupération</span>
            )}
          </div>
          <h5 className="text-sm sm:text-base font-heading font-bold text-brand-white uppercase mt-1">
            {block.title}
          </h5>
        </div>

        {/* Méta du bloc (repos inter-tours, work/rest) */}
        <div className="text-left sm:text-right text-[11px] text-brand-white/50 space-y-0.5">
          {block.rest_between_rounds_seconds && (
            <div>Repos inter-tours : {block.rest_between_rounds_seconds}s</div>
          )}
          {block.work_seconds && block.rest_seconds && (
            <div>{block.work_seconds}s effort / {block.rest_seconds}s repos</div>
          )}
        </div>
      </div>

      {/* Consignes du bloc si présentes */}
      {block.instructions && (
        <p className="text-xs text-brand-white/60 leading-relaxed italic bg-brand-white/[0.02] p-2.5 rounded-xl border border-brand-white/5">
          {block.instructions}
        </p>
      )}

      {/* Liste des exercices du bloc */}
      <div className="space-y-2 pt-1">
        {block.exercises.map((exo, idx) => (
          <div
            key={exo.id || idx}
            className="p-3 rounded-xl bg-[#070c16]/80 border border-brand-white/5 space-y-1"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs sm:text-sm font-bold text-brand-white">
                {idx + 1}. {exo.name}
              </span>

              {/* Répétitions / Durée / Format d'effort */}
              <span className="text-xs font-heading font-black text-brand-blue shrink-0">
                {exo.sets && exo.sets > 1 ? `${exo.sets} séries × ` : ""}
                {exo.reps !== undefined
                  ? typeof exo.reps === "number"
                    ? `${exo.reps} reps`
                    : exo.reps
                  : exo.work_seconds !== undefined
                  ? `${exo.work_seconds}s travail`
                  : exo.duration_seconds !== undefined
                  ? `${Math.round(exo.duration_seconds / 60)} min`
                  : ""}
              </span>
            </div>

            {exo.instructions && (
              <p className="text-[11px] text-brand-white/60 leading-relaxed">
                {exo.instructions}
              </p>
            )}

            {/* Méta d'exercice (repos individuel, transition, côté) */}
            <div className="text-[10px] text-brand-white/40 flex flex-wrap items-center gap-2 pt-0.5">
              {exo.rest_seconds !== undefined && exo.rest_seconds > 0 && (
                <span>Repos : {exo.rest_seconds}s</span>
              )}
              {exo.transition_seconds !== undefined && exo.transition_seconds > 0 && (
                <span>Transition : {exo.transition_seconds}s</span>
              )}
              {exo.side && (
                <span>Côté : {exo.side === "alternate" ? "Alterné" : exo.side === "both" ? "Chaque côté" : exo.side}</span>
              )}
              {exo.load_recommendation && (
                <span>Charge : {exo.load_recommendation}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function WorkoutsTab({
  programs: propPrograms,
  kbShredStats,
  entitlements,
  onOpenUpgradeModal,
  onReloadKbShredStats,
  onReloadWorkouts,
}: WorkoutsTabProps) {
  // Utilisation prioritaire de la bibliothèque officielle V1 (12 programmes)
  const allPrograms = propPrograms && propPrograms.length > 0 ? propPrograms : V1_REFERENCE_PROGRAMS;

  // 1. Les 2 Univers d'entraînement stricts : "home" (MAISON) et "striking_camp" (STRIKING CAMP)
  const [selectedUniverse, setSelectedUniverse] = useState<"home" | "striking_camp">("home");

  // 2. Filtres MAISON uniquement : "all", "bodyweight" (Poids du corps), "kettlebell" (Kettlebell)
  // AUCUN Dumbbell ni Salle.
  const [homeEquipmentFilter, setHomeEquipmentFilter] = useState<"all" | "bodyweight" | "kettlebell">("all");

  // 3. Sous-section STRIKING CAMP : "kb_shred" | "cours_adultes"
  const [strikingSubSection, setStrikingSubSection] = useState<"kb_shred" | "cours_adultes">("kb_shred");

  // Selected Program Modal State
  const [selectedProgram, setSelectedProgram] = useState<WorkoutProgram | null>(null);
  const [selectedSession, setSelectedSession] = useState<ProgramSession | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completionSuccess, setCompletionSuccess] = useState(false);

  // Filtrage strict des programmes MAISON (Poids du corps & Kettlebell uniquement)
  const homePrograms = allPrograms.filter((p) => {
    if (p.location === "gym") return false;
    if (p.is_kb_shred || p.location === "hybrid") return false;
    if (homeEquipmentFilter === "bodyweight") {
      const hasKettlebell = p.required_equipment?.some((eq: string) =>
        eq.toLowerCase().includes("kettlebell")
      );
      return !hasKettlebell;
    }
    if (homeEquipmentFilter === "kettlebell") {
      return p.required_equipment?.some((eq: string) =>
        eq.toLowerCase().includes("kettlebell")
      );
    }
    return true;
  });

  // Filtrage strict des programmes KB SHRED (Hybride : Kettlebell + Boxe + Poids du corps)
  const kbShredPrograms = allPrograms.filter((p) => p.is_kb_shred || p.location === "hybrid");

  const handleOpenProgram = async (program: WorkoutProgram) => {
    setSelectedProgram(program);
    if (program.sessions && program.sessions.length > 0) {
      setSelectedSession(program.sessions[0]);
    }
    const res = await getProgramDetailAction(program.id);
    if (res.success && res.data) {
      setSelectedProgram(res.data);
      if (res.data.sessions && res.data.sessions.length > 0) {
        setSelectedSession(res.data.sessions[0]);
      }
    }
  };

  const handleCompleteSession = async (sessionId: string) => {
    setIsCompleting(true);
    const res = await completeProgramSessionAction(sessionId);
    setIsCompleting(false);

    if (res.success) {
      setCompletionSuccess(true);
      if (selectedSession) {
        setSelectedSession({ ...selectedSession, is_completed: true });
      }
      if (selectedProgram && selectedProgram.sessions) {
        setSelectedProgram({
          ...selectedProgram,
          sessions: selectedProgram.sessions.map((s) =>
            s.id === sessionId ? { ...s, is_completed: true } : s
          ),
        });
      }
      if (onReloadKbShredStats) onReloadKbShredStats();
      if (onReloadWorkouts) onReloadWorkouts();
      setTimeout(() => setCompletionSuccess(false), 2000);
    }
  };

  const digitalDone = kbShredStats?.digitalCompletedCount || 0;
  const clubBooked = kbShredStats?.clubBookedCount || 0;
  const clubAttended = kbShredStats?.clubAttendedCount || 0;
  const totalKbCompleted = digitalDone + clubAttended;

  return (
    <div className="w-full space-y-5 sm:space-y-6">
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          1. NAVIGATION PRINCIPALE : LES 2 UNIVERS (MAISON / STRIKING CAMP)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {/* Univers MAISON */}
        <button
          type="button"
          onClick={() => setSelectedUniverse("home")}
          className={`p-4 sm:p-5 rounded-2xl border text-left space-y-1.5 transition-all cursor-pointer ${
            selectedUniverse === "home"
              ? "bg-brand-blue border-brand-blue text-brand-black shadow-lg shadow-brand-blue/20"
              : "bg-[#0c1322] border-brand-white/10 hover:border-brand-blue/30"
          }`}
        >
          <div className="flex items-center justify-between">
            <h4 className={selectedUniverse === "home" ? "text-base sm:text-lg font-heading font-black uppercase text-brand-black" : "text-base sm:text-lg font-heading font-black uppercase text-brand-white"}>
              Maison
            </h4>
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${
              selectedUniverse === "home"
                ? "bg-brand-black/20 text-brand-black"
                : "bg-brand-white/10 text-brand-white/60"
            }`}>
              {homePrograms.length} Programmes
            </span>
          </div>
          <p className={selectedUniverse === "home" ? "text-xs text-brand-black/70" : "text-xs text-brand-white/50"}>
            Poids du corps • Kettlebell
          </p>
        </button>

        {/* Univers STRIKING CAMP */}
        <button
          type="button"
          onClick={() => setSelectedUniverse("striking_camp")}
          className={`p-4 sm:p-5 rounded-2xl border text-left space-y-1.5 transition-all cursor-pointer ${
            selectedUniverse === "striking_camp"
              ? "bg-brand-blue border-brand-blue text-brand-black shadow-lg shadow-brand-blue/20"
              : "bg-[#0c1322] border-brand-white/10 hover:border-brand-blue/30"
          }`}
        >
          <div className="flex items-center justify-between">
            <h4 className={selectedUniverse === "striking_camp" ? "text-base sm:text-lg font-heading font-black uppercase text-brand-black" : "text-base sm:text-lg font-heading font-black uppercase text-brand-white"}>
              Striking Camp
            </h4>
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${
              selectedUniverse === "striking_camp"
                ? "bg-brand-black/20 text-brand-black"
                : "bg-brand-blue/20 text-brand-blue border border-brand-blue/30"
            }`}>
              {kbShredPrograms.length} KB SHRED • Club
            </span>
          </div>
          <p className={selectedUniverse === "striking_camp" ? "text-xs text-brand-black/70" : "text-xs text-brand-white/50"}>
            Entraînements Hybrides • Cours Small Group en Club
          </p>
        </button>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          2. VUE UNIVERSE : MAISON (Poids du corps & Kettlebell)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {selectedUniverse === "home" && (
        <div className="space-y-6">
          {/* Filtres Matériel : Tous | Poids du corps | Kettlebell */}
          <div className="p-4 rounded-2xl bg-[#0c1322] border border-brand-white/10 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase text-brand-white/50 mr-1">Matériel :</span>
            {[
              { id: "all" as const, label: "Tous" },
              { id: "bodyweight" as const, label: "Poids du corps" },
              { id: "kettlebell" as const, label: "Kettlebell" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setHomeEquipmentFilter(f.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-heading font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  homeEquipmentFilter === f.id
                    ? "bg-brand-blue text-brand-black shadow-md shadow-brand-blue/20"
                    : "bg-brand-white/5 text-brand-white/60 hover:text-brand-white hover:bg-brand-white/10 border border-brand-white/10"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Grille Programmes Maison */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-heading font-bold uppercase text-brand-white/70 tracking-wider">
                Programmes Disponibles ({homePrograms.length})
              </h3>
              <span className="text-xs text-brand-white/40">
                Séances complètes découpées en blocs
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {homePrograms.map((program) => {
                return (
                  <div
                    key={program.id}
                    onClick={() => handleOpenProgram(program)}
                    className="p-5 rounded-2xl bg-[#0c1322] border border-brand-white/10 hover:border-brand-blue/40 shadow-xl cursor-pointer transition-all space-y-4 group hover:translate-y-[-2px]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-brand-blue/15 text-brand-blue border border-brand-blue/30">
                            {program.level}
                          </span>
                        </div>
                        <h4 className="text-base font-bold text-brand-white group-hover:text-brand-blue transition-colors leading-snug">
                          {program.title}
                        </h4>
                      </div>

                      <div className="px-2.5 py-1 rounded-lg bg-brand-white/5 border border-brand-white/10 text-[11px] font-semibold text-brand-white/70 shrink-0">
                        {program.sessions_per_week} s/sem
                      </div>
                    </div>

                    <p className="text-xs text-brand-white/60 line-clamp-2">
                      {program.description}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-brand-white/5 text-xs">
                      <span className="text-brand-white/40">Durée : {program.duration_weeks} sem</span>
                      <span className="font-heading font-bold uppercase text-brand-blue group-hover:translate-x-1 transition-transform flex items-center gap-1">
                        <span>Voir la séance</span>
                        <ArrowRight size={13} />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          3. VUE UNIVERSE : STRIKING CAMP (KB SHRED & COURS ADULTES)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {selectedUniverse === "striking_camp" && (
        <div className="space-y-6">
          {/* Sous-navigation STRIKING CAMP : KB SHRED | COURS ADULTES */}
          <div className="flex rounded-2xl bg-[#0c1322] border border-brand-white/10 p-1.5 gap-2">
            <button
              onClick={() => setStrikingSubSection("kb_shred")}
              className={`flex-1 py-3 px-4 rounded-xl text-xs font-heading font-black uppercase tracking-wider transition-all cursor-pointer text-center ${
                strikingSubSection === "kb_shred"
                  ? "bg-brand-blue text-brand-black shadow-md shadow-brand-blue/20"
                  : "text-brand-white/60 hover:text-brand-white hover:bg-brand-white/5"
              }`}
            >
              KB SHRED ({kbShredPrograms.length} Programmes)
            </button>
            <button
              onClick={() => setStrikingSubSection("cours_adultes")}
              className={`flex-1 py-3 px-4 rounded-xl text-xs font-heading font-black uppercase tracking-wider transition-all cursor-pointer text-center ${
                strikingSubSection === "cours_adultes"
                  ? "bg-brand-blue text-brand-black shadow-md shadow-brand-blue/20"
                  : "text-brand-white/60 hover:text-brand-white hover:bg-brand-white/5"
              }`}
            >
              Cours Adultes
            </button>
          </div>

          {/* 3.A. SOUS-SECTION : KB SHRED (Entraînements Hybrides) */}
          {strikingSubSection === "kb_shred" && (
            <div className="space-y-6">
              {/* Hero Banner KB SHRED */}
              <div className="p-6 sm:p-8 rounded-2xl bg-[#0c1322] border border-brand-white/10 shadow-xl relative overflow-hidden space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-brand-blue/15 text-brand-blue border border-brand-blue/30 text-xs font-bold uppercase tracking-wider">
                      Protocole Hybride Signature
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-heading font-black uppercase text-brand-white tracking-wide">
                      KB SHRED HYBRIDE
                    </h2>
                    <p className="text-xs sm:text-sm text-brand-white/60 max-w-xl leading-relaxed">
                      Entraînements hybrides combinant Kettlebell, Boxe (shadow, frappes, déplacements) et Poids du corps pour développer la puissance, l'explosivité et le cardio combat.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#070c16]/80 border border-brand-white/10 text-center space-y-1 shrink-0">
                    <span className="text-[10px] font-bold text-brand-white/40 uppercase block">Total Séances</span>
                    <span className="text-2xl font-heading font-black text-brand-blue">
                      {totalKbCompleted} <span className="text-xs font-normal text-brand-white/40">validées</span>
                    </span>
                  </div>
                </div>

                {/* KPI Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="p-3.5 rounded-xl bg-[#070c16]/80 border border-brand-white/10 space-y-1">
                    <p className="text-[11px] font-semibold text-brand-white/40 uppercase">Séances Digitales</p>
                    <p className="text-xl font-heading font-black text-brand-white">{digitalDone}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#070c16]/80 border border-brand-white/10 space-y-1">
                    <p className="text-[11px] font-semibold text-brand-white/40 uppercase">Cours Réservés</p>
                    <p className="text-xl font-heading font-black text-brand-white">{clubBooked}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#070c16]/80 border border-brand-white/10 space-y-1">
                    <p className="text-[11px] font-semibold text-brand-white/40 uppercase">Cours Effectués</p>
                    <p className="text-xl font-heading font-black text-brand-white">{clubAttended}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#070c16]/80 border border-brand-white/10 space-y-1">
                    <p className="text-[11px] font-semibold text-brand-white/40 uppercase">Format</p>
                    <p className="text-base font-heading font-black text-brand-blue">Hybride</p>
                  </div>
                </div>
              </div>

              {/* Grille des Programmes KB SHRED */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-heading font-bold uppercase text-brand-white/70 tracking-wider">
                    Programmes KB SHRED ({kbShredPrograms.length})
                  </h3>
                  <span className="text-xs text-brand-white/40">
                    Kettlebell • Boxe • Poids du corps
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {kbShredPrograms.map((program) => {
                    return (
                      <div
                        key={program.id}
                        onClick={() => handleOpenProgram(program)}
                        className="p-5 rounded-2xl bg-[#0c1322] border border-brand-white/10 hover:border-brand-blue/40 shadow-xl cursor-pointer transition-all space-y-4 group hover:translate-y-[-2px]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-brand-blue/15 text-brand-blue border border-brand-blue/30">
                                {program.level}
                              </span>
                              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-brand-white/10 text-brand-white/80 border border-brand-white/20">
                                Hybride
                              </span>
                            </div>
                            <h4 className="text-base font-bold text-brand-white group-hover:text-brand-blue transition-colors leading-snug">
                              {program.title}
                            </h4>
                          </div>

                          <div className="px-2.5 py-1 rounded-lg bg-brand-white/5 border border-brand-white/10 text-[11px] font-semibold text-brand-white/70 shrink-0">
                            {program.sessions_per_week} s/sem
                          </div>
                        </div>

                        <p className="text-xs text-brand-white/60 line-clamp-2">
                          {program.description}
                        </p>

                        <div className="flex items-center justify-between pt-2 border-t border-brand-white/5 text-xs">
                          <span className="text-brand-white/40">Durée : {program.duration_weeks} sem</span>
                          <span className="font-heading font-bold uppercase text-brand-blue group-hover:translate-x-1 transition-transform flex items-center gap-1">
                            <span>Voir la séance</span>
                            <ArrowRight size={13} />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 3.B. SOUS-SECTION : COURS ADULTES (Small Group Physique) */}
          {strikingSubSection === "cours_adultes" && (
            <div className="space-y-6">
              {/* Carte Principale Cours Adultes */}
              <div className="p-6 sm:p-8 rounded-2xl bg-[#0c1322] border border-brand-white/10 shadow-xl space-y-6">
                <div className="space-y-2">
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-brand-blue/15 text-brand-blue border border-brand-blue/30 text-xs font-bold uppercase tracking-wider">
                    Présentiel • Small Group
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-heading font-black uppercase text-brand-white tracking-wide">
                    Cours Adultes en Club
                  </h2>
                  <p className="text-xs sm:text-sm text-brand-white/60 max-w-xl leading-relaxed">
                    Entraînement physique coaché en petit groupe au club Striking Camp. Accédez directement au planning des cours collectifs et réservez vos séances.
                  </p>
                </div>

                {/* Points forts des cours adultes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-[#070c16]/80 border border-brand-white/10 space-y-1">
                    <span className="text-xs font-heading font-bold uppercase text-brand-blue block">
                      Boxe & Frappe
                    </span>
                    <p className="text-xs text-brand-white/60">
                      Travail technique aux sacs, combinaisons de frappes et cardio combat à haute intensité.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#070c16]/80 border border-brand-white/10 space-y-1">
                    <span className="text-xs font-heading font-bold uppercase text-brand-blue block">
                      Kettlebell & Conditioning
                    </span>
                    <p className="text-xs text-brand-white/60">
                      Renforcement fonctionnel, gainage dynamique, puissance et endurance musculaire.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#070c16]/80 border border-brand-white/10 space-y-1">
                    <span className="text-xs font-heading font-bold uppercase text-brand-blue block">
                      Small Group Encadré
                    </span>
                    <p className="text-xs text-brand-white/60">
                      Nombre de participants limité pour un coaching rapproché et une correction technique continue.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#070c16]/80 border border-brand-white/10 space-y-1">
                    <span className="text-xs font-heading font-bold uppercase text-brand-blue block">
                      Striking Camp Marseille
                    </span>
                    <p className="text-xs text-brand-white/60">
                      268 avenue de la Capelette, 13010 Marseille.
                    </p>
                  </div>
                </div>

                {/* Bouton d'accès direct au planning des cours adultes */}
                <div className="pt-2">
                  <Link
                    href="/membre/planning"
                    className="w-full py-4 px-6 rounded-xl bg-brand-blue hover:bg-brand-white text-brand-black text-sm font-heading font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-brand-blue/20 cursor-pointer"
                  >
                    <span>Accéder au Planning des Cours Adultes</span>
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          4. MODAL DU PROGRAMME SÉLECTIONNÉ (MAISON OU KB SHRED)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {selectedProgram && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-2xl max-h-[92vh] sm:max-h-[88vh] flex flex-col bg-[#0c1322] border border-brand-white/15 rounded-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
            {/* Header fixe de la modale */}
            <div className="shrink-0 p-4 sm:p-6 border-b border-brand-white/10 bg-[#0c1322] flex items-start justify-between gap-3 sm:gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-brand-blue/15 text-brand-blue border border-brand-blue/30">
                    {selectedProgram.level}
                  </span>
                  <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-brand-white/10 text-brand-white/70 border border-brand-white/15">
                    {selectedProgram.location === "home" ? "Maison" : "Striking Camp"}
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-heading font-black uppercase text-brand-white break-words">
                  {selectedProgram.title}
                </h3>
                <p className="text-xs text-brand-white/60 line-clamp-2 sm:line-clamp-none">{selectedProgram.description}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProgram(null)}
                aria-label="Fermer"
                className="p-1.5 rounded-lg text-brand-white/50 hover:text-brand-white hover:bg-brand-white/10 transition-colors shrink-0 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Corps défilable de la modale */}
            <div className="overflow-y-auto flex-1 p-3.5 sm:p-6 space-y-5 sm:space-y-6">
              {selectedProgram.sessions && selectedProgram.sessions.length > 0 && (
                <div className="space-y-3.5">
                  <h4 className="text-xs font-heading font-bold uppercase text-brand-white/70 tracking-wider">
                    Séances du Programme ({selectedProgram.sessions.length})
                  </h4>

                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {selectedProgram.sessions.map((sess, idx) => (
                      <button
                        key={sess.id}
                        type="button"
                        onClick={() => setSelectedSession(sess)}
                        className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-heading font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                          selectedSession?.id === sess.id
                            ? "bg-brand-blue text-brand-black shadow-md shadow-brand-blue/20"
                            : "bg-[#070c16]/80 border border-brand-white/10 text-brand-white/70 hover:text-brand-white"
                        }`}
                      >
                        {sess.is_completed && <CheckCircle2 size={13} className="text-[#22c55e] shrink-0" />}
                        <span>Jour {sess.day_number || idx + 1} : {sess.title}</span>
                      </button>
                    ))}
                  </div>

                  {selectedSession && (
                    <div className="p-5 rounded-2xl bg-[#070c16]/80 border border-brand-white/10 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h5 className="text-base font-bold text-brand-white">
                            {selectedSession.title}
                          </h5>
                          <p className="text-xs text-brand-white/50">{selectedSession.description}</p>
                        </div>

                        <span className="px-2.5 py-1 rounded-lg bg-brand-white/5 border border-brand-white/10 text-xs font-semibold text-brand-white/70 shrink-0">
                          {selectedSession.duration_minutes} min
                        </span>
                      </div>

                      {/* Déroulé par Blocs structurés */}
                      {selectedSession.blocks && selectedSession.blocks.length > 0 ? (
                        <div className="space-y-4 pt-1">
                          {selectedSession.blocks.map((block) => (
                            <WorkoutBlockCard key={block.id} block={block} />
                          ))}
                        </div>
                      ) : (
                        /* Fallback exercices */
                        selectedSession.exercises && selectedSession.exercises.length > 0 && (
                          <div className="space-y-2.5 pt-1">
                            <h6 className="text-[11px] font-bold uppercase text-brand-white/60 tracking-wider">
                              Déroulé de la séance ({selectedSession.exercises.length} étapes) :
                            </h6>
                            {selectedSession.exercises.map((exo, i) => (
                              <div
                                key={exo.id || i}
                                className="p-3.5 rounded-xl bg-[#0c1322] border border-brand-white/5 space-y-1"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-bold text-brand-white">
                                    {i + 1}. {exo.name}
                                  </span>
                                  <span className="text-xs font-heading font-black text-brand-blue">
                                    {exo.sets > 1 ? `${exo.sets} séries × ` : ""}{exo.reps_or_duration}
                                  </span>
                                </div>
                                {exo.instructions && (
                                  <p className="text-[11px] text-brand-white/60 leading-relaxed">
                                    {exo.instructions}
                                  </p>
                                )}
                                <div className="text-[10px] text-brand-white/40">
                                  Repos : {exo.rest_seconds} sec
                                </div>
                              </div>
                            ))}
                          </div>
                        )
                      )}

                      <div className="pt-3 border-t border-brand-white/10">
                        {completionSuccess ? (
                          <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center gap-2">
                            <CheckCircle2 size={16} />
                            <span>Séance validée avec succès !</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleCompleteSession(selectedSession.id)}
                            disabled={isCompleting || selectedSession.is_completed}
                            className={`w-full py-3 rounded-xl font-heading font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                              selectedSession.is_completed
                                ? "bg-brand-white/10 text-brand-white/60 border border-brand-white/20 cursor-default"
                                : "bg-brand-blue hover:bg-brand-white text-brand-black shadow-md shadow-brand-blue/20"
                            }`}
                          >
                            <CheckCircle2 size={16} />
                            <span>
                              {selectedSession.is_completed
                                ? "Séance déjà terminée"
                                : isCompleting
                                ? "Validation..."
                                : "Valider cette séance comme terminée"}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
