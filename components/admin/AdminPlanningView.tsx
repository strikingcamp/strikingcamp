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
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  day: DayName;
  startTime: string;
  endTime: string;
  discipline: string;
  level: LevelCategory;
  maxCapacity: number;
  isActive: boolean;
}

interface CollectiveSessionItem {
  id: string;
  day: DayName;
  startTime: string;
  endTime: string;
  discipline: string;
  level: string;
  isActive: boolean;
}

const DAYS_ORDER: DayName[] = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. PLANNING OFFICIEL SMALL GROUP (23 SÉANCES)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const INITIAL_SMALL_GROUP_SESSIONS: SmallGroupSessionItem[] = [
  // LUNDI (3 cours)
  { id: "sg_1", day: "Lundi", startTime: "07:00", endTime: "07:50", discipline: "Boxing Bag", level: "Fondamentaux", maxCapacity: 20, isActive: true },
  { id: "sg_2", day: "Lundi", startTime: "11:00", endTime: "11:50", discipline: "Boxing", level: "Fondamentaux", maxCapacity: 20, isActive: true },
  { id: "sg_3", day: "Lundi", startTime: "12:15", endTime: "13:05", discipline: "Boxing Shred", level: "Performance", maxCapacity: 20, isActive: true },

  // MARDI (4 cours)
  { id: "sg_4", day: "Mardi", startTime: "11:00", endTime: "11:50", discipline: "Boxing Shred", level: "Cardio", maxCapacity: 20, isActive: true },
  { id: "sg_5", day: "Mardi", startTime: "12:15", endTime: "13:05", discipline: "Boxing Bag", level: "Cardio", maxCapacity: 20, isActive: true },
  { id: "sg_6", day: "Mardi", startTime: "17:00", endTime: "17:50", discipline: "Lady Striking", level: "Cours féminin", maxCapacity: 20, isActive: true },
  { id: "sg_7", day: "Mardi", startTime: "18:00", endTime: "18:50", discipline: "Kick Boxing", level: "Fondamentaux", maxCapacity: 20, isActive: true },

  // MERCREDI (6 cours)
  { id: "sg_8", day: "Mercredi", startTime: "07:00", endTime: "07:50", discipline: "Boxing Bag", level: "Performance", maxCapacity: 20, isActive: true },
  { id: "sg_9", day: "Mercredi", startTime: "11:00", endTime: "11:50", discipline: "Kick Boxing", level: "Fondamentaux", maxCapacity: 20, isActive: true },
  { id: "sg_10", day: "Mercredi", startTime: "12:15", endTime: "13:05", discipline: "Boxing Shred", level: "Performance", maxCapacity: 20, isActive: true },
  { id: "sg_11", day: "Mercredi", startTime: "17:30", endTime: "18:20", discipline: "Striking", level: "Performance", maxCapacity: 20, isActive: true },
  { id: "sg_12", day: "Mercredi", startTime: "19:30", endTime: "20:20", discipline: "Boxe Thaï", level: "Fondamentaux", maxCapacity: 20, isActive: true },
  { id: "sg_13", day: "Mercredi", startTime: "20:30", endTime: "21:20", discipline: "Kick Boxing", level: "Performance", maxCapacity: 20, isActive: true },

  // JEUDI (5 cours)
  { id: "sg_14", day: "Jeudi", startTime: "11:00", endTime: "11:50", discipline: "Boxing Shred", level: "Performance", maxCapacity: 20, isActive: true },
  { id: "sg_15", day: "Jeudi", startTime: "12:15", endTime: "13:05", discipline: "Striking", level: "Performance", maxCapacity: 20, isActive: true },
  { id: "sg_16", day: "Jeudi", startTime: "17:30", endTime: "18:20", discipline: "Lady Striking", level: "Cours féminin", maxCapacity: 20, isActive: true },
  { id: "sg_17", day: "Jeudi", startTime: "19:30", endTime: "20:20", discipline: "Kick Boxing", level: "Fondamentaux", maxCapacity: 20, isActive: true },
  { id: "sg_18", day: "Jeudi", startTime: "20:30", endTime: "21:20", discipline: "Boxe Thaï", level: "Élite", maxCapacity: 20, isActive: true },

  // VENDREDI (3 cours)
  { id: "sg_19", day: "Vendredi", startTime: "07:00", endTime: "07:50", discipline: "Boxing Bag", level: "Fondamentaux", maxCapacity: 20, isActive: true },
  { id: "sg_20", day: "Vendredi", startTime: "17:00", endTime: "17:50", discipline: "Boxe Thaï", level: "Fondamentaux", maxCapacity: 20, isActive: true },
  { id: "sg_21", day: "Vendredi", startTime: "19:30", endTime: "20:20", discipline: "Striking", level: "Performance", maxCapacity: 20, isActive: true },

  // SAMEDI (2 cours)
  { id: "sg_22", day: "Samedi", startTime: "11:00", endTime: "11:50", discipline: "Kick Boxing", level: "Élite", maxCapacity: 20, isActive: true },
  { id: "sg_23", day: "Samedi", startTime: "12:00", endTime: "12:50", discipline: "Lady Striking", level: "Élite", maxCapacity: 20, isActive: true },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. PLANNING OFFICIEL COLLECTIFS (3 SÉANCES)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const INITIAL_COLLECTIVE_SESSIONS: CollectiveSessionItem[] = [
  { id: "col_1", day: "Mardi", startTime: "18:00", endTime: "19:00", discipline: "Kick Boxing", level: "Tous niveaux (Accès libre)", isActive: true },
  { id: "col_2", day: "Vendredi", startTime: "18:00", endTime: "19:00", discipline: "Kick Boxing", level: "Tous niveaux (Accès libre)", isActive: true },
  { id: "col_3", day: "Samedi", startTime: "10:00", endTime: "11:00", discipline: "Kick Boxing", level: "Tous niveaux (Accès libre)", isActive: true },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPER COULEURS DES BADGES DE NIVEAU
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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
  initialSessions?: any[];
}

export default function AdminPlanningView({ initialSessions }: AdminPlanningViewProps = {}) {
  const [activeTab, setActiveTab] = useState<AdminTab>("Cours privés");

  // 1. État Cours Privés
  const [privateDays, setPrivateDays] = useState<Record<DayName, boolean>>(INITIAL_PRIVATE_DAYS);
  const [privateSlots, setPrivateSlots] = useState<PrivateSlotConfig[]>(INITIAL_PRIVATE_SLOTS);
  const [privateDisciplines, setPrivateDisciplines] = useState(PRIVATE_DISCIPLINES);

  // 2. État Small Group
  const [smallGroupSessions, setSmallGroupSessions] = useState<SmallGroupSessionItem[]>(INITIAL_SMALL_GROUP_SESSIONS);

  // 3. État Collectifs
  const [collectiveSessions, setCollectiveSessions] = useState<CollectiveSessionItem[]>(INITIAL_COLLECTIVE_SESSIONS);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // MODALS D'ÉDITION & AJOUT
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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

  // Modal Édition Collectifs
  const [editingCollectiveSession, setEditingCollectiveSession] = useState<CollectiveSessionItem | null>(null);

  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // Actions Cours Privés
  const togglePrivateDay = (day: DayName) => {
    setPrivateDays(prev => ({ ...prev, [day]: !prev[day] }));
    showNotification(`Disponibilité ${day} mise à jour.`);
  };

  const togglePrivateSlot = (id: string) => {
    setPrivateSlots(prev => prev.map(s => s.id === id ? { ...s, isActive: !s.isActive } : s));
    showNotification("Créneau privé mis à jour.");
  };

  const handleAddExceptionalSlot = () => {
    const newId = `priv_exp_${Date.now()}`;
    setPrivateSlots(prev => [
      ...prev,
      { id: newId, start: newSlotStart, end: newSlotEnd, durationMin: 50, isActive: true },
    ]);
    setIsAddSlotModalOpen(false);
    showNotification(`Créneau exceptionnel (${newSlotStart} → ${newSlotEnd}) ajouté.`);
  };

  const handleSaveEditPrivateSlot = () => {
    if (!editingPrivateSlot) return;
    setPrivateSlots(prev => prev.map(s => s.id === editingPrivateSlot.id ? editingPrivateSlot : s));
    setEditingPrivateSlot(null);
    showNotification("Créneau privé modifié avec succès.");
  };

  // Actions Small Group
  const toggleSgSession = (id: string) => {
    setSmallGroupSessions(prev => prev.map(s => s.id === id ? { ...s, isActive: !s.isActive } : s));
    showNotification("Statut de la séance Small Group mis à jour.");
  };

  const handleAddSgSession = () => {
    const newId = `sg_${Date.now()}`;
    setSmallGroupSessions(prev => [
      ...prev,
      {
        id: newId,
        day: sgFormDay,
        startTime: sgFormStart,
        endTime: sgFormEnd,
        discipline: sgFormDiscipline,
        level: sgFormLevel,
        maxCapacity: sgFormCapacity,
        isActive: true,
      },
    ]);
    setIsAddSgModalOpen(false);
    showNotification(`Séance ${sgFormDiscipline} (${sgFormDay}) ajoutée.`);
  };

  const handleSaveEditSgSession = () => {
    if (!editingSgSession) return;
    setSmallGroupSessions(prev => prev.map(s => s.id === editingSgSession.id ? editingSgSession : s));
    setEditingSgSession(null);
    showNotification(`Séance ${editingSgSession.discipline} modifiée avec succès.`);
  };

  // Actions Collectifs
  const toggleCollectiveSession = (id: string) => {
    setCollectiveSessions(prev => prev.map(s => s.id === id ? { ...s, isActive: !s.isActive } : s));
    showNotification("Statut du cours collectif mis à jour.");
  };

  const handleSaveEditCollectiveSession = () => {
    if (!editingCollectiveSession) return;
    setCollectiveSessions(prev => prev.map(s => s.id === editingCollectiveSession.id ? editingCollectiveSession : s));
    setEditingCollectiveSession(null);
    showNotification("Cours collectif modifié avec succès.");
  };

  // Groupement Small Group par jour
  const sgByDay = useMemo(() => {
    const map: Record<DayName, SmallGroupSessionItem[]> = {
      Lundi: [], Mardi: [], Mercredi: [], Jeudi: [], Vendredi: [], Samedi: [],
    };
    smallGroupSessions.forEach(s => {
      if (map[s.day]) map[s.day].push(s);
    });
    DAYS_ORDER.forEach(d => {
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
            Gérez les cours privés, Small Group et collectifs, leurs créneaux, disciplines et niveaux.
          </p>
        </div>
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-6 right-6 z-50 bg-[#0f172a] border border-[#00d8ff] text-[#00d8ff] px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-heading font-bold uppercase"
          >
            <CheckCircle size={16} />
            <span>{notification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          LES 3 ONGLETS STRICTS (SANS NOMBRES)
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
          ONGLET 1 : COURS PRIVÉS (CONFIGURATION GLOBALE DES DISPONIBILITÉS)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {activeTab === "Cours privés" && (
        <div className="space-y-8">
          
          {/* 1.1 JOURS DISPONIBLES */}
          <div className="bg-[#0f172a] border border-brand-white/10 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-brand-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <Calendar size={18} className="text-[#00d8ff]" />
                <h2 className="text-lg font-heading font-black uppercase tracking-wider text-brand-white">
                  Jours d&apos;ouverture des cours privés
                </h2>
              </div>
              <span className="text-xs text-brand-white/40 font-semibold">
                Du Lundi au Samedi
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
              {DAYS_ORDER.map(day => {
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
                    <span className={cn(
                      "text-[10px] font-black uppercase px-2 py-0.5 rounded",
                      isActive ? "bg-[#00d8ff] text-black" : "bg-zinc-800 text-zinc-500"
                    )}>
                      {isActive ? "Disponible" : "Fermé"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 1.2 CRÉNEAUX OFFICIELS & MODIFICATION */}
          <div className="bg-[#0f172a] border border-brand-white/10 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <Clock size={18} className="text-[#00d8ff]" />
                <div>
                  <h2 className="text-lg font-heading font-black uppercase tracking-wider text-brand-white">
                    Créneaux horaires standards (6 par jour)
                  </h2>
                  <p className="text-xs text-brand-white/50">
                    Durée standard : 50 min · Capacité : 1 membre par séance
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsAddSlotModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand-white/10 hover:bg-brand-white/20 text-brand-white border border-brand-white/20 rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                <Plus size={15} className="text-[#00d8ff]" />
                Ajouter un créneau exceptionnel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {privateSlots.map((slot, idx) => (
                <div
                  key={slot.id}
                  className={cn(
                    "p-4 rounded-xl border flex items-center justify-between gap-3 transition-all",
                    slot.isActive
                      ? "bg-[#0b1b33]/40 border-[#00d8ff]/30 shadow-md shadow-black/20"
                      : "bg-zinc-900/60 border-zinc-800 opacity-60"
                  )}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#00d8ff]/20 text-[#00d8ff] flex items-center justify-center text-[10px] font-black">
                        {idx + 1}
                      </span>
                      <span className="text-base font-heading font-black text-brand-white">
                        {slot.start} → {slot.end}
                      </span>
                    </div>
                    <div className="text-xs text-brand-white/50">
                      {slot.durationMin} min · 1 participant
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Bouton Modifier */}
                    <button
                      onClick={() => setEditingPrivateSlot(slot)}
                      className="p-2 rounded-lg bg-brand-white/5 hover:bg-brand-white/15 text-brand-white/80 hover:text-brand-white border border-brand-white/10 transition-colors cursor-pointer"
                      title="Modifier ce créneau"
                    >
                      <Edit2 size={13} />
                    </button>

                    {/* Bouton Toggle Actif/Inactif */}
                    <button
                      onClick={() => togglePrivateSlot(slot.id)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[10px] font-heading font-black uppercase tracking-wider transition-all cursor-pointer",
                        slot.isActive
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30"
                          : "bg-zinc-800 text-zinc-500 border border-zinc-700 hover:bg-zinc-700"
                      )}
                    >
                      {slot.isActive ? "Actif" : "Désactivé"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 1.3 DISCIPLINES & NIVEAUX SPÉCIFIQUES COURS PRIVÉS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Disciplines proposées */}
            <div className="bg-[#0f172a] border border-brand-white/10 rounded-2xl p-6 space-y-4 shadow-xl">
              <div className="flex items-center gap-2.5 border-b border-brand-white/10 pb-3">
                <Flame size={18} className="text-[#00d8ff]" />
                <h2 className="text-lg font-heading font-black uppercase tracking-wider text-brand-white">
                  Disciplines proposées
                </h2>
              </div>

              <div className="space-y-2.5">
                {privateDisciplines.map(d => {
                  const Icon = d.icon;
                  return (
                    <div
                      key={d.name}
                      className="p-3.5 bg-black/30 border border-brand-white/5 rounded-xl flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#00d8ff]/10 text-[#00d8ff] flex items-center justify-center shrink-0">
                          <Icon size={16} />
                        </div>
                        <div>
                          <div className="text-xs font-heading font-bold uppercase text-brand-white">{d.name}</div>
                          <div className="text-[10px] text-brand-white/50">{d.desc}</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                        Active
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Niveaux spécifiques cours privés */}
            <div className="bg-[#0f172a] border border-brand-white/10 rounded-2xl p-6 space-y-4 shadow-xl">
              <div className="flex items-center gap-2.5 border-b border-brand-white/10 pb-3">
                <Layers size={18} className="text-[#00d8ff]" />
                <h2 className="text-lg font-heading font-black uppercase tracking-wider text-brand-white">
                  Niveaux disponibles (Cours Privés)
                </h2>
              </div>

              <div className="space-y-2.5">
                {PRIVATE_LEVELS.map(l => (
                  <div
                    key={l.name}
                    className="p-3.5 bg-black/30 border border-brand-white/5 rounded-xl flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-xs font-heading font-bold uppercase text-[#00d8ff]">{l.name}</div>
                      <div className="text-[10px] text-brand-white/50 mt-0.5">{l.desc}</div>
                    </div>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-brand-white/10 text-brand-white/70 shrink-0">
                      Standard
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          ONGLET 2 : SMALL GROUP (23 SÉANCES OFFICIELLES)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {activeTab === "Small Group" && (
        <div className="space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0b1b33]/40 border border-[#00d8ff]/20 rounded-2xl p-4">
            <div className="flex items-center gap-2.5 text-xs text-[#00d8ff]">
              <Users size={18} className="shrink-0" />
              <span>
                <strong>Planning officiel Small Group :</strong> 23 séances hebdomadaires configurées · Capacité par défaut : <strong>20 participants max</strong>.
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
            {DAYS_ORDER.map(day => {
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
                    {daySessions.map(session => (
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
                            
                            {/* Badge de Niveau avec couleur stricte demandée */}
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
                          {/* Bouton Modifier */}
                          <button
                            onClick={() => setEditingSgSession(session)}
                            className="p-2 rounded-lg bg-brand-white/5 hover:bg-brand-white/15 text-brand-white/80 hover:text-brand-white border border-brand-white/10 transition-colors cursor-pointer"
                            title="Modifier cette séance"
                          >
                            <Edit2 size={14} />
                          </button>

                          {/* Bouton Toggle Actif/Inactif */}
                          <button
                            onClick={() => toggleSgSession(session.id)}
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
          ONGLET 3 : COLLECTIFS (3 COURS OFFICIELS)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {activeTab === "Collectifs" && (
        <div className="space-y-6">
          
          <div className="bg-[#0f172a] border border-brand-white/10 rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-heading font-bold uppercase text-[#00d8ff]">
              <Info size={16} />
              <span>Règle des cours collectifs</span>
            </div>
            <p className="text-xs text-brand-white/70 leading-relaxed">
              Les cours collectifs sont affichés dans l&apos;espace membre en <strong>« Accès libre sans réservation »</strong>. Aucun système ni bouton de réservation n&apos;est affiché aux membres.
            </p>
          </div>

          <div className="bg-[#0f172a] border border-brand-white/10 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-brand-white/10 pb-3">
              <h2 className="text-lg font-heading font-black uppercase tracking-wider text-brand-white">
                Planning officiel des cours collectifs (3 séances / semaine)
              </h2>
            </div>

            <div className="space-y-3">
              {collectiveSessions.map(session => (
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
                      <span className="text-brand-white/40">• 60 min · Collectif</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 justify-end">
                    {/* Bouton Modifier */}
                    <button
                      onClick={() => setEditingCollectiveSession(session)}
                      className="p-2 rounded-lg bg-brand-white/5 hover:bg-brand-white/15 text-brand-white/80 hover:text-brand-white border border-brand-white/10 transition-colors cursor-pointer"
                      title="Modifier ce cours collectif"
                    >
                      <Edit2 size={14} />
                    </button>

                    <button
                      onClick={() => toggleCollectiveSession(session.id)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-heading font-black uppercase tracking-wider transition-all cursor-pointer shrink-0",
                        session.isActive
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-zinc-800 text-zinc-500 border border-zinc-700"
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
          MODAL 1 : AJOUT CRÉNEAU EXCEPTIONNEL COURS PRIVÉ
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatePresence>
        {isAddSlotModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsAddSlotModalOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-[#0f172a] border border-[#00d8ff]/30 rounded-2xl p-6 sm:p-8 shadow-2xl z-10 space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-brand-white/10">
                <h3 className="text-lg font-heading font-black uppercase tracking-wider text-brand-white">
                  Ajouter un créneau privé exceptionnel
                </h3>
                <button onClick={() => setIsAddSlotModalOpen(false)} className="text-brand-white/50 hover:text-brand-white">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="text-brand-white/60 uppercase font-bold block mb-1.5">Heure de début</label>
                  <input
                    type="time"
                    value={newSlotStart}
                    onChange={(e) => setNewSlotStart(e.target.value)}
                    className="w-full bg-brand-white/5 border border-brand-white/10 rounded-xl p-3 text-brand-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-brand-white/60 uppercase font-bold block mb-1.5">Heure de fin</label>
                  <input
                    type="time"
                    value={newSlotEnd}
                    onChange={(e) => setNewSlotEnd(e.target.value)}
                    className="w-full bg-brand-white/5 border border-brand-white/10 rounded-xl p-3 text-brand-white font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setIsAddSlotModalOpen(false)}
                  className="flex-1 py-3 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white/70 font-heading font-bold text-xs uppercase rounded-xl transition-all cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  onClick={handleAddExceptionalSlot}
                  className="flex-1 py-3 bg-[#00d8ff] hover:bg-brand-white text-black font-heading font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg shadow-[#00d8ff]/20"
                >
                  Ajouter le créneau
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MODAL 2 : MODIFIER UN CRÉNEAU PRIVÉ
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatePresence>
        {editingPrivateSlot && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setEditingPrivateSlot(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-[#0f172a] border border-[#00d8ff]/30 rounded-2xl p-6 sm:p-8 shadow-2xl z-10 space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-brand-white/10">
                <h3 className="text-lg font-heading font-black uppercase tracking-wider text-brand-white">
                  Modifier le créneau privé
                </h3>
                <button onClick={() => setEditingPrivateSlot(null)} className="text-brand-white/50 hover:text-brand-white">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="text-brand-white/60 uppercase font-bold block mb-1.5">Heure de début</label>
                  <input
                    type="time"
                    value={editingPrivateSlot.start}
                    onChange={(e) => setEditingPrivateSlot({ ...editingPrivateSlot, start: e.target.value })}
                    className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-brand-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-brand-white/60 uppercase font-bold block mb-1.5">Heure de fin</label>
                  <input
                    type="time"
                    value={editingPrivateSlot.end}
                    onChange={(e) => setEditingPrivateSlot({ ...editingPrivateSlot, end: e.target.value })}
                    className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-brand-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-brand-white/60 uppercase font-bold block mb-1.5">Durée (minutes)</label>
                  <input
                    type="number"
                    value={editingPrivateSlot.durationMin}
                    onChange={(e) => setEditingPrivateSlot({ ...editingPrivateSlot, durationMin: Number(e.target.value) })}
                    className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-brand-white"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-brand-white/10">
                  <span className="text-brand-white font-bold uppercase">Statut actif</span>
                  <input
                    type="checkbox"
                    checked={editingPrivateSlot.isActive}
                    onChange={(e) => setEditingPrivateSlot({ ...editingPrivateSlot, isActive: e.target.checked })}
                    className="w-5 h-5 accent-[#00d8ff] rounded cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setEditingPrivateSlot(null)}
                  className="flex-1 py-3 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white/70 font-heading font-bold text-xs uppercase rounded-xl transition-all cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveEditPrivateSlot}
                  className="flex-1 py-3 bg-[#00d8ff] hover:bg-brand-white text-black font-heading font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg shadow-[#00d8ff]/20"
                >
                  Enregistrer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MODAL 3 : AJOUT SÉANCE SMALL GROUP
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatePresence>
        {isAddSgModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsAddSgModalOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
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
                    {DAYS_ORDER.map(d => <option key={d} value={d}>{d}</option>)}
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
                  className="flex-1 py-3 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white/70 font-heading font-bold text-xs uppercase rounded-xl transition-all cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  onClick={handleAddSgSession}
                  className="flex-1 py-3 bg-[#00d8ff] hover:bg-brand-white text-black font-heading font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg shadow-[#00d8ff]/20"
                >
                  Ajouter au planning
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MODAL 4 : MODIFIER UNE SÉANCE SMALL GROUP
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatePresence>
        {editingSgSession && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setEditingSgSession(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="text-brand-white/60 uppercase font-bold block mb-1.5">Jour</label>
                  <select
                    value={editingSgSession.day}
                    onChange={(e) => setEditingSgSession({ ...editingSgSession, day: e.target.value as DayName })}
                    className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-brand-white"
                  >
                    {DAYS_ORDER.map(d => <option key={d} value={d}>{d}</option>)}
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

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setEditingSgSession(null)}
                  className="flex-1 py-3 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white/70 font-heading font-bold text-xs uppercase rounded-xl transition-all cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveEditSgSession}
                  className="flex-1 py-3 bg-[#00d8ff] hover:bg-brand-white text-black font-heading font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg shadow-[#00d8ff]/20"
                >
                  Enregistrer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MODAL 5 : MODIFIER UN COURS COLLECTIF
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatePresence>
        {editingCollectiveSession && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setEditingCollectiveSession(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
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
                    {DAYS_ORDER.map(d => <option key={d} value={d}>{d}</option>)}
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
                  <label className="text-brand-white/60 uppercase font-bold block mb-1.5">Niveau / Type</label>
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

              <div className="flex gap-3">
                <button
                  onClick={() => setEditingCollectiveSession(null)}
                  className="flex-1 py-3 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white/70 font-heading font-bold text-xs uppercase rounded-xl transition-all cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveEditCollectiveSession}
                  className="flex-1 py-3 bg-[#00d8ff] hover:bg-brand-white text-black font-heading font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg shadow-[#00d8ff]/20"
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
