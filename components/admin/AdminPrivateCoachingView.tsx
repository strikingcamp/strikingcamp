"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Clock,
  Plus,
  Edit2,
  X,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Settings2,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createRecurringTemplateServerAction,
  updateRecurringTemplateServerAction,
  toggleRecurringTemplateStatusServerAction,
  toggleDayTemplatesStatusServerAction,
  deleteRecurringTemplateServerAction,
  triggerScheduleGenerationServerAction,
  type RecurringTemplateItem,
  type AdminDatedSessionItem,
} from "@/app/(admin)/admin/planning/actions";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TYPES ET DÉFINITIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

type DayName = "Lundi" | "Mardi" | "Mercredi" | "Jeudi" | "Vendredi" | "Samedi";

interface PrivateSlotConfig {
  id: string;
  templateIds: string[];
  start: string;
  end: string;
  durationMin: number;
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
  { id: "priv_slot_1", templateIds: [], start: "08:00", end: "08:50", durationMin: 50, isActive: true, dayIndices: [0, 1, 2, 3, 4, 5] },
  { id: "priv_slot_2", templateIds: [], start: "09:00", end: "09:50", durationMin: 50, isActive: true, dayIndices: [0, 1, 2, 3, 4, 5] },
  { id: "priv_slot_3", templateIds: [], start: "10:00", end: "10:50", durationMin: 50, isActive: true, dayIndices: [0, 1, 2, 3, 4, 5] },
  { id: "priv_slot_4", templateIds: [], start: "14:00", end: "14:50", durationMin: 50, isActive: true, dayIndices: [0, 1, 2, 3, 4, 5] },
  { id: "priv_slot_5", templateIds: [], start: "15:00", end: "15:50", durationMin: 50, isActive: true, dayIndices: [0, 1, 2, 3, 4, 5] },
  { id: "priv_slot_6", templateIds: [], start: "16:00", end: "16:50", durationMin: 50, isActive: true, dayIndices: [0, 1, 2, 3, 4, 5] },
];

interface AdminPrivateCoachingViewProps {
  initialTemplates?: RecurringTemplateItem[];
  initialSessions?: AdminDatedSessionItem[];
}

export default function AdminPrivateCoachingView({
  initialTemplates = [],
}: AdminPrivateCoachingViewProps) {
  const router = useRouter();

  // Initialisation dynamique des Cours Privés depuis Supabase
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

        const existing = map.get(start);
        if (existing) {
          existing.templateIds.push(t.id);
          existing.dayIndices.push(t.day_of_week);
          if (t.is_active) existing.isActive = true;
        } else {
          map.set(start, {
            templateIds: [t.id],
            start,
            end,
            durationMin: durationMin > 0 ? durationMin : 50,
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
        isActive: item.isActive,
        dayIndices: item.dayIndices,
      }));
      list.sort((a, b) => a.start.localeCompare(b.start));
      return list;
    }

    return INITIAL_PRIVATE_SLOTS;
  }, [initialTemplates]);

  // États locaux
  const [privateDays, setPrivateDays] = useState<Record<DayName, boolean>>(initialPrivDaysFromDb);
  const [privateSlots, setPrivateSlots] = useState<PrivateSlotConfig[]>(initialPrivSlotsFromDb);

  useEffect(() => {
    setPrivateDays(initialPrivDaysFromDb);
  }, [initialPrivDaysFromDb]);

  useEffect(() => {
    setPrivateSlots(initialPrivSlotsFromDb);
  }, [initialPrivSlotsFromDb]);

  // États de chargement & notifications
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Confirmation en cas de réservations futures existantes
  const [pendingWarningModal, setPendingWarningModal] = useState<{
    message: string;
    onConfirm: () => Promise<void>;
  } | null>(null);

  const showNotification = (text: string, type: "success" | "error" = "success") => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Modal Ajout Créneau Privé
  const [isAddSlotModalOpen, setIsAddSlotModalOpen] = useState(false);
  const [newSlotStart, setNewSlotStart] = useState("11:00");
  const [newSlotEnd, setNewSlotEnd] = useState("11:50");

  // Modal Édition Créneau Privé
  const [editingPrivateSlot, setEditingPrivateSlot] = useState<PrivateSlotConfig | null>(null);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ACTIONS SERVEUR / SUPABASE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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
      const errorMsg = err instanceof Error ? err.message : "Erreur inattendue.";
      showNotification(errorMsg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePrivateDay = async (day: DayName) => {
    const dayIndex = dayNameToIndex(day);
    const currentStatus = privateDays[day];
    const newStatus = !currentStatus;

    setPrivateDays((prev) => ({ ...prev, [day]: newStatus }));
    setIsSubmitting(true);
    try {
      const res = await toggleDayTemplatesStatusServerAction(dayIndex, "private", newStatus);
      if (res.success) {
        showNotification(`Disponibilité ${day} mise à jour.`);
        router.refresh();
      } else {
        setPrivateDays((prev) => ({ ...prev, [day]: currentStatus }));
        showNotification(res.error || "Erreur lors de la mise à jour.", "error");
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Erreur inattendue.";
      setPrivateDays((prev) => ({ ...prev, [day]: currentStatus }));
      showNotification(errorMsg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePrivateSlot = async (slotId: string) => {
    const slot = privateSlots.find((s) => s.id === slotId);
    if (!slot) return;
    const newStatus = !slot.isActive;

    setPrivateSlots((prev) => prev.map((s) => (s.id === slotId ? { ...s, isActive: newStatus } : s)));
    setIsSubmitting(true);
    try {
      if (slot.templateIds && slot.templateIds.length > 0) {
        let hasError = false;
        for (const tmplId of slot.templateIds) {
          const res = await toggleRecurringTemplateStatusServerAction(tmplId, newStatus);
          if (!res.success) hasError = true;
        }
        if (!hasError) {
          showNotification(`Créneau ${slot.start} → ${slot.end} ${newStatus ? "activé" : "désactivé"}.`);
          router.refresh();
        } else {
          showNotification("Certains créneaux n'ont pas pu être modifiés.", "error");
        }
      } else {
        showNotification("Créneau privé mis à jour.");
      }
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
      for (let dayIndex = 0; dayIndex < 6; dayIndex++) {
        const dayName = indexToDayName(dayIndex);
        if (privateDays[dayName]) {
          const res = await createRecurringTemplateServerAction({
            day_of_week: dayIndex,
            start_time: newSlotStart,
            end_time: newSlotEnd,
            type: "private",
            discipline: "Cours Privé",
            level: "Individuel (50 min)",
            max_capacity: 1,
          });
          if (res.success) createdCount++;
        }
      }
      setIsAddSlotModalOpen(false);
      showNotification(`Créneau privé (${newSlotStart} → ${newSlotEnd}) ajouté pour ${createdCount} jour(s).`);
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
              discipline: "Cours Privé",
              level: "Individuel (50 min)",
              max_capacity: 1,
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
          showNotification("Créneau privé modifié et synchronisé avec succès.");
          router.refresh();
        } else {
          showNotification("Erreur lors de l'enregistrement.", "error");
        }
      } else {
        setPrivateSlots((prev) =>
          prev.map((s) => (s.id === editingPrivateSlot.id ? editingPrivateSlot : s))
        );
        setEditingPrivateSlot(null);
        showNotification("Créneau privé modifié.");
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
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#00d8ff]/10 border border-[#00d8ff]/30 rounded-full text-[#00d8ff] text-xs font-semibold uppercase tracking-wider mb-1">
            <Sparkles size={13} />
            <span>Coaching Individuel</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-heading font-black uppercase tracking-wider text-brand-white">
            COURS PRIVÉS
          </h1>
          <p className="text-xs sm:text-sm text-brand-white/60">
            Configurez les jours d&apos;ouverture et les créneaux horaires standards de 50 min dédiés aux réservations de cours privés.
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

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          SECTION 1 : JOURS D'OUVERTURE
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="bg-[#0f172a] border border-brand-white/10 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-brand-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <Calendar size={18} className="text-[#00d8ff]" />
            <h2 className="text-lg font-heading font-black uppercase tracking-wider text-brand-white">
              Jours d&apos;ouverture des cours privés
            </h2>
          </div>
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

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          SECTION 2 : CRÉNEAUX HORAIRES STANDARDS
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="bg-[#0f172a] border border-brand-white/10 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <Clock size={18} className="text-[#00d8ff]" />
            <div>
              <h2 className="text-lg font-heading font-black uppercase tracking-wider text-brand-white">
                Créneaux horaires standards (6 par jour)
              </h2>
              <p className="text-xs text-brand-white/50">
                Matin : 08h-11h · Après-midi : 14h-17h (50 min par séance · Capacité : 1)
              </p>
            </div>
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
                  {slot.durationMin} min · Capacité : 1
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

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MODAL : AJOUT CRÉNEAU PRIVÉ EXCEPTIONNEL
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
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
                  Ajouter un créneau privé exceptionnel
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

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MODAL : MODIFIER CRÉNEAU PRIVÉ
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
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
                  Modifier le créneau privé
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
  );
}
