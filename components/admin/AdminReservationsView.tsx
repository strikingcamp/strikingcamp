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
  CheckCircle2,
  XCircle,
  Phone,
  Check,
  X,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Dumbbell,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  type AdminClassSessionSummary,
  type AdminBookingParticipant,
  type AdminWeeklyReservationsData,
  markAttendanceAdmin,
  formatToParisDate,
  formatToParisTime,
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
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

const DAYS_SHORT_FR: Record<string, string> = {
  Lundi: "Lun",
  Mardi: "Mar",
  Mercredi: "Mer",
  Jeudi: "Jeu",
  Vendredi: "Ven",
  Samedi: "Sam",
};

const OFFICIAL_PRIVATE_HOURS = [
  { start: "08:00", end: "08:50" },
  { start: "09:00", end: "09:50" },
  { start: "10:00", end: "10:50" },
  { start: "14:00", end: "14:50" },
  { start: "15:00", end: "15:50" },
  { start: "16:00", end: "16:50" },
];

type ReservationTab = "private" | "small_group";

interface AdminReservationsViewProps {
  weeklyData: AdminWeeklyReservationsData;
  initialWeekOffset?: number;
  initialTab?: ReservationTab;
  initialSelectedDateStr?: string;
  // Compatibilité ascendante facultative
  session?: AdminClassSessionSummary | null;
  participants?: AdminBookingParticipant[];
  allSessionsList?: AdminClassSessionSummary[];
}

export default function AdminReservationsView({
  weeklyData,
  initialWeekOffset = 0,
  initialTab = "small_group",
  initialSelectedDateStr,
}: AdminReservationsViewProps) {
  const router = useRouter();
  const supabase = createClient();

  // 1. Onglet actif
  const [activeTab, setActiveTab] = useState<ReservationTab>(initialTab);

  // 2. Semaine et jours
  const weekOffset = initialWeekOffset;

  // Calcul dynamique des 6 jours de la semaine (Lundi au Samedi)
  const weekDays = useMemo(() => {
    const mondayParts = (weeklyData.weekMonday || "").split("-").map(Number);
    const mondayDate =
      mondayParts.length === 3
        ? new Date(mondayParts[0], mondayParts[1] - 1, mondayParts[2], 0, 0, 0, 0)
        : new Date();

    const days = [];
    const DAYS_ORDER = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

    for (let i = 0; i < 6; i++) {
      const d = new Date(mondayDate);
      d.setDate(d.getDate() + i);

      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const dayName = DAYS_ORDER[i];
      const monthName = MONTH_NAMES_FR[d.getMonth()];

      days.push({
        dayName,
        shortName: DAYS_SHORT_FR[dayName] || dayName.slice(0, 3),
        dateNum: d.getDate(),
        monthName,
        year: yyyy,
        dateStr,
        fullLabel: `${dayName} ${d.getDate()} ${monthName} ${yyyy}`,
      });
    }

    return days;
  }, [weeklyData.weekMonday]);

  // Date sélectionnée (par défaut : première date de la semaine ou celle passée en props)
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    if (
      initialSelectedDateStr &&
      weekDays.some((wd) => wd.dateStr === initialSelectedDateStr)
    ) {
      return initialSelectedDateStr;
    }
    // Si aujourd'hui est dans la semaine affichée, le choisir par défaut
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    if (weekDays.some((wd) => wd.dateStr === todayStr)) {
      return todayStr;
    }
    return weekDays[0]?.dateStr || "";
  });

  // 3. État local mutable des réservations pour mise à jour optimiste de l'émargement
  const [bookingsBySession, setBookingsBySession] = useState<
    Record<string, AdminBookingParticipant[]>
  >(() => weeklyData.bookingsBySessionId || {});

  const [loadingBookingId, setLoadingBookingId] = useState<string | null>(null);
  const [expandedSessions, setExpandedSessions] = useState<Record<string, boolean>>({});

  // Objet du jour actif sélectionné
  const currentDayInfo = useMemo(() => {
    return (
      weekDays.find((d) => d.dateStr === selectedDateStr) ||
      weekDays[0] || {
        dayName: "Lundi",
        shortName: "Lun",
        dateNum: 0,
        monthName: "",
        year: 2026,
        dateStr: selectedDateStr,
        fullLabel: "Date sélectionnée",
      }
    );
  }, [weekDays, selectedDateStr]);

  // Label de la semaine
  const weekRangeLabel = useMemo(() => {
    if (weekDays.length < 6) return "Semaine sélectionnée";
    const first = weekDays[0];
    const last = weekDays[5];
    return `Semaine du ${first.dateNum} ${first.monthName} au ${last.dateNum} ${last.monthName} ${last.year}`;
  }, [weekDays]);

  // Helpers garantissant le fuseau horaire Europe/Paris strict
  const getLocalDateStr = (isoString: string): string => formatToParisDate(isoString);
  const getLocalTimeStr = (isoString?: string | null): string =>
    isoString ? formatToParisTime(isoString) : "";

  // 4. Séances Small Group du jour sélectionné
  const smallGroupSessionsForDay = useMemo(() => {
    return (weeklyData.smallGroupSessions || [])
      .filter((s) => getLocalDateStr(s.starts_at) === selectedDateStr)
      .sort(
        (a, b) =>
          new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
      );
  }, [weeklyData.smallGroupSessions, selectedDateStr]);

  // 5. Séances Privées de la semaine
  const privateSessionsForDay = useMemo(() => {
    return (weeklyData.privateSessions || []).filter(
      (s) => getLocalDateStr(s.starts_at) === selectedDateStr
    );
  }, [weeklyData.privateSessions, selectedDateStr]);

  // Navigation de semaine en semaine
  const handleNavigateWeek = (offsetChange: number) => {
    const newOffset = weekOffset + offsetChange;
    router.push(`/admin/reservations?week=${newOffset}&tab=${activeTab}`);
  };

  const handleResetToCurrentWeek = () => {
    router.push(`/admin/reservations?week=0&tab=${activeTab}`);
  };

  // Bascule du dépliement des participants Small Group
  const toggleSessionExpand = (sessionId: string) => {
    setExpandedSessions((prev) => ({
      ...prev,
      [sessionId]: !prev[sessionId],
    }));
  };

  // Émargement interactif sécurisé
  const handleMarkAttendance = async (
    bookingId: string,
    sessionId: string,
    targetStatus: "pending" | "present" | "absent"
  ) => {
    setLoadingBookingId(bookingId);

    const res = await markAttendanceAdmin(supabase, bookingId, targetStatus);
    if (!res.success) {
      alert("Erreur lors de l'émargement : " + (res.error || ""));
      setLoadingBookingId(null);
      return;
    }

    const now = new Date();
    const formattedTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    setBookingsBySession((prev) => {
      const sessionBookings = prev[sessionId] || [];
      const updated = sessionBookings.map((b) => {
        if (b.bookingId === bookingId) {
          return {
            ...b,
            attendanceStatus: targetStatus,
            attendedAt: targetStatus === "pending" ? null : res.attendedAt || formattedTime,
          };
        }
        return b;
      });
      return { ...prev, [sessionId]: updated };
    });

    setLoadingBookingId(null);
  };

  // Calcul du nombre de séances et de réservations par jour pour les capsules calendrier
  const dayCounters = useMemo(() => {
    const map: Record<
      string,
      { sgCount: number; sgBooked: number; privBooked: number }
    > = {};

    for (const d of weekDays) {
      map[d.dateStr] = { sgCount: 0, sgBooked: 0, privBooked: 0 };
    }

    // Small Group
    for (const s of weeklyData.smallGroupSessions || []) {
      const dStr = getLocalDateStr(s.starts_at);
      if (map[dStr]) {
        map[dStr].sgCount += 1;
        const bks = bookingsBySession[s.id] || [];
        map[dStr].sgBooked += bks.filter((b) => b.status === "confirmed").length;
      }
    }

    // Privés
    for (const p of weeklyData.privateSessions || []) {
      const dStr = getLocalDateStr(p.starts_at);
      if (map[dStr]) {
        const bks = bookingsBySession[p.id] || [];
        if (bks.some((b) => b.status === "confirmed")) {
          map[dStr].privBooked += 1;
        }
      }
    }

    return map;
  }, [weekDays, weeklyData, bookingsBySession]);

  // Totaux de la semaine
  const totalWeeklySgBookings = useMemo(() => {
    let sum = 0;
    for (const s of weeklyData.smallGroupSessions || []) {
      const bks = bookingsBySession[s.id] || [];
      sum += bks.filter((b) => b.status === "confirmed").length;
    }
    return sum;
  }, [weeklyData.smallGroupSessions, bookingsBySession]);

  const totalWeeklyPrivateBookings = useMemo(() => {
    let sum = 0;
    for (const s of weeklyData.privateSessions || []) {
      const bks = bookingsBySession[s.id] || [];
      sum += bks.filter((b) => b.status === "confirmed").length;
    }
    return sum;
  }, [weeklyData.privateSessions, bookingsBySession]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          1. EN-TÊTE SUPÉRIEUR & ACTIONS GLOBALES
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-white/10 pb-6 print:hidden">
        <div>
          <h1 className="text-3xl sm:text-4xl font-heading font-black uppercase tracking-wider text-brand-white">
            Réservations & <span className="text-brand-blue">Émargement</span>
          </h1>
          <p className="text-xs sm:text-sm text-brand-white/60 mt-1">
            Planning journalier unifié, gestion des présences et consultation des inscrits.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/planning"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white font-heading font-bold text-xs uppercase tracking-wider rounded-sm transition-all border border-brand-white/10"
          >
            <ArrowLeft size={14} />
            Planning officiel
          </Link>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-blue hover:bg-brand-white text-brand-black font-heading font-bold text-xs uppercase tracking-wider rounded-sm transition-all shadow-md shadow-brand-blue/20 cursor-pointer"
          >
            <Printer size={14} />
            Imprimer la journée
          </button>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          2. SÉLECTEUR D'ONGLETS PRINCIPAL : [ COURS PRIVÉS ] [ SMALL GROUP ]
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="flex items-center gap-2 p-1.5 bg-[#0b1322] border border-brand-white/10 rounded-2xl print:hidden">
        <button
          onClick={() => setActiveTab("private")}
          className={cn(
            "flex-1 py-3 px-4 rounded-xl font-heading font-black text-xs sm:text-sm uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2.5 cursor-pointer",
            activeTab === "private"
              ? "bg-gradient-to-r from-brand-blue to-[#00d8ff] text-black shadow-lg shadow-brand-blue/20 scale-[1.01]"
              : "text-brand-white/60 hover:text-brand-white hover:bg-brand-white/5"
          )}
        >
          <Sparkles size={16} />
          <span>Cours Privés</span>
          <span
            className={cn(
              "text-[10px] px-2 py-0.5 rounded-full font-bold",
              activeTab === "private"
                ? "bg-black/25 text-black"
                : "bg-brand-white/10 text-brand-white/70"
            )}
          >
            {totalWeeklyPrivateBookings} réservés cette sem.
          </span>
        </button>

        <button
          onClick={() => setActiveTab("small_group")}
          className={cn(
            "flex-1 py-3 px-4 rounded-xl font-heading font-black text-xs sm:text-sm uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2.5 cursor-pointer",
            activeTab === "small_group"
              ? "bg-gradient-to-r from-brand-blue to-[#00d8ff] text-black shadow-lg shadow-brand-blue/20 scale-[1.01]"
              : "text-brand-white/60 hover:text-brand-white hover:bg-brand-white/5"
          )}
        >
          <Users size={16} />
          <span>Small Group</span>
          <span
            className={cn(
              "text-[10px] px-2 py-0.5 rounded-full font-bold",
              activeTab === "small_group"
                ? "bg-black/25 text-black"
                : "bg-brand-white/10 text-brand-white/70"
            )}
          >
            {totalWeeklySgBookings} inscrits cette sem.
          </span>
        </button>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          3. CALENDRIER COMMUN : NAVIGATION SEMAINE & CAPSULES DES 6 JOURS
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="bg-[#0b1322] border border-brand-white/10 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4 print:hidden">
        {/* Barre de navigation temporelle de la semaine */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-white/5 pb-3">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-brand-blue" />
            <h2 className="text-sm sm:text-base font-heading font-bold uppercase tracking-wider text-brand-white">
              {weekRangeLabel}
            </h2>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {weekOffset !== 0 && (
              <button
                onClick={handleResetToCurrentWeek}
                className="px-2.5 py-1 rounded bg-brand-white/5 hover:bg-brand-white/10 text-brand-white/70 hover:text-brand-white text-[11px] font-heading font-bold uppercase tracking-wider border border-brand-white/10 transition-colors cursor-pointer"
              >
                Cette semaine
              </button>
            )}

            <button
              onClick={() => handleNavigateWeek(-1)}
              className="p-1.5 rounded-lg bg-[#0f172a] hover:bg-brand-white/10 text-brand-white border border-brand-white/10 transition-colors cursor-pointer flex items-center gap-1 text-xs"
              title="Semaine précédente"
            >
              <ChevronLeft size={16} />
              <span className="hidden md:inline text-[11px] font-bold uppercase pr-1">
                Semaine préc.
              </span>
            </button>

            <button
              onClick={() => handleNavigateWeek(1)}
              className="p-1.5 rounded-lg bg-[#0f172a] hover:bg-brand-white/10 text-brand-white border border-brand-white/10 transition-colors cursor-pointer flex items-center gap-1 text-xs"
              title="Semaine suivante"
            >
              <span className="hidden md:inline text-[11px] font-bold uppercase pl-1">
                Semaine suiv.
              </span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Grille des 6 jours (Lundi au Samedi) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {weekDays.map((day) => {
            const isSelected = day.dateStr === selectedDateStr;
            const counters = dayCounters[day.dateStr] || {
              sgCount: 0,
              sgBooked: 0,
              privBooked: 0,
            };

            const countLabel =
              activeTab === "private"
                ? `${counters.privBooked} rés. / 6`
                : `${counters.sgCount} cours · ${counters.sgBooked} insc.`;

            return (
              <button
                key={day.dateStr}
                onClick={() => setSelectedDateStr(day.dateStr)}
                className={cn(
                  "p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between relative group",
                  isSelected
                    ? "bg-[#13233c] border-brand-blue shadow-[0_0_15px_rgba(47,174,224,0.3)] scale-[1.02]"
                    : "bg-[#0f172a] border-brand-white/10 hover:border-brand-blue/40 hover:bg-[#111c2e]"
                )}
              >
                <div>
                  <span
                    className={cn(
                      "text-[10px] font-heading font-black uppercase tracking-wider block",
                      isSelected ? "text-brand-blue" : "text-brand-white/50"
                    )}
                  >
                    {day.dayName}
                  </span>
                  <span className="text-2xl font-heading font-black text-brand-white block mt-0.5">
                    {day.dateNum}
                  </span>
                </div>

                <div className="mt-2 pt-2 border-t border-brand-white/5 flex items-center justify-between">
                  <span
                    className={cn(
                      "text-[10px] font-bold tracking-tight",
                      isSelected
                        ? "text-[#00d8ff]"
                        : "text-brand-white/40 group-hover:text-brand-white/60"
                    )}
                  >
                    {countLabel}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          4. BANDEAU DE LA JOURNÉE SÉLECTIONNÉE
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="bg-[#0f172a] border border-brand-white/10 rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded bg-brand-blue/15 text-brand-blue text-[10px] font-heading font-black uppercase tracking-wider border border-brand-blue/30">
              {activeTab === "private" ? "Cours Privés Individuels" : "Séances Small Group"}
            </span>
            <span className="text-xs text-brand-white/50">•</span>
            <span className="text-xs font-semibold text-brand-white/70">
              {currentDayInfo.fullLabel}
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-heading font-black uppercase tracking-wider text-brand-white mt-1">
            {currentDayInfo.dayName} {currentDayInfo.dateNum} {currentDayInfo.monthName}
          </h2>
        </div>

        {/* Mini résumé KPI du jour */}
        <div className="flex items-center gap-3">
          {activeTab === "private" ? (
            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
                <span className="text-[10px] font-bold text-emerald-400 block uppercase">
                  Réservés
                </span>
                <span className="text-base font-black text-brand-white">
                  {dayCounters[selectedDateStr]?.privBooked || 0}
                </span>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-brand-white/5 border border-brand-white/10 text-center">
                <span className="text-[10px] font-bold text-brand-white/50 block uppercase">
                  Disponibles
                </span>
                <span className="text-base font-black text-brand-white">
                  {6 - (dayCounters[selectedDateStr]?.privBooked || 0)}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 rounded-lg bg-brand-blue/10 border border-brand-blue/20 text-center">
                <span className="text-[10px] font-bold text-brand-blue block uppercase">
                  Séances
                </span>
                <span className="text-base font-black text-brand-white">
                  {smallGroupSessionsForDay.length}
                </span>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-[#22c55e]/10 border border-[#22c55e]/20 text-center">
                <span className="text-[10px] font-bold text-[#22c55e] block uppercase">
                  Total inscrits
                </span>
                <span className="text-base font-black text-brand-white">
                  {dayCounters[selectedDateStr]?.sgBooked || 0}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          5. CONTENU SPÉCIFIQUE À L'ONGLET SÉLECTIONNÉ
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}

      {/* ─────────────────────────────────────────────────────────────────
          A. ONGLET : COURS PRIVÉS JOUR PAR JOUR (6 CRÉNEAUX OFFICIELS)
          ───────────────────────────────────────────────────────────────── */}
      {activeTab === "private" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-brand-white/10 pb-2">
            <h3 className="text-xs sm:text-sm font-heading font-black uppercase tracking-wider text-brand-white/80 flex items-center gap-2">
              <Clock size={16} className="text-brand-blue" />
              Grille des 6 créneaux officiels de la journée
            </h3>
            <span className="text-[11px] text-brand-white/50">
              Durée : 50 min par séance individuelle
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {OFFICIAL_PRIVATE_HOURS.map((hourSlot) => {
              // Recherche d'une session de cours privé correspondant à cette heure
              const matchingSession = privateSessionsForDay.find((s) => {
                const sTime = getLocalTimeStr(s.starts_at);
                return sTime === hourSlot.start;
              });

              // Réservations sur ce créneau
              const sessionBookings = matchingSession
                ? bookingsBySession[matchingSession.id] || []
                : [];

              const confirmedBooking = sessionBookings.find(
                (b) => b.status === "confirmed"
              );
              const cancelledBooking = sessionBookings.find(
                (b) => b.status === "cancelled"
              );

              const isPast = matchingSession?.ends_at
                ? new Date(matchingSession.ends_at).getTime() <= Date.now()
                : false;

              // CAS 1 : CRÉNEAU RÉSERVÉ & CONFIRMÉ
              if (confirmedBooking && matchingSession) {
                return (
                  <div
                    key={hourSlot.start}
                    className="bg-[#0f172a] border border-[#00d8ff]/40 rounded-2xl p-5 shadow-xl space-y-4 relative overflow-hidden"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="px-3 py-1.5 rounded-xl bg-[#00d8ff]/15 border border-[#00d8ff]/30 text-[#00d8ff] font-heading font-black text-sm">
                          {hourSlot.start} → {hourSlot.end}
                        </div>
                        <div>
                          <span className="text-xs font-bold uppercase text-brand-white block">
                            {matchingSession.discipline || "Cours Privé"}
                          </span>
                          <span className="text-[10px] text-brand-white/50">
                            {matchingSession.level || "Individuel"}
                          </span>
                        </div>
                      </div>

                      <span className="px-2.5 py-0.5 rounded bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/30 text-[10px] font-bold uppercase tracking-wider">
                        Confirmé
                      </span>
                    </div>

                    {/* Fiche du membre réservé */}
                    <div className="bg-[#070d18] border border-brand-white/5 rounded-xl p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-heading font-bold text-brand-white uppercase">
                          {confirmedBooking.memberName}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-brand-white/10 text-brand-white/70 font-semibold uppercase">
                          {confirmedBooking.planName}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-brand-white/60">
                        <a
                          href={`tel:${confirmedBooking.phone}`}
                          className="flex items-center gap-1.5 text-brand-blue hover:underline"
                        >
                          <Phone size={13} />
                          {confirmedBooking.phone}
                        </a>
                        <span className="text-[10px] text-brand-white/40">
                          {confirmedBooking.createdAt}
                        </span>
                      </div>
                    </div>

                    {/* Pointage d'émargement */}
                    <div className="pt-2 border-t border-brand-white/5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase text-brand-white/50">
                          Émargement :
                        </span>
                        {confirmedBooking.attendanceStatus === "present" ? (
                          <span className="text-[10px] font-bold text-[#22c55e] flex items-center gap-1">
                            <CheckCircle size={12} />
                            Présent {confirmedBooking.attendedAt ? `(${confirmedBooking.attendedAt})` : ""}
                          </span>
                        ) : confirmedBooking.attendanceStatus === "absent" ? (
                          <span className="text-[10px] font-bold text-red-400 flex items-center gap-1">
                            <XCircle size={12} />
                            Absent
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-300">
                            En attente
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() =>
                            handleMarkAttendance(
                              confirmedBooking.bookingId,
                              matchingSession.id,
                              "present"
                            )
                          }
                          disabled={loadingBookingId === confirmedBooking.bookingId}
                          className={cn(
                            "px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-colors cursor-pointer",
                            confirmedBooking.attendanceStatus === "present"
                              ? "bg-[#22c55e] text-black font-black"
                              : "bg-[#22c55e]/15 hover:bg-[#22c55e]/30 text-[#22c55e]"
                          )}
                        >
                          Présent
                        </button>

                        <button
                          onClick={() =>
                            handleMarkAttendance(
                              confirmedBooking.bookingId,
                              matchingSession.id,
                              "absent"
                            )
                          }
                          disabled={loadingBookingId === confirmedBooking.bookingId}
                          className={cn(
                            "px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-colors cursor-pointer",
                            confirmedBooking.attendanceStatus === "absent"
                              ? "bg-red-500 text-white font-black"
                              : "bg-red-500/15 hover:bg-red-500/30 text-red-400"
                          )}
                        >
                          Absent
                        </button>

                        <button
                          onClick={() =>
                            handleMarkAttendance(
                              confirmedBooking.bookingId,
                              matchingSession.id,
                              "pending"
                            )
                          }
                          disabled={loadingBookingId === confirmedBooking.bookingId}
                          className={cn(
                            "p-1 rounded text-brand-white/40 hover:text-brand-white transition-colors cursor-pointer"
                          )}
                          title="Réinitialiser en attente"
                        >
                          <RotateCcw size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              // CAS 2 : CRÉNEAU AVEC RÉSERVATION ANNULÉE (Historique préservé)
              if (cancelledBooking && matchingSession) {
                return (
                  <div
                    key={hourSlot.start}
                    className="bg-[#0f172a]/60 border border-red-500/30 rounded-2xl p-5 shadow-lg space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-heading font-black text-sm">
                          {hourSlot.start} → {hourSlot.end}
                        </div>
                        <div>
                          <span className="text-xs font-bold uppercase text-brand-white/80 block">
                            {matchingSession.discipline || "Cours Privé"}
                          </span>
                          <span className="text-[10px] text-brand-white/40">
                            1 place redevenue disponible
                          </span>
                        </div>
                      </div>

                      <span className="px-2.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/30 text-[10px] font-bold uppercase tracking-wider">
                        Annulé
                      </span>
                    </div>

                    <div className="bg-[#070d18] border border-red-500/10 rounded-xl p-3 text-xs text-brand-white/60 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-heading font-bold text-brand-white/80">
                          {cancelledBooking.memberName}
                        </span>
                        <span className="text-[10px] text-red-400 font-semibold">
                          {cancelledBooking.isLateCancellation
                            ? "Annulation tardive (< 24h)"
                            : "Annulation standard (≥ 24h)"}
                        </span>
                      </div>
                      <p className="text-[10px] text-brand-white/40">
                        Tél : {cancelledBooking.phone} • {cancelledBooking.planName}
                      </p>
                    </div>
                  </div>
                );
              }

              // CAS 3 : CRÉNEAU DISPONIBLE / NON RÉSERVÉ
              return (
                <div
                  key={hourSlot.start}
                  className="bg-[#0b1322]/60 border border-brand-white/5 border-dashed rounded-2xl p-5 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="px-3 py-1.5 rounded-xl bg-brand-white/5 border border-brand-white/10 text-brand-white/60 font-heading font-black text-sm">
                      {hourSlot.start} → {hourSlot.end}
                    </div>
                    <div>
                      <span className="text-xs font-bold uppercase text-brand-white/70 block">
                        Cours Privé Individuel
                      </span>
                      <span className="text-[10px] text-brand-white/40">
                        {isPast ? "Séance passée non réservée" : "Créneau disponible à la réservation"}
                      </span>
                    </div>
                  </div>

                  <span
                    className={cn(
                      "px-2.5 py-1 rounded text-[10px] font-heading font-bold uppercase tracking-wider border",
                      isPast
                        ? "bg-brand-white/5 text-brand-white/40 border-brand-white/10"
                        : "bg-[#00d8ff]/10 text-[#00d8ff] border-[#00d8ff]/20"
                    )}
                  >
                    {isPast ? "Passé" : "1 place libre"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          B. ONGLET : SMALL GROUP JOUR PAR JOUR
          ───────────────────────────────────────────────────────────────── */}
      {activeTab === "small_group" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-brand-white/10 pb-2">
            <h3 className="text-xs sm:text-sm font-heading font-black uppercase tracking-wider text-brand-white/80 flex items-center gap-2">
              <Dumbbell size={16} className="text-brand-blue" />
              Séances Small Group programmées ({smallGroupSessionsForDay.length})
            </h3>
            <span className="text-[11px] text-brand-white/50">
              Capacité maximale : 20 personnes par séance
            </span>
          </div>

          {smallGroupSessionsForDay.length === 0 ? (
            <div className="bg-[#0f172a]/60 border border-brand-white/10 border-dashed rounded-2xl p-12 text-center space-y-3">
              <Calendar size={32} className="mx-auto text-brand-white/30" />
              <p className="text-sm font-heading font-bold uppercase text-brand-white/70">
                Aucune séance Small Group programmée pour le {currentDayInfo.dayName} {currentDayInfo.dateNum} {currentDayInfo.monthName}.
              </p>
              <p className="text-xs text-brand-white/40 max-w-sm mx-auto">
                Consultez le planning officiel pour ajouter des séances récurrentes ou exceptionnelles.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {smallGroupSessionsForDay.map((session) => {
                const sessionBookings = bookingsBySession[session.id] || [];
                const confirmedParticipants = sessionBookings.filter(
                  (b) => b.status === "confirmed"
                );
                const confirmedCount = confirmedParticipants.length;
                const capacity = session.max_capacity || 20;

                const presentCount = confirmedParticipants.filter(
                  (b) => b.attendanceStatus === "present"
                ).length;
                const absentCount = confirmedParticipants.filter(
                  (b) => b.attendanceStatus === "absent"
                ).length;
                const pendingCount = confirmedParticipants.filter(
                  (b) => b.attendanceStatus === "pending"
                ).length;

                const isPast = session.ends_at
                  ? new Date(session.ends_at).getTime() <= Date.now()
                  : false;

                const isExpanded = expandedSessions[session.id] ?? true;

                const sStartTime = getLocalTimeStr(session.starts_at);
                const sEndTime = getLocalTimeStr(session.ends_at);

                return (
                  <div
                    key={session.id}
                    className="bg-[#0f172a] border border-brand-white/10 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5"
                  >
                    {/* Header de la séance */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded bg-brand-blue/15 text-brand-blue border border-brand-blue/30 text-[10px] font-bold uppercase tracking-wider">
                            Small Group
                          </span>
                          {session.level && (
                            <span className="px-2.5 py-0.5 rounded bg-brand-white/10 text-brand-white/80 border border-brand-white/15 text-[10px] font-bold uppercase tracking-wider">
                              {session.level}
                            </span>
                          )}
                          {isPast && (
                            <span className="px-2.5 py-0.5 rounded bg-zinc-700/40 text-zinc-300 border border-zinc-600/40 text-[10px] font-bold uppercase tracking-wider">
                              Séance terminée
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <h4 className="text-xl sm:text-2xl font-heading font-black uppercase tracking-wider text-brand-white">
                            {session.discipline}
                          </h4>
                          <span className="text-xs sm:text-sm font-semibold text-brand-blue flex items-center gap-1">
                            <Clock size={14} />
                            {sStartTime} → {sEndTime}
                          </span>
                        </div>
                      </div>

                      {/* Jauge réelle & Statut du cours */}
                      <div className="flex items-center gap-4 bg-[#070d18] border border-brand-white/5 rounded-xl p-3.5 sm:px-5">
                        <div className="min-w-[140px] space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-heading font-bold uppercase">
                            <span className="text-brand-white/60">Inscrits :</span>
                            <span
                              className={cn(
                                confirmedCount >= capacity
                                  ? "text-red-400"
                                  : confirmedCount >= 15
                                  ? "text-amber-400"
                                  : "text-[#00d8ff]"
                              )}
                            >
                              {confirmedCount} / {capacity}
                            </span>
                          </div>

                          <div className="w-full bg-brand-white/10 h-2 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-300",
                                confirmedCount >= capacity
                                  ? "bg-red-500"
                                  : confirmedCount >= 15
                                  ? "bg-amber-400"
                                  : "bg-[#00d8ff]"
                              )}
                              style={{
                                width: `${Math.min(100, (confirmedCount / capacity) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>

                        {/* Statut du cours */}
                        <div className="border-l border-brand-white/10 pl-4 flex items-center">
                          {isPast ? (
                            <span className="px-2.5 py-1 rounded bg-zinc-700/30 text-zinc-400 border border-zinc-600/30 text-[10px] font-bold uppercase tracking-wider">
                              Terminé
                            </span>
                          ) : confirmedCount >= capacity ? (
                            <span className="px-2.5 py-1 rounded bg-red-500/15 text-red-400 border border-red-500/30 text-[10px] font-bold uppercase tracking-wider">
                              Complet
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/30 text-[10px] font-bold uppercase tracking-wider">
                              Actif
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => toggleSessionExpand(session.id)}
                          className="px-3 py-1.5 rounded-lg bg-brand-white/5 hover:bg-brand-white/10 text-brand-white/80 hover:text-brand-white font-heading font-bold text-[11px] uppercase tracking-wider transition-colors cursor-pointer ml-2"
                        >
                          {isExpanded ? "Masquer la liste" : `Voir les inscrits (${confirmedCount})`}
                        </button>
                      </div>
                    </div>

                    {/* Table détaillée des inscrits (dépliable, sans émargement) */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="pt-4 border-t border-brand-white/10 space-y-3"
                        >
                          {sessionBookings.length === 0 ? (
                            <div className="py-6 text-center text-brand-white/40 text-xs">
                              Aucune réservation pour cette séance (0 / {capacity}).
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                  <tr className="border-b border-brand-white/10 text-brand-white/40 uppercase tracking-widest text-[10px]">
                                    <th className="py-2.5 px-3 font-heading">Membre</th>
                                    <th className="py-2.5 px-3 font-heading">Téléphone</th>
                                    <th className="py-2.5 px-3 font-heading">Formule</th>
                                    <th className="py-2.5 px-3 font-heading">Date d'inscription</th>
                                    <th className="py-2.5 px-3 font-heading text-right">Statut</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-brand-white/5">
                                  {sessionBookings.map((p) => {
                                    const isCancelled = p.status === "cancelled";
                                    return (
                                      <tr
                                        key={p.bookingId}
                                        className={cn(
                                          "hover:bg-brand-white/[0.02] transition-colors",
                                          isCancelled && "opacity-50"
                                        )}
                                      >
                                        <td className="py-2.5 px-3 font-semibold text-brand-white">
                                          {p.memberName}
                                        </td>
                                        <td className="py-2.5 px-3 text-brand-blue">
                                          <a
                                            href={`tel:${p.phone}`}
                                            className="hover:underline flex items-center gap-1"
                                          >
                                            <Phone size={12} />
                                            {p.phone}
                                          </a>
                                        </td>
                                        <td className="py-2.5 px-3">
                                          <span className="px-2 py-0.5 rounded bg-brand-white/5 text-[10px] uppercase font-bold text-brand-white/80 border border-brand-white/10">
                                            {p.planName}
                                          </span>
                                        </td>
                                        <td className="py-2.5 px-3 text-brand-white/40 text-[11px]">
                                          {p.createdAt}
                                        </td>
                                        <td className="py-2.5 px-3 text-right">
                                          {isCancelled ? (
                                            <span className="px-2 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/30 text-[10px] font-bold uppercase">
                                              Annulé
                                            </span>
                                          ) : (
                                            <span className="px-2 py-0.5 rounded bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/30 text-[10px] font-bold uppercase">
                                              Inscrit
                                            </span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
