"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Users,
  Plus,
  Edit2,
  Clock,
  X,
  CheckCircle,
  AlertCircle,
  Settings2,
  Info,
  Trash2,
  Loader2,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createRecurringTemplateServerAction,
  updateRecurringTemplateServerAction,
  toggleRecurringTemplateStatusServerAction,
  deleteRecurringTemplateServerAction,
  updateSingleDatedSessionServerAction,
  triggerScheduleGenerationServerAction,
  type RecurringTemplateItem,
  type AdminDatedSessionItem,
} from "@/app/(admin)/admin/planning/actions";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TYPES ET DÉFINITIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

type DayName = "Lundi" | "Mardi" | "Mercredi" | "Jeudi" | "Vendredi" | "Samedi";
type LevelCategory = "Fondamentaux" | "Drills" | "Cardio" | "100% féminin" | "Sparring";

interface SmallGroupSessionItem {
  id: string;
  templateId?: string;
  day: DayName;
  startTime: string;
  endTime: string;
  discipline: string;
  level: LevelCategory;
  maxCapacity: number;
  isActive: boolean;
  bookedCount?: number;
}

const DAYS_ORDER: DayName[] = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

const dayNameToIndex = (d: DayName): number => Math.max(0, DAYS_ORDER.indexOf(d));
const indexToDayName = (i: number): DayName => DAYS_ORDER[i] || "Lundi";

// Fallback initial officiel Small Group (60 min par défaut, 50 min pour Cardio)
const FALLBACK_SMALL_GROUP: SmallGroupSessionItem[] = [
  // Lundi
  { id: "sg_1", day: "Lundi", startTime: "07:00", endTime: "08:00", discipline: "Boxing Bag", level: "Fondamentaux", maxCapacity: 12, isActive: true },
  { id: "sg_2", day: "Lundi", startTime: "11:00", endTime: "12:00", discipline: "Boxe anglaise", level: "Fondamentaux", maxCapacity: 12, isActive: true },
  { id: "sg_3", day: "Lundi", startTime: "12:15", endTime: "13:15", discipline: "KB Shred", level: "Drills", maxCapacity: 12, isActive: true },
  // Mardi (Cardio à 50 min)
  { id: "sg_4", day: "Mardi", startTime: "11:00", endTime: "11:50", discipline: "KB Shred", level: "Cardio", maxCapacity: 12, isActive: true },
  { id: "sg_5", day: "Mardi", startTime: "12:15", endTime: "13:05", discipline: "Boxing Bag", level: "Cardio", maxCapacity: 12, isActive: true },
  { id: "sg_6", day: "Mardi", startTime: "17:00", endTime: "18:00", discipline: "Lady Striking", level: "100% féminin", maxCapacity: 12, isActive: true },
  { id: "sg_7", day: "Mardi", startTime: "18:00", endTime: "19:00", discipline: "Kick Boxing", level: "Fondamentaux", maxCapacity: 12, isActive: true },
  // Mercredi
  { id: "sg_8", day: "Mercredi", startTime: "07:00", endTime: "08:00", discipline: "Boxing Bag", level: "Drills", maxCapacity: 12, isActive: true },
  { id: "sg_9", day: "Mercredi", startTime: "11:00", endTime: "12:00", discipline: "Kick Boxing", level: "Fondamentaux", maxCapacity: 12, isActive: true },
  { id: "sg_10", day: "Mercredi", startTime: "12:15", endTime: "13:15", discipline: "KB Shred", level: "Drills", maxCapacity: 12, isActive: true },
  { id: "sg_11", day: "Mercredi", startTime: "17:30", endTime: "18:30", discipline: "Striking", level: "Drills", maxCapacity: 12, isActive: true },
  { id: "sg_12", day: "Mercredi", startTime: "19:30", endTime: "20:30", discipline: "Boxe Thaï", level: "Fondamentaux", maxCapacity: 12, isActive: true },
  { id: "sg_13", day: "Mercredi", startTime: "20:30", endTime: "21:30", discipline: "Kick Boxing", level: "Drills", maxCapacity: 12, isActive: true },
  // Jeudi
  { id: "sg_14", day: "Jeudi", startTime: "11:00", endTime: "12:00", discipline: "KB Shred", level: "Drills", maxCapacity: 12, isActive: true },
  { id: "sg_15", day: "Jeudi", startTime: "12:15", endTime: "13:15", discipline: "Striking", level: "Drills", maxCapacity: 12, isActive: true },
  { id: "sg_16", day: "Jeudi", startTime: "17:30", endTime: "18:30", discipline: "Lady Striking", level: "100% féminin", maxCapacity: 12, isActive: true },
  { id: "sg_17", day: "Jeudi", startTime: "19:30", endTime: "20:30", discipline: "Kick Boxing", level: "Fondamentaux", maxCapacity: 12, isActive: true },
  { id: "sg_18", day: "Jeudi", startTime: "20:30", endTime: "21:30", discipline: "Boxe Thaï", level: "Sparring", maxCapacity: 12, isActive: true },
  // Vendredi
  { id: "sg_19", day: "Vendredi", startTime: "07:00", endTime: "08:00", discipline: "Boxing Bag", level: "Fondamentaux", maxCapacity: 12, isActive: true },
  { id: "sg_20", day: "Vendredi", startTime: "17:00", endTime: "18:00", discipline: "Boxe Thaï", level: "Fondamentaux", maxCapacity: 12, isActive: true },
  { id: "sg_trial_v", day: "Vendredi", startTime: "18:00", endTime: "19:00", discipline: "Boxe Thaï", level: "Fondamentaux", maxCapacity: 12, isActive: true },
  { id: "sg_21", day: "Vendredi", startTime: "19:30", endTime: "20:30", discipline: "Striking", level: "Drills", maxCapacity: 12, isActive: true },
  // Samedi
  { id: "sg_trial_s", day: "Samedi", startTime: "09:00", endTime: "10:00", discipline: "Boxe anglaise", level: "Fondamentaux", maxCapacity: 12, isActive: true },
  { id: "sg_22", day: "Samedi", startTime: "11:00", endTime: "12:00", discipline: "Kick Boxing", level: "Sparring", maxCapacity: 12, isActive: true },
  { id: "sg_23", day: "Samedi", startTime: "12:00", endTime: "13:00", discipline: "Lady Striking", level: "Sparring", maxCapacity: 12, isActive: true },
];

function getLevelBadgeClasses(level: string): string {
  const lvl = (level || "").toLowerCase();
  if (lvl.includes("fondament") || lvl.includes("tous niveaux") || lvl.includes("débutant") || lvl.includes("debutant")) {
    return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
  }
  if (lvl.includes("drill") || lvl.includes("performance") || lvl.includes("intermédiaire") || lvl.includes("intermediaire")) {
    return "bg-[#00d8ff]/15 text-[#00d8ff] border-[#00d8ff]/30";
  }
  if (lvl.includes("cardio")) {
    return "bg-purple-500/15 text-purple-400 border-purple-500/30";
  }
  if (lvl.includes("100% féminin") || lvl.includes("100% feminin") || lvl.includes("féminin") || lvl.includes("feminin") || lvl.includes("femme") || lvl.includes("lady")) {
    return "bg-pink-500/15 text-pink-400 border-pink-500/30";
  }
  if (lvl.includes("sparring") || lvl.includes("élite") || lvl.includes("elite") || lvl.includes("confirmé") || lvl.includes("confirme")) {
    return "bg-red-500/15 text-red-400 border-red-500/30";
  }
  return "bg-brand-white/10 text-brand-white/70 border-brand-white/20";
}

interface AdminPlanningViewProps {
  initialTemplates?: RecurringTemplateItem[];
  initialSessions?: AdminDatedSessionItem[];
}

export default function AdminPlanningView({
  initialTemplates = [],
  initialSessions = [],
}: AdminPlanningViewProps) {
  const router = useRouter();

  // Initialisation à partir des données Supabase réelles
  const initialSgFromDb: SmallGroupSessionItem[] = useMemo(() => {
    const sgTmpl = initialTemplates.filter((t) => t.type === "small_group");
    if (sgTmpl.length > 0) {
      return sgTmpl.map((t) => ({
        id: t.id,
        templateId: t.id,
        day: indexToDayName(t.day_of_week),
        startTime: t.start_time.slice(0, 5),
        endTime: t.end_time.slice(0, 5),
        discipline: t.discipline,
        level: t.level as LevelCategory,
        maxCapacity: t.max_capacity,
        isActive: t.is_active,
      }));
    }
    return FALLBACK_SMALL_GROUP;
  }, [initialTemplates]);

  // État Small Group (alimenté par Supabase)
  const [smallGroupSessions, setSmallGroupSessions] = useState<SmallGroupSessionItem[]>(initialSgFromDb);

  useEffect(() => {
    setSmallGroupSessions(initialSgFromDb);
  }, [initialSgFromDb]);

  // État de chargement global des actions
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

  // Modal Ajout Small Group
  const [isAddSgModalOpen, setIsAddSgModalOpen] = useState(false);
  const [sgFormDay, setSgFormDay] = useState<DayName>("Lundi");
  const [sgFormStart, setSgFormStart] = useState("09:00");
  const [sgFormEnd, setSgFormEnd] = useState("09:50");
  const [sgFormDiscipline, setSgFormDiscipline] = useState("Boxing Bag");
  const [sgFormLevel, setSgFormLevel] = useState<LevelCategory>("Fondamentaux");
  const [sgFormCapacity, setSgFormCapacity] = useState(12);

  // Modal Édition Small Group
  const [editingSgSession, setEditingSgSession] = useState<SmallGroupSessionItem | null>(null);
  const [editScope, setEditScope] = useState<"recurring" | "single">("recurring");

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ACTIONS SERVEUR / SUPABASE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // Synchronisation globale de l'horizon
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

  // Toggle Actif / Désactivé pour Small Group
  const toggleSgSession = async (id: string) => {
    const current = smallGroupSessions.find((s) => s.id === id);
    if (!current) return;
    const newStatus = !current.isActive;

    setSmallGroupSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isActive: newStatus } : s))
    );
    setIsSubmitting(true);

    try {
      const res = await toggleRecurringTemplateStatusServerAction(id, newStatus);
      if (res.success) {
        showNotification(
          `Séance Small Group ${current.discipline} (${current.day}) ${newStatus ? "activée" : "désactivée"}.`
        );
        router.refresh();
      } else {
        setSmallGroupSessions((prev) =>
          prev.map((s) => (s.id === id ? { ...s, isActive: !newStatus } : s))
        );
        showNotification(res.error || "Erreur lors de la modification.", "error");
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Erreur serveur.";
      setSmallGroupSessions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, isActive: !newStatus } : s))
      );
      showNotification(errorMsg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Ajout d'un Small Group
  const handleAddSgSession = async () => {
    setIsSubmitting(true);
    try {
      const res = await createRecurringTemplateServerAction({
        day_of_week: dayNameToIndex(sgFormDay),
        start_time: sgFormStart,
        end_time: sgFormEnd,
        type: "small_group",
        discipline: sgFormDiscipline,
        level: sgFormLevel,
        max_capacity: sgFormCapacity,
      });

      if (res.success && res.data) {
        const newSlot: SmallGroupSessionItem = {
          id: res.data.id,
          templateId: res.data.id,
          day: sgFormDay,
          startTime: sgFormStart,
          endTime: sgFormEnd,
          discipline: sgFormDiscipline,
          level: sgFormLevel,
          maxCapacity: sgFormCapacity,
          isActive: true,
        };
        setSmallGroupSessions((prev) => [...prev, newSlot]);
        setIsAddSgModalOpen(false);
        showNotification(`Séance Small Group ${sgFormDiscipline} (${sgFormDay}) ajoutée au planning.`);
        router.refresh();
      } else {
        showNotification(res.error || "Erreur lors de la création de la séance.", "error");
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Erreur inattendue.";
      showNotification(errorMsg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Édition d'un Small Group (avec choix Récurrent vs Séance unique)
  const handleSaveEditSgSession = async (forceCascade = false) => {
    if (!editingSgSession) return;
    setIsSubmitting(true);

    try {
      if (editScope === "recurring") {
        const res = await updateRecurringTemplateServerAction(
          editingSgSession.id,
          {
            day_of_week: dayNameToIndex(editingSgSession.day),
            start_time: editingSgSession.startTime,
            end_time: editingSgSession.endTime,
            discipline: editingSgSession.discipline,
            level: editingSgSession.level,
            max_capacity: editingSgSession.maxCapacity,
            is_active: editingSgSession.isActive,
          },
          forceCascade
        );

        if (res.hasBookings && !forceCascade) {
          setPendingWarningModal({
            message: res.message || "Des réservations futures existent sur ce créneau.",
            onConfirm: async () => {
              setPendingWarningModal(null);
              await handleSaveEditSgSession(true);
            },
          });
          setIsSubmitting(false);
          return;
        }

        if (res.success) {
          setSmallGroupSessions((prev) =>
            prev.map((s) => (s.id === editingSgSession.id ? editingSgSession : s))
          );
          setEditingSgSession(null);
          showNotification("Créneau récurrent mis à jour et synchronisé avec succès.");
          router.refresh();
        } else {
          showNotification(res.error || "Impossible de modifier le créneau.", "error");
        }
      } else {
        // Modification ponctuelle : recherche de la séance correspondante
        const matched = initialSessions.find(
          (s) => s.template_id === editingSgSession.id || s.id === editingSgSession.id
        );
        if (matched) {
          const res = await updateSingleDatedSessionServerAction(matched.id, {
            discipline: editingSgSession.discipline,
            level: editingSgSession.level,
            max_capacity: editingSgSession.maxCapacity,
            is_active: editingSgSession.isActive,
          });
          if (res.success) {
            setEditingSgSession(null);
            showNotification("Séance ponctuelle mise à jour avec succès.");
            router.refresh();
          } else {
            showNotification(res.error || "Erreur lors de la modification ponctuelle.", "error");
          }
        } else {
          showNotification("Aucune occurrence datée active trouvée pour cette date.", "error");
        }
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Erreur lors de l'enregistrement.";
      showNotification(errorMsg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Suppression d'un Small Group
  const handleDeleteSgSession = async (id: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ou désactiver ce créneau récurrent ?")) return;
    setIsSubmitting(true);
    try {
      const res = await deleteRecurringTemplateServerAction(id);
      if (res.success) {
        setSmallGroupSessions((prev) => prev.filter((s) => s.id !== id));
        setEditingSgSession(null);
        showNotification(res.message || "Créneau supprimé.");
        router.refresh();
      } else {
        showNotification(res.error || "Impossible de supprimer ce créneau.", "error");
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Erreur serveur.";
      showNotification(errorMsg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };



  // Groupement Small Group par jour
  const sgByDay = useMemo(() => {
    const map: Record<DayName, SmallGroupSessionItem[]> = {
      Lundi: [],
      Mardi: [],
      Mercredi: [],
      Jeudi: [],
      Vendredi: [],
      Samedi: [],
    };
    smallGroupSessions.forEach((s) => {
      if (map[s.day]) map[s.day].push(s);
    });
    DAYS_ORDER.forEach((d) => {
      map[d].sort((a, b) => a.startTime.localeCompare(b.startTime));
    });
    return map;
  }, [smallGroupSessions]);

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-6xl mx-auto">
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          EN-TÊTE PRINCIPAL
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-white/10 pb-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#00d8ff]/10 border border-[#00d8ff]/30 rounded-full text-[#00d8ff] text-xs font-semibold uppercase tracking-wider mb-1">
            <Settings2 size={13} />
            <span>Administration Centrale</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-heading font-black uppercase tracking-wider text-brand-white">
            PLANNING & COURS
          </h1>
          <p className="text-xs sm:text-sm text-brand-white/60">
            Source de vérité officielle : gérez la semaine type Small Group, synchronisée en direct avec le site public et l&apos;espace membre.
          </p>
        </div>

        {/* Bouton de synchronisation de l'horizon */}
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
          PLANNING SMALL GROUP (SEMAINE TYPE OFFICIELLE PERSISTÉE)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0b1b33]/40 border border-[#00d8ff]/20 rounded-2xl p-4">
          <div className="flex items-center gap-2.5 text-xs text-[#00d8ff]">
            <Users size={18} className="shrink-0" />
            <span>
              <strong>Planning Small Group (Semaine type) :</strong> Modèle dynamique stocké dans Supabase · Capacité par défaut : <strong>12 max</strong>.
            </span>
          </div>

            <button
              onClick={() => setIsAddSgModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#00d8ff] hover:bg-brand-white text-black font-heading font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-[#00d8ff]/20 shrink-0 cursor-pointer"
            >
              <Plus size={15} />
              Ajouter une séance Small Group
            </button>
          </div>

          {/* Grille des séances par jour */}
          <div className="space-y-6">
            {DAYS_ORDER.map((day) => {
              const daySessions = sgByDay[day];
              if (!daySessions || daySessions.length === 0) return null;

              return (
                <div key={day} className="bg-[#0f172a] border border-brand-white/10 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-brand-white/10 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-4 rounded-full bg-[#00d8ff]" />
                      <h3 className="text-xl font-heading font-bold uppercase tracking-wider text-brand-white">
                        {day}
                      </h3>
                    </div>
                    <span className="text-xs text-brand-white/40 font-semibold">
                      {daySessions.length} séances
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {daySessions.map((session) => (
                      <div
                        key={session.id}
                        className={cn(
                          "p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all",
                          session.isActive
                            ? "bg-black/30 border-brand-white/10 hover:border-brand-white/20"
                            : "bg-zinc-900/60 border-zinc-800 opacity-60"
                        )}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="text-base font-heading font-bold uppercase tracking-wide text-brand-white">
                              {session.discipline}
                            </span>
                            <span className={cn("text-[10px] font-black uppercase px-2.5 py-0.5 rounded border", getLevelBadgeClasses(session.level))}>
                              {session.level}
                            </span>
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-brand-white/5 border border-brand-white/10 text-brand-white/70">
                              {session.maxCapacity} places max
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-brand-white/60">
                            <span className="flex items-center gap-1 font-bold text-[#00d8ff]">
                              <Clock size={13} />
                              {session.startTime} → {session.endTime}
                            </span>
                            <span className="text-brand-white/40">• 60 min · Small Group</span>
                          </div>
                        </div>

                        {/* Statut & Actions */}
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => {
                              setEditingSgSession(session);
                              setEditScope("recurring");
                            }}
                            className="p-2 rounded-lg bg-brand-white/5 hover:bg-brand-white/15 text-brand-white/80 hover:text-brand-white border border-brand-white/10 transition-colors cursor-pointer"
                            title="Modifier cette séance"
                          >
                            <Edit2 size={14} />
                          </button>

                          <button
                            onClick={() => toggleSgSession(session.id)}
                            disabled={isSubmitting}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-xs font-heading font-black uppercase tracking-wider transition-all cursor-pointer",
                              session.isActive
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30"
                                : "bg-zinc-800 text-zinc-500 border border-zinc-700 hover:bg-zinc-700"
                            )}
                          >
                            {session.isActive ? "Actif" : "Désactivé"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MODAL : AJOUT SÉANCE SMALL GROUP
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatePresence>
        {isAddSgModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddSgModalOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative w-full max-w-lg max-h-[calc(100dvh-1.5rem)] bg-[#0f172a] border border-[#00d8ff]/30 rounded-2xl shadow-2xl z-10 flex flex-col overflow-hidden"
            >
              {/* HEADER */}
              <div className="flex items-center justify-between px-5 py-4 sm:px-6 sm:py-4.5 border-b border-brand-white/10 bg-[#0f172a] shrink-0">
                <h3 className="text-base sm:text-lg font-heading font-black uppercase tracking-wider text-brand-white">
                  Ajouter une séance Small Group
                </h3>
                <button
                  onClick={() => setIsAddSgModalOpen(false)}
                  className="p-1.5 rounded-lg text-brand-white/50 hover:text-brand-white hover:bg-brand-white/10 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* BODY SCROLLABLE */}
              <div
                className="p-5 sm:p-6 overflow-y-auto overscroll-contain flex-1 space-y-4 text-xs"
                style={{ WebkitOverflowScrolling: "touch" }}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                  <div>
                    <label className="text-[11px] sm:text-xs text-brand-white/60 uppercase font-bold block mb-1">
                      Jour
                    </label>
                    <select
                      value={sgFormDay}
                      onChange={(e) => setSgFormDay(e.target.value as DayName)}
                      className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl px-3 py-2.5 sm:py-3 text-brand-white text-xs sm:text-sm focus:border-[#00d8ff]/50 focus:outline-none transition-colors"
                    >
                      {DAYS_ORDER.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] sm:text-xs text-brand-white/60 uppercase font-bold block mb-1">
                      Discipline
                    </label>
                    <select
                      value={sgFormDiscipline}
                      onChange={(e) => setSgFormDiscipline(e.target.value)}
                      className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl px-3 py-2.5 sm:py-3 text-brand-white text-xs sm:text-sm focus:border-[#00d8ff]/50 focus:outline-none transition-colors"
                    >
                      <option value="Boxing Bag">Boxing Bag</option>
                      <option value="Boxe anglaise">Boxe anglaise</option>
                      <option value="KB Shred">KB Shred</option>
                      <option value="Kick Boxing">Kick Boxing</option>
                      <option value="Lady Striking">Lady Striking</option>
                      <option value="Striking">Striking</option>
                      <option value="Boxe Thaï">Boxe Thaï</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] sm:text-xs text-brand-white/60 uppercase font-bold block mb-1">
                      Niveau / Type
                    </label>
                    <select
                      value={sgFormLevel}
                      onChange={(e) => setSgFormLevel(e.target.value as LevelCategory)}
                      className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl px-3 py-2.5 sm:py-3 text-brand-white text-xs sm:text-sm focus:border-[#00d8ff]/50 focus:outline-none transition-colors"
                    >
                      <option value="Fondamentaux">Fondamentaux (Vert)</option>
                      <option value="Drills">Drills (Bleu cyan)</option>
                      <option value="Cardio">Cardio (Violet)</option>
                      <option value="100% féminin">100% féminin (Rose)</option>
                      <option value="Sparring">Sparring (Rouge)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] sm:text-xs text-brand-white/60 uppercase font-bold block mb-1">
                      Capacité maximale
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={sgFormCapacity}
                      onChange={(e) => setSgFormCapacity(Number(e.target.value))}
                      className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl px-3 py-2.5 sm:py-3 text-brand-white text-xs sm:text-sm focus:border-[#00d8ff]/50 focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] sm:text-xs text-brand-white/60 uppercase font-bold block mb-1">
                      Heure de début
                    </label>
                    <input
                      type="time"
                      value={sgFormStart}
                      onChange={(e) => setSgFormStart(e.target.value)}
                      className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl px-3 py-2.5 sm:py-3 text-brand-white font-mono text-xs sm:text-sm focus:border-[#00d8ff]/50 focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] sm:text-xs text-brand-white/60 uppercase font-bold block mb-1">
                      Heure de fin
                    </label>
                    <input
                      type="time"
                      value={sgFormEnd}
                      onChange={(e) => setSgFormEnd(e.target.value)}
                      className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl px-3 py-2.5 sm:py-3 text-brand-white font-mono text-xs sm:text-sm focus:border-[#00d8ff]/50 focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* FOOTER */}
              <div className="px-5 py-3.5 sm:px-6 sm:py-4 bg-[#0a101d] border-t border-brand-white/10 flex gap-2.5 sm:gap-3 shrink-0 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
                <button
                  onClick={() => setIsAddSgModalOpen(false)}
                  className="flex-1 py-2.5 sm:py-3 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white/70 font-heading font-bold text-xs uppercase rounded-xl transition-all cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  onClick={handleAddSgSession}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 sm:py-3 bg-[#00d8ff] hover:bg-brand-white text-black font-heading font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg shadow-[#00d8ff]/20 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Plus size={16} />
                  <span>Créer la séance</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MODAL : MODIFIER SÉANCE SMALL GROUP
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatePresence>
        {editingSgSession && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingSgSession(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative w-full max-w-lg max-h-[calc(100dvh-1.5rem)] bg-[#0f172a] border border-[#00d8ff]/30 rounded-2xl shadow-2xl z-10 flex flex-col overflow-hidden"
            >
              {/* HEADER */}
              <div className="flex items-center justify-between px-5 py-4 sm:px-6 sm:py-4.5 border-b border-brand-white/10 bg-[#0f172a] shrink-0">
                <h3 className="text-base sm:text-lg font-heading font-black uppercase tracking-wider text-brand-white">
                  Modifier la séance Small Group
                </h3>
                <button
                  onClick={() => setEditingSgSession(null)}
                  className="p-1.5 rounded-lg text-brand-white/50 hover:text-brand-white hover:bg-brand-white/10 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* BODY SCROLLABLE */}
              <div
                className="p-5 sm:p-6 overflow-y-auto overscroll-contain flex-1 space-y-4 text-xs"
                style={{ WebkitOverflowScrolling: "touch" }}
              >
                {/* Portée de la modification */}
                <div className="bg-[#0b1b33]/40 border border-[#00d8ff]/20 rounded-xl p-3.5 space-y-2">
                  <span className="text-[11px] font-bold text-[#00d8ff] uppercase block">
                    Portée de la modification
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditScope("recurring")}
                      className={cn(
                        "py-2 px-3 rounded-lg text-xs font-heading font-bold uppercase transition-all border text-center cursor-pointer",
                        editScope === "recurring"
                          ? "bg-[#00d8ff] text-black border-[#00d8ff] shadow-md shadow-[#00d8ff]/20"
                          : "bg-brand-white/5 text-brand-white/70 border-brand-white/10 hover:bg-brand-white/10"
                      )}
                    >
                      Toutes les semaines (Récurrent)
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditScope("single")}
                      className={cn(
                        "py-2 px-3 rounded-lg text-xs font-heading font-bold uppercase transition-all border text-center cursor-pointer",
                        editScope === "single"
                          ? "bg-[#00d8ff] text-black border-[#00d8ff] shadow-md shadow-[#00d8ff]/20"
                          : "bg-brand-white/5 text-brand-white/70 border-brand-white/10 hover:bg-brand-white/10"
                      )}
                    >
                      Cette occurrence uniquement
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                  <div>
                    <label className="text-[11px] sm:text-xs text-brand-white/60 uppercase font-bold block mb-1">
                      Jour
                    </label>
                    <select
                      value={editingSgSession.day}
                      onChange={(e) =>
                        setEditingSgSession({ ...editingSgSession, day: e.target.value as DayName })
                      }
                      className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl px-3 py-2.5 sm:py-3 text-brand-white text-xs sm:text-sm focus:border-[#00d8ff]/50 focus:outline-none transition-colors"
                    >
                      {DAYS_ORDER.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] sm:text-xs text-brand-white/60 uppercase font-bold block mb-1">
                      Discipline
                    </label>
                    <select
                      value={editingSgSession.discipline}
                      onChange={(e) =>
                        setEditingSgSession({ ...editingSgSession, discipline: e.target.value })
                      }
                      className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl px-3 py-2.5 sm:py-3 text-brand-white text-xs sm:text-sm focus:border-[#00d8ff]/50 focus:outline-none transition-colors"
                    >
                      <option value="Boxing Bag">Boxing Bag</option>
                      <option value="Boxe anglaise">Boxe anglaise</option>
                      <option value="KB Shred">KB Shred</option>
                      <option value="Kick Boxing">Kick Boxing</option>
                      <option value="Lady Striking">Lady Striking</option>
                      <option value="Striking">Striking</option>
                      <option value="Boxe Thaï">Boxe Thaï</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] sm:text-xs text-brand-white/60 uppercase font-bold block mb-1">
                      Niveau / Type
                    </label>
                    <select
                      value={editingSgSession.level}
                      onChange={(e) =>
                        setEditingSgSession({
                          ...editingSgSession,
                          level: e.target.value as LevelCategory,
                        })
                      }
                      className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl px-3 py-2.5 sm:py-3 text-brand-white text-xs sm:text-sm focus:border-[#00d8ff]/50 focus:outline-none transition-colors"
                    >
                      <option value="Fondamentaux">Fondamentaux (Vert)</option>
                      <option value="Drills">Drills (Bleu cyan)</option>
                      <option value="Cardio">Cardio (Violet)</option>
                      <option value="100% féminin">100% féminin (Rose)</option>
                      <option value="Sparring">Sparring (Rouge)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] sm:text-xs text-brand-white/60 uppercase font-bold block mb-1">
                      Capacité maximale
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={editingSgSession.maxCapacity}
                      onChange={(e) =>
                        setEditingSgSession({
                          ...editingSgSession,
                          maxCapacity: Number(e.target.value),
                        })
                      }
                      className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl px-3 py-2.5 sm:py-3 text-brand-white text-xs sm:text-sm focus:border-[#00d8ff]/50 focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] sm:text-xs text-brand-white/60 uppercase font-bold block mb-1">
                      Heure de début
                    </label>
                    <input
                      type="time"
                      value={editingSgSession.startTime}
                      onChange={(e) =>
                        setEditingSgSession({ ...editingSgSession, startTime: e.target.value })
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
                      value={editingSgSession.endTime}
                      onChange={(e) =>
                        setEditingSgSession({ ...editingSgSession, endTime: e.target.value })
                      }
                      className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl px-3 py-2.5 sm:py-3 text-brand-white font-mono text-xs sm:text-sm focus:border-[#00d8ff]/50 focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* FOOTER */}
              <div className="px-5 py-3.5 sm:px-6 sm:py-4 bg-[#0a101d] border-t border-brand-white/10 flex items-center justify-between gap-2.5 sm:gap-3 shrink-0 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
                <button
                  type="button"
                  onClick={() => handleDeleteSgSession(editingSgSession.id)}
                  disabled={isSubmitting}
                  className="p-2.5 sm:p-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl transition-all cursor-pointer shrink-0"
                  title="Supprimer ce créneau récurrent"
                >
                  <Trash2 size={16} />
                </button>

                <div className="flex gap-2 flex-1 justify-end">
                  <button
                    onClick={() => setEditingSgSession(null)}
                    disabled={isSubmitting}
                    className="py-2.5 px-3.5 sm:py-3 sm:px-5 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white/70 font-heading font-bold text-xs uppercase rounded-xl transition-all cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => handleSaveEditSgSession(false)}
                    disabled={isSubmitting}
                    className="py-2.5 px-4 sm:py-3 sm:px-6 bg-[#00d8ff] hover:bg-brand-white text-black font-heading font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg shadow-[#00d8ff]/20 flex items-center justify-center gap-2"
                  >
                    {isSubmitting && <Loader2 size={15} className="animate-spin" />}
                    <span>Enregistrer</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
