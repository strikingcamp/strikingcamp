"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Users,
  Plus,
  Edit2,
  Power,
  ChevronLeft,
  ChevronRight,
  Clock,
  BookmarkCheck,
  X,
  Loader2,
  AlertCircle,
  CheckCircle,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  type AdminClassSessionSummary,
  type AdminSessionFormData,
  createClassSessionAdmin,
  updateClassSessionAdmin,
  toggleClassSessionActiveAdmin,
} from "@/lib/supabase/admin";

type CategoryFilter = "all" | "small_group" | "collective";
type DayName = "Lundi" | "Mardi" | "Mercredi" | "Jeudi" | "Vendredi" | "Samedi";

const DAYS_ORDER: DayName[] = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

const DAY_MAP_FR: Record<number, DayName> = {
  1: "Lundi",
  2: "Mardi",
  3: "Mercredi",
  4: "Jeudi",
  5: "Vendredi",
  6: "Samedi",
};

const MONTH_NAMES_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

const DISCIPLINES_LIST = [
  "Boxing Bag",
  "Kick Boxing",
  "KB Shred",
  "Striking",
  "Lady Striking",
  "Boxe Thaï",
];

const LEVELS_LIST = [
  "Fondamentaux",
  "Performance",
  "Sparring guidé",
  "100% féminin",
  "Tous niveaux",
];

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

interface AdminPlanningViewProps {
  initialSessions: AdminClassSessionSummary[];
}

export default function AdminPlanningView({
  initialSessions,
}: AdminPlanningViewProps) {
  const [sessions, setSessions] = useState<AdminClassSessionSummary[]>(initialSessions);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [currentMonday, setCurrentMonday] = useState<Date>(() => {
    // Si des sessions existent, se caler sur le premier lundi disponible, sinon 31 Août 2026
    if (initialSessions.length > 0 && initialSessions[0].starts_at) {
      return getMonday(new Date(initialSessions[0].starts_at));
    }
    return new Date("2026-08-31T00:00:00");
  });

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<AdminClassSessionSummary | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Form State
  const [formDiscipline, setFormDiscipline] = useState(DISCIPLINES_LIST[0]);
  const [formType, setFormType] = useState<"small_group" | "collective">("small_group");
  const [formLevel, setFormLevel] = useState(LEVELS_LIST[0]);
  const [formDate, setFormDate] = useState("2026-08-31");
  const [formStartTime, setFormStartTime] = useState("07:00");
  const [formEndTime, setFormEndTime] = useState("07:50");
  const [formCapacity, setFormCapacity] = useState(20);

  const supabase = createClient();

  // Navigation par semaine
  const handlePrevWeek = () => {
    const prev = new Date(currentMonday);
    prev.setDate(prev.getDate() - 7);
    setCurrentMonday(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(currentMonday);
    next.setDate(next.getDate() + 7);
    setCurrentMonday(next);
  };

  const activeSaturday = new Date(currentMonday);
  activeSaturday.setDate(currentMonday.getDate() + 5);

  const weekLabel = `${currentMonday.getDate()} ${MONTH_NAMES_FR[currentMonday.getMonth()]} – ${activeSaturday.getDate()} ${MONTH_NAMES_FR[activeSaturday.getMonth()]} ${activeSaturday.getFullYear()}`;

  // Filtrage des séances de la semaine sélectionnée
  const weekSessionsByDay = useMemo(() => {
    const grouped: Record<DayName, AdminClassSessionSummary[]> = {
      Lundi: [],
      Mardi: [],
      Mercredi: [],
      Jeudi: [],
      Vendredi: [],
      Samedi: [],
    };

    const monTime = currentMonday.getTime();
    const sunEnd = new Date(currentMonday);
    sunEnd.setDate(currentMonday.getDate() + 6);
    sunEnd.setHours(23, 59, 59, 999);
    const sunTime = sunEnd.getTime();

    for (const s of sessions) {
      if (!s.starts_at) continue;
      const sDate = new Date(s.starts_at);
      const sTime = sDate.getTime();

      if (sTime >= monTime && sTime <= sunTime) {
        if (
          categoryFilter === "all" ||
          (categoryFilter === "small_group" && s.type === "small_group") ||
          (categoryFilter === "collective" && s.type === "collective")
        ) {
          const dayIndex = sDate.getDay();
          const dayName = DAY_MAP_FR[dayIndex];
          if (dayName && grouped[dayName]) {
            grouped[dayName].push(s);
          }
        }
      }
    }

    for (const day of DAYS_ORDER) {
      grouped[day].sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
    }

    return grouped;
  }, [sessions, currentMonday, categoryFilter]);

  // Recharger les séances
  const refreshSessions = async () => {
    const { data } = await supabase
      .from("class_sessions")
      .select("id, discipline, type, level, starts_at, ends_at, max_capacity, is_active")
      .order("starts_at", { ascending: true });

    if (data) {
      const sessionIds = data.map((s) => s.id);
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, class_session_id")
        .in("class_session_id", sessionIds)
        .eq("status", "confirmed");

      const counts = new Map<string, number>();
      if (bookings) {
        for (const b of bookings) {
          if (b.class_session_id) {
            counts.set(b.class_session_id, (counts.get(b.class_session_id) || 0) + 1);
          }
        }
      }

      setSessions(
        data.map((s) => ({
          id: s.id,
          discipline: s.discipline,
          type: s.type || "small_group",
          level: s.level,
          starts_at: s.starts_at,
          ends_at: s.ends_at,
          max_capacity: s.max_capacity || 20,
          bookedCount: counts.get(s.id) || 0,
          is_active: s.is_active ?? true,
        }))
      );
    }
  };

  // Bascule Actif / Désactivé
  const handleToggleActive = async (session: AdminClassSessionSummary) => {
    const newStatus = !session.is_active;
    const res = await toggleClassSessionActiveAdmin(supabase, session.id, newStatus);
    if (res.success) {
      setSessions((prev) =>
        prev.map((s) => (s.id === session.id ? { ...s, is_active: newStatus } : s))
      );
    } else {
      alert("Erreur lors du changement de statut : " + (res.error || ""));
    }
  };

  // Ouvrir modal d'ajout
  const openAddModal = (defaultDateStr?: string) => {
    setFormDiscipline(DISCIPLINES_LIST[0]);
    setFormType("small_group");
    setFormLevel(LEVELS_LIST[0]);
    setFormDate(defaultDateStr || currentMonday.toISOString().split("T")[0]);
    setFormStartTime("07:00");
    setFormEndTime("07:50");
    setFormCapacity(20);
    setActionError(null);
    setActionSuccess(null);
    setIsAddModalOpen(true);
  };

  // Ouvrir modal d'édition
  const openEditModal = (session: AdminClassSessionSummary) => {
    setEditingSession(session);
    setFormDiscipline(session.discipline);
    setFormType(session.type === "collective" ? "collective" : "small_group");
    setFormLevel(session.level || LEVELS_LIST[0]);
    const sDate = new Date(session.starts_at);
    setFormDate(sDate.toISOString().split("T")[0]);
    const sH = String(sDate.getHours()).padStart(2, "0");
    const sM = String(sDate.getMinutes()).padStart(2, "0");
    setFormStartTime(`${sH}:${sM}`);

    if (session.ends_at) {
      const eDate = new Date(session.ends_at);
      const eH = String(eDate.getHours()).padStart(2, "0");
      const eM = String(eDate.getMinutes()).padStart(2, "0");
      setFormEndTime(`${eH}:${eM}`);
    } else {
      setFormEndTime(`${sH}:${sM}`);
    }

    setFormCapacity(session.max_capacity || 20);
    setActionError(null);
    setActionSuccess(null);
  };

  // Soumission Création
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setActionError(null);

    const startsAtISO = new Date(`${formDate}T${formStartTime}:00`).toISOString();
    const endsAtISO = new Date(`${formDate}T${formEndTime}:00`).toISOString();

    const payload: AdminSessionFormData = {
      discipline: formDiscipline,
      type: formType,
      level: formLevel,
      starts_at: startsAtISO,
      ends_at: endsAtISO,
      max_capacity: formCapacity,
      is_active: true,
    };

    const res = await createClassSessionAdmin(supabase, payload);
    if (!res.success) {
      setActionError(res.error || "Erreur lors de la création.");
      setIsSubmitting(false);
      return;
    }

    await refreshSessions();
    setIsSubmitting(false);
    setIsAddModalOpen(false);
  };

  // Soumission Modification
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSession) return;
    setIsSubmitting(true);
    setActionError(null);

    const startsAtISO = new Date(`${formDate}T${formStartTime}:00`).toISOString();
    const endsAtISO = new Date(`${formDate}T${formEndTime}:00`).toISOString();

    const payload: Partial<AdminSessionFormData> = {
      discipline: formDiscipline,
      type: formType,
      level: formLevel,
      starts_at: startsAtISO,
      ends_at: endsAtISO,
      max_capacity: formCapacity,
    };

    const res = await updateClassSessionAdmin(supabase, editingSession.id, payload);
    if (!res.success) {
      setActionError(res.error || "Erreur lors de la mise à jour.");
      setIsSubmitting(false);
      return;
    }

    await refreshSessions();
    setIsSubmitting(false);
    setEditingSession(null);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-white/10 pb-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-heading font-black uppercase tracking-wider text-brand-white">
            Planning & <span className="text-brand-blue">Cours</span>
          </h1>
          <p className="text-xs sm:text-sm text-brand-white/60 mt-1">
            Gestion en temps réel des séances Small Group (capacité 20) et cours Collectifs.
          </p>
        </div>

        <button
          onClick={() => openAddModal()}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-blue hover:bg-brand-white text-brand-black font-heading font-bold text-xs uppercase tracking-wider rounded-sm transition-all shadow-md shadow-brand-blue/20 cursor-pointer"
        >
          <Plus size={16} />
          Ajouter une séance
        </button>
      </div>

      {/* Week Navigator & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0b1322] border border-brand-white/10 rounded-2xl p-4 sm:p-5 shadow-xl">
        {/* Week switcher */}
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrevWeek}
            className="p-2 rounded-lg bg-brand-white/5 hover:bg-brand-white/10 text-brand-white transition-colors cursor-pointer"
            title="Semaine précédente"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="text-center sm:text-left min-w-[220px]">
            <span className="text-[10px] font-bold uppercase tracking-widest text-brand-blue block">
              Semaine sélectionnée
            </span>
            <span className="text-sm sm:text-base font-heading font-bold uppercase tracking-wider text-brand-white">
              {weekLabel}
            </span>
          </div>

          <button
            onClick={handleNextWeek}
            className="p-2 rounded-lg bg-brand-white/5 hover:bg-brand-white/10 text-brand-white transition-colors cursor-pointer"
            title="Semaine suivante"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex bg-[#0f172a] p-1 rounded-xl border border-brand-white/10">
          <button
            onClick={() => setCategoryFilter("all")}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-heading font-bold uppercase tracking-wider transition-all cursor-pointer",
              categoryFilter === "all"
                ? "bg-brand-blue text-brand-black shadow"
                : "text-brand-white/60 hover:text-brand-white"
            )}
          >
            Toutes
          </button>
          <button
            onClick={() => setCategoryFilter("small_group")}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-heading font-bold uppercase tracking-wider transition-all cursor-pointer",
              categoryFilter === "small_group"
                ? "bg-brand-blue text-brand-black shadow"
                : "text-brand-white/60 hover:text-brand-white"
            )}
          >
            Small Group (20)
          </button>
          <button
            onClick={() => setCategoryFilter("collective")}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-heading font-bold uppercase tracking-wider transition-all cursor-pointer",
              categoryFilter === "collective"
                ? "bg-brand-blue text-brand-black shadow"
                : "text-brand-white/60 hover:text-brand-white"
            )}
          >
            Collectifs
          </button>
        </div>
      </div>

      {/* Grid of days (Lundi à Samedi) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {DAYS_ORDER.map((day) => {
          const daySessions = weekSessionsByDay[day];

          return (
            <div
              key={day}
              className="bg-[#0b1322] border border-brand-white/10 rounded-2xl p-5 space-y-4 shadow-lg flex flex-col"
            >
              {/* Day Header */}
              <div className="flex items-center justify-between border-b border-brand-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-brand-blue rounded-full" />
                  <h2 className="text-lg font-heading font-bold uppercase tracking-wider text-brand-white">
                    {day}
                  </h2>
                </div>
                <span className="text-xs text-brand-white/40 font-semibold">
                  {daySessions.length} {daySessions.length === 1 ? "séance" : "séances"}
                </span>
              </div>

              {/* Sessions list */}
              <div className="space-y-3 flex-1">
                {daySessions.length === 0 ? (
                  <div className="h-32 flex flex-col items-center justify-center text-center text-brand-white/30 text-xs border border-dashed border-brand-white/5 rounded-xl">
                    <span>Aucun cours ce jour</span>
                  </div>
                ) : (
                  daySessions.map((session) => {
                    const sDate = new Date(session.starts_at);
                    const eDate = session.ends_at ? new Date(session.ends_at) : null;
                    const sTime = `${String(sDate.getHours()).padStart(2, "0")}:${String(sDate.getMinutes()).padStart(2, "0")}`;
                    const eTime = eDate
                      ? `${String(eDate.getHours()).padStart(2, "0")}:${String(eDate.getMinutes()).padStart(2, "0")}`
                      : "";

                    const fillPercentage = Math.min(
                      100,
                      Math.round((session.bookedCount / session.max_capacity) * 100)
                    );

                    return (
                      <div
                        key={session.id}
                        className={cn(
                          "border rounded-xl p-4 transition-all space-y-3",
                          session.is_active
                            ? "bg-[#0f172a] hover:bg-[#131d31] border-brand-white/10 hover:border-brand-blue/30"
                            : "bg-[#0f172a]/40 border-red-500/20 opacity-60"
                        )}
                      >
                        {/* Title & Badges */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <span className="font-heading font-bold text-base uppercase text-brand-white block leading-tight">
                              {session.discipline}
                            </span>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-brand-blue/15 text-brand-blue border border-brand-blue/20">
                                {session.type === "collective" ? "Collectif" : "Small Group"}
                              </span>
                              {session.level && (
                                <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-brand-white/10 text-brand-white/70">
                                  {session.level}
                                </span>
                              )}
                              {!session.is_active && (
                                <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                                  Désactivée
                                </span>
                              )}
                            </div>
                          </div>

                          <span className="flex items-center gap-1 text-xs font-bold text-brand-blue shrink-0">
                            <Clock size={12} />
                            {sTime} {eTime ? `– ${eTime}` : ""}
                          </span>
                        </div>

                        {/* Remplissage Indicator for Small Group */}
                        {session.type === "small_group" ? (
                          <div className="space-y-1 bg-brand-black/40 p-2 rounded-lg border border-brand-white/5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-[10px] uppercase font-bold text-brand-white/50">
                                Inscrits
                              </span>
                              <span className="font-bold text-brand-white text-xs">
                                {session.bookedCount} / {session.max_capacity} pers.
                              </span>
                            </div>
                            <div className="w-full bg-brand-white/10 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all duration-300",
                                  session.bookedCount >= session.max_capacity
                                    ? "bg-red-500"
                                    : session.bookedCount >= 15
                                    ? "bg-amber-400"
                                    : "bg-brand-blue"
                                )}
                                style={{ width: `${fillPercentage}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="text-[11px] text-brand-white/40 italic bg-brand-black/30 p-2 rounded-lg">
                            Accès libre sans réservation
                          </div>
                        )}

                        {/* Actions */}
                        <div className="pt-2 border-t border-brand-white/5 flex items-center justify-between gap-2">
                          <Link
                            href={`/admin/reservations?session=${session.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white text-[11px] font-semibold uppercase rounded transition-colors"
                          >
                            <BookmarkCheck size={12} className="text-brand-blue" />
                            Émargement ({session.bookedCount})
                          </Link>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => openEditModal(session)}
                              className="p-1.5 rounded text-brand-white/50 hover:text-brand-white hover:bg-brand-white/10 transition-colors"
                              title="Modifier la séance"
                            >
                              <Edit2 size={13} />
                            </button>

                            <button
                              onClick={() => handleToggleActive(session)}
                              className={cn(
                                "p-1.5 rounded transition-colors",
                                session.is_active
                                  ? "text-[#22c55e] hover:bg-red-500/10 hover:text-red-400"
                                  : "text-red-400 hover:bg-[#22c55e]/10 hover:text-[#22c55e]"
                              )}
                              title={session.is_active ? "Désactiver la séance" : "Activer la séance"}
                            >
                              <Power size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━
          MODAL AJOUTER UNE SÉANCE
          ━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-[#0f172a] border border-brand-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl z-10 space-y-6"
            >
              <div className="flex items-center justify-between border-b border-brand-white/10 pb-4">
                <h3 className="text-xl font-heading font-bold uppercase tracking-wider text-brand-white">
                  Ajouter une séance
                </h3>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1 rounded-full text-brand-white/50 hover:text-brand-white hover:bg-brand-white/10 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {actionError && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg text-xs flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>{actionError}</span>
                </div>
              )}

              <form onSubmit={handleCreateSubmit} className="space-y-4">
                {/* Discipline */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-brand-white/60 mb-1">
                    Discipline
                  </label>
                  <select
                    value={formDiscipline}
                    onChange={(e) => setFormDiscipline(e.target.value)}
                    className="w-full bg-[#0b1322] border border-brand-white/10 rounded-lg px-3 py-2.5 text-brand-white text-xs focus:border-brand-blue outline-none"
                  >
                    {DISCIPLINES_LIST.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Type & Niveau */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-brand-white/60 mb-1">
                      Type de cours
                    </label>
                    <select
                      value={formType}
                      onChange={(e) => {
                        const val = e.target.value as "small_group" | "collective";
                        setFormType(val);
                        setFormCapacity(val === "collective" ? 50 : 20);
                      }}
                      className="w-full bg-[#0b1322] border border-brand-white/10 rounded-lg px-3 py-2.5 text-brand-white text-xs focus:border-brand-blue outline-none"
                    >
                      <option value="small_group">Small Group (20 max)</option>
                      <option value="collective">Collectif</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-brand-white/60 mb-1">
                      Niveau
                    </label>
                    <select
                      value={formLevel}
                      onChange={(e) => setFormLevel(e.target.value)}
                      className="w-full bg-[#0b1322] border border-brand-white/10 rounded-lg px-3 py-2.5 text-brand-white text-xs focus:border-brand-blue outline-none"
                    >
                      {LEVELS_LIST.map((lvl) => (
                        <option key={lvl} value={lvl}>
                          {lvl}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-brand-white/60 mb-1">
                    Date de la séance
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    required
                    className="w-full bg-[#0b1322] border border-brand-white/10 rounded-lg px-3 py-2.5 text-brand-white text-xs focus:border-brand-blue outline-none"
                  />
                </div>

                {/* Horaires & Capacité */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-brand-white/60 mb-1">
                      Heure début
                    </label>
                    <input
                      type="time"
                      value={formStartTime}
                      onChange={(e) => setFormStartTime(e.target.value)}
                      required
                      className="w-full bg-[#0b1322] border border-brand-white/10 rounded-lg px-3 py-2.5 text-brand-white text-xs focus:border-brand-blue outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-brand-white/60 mb-1">
                      Heure fin
                    </label>
                    <input
                      type="time"
                      value={formEndTime}
                      onChange={(e) => setFormEndTime(e.target.value)}
                      required
                      className="w-full bg-[#0b1322] border border-brand-white/10 rounded-lg px-3 py-2.5 text-brand-white text-xs focus:border-brand-blue outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-brand-white/60 mb-1">
                      Capacité
                    </label>
                    <input
                      type="number"
                      value={formCapacity}
                      onChange={(e) => setFormCapacity(parseInt(e.target.value) || 20)}
                      required
                      min={1}
                      max={100}
                      className="w-full bg-[#0b1322] border border-brand-white/10 rounded-lg px-3 py-2.5 text-brand-white text-xs focus:border-brand-blue outline-none"
                    />
                  </div>
                </div>

                {/* Submit */}
                <div className="pt-4 flex items-center justify-end gap-3 border-t border-brand-white/10">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white text-xs font-bold uppercase rounded transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 bg-brand-blue hover:bg-brand-white text-brand-black font-heading font-bold text-xs uppercase tracking-wider rounded transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    Enregistrer la séance
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ━━━━━━━━━━━━━━━━━━━━
          MODAL MODIFIER UNE SÉANCE
          ━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatePresence>
        {editingSession && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingSession(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-[#0f172a] border border-brand-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl z-10 space-y-6"
            >
              <div className="flex items-center justify-between border-b border-brand-white/10 pb-4">
                <h3 className="text-xl font-heading font-bold uppercase tracking-wider text-brand-white">
                  Modifier la séance
                </h3>
                <button
                  onClick={() => setEditingSession(null)}
                  className="p-1 rounded-full text-brand-white/50 hover:text-brand-white hover:bg-brand-white/10 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {actionError && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg text-xs flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>{actionError}</span>
                </div>
              )}

              <form onSubmit={handleEditSubmit} className="space-y-4">
                {/* Discipline */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-brand-white/60 mb-1">
                    Discipline
                  </label>
                  <select
                    value={formDiscipline}
                    onChange={(e) => setFormDiscipline(e.target.value)}
                    className="w-full bg-[#0b1322] border border-brand-white/10 rounded-lg px-3 py-2.5 text-brand-white text-xs focus:border-brand-blue outline-none"
                  >
                    {DISCIPLINES_LIST.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Type & Niveau */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-brand-white/60 mb-1">
                      Type de cours
                    </label>
                    <select
                      value={formType}
                      onChange={(e) => setFormType(e.target.value as "small_group" | "collective")}
                      className="w-full bg-[#0b1322] border border-brand-white/10 rounded-lg px-3 py-2.5 text-brand-white text-xs focus:border-brand-blue outline-none"
                    >
                      <option value="small_group">Small Group (20 max)</option>
                      <option value="collective">Collectif</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-brand-white/60 mb-1">
                      Niveau
                    </label>
                    <select
                      value={formLevel}
                      onChange={(e) => setFormLevel(e.target.value)}
                      className="w-full bg-[#0b1322] border border-brand-white/10 rounded-lg px-3 py-2.5 text-brand-white text-xs focus:border-brand-blue outline-none"
                    >
                      {LEVELS_LIST.map((lvl) => (
                        <option key={lvl} value={lvl}>
                          {lvl}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-brand-white/60 mb-1">
                    Date de la séance
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    required
                    className="w-full bg-[#0b1322] border border-brand-white/10 rounded-lg px-3 py-2.5 text-brand-white text-xs focus:border-brand-blue outline-none"
                  />
                </div>

                {/* Horaires & Capacité */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-brand-white/60 mb-1">
                      Heure début
                    </label>
                    <input
                      type="time"
                      value={formStartTime}
                      onChange={(e) => setFormStartTime(e.target.value)}
                      required
                      className="w-full bg-[#0b1322] border border-brand-white/10 rounded-lg px-3 py-2.5 text-brand-white text-xs focus:border-brand-blue outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-brand-white/60 mb-1">
                      Heure fin
                    </label>
                    <input
                      type="time"
                      value={formEndTime}
                      onChange={(e) => setFormEndTime(e.target.value)}
                      required
                      className="w-full bg-[#0b1322] border border-brand-white/10 rounded-lg px-3 py-2.5 text-brand-white text-xs focus:border-brand-blue outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-brand-white/60 mb-1">
                      Capacité
                    </label>
                    <input
                      type="number"
                      value={formCapacity}
                      onChange={(e) => setFormCapacity(parseInt(e.target.value) || 20)}
                      required
                      min={1}
                      max={100}
                      className="w-full bg-[#0b1322] border border-brand-white/10 rounded-lg px-3 py-2.5 text-brand-white text-xs focus:border-brand-blue outline-none"
                    />
                  </div>
                </div>

                {/* Submit */}
                <div className="pt-4 flex items-center justify-end gap-3 border-t border-brand-white/10">
                  <button
                    type="button"
                    onClick={() => setEditingSession(null)}
                    className="px-4 py-2 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white text-xs font-bold uppercase rounded transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 bg-brand-blue hover:bg-brand-white text-brand-black font-heading font-bold text-xs uppercase tracking-wider rounded transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Edit2 size={14} />}
                    Enregistrer les modifications
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
