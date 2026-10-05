"use client";

import React, { useState } from "react";
import {
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
  CheckCircle2,
} from "lucide-react";
import { WeightProgressionStats, UserWorkoutCompletionHistoryItem } from "@/lib/supabase/defis";
import { V1_REFERENCE_PROGRAMS } from "@/lib/training/reference-programs";
import {
  addWeightLogAction,
  deleteWeightLogAction,
} from "@/app/(membre)/membre/defis/actions";

interface ProgressionTabProps {
  weightStats: WeightProgressionStats | null;
  workoutCompletions?: UserWorkoutCompletionHistoryItem[];
  onReloadHistory: () => void;
}

export default function ProgressionTab({
  weightStats,
  workoutCompletions = [],
  onReloadHistory,
}: ProgressionTabProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [weightInput, setWeightInput] = useState("");
  const [logDate, setLogDate] = useState(new Date().toISOString().split("T")[0]);
  const [waistCm, setWaistCm] = useState("");
  const [armCm, setArmCm] = useState("");
  const [thighCm, setThighCm] = useState("");
  const [chestCm, setChestCm] = useState("");
  const [notes, setNotes] = useState("");

  const logs = weightStats?.logs || [];
  const initialWeight = weightStats?.initialWeightKg;
  const currentWeight = weightStats?.currentWeightKg;
  const targetWeight = weightStats?.targetWeightKg;
  const totalDelta = weightStats?.totalDeltaKg;

  const handleSaveWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    const w = Number(weightInput);
    if (!w || w <= 20 || w >= 350) return;

    setIsSubmitting(true);
    const res = await addWeightLogAction({
      weight_kg: w,
      logged_at: logDate,
      waist_cm: waistCm ? Number(waistCm) : null,
      arm_cm: armCm ? Number(armCm) : null,
      thigh_cm: thighCm ? Number(thighCm) : null,
      chest_cm: chestCm ? Number(chestCm) : null,
      notes: notes || null,
    });
    setIsSubmitting(false);

    if (res.success) {
      setIsAddOpen(false);
      setWeightInput("");
      setNotes("");
      onReloadHistory();
    }
  };

  const handleDelete = async (logId: string) => {
    const res = await deleteWeightLogAction(logId);
    if (res.success) {
      onReloadHistory();
    }
  };

  // SVG Chart Calculations
  const chartWidth = 600;
  const chartHeight = 200;
  const padding = 30;

  const minWeight = logs.length > 0 ? Math.min(...logs.map((l) => l.weight_kg), targetWeight || Infinity) - 2 : 60;
  const maxWeight = logs.length > 0 ? Math.max(...logs.map((l) => l.weight_kg), targetWeight || -Infinity) + 2 : 100;
  const range = maxWeight - minWeight || 1;

  const points = logs.map((log, index) => {
    const x = padding + (index / Math.max(1, logs.length - 1)) * (chartWidth - padding * 2);
    const y = chartHeight - padding - ((log.weight_kg - minWeight) / range) * (chartHeight - padding * 2);
    return { x, y, weight: log.weight_kg, date: log.logged_at };
  });

  const pathD = points.length > 0
    ? points.reduce((acc, pt, i) => (i === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`), "")
    : "";

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          1. STATS OVERVIEW CARDS
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Poids Initial */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0c1322] border border-brand-white/10 space-y-1">
          <p className="text-[10px] sm:text-[11px] font-semibold text-brand-white/40 uppercase">Poids Initial</p>
          <p className="text-lg sm:text-2xl font-heading font-black text-brand-white">
            {initialWeight !== null && initialWeight !== undefined ? `${initialWeight}` : "—"}{" "}
            <span className="text-xs font-normal text-brand-white/40">kg</span>
          </p>
        </div>

        {/* Poids Actuel */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0c1322] border border-brand-white/10 space-y-1">
          <p className="text-[10px] sm:text-[11px] font-semibold text-brand-white/40 uppercase">Poids Actuel</p>
          <p className="text-lg sm:text-2xl font-heading font-black text-brand-blue">
            {currentWeight !== null && currentWeight !== undefined ? `${currentWeight}` : "—"}{" "}
            <span className="text-xs font-normal text-brand-white/40">kg</span>
          </p>
        </div>

        {/* Poids Cible */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0c1322] border border-brand-white/10 space-y-1">
          <p className="text-[10px] sm:text-[11px] font-semibold text-brand-white/40 uppercase">Objectif Cible</p>
          <p className="text-lg sm:text-2xl font-heading font-black text-brand-white/90">
            {targetWeight !== null && targetWeight !== undefined ? `${targetWeight}` : "—"}{" "}
            <span className="text-xs font-normal text-brand-white/40">kg</span>
          </p>
        </div>

        {/* Delta & Progression */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0c1322] border border-brand-white/10 space-y-1">
          <p className="text-[10px] sm:text-[11px] font-semibold text-brand-white/40 uppercase">Évolution Totale</p>
          <div className="flex items-center gap-1.5">
            {totalDelta !== null && totalDelta !== undefined ? (
              <>
                {totalDelta <= 0 ? (
                  <TrendingDown size={16} className="text-brand-blue shrink-0" />
                ) : (
                  <TrendingUp size={16} className="text-brand-white/80 shrink-0" />
                )}
                <span className="text-lg sm:text-2xl font-heading font-black text-brand-white">
                  {totalDelta > 0 ? `+${totalDelta}` : totalDelta} kg
                </span>
              </>
            ) : (
              <span className="text-lg sm:text-xl font-heading font-bold text-brand-white/40">—</span>
            )}
          </div>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          2. GRAPHIQUE SVG RESPONSIVE DE PROGRESSION
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="p-4 sm:p-6 rounded-2xl bg-[#0c1322] border border-brand-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h3 className="text-sm sm:text-base font-heading font-bold uppercase text-brand-white tracking-wide">
              Courbe d'Évolution du Poids
            </h3>
            <p className="text-[11px] sm:text-xs text-brand-white/40">Historique chronologique de vos pesées enregistrées</p>
          </div>

          <button
            onClick={() => {
              setWeightInput(currentWeight ? String(currentWeight) : "");
              setLogDate(new Date().toISOString().split("T")[0]);
              setIsAddOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-brand-blue hover:bg-brand-white text-brand-black text-xs font-heading font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md shadow-brand-blue/20 self-start sm:self-center cursor-pointer"
          >
            <Plus size={15} />
            <span>Ajouter une pesée</span>
          </button>
        </div>

        {/* SVG Container */}
        {logs.length < 2 ? (
          <div className="p-8 rounded-xl bg-brand-white/[0.02] border border-brand-white/5 text-center space-y-2">
            <p className="text-sm font-bold text-brand-white">Enregistrez au moins 2 pesées pour afficher la courbe.</p>
            <p className="text-xs text-brand-white/40">Cliquez sur « Ajouter une pesée » pour commencer.</p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto pt-2">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-48 sm:h-60 overflow-visible"
            >
              {/* Target Line if exists */}
              {targetWeight && (
                <line
                  x1={padding}
                  y1={chartHeight - padding - ((targetWeight - minWeight) / range) * (chartHeight - padding * 2)}
                  x2={chartWidth - padding}
                  y2={chartHeight - padding - ((targetWeight - minWeight) / range) * (chartHeight - padding * 2)}
                  stroke="#2faee0"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                  opacity="0.6"
                />
              )}

              {/* Curve Line */}
              <path
                d={pathD}
                fill="none"
                stroke="#2faee0"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Data Points */}
              {points.map((pt, i) => (
                <g key={i}>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="5"
                    fill="#070c16"
                    stroke="#2faee0"
                    strokeWidth="2.5"
                  />
                  <text
                    x={pt.x}
                    y={pt.y - 10}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="10"
                    fontWeight="bold"
                  >
                    {pt.weight}
                  </text>
                  <text
                    x={pt.x}
                    y={chartHeight - 8}
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize="9"
                  >
                    {new Date(pt.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        )}
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          3. PROGRESSION RÉELLE DES ENTRAÎNEMENTS
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="p-4 sm:p-6 rounded-2xl bg-[#0c1322] border border-brand-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-0.5">
            <h3 className="text-sm sm:text-base font-heading font-bold uppercase text-brand-white tracking-wide">
              Progression des Entraînements
            </h3>
            <p className="text-[11px] sm:text-xs text-brand-white/40">Suivi des séances validées par programme</p>
          </div>
          <span className="text-[11px] sm:text-xs font-heading font-black text-brand-blue uppercase px-3 py-1 rounded-full bg-brand-blue/15 border border-brand-blue/30 self-start sm:self-center shrink-0">
            {workoutCompletions.length} séance(s) validée(s)
          </span>
        </div>

        {/* Liste des programmes avec progression calculée */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {V1_REFERENCE_PROGRAMS.map((prog) => {
            const totalSessions = prog.sessions?.length || 3;
            const completedCount = prog.sessions?.filter((sess) =>
              workoutCompletions.some((c) => c.sessionId === sess.id)
            ).length || 0;
            const progressPercent = Math.round((completedCount / totalSessions) * 100);

            if (completedCount === 0 && workoutCompletions.length > 0) return null;

            return (
              <div
                key={prog.id}
                className="p-3.5 sm:p-4 rounded-xl bg-[#070c16]/80 border border-brand-white/5 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-heading font-bold uppercase text-brand-white truncate">
                    {prog.title}
                  </span>
                  <span className="text-xs font-heading font-black text-brand-blue shrink-0">
                    {completedCount} / {totalSessions} ({progressPercent}%)
                  </span>
                </div>

                <div className="w-full h-1.5 bg-black/60 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      progressPercent === 100 ? "bg-[#22c55e]" : "bg-brand-blue"
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          4. HISTORIQUE DES ENTRAÎNEMENTS RÉALISÉS
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="p-4 sm:p-6 rounded-2xl bg-[#0c1322] border border-brand-white/10 space-y-4">
        <h3 className="text-xs font-heading font-bold uppercase text-brand-white/70 tracking-wider">
          Historique des Séances Validées ({workoutCompletions.length})
        </h3>

        {workoutCompletions.length === 0 ? (
          <p className="text-xs text-brand-white/40 italic py-2">
            Aucune séance validée pour le moment. Lancez un entraînement depuis l&apos;onglet Entraînement.
          </p>
        ) : (
          <div className="space-y-2">
            {workoutCompletions.map((comp) => (
              <div
                key={comp.id}
                className="p-3 sm:p-3.5 rounded-xl bg-[#070c16]/60 border border-brand-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 group hover:border-brand-blue/30 transition-all"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-[#22c55e] shrink-0" />
                    <span className="text-xs font-heading font-bold uppercase text-brand-white truncate">
                      {comp.programTitle} — Jour {comp.dayNumber} : {comp.sessionTitle}
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-brand-white/40 pl-5">
                    {new Date(comp.completedAt).toLocaleDateString("fr-FR", {
                      weekday: "short",
                      day: "numeric",
                      month: "long",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    • Durée : {comp.durationMinutes} min
                  </p>
                </div>

                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-brand-white/5 text-brand-white/60 border border-brand-white/10 shrink-0 self-start sm:self-center">
                  Terminée
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          5. HISTORIQUE DÉTAILLÉ DES PESÉES
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="p-4 sm:p-6 rounded-2xl bg-[#0c1322] border border-brand-white/10 space-y-4">
        <h3 className="text-xs font-heading font-bold uppercase text-brand-white/70 tracking-wider">
          Historique des Pesées ({logs.length})
        </h3>

        {logs.length === 0 ? (
          <p className="text-xs text-brand-white/40 italic py-2">Aucune pesée enregistrée pour le moment.</p>
        ) : (
          <div className="space-y-2">
            {[...logs].reverse().map((log) => (
              <div
                key={log.id}
                className="p-3 sm:p-3.5 rounded-xl bg-[#070c16]/60 border border-brand-white/5 flex items-center justify-between gap-3 group hover:border-brand-blue/30 transition-all"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-heading font-black text-brand-white">
                      {log.weight_kg} kg
                    </span>
                    <span className="text-[11px] sm:text-xs text-brand-white/40">
                      • {new Date(log.logged_at).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "long" })}
                    </span>
                  </div>
                  {log.notes && <p className="text-xs text-brand-white/50 truncate">{log.notes}</p>}
                </div>

                <button
                  onClick={() => handleDelete(log.id)}
                  className="p-2 rounded-lg text-brand-white/30 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
                  title="Supprimer la pesée"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MODAL D'ENREGISTREMENT DE PESÉE
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md max-h-[92vh] sm:max-h-[88vh] overflow-y-auto bg-[#0c1322] border border-brand-white/15 rounded-2xl p-4 sm:p-6 space-y-4 shadow-2xl my-auto">
            <div className="flex items-center justify-between border-b border-brand-white/10 pb-3">
              <h3 className="text-base sm:text-lg font-heading font-black uppercase text-brand-white">
                Enregistrer une pesée
              </h3>
              <button onClick={() => setIsAddOpen(false)} className="text-brand-white/50 hover:text-brand-white p-1 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveWeight} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-brand-white/70 uppercase">Poids (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    min="30"
                    max="250"
                    value={weightInput}
                    onChange={(e) => setWeightInput(e.target.value)}
                    className="w-full p-3 rounded-xl bg-[#070c16] border border-brand-white/10 text-brand-white text-sm focus:border-brand-blue outline-none"
                    placeholder="ex: 76.5"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-brand-white/70 uppercase">Date</label>
                  <input
                    type="date"
                    required
                    value={logDate}
                    onChange={(e) => setLogDate(e.target.value)}
                    className="w-full p-3 rounded-xl bg-[#070c16] border border-brand-white/10 text-brand-white text-sm focus:border-brand-blue outline-none"
                  />
                </div>
              </div>

              {/* Mensurations V2 ready */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-[10px] sm:text-[11px] font-semibold text-brand-white/50 uppercase">Taille (cm)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={waistCm}
                    onChange={(e) => setWaistCm(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#070c16] border border-brand-white/10 text-brand-white text-xs focus:border-brand-blue outline-none"
                    placeholder="Optionnel"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] sm:text-[11px] font-semibold text-brand-white/50 uppercase">Bras (cm)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={armCm}
                    onChange={(e) => setArmCm(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#070c16] border border-brand-white/10 text-brand-white text-xs focus:border-brand-blue outline-none"
                    placeholder="Optionnel"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-brand-white/70 uppercase">Notes & ressentis</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-3 rounded-xl bg-[#070c16] border border-brand-white/10 text-brand-white text-sm focus:border-brand-blue outline-none"
                  placeholder="ex: Pesée à jeun après séance..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-brand-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-brand-white/60 hover:text-brand-white uppercase cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-brand-blue hover:bg-brand-white text-brand-black text-xs font-heading font-black uppercase tracking-wider transition-all shadow-md shadow-brand-blue/20 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
