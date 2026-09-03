"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Users,
  Plus,
  Edit2,
  Clock,
  X,
  CheckCircle,
  Sparkles,
  Award,
  AlertCircle,
  Flame,
  Dumbbell,
  Target,
  Layers,
  Settings2,
  Sliders,
  Check,
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
  toggleSingleSessionStatusServerAction,
  triggerScheduleGenerationServerAction,
  type RecurringTemplateItem,
  type AdminDatedSessionItem,
} from "@/app/(admin)/admin/planning/actions";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TYPES ET DÉFINITIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

type AdminTab = "Cours privés" | "Small Group" | "Collectifs";
type DayName = "Lundi" | "Mardi" | "Mercredi" | "Jeudi" | "Vendredi" | "Samedi";
type LevelCategory = "Fondamentaux" | "Performance" | "Élite" | "Cardio" | "Cours féminin";

interface PrivateSlotConfig {
  id: string;
  start: string;
  end: string;
  durationMin: number;
  isActive: boolean;
}

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

interface CollectiveSessionItem {
  id: string;
  templateId?: string;
  day: DayName;
  startTime: string;
  endTime: string;
  discipline: string;
  level: string;
  maxCapacity?: number;
  isActive: boolean;
}

const DAYS_ORDER: DayName[] = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

const dayNameToIndex = (d: DayName): number => Math.max(0, DAYS_ORDER.indexOf(d));
const indexToDayName = (i: number): DayName => DAYS_ORDER[i] || "Lundi";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. CONFIGURATION COURS PRIVÉS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const INITIAL_PRIVATE_DAYS: Record<DayName, boolean> = {
  Lundi: true,
  Mardi: true,
  Mercredi: true,
  Jeudi: true,
  Vendredi: true,
  Samedi: true,
};

const INITIAL_PRIVATE_SLOTS: PrivateSlotConfig[] = [
  { id: "priv_slot_1", start: "08:00", end: "08:50", durationMin: 50, isActive: true },
  { id: "priv_slot_2", start: "09:00", end: "09:50", durationMin: 50, isActive: true },
  { id: "priv_slot_3", start: "10:00", end: "10:50", durationMin: 50, isActive: true },
  { id: "priv_slot_4", start: "14:00", end: "14:50", durationMin: 50, isActive: true },
  { id: "priv_slot_5", start: "15:00", end: "15:50", durationMin: 50, isActive: true },
  { id: "priv_slot_6", start: "16:00", end: "16:50", durationMin: 50, isActive: true },
];

const PRIVATE_DISCIPLINES = [
  { name: "Boxe Anglaise", desc: "Technique de poings, esquives, combinaisons et précision", icon: Flame, isActive: true },
  { name: "Kick Boxing", desc: "Pieds-poings, timing, enchaînements et déplacements", icon: Target, isActive: true },
  { name: "Striking", desc: "Percussion polyvalente, transitions et puissance", icon: Award, isActive: true },
  { name: "Boxing Bag", desc: "Travail intensif aux sacs de frappe, cardio et frappe lourde", icon: Dumbbell, isActive: true },
  { name: "KB Shred", desc: "Conditioning martial haute intensité et renforcement", icon: Sparkles, isActive: true },
];

const PRIVATE_LEVELS = [
  { name: "Débutant", desc: "Apprentissage des fondamentaux, garde, posture et coordination" },
  { name: "Intermédiaire", desc: "Perfectionnement technique, fluidité, vitesse et rythme" },
  { name: "Confirmé", desc: "Intensité combat, sparring guidé, précision et stratégie" },
];

// Fallback initial officiel Small Group (23 séances)
const FALLBACK_SMALL_GROUP: SmallGroupSessionItem[] = [
  { id: "sg_1", day: "Lundi", startTime: "07:00", endTime: "07:50", discipline: "Boxing Bag", level: "Fondamentaux", maxCapacity: 20, isActive: true },
  { id: "sg_2", day: "Lundi", startTime: "11:00", endTime: "11:50", discipline: "Boxing", level: "Fondamentaux", maxCapacity: 20, isActive: true },
  { id: "sg_3", day: "Lundi", startTime: "12:15", endTime: "13:05", discipline: "Boxing Shred", level: "Performance", maxCapacity: 20, isActive: true },
  { id: "sg_4", day: "Mardi", startTime: "11:00", endTime: "11:50", discipline: "Boxing Shred", level: "Cardio", maxCapacity: 20, isActive: true },
  { id: "sg_5", day: "Mardi", startTime: "12:15", endTime: "13:05", discipline: "Boxing Bag", level: "Cardio", maxCapacity: 20, isActive: true },
  { id: "sg_6", day: "Mardi", startTime: "17:00", endTime: "17:50", discipline: "Lady Striking", level: "Cours féminin", maxCapacity: 20, isActive: true },
  { id: "sg_7", day: "Mardi", startTime: "18:00", endTime: "18:50", discipline: "Kick Boxing", level: "Fondamentaux", maxCapacity: 20, isActive: true },
  { id: "sg_8", day: "Mercredi", startTime: "07:00", endTime: "07:50", discipline: "Boxing Bag", level: "Performance", maxCapacity: 20, isActive: true },
  { id: "sg_9", day: "Mercredi", startTime: "11:00", endTime: "11:50", discipline: "Kick Boxing", level: "Fondamentaux", maxCapacity: 20, isActive: true },
  { id: "sg_10", day: "Mercredi", startTime: "12:15", endTime: "13:05", discipline: "Boxing Shred", level: "Performance", maxCapacity: 20, isActive: true },
  { id: "sg_11", day: "Mercredi", startTime: "17:30", endTime: "18:20", discipline: "Striking", level: "Performance", maxCapacity: 20, isActive: true },
  { id: "sg_12", day: "Mercredi", startTime: "19:30", endTime: "20:20", discipline: "Boxe Thaï", level: "Fondamentaux", maxCapacity: 20, isActive: true },
  { id: "sg_13", day: "Mercredi", startTime: "20:30", endTime: "21:20", discipline: "Kick Boxing", level: "Performance", maxCapacity: 20, isActive: true },
  { id: "sg_14", day: "Jeudi", startTime: "11:00", endTime: "11:50", discipline: "Boxing Shred", level: "Performance", maxCapacity: 20, isActive: true },
  { id: "sg_15", day: "Jeudi", startTime: "12:15", endTime: "13:05", discipline: "Striking", level: "Performance", maxCapacity: 20, isActive: true },
  { id: "sg_16", day: "Jeudi", startTime: "17:30", endTime: "18:20", discipline: "Lady Striking", level: "Cours féminin", maxCapacity: 20, isActive: true },
  { id: "sg_17", day: "Jeudi", startTime: "19:30", endTime: "20:20", discipline: "Kick Boxing", level: "Fondamentaux", maxCapacity: 20, isActive: true },
  { id: "sg_18", day: "Jeudi", startTime: "20:30", endTime: "21:20", discipline: "Boxe Thaï", level: "Élite", maxCapacity: 20, isActive: true },
  { id: "sg_19", day: "Vendredi", startTime: "07:00", endTime: "07:50", discipline: "Boxing Bag", level: "Fondamentaux", maxCapacity: 20, isActive: true },
  { id: "sg_20", day: "Vendredi", startTime: "17:00", endTime: "17:50", discipline: "Boxe Thaï", level: "Fondamentaux", maxCapacity: 20, isActive: true },
  { id: "sg_21", day: "Vendredi", startTime: "19:30", endTime: "20:20", discipline: "Striking", level: "Performance", maxCapacity: 20, isActive: true },
  { id: "sg_22", day: "Samedi", startTime: "11:00", endTime: "11:50", discipline: "Kick Boxing", level: "Élite", maxCapacity: 20, isActive: true },
  { id: "sg_23", day: "Samedi", startTime: "12:00", endTime: "12:50", discipline: "Lady Striking", level: "Élite", maxCapacity: 20, isActive: true },
];

// Fallback initial officiel Collectifs (3 séances)
const FALLBACK_COLLECTIVE: CollectiveSessionItem[] = [
  { id: "col_1", day: "Mardi", startTime: "18:00", endTime: "19:00", discipline: "Kick Boxing", level: "Tous niveaux (Accès libre)", maxCapacity: 35, isActive: true },
  { id: "col_2", day: "Vendredi", startTime: "18:00", endTime: "19:00", discipline: "Kick Boxing", level: "Tous niveaux (Accès libre)", maxCapacity: 35, isActive: true },
  { id: "col_3", day: "Samedi", startTime: "10:00", endTime: "11:00", discipline: "Kick Boxing", level: "Tous niveaux (Accès libre)", maxCapacity: 35, isActive: true },
];

function getLevelBadgeClasses(level: string): string {
  switch (level) {
    case "Fondamentaux":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    case "Performance":
      return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    case "Élite":
      return "bg-red-500/15 text-red-400 border-red-500/30";
    case "Cardio":
      return "bg-orange-500/15 text-orange-400 border-orange-500/30";
    case "Cours féminin":
      return "bg-pink-500/15 text-pink-400 border-pink-500/30";
    default:
      return "bg-brand-white/10 text-brand-white/70 border-brand-white/20";
  }
}

interface AdminPlanningViewProps {
  initialTemplates?: RecurringTemplateItem[];
  initialSessions?: AdminDatedSessionItem[];
}

export default function AdminPlanningView({
  initialTemplates = [],
  initialSessions = [],
}: AdminPlanningViewProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>("Cours privés");

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

  const initialColFromDb: CollectiveSessionItem[] = useMemo(() => {
    const colTmpl = initialTemplates.filter((t) => t.type === "collective");
    if (colTmpl.length > 0) {
      return colTmpl.map((t) => ({
        id: t.id,
        templateId: t.id,
        day: indexToDayName(t.day_of_week),
        startTime: t.start_time.slice(0, 5),
        endTime: t.end_time.slice(0, 5),
        discipline: t.discipline,
        level: t.level,
        maxCapacity: t.max_capacity,
        isActive: t.is_active,
      }));
    }
    return FALLBACK_COLLECTIVE;
  }, [initialTemplates]);

  // 1. État Cours Privés
  const [privateDays, setPrivateDays] = useState<Record<DayName, boolean>>(INITIAL_PRIVATE_DAYS);
  const [privateSlots, setPrivateSlots] = useState<PrivateSlotConfig[]>(INITIAL_PRIVATE_SLOTS);
  const [privateDisciplines] = useState(PRIVATE_DISCIPLINES);

  // 2. État Small Group & Collectifs (alimentés par Supabase)
  const [smallGroupSessions, setSmallGroupSessions] = useState<SmallGroupSessionItem[]>(initialSgFromDb);
  const [collectiveSessions, setCollectiveSessions] = useState<CollectiveSessionItem[]>(initialColFromDb);

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

  // Modal Ajout Créneau Privé
  const [isAddSlotModalOpen, setIsAddSlotModalOpen] = useState(false);
  const [newSlotStart, setNewSlotStart] = useState("11:00");
  const [newSlotEnd, setNewSlotEnd] = useState("11:50");

  // Modal Édition Créneau Privé
  const [editingPrivateSlot, setEditingPrivateSlot] = useState<PrivateSlotConfig | null>(null);

  // Modal Ajout Small Group
  const [isAddSgModalOpen, setIsAddSgModalOpen] = useState(false);
  const [sgFormDay, setSgFormDay] = useState<DayName>("Lundi");
  const [sgFormStart, setSgFormStart] = useState("09:00");
  const [sgFormEnd, setSgFormEnd] = useState("09:50");
  const [sgFormDiscipline, setSgFormDiscipline] = useState("Boxing Bag");
  const [sgFormLevel, setSgFormLevel] = useState<LevelCategory>("Fondamentaux");
  const [sgFormCapacity, setSgFormCapacity] = useState(20);

  // Modal Édition Small Group
  const [editingSgSession, setEditingSgSession] = useState<SmallGroupSessionItem | null>(null);
  const [editScope, setEditScope] = useState<"recurring" | "single">("recurring");

  // Modal Ajout Collectif
  const [isAddColModalOpen, setIsAddColModalOpen] = useState(false);
  const [colFormDay, setColFormDay] = useState<DayName>("Mardi");
  const [colFormStart, setColFormStart] = useState("18:00");
  const [colFormEnd, setColFormEnd] = useState("19:00");
  const [colFormDiscipline, setColFormDiscipline] = useState("Kick Boxing");
  const [colFormLevel, setColFormLevel] = useState("Tous niveaux (Accès libre)");
  const [colFormCapacity, setColFormCapacity] = useState(35);

  // Modal Édition Collectifs
  const [editingCollectiveSession, setEditingCollectiveSession] = useState<CollectiveSessionItem | null>(null);

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
      } else {
        showNotification(res.error || "Erreur lors de la synchronisation de l'horizon.", "error");
      }
    } catch (err: any) {
      showNotification(err?.message || "Erreur inattendue.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Actif / Désactivé pour Small Group
  const toggleSgSession = async (id: string) => {
    const current = smallGroupSessions.find((s) => s.id === id);
    if (!current) return;
    const newStatus = !current.isActive;

    // Optimistic UI
    setSmallGroupSessions((prev) => prev.map((s) => (s.id === id ? { ...s, isActive: newStatus } : s)));
    setIsSubmitting(true);

    try {
      const res = await toggleRecurringTemplateStatusServerAction(id, newStatus);
      if (res.success) {
        showNotification(`Séance ${current.discipline} (${current.day}) ${newStatus ? "activée" : "désactivée"}.`);
      } else {
        // Rollback
        setSmallGroupSessions((prev) => prev.map((s) => (s.id === id ? { ...s, isActive: !newStatus } : s)));
        showNotification(res.error || "Impossible de modifier le statut.", "error");
      }
    } catch (err: any) {
      setSmallGroupSessions((prev) => prev.map((s) => (s.id === id ? { ...s, isActive: !newStatus } : s)));
      showNotification(err?.message || "Erreur serveur.", "error");
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
      } else {
        showNotification(res.error || "Erreur lors de la création de la séance.", "error");
      }
    } catch (err: any) {
      showNotification(err?.message || "Erreur inattendue.", "error");
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
          } else {
            showNotification(res.error || "Erreur lors de la modification ponctuelle.", "error");
          }
        } else {
          showNotification("Aucune occurrence datée active trouvée pour cette date.", "error");
        }
      }
    } catch (err: any) {
      showNotification(err?.message || "Erreur lors de l'enregistrement.", "error");
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
      } else {
        showNotification(res.error || "Impossible de supprimer ce créneau.", "error");
      }
    } catch (err: any) {
      showNotification(err?.message || "Erreur serveur.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Actif / Désactivé pour Collectif
  const toggleCollectiveSession = async (id: string) => {
    const current = collectiveSessions.find((s) => s.id === id);
    if (!current) return;
    const newStatus = !current.isActive;

    setCollectiveSessions((prev) => prev.map((s) => (s.id === id ? { ...s, isActive: newStatus } : s)));
    setIsSubmitting(true);

    try {
      const res = await toggleRecurringTemplateStatusServerAction(id, newStatus);
      if (res.success) {
        showNotification(`Cours collectif ${current.discipline} (${current.day}) ${newStatus ? "activé" : "désactivé"}.`);
      } else {
        setCollectiveSessions((prev) => prev.map((s) => (s.id === id ? { ...s, isActive: !newStatus } : s)));
        showNotification(res.error || "Erreur lors de la modification.", "error");
      }
    } catch (err: any) {
      setCollectiveSessions((prev) => prev.map((s) => (s.id === id ? { ...s, isActive: !newStatus } : s)));
      showNotification(err?.message || "Erreur serveur.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Ajout d'un cours collectif
  const handleAddCollectiveSession = async () => {
    setIsSubmitting(true);
    try {
      const res = await createRecurringTemplateServerAction({
        day_of_week: dayNameToIndex(colFormDay),
        start_time: colFormStart,
        end_time: colFormEnd,
        type: "collective",
        discipline: colFormDiscipline,
        level: colFormLevel,
        max_capacity: colFormCapacity,
      });

      if (res.success && res.data) {
        const newCol: CollectiveSessionItem = {
          id: res.data.id,
          templateId: res.data.id,
          day: colFormDay,
          startTime: colFormStart,
          endTime: colFormEnd,
          discipline: colFormDiscipline,
          level: colFormLevel,
          maxCapacity: colFormCapacity,
          isActive: true,
        };
        setCollectiveSessions((prev) => [...prev, newCol]);
        setIsAddColModalOpen(false);
        showNotification(`Cours collectif ${colFormDiscipline} (${colFormDay}) ajouté avec succès.`);
      } else {
        showNotification(res.error || "Erreur lors de la création du cours collectif.", "error");
      }
    } catch (err: any) {
      showNotification(err?.message || "Erreur serveur.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Édition d'un cours collectif
  const handleSaveEditCollectiveSession = async () => {
    if (!editingCollectiveSession) return;
    setIsSubmitting(true);

    try {
      const res = await updateRecurringTemplateServerAction(
        editingCollectiveSession.id,
        {
          day_of_week: dayNameToIndex(editingCollectiveSession.day),
          start_time: editingCollectiveSession.startTime,
          end_time: editingCollectiveSession.endTime,
          discipline: editingCollectiveSession.discipline,
          level: editingCollectiveSession.level,
          max_capacity: editingCollectiveSession.maxCapacity || 35,
          is_active: editingCollectiveSession.isActive,
        },
        true
      );

      if (res.success) {
        setCollectiveSessions((prev) =>
          prev.map((s) => (s.id === editingCollectiveSession.id ? editingCollectiveSession : s))
        );
        setEditingCollectiveSession(null);
        showNotification("Cours collectif modifié avec succès.");
      } else {
        showNotification(res.error || "Erreur lors de la modification.", "error");
      }
    } catch (err: any) {
      showNotification(err?.message || "Erreur inattendue.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Suppression d'un cours collectif
  const handleDeleteCollectiveSession = async (id: string) => {
    if (!window.confirm("Voulez-vous supprimer ce cours collectif ?")) return;
    setIsSubmitting(true);
    try {
      const res = await deleteRecurringTemplateServerAction(id);
      if (res.success) {
        setCollectiveSessions((prev) => prev.filter((s) => s.id !== id));
        setEditingCollectiveSession(null);
        showNotification(res.message || "Cours collectif supprimé.");
      } else {
        showNotification(res.error || "Erreur lors de la suppression.", "error");
      }
    } catch (err: any) {
      showNotification(err?.message || "Erreur serveur.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Actions Cours Privés
  const togglePrivateDay = (day: DayName) => {
    setPrivateDays((prev) => ({ ...prev, [day]: !prev[day] }));
    showNotification(`Disponibilité ${day} mise à jour.`);
  };

  const togglePrivateSlot = (id: string) => {
    setPrivateSlots((prev) => prev.map((s) => (s.id === id ? { ...s, isActive: !s.isActive } : s)));
    showNotification("Créneau privé mis à jour.");
  };

  const handleAddExceptionalSlot = () => {
    const newId = `priv_exp_${Date.now()}`;
    setPrivateSlots((prev) => [
      ...prev,
      { id: newId, start: newSlotStart, end: newSlotEnd, durationMin: 50, isActive: true },
    ]);
    setIsAddSlotModalOpen(false);
    showNotification(`Créneau exceptionnel (${newSlotStart} → ${newSlotEnd}) ajouté.`);
  };

  const handleSaveEditPrivateSlot = () => {
    if (!editingPrivateSlot) return;
    setPrivateSlots((prev) => prev.map((s) => (s.id === editingPrivateSlot.id ? editingPrivateSlot : s)));
    setEditingPrivateSlot(null);
    showNotification("Créneau privé modifié avec succès.");
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
            Source de vérité officielle : gérez la semaine type Small Group et Collectifs, synchronisée en direct avec le site public et l&apos;espace membre.
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-[#0f172a] border border-amber-500/40 rounded-2xl p-6 shadow-2xl z-10 space-y-4"
            >
              <div className="flex items-center gap-3 text-amber-400">
                <AlertTriangle size={24} />
                <h3 className="text-base font-heading font-black uppercase tracking-wider text-brand-white">
                  Réservations en cours détectées
                </h3>
              </div>
              <p className="text-xs text-brand-white/80 leading-relaxed">
                {pendingWarningModal.message}
              </p>
              <p className="text-[11px] text-brand-white/50">
                Les séances futures sans réservation seront synchronisées. Les séances ayant déjà des inscrits conserveront leur historique.
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setPendingWarningModal(null)}
                  className="flex-1 py-2.5 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white/70 font-heading font-bold text-xs uppercase rounded-xl"
                >
                  Annuler
                </button>
                <button
                  onClick={pendingWarningModal.onConfirm}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-heading font-black text-xs uppercase tracking-wider rounded-xl shadow-lg"
                >
                  Confirmer la modification
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          LES 3 ONGLETS STRICTS
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="bg-[#0f172a] p-1.5 rounded-2xl border border-brand-white/10 grid grid-cols-3 gap-1.5 shadow-xl">
        <button
          onClick={() => setActiveTab("Cours privés")}
          className={cn(
            "py-3.5 px-3 rounded-xl font-heading font-black text-xs sm:text-sm uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center gap-2",
            activeTab === "Cours privés"
              ? "bg-[#00d8ff] text-black shadow-lg shadow-[#00d8ff]/20"
              : "text-brand-white/70 hover:text-brand-white hover:bg-brand-white/5"
          )}
        >
          <Sparkles size={16} />
          <span>Cours privés</span>
        </button>

        <button
          onClick={() => setActiveTab("Small Group")}
          className={cn(
            "py-3.5 px-3 rounded-xl font-heading font-black text-xs sm:text-sm uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center gap-2",
            activeTab === "Small Group"
              ? "bg-[#00d8ff] text-black shadow-lg shadow-[#00d8ff]/20"
              : "text-brand-white/70 hover:text-brand-white hover:bg-brand-white/5"
          )}
        >
          <Users size={16} />
          <span>Small Group</span>
        </button>

        <button
          onClick={() => setActiveTab("Collectifs")}
          className={cn(
            "py-3.5 px-3 rounded-xl font-heading font-black text-xs sm:text-sm uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center gap-2",
            activeTab === "Collectifs"
              ? "bg-[#00d8ff] text-black shadow-lg shadow-[#00d8ff]/20"
              : "text-brand-white/70 hover:text-brand-white hover:bg-brand-white/5"
          )}
        >
          <Calendar size={16} />
          <span>Collectifs</span>
        </button>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          ONGLET 1 : COURS PRIVÉS
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {activeTab === "Cours privés" && (
        <div className="space-y-8">
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

          <div className="bg-[#0f172a] border border-brand-white/10 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <Clock size={18} className="text-[#00d8ff]" />
                <div>
                  <h2 className="text-lg font-heading font-black uppercase tracking-wider text-brand-white">
                    Créneaux horaires standards (6 par jour)
                  </h2>
                  <p className="text-xs text-brand-white/50">
                    Matin : 08h-11h · Après-midi : 14h-17h (50 min par séance)
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
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => togglePrivateSlot(slot.id)}
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
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          ONGLET 2 : SMALL GROUP (SEMAINE TYPE OFFICIELLE PERSISTÉE)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {activeTab === "Small Group" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0b1b33]/40 border border-[#00d8ff]/20 rounded-2xl p-4">
            <div className="flex items-center gap-2.5 text-xs text-[#00d8ff]">
              <Users size={18} className="shrink-0" />
              <span>
                <strong>Planning Small Group (Semaine type) :</strong> Modèle dynamique stocké dans Supabase · Capacité par défaut : <strong>20 max</strong>.
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
                            <span className="text-brand-white/40">• 50 min · Small Group</span>
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
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          ONGLET 3 : COLLECTIFS
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {activeTab === "Collectifs" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0f172a] border border-brand-white/10 rounded-2xl p-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-heading font-bold uppercase text-[#00d8ff]">
                <Info size={16} />
                <span>Règle des cours collectifs</span>
              </div>
              <p className="text-xs text-brand-white/70 leading-relaxed">
                Les cours collectifs sont affichés en <strong>« Accès libre sans réservation »</strong> sur le site public et dans l&apos;espace membre.
              </p>
            </div>

            <button
              onClick={() => setIsAddColModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#00d8ff] hover:bg-brand-white text-black font-heading font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-[#00d8ff]/20 shrink-0 cursor-pointer"
            >
              <Plus size={15} />
              Ajouter un cours collectif
            </button>
          </div>

          <div className="bg-[#0f172a] border border-brand-white/10 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-brand-white/10 pb-3">
              <h2 className="text-lg font-heading font-black uppercase tracking-wider text-brand-white">
                Planning officiel des cours collectifs
              </h2>
              <span className="text-xs text-brand-white/40">{collectiveSessions.length} créneaux configurés</span>
            </div>

            <div className="space-y-3">
              {collectiveSessions.map((session) => (
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
                        {session.day} · {session.discipline}
                      </span>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-brand-white/10 text-brand-white border border-brand-white/20">
                        {session.level}
                      </span>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#00d8ff]/10 text-[#00d8ff] border border-[#00d8ff]/20">
                        Accès libre sans réservation
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-brand-white/60">
                      <span className="flex items-center gap-1 font-bold text-[#00d8ff]">
                        <Clock size={13} />
                        {session.startTime} → {session.endTime}
                      </span>
                      <span className="text-brand-white/40">• 60 min · Collectif ({session.maxCapacity || 35} places)</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 justify-end">
                    <button
                      onClick={() => setEditingCollectiveSession(session)}
                      className="p-2 rounded-lg bg-brand-white/5 hover:bg-brand-white/15 text-brand-white/80 hover:text-brand-white border border-brand-white/10 transition-colors cursor-pointer"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => toggleCollectiveSession(session.id)}
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
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MODAL : AJOUT SÉANCE SMALL GROUP
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatePresence>
        {isAddSgModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddSgModalOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-[#0f172a] border border-[#00d8ff]/30 rounded-2xl p-6 sm:p-8 shadow-2xl z-10 space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-brand-white/10">
                <h3 className="text-lg font-heading font-black uppercase tracking-wider text-brand-white">
                  Ajouter une séance Small Group
                </h3>
                <button onClick={() => setIsAddSgModalOpen(false)} className="text-brand-white/50 hover:text-brand-white">
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="text-brand-white/60 uppercase font-bold block mb-1.5">Jour</label>
                  <select
                    value={sgFormDay}
                    onChange={(e) => setSgFormDay(e.target.value as DayName)}
                    className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-brand-white"
                  >
                    {DAYS_ORDER.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-brand-white/60 uppercase font-bold block mb-1.5">Discipline</label>
                  <select
                    value={sgFormDiscipline}
                    onChange={(e) => setSgFormDiscipline(e.target.value)}
                    className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-brand-white"
                  >
                    <option value="Boxing Bag">Boxing Bag</option>
                    <option value="Boxing">Boxing</option>
                    <option value="Boxing Shred">Boxing Shred</option>
                    <option value="Kick Boxing">Kick Boxing</option>
                    <option value="Lady Striking">Lady Striking</option>
                    <option value="Striking">Striking</option>
                    <option value="Boxe Thaï">Boxe Thaï</option>
                  </select>
                </div>

                <div>
                  <label className="text-brand-white/60 uppercase font-bold block mb-1.5">Niveau / Type</label>
                  <select
                    value={sgFormLevel}
                    onChange={(e) => setSgFormLevel(e.target.value as LevelCategory)}
                    className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-brand-white"
                  >
                    <option value="Fondamentaux">Fondamentaux (Vert)</option>
                    <option value="Performance">Performance (Bleu)</option>
                    <option value="Élite">Élite (Rouge)</option>
                    <option value="Cardio">Cardio (Orange)</option>
                    <option value="Cours féminin">Cours féminin (Rose)</option>
                  </select>
                </div>

                <div>
                  <label className="text-brand-white/60 uppercase font-bold block mb-1.5">Capacité max</label>
                  <input
                    type="number"
                    value={sgFormCapacity}
                    onChange={(e) => setSgFormCapacity(Number(e.target.value))}
                    className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-brand-white"
                  />
                </div>

                <div>
                  <label className="text-brand-white/60 uppercase font-bold block mb-1.5">Heure de début</label>
                  <input
                    type="time"
                    value={sgFormStart}
                    onChange={(e) => setSgFormStart(e.target.value)}
                    className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-brand-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-brand-white/60 uppercase font-bold block mb-1.5">Heure de fin</label>
                  <input
                    type="time"
                    value={sgFormEnd}
                    onChange={(e) => setSgFormEnd(e.target.value)}
                    className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-brand-white font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setIsAddSgModalOpen(false)}
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white/70 font-heading font-bold text-xs uppercase rounded-xl transition-all cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  onClick={handleAddSgSession}
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-[#00d8ff] hover:bg-brand-white text-black font-heading font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg shadow-[#00d8ff]/20 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  <span>Ajouter au planning</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MODAL : AJOUT COURS COLLECTIF
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatePresence>
        {isAddColModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddColModalOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-[#0f172a] border border-[#00d8ff]/30 rounded-2xl p-6 sm:p-8 shadow-2xl z-10 space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-brand-white/10">
                <h3 className="text-lg font-heading font-black uppercase tracking-wider text-brand-white">
                  Ajouter un cours collectif
                </h3>
                <button onClick={() => setIsAddColModalOpen(false)} className="text-brand-white/50 hover:text-brand-white">
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="text-brand-white/60 uppercase font-bold block mb-1.5">Jour</label>
                  <select
                    value={colFormDay}
                    onChange={(e) => setColFormDay(e.target.value as DayName)}
                    className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-brand-white"
                  >
                    {DAYS_ORDER.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-brand-white/60 uppercase font-bold block mb-1.5">Discipline</label>
                  <input
                    type="text"
                    value={colFormDiscipline}
                    onChange={(e) => setColFormDiscipline(e.target.value)}
                    className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-brand-white"
                  />
                </div>

                <div>
                  <label className="text-brand-white/60 uppercase font-bold block mb-1.5">Niveau</label>
                  <input
                    type="text"
                    value={colFormLevel}
                    onChange={(e) => setColFormLevel(e.target.value)}
                    className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-brand-white"
                  />
                </div>

                <div>
                  <label className="text-brand-white/60 uppercase font-bold block mb-1.5">Capacité</label>
                  <input
                    type="number"
                    value={colFormCapacity}
                    onChange={(e) => setColFormCapacity(Number(e.target.value))}
                    className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-brand-white"
                  />
                </div>

                <div>
                  <label className="text-brand-white/60 uppercase font-bold block mb-1.5">Heure début</label>
                  <input
                    type="time"
                    value={colFormStart}
                    onChange={(e) => setColFormStart(e.target.value)}
                    className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-brand-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-brand-white/60 uppercase font-bold block mb-1.5">Heure fin</label>
                  <input
                    type="time"
                    value={colFormEnd}
                    onChange={(e) => setColFormEnd(e.target.value)}
                    className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-brand-white font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setIsAddColModalOpen(false)}
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white/70 font-heading font-bold text-xs uppercase rounded-xl transition-all cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  onClick={handleAddCollectiveSession}
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-[#00d8ff] hover:bg-brand-white text-black font-heading font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg shadow-[#00d8ff]/20 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  <span>Ajouter au planning</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MODAL : MODIFIER UNE SÉANCE SMALL GROUP
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatePresence>
        {editingSgSession && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingSgSession(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-[#0f172a] border border-[#00d8ff]/30 rounded-2xl p-6 sm:p-8 shadow-2xl z-10 space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-brand-white/10">
                <h3 className="text-lg font-heading font-black uppercase tracking-wider text-brand-white">
                  Modifier la séance Small Group
                </h3>
                <button onClick={() => setEditingSgSession(null)} className="text-brand-white/50 hover:text-brand-white">
                  <X size={18} />
                </button>
              </div>

              {/* Choix de la portée de modification : Récurrent vs Ponctuel */}
              <div className="bg-[#0b1b33]/60 border border-[#00d8ff]/20 rounded-xl p-3 space-y-2">
                <span className="text-[11px] font-heading font-bold uppercase tracking-wider text-[#00d8ff] block">
                  Portée de la modification :
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label
                    className={cn(
                      "flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all",
                      editScope === "recurring"
                        ? "bg-[#00d8ff]/15 border-[#00d8ff] text-brand-white font-bold"
                        : "bg-black/30 border-brand-white/10 text-brand-white/60 hover:border-brand-white/20"
                    )}
                  >
                    <input
                      type="radio"
                      name="sgEditScope"
                      checked={editScope === "recurring"}
                      onChange={() => setEditScope("recurring")}
                      className="accent-[#00d8ff]"
                    />
                    <span>Semaine type (Récurrent)</span>
                  </label>

                  <label
                    className={cn(
                      "flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all",
                      editScope === "single"
                        ? "bg-[#00d8ff]/15 border-[#00d8ff] text-brand-white font-bold"
                        : "bg-black/30 border-brand-white/10 text-brand-white/60 hover:border-brand-white/20"
                    )}
                  >
                    <input
                      type="radio"
                      name="sgEditScope"
                      checked={editScope === "single"}
                      onChange={() => setEditScope("single")}
                      className="accent-[#00d8ff]"
                    />
                    <span>Cette séance uniquement</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="text-brand-white/60 uppercase font-bold block mb-1.5">Jour</label>
                  <select
                    value={editingSgSession.day}
                    onChange={(e) => setEditingSgSession({ ...editingSgSession, day: e.target.value as DayName })}
                    className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-brand-white"
                  >
                    {DAYS_ORDER.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-brand-white/60 uppercase font-bold block mb-1.5">Discipline</label>
                  <select
                    value={editingSgSession.discipline}
                    onChange={(e) => setEditingSgSession({ ...editingSgSession, discipline: e.target.value })}
                    className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-brand-white"
                  >
                    <option value="Boxing Bag">Boxing Bag</option>
                    <option value="Boxing">Boxing</option>
                    <option value="Boxing Shred">Boxing Shred</option>
                    <option value="Kick Boxing">Kick Boxing</option>
                    <option value="Lady Striking">Lady Striking</option>
                    <option value="Striking">Striking</option>
                    <option value="Boxe Thaï">Boxe Thaï</option>
                  </select>
                </div>

                <div>
                  <label className="text-brand-white/60 uppercase font-bold block mb-1.5">Niveau / Type</label>
                  <select
                    value={editingSgSession.level}
                    onChange={(e) => setEditingSgSession({ ...editingSgSession, level: e.target.value as LevelCategory })}
                    className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-brand-white"
                  >
                    <option value="Fondamentaux">Fondamentaux (Vert)</option>
                    <option value="Performance">Performance (Bleu)</option>
                    <option value="Élite">Élite (Rouge)</option>
                    <option value="Cardio">Cardio (Orange)</option>
                    <option value="Cours féminin">Cours féminin (Rose)</option>
                  </select>
                </div>

                <div>
                  <label className="text-brand-white/60 uppercase font-bold block mb-1.5">Capacité max</label>
                  <input
                    type="number"
                    value={editingSgSession.maxCapacity}
                    onChange={(e) => setEditingSgSession({ ...editingSgSession, maxCapacity: Number(e.target.value) })}
                    className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-brand-white"
                  />
                </div>

                <div>
                  <label className="text-brand-white/60 uppercase font-bold block mb-1.5">Heure de début</label>
                  <input
                    type="time"
                    value={editingSgSession.startTime}
                    onChange={(e) => setEditingSgSession({ ...editingSgSession, startTime: e.target.value })}
                    className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-brand-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-brand-white/60 uppercase font-bold block mb-1.5">Heure de fin</label>
                  <input
                    type="time"
                    value={editingSgSession.endTime}
                    onChange={(e) => setEditingSgSession({ ...editingSgSession, endTime: e.target.value })}
                    className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-brand-white font-mono"
                  />
                </div>

                <div className="sm:col-span-2 flex items-center justify-between pt-2 border-t border-brand-white/10">
                  <span className="text-brand-white font-bold uppercase">Statut actif</span>
                  <input
                    type="checkbox"
                    checked={editingSgSession.isActive}
                    onChange={(e) => setEditingSgSession({ ...editingSgSession, isActive: e.target.checked })}
                    className="w-5 h-5 accent-[#00d8ff] rounded cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleDeleteSgSession(editingSgSession.id)}
                  disabled={isSubmitting}
                  className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl transition-all cursor-pointer"
                  title="Supprimer ce créneau"
                >
                  <Trash2 size={16} />
                </button>

                <div className="flex gap-2 flex-1 justify-end">
                  <button
                    onClick={() => setEditingSgSession(null)}
                    disabled={isSubmitting}
                    className="py-3 px-5 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white/70 font-heading font-bold text-xs uppercase rounded-xl transition-all cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => handleSaveEditSgSession(false)}
                    disabled={isSubmitting}
                    className="py-3 px-6 bg-[#00d8ff] hover:bg-brand-white text-black font-heading font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg shadow-[#00d8ff]/20 flex items-center gap-2"
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

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MODAL : MODIFIER UN COURS COLLECTIF
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatePresence>
        {editingCollectiveSession && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingCollectiveSession(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-[#0f172a] border border-[#00d8ff]/30 rounded-2xl p-6 sm:p-8 shadow-2xl z-10 space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-brand-white/10">
                <h3 className="text-lg font-heading font-black uppercase tracking-wider text-brand-white">
                  Modifier le cours collectif
                </h3>
                <button onClick={() => setEditingCollectiveSession(null)} className="text-brand-white/50 hover:text-brand-white">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="text-brand-white/60 uppercase font-bold block mb-1.5">Jour</label>
                  <select
                    value={editingCollectiveSession.day}
                    onChange={(e) => setEditingCollectiveSession({ ...editingCollectiveSession, day: e.target.value as DayName })}
                    className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-brand-white"
                  >
                    {DAYS_ORDER.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-brand-white/60 uppercase font-bold block mb-1.5">Discipline</label>
                  <input
                    type="text"
                    value={editingCollectiveSession.discipline}
                    onChange={(e) => setEditingCollectiveSession({ ...editingCollectiveSession, discipline: e.target.value })}
                    className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-brand-white"
                  />
                </div>

                <div>
                  <label className="text-brand-white/60 uppercase font-bold block mb-1.5">Niveau</label>
                  <input
                    type="text"
                    value={editingCollectiveSession.level}
                    onChange={(e) => setEditingCollectiveSession({ ...editingCollectiveSession, level: e.target.value })}
                    className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-brand-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-brand-white/60 uppercase font-bold block mb-1.5">Heure début</label>
                    <input
                      type="time"
                      value={editingCollectiveSession.startTime}
                      onChange={(e) => setEditingCollectiveSession({ ...editingCollectiveSession, startTime: e.target.value })}
                      className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-brand-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-brand-white/60 uppercase font-bold block mb-1.5">Heure fin</label>
                    <input
                      type="time"
                      value={editingCollectiveSession.endTime}
                      onChange={(e) => setEditingCollectiveSession({ ...editingCollectiveSession, endTime: e.target.value })}
                      className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-brand-white font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-brand-white/10">
                  <span className="text-brand-white font-bold uppercase">Statut actif</span>
                  <input
                    type="checkbox"
                    checked={editingCollectiveSession.isActive}
                    onChange={(e) => setEditingCollectiveSession({ ...editingCollectiveSession, isActive: e.target.checked })}
                    className="w-5 h-5 accent-[#00d8ff] rounded cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleDeleteCollectiveSession(editingCollectiveSession.id)}
                  disabled={isSubmitting}
                  className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl transition-all cursor-pointer"
                  title="Supprimer ce cours collectif"
                >
                  <Trash2 size={16} />
                </button>

                <div className="flex gap-2 flex-1 justify-end">
                  <button
                    onClick={() => setEditingCollectiveSession(null)}
                    disabled={isSubmitting}
                    className="py-3 px-5 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white/70 font-heading font-bold text-xs uppercase rounded-xl transition-all cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSaveEditCollectiveSession}
                    disabled={isSubmitting}
                    className="py-3 px-6 bg-[#00d8ff] hover:bg-brand-white text-black font-heading font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg shadow-[#00d8ff]/20 flex items-center gap-2"
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
