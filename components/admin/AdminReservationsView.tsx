"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
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
  CheckCircle,
  Mail,
  ExternalLink,
  Search,
  Filter,
  Copy,
  Users,
  Eye,
  FileText,
  AlertCircle,
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
  markTrialAttendanceAdmin,
  cancelTrialBookingAdmin,
  formatToParisDate,
  formatToParisTime,
} from "@/lib/supabase/admin";
import AdminPrintAttendanceSheet from "./reservations/AdminPrintAttendanceSheet";
import AdminSessionDetailsModal from "./reservations/AdminSessionDetailsModal";

const DAYS_SHORT_FR: Record<string, string> = {
  Lundi: "Lun",
  Mardi: "Mar",
  Mercredi: "Mer",
  Jeudi: "Jeu",
  Vendredi: "Ven",
  Samedi: "Sam",
};

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

const OFFICIAL_PRIVATE_HOURS = [
  { start: "08:00", end: "08:50" },
  { start: "09:00", end: "09:50" },
  { start: "10:00", end: "10:50" },
  { start: "14:00", end: "14:50" },
  { start: "15:00", end: "15:50" },
  { start: "16:00", end: "16:50" },
];

type ReservationTab = "trial" | "small_group" | "private";
type ViewMode = "day" | "week";

interface AdminReservationsViewProps {
  weeklyData: AdminWeeklyReservationsData;
  initialWeekOffset?: number;
  initialTab?: ReservationTab;
  initialViewMode?: ViewMode;
  initialSelectedDateStr?: string;
  initialTargetSessionId?: string;
  // Compatibilité ascendante facultative
  session?: AdminClassSessionSummary | null;
  participants?: AdminBookingParticipant[];
  allSessionsList?: AdminClassSessionSummary[];
}

export default function AdminReservationsView({
  weeklyData,
  initialWeekOffset = 0,
  initialTab = "trial",
  initialViewMode = "day",
  initialSelectedDateStr,
  initialTargetSessionId,
}: AdminReservationsViewProps) {
  const router = useRouter();
  const supabase = createClient();

  // 1. Onglet actif & Mode d'affichage (Jour vs Semaine)
  const [activeTab, setActiveTab] = useState<ReservationTab>(initialTab);
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);

  // Synchronisation des onglets et modes si l'URL change
  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (initialViewMode) setViewMode(initialViewMode);
  }, [initialViewMode]);

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

      const dateStr = formatToParisDate(d);
      const dayName = DAYS_ORDER[i];
      const monthName = MONTH_NAMES_FR[d.getMonth()];

      days.push({
        dayName,
        shortName: DAYS_SHORT_FR[dayName] || dayName.slice(0, 3),
        dateNum: d.getDate(),
        monthName,
        year: d.getFullYear(),
        dateStr,
        fullLabel: `${dayName} ${d.getDate()} ${monthName} ${d.getFullYear()}`,
      });
    }

    return days;
  }, [weeklyData.weekMonday]);

  // Date sélectionnée pour le Mode Jour
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    if (
      initialSelectedDateStr &&
      weekDays.some((wd) => wd.dateStr === initialSelectedDateStr)
    ) {
      return initialSelectedDateStr;
    }
    const todayStr = formatToParisDate(new Date());
    if (weekDays.some((wd) => wd.dateStr === todayStr)) {
      return todayStr;
    }
    return weekDays[0]?.dateStr || "";
  });

  // 3. État local mutable des réservations pour mise à jour optimiste de l'émargement
  const [bookingsBySession, setBookingsBySession] = useState<
    Record<string, AdminBookingParticipant[]>
  >(() => weeklyData.bookingsBySessionId || {});

  // Synchronisation des réservations lorsque weeklyData change (ex: navigation de semaine)
  useEffect(() => {
    setBookingsBySession(weeklyData.bookingsBySessionId || {});
  }, [weeklyData.bookingsBySessionId]);

  // Synchronisation de la date sélectionnée lors du changement de semaine
  useEffect(() => {
    if (weekDays.length > 0) {
      if (!weekDays.some((wd) => wd.dateStr === selectedDateStr)) {
        if (initialSelectedDateStr && weekDays.some((wd) => wd.dateStr === initialSelectedDateStr)) {
          setSelectedDateStr(initialSelectedDateStr);
        } else {
          setSelectedDateStr(weekDays[0].dateStr);
        }
      }
    }
  }, [weekDays, selectedDateStr, initialSelectedDateStr]);

  const [loadingBookingId, setLoadingBookingId] = useState<string | null>(null);
  const [expandedSessions, setExpandedSessions] = useState<Record<string, boolean>>({});

  // 2. bis Recherche & Filtres instantanés (côté client sans rechargement)
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>("all");
  const [selectedFillFilter, setSelectedFillFilter] = useState<
    "all" | "with_bookings" | "available" | "full"
  >("all");

  // Fiche séance modale & Impression
  const [selectedSessionForModal, setSelectedSessionForModal] =
    useState<AdminClassSessionSummary | null>(null);
  const [printSessionId, setPrintSessionId] = useState<string | null>(null);

  // Mise en évidence de séance ciblée (paramètre ?session=ID)
  const [targetHighlightedSessionId, setTargetHighlightedSessionId] =
    useState<string | null>(initialTargetSessionId || null);

  // Notifications visuelles (feedback des actions) & Copie
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // Auto-scroll et dépliement lors de l'accès direct via ?session=ID
  useEffect(() => {
    if (initialTargetSessionId) {
      setExpandedSessions((prev) => ({
        ...prev,
        [initialTargetSessionId]: true,
      }));
      setTargetHighlightedSessionId(initialTargetSessionId);

      const timer = setTimeout(() => {
        const el = document.getElementById(`session-${initialTargetSessionId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 350);

      return () => clearTimeout(timer);
    }
  }, [initialTargetSessionId]);

  // Copie rapide avec confirmation visuelle
  const handleCopyText = (text: string, label: string) => {
    if (!text || text === "—") return;
    navigator.clipboard.writeText(text);
    setCopiedText(`${label}:${text}`);
    setTimeout(() => {
      setCopiedText(null);
    }, 2000);
  };

  // Déclenchement de l'impression (ciblée ou globale)
  const handleTriggerPrint = (sessionId?: string) => {
    setPrintSessionId(sessionId || null);
    setTimeout(() => {
      window.print();
    }, 80);
  };

  useEffect(() => {
    const handleAfterPrint = () => {
      setPrintSessionId(null);
    };
    window.addEventListener("afterprint", handleAfterPrint);
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, []);

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

  // 5. Séances Privées du jour sélectionné
  const privateSessionsForDay = useMemo(() => {
    return (weeklyData.privateSessions || []).filter(
      (s) => getLocalDateStr(s.starts_at) === selectedDateStr
    );
  }, [weeklyData.privateSessions, selectedDateStr]);

  // 6. Extraction consolidée de tous les Cours d'Essai (trial_bookings)
  const allTrialBookings = useMemo(() => {
    const trials: AdminBookingParticipant[] = [];
    for (const sessionBookings of Object.values(bookingsBySession)) {
      for (const b of sessionBookings) {
        if (b.isTrial) {
          trials.push(b);
        }
      }
    }
    trials.sort((a, b) => {
      const tA = a.sessionStartsAt ? new Date(a.sessionStartsAt).getTime() : 0;
      const tB = b.sessionStartsAt ? new Date(b.sessionStartsAt).getTime() : 0;
      return tA - tB;
    });
    return trials;
  }, [bookingsBySession]);

  // Cours d'essai du jour sélectionné
  const trialBookingsForDay = useMemo(() => {
    return allTrialBookings.filter((tb) => {
      const dStr = tb.sessionStartsAt ? getLocalDateStr(tb.sessionStartsAt) : "";
      return dStr === selectedDateStr;
    });
  }, [allTrialBookings, selectedDateStr]);

  // Compteur dynamique d'essais à venir nécessitant un suivi (statut confirmed et attendance pending ou séance à venir)
  const upcomingTrialCount = useMemo(() => {
    const now = Date.now();
    return allTrialBookings.filter((tb) => {
      const isFuture = tb.sessionStartsAt
        ? new Date(tb.sessionStartsAt).getTime() >= now
        : true;
      return tb.status === "confirmed" && (tb.attendanceStatus === "pending" || isFuture);
    }).length;
  }, [allTrialBookings]);

  // 7. Liste dynamique des disciplines présentes sur la semaine
  const availableDisciplines = useMemo(() => {
    const set = new Set<string>();
    for (const s of weeklyData.smallGroupSessions || []) {
      if (s.discipline) set.add(s.discipline.trim());
    }
    for (const p of weeklyData.privateSessions || []) {
      if (p.discipline) set.add(p.discipline.trim());
    }
    for (const tb of allTrialBookings) {
      if (tb.sessionDiscipline) set.add(tb.sessionDiscipline.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "fr"));
  }, [weeklyData, allTrialBookings]);

  // Fonction de filtrage des séances Small Group
  const isSessionMatchingFilters = (
    session: AdminClassSessionSummary,
    sessionBookings: AdminBookingParticipant[]
  ) => {
    // A. Filtre Discipline
    if (
      selectedDiscipline !== "all" &&
      session.discipline.toLowerCase().trim() !== selectedDiscipline.toLowerCase().trim()
    ) {
      return false;
    }

    const confirmedCount = sessionBookings.filter((b) => b.status === "confirmed").length;
    const capacity = session.max_capacity || (session.type === "private" ? 1 : 12);
    const placesRemaining = Math.max(0, capacity - confirmedCount);

    // B. Filtre Remplissage
    if (selectedFillFilter === "with_bookings" && confirmedCount === 0) return false;
    if (selectedFillFilter === "available" && placesRemaining === 0) return false;
    if (selectedFillFilter === "full" && placesRemaining > 0) return false;

    // C. Recherche textuelle multi-champs
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchesSession =
        session.discipline.toLowerCase().includes(q) ||
        (session.level || "").toLowerCase().includes(q);

      const matchesParticipant = sessionBookings.some((b) => {
        return (
          b.memberName.toLowerCase().includes(q) ||
          (b.phone && b.phone.toLowerCase().includes(q)) ||
          (b.email && b.email.toLowerCase().includes(q)) ||
          b.planName.toLowerCase().includes(q)
        );
      });

      if (!matchesSession && !matchesParticipant) return false;
    }

    return true;
  };

  // Fonction de filtrage des cours d'essai
  const isTrialMatchingFilters = (tb: AdminBookingParticipant) => {
    if (
      selectedDiscipline !== "all" &&
      (tb.sessionDiscipline || "").toLowerCase().trim() !== selectedDiscipline.toLowerCase().trim()
    ) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matches =
        tb.memberName.toLowerCase().includes(q) ||
        (tb.phone && tb.phone.toLowerCase().includes(q)) ||
        (tb.email && tb.email.toLowerCase().includes(q)) ||
        (tb.sessionDiscipline || "").toLowerCase().includes(q);
      if (!matches) return false;
    }
    return true;
  };

  // Séances Small Group du jour filtrées
  const filteredSmallGroupSessionsForDay = useMemo(() => {
    return smallGroupSessionsForDay.filter((s) => {
      const bks = bookingsBySession[s.id] || [];
      return isSessionMatchingFilters(s, bks);
    });
  }, [smallGroupSessionsForDay, bookingsBySession, selectedDiscipline, selectedFillFilter, searchQuery]);

  // Cours d'essai du jour filtrés
  const filteredTrialBookingsForDay = useMemo(() => {
    return trialBookingsForDay.filter(isTrialMatchingFilters);
  }, [trialBookingsForDay, selectedDiscipline, searchQuery]);

  // Fonction de filtrage des créneaux privés
  const isPrivateSlotMatchingFilters = (
    matchingSession?: AdminClassSessionSummary,
    confirmedBooking?: AdminBookingParticipant,
    cancelledBooking?: AdminBookingParticipant
  ) => {
    // A. Filtre Discipline
    if (selectedDiscipline !== "all") {
      const disc = (matchingSession?.discipline || "").toLowerCase().trim();
      if (disc !== selectedDiscipline.toLowerCase().trim()) return false;
    }

    // B. Filtre Remplissage
    if (selectedFillFilter === "with_bookings" && !confirmedBooking) return false;
    if (selectedFillFilter === "available" && confirmedBooking) return false;
    if (selectedFillFilter === "full" && !confirmedBooking) return false;

    // C. Recherche textuelle
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchSess =
        (matchingSession?.discipline || "").toLowerCase().includes(q) ||
        (matchingSession?.level || "").toLowerCase().includes(q);
      const matchConf =
        confirmedBooking &&
        (confirmedBooking.memberName.toLowerCase().includes(q) ||
          (confirmedBooking.phone && confirmedBooking.phone.toLowerCase().includes(q)) ||
          (confirmedBooking.email && confirmedBooking.email.toLowerCase().includes(q)) ||
          confirmedBooking.planName.toLowerCase().includes(q));
      const matchCanc =
        cancelledBooking &&
        (cancelledBooking.memberName.toLowerCase().includes(q) ||
          (cancelledBooking.phone && cancelledBooking.phone.toLowerCase().includes(q)) ||
          (cancelledBooking.email && cancelledBooking.email.toLowerCase().includes(q)) ||
          cancelledBooking.planName.toLowerCase().includes(q));

      if (!matchSess && !matchConf && !matchCanc) return false;
    }

    return true;
  };

  const isFilterActive =
    searchQuery.trim().length > 0 ||
    selectedDiscipline !== "all" ||
    selectedFillFilter !== "all";

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedDiscipline("all");
    setSelectedFillFilter("all");
  };

  // Navigation de semaine en semaine
  const handleNavigateWeek = (offsetChange: number) => {
    const newOffset = weekOffset + offsetChange;
    router.push(`/admin/reservations?week=${newOffset}&tab=${activeTab}&mode=${viewMode}`);
  };

  const handleResetToCurrentWeek = () => {
    router.push(`/admin/reservations?week=0&tab=${activeTab}&mode=${viewMode}`);
  };

  // Bascule du dépliement des participants Small Group
  const toggleSessionExpand = (sessionId: string) => {
    setExpandedSessions((prev) => ({
      ...prev,
      [sessionId]: !prev[sessionId],
    }));
  };

  // Émargement interactif sécurisé (Membres & Cours d'Essai)
  const handleMarkAttendance = async (
    bookingId: string,
    sessionId: string,
    targetStatus: "pending" | "present" | "absent",
    isTrial?: boolean
  ) => {
    setLoadingBookingId(bookingId);

    const res = isTrial
      ? await markTrialAttendanceAdmin(supabase, bookingId, targetStatus)
      : await markAttendanceAdmin(supabase, bookingId, targetStatus);

    if (!res.success) {
      setActionFeedback({
        message: "Erreur lors de l'émargement : " + (res.error || ""),
        type: "error",
      });
      setTimeout(() => setActionFeedback(null), 4000);
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

    setActionFeedback({
      message:
        targetStatus === "present"
          ? "Présence validée avec succès."
          : targetStatus === "absent"
          ? "Absence (No-Show) enregistrée."
          : "Statut réinitialisé en attente.",
      type: "success",
    });
    setTimeout(() => setActionFeedback(null), 3000);

    setLoadingBookingId(null);
  };

  // Annulation administrative d'un cours d'essai
  const handleCancelTrial = async (trialBookingId: string, sessionId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir annuler ce cours d'essai ?")) return;
    setLoadingBookingId(trialBookingId);

    const res = await cancelTrialBookingAdmin(supabase, trialBookingId, "Annulé par l'administrateur");
    if (!res.success) {
      setActionFeedback({
        message: "Erreur lors de l'annulation : " + (res.error || ""),
        type: "error",
      });
      setTimeout(() => setActionFeedback(null), 4000);
      setLoadingBookingId(null);
      return;
    }

    setBookingsBySession((prev) => {
      const sessionBookings = prev[sessionId] || [];
      const updated = sessionBookings.map((b) => {
        if (b.bookingId === trialBookingId) {
          return {
            ...b,
            status: "cancelled",
            attendanceStatus: "absent" as const,
          };
        }
        return b;
      });
      return { ...prev, [sessionId]: updated };
    });

    setActionFeedback({
      message: "Cours d'essai annulé.",
      type: "success",
    });
    setTimeout(() => setActionFeedback(null), 3000);

    setLoadingBookingId(null);
  };

  // Calcul du nombre de séances et de réservations par jour pour les capsules calendrier
  const dayCounters = useMemo(() => {
    const map: Record<
      string,
      {
        sgCount: number;
        sgBooked: number;
        privBooked: number;
        privCancelled: number;
        trialBooked: number;
        trialCancelled: number;
      }
    > = {};

    for (const d of weekDays) {
      map[d.dateStr] = {
        sgCount: 0,
        sgBooked: 0,
        privBooked: 0,
        privCancelled: 0,
        trialBooked: 0,
        trialCancelled: 0,
      };
    }

    // 1. Small Group
    for (const s of weeklyData.smallGroupSessions || []) {
      const dStr = getLocalDateStr(s.starts_at);
      if (map[dStr]) {
        map[dStr].sgCount += 1;
        const bks = bookingsBySession[s.id] || [];
        for (const b of bks) {
          if (!b.isTrial && b.status === "confirmed") {
            map[dStr].sgBooked += 1;
          }
        }
      }
    }

    // 2. Cours d'Essai (directement depuis allTrialBookings)
    for (const tb of allTrialBookings) {
      const dStr = tb.sessionStartsAt ? getLocalDateStr(tb.sessionStartsAt) : "";
      if (map[dStr]) {
        if (tb.status === "confirmed") {
          map[dStr].trialBooked += 1;
        } else if (tb.status === "cancelled") {
          map[dStr].trialCancelled += 1;
        }
      }
    }

    // 3. Privés
    for (const p of weeklyData.privateSessions || []) {
      const dStr = getLocalDateStr(p.starts_at);
      if (map[dStr]) {
        const bks = bookingsBySession[p.id] || [];
        for (const b of bks) {
          if (b.status === "confirmed") {
            map[dStr].privBooked += 1;
          } else if (b.status === "cancelled") {
            map[dStr].privCancelled += 1;
          }
        }
      }
    }

    return map;
  }, [weekDays, weeklyData, bookingsBySession, allTrialBookings]);

  // Total de la semaine pour KPIs
  const weeklyTotals = useMemo(() => {
    let totalPrivConfirmed = 0;
    let totalPrivCancelled = 0;
    for (const p of weeklyData.privateSessions || []) {
      const bks = bookingsBySession[p.id] || [];
      for (const b of bks) {
        if (b.status === "confirmed") totalPrivConfirmed++;
        else if (b.status === "cancelled") totalPrivCancelled++;
      }
    }

    const totalSgSessions = (weeklyData.smallGroupSessions || []).length;
    let totalSgInscrits = 0;
    for (const s of weeklyData.smallGroupSessions || []) {
      const bks = bookingsBySession[s.id] || [];
      for (const b of bks) {
        if (!b.isTrial && b.status === "confirmed") {
          totalSgInscrits++;
        }
      }
    }

    let totalTrialConfirmed = 0;
    let totalTrialAttended = 0;
    let totalTrialCancelled = 0;
    for (const tb of allTrialBookings) {
      if (tb.status === "confirmed") {
        totalTrialConfirmed++;
        if (tb.attendanceStatus === "present") totalTrialAttended++;
      } else if (tb.status === "cancelled") {
        totalTrialCancelled++;
      }
    }

    return {
      privConfirmed: totalPrivConfirmed,
      privCancelled: totalPrivCancelled,
      sgSessions: totalSgSessions,
      sgInscrits: totalSgInscrits,
      trialConfirmed: totalTrialConfirmed,
      trialAttended: totalTrialAttended,
      trialCancelled: totalTrialCancelled,
    };
  }, [weeklyData, bookingsBySession, allTrialBookings]);

  // Helper de rendu d'une carte de cours d'essai (utilisé en vue Semaine et Jour)
  const renderTrialBookingCard = (
    booking: AdminBookingParticipant,
    options?: { showDayLink?: boolean; dayDateStr?: string }
  ) => {
    const sStartTime =
      booking.sessionTimeFormatted ||
      (booking.sessionStartsAt ? formatToParisTime(booking.sessionStartsAt) : "");
    const sEndTime = booking.sessionEndsAt ? formatToParisTime(booking.sessionEndsAt) : "";
    const isCancelled = booking.status === "cancelled";
    const sessionId = booking.sessionId || "";

    return (
      <div
        key={booking.bookingId}
        className={cn(
          "bg-[#0c1626] border rounded-2xl p-5 shadow-xl space-y-4 transition-all relative overflow-hidden",
          isCancelled
            ? "border-red-500/30 bg-[#0c1626]/70 opacity-75"
            : "border-brand-blue/30 shadow-[0_0_20px_rgba(47,174,224,0.08)]"
        )}
      >
        {/* En-tête : Badge COURS D'ESSAI + Séance & Horaire + Statut */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-white/10 pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-lg bg-brand-blue/15 border border-brand-blue/30 text-brand-blue text-xs font-heading font-black uppercase tracking-wider flex items-center">
                COURS D&apos;ESSAI
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-brand-blue/15 border border-brand-blue/30 text-brand-blue text-xs font-heading font-black uppercase tracking-wider flex items-center gap-1.5">
                <Clock size={13} />
                {sStartTime} {sEndTime ? `→ ${sEndTime}` : ""}
              </span>
              <span className="text-xs font-bold uppercase text-brand-white">
                {booking.sessionDiscipline || "Cours Adulte"}
              </span>
              {booking.sessionLevel && (
                <span className="text-[10px] text-brand-white/50">
                  ({booking.sessionLevel})
                </span>
              )}
            </div>
            {booking.sessionDateFormatted && (
              <span className="text-xs text-brand-white/60 font-semibold block capitalize">
                📅 {booking.sessionDateFormatted}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {isCancelled ? (
              <span className="px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 text-[10px] font-heading font-black uppercase tracking-wider flex items-center gap-1">
                <XCircle size={11} />
                Annulé
              </span>
            ) : booking.attendanceStatus === "present" ? (
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-heading font-black uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 size={11} />
                Présent
              </span>
            ) : booking.attendanceStatus === "absent" ? (
              <span className="px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 text-[10px] font-heading font-black uppercase tracking-wider flex items-center gap-1">
                <XCircle size={11} />
                Absent (No-Show)
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-brand-blue/15 text-brand-blue border border-brand-blue/30 text-[10px] font-heading font-black uppercase tracking-wider flex items-center gap-1">
                <Clock size={11} />
                Confirmé • En attente
              </span>
            )}

            {options?.showDayLink && options.dayDateStr && (
              <button
                onClick={() => {
                  setSelectedDateStr(options.dayDateStr!);
                  setViewMode("day");
                }}
                className="text-[10px] font-bold text-brand-blue hover:underline flex items-center gap-1 cursor-pointer ml-1"
                title="Consulter ce jour en mode Jour"
              >
                <ExternalLink size={10} />
                Mode Jour
              </button>
            )}
          </div>
        </div>

        {/* Fiche Prospect (Nom, Prénom, Téléphone, Email, Date réservation) */}
        <div className="bg-[#070d18] border border-brand-white/5 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <span className="text-xs text-brand-white/40 uppercase tracking-widest block font-heading text-[10px]">
                Prospect
              </span>
              <span className="text-base font-heading font-bold text-brand-white uppercase tracking-wide">
                {booking.memberName}
              </span>
            </div>
            <span className="text-[10px] text-brand-white/40">
              Inscrit le {booking.createdAt}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-brand-white/5 text-xs">
            {/* Téléphone cliquable tel: */}
            <div className="flex items-center gap-2">
              <span className="text-brand-white/40 text-[11px]">Tél :</span>
              {booking.phone && booking.phone !== "—" ? (
                <a
                  href={`tel:${booking.phone}`}
                  className="inline-flex items-center gap-1.5 text-brand-blue hover:underline font-bold text-xs"
                >
                  <Phone size={13} />
                  {booking.phone}
                </a>
              ) : (
                <span className="text-brand-white/40">Non renseigné</span>
              )}
            </div>

            {/* Email cliquable mailto: */}
            <div className="flex items-center gap-2">
              <span className="text-brand-white/40 text-[11px]">Email :</span>
              {booking.email ? (
                <a
                  href={`mailto:${booking.email}`}
                  className="inline-flex items-center gap-1.5 text-brand-white/80 hover:text-brand-blue hover:underline text-xs"
                >
                  <Mail size={13} />
                  {booking.email}
                </a>
              ) : (
                <span className="text-brand-white/40">Non renseigné</span>
              )}
            </div>
          </div>
        </div>

        {/* Émargement interactif & Annulation pour l'Admin */}
        {!isCancelled && (
          <div className="pt-2 border-t border-brand-white/5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase text-brand-white/50">
                Émargement :
              </span>
              {booking.attendanceStatus === "present" ? (
                <span className="text-[10px] font-bold text-[#22c55e] flex items-center gap-1">
                  <CheckCircle size={12} />
                  Présent {booking.attendedAt ? `(${booking.attendedAt})` : ""}
                </span>
              ) : booking.attendanceStatus === "absent" ? (
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

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() =>
                  handleMarkAttendance(
                    booking.bookingId,
                    sessionId,
                    "present",
                    true
                  )
                }
                disabled={loadingBookingId === booking.bookingId}
                className={cn(
                  "px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-colors cursor-pointer flex items-center gap-1",
                  booking.attendanceStatus === "present"
                    ? "bg-[#22c55e] text-black font-black shadow-md shadow-[#22c55e]/20"
                    : "bg-[#22c55e]/15 hover:bg-[#22c55e]/30 text-[#22c55e]"
                )}
              >
                <Check size={12} />
                Présent
              </button>

              <button
                onClick={() =>
                  handleMarkAttendance(
                    booking.bookingId,
                    sessionId,
                    "absent",
                    true
                  )
                }
                disabled={loadingBookingId === booking.bookingId}
                className={cn(
                  "px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-colors cursor-pointer flex items-center gap-1",
                  booking.attendanceStatus === "absent"
                    ? "bg-red-500 text-white font-black shadow-md shadow-red-500/20"
                    : "bg-red-500/15 hover:bg-red-500/30 text-red-400"
                )}
              >
                <X size={12} />
                Absent
              </button>

              <button
                onClick={() =>
                  handleCancelTrial(booking.bookingId, sessionId)
                }
                disabled={loadingBookingId === booking.bookingId}
                className="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-bold uppercase transition-colors cursor-pointer border border-red-500/20"
                title="Annuler ce cours d'essai"
              >
                Annuler
              </button>

              <button
                onClick={() =>
                  handleMarkAttendance(
                    booking.bookingId,
                    sessionId,
                    "pending",
                    true
                  )
                }
                disabled={loadingBookingId === booking.bookingId}
                className="p-1 rounded text-brand-white/40 hover:text-brand-white transition-colors cursor-pointer"
                title="Réinitialiser en attente"
              >
                <RotateCcw size={13} />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Helper de rendu d'une carte de réservation privée (utilisé en vue Semaine et Jour)
  const renderPrivateBookingCard = (
    booking: AdminBookingParticipant,
    session: AdminClassSessionSummary,
    options?: { showDayLink?: boolean; dayDateStr?: string }
  ) => {
    const sStartTime = formatToParisTime(session.starts_at);
    const sEndTime = session.ends_at ? formatToParisTime(session.ends_at) : "";
    const isTargeted = session.id === targetHighlightedSessionId;

    return (
      <div
        key={booking.bookingId}
        id={`session-${session.id}`}
        className={cn(
          "bg-[#0f172a] border rounded-2xl p-4 sm:p-5 shadow-xl space-y-3.5 transition-all duration-300 relative overflow-hidden",
          isTargeted
            ? "border-brand-blue ring-2 ring-brand-blue/50 ring-offset-2 ring-offset-[#070d18] shadow-[0_0_30px_rgba(47,174,224,0.35)]"
            : booking.status === "confirmed"
            ? "border-brand-blue/40 shadow-[0_0_20px_rgba(47,174,224,0.08)]"
            : "border-red-500/30 bg-[#0f172a]/70"
        )}
      >
        {/* En-tête : Heure + Statut + Action Mode Jour */}
        <div className="flex items-start justify-between gap-3 border-b border-brand-white/5 pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-lg bg-brand-blue/15 border border-brand-blue/30 text-brand-blue text-xs font-heading font-black uppercase tracking-wider flex items-center gap-1.5">
                <Clock size={13} />
                {sStartTime} {sEndTime ? `→ ${sEndTime}` : ""}
              </span>
              <span className="text-xs font-bold uppercase text-brand-white">
                {session.discipline || "Cours Privé"}
              </span>
              {session.level && (
                <span className="text-[10px] text-brand-white/50">
                  ({session.level})
                </span>
              )}
            </div>
            <span className="text-[11px] text-brand-white/40 block">
              Durée : 50 min • Séance individuelle
            </span>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleTriggerPrint(session.id)}
                className="p-1 rounded-lg bg-brand-white/5 hover:bg-brand-white/10 text-brand-white/70 hover:text-brand-white transition-colors cursor-pointer border border-brand-white/10"
                title="Imprimer cette feuille d'émargement"
              >
                <Printer size={12} />
              </button>

              {booking.status === "confirmed" ? (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-heading font-black uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle2 size={11} />
                  Confirmé
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 text-[10px] font-heading font-black uppercase tracking-wider flex items-center gap-1">
                  <XCircle size={11} />
                  Annulé
                </span>
              )}
            </div>

            {options?.showDayLink && options.dayDateStr && (
              <button
                onClick={() => {
                  setSelectedDateStr(options.dayDateStr!);
                  setViewMode("day");
                }}
                className="text-[10px] font-bold text-brand-blue hover:underline flex items-center gap-1 cursor-pointer"
                title="Consulter ce jour en mode Jour"
              >
                <ExternalLink size={10} />
                Mode Jour
              </button>
            )}
          </div>
        </div>

        {/* Fiche Membre & Formule */}
        <div className="bg-[#070d18] border border-brand-white/5 rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-heading font-bold text-brand-white uppercase tracking-wide">
              {booking.memberName}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-brand-white/10 text-brand-white/80 font-semibold uppercase">
              {booking.planName}
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-brand-white/70">
            <div className="flex items-center gap-3 flex-wrap">
              {booking.phone && booking.phone !== "—" ? (
                <a
                  href={`tel:${booking.phone}`}
                  className="flex items-center gap-1 text-brand-blue hover:underline font-semibold text-xs"
                >
                  <Phone size={12} />
                  {booking.phone}
                </a>
              ) : (
                <span className="text-brand-white/40 text-[11px] flex items-center gap-1">
                  <Phone size={11} /> Tél non renseigné
                </span>
              )}

              {booking.email && (
                <a
                  href={`mailto:${booking.email}`}
                  className="flex items-center gap-1 text-brand-white/50 hover:text-brand-white hover:underline text-[11px]"
                >
                  <Mail size={11} />
                  {booking.email}
                </a>
              )}
            </div>

            {booking.status === "cancelled" ? (
              <span className="text-[10px] text-red-400 font-semibold">
                {booking.isLateCancellation ? "Annulation tardive (<24h)" : "Annulation standard (≥24h)"}
              </span>
            ) : (
              <span className="text-[10px] text-brand-white/40">
                Réservé le : {booking.createdAt}
              </span>
            )}
          </div>
        </div>

        {/* Émargement interactif (pour réservations confirmées) */}
        {booking.status === "confirmed" && (
          <div className="pt-2 border-t border-brand-white/5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase text-brand-white/50">
                Émargement :
              </span>
              {booking.attendanceStatus === "present" ? (
                <span className="text-[10px] font-bold text-[#22c55e] flex items-center gap-1">
                  <CheckCircle size={12} />
                  Présent {booking.attendedAt ? `(${booking.attendedAt})` : ""}
                </span>
              ) : booking.attendanceStatus === "absent" ? (
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
                    booking.bookingId,
                    session.id,
                    "present"
                  )
                }
                disabled={loadingBookingId === booking.bookingId}
                className={cn(
                  "px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-colors cursor-pointer",
                  booking.attendanceStatus === "present"
                    ? "bg-[#22c55e] text-black font-black"
                    : "bg-[#22c55e]/15 hover:bg-[#22c55e]/30 text-[#22c55e]"
                )}
              >
                Présent
              </button>

              <button
                onClick={() =>
                  handleMarkAttendance(
                    booking.bookingId,
                    session.id,
                    "absent"
                  )
                }
                disabled={loadingBookingId === booking.bookingId}
                className={cn(
                  "px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-colors cursor-pointer",
                  booking.attendanceStatus === "absent"
                    ? "bg-red-500 text-white font-black"
                    : "bg-red-500/15 hover:bg-red-500/30 text-red-400"
                )}
              >
                Absent
              </button>

              <button
                onClick={() =>
                  handleMarkAttendance(
                    booking.bookingId,
                    session.id,
                    "pending"
                  )
                }
                disabled={loadingBookingId === booking.bookingId}
                className="p-1 rounded text-brand-white/40 hover:text-brand-white transition-colors cursor-pointer"
                title="Réinitialiser en attente"
              >
                <RotateCcw size={13} />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Helper de rendu d'une séance Small Group
  const renderSmallGroupSessionCard = (
    session: AdminClassSessionSummary,
    options?: { showDayLink?: boolean; dayDateStr?: string }
  ) => {
    const sessionBookings = bookingsBySession[session.id] || [];
    const confirmedParticipants = sessionBookings.filter(
      (b) => b.status === "confirmed"
    );
    const confirmedCount = confirmedParticipants.length;
    const capacity = session.max_capacity || 12;
    const placesRemaining = Math.max(0, capacity - confirmedCount);
    const isFull = placesRemaining === 0;
    const isAlmostFull = placesRemaining > 0 && placesRemaining <= 2;
    const isVirtual = session.id.startsWith("tmpl_");

    const isPast = session.ends_at
      ? new Date(session.ends_at).getTime() <= Date.now()
      : false;

    // Auto-dépliement si un inscrit correspond à la recherche active ou si session ciblée
    const isParticipantMatch =
      searchQuery.trim().length > 0 &&
      sessionBookings.some((b) => {
        const q = searchQuery.toLowerCase().trim();
        return (
          b.memberName.toLowerCase().includes(q) ||
          (b.phone && b.phone.toLowerCase().includes(q)) ||
          (b.email && b.email.toLowerCase().includes(q)) ||
          b.planName.toLowerCase().includes(q)
        );
      });

    const isExpanded =
      expandedSessions[session.id] ??
      (isParticipantMatch || session.id === targetHighlightedSessionId || true);

    const sStartTime = getLocalTimeStr(session.starts_at);
    const sEndTime = getLocalTimeStr(session.ends_at);
    const isTargeted = session.id === targetHighlightedSessionId;

    return (
      <div
        key={session.id}
        id={`session-${session.id}`}
        className={cn(
          "bg-[#0f172a] border rounded-2xl p-5 sm:p-6 shadow-xl space-y-5 transition-all duration-300",
          isTargeted
            ? "border-brand-blue ring-2 ring-brand-blue/50 ring-offset-2 ring-offset-[#070d18] shadow-[0_0_30px_rgba(47,174,224,0.35)]"
            : "border-brand-white/10"
        )}
      >
        {/* Header de la séance */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded bg-brand-blue/15 text-brand-blue border border-brand-blue/30 text-[10px] font-heading font-black uppercase tracking-wider">
                Cours Adulte
              </span>
              {session.level && (
                <span className="px-2.5 py-0.5 rounded bg-brand-white/10 text-brand-white/80 border border-brand-white/15 text-[10px] font-bold uppercase tracking-wider">
                  {session.level}
                </span>
              )}
              {isVirtual && (
                <span className="px-2.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-heading font-black uppercase tracking-wider">
                  Modèle récurrent (Non instancié)
                </span>
              )}
              {isPast && (
                <span className="px-2.5 py-0.5 rounded bg-zinc-700/40 text-zinc-300 border border-zinc-600/40 text-[10px] font-bold uppercase tracking-wider">
                  Séance terminée
                </span>
              )}
              {options?.showDayLink && options.dayDateStr && (
                <button
                  onClick={() => {
                    setSelectedDateStr(options.dayDateStr!);
                    setViewMode("day");
                  }}
                  className="px-2 py-0.5 rounded bg-brand-white/5 hover:bg-brand-white/10 text-brand-blue text-[10px] font-heading font-bold uppercase border border-brand-white/10 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <ExternalLink size={10} />
                  Mode Jour
                </button>
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

          {/* Jauge réelle & Places restantes & Actions rapides */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-[#070d18] border border-brand-white/5 rounded-xl p-3.5 sm:px-5 w-full lg:w-auto">
            <div className="flex items-center justify-between gap-4 w-full sm:w-auto">
              <div className="flex-1 sm:min-w-[170px] space-y-1.5">
                <div className="flex items-center justify-between text-xs font-heading font-bold uppercase">
                  <span className="text-brand-white/60">
                    Inscrits : {confirmedCount} / {capacity}
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-heading font-black uppercase px-2 py-0.5 rounded-full border",
                      isFull
                        ? "bg-red-500/15 text-red-400 border-red-500/30"
                        : isAlmostFull
                        ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                        : "bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/30"
                    )}
                  >
                    {isFull
                      ? "Complet"
                      : `${placesRemaining} libre${placesRemaining > 1 ? "s" : ""}`}
                  </span>
                </div>

                <div className="w-full bg-brand-white/10 h-2 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-300",
                      isFull
                        ? "bg-red-500"
                        : isAlmostFull
                        ? "bg-amber-400"
                        : "bg-[#22c55e]"
                    )}
                    style={{
                      width: `${Math.min(100, (confirmedCount / capacity) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Statut du cours */}
              <div className="border-l border-brand-white/10 pl-3 flex items-center shrink-0">
                {isPast ? (
                  <span className="px-2 py-1 rounded bg-zinc-700/30 text-zinc-400 border border-zinc-600/30 text-[10px] font-bold uppercase tracking-wider">
                    Terminé
                  </span>
                ) : isFull ? (
                  <span className="px-2 py-1 rounded bg-red-500/15 text-red-400 border border-red-500/30 text-[10px] font-bold uppercase tracking-wider">
                    Complet
                  </span>
                ) : (
                  <span className="px-2 py-1 rounded bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/30 text-[10px] font-bold uppercase tracking-wider">
                    Actif
                  </span>
                )}
              </div>
            </div>

            {/* Boutons d'action : Fiche émargement, Impression, Dépliement */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
              {!isVirtual && (
                <>
                  <button
                    onClick={() => setSelectedSessionForModal(session)}
                    className="px-3 py-1.5 rounded-lg bg-brand-blue/15 hover:bg-brand-blue/25 text-brand-blue font-heading font-bold text-[11px] uppercase tracking-wider transition-colors cursor-pointer border border-brand-blue/30 flex items-center gap-1.5"
                    title="Ouvrir la feuille d'émargement détaillée de cette séance"
                  >
                    <Users size={13} />
                    <span>Fiche Séance</span>
                  </button>

                  <button
                    onClick={() => handleTriggerPrint(session.id)}
                    className="p-1.5 rounded-lg bg-brand-white/5 hover:bg-brand-white/10 text-brand-white/70 hover:text-brand-white transition-colors cursor-pointer border border-brand-white/10"
                    title="Imprimer cette feuille d'émargement"
                  >
                    <Printer size={14} />
                  </button>
                </>
              )}

              <button
                onClick={() => toggleSessionExpand(session.id)}
                className="px-3 py-1.5 rounded-lg bg-brand-white/5 hover:bg-brand-white/10 text-brand-white/80 hover:text-brand-white font-heading font-bold text-[11px] uppercase tracking-wider transition-colors cursor-pointer shrink-0"
              >
                {isExpanded ? "Masquer" : `Voir les inscrits (${confirmedCount})`}
              </button>
            </div>
          </div>
        </div>

        {/* Table détaillée des inscrits */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="pt-4 border-t border-brand-white/10 space-y-3"
            >
              {isVirtual ? (
                <div className="py-6 text-center text-brand-white/40 text-xs italic bg-[#0c1626]/40 rounded-xl border border-brand-white/5">
                  Créneau issu du planning récurrent officiel (0 réservation enregistrée).
                </div>
              ) : sessionBookings.length === 0 ? (
                <div className="py-6 text-center text-brand-white/40 text-xs italic bg-[#0c1626]/40 rounded-xl border border-brand-white/5">
                  Aucune réservation pour cette séance (0 / {capacity}). {placesRemaining} places disponibles.
                </div>
              ) : (
                <div className="overflow-x-auto border border-brand-white/5 rounded-xl bg-[#070d18]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-brand-white/10 text-brand-white/40 uppercase tracking-widest text-[10px] bg-[#0c1626]">
                        <th className="py-3 px-3 font-heading">Participant</th>
                        <th className="py-3 px-3 font-heading">Coordonnées</th>
                        <th className="py-3 px-3 font-heading">Formule / Statut</th>
                        <th className="py-3 px-3 font-heading">Date d&apos;inscription</th>
                        <th className="py-3 px-3 font-heading text-right">Émargement & Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-white/5">
                      {sessionBookings.map((p) => {
                        const isCancelled = p.status === "cancelled";
                        const isCopyingPhone = copiedText === `phone:${p.phone}`;
                        const isCopyingEmail = copiedText === `email:${p.email}`;
                        const isCurrentLoading = loadingBookingId === p.bookingId;

                        return (
                          <tr
                            key={p.bookingId}
                            className={cn(
                              "hover:bg-brand-white/[0.02] transition-colors",
                              isCancelled && "opacity-50",
                              p.isTrial && "bg-amber-500/[0.03]"
                            )}
                          >
                            {/* Nom & Type de participant */}
                            <td className="py-3 px-3 font-semibold text-brand-white">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-heading uppercase tracking-wide">
                                  {p.memberName}
                                </span>
                                {p.isTrial ? (
                                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-heading font-black uppercase tracking-wider">
                                    Prospect Essai
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded bg-brand-blue/15 text-brand-blue border border-brand-blue/30 text-[9px] font-heading font-bold uppercase tracking-wider">
                                    Adhérent
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Coordonnées disponibles */}
                            <td className="py-3 px-3 space-y-1">
                              {p.phone && p.phone !== "—" ? (
                                <div className="flex items-center gap-1.5">
                                  <a
                                    href={`tel:${p.phone}`}
                                    className="hover:underline flex items-center gap-1 text-brand-blue font-semibold text-xs"
                                  >
                                    <Phone size={11} />
                                    {p.phone}
                                  </a>
                                  <button
                                    onClick={() => handleCopyText(p.phone, "phone")}
                                    className="text-brand-white/40 hover:text-brand-white transition-colors p-0.5 rounded cursor-pointer"
                                    title="Copier le numéro"
                                  >
                                    {isCopyingPhone ? (
                                      <Check size={11} className="text-emerald-400" />
                                    ) : (
                                      <Copy size={11} />
                                    )}
                                  </button>
                                </div>
                              ) : (
                                <span className="text-brand-white/40 text-[11px]">Tél : —</span>
                              )}

                              {p.email && (
                                <div className="flex items-center gap-1.5">
                                  <a
                                    href={`mailto:${p.email}`}
                                    className="text-[11px] text-brand-white/60 hover:text-brand-blue flex items-center gap-1"
                                  >
                                    <Mail size={10} />
                                    {p.email}
                                  </a>
                                  <button
                                    onClick={() => handleCopyText(p.email!, "email")}
                                    className="text-brand-white/40 hover:text-brand-white transition-colors p-0.5 rounded cursor-pointer"
                                    title="Copier l'email"
                                  >
                                    {isCopyingEmail ? (
                                      <Check size={10} className="text-emerald-400" />
                                    ) : (
                                      <Copy size={10} />
                                    )}
                                  </button>
                                </div>
                              )}
                            </td>

                            {/* Formule */}
                            <td className="py-3 px-3">
                              {p.isTrial ? (
                                <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] uppercase font-heading font-black tracking-wider inline-block">
                                  COURS D&apos;ESSAI
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-brand-white/5 text-[10px] uppercase font-bold text-brand-white/80 border border-brand-white/10 inline-block">
                                  {p.planName}
                                </span>
                              )}
                            </td>

                            {/* Date résa */}
                            <td className="py-3 px-3 text-brand-white/40 text-[11px]">
                              {p.createdAt}
                            </td>

                            {/* Émargement pour TOUS les participants */}
                            <td className="py-3 px-3 text-right">
                              {isCancelled ? (
                                <span className="px-2 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/30 text-[10px] font-bold uppercase">
                                  Annulé
                                </span>
                              ) : (
                                <div className="inline-flex flex-col items-end gap-1">
                                  {/* Statut actuel */}
                                  <div className="flex items-center gap-1 text-[10px]">
                                    {p.attendanceStatus === "present" ? (
                                      <span className="text-[#22c55e] font-bold flex items-center gap-1">
                                        <CheckCircle size={11} />
                                        Présent {p.attendedAt ? `(${p.attendedAt})` : ""}
                                      </span>
                                    ) : p.attendanceStatus === "absent" ? (
                                      <span className="text-red-400 font-bold flex items-center gap-1">
                                        <XCircle size={11} />
                                        Absent
                                      </span>
                                    ) : (
                                      <span className="text-amber-300 font-semibold">
                                        En attente
                                      </span>
                                    )}
                                  </div>

                                  {/* Boutons d'émargement complets */}
                                  <div className="inline-flex items-center gap-1 justify-end">
                                    <button
                                      onClick={() =>
                                        handleMarkAttendance(
                                          p.bookingId,
                                          session.id,
                                          "present",
                                          Boolean(p.isTrial)
                                        )
                                      }
                                      disabled={isCurrentLoading}
                                      className={cn(
                                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors cursor-pointer flex items-center gap-0.5",
                                        p.attendanceStatus === "present"
                                          ? "bg-[#22c55e] text-black font-black"
                                          : "bg-[#22c55e]/15 hover:bg-[#22c55e]/30 text-[#22c55e]"
                                      )}
                                      title="Marquer présent"
                                    >
                                      <Check size={10} />
                                      Présent
                                    </button>

                                    <button
                                      onClick={() =>
                                        handleMarkAttendance(
                                          p.bookingId,
                                          session.id,
                                          "absent",
                                          Boolean(p.isTrial)
                                        )
                                      }
                                      disabled={isCurrentLoading}
                                      className={cn(
                                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors cursor-pointer flex items-center gap-0.5",
                                        p.attendanceStatus === "absent"
                                          ? "bg-red-500 text-white font-black"
                                          : "bg-red-500/15 hover:bg-red-500/30 text-red-400"
                                      )}
                                      title="Marquer absent"
                                    >
                                      <X size={10} />
                                      Absent
                                    </button>

                                    <button
                                      onClick={() =>
                                        handleMarkAttendance(
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
                                      <RotateCcw size={10} />
                                    </button>

                                    {p.isTrial && (
                                      <button
                                        onClick={() => handleCancelTrial(p.bookingId, session.id)}
                                        disabled={isCurrentLoading}
                                        className="px-1.5 py-0.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[9px] font-bold uppercase border border-red-500/20 transition-colors ml-1"
                                        title="Annuler ce cours d'essai"
                                      >
                                        Annuler
                                      </button>
                                    )}
                                  </div>
                                </div>
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
  };

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
            Planning unifié, gestion des présences et consultation des inscrits.
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
            onClick={() => handleTriggerPrint()}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-blue hover:bg-brand-white text-brand-black font-heading font-bold text-xs uppercase tracking-wider rounded-sm transition-all shadow-md shadow-brand-blue/20 cursor-pointer"
            title="Imprimer la feuille d'émargement"
          >
            <Printer size={14} />
            Imprimer
          </button>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          2. SÉLECTEURS PRINCIPAUX : [ COURS D'ESSAI | SMALL GROUP | COURS PRIVÉS ] + [ JOUR | SEMAINE ]
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 print:hidden">
        {/* Onglets Métier : [ COURS D'ESSAI ] [ SMALL GROUP ] [ COURS PRIVÉS ] */}
        <div className="flex-1 flex items-center gap-2 p-1.5 bg-[#0b1322] border border-brand-white/10 rounded-2xl">
          {/* 1. COURS D'ESSAI (avec badge dynamique) */}
          <button
            onClick={() => setActiveTab("trial")}
            className={cn(
              "flex-1 py-3 px-3 sm:px-4 rounded-xl font-heading font-black text-xs sm:text-sm uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer relative",
              activeTab === "trial"
                ? "bg-gradient-to-r from-brand-blue to-[#00d8ff] text-black shadow-lg shadow-brand-blue/20 scale-[1.01]"
                : "text-brand-white/60 hover:text-brand-white hover:bg-brand-white/5"
            )}
          >
            <span>Cours d&apos;Essai</span>
            {upcomingTrialCount > 0 && (
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full text-[11px] font-black font-heading transition-colors ml-1",
                  activeTab === "trial"
                    ? "bg-black text-brand-blue"
                    : "bg-brand-blue/20 text-brand-blue border border-brand-blue/40"
                )}
              >
                {upcomingTrialCount}
              </span>
            )}
          </button>

          {/* 2. SMALL GROUP */}
          <button
            onClick={() => setActiveTab("small_group")}
            className={cn(
              "flex-1 py-3 px-3 sm:px-4 rounded-xl font-heading font-black text-xs sm:text-sm uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer",
              activeTab === "small_group"
                ? "bg-gradient-to-r from-brand-blue to-[#00d8ff] text-black shadow-lg shadow-brand-blue/20 scale-[1.01]"
                : "text-brand-white/60 hover:text-brand-white hover:bg-brand-white/5"
            )}
          >
            <span>Cours Adulte</span>
          </button>

          {/* 3. COURS PRIVÉS */}
          <button
            onClick={() => setActiveTab("private")}
            className={cn(
              "flex-1 py-3 px-3 sm:px-4 rounded-xl font-heading font-black text-xs sm:text-sm uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer",
              activeTab === "private"
                ? "bg-gradient-to-r from-brand-blue to-[#00d8ff] text-black shadow-lg shadow-brand-blue/20 scale-[1.01]"
                : "text-brand-white/60 hover:text-brand-white hover:bg-brand-white/5"
            )}
          >
            <span>Cours Privés</span>
          </button>
        </div>

        {/* Sélecteur de Mode d'Affichage : [ JOUR ] [ SEMAINE ] */}
        <div className="flex items-center gap-1.5 p-1.5 bg-[#0b1322] border border-brand-white/10 rounded-2xl self-center md:self-auto">
          <button
            onClick={() => setViewMode("day")}
            className={cn(
              "py-2.5 px-4 rounded-xl font-heading font-black text-xs uppercase tracking-wider transition-all duration-200 flex items-center gap-2 cursor-pointer",
              viewMode === "day"
                ? "bg-brand-blue text-black shadow-md shadow-brand-blue/20"
                : "text-brand-white/60 hover:text-brand-white hover:bg-brand-white/5"
            )}
          >
            <Clock size={15} />
            <span>Jour</span>
          </button>

          <button
            onClick={() => setViewMode("week")}
            className={cn(
              "py-2.5 px-4 rounded-xl font-heading font-black text-xs uppercase tracking-wider transition-all duration-200 flex items-center gap-2 cursor-pointer",
              viewMode === "week"
                ? "bg-brand-blue text-black shadow-md shadow-brand-blue/20"
                : "text-brand-white/60 hover:text-brand-white hover:bg-brand-white/5"
            )}
          >
            <Calendar size={15} />
            <span>Semaine</span>
          </button>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          3. NAVIGATION DE LA SEMAINE & (EN MODE JOUR) CAPSULES DES 6 JOURS
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="bg-[#0b1322] border border-brand-white/10 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4 print:hidden">
        {/* Barre de navigation temporelle de la semaine */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-white/5 pb-3">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-brand-blue" />
            <h2 className="text-sm sm:text-base font-heading font-bold uppercase tracking-wider text-brand-white">
              {weekRangeLabel}
            </h2>
            <span className="px-2 py-0.5 rounded bg-brand-white/10 text-brand-white/70 text-[10px] font-heading font-bold uppercase ml-2">
              Vue {viewMode === "day" ? "Jour" : "Semaine"}
            </span>
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

        {/* Grille des 6 jours (Lundi au Samedi) : active en mode Jour pour choisir la date */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {weekDays.map((day) => {
            const isSelected = viewMode === "day" && day.dateStr === selectedDateStr;
            const counters = dayCounters[day.dateStr] || {
              sgCount: 0,
              sgBooked: 0,
              privBooked: 0,
              privCancelled: 0,
              trialBooked: 0,
              trialCancelled: 0,
            };

            let countLabel = "";
            if (activeTab === "trial") {
              if (counters.trialBooked > 0) {
                countLabel = `${counters.trialBooked} essai${counters.trialBooked > 1 ? "s" : ""}`;
              } else if (counters.trialCancelled > 0) {
                countLabel = `${counters.trialCancelled} annulé`;
              } else {
                countLabel = "0 essai";
              }
            } else if (activeTab === "private") {
              if (counters.privBooked > 0 && counters.privCancelled > 0) {
                countLabel = `${counters.privBooked} rés. · ${counters.privCancelled} ann.`;
              } else if (counters.privBooked > 0) {
                countLabel = `${counters.privBooked} rés. / 6`;
              } else if (counters.privCancelled > 0) {
                countLabel = `${counters.privCancelled} ann. / 6`;
              } else {
                countLabel = "0 rés. / 6";
              }
            } else {
              countLabel = `${counters.sgCount} cours · ${counters.sgBooked} insc.`;
            }

            const hasTrialActivity =
              activeTab === "trial" && (counters.trialBooked > 0 || counters.trialCancelled > 0);
            const hasPrivateActivity =
              activeTab === "private" && (counters.privBooked > 0 || counters.privCancelled > 0);

            return (
              <button
                key={day.dateStr}
                onClick={() => {
                  setSelectedDateStr(day.dateStr);
                  if (viewMode === "week") {
                    setViewMode("day");
                  }
                }}
                className={cn(
                  "p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between relative group",
                  isSelected
                    ? "bg-[#13233c] border-brand-blue shadow-[0_0_15px_rgba(47,174,224,0.3)] scale-[1.02]"
                    : "bg-[#0c1626] border-brand-white/10 hover:border-brand-blue/40 hover:bg-[#111c2e]"
                )}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span
                      className={cn(
                        "text-[10px] font-heading font-black uppercase tracking-wider block",
                        isSelected
                          ? "text-brand-blue"
                          : "text-brand-white/50"
                      )}
                    >
                      {day.dayName}
                    </span>
                    <span className="text-2xl font-heading font-black text-brand-white block mt-0.5">
                      {day.dateNum}
                    </span>
                  </div>

                  {hasTrialActivity && !isSelected && (
                    <span
                      className="w-2 h-2 rounded-full mt-1 bg-brand-blue shadow-[0_0_6px_rgba(47,174,224,0.8)]"
                      title={`${counters.trialBooked} cours d'essai`}
                    />
                  )}

                  {hasPrivateActivity && !isSelected && (
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full mt-1",
                        counters.privBooked > 0
                          ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"
                          : "bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.8)]"
                      )}
                      title={
                        counters.privBooked > 0
                          ? `${counters.privBooked} réservation(s) privée(s)`
                          : `${counters.privCancelled} réservation(s) annulée(s)`
                      }
                    />
                  )}
                </div>

                <div className="mt-2 pt-2 border-t border-brand-white/5 flex items-center justify-between">
                  <span
                    className={cn(
                      "text-[10px] font-bold tracking-tight",
                      isSelected
                        ? "text-[#00d8ff]"
                        : hasTrialActivity
                        ? "text-[#00d8ff] font-semibold"
                        : hasPrivateActivity
                        ? counters.privBooked > 0
                          ? "text-emerald-400 font-semibold"
                          : "text-red-400/80 font-semibold"
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
          4. BANDEAU DE CONTEXTE (JOUR OU SEMAINE)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="bg-[#0c1626] border border-brand-white/10 rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-heading font-black uppercase tracking-wider border bg-brand-blue/15 text-brand-blue border-brand-blue/30">
              {activeTab === "trial"
                ? "Cours d'Essai Prospects"
                : activeTab === "private"
                ? "Cours Privés Individuels"
                : "Séances Cours Adulte"}
            </span>
            <span className="text-xs text-brand-white/50">•</span>
            <span className="text-xs font-semibold text-brand-white/70">
              {viewMode === "day" ? currentDayInfo.fullLabel : weekRangeLabel}
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-heading font-black uppercase tracking-wider text-brand-white mt-1">
            {viewMode === "day"
              ? `${currentDayInfo.dayName} ${currentDayInfo.dateNum} ${currentDayInfo.monthName}`
              : "Vue Hebdomadaire Consolidée"}
          </h2>
        </div>

        {/* Mini résumé KPI */}
        <div className="flex items-center gap-3">
          {activeTab === "trial" ? (
            viewMode === "day" ? (
              <div className="flex items-center gap-2">
                <div className="px-3 py-1.5 rounded-lg bg-brand-blue/10 border border-brand-blue/20 text-center">
                  <span className="text-[10px] font-bold text-brand-blue block uppercase">
                    Essais Jour
                  </span>
                  <span className="text-base font-black text-brand-white">
                    {trialBookingsForDay.length}
                  </span>
                </div>
                <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <span className="text-[10px] font-bold text-emerald-400 block uppercase">
                    Présents
                  </span>
                  <span className="text-base font-black text-brand-white">
                    {trialBookingsForDay.filter((t) => t.attendanceStatus === "present").length}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="px-3 py-1.5 rounded-lg bg-brand-blue/10 border border-brand-blue/20 text-center">
                  <span className="text-[10px] font-bold text-brand-blue block uppercase">
                    Essais Semaine
                  </span>
                  <span className="text-base font-black text-brand-white">
                    {weeklyTotals.trialConfirmed}
                  </span>
                </div>
                <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <span className="text-[10px] font-bold text-emerald-400 block uppercase">
                    Présents
                  </span>
                  <span className="text-base font-black text-brand-white">
                    {weeklyTotals.trialAttended}
                  </span>
                </div>
                {weeklyTotals.trialCancelled > 0 && (
                  <div className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
                    <span className="text-[10px] font-bold text-red-400 block uppercase">
                      Annulés
                    </span>
                    <span className="text-base font-black text-brand-white">
                      {weeklyTotals.trialCancelled}
                    </span>
                  </div>
                )}
              </div>
            )
          ) : activeTab === "private" ? (
            viewMode === "day" ? (
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
                <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <span className="text-[10px] font-bold text-emerald-400 block uppercase">
                    Réservés Semaine
                  </span>
                  <span className="text-base font-black text-brand-white">
                    {weeklyTotals.privConfirmed}
                  </span>
                </div>
                {weeklyTotals.privCancelled > 0 && (
                  <div className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
                    <span className="text-[10px] font-bold text-red-400 block uppercase">
                      Annulés
                    </span>
                    <span className="text-base font-black text-brand-white">
                      {weeklyTotals.privCancelled}
                    </span>
                  </div>
                )}
              </div>
            )
          ) : viewMode === "day" ? (
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
          ) : (
            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 rounded-lg bg-brand-blue/10 border border-brand-blue/20 text-center">
                <span className="text-[10px] font-bold text-brand-blue block uppercase">
                  Séances Semaine
                </span>
                <span className="text-base font-black text-brand-white">
                  {weeklyTotals.sgSessions}
                </span>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-[#22c55e]/10 border border-[#22c55e]/20 text-center">
                <span className="text-[10px] font-bold text-[#22c55e] block uppercase">
                  Inscrits Semaine
                </span>
                <span className="text-base font-black text-brand-white">
                  {weeklyTotals.sgInscrits}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          BARRE DE RECHERCHE INSTANTANÉE ET FILTRES MULTI-CRITÈRES
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="bg-[#0c1626] border border-brand-white/10 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3.5 print:hidden">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Champ de recherche instantanée multi-champs (Nom, prénom, tél, email) */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-brand-white/40">
              <Search size={16} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par nom, prénom, téléphone, e-mail, formule..."
              className="w-full bg-[#070d18] border border-brand-white/10 rounded-xl pl-10 pr-9 py-2.5 text-xs text-brand-white placeholder:text-brand-white/30 focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-brand-white/40 hover:text-brand-white transition-colors cursor-pointer"
                title="Effacer la recherche"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Menus déroulants de filtrage */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filtre par Discipline */}
            <div className="relative min-w-[170px] flex-1 sm:flex-initial">
              <select
                value={selectedDiscipline}
                onChange={(e) => setSelectedDiscipline(e.target.value)}
                className="w-full appearance-none bg-[#070d18] border border-brand-white/10 rounded-xl px-3 py-2.5 text-xs text-brand-white font-heading uppercase font-bold focus:outline-none focus:border-brand-blue transition-all cursor-pointer pr-8"
              >
                <option value="all">Toutes disciplines</option>
                {availableDisciplines.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-brand-white/40">
                <Filter size={12} />
              </div>
            </div>

            {/* Filtre par Remplissage / Disponibilité */}
            {activeTab !== "trial" && (
              <div className="relative min-w-[170px] flex-1 sm:flex-initial">
                <select
                  value={selectedFillFilter}
                  onChange={(e) =>
                    setSelectedFillFilter(
                      e.target.value as "all" | "with_bookings" | "available" | "full"
                    )
                  }
                  className="w-full appearance-none bg-[#070d18] border border-brand-white/10 rounded-xl px-3 py-2.5 text-xs text-brand-white font-heading uppercase font-bold focus:outline-none focus:border-brand-blue transition-all cursor-pointer pr-8"
                >
                  <option value="all">Tous remplissages</option>
                  <option value="with_bookings">Séances avec inscrits</option>
                  <option value="available">Places disponibles</option>
                  <option value="full">Séances complètes</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-brand-white/40">
                  <Filter size={12} />
                </div>
              </div>
            )}

            {/* Bouton de réinitialisation si au moins un filtre est actif */}
            {isFilterActive && (
              <button
                onClick={handleResetFilters}
                className="px-3 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-heading font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                title="Réinitialiser tous les filtres"
              >
                <RotateCcw size={12} />
                <span>Réinitialiser</span>
              </button>
            )}
          </div>
        </div>

        {/* Badge récapitulatif des filtres actifs */}
        {isFilterActive && (
          <div className="flex items-center justify-between text-[11px] pt-2 text-brand-white/50 border-t border-brand-white/5 flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span>Filtres appliqués :</span>
              {searchQuery && (
                <span className="px-2 py-0.5 rounded bg-brand-blue/15 text-brand-blue border border-brand-blue/30 font-semibold">
                  &ldquo;{searchQuery}&rdquo;
                </span>
              )}
              {selectedDiscipline !== "all" && (
                <span className="px-2 py-0.5 rounded bg-brand-blue/15 text-brand-blue border border-brand-blue/30 font-semibold">
                  {selectedDiscipline}
                </span>
              )}
              {selectedFillFilter !== "all" && (
                <span className="px-2 py-0.5 rounded bg-brand-blue/15 text-brand-blue border border-brand-blue/30 font-semibold">
                  {selectedFillFilter === "with_bookings"
                    ? "Avec inscrits"
                    : selectedFillFilter === "available"
                    ? "Places libres"
                    : "Complètes"}
                </span>
              )}
            </div>

            <button
              onClick={handleResetFilters}
              className="text-brand-blue hover:underline cursor-pointer font-semibold text-xs"
            >
              Effacer les critères
            </button>
          </div>
        )}
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          5. CONTENU DES RÉSERVATIONS
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="print:hidden space-y-6">
        {/* ─────────────────────────────────────────────────────────────────
            1. ONGLET COURS D'ESSAI
            ───────────────────────────────────────────────────────────────── */}
        {activeTab === "trial" && (
        viewMode === "day" ? (
          /* 1.A COURS D'ESSAI — MODE JOUR */
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-brand-white/10 pb-2">
              <h3 className="text-xs sm:text-sm font-heading font-black uppercase tracking-wider text-brand-white/80 flex items-center gap-2">
                <Calendar size={16} className="text-brand-blue" />
                Réservations Cours d&apos;Essai — {currentDayInfo.dayName} {currentDayInfo.dateNum} {currentDayInfo.monthName} ({filteredTrialBookingsForDay.length}
                {isFilterActive && filteredTrialBookingsForDay.length !== trialBookingsForDay.length
                  ? ` / ${trialBookingsForDay.length}`
                  : ""}
                )
              </h3>
              <span className="text-[11px] text-brand-white/50">
                Prospects ayant réservé un essai sur les créneaux du jour
              </span>
            </div>

            {trialBookingsForDay.length === 0 ? (
              <div className="bg-[#0c1626]/60 border border-brand-white/10 border-dashed rounded-2xl p-12 text-center space-y-3">
                <Calendar size={32} className="mx-auto text-brand-blue/40" />
                <p className="text-sm font-heading font-bold uppercase text-brand-white/70">
                  Aucun cours d&apos;essai réservé pour le {currentDayInfo.dayName} {currentDayInfo.dateNum} {currentDayInfo.monthName}.
                </p>
                <p className="text-xs text-brand-white/40 max-w-sm mx-auto">
                  Les réservations de cours d&apos;essai effectuées par les visiteurs apparaîtront automatiquement ici avec leurs coordonnées complètes.
                </p>
              </div>
            ) : filteredTrialBookingsForDay.length === 0 ? (
              <div className="bg-[#0c1626]/60 border border-brand-white/10 border-dashed rounded-2xl p-10 text-center space-y-3">
                <Filter size={28} className="mx-auto text-brand-blue/50" />
                <p className="text-sm font-heading font-bold uppercase text-brand-white/80">
                  Aucun cours d&apos;essai ne correspond à vos filtres actuels.
                </p>
                <p className="text-xs text-brand-white/40">
                  {trialBookingsForDay.length} réservation(s) de cours d&apos;essai enregistrée(s) ce jour.
                </p>
                <button
                  onClick={handleResetFilters}
                  className="px-3 py-1.5 rounded-lg bg-brand-blue/15 hover:bg-brand-blue/25 text-brand-blue border border-brand-blue/30 text-xs font-heading font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Réinitialiser les filtres
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredTrialBookingsForDay.map((booking) =>
                  renderTrialBookingCard(booking)
                )}
              </div>
            )}
          </div>
        ) : (
          /* 1.B COURS D'ESSAI — MODE SEMAINE (Regroupé chronologiquement jour par jour) */
          <div className="space-y-6">
            {weekDays.map((day) => {
              const allDayTrials = allTrialBookings.filter((tb) => {
                const dStr = tb.sessionStartsAt ? getLocalDateStr(tb.sessionStartsAt) : "";
                return dStr === day.dateStr;
              });

              const dayTrials = allDayTrials.filter(isTrialMatchingFilters);

              const confirmedCount = dayTrials.filter(
                (b) => b.status === "confirmed"
              ).length;
              const attendedCount = dayTrials.filter(
                (b) => b.attendanceStatus === "present"
              ).length;
              const cancelledCount = dayTrials.filter(
                (b) => b.status === "cancelled"
              ).length;

              return (
                <div
                  key={day.dateStr}
                  className="bg-[#0b1322] border border-brand-white/10 rounded-2xl p-5 shadow-xl space-y-4"
                >
                  {/* En-tête du jour */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-white/10 pb-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="px-3 py-1.5 rounded-xl bg-brand-blue/15 border border-brand-blue/30 text-brand-blue font-heading font-black text-sm uppercase">
                        {day.dayName} {day.dateNum} {day.monthName}
                      </div>

                      <div className="flex items-center gap-2">
                        {confirmedCount > 0 && (
                          <span className="px-2.5 py-0.5 rounded-full bg-brand-blue/15 text-brand-blue border border-brand-blue/30 text-xs font-heading font-black uppercase">
                            {confirmedCount} essai{confirmedCount > 1 ? "s" : ""}
                          </span>
                        )}
                        {attendedCount > 0 && (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-heading font-black uppercase">
                            {attendedCount} présent{attendedCount > 1 ? "s" : ""}
                          </span>
                        )}
                        {cancelledCount > 0 && (
                          <span className="px-2.5 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 text-xs font-heading font-black uppercase">
                            {cancelledCount} annulé{cancelledCount > 1 ? "s" : ""}
                          </span>
                        )}
                        {dayTrials.length === 0 && (
                          <span className="text-xs text-brand-white/40">
                            {allDayTrials.length > 0
                              ? `0 essai correspondant aux filtres (${allDayTrials.length} total)`
                              : "0 cours d'essai réservé"}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedDateStr(day.dateStr);
                        setViewMode("day");
                      }}
                      className="px-3 py-1.5 rounded-lg bg-brand-white/5 hover:bg-brand-white/10 text-brand-white/80 hover:text-brand-white text-xs font-heading font-bold uppercase tracking-wider border border-brand-white/10 transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                      title="Consulter ce jour en vue détaillée"
                    >
                      <ExternalLink size={12} />
                      Consulter en mode Jour
                    </button>
                  </div>

                  {/* Liste des cours d'essai du jour ou état vide */}
                  {dayTrials.length === 0 ? (
                    <div className="py-6 text-center text-brand-white/40 text-xs italic bg-[#0f172a]/30 rounded-xl border border-brand-white/5">
                      {allDayTrials.length > 0
                        ? `Aucun cours d'essai ne correspond à vos filtres pour le ${day.dayName} ${day.dateNum} ${day.monthName}.`
                        : `Aucun cours d'essai réservé pour le ${day.dayName} ${day.dateNum} ${day.monthName}.`}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {dayTrials.map((booking) =>
                        renderTrialBookingCard(booking, {
                          showDayLink: true,
                          dayDateStr: day.dateStr,
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ─────────────────────────────────────────────────────────────────
          2. ONGLET SMALL GROUP
          ───────────────────────────────────────────────────────────────── */}
      {activeTab === "small_group" && (
        viewMode === "day" ? (
          /* 2.A SMALL GROUP — MODE JOUR (Séances du jour sélectionné) */
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-brand-white/10 pb-2">
              <h3 className="text-xs sm:text-sm font-heading font-black uppercase tracking-wider text-brand-white/80">
                Séances Cours Adulte programmées ({filteredSmallGroupSessionsForDay.length}
                {isFilterActive && filteredSmallGroupSessionsForDay.length !== smallGroupSessionsForDay.length
                  ? ` / ${smallGroupSessionsForDay.length}`
                  : ""}
                )
              </h3>
              <span className="text-[11px] text-brand-white/50">
                Capacité maximale : 12 personnes par séance
              </span>
            </div>

            {smallGroupSessionsForDay.length === 0 ? (
              <div className="bg-[#0f172a]/60 border border-brand-white/10 border-dashed rounded-2xl p-12 text-center space-y-3">
                <Calendar size={32} className="mx-auto text-brand-white/30" />
                <p className="text-sm font-heading font-bold uppercase text-brand-white/70">
                  Aucune séance Cours Adulte programmée pour le {currentDayInfo.dayName} {currentDayInfo.dateNum} {currentDayInfo.monthName}.
                </p>
                <p className="text-xs text-brand-white/40 max-w-sm mx-auto">
                  Consultez le planning officiel pour ajouter des séances récurrentes ou exceptionnelles.
                </p>
              </div>
            ) : filteredSmallGroupSessionsForDay.length === 0 ? (
              <div className="bg-[#0f172a]/60 border border-brand-white/10 border-dashed rounded-2xl p-10 text-center space-y-3">
                <Filter size={28} className="mx-auto text-brand-blue/50" />
                <p className="text-sm font-heading font-bold uppercase text-brand-white/80">
                  Aucune séance ne correspond à vos critères de filtrage.
                </p>
                <p className="text-xs text-brand-white/40">
                  {smallGroupSessionsForDay.length} séance(s) programmée(s) pour ce jour.
                </p>
                <button
                  onClick={handleResetFilters}
                  className="px-3 py-1.5 rounded-lg bg-brand-blue/15 hover:bg-brand-blue/25 text-brand-blue border border-brand-blue/30 text-xs font-heading font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Réinitialiser les filtres
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredSmallGroupSessionsForDay.map((session) =>
                  renderSmallGroupSessionCard(session)
                )}
              </div>
            )}
          </div>
        ) : (
          /* 2.B SMALL GROUP — MODE SEMAINE (Regroupé chronologiquement jour par jour) */
          <div className="space-y-6">
            {weekDays.map((day) => {
              const allDaySgSessions = (weeklyData.smallGroupSessions || [])
                .filter((s) => getLocalDateStr(s.starts_at) === day.dateStr)
                .sort(
                  (a, b) =>
                    new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
                );

              const daySgSessions = allDaySgSessions.filter((s) =>
                isSessionMatchingFilters(s, bookingsBySession[s.id] || [])
              );

              const totalInscrits = daySgSessions.reduce((acc, s) => {
                const bks = bookingsBySession[s.id] || [];
                return acc + bks.filter((b) => b.status === "confirmed").length;
              }, 0);

              return (
                <div
                  key={day.dateStr}
                  className="bg-[#0b1322] border border-brand-white/10 rounded-2xl p-5 shadow-xl space-y-4"
                >
                  {/* En-tête du jour */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-white/10 pb-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="px-3 py-1.5 rounded-xl bg-brand-blue/15 border border-brand-blue/30 text-brand-blue font-heading font-black text-sm uppercase">
                        {day.dayName} {day.dateNum} {day.monthName}
                      </div>

                      <span className="text-xs text-brand-white/60">
                        {daySgSessions.length} séance{daySgSessions.length > 1 ? "s" : ""}
                        {allDaySgSessions.length !== daySgSessions.length
                          ? ` (sur ${allDaySgSessions.length})`
                          : ""}{" "}
                        • {totalInscrits} inscrit{totalInscrits > 1 ? "s" : ""}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedDateStr(day.dateStr);
                        setViewMode("day");
                      }}
                      className="px-3 py-1.5 rounded-lg bg-brand-white/5 hover:bg-brand-white/10 text-brand-white/80 hover:text-brand-white text-xs font-heading font-bold uppercase tracking-wider border border-brand-white/10 transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                      title="Consulter ce jour en vue détaillée"
                    >
                      <ExternalLink size={12} />
                      Consulter en mode Jour
                    </button>
                  </div>

                  {/* Liste des séances du jour ou état vide */}
                  {daySgSessions.length === 0 ? (
                    <div className="py-6 text-center text-brand-white/40 text-xs italic bg-[#0f172a]/30 rounded-xl border border-brand-white/5">
                      {allDaySgSessions.length > 0
                        ? `Aucune séance ne correspond aux critères de filtrage pour le ${day.dayName} ${day.dateNum} ${day.monthName}.`
                        : `Aucune séance Cours Adulte programmée pour le ${day.dayName} ${day.dateNum} ${day.monthName}.`}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {daySgSessions.map((session) =>
                        renderSmallGroupSessionCard(session, {
                          showDayLink: true,
                          dayDateStr: day.dateStr,
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ─────────────────────────────────────────────────────────────────
          3. ONGLET COURS PRIVÉS
          ───────────────────────────────────────────────────────────────── */}
      {activeTab === "private" && (
        viewMode === "day" ? (
          /* 3.A COURS PRIVÉS — MODE JOUR (Grille des 6 créneaux officiels de la journée) */
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-brand-white/10 pb-2">
              <h3 className="text-xs sm:text-sm font-heading font-black uppercase tracking-wider text-brand-white/80">
                Grille des 6 créneaux officiels — {currentDayInfo.dayName} {currentDayInfo.dateNum} {currentDayInfo.monthName}
              </h3>
              <span className="text-[11px] text-brand-white/50">
                Durée : 50 min par séance individuelle
              </span>
            </div>

            {(() => {
              const matchingSlots = OFFICIAL_PRIVATE_HOURS.filter((hourSlot) => {
                const matchingSession = privateSessionsForDay.find((s) => {
                  const sTime = getLocalTimeStr(s.starts_at);
                  return sTime === hourSlot.start;
                });

                const sessionBookings = matchingSession
                  ? bookingsBySession[matchingSession.id] || []
                  : [];

                const confirmedBooking = sessionBookings.find(
                  (b) => b.status === "confirmed"
                );
                const cancelledBooking = sessionBookings.find(
                  (b) => b.status === "cancelled"
                );

                return isPrivateSlotMatchingFilters(
                  matchingSession,
                  confirmedBooking,
                  cancelledBooking
                );
              });

              if (matchingSlots.length === 0) {
                return (
                  <div className="bg-[#0f172a]/60 border border-brand-white/10 border-dashed rounded-2xl p-10 text-center space-y-3">
                    <Filter size={28} className="mx-auto text-brand-blue/50" />
                    <p className="text-sm font-heading font-bold uppercase text-brand-white/80">
                      Aucun créneau de cours privé ne correspond à vos filtres actuels.
                    </p>
                    <button
                      onClick={handleResetFilters}
                      className="px-3 py-1.5 rounded-lg bg-brand-blue/15 hover:bg-brand-blue/25 text-brand-blue border border-brand-blue/30 text-xs font-heading font-bold uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      Réinitialiser les filtres
                    </button>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {matchingSlots.map((hourSlot) => {
                    const matchingSession = privateSessionsForDay.find((s) => {
                      const sTime = getLocalTimeStr(s.starts_at);
                      return sTime === hourSlot.start;
                    });

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
                    const isTargeted = Boolean(
                      matchingSession && matchingSession.id === targetHighlightedSessionId
                    );

                    // CAS 1 : CRÉNEAU RÉSERVÉ & CONFIRMÉ
                    if (confirmedBooking && matchingSession) {
                      return (
                        <div
                          key={hourSlot.start}
                          id={`session-${matchingSession.id}`}
                          className={cn(
                            "bg-[#0f172a] border rounded-2xl p-5 shadow-xl space-y-4 relative overflow-hidden transition-all duration-300",
                            isTargeted
                              ? "border-brand-blue ring-2 ring-brand-blue/50 ring-offset-2 ring-offset-[#070d18] shadow-[0_0_30px_rgba(47,174,224,0.35)]"
                              : "border-[#00d8ff]/40"
                          )}
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

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleTriggerPrint(matchingSession.id)}
                                className="p-1 rounded-lg bg-brand-white/5 hover:bg-brand-white/10 text-brand-white/70 hover:text-brand-white transition-colors cursor-pointer border border-brand-white/10"
                                title="Imprimer cette feuille d'émargement"
                              >
                                <Printer size={12} />
                              </button>
                              <span className="px-2.5 py-0.5 rounded bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/30 text-[10px] font-bold uppercase tracking-wider">
                                Confirmé
                              </span>
                            </div>
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

                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-brand-white/60">
                              <div className="flex items-center gap-3 flex-wrap">
                                {confirmedBooking.phone && confirmedBooking.phone !== "—" ? (
                                  <a
                                    href={`tel:${confirmedBooking.phone}`}
                                    className="flex items-center gap-1.5 text-brand-blue hover:underline"
                                  >
                                    <Phone size={13} />
                                    {confirmedBooking.phone}
                                  </a>
                                ) : (
                                  <span className="text-brand-white/40 text-[11px]">Tél non renseigné</span>
                                )}

                                {confirmedBooking.email && (
                                  <a
                                    href={`mailto:${confirmedBooking.email}`}
                                    className="flex items-center gap-1 text-brand-white/50 hover:text-brand-white hover:underline text-[11px]"
                                  >
                                    <Mail size={12} />
                                    {confirmedBooking.email}
                                  </a>
                                )}
                              </div>

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
                                className="p-1 rounded text-brand-white/40 hover:text-brand-white transition-colors cursor-pointer"
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
                          id={`session-${matchingSession.id}`}
                          className={cn(
                            "bg-[#0f172a]/60 border rounded-2xl p-5 shadow-lg space-y-3 transition-all duration-300",
                            isTargeted
                              ? "border-brand-blue ring-2 ring-brand-blue/50 ring-offset-2 ring-offset-[#070d18] shadow-[0_0_30px_rgba(47,174,224,0.35)]"
                              : "border-red-500/30"
                          )}
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
                            <div className="flex items-center justify-between text-[10px] text-brand-white/40">
                              <div className="flex items-center gap-2">
                                {cancelledBooking.phone && cancelledBooking.phone !== "—" && (
                                  <a href={`tel:${cancelledBooking.phone}`} className="text-brand-blue hover:underline">
                                    Tél : {cancelledBooking.phone}
                                  </a>
                                )}
                                {cancelledBooking.email && (
                                  <span>• {cancelledBooking.email}</span>
                                )}
                              </div>
                              <span>{cancelledBooking.planName}</span>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // CAS 3 : CRÉNEAU DISPONIBLE / NON RÉSERVÉ
                    return (
                      <div
                        key={hourSlot.start}
                        id={matchingSession ? `session-${matchingSession.id}` : undefined}
                        className={cn(
                          "bg-[#0b1322]/60 border rounded-2xl p-5 flex items-center justify-between gap-4 transition-all duration-300",
                          isTargeted
                            ? "border-brand-blue ring-2 ring-brand-blue/50 ring-offset-2 ring-offset-[#070d18] shadow-[0_0_30px_rgba(47,174,224,0.35)]"
                            : "border-brand-white/5 border-dashed"
                        )}
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
              );
            })()}
          </div>
        ) : (
          /* 3.B COURS PRIVÉS — MODE SEMAINE (Regroupé chronologiquement jour par jour) */
          <div className="space-y-6">
            {weekDays.map((day) => {
              const dayPrivateSessions = (weeklyData.privateSessions || []).filter(
                (s) => getLocalDateStr(s.starts_at) === day.dateStr
              );

              // Récupérer toutes les réservations associées aux séances de ce jour
              const dayBookings: {
                booking: AdminBookingParticipant;
                session: AdminClassSessionSummary;
              }[] = [];

              for (const session of dayPrivateSessions) {
                const bks = bookingsBySession[session.id] || [];
                for (const b of bks) {
                  if (
                    isPrivateSlotMatchingFilters(
                      session,
                      b.status === "confirmed" ? b : undefined,
                      b.status === "cancelled" ? b : undefined
                    )
                  ) {
                    dayBookings.push({ booking: b, session });
                  }
                }
              }

              // Tri chronologique par heure de séance
              dayBookings.sort(
                (a, b) =>
                  new Date(a.session.starts_at).getTime() -
                  new Date(b.session.starts_at).getTime()
              );

              const confirmedCount = dayBookings.filter(
                (b) => b.booking.status === "confirmed"
              ).length;
              const cancelledCount = dayBookings.filter(
                (b) => b.booking.status === "cancelled"
              ).length;

              return (
                <div
                  key={day.dateStr}
                  className="bg-[#0b1322] border border-brand-white/10 rounded-2xl p-5 shadow-xl space-y-4"
                >
                  {/* En-tête du jour */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-white/10 pb-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="px-3 py-1.5 rounded-xl bg-brand-blue/15 border border-brand-blue/30 text-brand-blue font-heading font-black text-sm uppercase">
                        {day.dayName} {day.dateNum} {day.monthName}
                      </div>

                      <div className="flex items-center gap-2">
                        {confirmedCount > 0 && (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-heading font-black uppercase">
                            {confirmedCount} réservé{confirmedCount > 1 ? "s" : ""}
                          </span>
                        )}
                        {cancelledCount > 0 && (
                          <span className="px-2.5 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 text-xs font-heading font-black uppercase">
                            {cancelledCount} annulé{cancelledCount > 1 ? "s" : ""}
                          </span>
                        )}
                        {confirmedCount === 0 && cancelledCount === 0 && (
                          <span className="text-xs text-brand-white/40">
                            0 réservation • 6 créneaux disponibles
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedDateStr(day.dateStr);
                        setViewMode("day");
                      }}
                      className="px-3 py-1.5 rounded-lg bg-brand-white/5 hover:bg-brand-white/10 text-brand-white/80 hover:text-brand-white text-xs font-heading font-bold uppercase tracking-wider border border-brand-white/10 transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                      title="Consulter ce jour en vue détaillée"
                    >
                      <ExternalLink size={12} />
                      Consulter en mode Jour
                    </button>
                  </div>

                  {/* Liste des réservations du jour ou état vide */}
                  {dayBookings.length === 0 ? (
                    <div className="py-6 text-center text-brand-white/40 text-xs italic bg-[#0f172a]/30 rounded-xl border border-brand-white/5">
                      Aucune réservation de cours privé pour le {day.dayName} {day.dateNum} {day.monthName}.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {dayBookings.map(({ booking, session }) =>
                        renderPrivateBookingCard(booking, session, {
                          showDayLink: true,
                          dayDateStr: day.dateStr,
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}
      </div>

      {/* Feuille d'émargement imprimable (uniquement visible à l'impression papier via print:block) */}
      <AdminPrintAttendanceSheet
        dayLabel={viewMode === "day" ? currentDayInfo.fullLabel : weekRangeLabel}
        sessions={
          printSessionId
            ? [
                ...(weeklyData.smallGroupSessions || []),
                ...(weeklyData.privateSessions || []),
              ].filter((s) => s.id === printSessionId)
            : activeTab === "private"
            ? viewMode === "day"
              ? privateSessionsForDay
              : weeklyData.privateSessions || []
            : viewMode === "day"
            ? smallGroupSessionsForDay
            : weeklyData.smallGroupSessions || []
        }
        bookingsBySession={bookingsBySession}
        singleSessionId={printSessionId}
      />

      {/* Fiche détaillée d'émargement en modale pour une séance spécifique */}
      <AdminSessionDetailsModal
        session={selectedSessionForModal}
        participants={
          selectedSessionForModal
            ? bookingsBySession[selectedSessionForModal.id] || []
            : []
        }
        loadingBookingId={loadingBookingId}
        onClose={() => setSelectedSessionForModal(null)}
        onMarkAttendance={handleMarkAttendance}
        onCancelTrial={handleCancelTrial}
        onPrintSession={handleTriggerPrint}
      />

      {/* Notification toast d'action (présent, absent, réinitialisé) */}
      <AnimatePresence>
        {actionFeedback && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={cn(
              "fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl border shadow-2xl flex items-center gap-2.5 text-xs font-heading font-bold uppercase tracking-wider backdrop-blur-md print:hidden",
              actionFeedback.type === "success"
                ? "bg-[#0c1626]/95 border-emerald-500/40 text-emerald-400 shadow-emerald-500/10"
                : "bg-[#0c1626]/95 border-red-500/40 text-red-400 shadow-red-500/10"
            )}
          >
            {actionFeedback.type === "success" ? (
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle size={16} className="text-red-400 shrink-0" />
            )}
            <span>{actionFeedback.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
