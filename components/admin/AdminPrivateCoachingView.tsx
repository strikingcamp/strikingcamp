"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Edit2,
  X,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  AlertTriangle,
  Users,
  Calendar,
  Clock,
  Phone,
  Mail,
  Save,
  Search,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createRecurringTemplateServerAction,
  updateRecurringTemplateServerAction,
  toggleRecurringTemplateStatusServerAction,
  toggleDayTemplatesStatusServerAction,
  triggerScheduleGenerationServerAction,
  updateSingleDatedSessionServerAction,
  type RecurringTemplateItem,
  type AdminDatedSessionItem,
} from "@/app/(admin)/admin/planning/actions";
import { formatToParisDate, formatToParisTime } from "@/lib/supabase/admin";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TYPES ET DÉFINITIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

type DayName = "Lundi" | "Mardi" | "Mercredi" | "Jeudi" | "Vendredi" | "Samedi";

interface PrivateSlotConfig {
  id: string;
  templateIds: string[];
  start: string;
  end: string;
  durationMin: number;
  capacity: number;
  isActive: boolean;
  dayIndices: number[];
}

const DAYS_ORDER: DayName[] = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

const dayNameToIndex = (d: DayName): number => Math.max(0, DAYS_ORDER.indexOf(d));
const indexToDayName = (i: number): DayName => DAYS_ORDER[i] || "Lundi";

const INITIAL_PRIVATE_DAYS: Record<DayName, boolean> = {
  Lundi: true,
  Mardi: true,
  Mercredi: true,
  Jeudi: true,
  Vendredi: true,
  Samedi: true,
};

const INITIAL_PRIVATE_SLOTS: PrivateSlotConfig[] = [
  { id: "priv_slot_1", templateIds: [], start: "08:00", end: "08:50", durationMin: 50, capacity: 6, isActive: true, dayIndices: [0, 1, 2, 3, 4, 5] },
  { id: "priv_slot_2", templateIds: [], start: "09:00", end: "09:50", durationMin: 50, capacity: 6, isActive: true, dayIndices: [0, 1, 2, 3, 4, 5] },
  { id: "priv_slot_3", templateIds: [], start: "10:00", end: "10:50", durationMin: 50, capacity: 6, isActive: true, dayIndices: [0, 1, 2, 3, 4, 5] },
  { id: "priv_slot_4", templateIds: [], start: "14:00", end: "14:50", durationMin: 50, capacity: 6, isActive: true, dayIndices: [0, 1, 2, 3, 4, 5] },
  { id: "priv_slot_5", templateIds: [], start: "15:00", end: "15:50", durationMin: 50, capacity: 6, isActive: true, dayIndices: [0, 1, 2, 3, 4, 5] },
  { id: "priv_slot_6", templateIds: [], start: "16:00", end: "16:50", durationMin: 50, capacity: 6, isActive: true, dayIndices: [0, 1, 2, 3, 4, 5] },
];

interface AdminPrivateCoachingViewProps {
  initialTemplates?: RecurringTemplateItem[];
  initialSessions?: AdminDatedSessionItem[];
}

export default function AdminPrivateCoachingView({
  initialTemplates = [],
  initialSessions = [],
}: AdminPrivateCoachingViewProps) {
  const router = useRouter();

  // Navigation par onglets : Séances physiques datées OU Semaine type
  const [activeMainTab, setActiveMainTab] = useState<"sessions" | "templates">("sessions");

  // Initialisation dynamique des créneaux récurrents depuis Supabase
  const initialPrivDaysFromDb: Record<DayName, boolean> = useMemo(() => {
    const privTmpl = initialTemplates.filter((t) => t.type === "private");
    if (privTmpl.length > 0) {
      const daysMap: Record<DayName, boolean> = {
        Lundi: false,
        Mardi: false,
        Mercredi: false,
        Jeudi: false,
        Vendredi: false,
        Samedi: false,
      };
      for (const t of privTmpl) {
        const dName = indexToDayName(t.day_of_week);
        if (t.is_active) {
          daysMap[dName] = true;
        }
      }
      return daysMap;
    }
    return INITIAL_PRIVATE_DAYS;
  }, [initialTemplates]);

  const initialPrivSlotsFromDb: PrivateSlotConfig[] = useMemo(() => {
    const privTmpl = initialTemplates.filter((t) => t.type === "private");
    if (privTmpl.length > 0) {
      const map = new Map<
        string,
        {
          templateIds: string[];
          start: string;
          end: string;
          durationMin: number;
          capacity: number;
          isActive: boolean;
          dayIndices: number[];
        }
      >();

      for (const t of privTmpl) {
        const start = t.start_time.slice(0, 5);
        const end = t.end_time.slice(0, 5);
        const [sH, sM] = start.split(":").map(Number);
        const [eH, eM] = end.split(":").map(Number);
        const durationMin = eH * 60 + eM - (sH * 60 + sM);
        const capacity = t.max_capacity || 6;

        const existing = map.get(start);
        if (existing) {
          existing.templateIds.push(t.id);
          existing.dayIndices.push(t.day_of_week);
          if (t.is_active) existing.isActive = true;
          if (t.max_capacity) existing.capacity = t.max_capacity;
        } else {
          map.set(start, {
            templateIds: [t.id],
            start,
            end,
            durationMin: durationMin > 0 ? durationMin : 50,
            capacity,
            isActive: t.is_active,
            dayIndices: [t.day_of_week],
          });
        }
      }

      const list = Array.from(map.values()).map((item, idx) => ({
        id: item.templateIds[0] || `priv_slot_${idx + 1}`,
        templateIds: item.templateIds,
        start: item.start,
        end: item.end,
        durationMin: item.durationMin,
        capacity: item.capacity || 6,
        isActive: item.isActive,
        dayIndices: item.dayIndices,
      }));
      list.sort((a, b) => a.start.localeCompare(b.start));
      return list;
    }

    return INITIAL_PRIVATE_SLOTS;
  }, [initialTemplates]);

  // États locaux des modèles récurrents
  const [privateDays, setPrivateDays] = useState<Record<DayName, boolean>>(initialPrivDaysFromDb);
  const [privateSlots, setPrivateSlots] = useState<PrivateSlotConfig[]>(initialPrivSlotsFromDb);

  useEffect(() => {
    setPrivateDays(initialPrivDaysFromDb);
  }, [initialPrivDaysFromDb]);

  useEffect(() => {
    setPrivateSlots(initialPrivSlotsFromDb);
  }, [initialPrivSlotsFromDb]);

  // États locaux des séances physiques datées
  const [sessions, setSessions] = useState<AdminDatedSessionItem[]>(initialSessions);

  useEffect(() => {
    setSessions(initialSessions);
  }, [initialSessions]);

  // Filtres et recherche pour les séances datées
  const [sessionDateFilter, setSessionDateFilter] = useState<string>("all");
  const [sessionSearchQuery, setSessionSearchQuery] = useState<string>("");
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  // Édition de capacité pour une séance datée
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingSessionCapacity, setEditingSessionCapacity] = useState<string>("6");
  const [sessionCapacityError, setSessionCapacityError] = useState<string | null>(null);
  const [isSavingSessionCapacity, setIsSavingSessionCapacity] = useState<boolean>(false);

  // États de chargement & notifications
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Confirmation en cas de réservations futures existantes (Templates)
  const [pendingWarningModal, setPendingWarningModal] = useState<{
    message: string;
    onConfirm: () => Promise<void>;
  } | null>(null);

  const showNotification = (text: string, type: "success" | "error" = "success") => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Modal Ajout Créneau Récurrent
  const [isAddSlotModalOpen, setIsAddSlotModalOpen] = useState(false);
  const [newSlotStart, setNewSlotStart] = useState("11:00");
  const [newSlotEnd, setNewSlotEnd] = useState("11:50");
  const [newSlotCapacity, setNewSlotCapacity] = useState<number>(6);

  // Modal Édition Créneau Récurrent
  const [editingPrivateSlot, setEditingPrivateSlot] = useState<PrivateSlotConfig | null>(null);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ACTIONS SÉANCES DATÉES (class_sessions)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const handleStartEditSessionCapacity = (session: AdminDatedSessionItem) => {
    setEditingSessionId(session.id);
    setEditingSessionCapacity(String(session.max_capacity || 6));
    setSessionCapacityError(null);
  };

  const handleSaveSessionCapacity = async (sessionId: string) => {
    setSessionCapacityError(null);
    const parsed = parseInt(editingSessionCapacity, 10);
    if (isNaN(parsed) || parsed < 1) {
      setSessionCapacityError("La capacité doit être un nombre entier positif (ex: 4, 5, 6).");
      return;
    }

    const currentSession = sessions.find((s) => s.id === sessionId);
    const booked = currentSession ? currentSession.bookedCount : 0;
    if (parsed < booked) {
      setSessionCapacityError(
        `Impossible de réduire à ${parsed} places : ${booked} personne(s) sont déjà inscrite(s).`
      );
      return;
    }

    setIsSavingSessionCapacity(true);
    try {
      const res = await updateSingleDatedSessionServerAction(sessionId, {
        max_capacity: parsed,
      });

      if (res.success) {
        setSessions((prev) =>
          prev.map((s) => (s.id === sessionId ? { ...s, max_capacity: parsed } : s))
        );
        setEditingSessionId(null);
        showNotification(`Capacité de la séance mise à jour à ${parsed} participants.`);
        router.refresh();
      } else {
        setSessionCapacityError(res.error || "Erreur lors de la modification de capacité.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur inattendue.";
      setSessionCapacityError(msg);
    } finally {
      setIsSavingSessionCapacity(false);
    }
  };

  // Liste unique des dates disponibles pour le filtre
  const availableDates = useMemo(() => {
    const datesSet = new Set<string>();
    for (const s of sessions) {
      datesSet.add(formatToParisDate(s.starts_at));
    }
    return Array.from(datesSet).sort();
  }, [sessions]);

  // Filtrage des séances datées
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      const pDate = formatToParisDate(s.starts_at);
      if (sessionDateFilter !== "all" && pDate !== sessionDateFilter) {
        return false;
      }
      if (sessionSearchQuery.trim()) {
        const q = sessionSearchQuery.toLowerCase().trim();
        const matchesSession =
          s.discipline.toLowerCase().includes(q) ||
          s.level.toLowerCase().includes(q) ||
          pDate.includes(q);
        const matchesParticipant = (s.participants || []).some(
          (p) =>
            p.memberName.toLowerCase().includes(q) ||
            p.phone.toLowerCase().includes(q) ||
            (p.email && p.email.toLowerCase().includes(q)) ||
            p.planName.toLowerCase().includes(q)
        );
        if (!matchesSession && !matchesParticipant) return false;
      }
      return true;
    });
  }, [sessions, sessionDateFilter, sessionSearchQuery]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ACTIONS MODÈLES RÉCURRENTS (recurring_schedule_templates)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const handleSyncHorizon = async () => {
    setIsSubmitting(true);
    try {
      const res = await triggerScheduleGenerationServerAction();
      if (res.success) {
        showNotification(res.message || "Planning 12 semaines synchronisé avec succès.");
        router.refresh();
      } else {
        showNotification(res.error || "Erreur lors de la synchronisation de l'horizon.", "error");
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Erreur serveur.";
      showNotification(errorMsg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePrivateDay = async (dayName: DayName) => {
    const nextState = !privateDays[dayName];
    setIsSubmitting(true);
    try {
      const dayIndex = dayNameToIndex(dayName);
      const res = await toggleDayTemplatesStatusServerAction(dayIndex, "private", nextState);
      if (res.success) {
        setPrivateDays((prev) => ({ ...prev, [dayName]: nextState }));
        showNotification(
          `Cours individuels du ${dayName} ${nextState ? "activés" : "désactivés"}.`
        );
        router.refresh();
      } else {
        showNotification(res.error || "Erreur lors de la modification du jour.", "error");
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Erreur serveur.";
      showNotification(errorMsg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePrivateSlot = async (slotId: string) => {
    const slot = privateSlots.find((s) => s.id === slotId);
    if (!slot) return;
    const nextState = !slot.isActive;
    setIsSubmitting(true);
    try {
      if (slot.templateIds && slot.templateIds.length > 0) {
        for (const tmplId of slot.templateIds) {
          await toggleRecurringTemplateStatusServerAction(tmplId, nextState);
        }
      }
      setPrivateSlots((prev) =>
        prev.map((s) => (s.id === slotId ? { ...s, isActive: nextState } : s))
      );
      showNotification(`Créneau ${slot.start} ${nextState ? "activé" : "désactivé"}.`);
      router.refresh();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Erreur serveur.";
      showNotification(errorMsg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddExceptionalSlot = async () => {
    setIsSubmitting(true);
    try {
      let createdCount = 0;
      const targetCapacity = Math.max(1, newSlotCapacity || 6);

      for (let dayIndex = 0; dayIndex < 6; dayIndex++) {
        const dayName = indexToDayName(dayIndex);
        if (privateDays[dayName]) {
          const res = await createRecurringTemplateServerAction({
            day_of_week: dayIndex,
            start_time: newSlotStart,
            end_time: newSlotEnd,
            type: "private",
            discipline: "Cours Individuel",
            level: "Individuel (50 min)",
            max_capacity: targetCapacity,
          });
          if (res.success) createdCount++;
        }
      }
      setIsAddSlotModalOpen(false);
      showNotification(
        `Créneau individuel (${newSlotStart} → ${newSlotEnd}, ${targetCapacity} places) ajouté pour ${createdCount} jour(s).`
      );
      router.refresh();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Erreur lors de l'ajout.";
      showNotification(errorMsg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEditPrivateSlot = async (forceCascade = false) => {
    if (!editingPrivateSlot) return;
    setIsSubmitting(true);
    try {
      const targetCapacity = Math.max(1, editingPrivateSlot.capacity || 6);

      if (editingPrivateSlot.templateIds && editingPrivateSlot.templateIds.length > 0) {
        let hadWarning = false;
        let warningMessage = "";
        let hasError = false;

        for (const tmplId of editingPrivateSlot.templateIds) {
          const tmpl = initialTemplates.find((t) => t.id === tmplId);
          const dayOfWeek = tmpl ? tmpl.day_of_week : 0;

          const res = await updateRecurringTemplateServerAction(
            tmplId,
            {
              day_of_week: dayOfWeek,
              start_time: editingPrivateSlot.start,
              end_time: editingPrivateSlot.end,
              discipline: "Cours Individuel",
              level: "Individuel (50 min)",
              max_capacity: targetCapacity,
              is_active: editingPrivateSlot.isActive,
            },
            forceCascade
          );

          if (res.hasBookings && !forceCascade) {
            hadWarning = true;
            warningMessage = res.message || "Des réservations futures existent sur ce créneau.";
          } else if (!res.success) {
            hasError = true;
          }
        }

        if (hadWarning && !forceCascade) {
          setPendingWarningModal({
            message: warningMessage,
            onConfirm: async () => {
              setPendingWarningModal(null);
              await handleSaveEditPrivateSlot(true);
            },
          });
          setIsSubmitting(false);
          return;
        }

        if (!hasError) {
          setEditingPrivateSlot(null);
          showNotification("Créneau individuel modifié et synchronisé avec succès.");
          router.refresh();
        } else {
          showNotification("Erreur lors de l'enregistrement.", "error");
        }
      } else {
        setPrivateSlots((prev) =>
          prev.map((s) => (s.id === editingPrivateSlot.id ? editingPrivateSlot : s))
        );
        setEditingPrivateSlot(null);
        showNotification("Créneau individuel modifié.");
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Erreur serveur.";
      showNotification(errorMsg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-6xl mx-auto">
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          EN-TÊTE PRINCIPAL
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-white/10 pb-6">
        <div className="space-y-1">
          <div className="inline-flex items-center px-3 py-1 bg-[#00d8ff]/10 border border-[#00d8ff]/30 rounded-full text-[#00d8ff] text-xs font-semibold uppercase tracking-wider mb-1">
            <span>Coaching Individuel</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-heading font-black uppercase tracking-wider text-brand-white">
            COURS INDIVIDUELS
          </h1>
          <p className="text-xs sm:text-sm text-brand-white/60">
            Gérez les séances datées, les inscriptions membres et les créneaux récurrents (capacité par défaut : 6 participants).
          </p>
        </div>

        <button
          onClick={handleSyncHorizon}
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-white/5 hover:bg-brand-white/10 border border-brand-white/15 text-brand-white rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer shrink-0"
          title="Maintient l'horizon de 12 semaines d'avance dans class_sessions"
        >
          <RefreshCw size={14} className={cn(isSubmitting && "animate-spin text-[#00d8ff]")} />
          <span>Synchroniser 12 sem.</span>
        </button>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          ONGLETS DE NAVIGATION : SÉANCES RÉELLES VS MODÈLES RÉCURRENTS
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="flex items-center gap-2 p-1.5 bg-[#0b1322] border border-brand-white/10 rounded-2xl">
        <button
          onClick={() => setActiveMainTab("sessions")}
          className={cn(
            "flex-1 py-3 px-4 rounded-xl font-heading font-black text-xs sm:text-sm uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer",
            activeMainTab === "sessions"
              ? "bg-gradient-to-r from-brand-blue to-[#00d8ff] text-black shadow-lg shadow-brand-blue/20"
              : "text-brand-white/60 hover:text-brand-white hover:bg-brand-white/5"
          )}
        >
          <Users size={16} />
          <span>Séances & Inscriptions ({sessions.length})</span>
        </button>

        <button
          onClick={() => setActiveMainTab("templates")}
          className={cn(
            "flex-1 py-3 px-4 rounded-xl font-heading font-black text-xs sm:text-sm uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer",
            activeMainTab === "templates"
              ? "bg-gradient-to-r from-brand-blue to-[#00d8ff] text-black shadow-lg shadow-brand-blue/20"
              : "text-brand-white/60 hover:text-brand-white hover:bg-brand-white/5"
          )}
        >
          <Calendar size={16} />
          <span>Semaine type & Créneaux ({privateSlots.length})</span>
        </button>
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn(
              "fixed top-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-heading font-bold uppercase border",
              notification.type === "success"
                ? "bg-[#0f172a] border-[#00d8ff] text-[#00d8ff]"
                : "bg-[#1e1014] border-red-500 text-red-400"
            )}
          >
            {notification.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            <span>{notification.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          ONGLET 1 : SÉANCES RÉELLES & INSCRIPTIONS
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {activeMainTab === "sessions" && (
        <div className="space-y-6">
          {/* Barre de filtres et recherche */}
          <div className="bg-[#0f172a] border border-brand-white/10 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
            {/* Recherche textuelle */}
            <div className="relative w-full md:w-80">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-white/40" />
              <input
                type="text"
                placeholder="Rechercher membre, tél, email..."
                value={sessionSearchQuery}
                onChange={(e) => setSessionSearchQuery(e.target.value)}
                className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-brand-white placeholder:text-brand-white/30 focus:border-[#00d8ff]/50 focus:outline-none transition-colors"
              />
            </div>

            {/* Filtre par date */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <span className="text-xs text-brand-white/50 font-semibold whitespace-nowrap">Date :</span>
              <select
                value={sessionDateFilter}
                onChange={(e) => setSessionDateFilter(e.target.value)}
                className="bg-[#0a1120] border border-brand-white/10 rounded-xl px-3 py-2 text-xs text-brand-white font-medium focus:border-[#00d8ff]/50 focus:outline-none transition-colors cursor-pointer w-full md:w-auto"
              >
                <option value="all">Toutes les dates ({availableDates.length})</option>
                {availableDates.map((dateStr) => (
                  <option key={dateStr} value={dateStr}>
                    {dateStr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Grille des séances datées */}
          {filteredSessions.length === 0 ? (
            <div className="bg-[#0f172a]/60 border border-brand-white/10 border-dashed rounded-2xl p-12 text-center space-y-3">
              <Calendar size={36} className="mx-auto text-brand-blue/50" />
              <p className="text-sm font-heading font-bold uppercase text-brand-white/80">
                Aucune séance individuelle ne correspond aux critères sélectionnés.
              </p>
              <button
                onClick={() => {
                  setSessionDateFilter("all");
                  setSessionSearchQuery("");
                }}
                className="px-3.5 py-1.5 rounded-lg bg-[#00d8ff]/15 hover:bg-[#00d8ff]/25 text-[#00d8ff] border border-[#00d8ff]/30 text-xs font-heading font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Réinitialiser les filtres
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredSessions.map((session) => {
                const sDate = formatToParisDate(session.starts_at);
                const sStart = formatToParisTime(session.starts_at);
                const sEnd = session.ends_at ? formatToParisTime(session.ends_at) : "";
                const capacity = session.max_capacity || 6;
                const booked = session.bookedCount;
                const remaining = Math.max(0, capacity - booked);
                const isFull = remaining === 0;
                const isAlmostFull = remaining > 0 && remaining <= 2;
                const isExpanded = expandedSessionId === session.id;
                const isEditingThisSession = editingSessionId === session.id;
                const participants = session.participants || [];

                return (
                  <div
                    key={session.id}
                    className={cn(
                      "bg-[#0f172a] border rounded-2xl p-5 shadow-xl transition-all space-y-4",
                      isFull ? "border-red-500/40" : "border-brand-white/10 hover:border-[#00d8ff]/40"
                    )}
                  >
                    {/* Ligne principale : Heure, Date, Jauge, Capacité */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Horaires et Discipline */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="px-3 py-1.5 rounded-xl bg-[#00d8ff]/15 border border-[#00d8ff]/30 text-[#00d8ff] font-heading font-black text-sm">
                          {sStart} {sEnd ? `→ ${sEnd}` : ""}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-heading font-bold uppercase text-brand-white">
                              {session.discipline || "Cours Individuel"}
                            </span>
                            <span className="text-xs text-brand-white/50 font-semibold">• {sDate}</span>
                          </div>
                          <span className="text-[11px] text-brand-white/40">
                            {session.level || "Individuel (50 min)"}
                          </span>
                        </div>
                      </div>

                      {/* Jauge des places & Statut */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="text-left sm:text-right">
                          <div className="text-xs font-heading font-bold uppercase text-brand-white/80">
                            Inscrits : {booked} / {capacity}
                          </div>
                          <div className="text-[11px]">
                            {isFull ? (
                              <span className="text-red-400 font-bold uppercase">Complet</span>
                            ) : (
                              <span
                                className={cn(
                                  "font-bold uppercase",
                                  isAlmostFull ? "text-amber-300" : "text-[#22c55e]"
                                )}
                              >
                                {remaining} place{remaining > 1 ? "s" : ""} restante{remaining > 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Badge visuel */}
                        <span
                          className={cn(
                            "px-3 py-1 rounded-full text-xs font-heading font-black uppercase tracking-wider border",
                            isFull
                              ? "bg-red-500/15 text-red-400 border-red-500/30"
                              : isAlmostFull
                              ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                              : "bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/30"
                          )}
                        >
                          {isFull ? "Complet" : `${remaining} libre${remaining > 1 ? "s" : ""}`}
                        </span>

                        {/* Bouton modifier la capacité */}
                        {!isEditingThisSession ? (
                          <button
                            onClick={() => handleStartEditSessionCapacity(session)}
                            className="px-3 py-1.5 rounded-xl bg-brand-white/5 hover:bg-brand-white/10 text-brand-white border border-brand-white/15 text-xs font-heading font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                            title="Modifier la capacité de cette séance spécifique"
                          >
                            <Edit2 size={13} />
                            <span>Capacité</span>
                          </button>
                        ) : (
                          <div className="flex items-center gap-2 bg-[#070d18] border border-[#00d8ff]/40 rounded-xl p-1">
                            <button
                              onClick={() => {
                                const current = parseInt(editingSessionCapacity || "1", 10);
                                if (current > booked) {
                                  setEditingSessionCapacity(String(current - 1));
                                }
                              }}
                              disabled={
                                isSavingSessionCapacity ||
                                parseInt(editingSessionCapacity || "1", 10) <= booked
                              }
                              className="w-7 h-7 flex items-center justify-center rounded bg-brand-white/5 hover:bg-brand-white/10 text-brand-white text-xs font-bold disabled:opacity-40 cursor-pointer"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min={booked || 1}
                              value={editingSessionCapacity}
                              onChange={(e) => setEditingSessionCapacity(e.target.value)}
                              className="w-12 bg-transparent text-center font-mono font-bold text-xs text-brand-white focus:outline-none"
                            />
                            <button
                              onClick={() => {
                                const current = parseInt(editingSessionCapacity || "1", 10);
                                setEditingSessionCapacity(String(current + 1));
                              }}
                              disabled={isSavingSessionCapacity}
                              className="w-7 h-7 flex items-center justify-center rounded bg-brand-white/5 hover:bg-brand-white/10 text-brand-white text-xs font-bold disabled:opacity-40 cursor-pointer"
                            >
                              +
                            </button>
                            <button
                              onClick={() => handleSaveSessionCapacity(session.id)}
                              disabled={isSavingSessionCapacity}
                              className="px-2.5 py-1 bg-[#00d8ff] hover:bg-brand-white text-black text-xs font-heading font-black uppercase tracking-wider rounded-lg flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <Save size={12} />
                              <span>{isSavingSessionCapacity ? "..." : "OK"}</span>
                            </button>
                            <button
                              onClick={() => setEditingSessionId(null)}
                              disabled={isSavingSessionCapacity}
                              className="px-2 py-1 text-brand-white/40 hover:text-brand-white text-xs cursor-pointer"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        )}

                        {/* Bouton déplier/replier les participants */}
                        <button
                          onClick={() =>
                            setExpandedSessionId(isExpanded ? null : session.id)
                          }
                          className="px-3 py-1.5 rounded-xl bg-brand-white/5 hover:bg-brand-white/10 text-brand-white/80 hover:text-brand-white border border-brand-white/10 text-xs font-heading font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Users size={13} />
                          <span>Inscrits ({participants.length})</span>
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </div>
                    </div>

                    {/* Message d'erreur d'édition de capacité */}
                    {isEditingThisSession && sessionCapacityError && (
                      <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-2">
                        <AlertCircle size={14} className="shrink-0" />
                        <span>{sessionCapacityError}</span>
                      </div>
                    )}

                    {/* Section dépliable : Liste des membres inscrits */}
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="pt-4 border-t border-brand-white/10 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-heading font-black uppercase tracking-wider text-brand-white/70 flex items-center gap-2">
                            <Users size={14} className="text-[#00d8ff]" />
                            Liste des membres inscrits ({participants.length} / {capacity})
                          </h4>
                          <span className="text-[11px] text-brand-white/40">
                            Séance individuelle en petit groupe
                          </span>
                        </div>

                        {participants.length === 0 ? (
                          <div className="py-4 px-4 rounded-xl bg-[#070d18] border border-brand-white/5 text-center text-xs text-brand-white/50">
                            Aucun participant inscrit pour l&apos;instant. Il reste {capacity} place{capacity > 1 ? "s" : ""} disponible{capacity > 1 ? "s" : ""}.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {participants.map((p) => (
                              <div
                                key={p.bookingId}
                                className="bg-[#070d18] border border-brand-white/5 rounded-xl p-3.5 space-y-2"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-heading font-bold text-brand-white uppercase">
                                    {p.memberName}
                                  </span>
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-brand-white/10 text-brand-white/70 font-semibold uppercase">
                                    {p.planName}
                                  </span>
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-brand-white/60">
                                  <div className="flex items-center gap-3 flex-wrap">
                                    {p.phone && p.phone !== "—" ? (
                                      <a
                                        href={`tel:${p.phone}`}
                                        className="flex items-center gap-1.5 text-brand-blue hover:underline"
                                      >
                                        <Phone size={12} />
                                        <span>{p.phone}</span>
                                      </a>
                                    ) : (
                                      <span className="text-brand-white/40 text-[11px]">Tél non renseigné</span>
                                    )}

                                    {p.email && (
                                      <a
                                        href={`mailto:${p.email}`}
                                        className="flex items-center gap-1 text-brand-white/50 hover:text-brand-white hover:underline text-[11px]"
                                      >
                                        <Mail size={12} />
                                        <span>{p.email}</span>
                                      </a>
                                    )}
                                  </div>

                                  <span className="text-[10px] text-brand-white/40">
                                    Réservé le {formatToParisDate(p.createdAt)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          ONGLET 2 : SEMAINE TYPE & CRÉNEAUX RÉCURRENTS
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {activeMainTab === "templates" && (
        <div className="space-y-8">
          {/* Confirmation Réservations Existantes Modal */}
          <AnimatePresence>
            {pendingWarningModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-hidden">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/80 backdrop-blur-sm"
                />
                <motion.div
                  initial={{ scale: 0.95, opacity: 0, y: 10 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.95, opacity: 0, y: 10 }}
                  className="relative w-full max-w-md max-h-[calc(100dvh-1.5rem)] bg-[#0f172a] border border-amber-500/40 rounded-2xl shadow-2xl z-10 flex flex-col overflow-hidden"
                >
                  <div className="flex items-center gap-3 text-amber-400 p-5 sm:p-6 pb-3 border-b border-brand-white/10 shrink-0">
                    <AlertTriangle size={24} />
                    <h3 className="text-base font-heading font-black uppercase tracking-wider text-brand-white">
                      Réservations en cours détectées
                    </h3>
                  </div>

                  <div
                    className="p-5 sm:p-6 overflow-y-auto overscroll-contain flex-1 space-y-3 text-xs"
                    style={{ WebkitOverflowScrolling: "touch" }}
                  >
                    <p className="text-xs text-brand-white/80 leading-relaxed">
                      {pendingWarningModal.message}
                    </p>
                    <p className="text-[11px] text-brand-white/50 leading-relaxed">
                      Les séances futures sans réservation seront synchronisées. Les séances ayant déjà des inscrits conserveront leur historique.
                    </p>
                  </div>

                  <div className="px-5 py-3.5 sm:px-6 sm:py-4 bg-[#0a101d] border-t border-brand-white/10 flex gap-2.5 sm:gap-3 shrink-0 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
                    <button
                      onClick={() => setPendingWarningModal(null)}
                      className="flex-1 py-2.5 sm:py-3 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white/70 font-heading font-bold text-xs uppercase rounded-xl transition-all cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={pendingWarningModal.onConfirm}
                      className="flex-1 py-2.5 sm:py-3 bg-amber-500 hover:bg-amber-400 text-black font-heading font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all cursor-pointer"
                    >
                      Confirmer la modification
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* SECTION 1 : JOURS D'OUVERTURE */}
          <div className="bg-[#0f172a] border border-brand-white/10 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-brand-white/10 pb-3">
              <h2 className="text-lg font-heading font-black uppercase tracking-wider text-brand-white">
                Jours d&apos;ouverture des cours individuels
              </h2>
              <span className="text-xs text-brand-white/40 font-semibold">Du Lundi au Samedi</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
              {DAYS_ORDER.map((day) => {
                const isActive = privateDays[day];
                return (
                  <button
                    key={day}
                    onClick={() => togglePrivateDay(day)}
                    disabled={isSubmitting}
                    className={cn(
                      "p-4 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2",
                      isActive
                        ? "bg-[#00d8ff]/15 border-[#00d8ff] text-brand-white shadow-md shadow-[#00d8ff]/10"
                        : "bg-brand-white/5 border-brand-white/10 text-brand-white/40 hover:bg-brand-white/10"
                    )}
                  >
                    <span className="text-xs font-heading font-bold uppercase">{day}</span>
                    <span
                      className={cn(
                        "text-[10px] font-black uppercase px-2 py-0.5 rounded",
                        isActive ? "bg-[#00d8ff] text-black" : "bg-zinc-800 text-zinc-500"
                      )}
                    >
                      {isActive ? "Disponible" : "Fermé"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECTION 2 : CRÉNEAUX HORAIRES STANDARDS */}
          <div className="bg-[#0f172a] border border-brand-white/10 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-white/10 pb-3">
              <div>
                <h2 className="text-lg font-heading font-black uppercase tracking-wider text-brand-white">
                  Créneaux horaires standards (6 par jour)
                </h2>
                <p className="text-xs text-brand-white/50">
                  Matin : 08h-11h · Après-midi : 14h-17h (50 min par séance · Capacité par défaut : 6)
                </p>
              </div>

              <button
                onClick={() => setIsAddSlotModalOpen(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#00d8ff]/10 hover:bg-[#00d8ff]/20 border border-[#00d8ff]/30 text-[#00d8ff] rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                <Plus size={14} />
                <span>Créneau exceptionnel</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {privateSlots.map((slot) => (
                <div
                  key={slot.id}
                  className={cn(
                    "p-4 rounded-xl border flex items-center justify-between gap-3 transition-all",
                    slot.isActive
                      ? "bg-black/30 border-brand-white/10 hover:border-brand-white/20"
                      : "bg-zinc-900/60 border-zinc-800 opacity-50"
                  )}
                >
                  <div className="space-y-0.5">
                    <div className="text-sm font-heading font-bold text-brand-white">
                      {slot.start} → {slot.end}
                    </div>
                    <div className="text-[11px] text-brand-white/50">
                      {slot.durationMin} min · Capacité : {slot.capacity || 6}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setEditingPrivateSlot(slot)}
                      className="p-1.5 rounded-lg bg-brand-white/5 hover:bg-brand-white/15 text-brand-white/70 hover:text-brand-white transition-colors cursor-pointer"
                      title="Modifier ce créneau"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => togglePrivateSlot(slot.id)}
                      disabled={isSubmitting}
                      className={cn(
                        "px-2.5 py-1 rounded text-[10px] font-heading font-black uppercase tracking-wider transition-all cursor-pointer",
                        slot.isActive
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-zinc-800 text-zinc-500 border border-zinc-700"
                      )}
                    >
                      {slot.isActive ? "Actif" : "Off"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* MODAL : AJOUT CRÉNEAU EXCEPTIONNEL */}
          <AnimatePresence>
            {isAddSlotModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-hidden">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsAddSlotModalOpen(false)}
                  className="fixed inset-0 bg-black/80 backdrop-blur-sm"
                />
                <motion.div
                  initial={{ scale: 0.95, opacity: 0, y: 10 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.95, opacity: 0, y: 10 }}
                  className="relative w-full max-w-lg max-h-[calc(100dvh-1.5rem)] bg-[#0f172a] border border-[#00d8ff]/30 rounded-2xl shadow-2xl z-10 flex flex-col overflow-hidden"
                >
                  <div className="flex items-center justify-between px-5 py-4 sm:px-6 sm:py-4.5 border-b border-brand-white/10 bg-[#0f172a] shrink-0">
                    <h3 className="text-base sm:text-lg font-heading font-black uppercase tracking-wider text-brand-white">
                      Ajouter un créneau individuel
                    </h3>
                    <button
                      onClick={() => setIsAddSlotModalOpen(false)}
                      className="p-1.5 rounded-lg text-brand-white/50 hover:text-brand-white hover:bg-brand-white/10 transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div
                    className="p-5 sm:p-6 overflow-y-auto overscroll-contain flex-1 space-y-4 text-xs"
                    style={{ WebkitOverflowScrolling: "touch" }}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                      <div>
                        <label className="text-[11px] sm:text-xs text-brand-white/60 uppercase font-bold block mb-1">
                          Heure de début
                        </label>
                        <input
                          type="time"
                          value={newSlotStart}
                          onChange={(e) => setNewSlotStart(e.target.value)}
                          className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl px-3 py-2.5 sm:py-3 text-brand-white font-mono text-xs sm:text-sm focus:border-[#00d8ff]/50 focus:outline-none transition-colors"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] sm:text-xs text-brand-white/60 uppercase font-bold block mb-1">
                          Heure de fin
                        </label>
                        <input
                          type="time"
                          value={newSlotEnd}
                          onChange={(e) => setNewSlotEnd(e.target.value)}
                          className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl px-3 py-2.5 sm:py-3 text-brand-white font-mono text-xs sm:text-sm focus:border-[#00d8ff]/50 focus:outline-none transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] sm:text-xs text-brand-white/60 uppercase font-bold block mb-1">
                        Capacité par défaut (participants)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={newSlotCapacity}
                        onChange={(e) => setNewSlotCapacity(Math.max(1, parseInt(e.target.value || "1", 10)))}
                        className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl px-3 py-2.5 text-brand-white font-mono text-xs sm:text-sm focus:border-[#00d8ff]/50 focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div className="px-5 py-3.5 sm:px-6 sm:py-4 bg-[#0a101d] border-t border-brand-white/10 flex gap-2.5 sm:gap-3 shrink-0 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
                    <button
                      onClick={() => setIsAddSlotModalOpen(false)}
                      className="flex-1 py-2.5 sm:py-3 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white/70 font-heading font-bold text-xs uppercase rounded-xl transition-all cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleAddExceptionalSlot}
                      disabled={isSubmitting}
                      className="flex-1 py-2.5 sm:py-3 bg-[#00d8ff] hover:bg-brand-white text-black font-heading font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg shadow-[#00d8ff]/20 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Plus size={16} />
                      <span>Ajouter le créneau</span>
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* MODAL : MODIFIER CRÉNEAU */}
          <AnimatePresence>
            {editingPrivateSlot && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-hidden">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setEditingPrivateSlot(null)}
                  className="fixed inset-0 bg-black/80 backdrop-blur-sm"
                />
                <motion.div
                  initial={{ scale: 0.95, opacity: 0, y: 10 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.95, opacity: 0, y: 10 }}
                  className="relative w-full max-w-lg max-h-[calc(100dvh-1.5rem)] bg-[#0f172a] border border-[#00d8ff]/30 rounded-2xl shadow-2xl z-10 flex flex-col overflow-hidden"
                >
                  <div className="flex items-center justify-between px-5 py-4 sm:px-6 sm:py-4.5 border-b border-brand-white/10 bg-[#0f172a] shrink-0">
                    <h3 className="text-base sm:text-lg font-heading font-black uppercase tracking-wider text-brand-white">
                      Modifier le créneau individuel
                    </h3>
                    <button
                      onClick={() => setEditingPrivateSlot(null)}
                      className="p-1.5 rounded-lg text-brand-white/50 hover:text-brand-white hover:bg-brand-white/10 transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div
                    className="p-5 sm:p-6 overflow-y-auto overscroll-contain flex-1 space-y-4 text-xs"
                    style={{ WebkitOverflowScrolling: "touch" }}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                      <div>
                        <label className="text-[11px] sm:text-xs text-brand-white/60 uppercase font-bold block mb-1">
                          Heure de début
                        </label>
                        <input
                          type="time"
                          value={editingPrivateSlot.start}
                          onChange={(e) =>
                            setEditingPrivateSlot({ ...editingPrivateSlot, start: e.target.value })
                          }
                          className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl px-3 py-2.5 sm:py-3 text-brand-white font-mono text-xs sm:text-sm focus:border-[#00d8ff]/50 focus:outline-none transition-colors"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] sm:text-xs text-brand-white/60 uppercase font-bold block mb-1">
                          Heure de fin
                        </label>
                        <input
                          type="time"
                          value={editingPrivateSlot.end}
                          onChange={(e) =>
                            setEditingPrivateSlot({ ...editingPrivateSlot, end: e.target.value })
                          }
                          className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl px-3 py-2.5 sm:py-3 text-brand-white font-mono text-xs sm:text-sm focus:border-[#00d8ff]/50 focus:outline-none transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] sm:text-xs text-brand-white/60 uppercase font-bold block mb-1">
                        Capacité par défaut (participants)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={editingPrivateSlot.capacity || 6}
                        onChange={(e) =>
                          setEditingPrivateSlot({
                            ...editingPrivateSlot,
                            capacity: Math.max(1, parseInt(e.target.value || "1", 10)),
                          })
                        }
                        className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl px-3 py-2.5 text-brand-white font-mono text-xs sm:text-sm focus:border-[#00d8ff]/50 focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div className="px-5 py-3.5 sm:px-6 sm:py-4 bg-[#0a101d] border-t border-brand-white/10 flex gap-2.5 sm:gap-3 shrink-0 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
                    <button
                      onClick={() => setEditingPrivateSlot(null)}
                      className="flex-1 py-2.5 sm:py-3 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white/70 font-heading font-bold text-xs uppercase rounded-xl transition-all cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={() => handleSaveEditPrivateSlot(false)}
                      disabled={isSubmitting}
                      className="flex-1 py-2.5 sm:py-3 bg-[#00d8ff] hover:bg-brand-white text-black font-heading font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg shadow-[#00d8ff]/20 disabled:opacity-50"
                    >
                      Enregistrer
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
