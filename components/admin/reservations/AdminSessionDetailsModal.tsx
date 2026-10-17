"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Clock,
  Printer,
  Users,
  Phone,
  Mail,
  Copy,
  Check,
  CheckCircle,
  XCircle,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import type {
  AdminClassSessionSummary,
  AdminBookingParticipant,
} from "@/lib/supabase/admin";
import { formatToParisTime, formatToParisDate } from "@/lib/supabase/admin";
import { cn } from "@/lib/utils";

interface AdminSessionDetailsModalProps {
  session: AdminClassSessionSummary | null;
  participants: AdminBookingParticipant[];
  loadingBookingId: string | null;
  onClose: () => void;
  onMarkAttendance: (
    bookingId: string,
    sessionId: string,
    status: "pending" | "present" | "absent",
    isTrial?: boolean
  ) => Promise<void>;
  onCancelTrial: (trialBookingId: string, sessionId: string) => Promise<void>;
  onPrintSession: (sessionId: string) => void;
}

export default function AdminSessionDetailsModal({
  session,
  participants,
  loadingBookingId,
  onClose,
  onMarkAttendance,
  onCancelTrial,
  onPrintSession,
}: AdminSessionDetailsModalProps) {
  const [copiedText, setCopiedText] = useState<string | null>(null);

  if (!session) return null;

  const isVirtual = session.id.startsWith("tmpl_");
  const confirmedParticipants = participants.filter(
    (p) => p.status === "confirmed"
  );
  const cancelledParticipants = participants.filter(
    (p) => p.status === "cancelled"
  );

  const capacity =
    session.max_capacity || (session.type === "private" ? 1 : 12);
  const confirmedCount = confirmedParticipants.length;
  const placesRemaining = Math.max(0, capacity - confirmedCount);

  // Indicateur visuel des places disponibles :
  // Vert si disponible (>2), Orange si ≤ 2 restantes, Rouge si complet (0)
  const isFull = placesRemaining === 0;
  const isAlmostFull = placesRemaining > 0 && placesRemaining <= 2;

  const startTime = formatToParisTime(session.starts_at);
  const endTime = session.ends_at ? formatToParisTime(session.ends_at) : "";
  const dateStr = formatToParisDate(session.starts_at);

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(`${type}:${text}`);
    setTimeout(() => {
      setCopiedText(null);
    }, 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 print:hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#0b1322] border border-brand-white/15 rounded-2xl shadow-2xl z-10 overflow-hidden"
        >
          {/* En-tête de la modale */}
          <div className="p-5 sm:p-6 border-b border-brand-white/10 bg-[#0f172a] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="px-2.5 py-0.5 rounded bg-brand-blue/15 text-brand-blue border border-brand-blue/30 text-[10px] font-heading font-black uppercase tracking-wider">
                  {session.type === "private" ? "Cours Privé" : "Cours Adulte"}
                </span>
                {session.level && (
                  <span className="px-2.5 py-0.5 rounded bg-brand-white/10 text-brand-white/80 border border-brand-white/15 text-[10px] font-bold uppercase">
                    {session.level}
                  </span>
                )}
                <span className="text-xs text-brand-white/60 font-semibold flex items-center gap-1">
                  <Calendar size={13} className="text-brand-blue" />
                  {dateStr}
                </span>
                <span className="text-xs text-brand-white/60 font-semibold flex items-center gap-1">
                  <Clock size={13} className="text-brand-blue" />
                  {startTime} {endTime ? `→ ${endTime}` : ""}
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-heading font-black uppercase tracking-wider text-brand-white">
                {session.discipline}
              </h2>
            </div>

            {/* Badges Places disponibles & Boutons d'action */}
            <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
              {/* Badge Jauge Places */}
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <div className="text-[11px] font-heading font-bold uppercase text-brand-white/60">
                    Inscrits : {confirmedCount} / {capacity}
                  </div>
                  <div
                    className={cn(
                      "text-xs font-heading font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border inline-block",
                      isFull
                        ? "bg-red-500/15 text-red-400 border-red-500/30"
                        : isAlmostFull
                        ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                        : "bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/30"
                    )}
                  >
                    {isFull
                      ? "Complet"
                      : `${placesRemaining} place${
                          placesRemaining > 1 ? "s" : ""
                        } libre${placesRemaining > 1 ? "s" : ""}`}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onPrintSession(session.id)}
                className="px-3 py-2 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white border border-brand-white/10 rounded-lg text-xs font-heading font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Imprimer cette feuille d'émargement"
              >
                <Printer size={14} />
                <span className="hidden sm:inline">Imprimer</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-2 text-brand-white/50 hover:text-brand-white rounded-lg hover:bg-brand-white/10 transition-colors cursor-pointer"
                aria-label="Fermer"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Corps de la modale avec défilement */}
          <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
            {/* Cas de la séance virtuelle (tmpl_*) */}
            {isVirtual ? (
              <div className="bg-[#0f172a] border border-brand-blue/30 rounded-xl p-6 text-center space-y-3">
                <Calendar size={32} className="mx-auto text-brand-blue/50" />
                <h4 className="text-base font-heading font-bold uppercase text-brand-white">
                  Créneau Récurrent Officiel
                </h4>
                <p className="text-xs text-brand-white/60 max-w-md mx-auto">
                  Cette séance est générée automatiquement à partir du planning
                  hebdomadaire type du club. Aucune réservation n&apos;a encore
                  été enregistrée sur ce créneau.
                </p>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-brand-white/5 border border-brand-white/10 text-xs text-brand-white/70">
                  <span>Capacité : {capacity} places</span>
                  <span>•</span>
                  <span className="text-[#22c55e] font-bold">
                    {capacity} places disponibles
                  </span>
                </div>
              </div>
            ) : participants.length === 0 ? (
              <div className="bg-[#0f172a] border border-brand-white/10 border-dashed rounded-xl p-8 text-center space-y-2">
                <Users size={32} className="mx-auto text-brand-white/30" />
                <p className="text-sm font-heading font-bold uppercase text-brand-white/70">
                  Aucun inscrit pour le moment
                </p>
                <p className="text-xs text-brand-white/40">
                  Les réservations des membres et les cours d&apos;essai
                  apparaîtront ici en temps réel.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* 1. Inscrits Confirmés */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-brand-white/10 pb-2">
                    <h4 className="text-xs font-heading font-black uppercase tracking-wider text-brand-white/70 flex items-center gap-2">
                      <Users size={15} className="text-brand-blue" />
                      Inscrits confirmés ({confirmedParticipants.length} /{" "}
                      {capacity})
                    </h4>
                    <span className="text-[11px] text-brand-white/40">
                      Émargement et pointage des présences
                    </span>
                  </div>

                  <div className="overflow-x-auto border border-brand-white/10 rounded-xl bg-[#070d18]">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-brand-white/10 text-brand-white/40 uppercase tracking-widest text-[10px] bg-[#0c1626]">
                          <th className="py-3 px-3 font-heading">Participant</th>
                          <th className="py-3 px-3 font-heading">Formule / Statut</th>
                          <th className="py-3 px-3 font-heading">Coordonnées</th>
                          <th className="py-3 px-3 font-heading">Date résa</th>
                          <th className="py-3 px-3 font-heading text-right">Émargement</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-brand-white/5">
                        {confirmedParticipants.map((p) => {
                          const isCopyingPhone =
                            copiedText === `phone:${p.phone}`;
                          const isCopyingEmail =
                            copiedText === `email:${p.email}`;
                          const isCurrentLoading =
                            loadingBookingId === p.bookingId;

                          return (
                            <tr
                              key={p.bookingId}
                              className={cn(
                                "hover:bg-brand-white/[0.02] transition-colors",
                                p.isTrial && "bg-amber-500/[0.04]"
                              )}
                            >
                              {/* Colonne Participant */}
                              <td className="py-3 px-3 font-semibold text-brand-white">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-heading uppercase tracking-wide">
                                    {p.memberName}
                                  </span>
                                  {p.isTrial ? (
                                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-heading font-black uppercase tracking-wider">
                                      Prospect Essai
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full bg-brand-blue/15 text-brand-blue border border-brand-blue/30 text-[9px] font-heading font-bold uppercase tracking-wider">
                                      Adhérent
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Formule */}
                              <td className="py-3 px-3">
                                {p.isTrial ? (
                                  <span className="px-2 py-1 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] uppercase font-heading font-black tracking-wider inline-block">
                                    COURS D&apos;ESSAI
                                  </span>
                                ) : (
                                  <span className="px-2 py-1 rounded bg-brand-white/5 text-[10px] uppercase font-bold text-brand-white/80 border border-brand-white/10 inline-block">
                                    {p.planName}
                                  </span>
                                )}
                              </td>

                              {/* Coordonnées */}
                              <td className="py-3 px-3 space-y-1">
                                {p.phone && p.phone !== "—" ? (
                                  <div className="flex items-center gap-1.5">
                                    <a
                                      href={`tel:${p.phone}`}
                                      className="text-brand-blue hover:underline font-semibold flex items-center gap-1 text-xs"
                                    >
                                      <Phone size={12} />
                                      {p.phone}
                                    </a>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleCopy(p.phone, "phone")
                                      }
                                      className="text-brand-white/40 hover:text-brand-white p-0.5 rounded transition-colors"
                                      title="Copier le numéro"
                                    >
                                      {isCopyingPhone ? (
                                        <Check
                                          size={11}
                                          className="text-emerald-400"
                                        />
                                      ) : (
                                        <Copy size={11} />
                                      )}
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-brand-white/30 text-[11px]">
                                    Tél : —
                                  </span>
                                )}

                                {p.email && (
                                  <div className="flex items-center gap-1.5">
                                    <a
                                      href={`mailto:${p.email}`}
                                      className="text-brand-white/60 hover:text-brand-white text-[11px] hover:underline flex items-center gap-1"
                                    >
                                      <Mail size={11} />
                                      {p.email}
                                    </a>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleCopy(p.email!, "email")
                                      }
                                      className="text-brand-white/40 hover:text-brand-white p-0.5 rounded transition-colors"
                                      title="Copier l'email"
                                    >
                                      {isCopyingEmail ? (
                                        <Check
                                          size={11}
                                          className="text-emerald-400"
                                        />
                                      ) : (
                                        <Copy size={11} />
                                      )}
                                    </button>
                                  </div>
                                )}
                              </td>

                              {/* Date résa */}
                              <td className="py-3 px-3 text-brand-white/40 text-[11px]">
                                {p.createdAt}
                              </td>

                              {/* Émargement interactif */}
                              <td className="py-3 px-3 text-right">
                                <div className="inline-flex flex-col items-end gap-1.5">
                                  {/* Statut actuel */}
                                  <div>
                                    {p.attendanceStatus === "present" ? (
                                      <span className="text-[10px] font-bold text-[#22c55e] flex items-center gap-1">
                                        <CheckCircle size={12} />
                                        Présent{" "}
                                        {p.attendedAt
                                          ? `(${p.attendedAt})`
                                          : ""}
                                      </span>
                                    ) : p.attendanceStatus === "absent" ? (
                                      <span className="text-[10px] font-bold text-red-400 flex items-center gap-1">
                                        <XCircle size={12} />
                                        Absent (No-Show)
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-bold text-amber-300">
                                        En attente
                                      </span>
                                    )}
                                  </div>

                                  {/* Boutons d'émargement */}
                                  <div className="inline-flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        onMarkAttendance(
                                          p.bookingId,
                                          session.id,
                                          "present",
                                          Boolean(p.isTrial)
                                        )
                                      }
                                      disabled={isCurrentLoading}
                                      className={cn(
                                        "px-2.5 py-1 rounded text-[10px] font-heading font-bold uppercase transition-colors cursor-pointer flex items-center gap-1",
                                        p.attendanceStatus === "present"
                                          ? "bg-[#22c55e] text-black font-black"
                                          : "bg-[#22c55e]/15 hover:bg-[#22c55e]/30 text-[#22c55e]"
                                      )}
                                    >
                                      <Check size={11} />
                                      Présent
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        onMarkAttendance(
                                          p.bookingId,
                                          session.id,
                                          "absent",
                                          Boolean(p.isTrial)
                                        )
                                      }
                                      disabled={isCurrentLoading}
                                      className={cn(
                                        "px-2.5 py-1 rounded text-[10px] font-heading font-bold uppercase transition-colors cursor-pointer flex items-center gap-1",
                                        p.attendanceStatus === "absent"
                                          ? "bg-red-500 text-white font-black"
                                          : "bg-red-500/15 hover:bg-red-500/30 text-red-400"
                                      )}
                                    >
                                      <X size={11} />
                                      Absent
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        onMarkAttendance(
                                          p.bookingId,
                                          session.id,
                                          "pending",
                                          Boolean(p.isTrial)
                                        )
                                      }
                                      disabled={isCurrentLoading}
                                      className="p-1 rounded text-brand-white/40 hover:text-brand-white transition-colors cursor-pointer"
                                      title="Réinitialiser en attente"
                                    >
                                      <RotateCcw size={12} />
                                    </button>

                                    {p.isTrial && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          onCancelTrial(
                                            p.bookingId,
                                            session.id
                                          )
                                        }
                                        disabled={isCurrentLoading}
                                        className="px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-bold uppercase border border-red-500/20 transition-colors ml-1"
                                        title="Annuler ce cours d'essai"
                                      >
                                        Annuler
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 2. Réservations Annulées (si existantes) */}
                {cancelledParticipants.length > 0 && (
                  <div className="space-y-3 pt-4 border-t border-brand-white/10">
                    <h4 className="text-xs font-heading font-black uppercase tracking-wider text-red-400/80 flex items-center gap-2">
                      <XCircle size={15} />
                      Réservations annulées ({cancelledParticipants.length})
                    </h4>

                    <div className="overflow-x-auto border border-red-500/20 rounded-xl bg-[#0c1626]/50">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-brand-white/10 text-brand-white/40 uppercase tracking-widest text-[10px]">
                            <th className="py-2.5 px-3 font-heading">Participant</th>
                            <th className="py-2.5 px-3 font-heading">Formule / Statut</th>
                            <th className="py-2.5 px-3 font-heading">Coordonnées</th>
                            <th className="py-2.5 px-3 font-heading">Motif / Délai</th>
                            <th className="py-2.5 px-3 font-heading text-right">Statut</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-white/5 opacity-70">
                          {cancelledParticipants.map((p) => (
                            <tr key={p.bookingId}>
                              <td className="py-2.5 px-3 font-semibold text-brand-white">
                                {p.memberName}
                              </td>
                              <td className="py-2.5 px-3 text-[11px] text-brand-white/60">
                                {p.planName}
                              </td>
                              <td className="py-2.5 px-3 text-[11px] text-brand-white/60">
                                {p.phone || "—"}
                              </td>
                              <td className="py-2.5 px-3 text-[11px] text-red-400">
                                {p.isLateCancellation
                                  ? "Annulation tardive (<24h)"
                                  : "Annulation standard (≥24h)"}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <span className="px-2 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/30 text-[10px] font-bold uppercase">
                                  Annulé
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Pied de la modale */}
          <div className="p-4 sm:p-5 border-t border-brand-white/10 bg-[#0f172a] flex items-center justify-between gap-3 shrink-0">
            <span className="text-xs text-brand-white/50">
              {confirmedCount} inscrit{confirmedCount > 1 ? "s" : ""} •{" "}
              {placesRemaining} place{placesRemaining > 1 ? "s" : ""} restante
              {placesRemaining > 1 ? "s" : ""}
            </span>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-brand-white/10 hover:bg-brand-white/20 text-brand-white rounded-lg text-xs font-heading font-bold uppercase tracking-wider transition-colors cursor-pointer"
            >
              Fermer
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
