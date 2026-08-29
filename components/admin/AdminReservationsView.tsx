"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Users,
  Search,
  Printer,
  ArrowLeft,
  Clock,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Info,
  Phone,
  CreditCard,
  Check,
  X,
  RotateCcw,
  Loader2,
  Filter,
  UserCheck,
  UserX,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  type AdminClassSessionSummary,
  type AdminBookingParticipant,
  markAttendanceAdmin,
} from "@/lib/supabase/admin";

const DAY_NAMES_FR = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
];

const MONTH_NAMES_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

interface AdminReservationsViewProps {
  session: AdminClassSessionSummary | null;
  participants: AdminBookingParticipant[];
  allSessionsList: AdminClassSessionSummary[];
}

export default function AdminReservationsView({
  session,
  participants: initialParticipants,
  allSessionsList,
}: AdminReservationsViewProps) {
  const router = useRouter();
  const [participants, setParticipants] = useState<AdminBookingParticipant[]>(initialParticipants);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "confirmed" | "cancelled">("all");
  const [attendanceFilter, setAttendanceFilter] = useState<"all" | "present" | "absent" | "pending">("all");
  const [loadingBookingId, setLoadingBookingId] = useState<string | null>(null);

  const supabase = createClient();

  // Formatage de la date de la séance active
  const sessionFormattedDate = useMemo(() => {
    if (!session?.starts_at) return "Séance sélectionnée";
    const d = new Date(session.starts_at);
    const dayName = DAY_NAMES_FR[d.getDay()];
    const dayNumber = String(d.getDate()).padStart(2, "0");
    const monthName = MONTH_NAMES_FR[d.getMonth()];
    const year = d.getFullYear();
    return `${dayName} ${dayNumber} ${monthName} ${year}`;
  }, [session]);

  const sessionFormattedHours = useMemo(() => {
    if (!session?.starts_at) return "—";
    const sDate = new Date(session.starts_at);
    const sH = String(sDate.getHours()).padStart(2, "0");
    const sM = String(sDate.getMinutes()).padStart(2, "0");

    if (session.ends_at) {
      const eDate = new Date(session.ends_at);
      const eH = String(eDate.getHours()).padStart(2, "0");
      const eM = String(eDate.getMinutes()).padStart(2, "0");
      return `${sH}:${sM} – ${eH}:${eM}`;
    }
    return `${sH}:${sM}`;
  }, [session]);

  // Action d'émargement via la RPC sécurisée
  const handleMarkAttendance = async (
    bookingId: string,
    targetStatus: "pending" | "present" | "absent"
  ) => {
    setLoadingBookingId(bookingId);

    const res = await markAttendanceAdmin(supabase, bookingId, targetStatus);
    if (!res.success) {
      alert("Erreur lors de l'émargement : " + (res.error || ""));
      setLoadingBookingId(null);
      return;
    }

    // Mise à jour immédiate de l'état local
    setParticipants((prev) =>
      prev.map((p) => {
        if (p.bookingId === bookingId) {
          let formattedTime: string | null = null;
          if (res.attendedAt) {
            const d = new Date(res.attendedAt);
            formattedTime = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
          } else if (targetStatus !== "pending") {
            const now = new Date();
            formattedTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
          }

          return {
            ...p,
            attendanceStatus: targetStatus,
            attendedAt: formattedTime,
          };
        }
        return p;
      })
    );

    setLoadingBookingId(null);
  };

  // Filtrage des participants
  const filteredParticipants = useMemo(() => {
    return participants.filter((p) => {
      const matchesSearch =
        p.memberName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.planName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "confirmed" && p.status === "confirmed") ||
        (statusFilter === "cancelled" && p.status === "cancelled");

      const matchesAttendance =
        attendanceFilter === "all" || p.attendanceStatus === attendanceFilter;

      return matchesSearch && matchesStatus && matchesAttendance;
    });
  }, [participants, searchTerm, statusFilter, attendanceFilter]);

  const confirmedCount = participants.filter((p) => p.status === "confirmed").length;
  const presentCount = participants.filter((p) => p.status === "confirmed" && p.attendanceStatus === "present").length;
  const absentCount = participants.filter((p) => p.status === "confirmed" && p.attendanceStatus === "absent").length;
  const pendingCount = participants.filter((p) => p.status === "confirmed" && p.attendanceStatus === "pending").length;

  const capacity = session?.max_capacity || 20;
  const isSmallGroup = session?.type === "small_group" || !session?.type;

  const handleSessionChange = (sessionId: string) => {
    router.push(`/admin/reservations?session=${sessionId}`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-white/10 pb-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-heading font-black uppercase tracking-wider text-brand-white">
            Réservations & <span className="text-brand-blue">Émargement</span>
          </h1>
          <p className="text-xs sm:text-sm text-brand-white/60 mt-1">
            Consultation des inscrits et pointage en direct des présences aux séances Small Group.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/planning"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white font-heading font-bold text-xs uppercase tracking-wider rounded-sm transition-all border border-brand-white/10"
          >
            <ArrowLeft size={14} />
            Retour au Planning
          </Link>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-blue hover:bg-brand-white text-brand-black font-heading font-bold text-xs uppercase tracking-wider rounded-sm transition-all shadow-md shadow-brand-blue/20 cursor-pointer"
          >
            <Printer size={14} />
            Imprimer la liste
          </button>
        </div>
      </div>

      {/* Session Selector Bar */}
      <div className="bg-[#0b1322] border border-brand-white/10 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-brand-blue mb-1.5">
            Sélectionner une séance du planning
          </label>
          <select
            value={session?.id || ""}
            onChange={(e) => handleSessionChange(e.target.value)}
            className="w-full bg-[#0f172a] border border-brand-white/15 rounded-xl px-4 py-3 text-brand-white text-xs sm:text-sm font-semibold focus:border-brand-blue outline-none cursor-pointer"
          >
            {allSessionsList.map((s) => {
              const d = new Date(s.starts_at);
              const dayStr = DAY_NAMES_FR[d.getDay()];
              const dateStr = `${d.getDate()} ${MONTH_NAMES_FR[d.getMonth()]}`;
              const sH = String(d.getHours()).padStart(2, "0");
              const sM = String(d.getMinutes()).padStart(2, "0");

              return (
                <option key={s.id} value={s.id}>
                  {s.discipline.toUpperCase()} — {dayStr} {dateStr} à {sH}:{sM} ({s.type === "collective" ? "Collectif" : `${s.bookedCount}/${s.max_capacity} inscrits`})
                </option>
              );
            })}
          </select>
        </div>

        <div className="flex items-center gap-2 self-end md:self-center shrink-0">
          <span className="text-xs text-brand-white/50">Total séances disponibles :</span>
          <span className="text-xs font-bold text-brand-white px-2 py-0.5 rounded bg-brand-white/10">
            {allSessionsList.length}
          </span>
        </div>
      </div>

      {/* Active Session Card */}
      {session ? (
        <div className="bg-[#0f172a] border border-brand-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden space-y-6">
          <div className="absolute top-0 right-0 w-96 h-96 bg-brand-blue/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            {/* Session Infos */}
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="px-2.5 py-1 rounded bg-brand-blue/15 text-brand-blue border border-brand-blue/30 text-[10px] font-bold uppercase tracking-wider">
                  {isSmallGroup ? "Small Group" : "Collectif"}
                </span>
                {session.level && (
                  <span className="px-2.5 py-1 rounded bg-brand-white/10 text-brand-white/80 border border-brand-white/15 text-[10px] font-bold uppercase tracking-wider">
                    {session.level}
                  </span>
                )}
                {session.is_active ? (
                  <span className="px-2.5 py-1 rounded bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/30 text-[10px] font-bold uppercase tracking-wider">
                    Séance active
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded bg-red-500/15 text-red-400 border border-red-500/30 text-[10px] font-bold uppercase tracking-wider">
                    Séance annulée
                  </span>
                )}
              </div>

              <h2 className="text-3xl sm:text-4xl font-heading font-black uppercase tracking-wider text-brand-white">
                {session.discipline}
              </h2>

              <div className="flex items-center gap-4 text-xs sm:text-sm text-brand-white/60 flex-wrap">
                <span className="flex items-center gap-1.5 font-semibold text-brand-white">
                  <Calendar size={15} className="text-brand-blue" />
                  {sessionFormattedDate}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5 font-semibold text-brand-white">
                  <Clock size={15} className="text-brand-blue" />
                  {sessionFormattedHours}
                </span>
              </div>
            </div>

            {/* Inscrits Gauge */}
            <div className="bg-[#0b1322] border border-brand-white/10 rounded-xl p-5 min-w-[260px] space-y-3 shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-white/50">
                  Remplissage
                </span>
                <span className="text-sm font-heading font-bold uppercase text-brand-white">
                  {isSmallGroup ? `${confirmedCount} / ${capacity} inscrits` : "Accès libre"}
                </span>
              </div>

              {isSmallGroup && (
                <div className="w-full bg-brand-white/10 h-2 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-300",
                      confirmedCount >= capacity
                        ? "bg-red-500"
                        : confirmedCount >= 15
                        ? "bg-amber-400"
                        : "bg-brand-blue"
                    )}
                    style={{
                      width: `${Math.min(100, (confirmedCount / capacity) * 100)}%`,
                    }}
                  />
                </div>
              )}

              {/* Pointage KPI Mini Stats */}
              {isSmallGroup && confirmedCount > 0 && (
                <div className="grid grid-cols-3 gap-1 pt-1 border-t border-brand-white/5 text-center">
                  <div className="p-1 rounded bg-[#22c55e]/10 border border-[#22c55e]/20">
                    <span className="text-[9px] text-[#22c55e] block font-bold">Présents</span>
                    <span className="text-xs font-bold text-brand-white">{presentCount}</span>
                  </div>
                  <div className="p-1 rounded bg-red-500/10 border border-red-500/20">
                    <span className="text-[9px] text-red-400 block font-bold">Absents</span>
                    <span className="text-xs font-bold text-brand-white">{absentCount}</span>
                  </div>
                  <div className="p-1 rounded bg-brand-white/5 border border-brand-white/10">
                    <span className="text-[9px] text-brand-white/50 block font-bold">En attente</span>
                    <span className="text-xs font-bold text-brand-white">{pendingCount}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#0f172a]/60 border border-brand-white/10 border-dashed rounded-xl p-12 text-center space-y-3">
          <Calendar size={32} className="mx-auto text-brand-white/30" />
          <p className="text-sm font-heading font-bold uppercase text-brand-white/70">
            Aucune séance trouvée.
          </p>
        </div>
      )}

      {/* Participants List & Roster Table */}
      <div className="bg-[#0b1322] border border-brand-white/10 rounded-2xl p-5 sm:p-6 shadow-xl space-y-6">
        {/* Table Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-brand-white/10 pb-4">
          <div className="relative flex-1 max-w-md">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-white/40"
            />
            <input
              type="text"
              placeholder="Rechercher par nom, téléphone ou formule..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0f172a] border border-brand-white/10 rounded-lg pl-10 pr-4 py-2 text-xs sm:text-sm text-brand-white placeholder:text-brand-white/40 focus:border-brand-blue outline-none"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter size={14} className="text-brand-white/40" />
            
            {/* Status Filter */}
            <div className="flex bg-[#0f172a] p-1 rounded-lg border border-brand-white/10">
              <button
                onClick={() => setStatusFilter("all")}
                className={cn(
                  "px-2.5 py-1 rounded text-[11px] font-semibold uppercase transition-colors cursor-pointer",
                  statusFilter === "all"
                    ? "bg-brand-blue text-brand-black font-bold"
                    : "text-brand-white/60 hover:text-brand-white"
                )}
              >
                Tous ({participants.length})
              </button>
              <button
                onClick={() => setStatusFilter("confirmed")}
                className={cn(
                  "px-2.5 py-1 rounded text-[11px] font-semibold uppercase transition-colors cursor-pointer",
                  statusFilter === "confirmed"
                    ? "bg-brand-blue text-brand-black font-bold"
                    : "text-brand-white/60 hover:text-brand-white"
                )}
              >
                Confirmés ({confirmedCount})
              </button>
              <button
                onClick={() => setStatusFilter("cancelled")}
                className={cn(
                  "px-2.5 py-1 rounded text-[11px] font-semibold uppercase transition-colors cursor-pointer",
                  statusFilter === "cancelled"
                    ? "bg-brand-blue text-brand-black font-bold"
                    : "text-brand-white/60 hover:text-brand-white"
                )}
              >
                Annulés ({participants.filter((p) => p.status === "cancelled").length})
              </button>
            </div>

            {/* Attendance Filter */}
            <div className="flex bg-[#0f172a] p-1 rounded-lg border border-brand-white/10">
              <button
                onClick={() => setAttendanceFilter("all")}
                className={cn(
                  "px-2.5 py-1 rounded text-[11px] font-semibold uppercase transition-colors cursor-pointer",
                  attendanceFilter === "all"
                    ? "bg-brand-white/20 text-brand-white font-bold"
                    : "text-brand-white/50 hover:text-brand-white"
                )}
              >
                Pointage: Tout
              </button>
              <button
                onClick={() => setAttendanceFilter("present")}
                className={cn(
                  "px-2.5 py-1 rounded text-[11px] font-semibold uppercase transition-colors cursor-pointer",
                  attendanceFilter === "present"
                    ? "bg-[#22c55e] text-brand-black font-bold"
                    : "text-[#22c55e]/70 hover:text-[#22c55e]"
                )}
              >
                Présents ({presentCount})
              </button>
              <button
                onClick={() => setAttendanceFilter("absent")}
                className={cn(
                  "px-2.5 py-1 rounded text-[11px] font-semibold uppercase transition-colors cursor-pointer",
                  attendanceFilter === "absent"
                    ? "bg-red-500 text-brand-white font-bold"
                    : "text-red-400/70 hover:text-red-400"
                )}
              >
                Absents ({absentCount})
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {filteredParticipants.length === 0 ? (
            <div className="py-12 text-center text-brand-white/40 text-xs sm:text-sm space-y-2">
              <Users size={28} className="mx-auto text-brand-white/20" />
              <p>Aucune réservation trouvée pour cette sélection.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-brand-white/10 text-brand-white/50 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Membre</th>
                  <th className="py-3 px-4">Téléphone</th>
                  <th className="py-3 px-4">Formule</th>
                  <th className="py-3 px-4">Réservé le</th>
                  <th className="py-3 px-4">Statut</th>
                  <th className="py-3 px-4 text-center min-w-[200px]">Émargement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-white/5">
                {filteredParticipants.map((p, idx) => {
                  const isConfirmed = p.status === "confirmed";
                  const isLoading = loadingBookingId === p.bookingId;

                  return (
                    <tr
                      key={p.bookingId}
                      className="hover:bg-brand-white/[0.02] transition-colors"
                    >
                      {/* # Position */}
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-brand-white/40">
                        {idx + 1}
                      </td>

                      {/* Membre */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-brand-white text-sm">
                          {p.memberName}
                        </div>
                        <div className="text-[10px] text-brand-white/40 font-mono">
                          ID: {p.userId.slice(0, 8)}...
                        </div>
                      </td>

                      {/* Téléphone */}
                      <td className="py-3.5 px-4 text-brand-white/80 font-mono">
                        {p.phone !== "—" ? (
                          <a
                            href={`tel:${p.phone}`}
                            className="hover:text-brand-blue transition-colors flex items-center gap-1.5"
                          >
                            <Phone size={11} className="text-brand-white/40" />
                            {p.phone}
                          </a>
                        ) : (
                          <span className="text-brand-white/30">—</span>
                        )}
                      </td>

                      {/* Formule */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-brand-white/5 border border-brand-white/10 text-[10px] font-semibold text-brand-white/80">
                          <CreditCard size={10} className="text-brand-blue" />
                          {p.planName}
                        </span>
                      </td>

                      {/* Date de réservation */}
                      <td className="py-3.5 px-4 text-brand-white/60 text-[11px]">
                        {p.createdAt}
                      </td>

                      {/* Statut Réservation */}
                      <td className="py-3.5 px-4">
                        {isConfirmed ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#22c55e]/15 border border-[#22c55e]/30 text-[#22c55e] text-[10px] font-bold uppercase tracking-wider">
                            <CheckCircle2 size={11} />
                            Confirmée
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-500/15 border border-red-500/30 text-red-400 text-[10px] font-bold uppercase tracking-wider">
                            <XCircle size={11} />
                            Annulée
                          </span>
                        )}
                      </td>

                      {/* Actions d'Émargement */}
                      <td className="py-3.5 px-4 text-center">
                        {!isConfirmed ? (
                          <span className="text-[10px] text-brand-white/30 italic">
                            Non émargé (Annulé)
                          </span>
                        ) : (
                          <div className="flex flex-col items-center gap-1.5">
                            <div className="inline-flex items-center p-1 rounded-lg bg-[#0f172a] border border-brand-white/10 gap-1">
                              {/* Bouton PRÉSENT */}
                              <button
                                onClick={() => handleMarkAttendance(p.bookingId, "present")}
                                disabled={isLoading}
                                className={cn(
                                  "px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50",
                                  p.attendanceStatus === "present"
                                    ? "bg-[#22c55e] text-brand-black shadow-md shadow-[#22c55e]/20"
                                    : "text-[#22c55e]/80 hover:text-[#22c55e] hover:bg-[#22c55e]/10"
                                )}
                                title="Marquer le membre présent"
                              >
                                <Check size={11} />
                                Présent
                              </button>

                              {/* Bouton ABSENT */}
                              <button
                                onClick={() => handleMarkAttendance(p.bookingId, "absent")}
                                disabled={isLoading}
                                className={cn(
                                  "px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50",
                                  p.attendanceStatus === "absent"
                                    ? "bg-red-500 text-brand-white shadow-md shadow-red-500/20"
                                    : "text-red-400/80 hover:text-red-400 hover:bg-red-500/10"
                                )}
                                title="Marquer le membre absent"
                              >
                                <X size={11} />
                                Absent
                              </button>

                              {/* Bouton RESET */}
                              {p.attendanceStatus !== "pending" && (
                                <button
                                  onClick={() => handleMarkAttendance(p.bookingId, "pending")}
                                  disabled={isLoading}
                                  className="p-1 rounded text-brand-white/40 hover:text-brand-white hover:bg-brand-white/10 transition-colors cursor-pointer"
                                  title="Réinitialiser à En attente"
                                >
                                  <RotateCcw size={10} />
                                </button>
                              )}
                            </div>

                            {/* Attended Timestamp Label */}
                            {p.attendanceStatus === "present" && p.attendedAt && (
                              <span className="text-[9px] text-[#22c55e] font-semibold flex items-center gap-1">
                                <CheckCircle2 size={10} />
                                Pointé à {p.attendedAt}
                              </span>
                            )}
                            {p.attendanceStatus === "absent" && p.attendedAt && (
                              <span className="text-[9px] text-red-400 font-semibold flex items-center gap-1">
                                <XCircle size={10} />
                                Noté absent à {p.attendedAt}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
