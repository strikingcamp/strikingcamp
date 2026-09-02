"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar as CalendarIcon,
  Users,
  Info,
  ShieldCheck,
  Check,
  Clock,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Award,
  AlertTriangle,
  X,
  CheckCircle2,
  Flame,
  Dumbbell,
  Target,
  PhoneCall,
  ShieldAlert,
  MessageCircle,
  Loader2,
  AlertCircle,
  Lock,
} from "lucide-react";
import { useMember, type BookingSlot } from "./MemberContext";
import type { ClassSession } from "@/lib/supabase/small-group";
import { cn } from "@/lib/utils";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

type Category = "Cours privés" | "Small Group" | "Collectifs";
type DayName = "Lundi" | "Mardi" | "Mercredi" | "Jeudi" | "Vendredi" | "Samedi";
type DayFilter = "Tous" | DayName;

interface DemoSlot {
  id: string;
  classSessionId?: string;
  bookingId?: string;
  category: Category;
  day: DayName;
  dateStr: string;
  startTime: string;
  endTime: string;
  discipline: string;
  level: string;
  maxCapacity: number;
  bookedCount: number;
  isOccupiedByOther?: boolean;
  isBookedByMe?: boolean;
  startsAtIso: string;
}

const DAYS_ORDER: DayName[] = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

const MONTH_NAMES_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. COURS PRIVÉS : CONFIGURATION STRICTE DU PARCOURS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const PRIVATE_DISCIPLINES = [
  { name: "Boxe Anglaise", desc: "Technique de poings, esquives, combinaisons et précision", icon: Flame },
  { name: "Kick Boxing", desc: "Pieds-poings, timing, enchaînements et déplacements", icon: Target },
  { name: "Striking", desc: "Percussion polyvalente, transitions et puissance", icon: Award },
  { name: "Boxing Bag", desc: "Travail intensif aux sacs de frappe, cardio et frappe lourde", icon: Dumbbell },
  { name: "KB Shred", desc: "Conditioning martial haute intensité et renforcement", icon: Sparkles },
];

const PRIVATE_LEVELS = [
  { name: "Débutant", desc: "Apprentissage des fondamentaux, garde, posture et coordination" },
  { name: "Intermédiaire", desc: "Perfectionnement technique, fluidité, vitesse et rythme" },
  { name: "Confirmé", desc: "Intensité combat, sparring guidé, précision et stratégie" },
];

const OFFICIAL_PRIVATE_HOURS = [
  { start: "08:00", end: "08:50" },
  { start: "09:00", end: "09:50" },
  { start: "10:00", end: "10:50" },
  { start: "14:00", end: "14:50" },
  { start: "15:00", end: "15:50" },
  { start: "16:00", end: "16:50" },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. SMALL GROUP : 23 SÉANCES OFFICIELLES PAR SEMAINE (FALLBACK)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const OFFICIAL_SMALL_GROUP: Omit<DemoSlot, "id" | "dateStr" | "startsAtIso" | "bookedCount" | "isOccupiedByOther" | "isBookedByMe">[] = [
  // LUNDI (3 cours)
  { category: "Small Group", day: "Lundi", startTime: "07:00", endTime: "07:50", discipline: "Boxing Bag", level: "Fondamentaux", maxCapacity: 20 },
  { category: "Small Group", day: "Lundi", startTime: "11:00", endTime: "11:50", discipline: "Boxing", level: "Fondamentaux", maxCapacity: 20 },
  { category: "Small Group", day: "Lundi", startTime: "12:15", endTime: "13:05", discipline: "Boxing Shred", level: "Performance", maxCapacity: 20 },

  // MARDI (4 cours)
  { category: "Small Group", day: "Mardi", startTime: "11:00", endTime: "11:50", discipline: "Boxing Shred", level: "Cardio", maxCapacity: 20 },
  { category: "Small Group", day: "Mardi", startTime: "12:15", endTime: "13:05", discipline: "Boxing Bag", level: "Cardio", maxCapacity: 20 },
  { category: "Small Group", day: "Mardi", startTime: "17:00", endTime: "17:50", discipline: "Lady Striking", level: "100% femme", maxCapacity: 20 },
  { category: "Small Group", day: "Mardi", startTime: "18:00", endTime: "18:50", discipline: "Kick Boxing", level: "Fondamentaux", maxCapacity: 20 },

  // MERCREDI (6 cours)
  { category: "Small Group", day: "Mercredi", startTime: "07:00", endTime: "07:50", discipline: "Boxing Bag", level: "Performance", maxCapacity: 20 },
  { category: "Small Group", day: "Mercredi", startTime: "11:00", endTime: "11:50", discipline: "Kick Boxing", level: "Fondamentaux", maxCapacity: 20 },
  { category: "Small Group", day: "Mercredi", startTime: "12:15", endTime: "13:05", discipline: "Boxing Shred", level: "Performance", maxCapacity: 20 },
  { category: "Small Group", day: "Mercredi", startTime: "17:30", endTime: "18:20", discipline: "Striking", level: "Performance", maxCapacity: 20 },
  { category: "Small Group", day: "Mercredi", startTime: "19:30", endTime: "20:20", discipline: "Boxe Thaï", level: "Fondamentaux", maxCapacity: 20 },
  { category: "Small Group", day: "Mercredi", startTime: "20:30", endTime: "21:20", discipline: "Kick Boxing", level: "Performance", maxCapacity: 20 },

  // JEUDI (5 cours)
  { category: "Small Group", day: "Jeudi", startTime: "11:00", endTime: "11:50", discipline: "Boxing Shred", level: "Performance", maxCapacity: 20 },
  { category: "Small Group", day: "Jeudi", startTime: "12:15", endTime: "13:05", discipline: "Striking", level: "Performance", maxCapacity: 20 },
  { category: "Small Group", day: "Jeudi", startTime: "17:30", endTime: "18:20", discipline: "Lady Striking", level: "Cours féminin", maxCapacity: 20 },
  { category: "Small Group", day: "Jeudi", startTime: "19:30", endTime: "20:20", discipline: "Kick Boxing", level: "Fondamentaux", maxCapacity: 20 },
  { category: "Small Group", day: "Jeudi", startTime: "20:30", endTime: "21:20", discipline: "Boxe Thaï", level: "Élite", maxCapacity: 20 },

  // VENDREDI (3 cours)
  { category: "Small Group", day: "Vendredi", startTime: "07:00", endTime: "07:50", discipline: "Boxing Bag", level: "Fondamentaux", maxCapacity: 20 },
  { category: "Small Group", day: "Vendredi", startTime: "17:00", endTime: "17:50", discipline: "Boxe Thaï", level: "Fondamentaux", maxCapacity: 20 },
  { category: "Small Group", day: "Vendredi", startTime: "19:30", endTime: "20:20", discipline: "Striking", level: "Performance", maxCapacity: 20 },

  // SAMEDI (2 cours - sans Boxing Bag)
  { category: "Small Group", day: "Samedi", startTime: "11:00", endTime: "11:50", discipline: "Kick Boxing", level: "Élite", maxCapacity: 20 },
  { category: "Small Group", day: "Samedi", startTime: "12:00", endTime: "12:50", discipline: "Lady Striking", level: "Élite", maxCapacity: 20 },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. COLLECTIFS : 3 SÉANCES STRICTES (AUCUN BOUTON RÉSERVER)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const OFFICIAL_COLLECTIVE: Omit<DemoSlot, "id" | "dateStr" | "startsAtIso" | "bookedCount" | "isOccupiedByOther" | "isBookedByMe">[] = [
  { category: "Collectifs", day: "Mardi", startTime: "18:00", endTime: "19:00", discipline: "Kick Boxing", level: "Tous niveaux (Accès libre)", maxCapacity: 35 },
  { category: "Collectifs", day: "Vendredi", startTime: "18:00", endTime: "19:00", discipline: "Kick Boxing", level: "Tous niveaux (Accès libre)", maxCapacity: 35 },
  { category: "Collectifs", day: "Samedi", startTime: "10:00", endTime: "11:00", discipline: "Kick Boxing", level: "Tous niveaux (Accès libre)", maxCapacity: 35 },
];

function getCurrentWeekMonday(): Date {
  const now = new Date();
  const day = now.getDay();
  // Dimanche = 0 (décalage de -6 jours), sinon (1 - day) jours pour atteindre Lundi
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday, 0, 0, 0, 0);
  return monday;
}

function getCurrentDayName(): DayName {
  const now = new Date();
  const dayIndex = now.getDay(); // 0 = Dimanche, 1 = Lundi, 2 = Mardi, 3 = Mercredi, 4 = Jeudi, 5 = Vendredi, 6 = Samedi
  const map: Record<number, DayName> = {
    1: "Lundi",
    2: "Mardi",
    3: "Mercredi",
    4: "Jeudi",
    5: "Vendredi",
    6: "Samedi",
    0: "Lundi", // Le dimanche, sélectionne le Lundi
  };
  return map[dayIndex] || "Lundi";
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GÉNÉRATEUR DES CRÉNEAUX CONNECTÉ À SUPABASE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function generateSlotsFromData(
  availableSessions: ClassSession[],
  userBookingsList: BookingSlot[],
  allConfirmedBookings: { class_session_id: string; user_id: string }[],
  currentUserId: string | null,
  mondayDate: Date,
  dayDateMap: Record<DayName, { dateNum: number; fullDateLabel: string; dateStr: string }>
): DemoSlot[] {
  console.log("[MemberPlanningView] generateSlotsFromData démarré :", {
    availableSessionsCount: availableSessions.length,
    userBookingsCount: userBookingsList.length,
    allConfirmedBookingsCount: allConfirmedBookings.length,
    currentUserId,
    mondayDateStr: dayDateMap["Lundi"]?.dateStr,
  });

  const defaultMondayStr = dayDateMap["Lundi"]?.dateStr || mondayDate.toISOString().slice(0, 10);
  const slots: DemoSlot[] = [];

  if (availableSessions && availableSessions.length > 0) {
    const mondayStr = dayDateMap["Lundi"]?.dateStr || defaultMondayStr;
    const saturdayStr = dayDateMap["Samedi"]?.dateStr || "";

    // Filtrer les sessions de la semaine demandée
    const weekSessions = availableSessions.filter((s) => {
      const sDateStr = s.starts_at.slice(0, 10);
      return sDateStr >= mondayStr && (!saturdayStr || sDateStr <= saturdayStr);
    });

    console.log(`[MemberPlanningView] ${weekSessions.length} séances trouvées pour la semaine ${mondayStr} -> ${saturdayStr}`);

    if (weekSessions.length > 0) {
      for (const s of weekSessions) {
        const sDateStr = s.starts_at.slice(0, 10);

        // Trouver le jour de la semaine correspondant à la date
        const matchedDay = DAYS_ORDER.find((d) => dayDateMap[d]?.dateStr === sDateStr);
        if (!matchedDay) continue;

        const dateInfo = dayDateMap[matchedDay];
        const dStr = dateInfo?.dateStr || sDateStr;

        const sDate = new Date(s.starts_at);
        const startHours = String(sDate.getHours()).padStart(2, "0");
        const startMins = String(sDate.getMinutes()).padStart(2, "0");
        const startTime = `${startHours}:${startMins}`;

        let endTime = "";
        if (s.ends_at) {
          const eDate = new Date(s.ends_at);
          const endHours = String(eDate.getHours()).padStart(2, "0");
          const endMins = String(eDate.getMinutes()).padStart(2, "0");
          endTime = `${endHours}:${endMins}`;
        } else {
          const eDate = new Date(sDate.getTime() + 50 * 60 * 1000);
          const endHours = String(eDate.getHours()).padStart(2, "0");
          const endMins = String(eDate.getMinutes()).padStart(2, "0");
          endTime = `${endHours}:${endMins}`;
        }

        const rawType = (s.type || "").toLowerCase().trim();
        const isPriv =
          rawType === "private" ||
          rawType === "prive" ||
          (s.discipline || "").toLowerCase().includes("privé") ||
          (s.discipline || "").toLowerCase().includes("prive");
        const isCol = rawType === "collective" || rawType === "collectif";
        const category: Category = isPriv ? "Cours privés" : isCol ? "Collectifs" : "Small Group";

        const maxCapacity = s.max_capacity ?? (isPriv ? 1 : isCol ? 35 : 20);

        // Nombre de réservations réelles confirmées
        const bookedCount = allConfirmedBookings.filter(
          (b) => b.class_session_id === s.id
        ).length;

        // Est-ce que l'utilisateur connecté est inscrit ?
        const userBookingMatch = userBookingsList.find(
          (b) => b.class_session_id === s.id || b.classSessionId === s.id || b.id === s.id
        );
        const isBookedByMe = Boolean(
          userBookingMatch ||
          (currentUserId &&
            allConfirmedBookings.some(
              (b) => b.class_session_id === s.id && b.user_id === currentUserId
            ))
        );

        const isOccupiedByOther = isPriv
          ? bookedCount >= 1 && !isBookedByMe
          : bookedCount >= maxCapacity && !isBookedByMe;

        slots.push({
          id: s.id,
          classSessionId: s.id,
          bookingId: userBookingMatch?.id,
          category,
          day: matchedDay,
          dateStr: dStr,
          startTime,
          endTime,
          discipline: s.discipline,
          level: s.level || (isPriv ? "Individuel (50 min)" : isCol ? "Tous niveaux (Accès libre)" : "Fondamentaux"),
          maxCapacity,
          bookedCount,
          isOccupiedByOther,
          isBookedByMe,
          startsAtIso: s.starts_at,
        });
      }

      // Compléter les créneaux de cours privés si non encore créés en DB
      const hasPrivate = slots.some((sl) => sl.category === "Cours privés");
      if (!hasPrivate) {
        for (const day of DAYS_ORDER) {
          const dStr = dayDateMap[day]?.dateStr || defaultMondayStr;
          OFFICIAL_PRIVATE_HOURS.forEach((h, idx) => {
            const isOcc = (day === "Mardi" && idx === 1) || (day === "Jeudi" && idx === 3) || (day === "Samedi" && idx === 4);
            const isMine = userBookingsList.some(
              (b) => b.sessionType === "Cours Privé" && b.day === day && b.time.startsWith(h.start)
            );

            slots.push({
              id: `priv_${day}_${idx}`,
              category: "Cours privés",
              day,
              dateStr: dStr,
              startTime: h.start,
              endTime: h.end,
              discipline: "Cours Privé",
              level: "Individuel (50 min)",
              maxCapacity: 1,
              bookedCount: isOcc || isMine ? 1 : 0,
              isOccupiedByOther: isOcc,
              isBookedByMe: isMine,
              startsAtIso: `${dStr}T${h.start}:00`,
            });
          });
        }
      }

      // Compléter les créneaux de cours collectifs récurrents pour toutes les semaines
      // Vérification unitaire de chaque créneau officiel (Mardi 18h, Vendredi 18h, Samedi 10h)
      OFFICIAL_COLLECTIVE.forEach((col, idx) => {
        const dStr = dayDateMap[col.day]?.dateStr || mondayStr;
        const alreadyExists = slots.some(
          (sl) =>
            sl.category === "Collectifs" &&
            sl.day === col.day &&
            sl.startTime === col.startTime
        );

        if (!alreadyExists) {
          slots.push({
            id: `col_${col.day}_${idx}_${dStr}`,
            ...col,
            dateStr: dStr,
            bookedCount: 0,
            isOccupiedByOther: false,
            isBookedByMe: false,
            startsAtIso: `${dStr}T${col.startTime}:00`,
          });
        }
      });

      console.log("[MemberPlanningView] Total slots générés depuis les class_sessions réelles :", slots.length);
      return slots;
    }
  }

  // Fallback initial en attendant le chargement
  console.warn("[MemberPlanningView] Fallback initial actif (attente des données Supabase)");
  for (const day of DAYS_ORDER) {
    const dStr = dayDateMap[day]?.dateStr || defaultMondayStr;
    OFFICIAL_PRIVATE_HOURS.forEach((h, idx) => {
      const isOcc = (day === "Mardi" && idx === 1) || (day === "Jeudi" && idx === 3) || (day === "Samedi" && idx === 4);
      const isMine = userBookingsList.some(
        (b) => b.sessionType === "Cours Privé" && b.day === day && b.time.startsWith(h.start)
      );

      slots.push({
        id: `priv_${day}_${idx}`,
        category: "Cours privés",
        day,
        dateStr: dStr,
        startTime: h.start,
        endTime: h.end,
        discipline: "Cours Privé",
        level: "Individuel (50 min)",
        maxCapacity: 1,
        bookedCount: isOcc || isMine ? 1 : 0,
        isOccupiedByOther: isOcc,
        isBookedByMe: isMine,
        startsAtIso: `${dStr}T${h.start}:00`,
      });
    });
  }

  OFFICIAL_SMALL_GROUP.forEach((sg, idx) => {
    const dStr = dayDateMap[sg.day]?.dateStr || defaultMondayStr;
    const isMine = userBookingsList.some(
      (b) => b.sessionType === "Small Group" && b.day === sg.day && b.time.startsWith(sg.startTime)
    );

    slots.push({
      id: `sg_${sg.day}_${idx}`,
      ...sg,
      dateStr: dStr,
      bookedCount: isMine ? 14 : 7 + (idx % 11),
      isOccupiedByOther: false,
      isBookedByMe: isMine,
      startsAtIso: `${dStr}T${sg.startTime}:00`,
    });
  });

  OFFICIAL_COLLECTIVE.forEach((col, idx) => {
    const dStr = dayDateMap[col.day]?.dateStr || defaultMondayStr;
    slots.push({
      id: `col_${col.day}_${idx}`,
      ...col,
      dateStr: dStr,
      bookedCount: 0,
      isOccupiedByOther: false,
      isBookedByMe: false,
      startsAtIso: `${dStr}T${col.startTime}:00`,
    });
  });

  return slots;
}

export default function MemberPlanningView() {
  const {
    currentUserId,
    userBookings,
    availableSessions,
    allConfirmedBookings,
    privateQuota,
    hasPrivateAccess,
    isSmallGroupEnabled,
    isPrivateEnabled,
    bookSmallGroup,
    cancelSmallGroup,
    bookSlot,
    cancelSlot,
    addSynchronizedBooking,
    removeSynchronizedBooking,
  } = useMember();

  // Onglets & Navigation
  const [activeCategory, setActiveCategory] = useState<Category>("Cours privés");
  const [activeDayFilter, setActiveDayFilter] = useState<DayFilter>("Tous");
  const [weekOffset, setWeekOffset] = useState<number>(0);

  // Synchronisation automatique de la catégorie active selon les services activés
  useEffect(() => {
    if (!isPrivateEnabled && activeCategory === "Cours privés") {
      setActiveCategory(isSmallGroupEnabled ? "Small Group" : "Collectifs");
    } else if (!isSmallGroupEnabled && activeCategory === "Small Group") {
      setActiveCategory(isPrivateEnabled ? "Cours privés" : "Collectifs");
    }
  }, [isPrivateEnabled, isSmallGroupEnabled, activeCategory]);

  // État du parcours en entonnoir pour Cours Privés
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>(PRIVATE_DISCIPLINES[0].name);
  const [selectedLevel, setSelectedLevel] = useState<string>(PRIVATE_LEVELS[0].name);
  const [selectedDayName, setSelectedDayName] = useState<DayName>(() => getCurrentDayName());
  const [selectedSlotForBooking, setSelectedSlotForBooking] = useState<DemoSlot | null>(null);

  // Modals d'annulation et alertes
  const [slotForCancel, setSlotForCancel] = useState<DemoSlot | null>(null);
  const [blockedLateSlot, setBlockedLateSlot] = useState<DemoSlot | null>(null);
  const [isPrivatePlanRequiredModalOpen, setIsPrivatePlanRequiredModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Quota partagé
  const remainingQuota = privateQuota?.sessionsRemaining ?? 6;
  const totalQuota = privateQuota?.quotaTotal ?? 8;

  // Dates de la semaine (calcul dynamique à partir de la date réelle du jour)
  const mondayDate = useMemo(() => {
    const d = getCurrentWeekMonday();
    d.setDate(d.getDate() + (weekOffset * 7));
    return d;
  }, [weekOffset]);

  const saturdayDate = useMemo(() => {
    const d = new Date(mondayDate);
    d.setDate(d.getDate() + 5);
    return d;
  }, [mondayDate]);

  const weekLabel = `${mondayDate.getDate()} ${MONTH_NAMES_FR[mondayDate.getMonth()]} – ${saturdayDate.getDate()} ${MONTH_NAMES_FR[saturdayDate.getMonth()]} ${saturdayDate.getFullYear()}`;

  // Calcul des dates par jour pour le calendrier
  const dayDateMap = useMemo(() => {
    const map: Record<DayName, { dateNum: number; fullDateLabel: string; dateStr: string }> = {
      Lundi: { dateNum: 0, fullDateLabel: "", dateStr: "" },
      Mardi: { dateNum: 0, fullDateLabel: "", dateStr: "" },
      Mercredi: { dateNum: 0, fullDateLabel: "", dateStr: "" },
      Jeudi: { dateNum: 0, fullDateLabel: "", dateStr: "" },
      Vendredi: { dateNum: 0, fullDateLabel: "", dateStr: "" },
      Samedi: { dateNum: 0, fullDateLabel: "", dateStr: "" },
    };

    DAYS_ORDER.forEach((day, idx) => {
      const d = new Date(mondayDate);
      d.setDate(d.getDate() + idx);
      const dateNum = d.getDate();
      const monthName = MONTH_NAMES_FR[d.getMonth()];
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(dateNum).padStart(2, "0");

      map[day] = {
        dateNum,
        fullDateLabel: `${day} ${dateNum} ${monthName}`,
        dateStr: `${yyyy}-${mm}-${dd}`,
      };
    });

    return map;
  }, [mondayDate]);

  // Génération dynamique des créneaux connectés à la base Supabase (filtrés selon les services activés)
  const slots = useMemo(() => {
    const rawSlots = generateSlotsFromData(
      availableSessions,
      userBookings,
      allConfirmedBookings,
      currentUserId,
      mondayDate,
      dayDateMap
    );
    return rawSlots.filter(s => {
      if (s.category === "Small Group" && !isSmallGroupEnabled) return false;
      if (s.category === "Cours privés" && !isPrivateEnabled) return false;
      return true;
    });
  }, [availableSessions, userBookings, allConfirmedBookings, currentUserId, mondayDate, dayDateMap, isSmallGroupEnabled, isPrivateEnabled]);

  // Créneaux privés pour le jour sélectionné (triés chronologiquement)
  const privateSlotsForSelectedDay = useMemo(() => {
    return slots
      .filter(s => s.category === "Cours privés" && s.day === selectedDayName)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [slots, selectedDayName]);

  // Groupement des séances Small Group & Collectifs par jour
  const weekSessionsByDay = useMemo(() => {
    const grouped: Record<DayName, DemoSlot[]> = {
      Lundi: [], Mardi: [], Mercredi: [], Jeudi: [], Vendredi: [], Samedi: [],
    };

    for (const s of slots) {
      if (s.category === activeCategory) {
        if (grouped[s.day]) {
          grouped[s.day].push(s);
        }
      }
    }

    for (const day of DAYS_ORDER) {
      grouped[day].sort((a, b) => a.startTime.localeCompare(b.startTime));
    }

    return grouped;
  }, [slots, activeCategory]);

  const activeDaysWithSessions = DAYS_ORDER.filter(day => weekSessionsByDay[day].length > 0);
  const daysToRender = activeDayFilter === "Tous" ? activeDaysWithSessions : [activeDayFilter as DayName];

  // Gestion du clic d'annulation (Règle stricte des 24 heures)
  const handleCancelClick = (session: DemoSlot) => {
    setBookingError(null);
    let isLessThan24Hours = false;
    if (session.startsAtIso) {
      const sessionStartTime = new Date(session.startsAtIso).getTime();
      isLessThan24Hours = sessionStartTime - Date.now() < 24 * 3600 * 1000;
    } else if (session.dateStr && session.startTime) {
      const sessionStartTime = new Date(`${session.dateStr}T${session.startTime}:00`).getTime();
      isLessThan24Hours = sessionStartTime - Date.now() < 24 * 3600 * 1000;
    }

    if (isLessThan24Hours) {
      setBlockedLateSlot(session);
    } else {
      setSlotForCancel(session);
    }
  };

  // Confirmation réservation (RPC Supabase pour Small Group)
  const handleConfirmBooking = async () => {
    if (!selectedSlotForBooking) return;

    console.log("[MemberPlanningView] --> Clic bouton « Confirmer la réservation » :", {
      slot: selectedSlotForBooking,
      classSessionId: selectedSlotForBooking.classSessionId,
      currentUserId,
    });

    setIsSubmitting(true);
    setBookingError(null);

    const isPriv = selectedSlotForBooking.category === "Cours privés";
    const discipline = isPriv ? selectedDiscipline : selectedSlotForBooking.discipline;
    const level = isPriv ? selectedLevel : selectedSlotForBooking.level;
    const day = selectedSlotForBooking.day;

    // 1. Réservation réelle Small Group via RPC Supabase
    if (!isPriv) {
      const targetSessionId = selectedSlotForBooking.classSessionId || selectedSlotForBooking.id;
      console.log("[MemberPlanningView] Cible Small Group : targetSessionId =", targetSessionId);

      if (!targetSessionId || !targetSessionId.includes("-")) {
        const errorMsg = "Impossible de réserver : cette séance ne possède pas d'identifiant Supabase valide (UUID). Veuillez rafraîchir le planning.";
        console.error("[MemberPlanningView]", errorMsg, selectedSlotForBooking);
        setBookingError(errorMsg);
        setIsSubmitting(false);
        return;
      }

      console.log("[MemberPlanningView] Appel de bookSmallGroup(targetSessionId)...");
      const result = await bookSmallGroup(targetSessionId);
      console.log("[MemberPlanningView] Résultat retourné par bookSmallGroup :", result);

      if (!result.success) {
        console.error("[MemberPlanningView] Échec réservation Small Group :", result.error);
        setBookingError(result.error || "Impossible de réserver ce cours Small Group.");
        setIsSubmitting(false);
        return;
      }
    } else {
      // 2. Réservation Cours Privé
      const sessionId = selectedSlotForBooking.classSessionId || selectedSlotForBooking.id;
      console.log("[MemberPlanningView] Réservation Cours Privé...", { sessionId, slot: selectedSlotForBooking });

      const result = await bookSlot({
        id: selectedSlotForBooking.id,
        classSessionId: sessionId,
        discipline,
        sessionType: "Cours Privé",
        day,
        time: `${selectedSlotForBooking.startTime} → ${selectedSlotForBooking.endTime}`,
        date: dayDateMap[day]?.fullDateLabel || "31 Août 2026",
        level,
      });

      console.log("[MemberPlanningView] Résultat réservation privée :", result);

      if (!result.success) {
        setBookingError(result.error || "Impossible de réserver ce cours privé.");
        setIsSubmitting(false);
        return;
      }
    }

    setIsSubmitting(false);
    setSuccessMessage(`Votre séance ${discipline} (${level}) du ${day} à ${selectedSlotForBooking.startTime} est confirmée.`);
    setSelectedSlotForBooking(null);
    setIsSuccessModalOpen(true);
  };

  // Confirmation annulation
  const handleConfirmCancel = async () => {
    if (!slotForCancel) return;

    setIsSubmitting(true);
    setBookingError(null);

    try {
      const match = userBookings.find(
        (b) =>
          (slotForCancel.classSessionId && b.class_session_id === slotForCancel.classSessionId) ||
          b.id === slotForCancel.id ||
          (b.day === slotForCancel.day && b.time.startsWith(slotForCancel.startTime))
      );

      const bookingIdToCancel = slotForCancel.bookingId || match?.id;

      if (bookingIdToCancel && bookingIdToCancel.includes("-")) {
        const res = await cancelSmallGroup(bookingIdToCancel);
        if (!res.success) {
          setBookingError(res.error || "Impossible d'annuler cette réservation.");
          setIsSubmitting(false);
          return;
        }
      } else if (bookingIdToCancel) {
        removeSynchronizedBooking(bookingIdToCancel, true);
      }

      setIsSubmitting(false);
      setSlotForCancel(null);
      setSuccessMessage("Réservation annulée avec succès. La place a été libérée et le planning a été mis à jour.");
      setIsSuccessModalOpen(true);
    } catch (err) {
      setBookingError((err as Error).message || "Erreur lors de l'annulation.");
      setIsSubmitting(false);
    }
  };

  // Lien WhatsApp prérempli pour contacter le coach
  const coachWhatsAppUrl = useMemo(() => {
    if (!blockedLateSlot) return "https://wa.me/33600000000";
    const msg = encodeURIComponent(
      `Bonjour coach, je souhaite modifier ou annuler ma séance de ${blockedLateSlot.discipline} (${blockedLateSlot.level}) programmée le ${blockedLateSlot.day} de ${blockedLateSlot.startTime} à ${blockedLateSlot.endTime}.`
    );
    return `https://wa.me/33600000000?text=${msg}`;
  }, [blockedLateSlot]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6 pt-2 pb-16">

      {/* Titre */}
      <div className="space-y-1">
        <h1 className="text-3xl sm:text-4xl font-heading font-black uppercase tracking-wider text-brand-white">
          Planning des cours
        </h1>
        <p className="text-xs sm:text-sm text-brand-white/50">
          Consultez les créneaux officiels et gérez vos réservations en direct.
        </p>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          ONGLETS DES CATÉGORIES ACTIVÉES
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className={cn(
        "bg-[#0f172a] p-1.5 rounded-2xl border border-brand-white/10 grid gap-1.5 shadow-xl shadow-black/30",
        (isPrivateEnabled && isSmallGroupEnabled) ? "grid-cols-3" :
        (isPrivateEnabled || isSmallGroupEnabled) ? "grid-cols-2" : "grid-cols-1"
      )}>
        {isPrivateEnabled && (
          <button
            onClick={() => setActiveCategory("Cours privés")}
            className={cn(
              "py-3.5 px-2 rounded-xl font-heading font-black text-xs sm:text-sm uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center gap-2",
              activeCategory === "Cours privés"
                ? "bg-[#00d8ff] text-black shadow-lg shadow-[#00d8ff]/20"
                : "text-brand-white/70 hover:text-brand-white hover:bg-brand-white/5"
            )}
          >
            <Sparkles size={16} />
            <span>Cours privés</span>
          </button>
        )}

        {isSmallGroupEnabled && (
          <button
            onClick={() => setActiveCategory("Small Group")}
            className={cn(
              "py-3.5 px-2 rounded-xl font-heading font-black text-xs sm:text-sm uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center gap-2",
              activeCategory === "Small Group"
                ? "bg-[#00d8ff] text-black shadow-lg shadow-[#00d8ff]/20"
                : "text-brand-white/70 hover:text-brand-white hover:bg-brand-white/5"
            )}
          >
            <Users size={16} />
            <span>Small Group</span>
          </button>
        )}

        <button
          onClick={() => setActiveCategory("Collectifs")}
          className={cn(
            "py-3.5 px-2 rounded-xl font-heading font-black text-xs sm:text-sm uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center gap-2",
            activeCategory === "Collectifs"
              ? "bg-[#00d8ff] text-black shadow-lg shadow-[#00d8ff]/20"
              : "text-brand-white/70 hover:text-brand-white hover:bg-brand-white/5"
          )}
        >
          <CalendarIcon size={16} />
          <span>Collectifs</span>
        </button>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          NAVIGATION SEMAINE
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="bg-[#0b1322] border border-brand-white/10 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between shadow-lg">
        <button
          onClick={() => setWeekOffset(prev => prev - 1)}
          className="p-2.5 rounded-xl bg-brand-white/5 hover:bg-brand-white/10 text-brand-white transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-heading font-bold uppercase"
        >
          <ChevronLeft size={16} />
          <span className="hidden sm:inline">Semaine précédente</span>
        </button>

        <div className="text-center">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#00d8ff] block">
            Semaine
          </span>
          <span className="text-sm sm:text-base font-heading font-bold uppercase tracking-wider text-brand-white">
            {weekLabel}
          </span>
        </div>

        <button
          onClick={() => setWeekOffset(prev => prev + 1)}
          className="p-2.5 rounded-xl bg-brand-white/5 hover:bg-brand-white/10 text-brand-white transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-heading font-bold uppercase"
        >
          <span className="hidden sm:inline">Semaine suivante</span>
          <ChevronRight size={16} />
        </button>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          SECTION 1 : COURS PRIVÉS (PARCOURS EN ENTONNOIR)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {activeCategory === "Cours privés" && (
        <div className="space-y-6">

          {/* En-tête Quota Bleu/Cyan Striking Camp */}
          <div className="bg-gradient-to-r from-[#0b1b33] to-[#0f172a] border border-[#00d8ff]/30 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-heading font-black uppercase tracking-wider text-brand-white">
                    COURS PRIVÉS
                  </h2>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[#00d8ff]/15 text-[#00d8ff] border border-[#00d8ff]/30">
                    Formule Active
                  </span>
                </div>
                <p className="text-sm font-heading font-bold text-[#00d8ff]">
                  {remainingQuota} / {totalQuota} séances restantes ce mois-ci
                </p>
                <p className="text-xs text-brand-white/60 font-medium">
                  Cycle : <strong>25 Août</strong> → <strong>25 Septembre</strong>
                </p>
              </div>

              <div className="text-xs text-brand-white/70 bg-black/40 px-3.5 py-2.5 rounded-xl border border-brand-white/10 flex items-center gap-2">
                <Clock size={15} className="text-[#00d8ff] shrink-0" />
                <span>Séance individuelle sur mesure · <strong>50 min</strong></span>
              </div>
            </div>

            {/* Capsules de quota Cyan */}
            <div className="pt-2 border-t border-[#00d8ff]/20">
              <div className="grid grid-cols-8 gap-1.5">
                {Array.from({ length: totalQuota }).map((_, i) => {
                  const isAvail = i < remainingQuota;
                  return (
                    <div
                      key={i}
                      className={cn(
                        "h-2.5 rounded-full transition-all duration-300",
                        isAvail
                          ? "bg-[#00d8ff] shadow-sm shadow-[#00d8ff]/50"
                          : "bg-zinc-800 border border-zinc-700"
                      )}
                      title={isAvail ? "Séance disponible" : "Séance consommée"}
                    />
                  );
                })}
              </div>
            </div>

            {/* Règle des 24h */}
            <div className="bg-black/40 rounded-xl p-3 text-xs text-[#00d8ff]/90 flex items-center gap-2.5">
              <Info size={16} className="text-[#00d8ff] shrink-0" />
              <span>
                <strong>Règle des 24h :</strong> Modification / annulation libre à ≥ 24h. À moins de 24h, modification directe verrouillée.
              </span>
            </div>
          </div>

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
              LE PARCOURS DE RÉSERVATION PAS À PAS
              ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          <div className="bg-[#0f172a] border border-brand-white/10 rounded-2xl p-5 sm:p-6 space-y-6 shadow-xl">

            {/* ÉTAPE 1 : CHOIX DE LA DISCIPLINE */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-brand-white/10 pb-2">
                <span className="w-6 h-6 rounded-full bg-[#00d8ff]/20 text-[#00d8ff] border border-[#00d8ff]/30 flex items-center justify-center text-xs font-black">
                  1
                </span>
                <h3 className="text-sm sm:text-base font-heading font-black uppercase tracking-wider text-brand-white">
                  Choisissez votre Discipline
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                {PRIVATE_DISCIPLINES.map(d => {
                  const isSel = selectedDiscipline === d.name;
                  const Icon = d.icon;
                  return (
                    <button
                      key={d.name}
                      onClick={() => setSelectedDiscipline(d.name)}
                      className={cn(
                        "p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5",
                        isSel
                          ? "bg-[#00d8ff]/15 border-[#00d8ff] text-brand-white shadow-md shadow-[#00d8ff]/10"
                          : "bg-brand-white/5 border-brand-white/10 text-brand-white/60 hover:text-brand-white hover:bg-brand-white/10"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <Icon size={18} className={isSel ? "text-[#00d8ff]" : "text-brand-white/40"} />
                        {isSel && <Check size={14} className="text-[#00d8ff]" />}
                      </div>
                      <div>
                        <div className="font-heading font-bold text-xs uppercase text-brand-white">{d.name}</div>
                        <div className="text-[10px] text-brand-white/40 leading-tight mt-0.5 line-clamp-2">{d.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ÉTAPE 2 : CHOIX DU NIVEAU */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-brand-white/10 pb-2">
                <span className="w-6 h-6 rounded-full bg-[#00d8ff]/20 text-[#00d8ff] border border-[#00d8ff]/30 flex items-center justify-center text-xs font-black">
                  2
                </span>
                <h3 className="text-sm sm:text-base font-heading font-black uppercase tracking-wider text-brand-white">
                  Choisissez votre Niveau
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {PRIVATE_LEVELS.map(l => {
                  const isSel = selectedLevel === l.name;
                  return (
                    <button
                      key={l.name}
                      onClick={() => setSelectedLevel(l.name)}
                      className={cn(
                        "p-3.5 rounded-xl border text-left transition-all cursor-pointer",
                        isSel
                          ? "bg-[#00d8ff]/15 border-[#00d8ff] text-brand-white shadow-md shadow-[#00d8ff]/10"
                          : "bg-brand-white/5 border-brand-white/10 text-brand-white/60 hover:text-brand-white hover:bg-brand-white/10"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-heading font-bold text-sm uppercase text-brand-white">{l.name}</span>
                        {isSel && <Check size={16} className="text-[#00d8ff]" />}
                      </div>
                      <p className="text-[11px] text-brand-white/50 mt-1 leading-snug">{l.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ÉTAPE 3 : CHOIX DE LA DATE (CALENDRIER SEMAINE DU LUNDI AU SAMEDI) */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-brand-white/10 pb-2">
                <span className="w-6 h-6 rounded-full bg-[#00d8ff]/20 text-[#00d8ff] border border-[#00d8ff]/30 flex items-center justify-center text-xs font-black">
                  3
                </span>
                <h3 className="text-sm sm:text-base font-heading font-black uppercase tracking-wider text-brand-white">
                  Choisissez la Date
                </h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                {DAYS_ORDER.map(day => {
                  const isSel = selectedDayName === day;
                  const dayInfo = dayDateMap[day];
                  const daySlotsCount = slots.filter(s => s.category === "Cours privés" && s.day === day).length;

                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDayName(day)}
                      className={cn(
                        "p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1",
                        isSel
                          ? "bg-[#00d8ff] text-black font-black border-[#00d8ff] shadow-lg shadow-[#00d8ff]/20"
                          : "bg-brand-white/5 border-brand-white/10 text-brand-white/70 hover:text-brand-white hover:bg-brand-white/10"
                      )}
                    >
                      <span className={cn("text-[10px] uppercase font-bold tracking-wider", isSel ? "text-black/80" : "text-brand-white/50")}>
                        {day}
                      </span>
                      <span className="text-xl font-heading font-black leading-none">
                        {dayInfo.dateNum}
                      </span>
                      <span className={cn("text-[9px] uppercase font-semibold", isSel ? "text-black/70" : "text-[#00d8ff]")}>
                        {daySlotsCount} créneau{daySlotsCount > 1 ? "x" : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ÉTAPE 4 : SÉLECTION DE L'HORAIRE PARMI LES 6 CRÉNEAUX OFFICIELS */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between border-b border-brand-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#00d8ff]/20 text-[#00d8ff] border border-[#00d8ff]/30 flex items-center justify-center text-xs font-black">
                    4
                  </span>
                  <h3 className="text-sm sm:text-base font-heading font-black uppercase tracking-wider text-brand-white">
                    Créneaux disponibles pour le {dayDateMap[selectedDayName].fullDateLabel}
                  </h3>
                </div>
                <span className="text-[11px] text-brand-white/50">
                  {selectedDiscipline} · {selectedLevel}
                </span>
              </div>

              {/* Grille des 6 horaires */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {privateSlotsForSelectedDay.map(slot => {
                  const isMine = slot.isBookedByMe;
                  const isOcc = slot.isOccupiedByOther;
                  const isQuotaBlocked = !isMine && !isOcc && remainingQuota <= 0;

                  // 🔷 1. MA RÉSERVATION EXISTANTE
                  if (isMine) {
                    return (
                      <div
                        key={slot.id}
                        className="p-4 rounded-xl border border-brand-blue bg-gradient-to-br from-brand-blue/20 to-[#0f172a] flex flex-col justify-between gap-3 shadow-lg shadow-brand-blue/10"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-base font-heading font-black text-brand-white flex items-center gap-1.5">
                            <Clock size={15} className="text-[#00d8ff]" />
                            {slot.startTime} → {slot.endTime}
                          </span>
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-brand-blue text-black">
                            MA SÉANCE
                          </span>
                        </div>
                        <div className="text-xs text-brand-white/70">
                          {slot.discipline} ({slot.level})
                        </div>
                        <button
                          onClick={() => handleCancelClick(slot)}
                          className="w-full py-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 rounded-lg text-xs font-heading font-black uppercase tracking-wider transition-all cursor-pointer"
                        >
                          Annuler ma séance
                        </button>
                      </div>
                    );
                  }

                  // ⚪ 2. HORAIRE OCCUPÉ PAR UN TIERS (GRISÉ & DÉSACTIVÉ)
                  if (isOcc) {
                    return (
                      <div
                        key={slot.id}
                        className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 opacity-50 flex flex-col justify-between gap-3 cursor-not-allowed select-none"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-base font-heading font-bold text-zinc-500 flex items-center gap-1.5">
                            <Clock size={15} />
                            {slot.startTime} → {slot.endTime}
                          </span>
                          <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                            Complet (1/1)
                          </span>
                        </div>
                        <div className="text-xs text-zinc-600">
                          Déjà réservé par un autre membre
                        </div>
                        <div className="w-full py-2 bg-zinc-800/80 border border-zinc-700/80 rounded-lg text-xs font-semibold uppercase text-zinc-500 text-center">
                          Indisponible
                        </div>
                      </div>
                    );
                  }

                  // 🔷 3. CRÉNEAU DISPONIBLE
                  if (!hasPrivateAccess) {
                    return (
                      <div
                        key={slot.id}
                        className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 opacity-80 flex flex-col justify-between gap-3 shadow-md shadow-black/20"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-base font-heading font-bold text-zinc-300 flex items-center gap-1.5">
                            <Clock size={15} className="text-zinc-500" />
                            {slot.startTime} → {slot.endTime}
                          </span>
                          <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                            Formule Privée requise
                          </span>
                        </div>
                        <div className="text-xs text-zinc-400">
                          Séance individuelle (50 min) · Réservé aux abonnés Cours Privés
                        </div>
                        <button
                          onClick={() => setIsPrivatePlanRequiredModalOpen(true)}
                          className="w-full py-2.5 bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 hover:border-zinc-500 font-heading font-bold text-xs uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Lock size={14} className="text-zinc-400" />
                          Formule Privée requise
                        </button>
                      </div>
                    );
                  }

                  // 🔷 Membre avec formule privée active : bouton actif & modal de confirmation standard
                  return (
                    <div
                      key={slot.id}
                      className="p-4 rounded-xl border border-[#00d8ff]/30 bg-gradient-to-br from-[#0b1b33]/40 to-[#0f172a] hover:border-[#00d8ff] hover:bg-[#0b1b33]/70 transition-all duration-200 flex flex-col justify-between gap-3 shadow-md shadow-black/20"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-base font-heading font-black text-brand-white flex items-center gap-1.5">
                          <Clock size={15} className="text-[#00d8ff]" />
                          {slot.startTime} → {slot.endTime}
                        </span>
                        <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-[#00d8ff]/15 text-[#00d8ff] border border-[#00d8ff]/30">
                          1 place libre
                        </span>
                      </div>
                      <div className="text-xs text-brand-white/60">
                        Séance individuelle (50 min)
                      </div>
                      <button
                        onClick={() => {
                          setBookingError(null);
                          setSelectedSlotForBooking(slot);
                        }}
                        className="w-full py-2.5 bg-[#00d8ff] hover:bg-brand-white text-black font-heading font-black text-xs uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-[#00d8ff]/20"
                      >
                        <Sparkles size={14} />
                        Réserver ce créneau
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          SECTION 2 : SMALL GROUP (23 COURS AVEC RÉSERVATION)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {activeCategory === "Small Group" && (
        <div className="space-y-6">
          <div className="bg-brand-blue/10 border border-brand-blue/20 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs text-brand-blue">
            <div className="flex items-center gap-2.5">
              <ShieldCheck size={18} className="shrink-0" />
              <span>
                <strong>Planning Small Group Officiel (23 séances / sem.) :</strong> Capacité limitée à 20 personnes par créneau.
              </span>
            </div>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-brand-blue text-brand-black shrink-0">
              20 places max
            </span>
          </div>

          {/* Filtres par jour */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveDayFilter("Tous")}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-heading font-bold uppercase tracking-wider transition-all cursor-pointer",
                activeDayFilter === "Tous"
                  ? "bg-[#00d8ff] text-black font-black"
                  : "bg-brand-white/5 text-brand-white/60 hover:bg-brand-white/10 hover:text-brand-white border border-brand-white/10"
              )}
            >
              Tous les jours
            </button>

            {DAYS_ORDER.map(day => {
              const count = weekSessionsByDay[day].length;
              return (
                <button
                  key={day}
                  onClick={() => setActiveDayFilter(day)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-xs font-heading font-bold uppercase tracking-wider transition-all cursor-pointer",
                    activeDayFilter === day
                      ? "bg-[#00d8ff] text-black font-black"
                      : count > 0
                      ? "bg-brand-white/5 text-brand-white/60 hover:bg-brand-white/10 hover:text-brand-white border border-brand-white/10"
                      : "bg-brand-white/5 text-brand-white/20 border border-brand-white/5 cursor-not-allowed"
                  )}
                >
                  {day} ({count})
                </button>
              );
            })}
          </div>

          {/* Liste des séances */}
          <div className="space-y-6">
            {daysToRender.map(day => {
              const daySessions = weekSessionsByDay[day];
              if (!daySessions || daySessions.length === 0) return null;

              return (
                <div key={day} className="space-y-3">
                  <div className="flex items-center gap-2 border-b border-brand-white/10 pb-2">
                    <span className="w-1.5 h-4 rounded-full bg-[#00d8ff]" />
                    <h3 className="text-xl font-heading font-bold uppercase tracking-wider text-brand-white">
                      {day}
                    </h3>
                    <span className="text-xs text-brand-white/40 ml-auto font-semibold">
                      {daySessions.length} cours
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {daySessions.map(session => {
                      const isMine = session.isBookedByMe;
                      const isFull = session.bookedCount >= session.maxCapacity;

                      return (
                        <div
                          key={session.id}
                          className={cn(
                            "border rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-200",
                            isMine
                              ? "bg-gradient-to-r from-brand-blue/15 to-[#0f172a] border-brand-blue"
                              : isFull
                              ? "bg-zinc-900/50 border-zinc-800 opacity-60"
                              : "bg-[#0f172a] hover:bg-[#162032] border-brand-white/10"
                          )}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <span className="text-base sm:text-lg font-heading font-bold uppercase tracking-wide text-brand-white">
                                {session.discipline}
                              </span>
                              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded border bg-brand-blue/15 text-brand-blue border-brand-blue/30">
                                {session.level}
                              </span>
                              <span className={cn(
                                "text-[10px] font-bold uppercase px-2 py-0.5 rounded border",
                                isFull
                                  ? "bg-red-500/20 text-red-400 border-red-500/30"
                                  : "bg-[#00d8ff]/10 text-[#00d8ff] border-[#00d8ff]/20"
                              )}>
                                {session.bookedCount} / {session.maxCapacity} places
                              </span>
                            </div>

                            <div className="flex items-center gap-3 text-xs text-brand-white/60">
                              <span className="flex items-center gap-1 font-bold text-[#00d8ff]">
                                <Clock size={13} />
                                {session.startTime} → {session.endTime}
                              </span>
                              <span className="text-brand-white/40">
                                • 50 min
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-end">
                            {isMine ? (
                              <div className="flex items-center gap-2">
                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-blue/20 border border-brand-blue text-[#00d8ff] rounded-lg text-xs font-black uppercase">
                                  <Check size={14} />
                                  Inscrit
                                </div>
                                <button
                                  onClick={() => handleCancelClick(session)}
                                  className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-bold uppercase transition-colors cursor-pointer border border-red-500/20"
                                >
                                  Annuler
                                </button>
                              </div>
                            ) : isFull ? (
                              <div className="px-4 py-2 bg-zinc-800 text-zinc-500 border border-zinc-700 rounded-xl text-xs font-semibold uppercase">
                                Complet
                              </div>
                            ) : (
                              <button
                                onClick={() => setSelectedSlotForBooking(session)}
                                className="px-5 py-2.5 rounded-xl font-heading font-black text-xs uppercase tracking-wider bg-[#00d8ff] hover:bg-brand-white text-black transition-all cursor-pointer shadow-md shadow-[#00d8ff]/20"
                              >
                                RÉSERVER
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          SECTION 3 : COLLECTIFS (3 COURS — AUCUN BOUTON RÉSERVER)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {activeCategory === "Collectifs" && (
        <div className="space-y-6">
          <div className="bg-brand-white/5 border border-brand-white/10 rounded-2xl p-4 flex items-center gap-3 text-xs text-brand-white/80">
            <Info size={18} className="shrink-0 text-[#00d8ff]" />
            <span>
              <strong>Cours Collectifs Officiels (Kick Boxing) :</strong> En accès libre et illimité pour tous les membres actifs du club. Présentez-vous directement à la salle aux horaires indiqués ci-dessous (sans réservation).
            </span>
          </div>

          <div className="space-y-3">
            {DAYS_ORDER.map(day => {
              const daySessions = weekSessionsByDay[day];
              if (!daySessions || daySessions.length === 0) return null;

              return (
                <div key={day} className="space-y-3">
                  <div className="flex items-center gap-2 border-b border-brand-white/10 pb-2">
                    <span className="w-1.5 h-4 rounded-full bg-brand-white" />
                    <h3 className="text-xl font-heading font-bold uppercase tracking-wider text-brand-white">
                      {day}
                    </h3>
                  </div>

                  <div className="space-y-2.5">
                    {daySessions.map(session => (
                      <div
                        key={session.id}
                        className="border border-brand-white/10 bg-[#0f172a] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="text-base sm:text-lg font-heading font-bold uppercase tracking-wide text-brand-white">
                              {session.discipline}
                            </span>
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded border bg-brand-white/10 text-brand-white border-brand-white/20">
                              {session.level}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-brand-white/60">
                            <span className="flex items-center gap-1 font-bold text-[#00d8ff]">
                              <Clock size={13} />
                              {session.startTime} → {session.endTime}
                            </span>
                            <span className="text-brand-white/40">
                              • 60 min · Collectif
                            </span>
                          </div>
                        </div>

                        <div className="px-3.5 py-1.5 bg-brand-white/5 border border-brand-white/10 rounded-xl text-xs font-semibold uppercase text-brand-white/60 text-center">
                          Accès libre sans réservation
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
          MODAL 1 : CONFIRMATION DE RÉSERVATION
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatePresence>
        {selectedSlotForBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedSlotForBooking(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-[#0f172a] border border-brand-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl z-10 space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-brand-white/10">
                <h3 className="text-xl font-heading font-bold uppercase tracking-wider text-brand-white">
                  Confirmer la réservation
                </h3>
                <button onClick={() => setSelectedSlotForBooking(null)} className="text-brand-white/50 hover:text-brand-white">
                  <X size={18} />
                </button>
              </div>

              {selectedSlotForBooking.category === "Cours privés" && (
                <div className="p-3.5 bg-[#0b1b33] border border-[#00d8ff]/30 rounded-xl flex items-center justify-between">
                  <div className="text-xs">
                    <span className="font-bold text-[#00d8ff] block uppercase">Décompte de séance</span>
                    <span className="text-brand-white/70">Solde restant après confirmation : {Math.max(0, remainingQuota - 1)} / {totalQuota}</span>
                  </div>
                  <span className="text-xs font-black px-2 py-0.5 rounded bg-[#00d8ff]/20 text-[#00d8ff] border border-[#00d8ff]/30">
                    -1 séance
                  </span>
                </div>
              )}

              <div className="bg-brand-white/5 border border-brand-white/10 rounded-xl p-4 space-y-2 text-xs">
                <div className="flex justify-between border-b border-brand-white/10 pb-2">
                  <span className="text-brand-white/50 uppercase">Discipline</span>
                  <span className="font-bold text-brand-white">
                    {selectedSlotForBooking.category === "Cours privés" ? selectedDiscipline : selectedSlotForBooking.discipline}
                  </span>
                </div>
                <div className="flex justify-between border-b border-brand-white/10 pb-2">
                  <span className="text-brand-white/50 uppercase">Niveau</span>
                  <span className="font-bold text-[#00d8ff]">
                    {selectedSlotForBooking.category === "Cours privés" ? selectedLevel : selectedSlotForBooking.level}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-brand-white/50 uppercase">Date & Créneau</span>
                  <span className="font-bold text-brand-white">{selectedSlotForBooking.day} · {selectedSlotForBooking.startTime} → {selectedSlotForBooking.endTime}</span>
                </div>
              </div>

              {/* Error Message */}
              {bookingError && (
                <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2.5 text-xs text-red-400">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{bookingError}</span>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setSelectedSlotForBooking(null);
                    setBookingError(null);
                  }}
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white/70 font-heading font-bold text-xs uppercase rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleConfirmBooking}
                  disabled={isSubmitting}
                  className="flex-1 py-3 font-heading font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer text-black bg-[#00d8ff] hover:bg-brand-white shadow-lg shadow-[#00d8ff]/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Confirmation...</span>
                    </>
                  ) : (
                    <span>Confirmer</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MODAL 2 : ANNULATION AUTORISÉE (≥ 24H)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatePresence>
        {slotForCancel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => {
                if (!isSubmitting) {
                  setSlotForCancel(null);
                  setBookingError(null);
                }
              }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-[#0f172a] border border-[#00d8ff]/30 rounded-2xl p-6 sm:p-8 shadow-2xl z-10 space-y-5"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#00d8ff]/10 border border-[#00d8ff]/20 text-[#00d8ff] flex items-center justify-center shrink-0">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-heading font-bold uppercase tracking-wider text-brand-white">
                    Annulation autorisée (&ge; 24h)
                  </h3>
                  <p className="text-xs text-[#00d8ff]">
                    Cette annulation intervient plus de 24h avant le cours.
                  </p>
                </div>
              </div>

              {/* Error Message */}
              {bookingError && (
                <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2.5 text-xs text-red-400">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{bookingError}</span>
                </div>
              )}

              {slotForCancel.category === "Cours privés" && (
                <div className="p-3.5 bg-[#0b1b33] border border-[#00d8ff]/30 rounded-xl text-xs space-y-1">
                  <div className="font-bold uppercase text-[#00d8ff] flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-[#00d8ff]" />
                    <span>Restitution intégrale du quota</span>
                  </div>
                  <p className="text-brand-white/80 text-[11px]">
                    La séance sera immédiatement restituée à votre quota (nouveau solde : {Math.min(totalQuota, remainingQuota + 1)} / {totalQuota}).
                  </p>
                </div>
              )}

              <div className="bg-brand-white/5 border border-brand-white/10 rounded-xl p-3.5 text-xs space-y-1.5">
                <div className="text-brand-white/50 uppercase">Séance concernée :</div>
                <div className="font-bold text-brand-white text-sm">{slotForCancel.discipline} ({slotForCancel.level})</div>
                <div className="text-[#00d8ff] font-semibold">{slotForCancel.day} · {slotForCancel.startTime} → {slotForCancel.endTime}</div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setSlotForCancel(null);
                    setBookingError(null);
                  }}
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-brand-white/10 hover:bg-brand-white/20 text-brand-white font-heading font-bold text-xs uppercase rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  Garder ma place
                </button>
                <button
                  onClick={handleConfirmCancel}
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white border border-red-500/30 hover:border-red-500 font-heading font-bold text-xs uppercase rounded-xl transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Annulation...</span>
                    </>
                  ) : (
                    <span>Confirmer l&apos;annulation</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MODAL 3 : ANNULATION IMPOSSIBLE (< 24H)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatePresence>
        {blockedLateSlot && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setBlockedLateSlot(null)}
              className="fixed inset-0 bg-black/85 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-[#0f172a] border border-red-500/40 rounded-2xl p-6 sm:p-8 shadow-2xl z-10 space-y-5"
            >
              <div className="flex items-center gap-3 pb-3 border-b border-brand-white/10">
                <div className="w-11 h-11 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 flex items-center justify-center shrink-0">
                  <ShieldAlert size={22} />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-heading font-black uppercase tracking-wider text-brand-white">
                    Annulation impossible
                  </h3>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30 inline-block mt-0.5">
                    Délai inférieur à 24h
                  </span>
                </div>
              </div>

              <div className="bg-red-950/30 border border-red-500/30 rounded-xl p-4 space-y-2 text-xs text-red-200/90 leading-relaxed">
                <p className="font-semibold text-red-300 flex items-center gap-1.5">
                  <AlertTriangle size={15} className="text-red-400 shrink-0" />
                  Règle d&apos;annulation stricte des 24 heures :
                </p>
                <p>
                  Cette réservation ne peut plus être annulée en ligne car la séance commence dans moins de 24 heures.
                </p>
                <p className="text-red-300/80">
                  Pour toute demande exceptionnelle, veuillez contacter votre coach.
                </p>
              </div>

              <div className="bg-brand-white/5 border border-brand-white/10 rounded-xl p-3.5 text-xs space-y-1">
                <div className="text-brand-white/50 uppercase">Séance concernée :</div>
                <div className="font-bold text-brand-white text-sm">{blockedLateSlot.discipline} ({blockedLateSlot.level})</div>
                <div className="text-[#00d8ff] font-semibold">{blockedLateSlot.day} · {blockedLateSlot.startTime} → {blockedLateSlot.endTime}</div>
              </div>

              <div className="space-y-2">
                <a
                  href={coachWhatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 bg-[#25D366] hover:bg-[#1EBE5D] text-black font-heading font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#25D366]/20 cursor-pointer"
                >
                  <MessageCircle size={16} />
                  Contacter le coach sur WhatsApp
                </a>
                <button
                  onClick={() => setBlockedLateSlot(null)}
                  className="w-full py-2.5 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white/70 font-heading font-bold text-xs uppercase rounded-xl transition-all cursor-pointer"
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MODAL 4 : FORMULE COURS PRIVÉ REQUISE
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatePresence>
        {isPrivatePlanRequiredModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPrivatePlanRequiredModalOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative w-full max-w-md bg-[#0f172a] border border-[#00d8ff]/30 rounded-2xl p-6 sm:p-8 shadow-2xl z-10 space-y-5"
            >
              <div className="flex items-center gap-3 pb-3 border-b border-brand-white/10">
                <div className="w-11 h-11 rounded-xl bg-[#00d8ff]/15 border border-[#00d8ff]/30 text-[#00d8ff] flex items-center justify-center shrink-0">
                  <Lock size={22} />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-heading font-black uppercase tracking-wider text-brand-white">
                    Formule Cours Privé requise
                  </h3>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#00d8ff]/20 text-[#00d8ff] border border-[#00d8ff]/30 inline-block mt-0.5">
                    Accès réservé
                  </span>
                </div>
              </div>

              <div className="bg-[#0b1b33]/60 border border-[#00d8ff]/20 rounded-xl p-4 space-y-2 text-xs text-brand-white/80 leading-relaxed">
                <p className="font-semibold text-brand-white">
                  Vous devez posséder une formule Cours Privé active pour pouvoir réserver cette séance.
                </p>
                <p className="text-brand-white/60">
                  Consultez nos formules pour accéder aux réservations privées et bénéficier d&apos;un accompagnement 100% sur-mesure avec votre coach.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={() => setIsPrivatePlanRequiredModalOpen(false)}
                  className="flex-1 py-3 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white/70 font-heading font-bold text-xs uppercase rounded-xl transition-all cursor-pointer border border-brand-white/10 text-center"
                >
                  Fermer
                </button>
                <Link
                  href="/tarifs"
                  className="flex-1 py-3 bg-[#00d8ff] hover:bg-brand-white text-black font-heading font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-2 shadow-lg shadow-[#00d8ff]/20"
                >
                  <Sparkles size={14} />
                  Voir les formules
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MODAL 4 : SUCCÈS & RETOUR VISUEL
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatePresence>
        {isSuccessModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsSuccessModalOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-[#0f172a] border border-brand-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl z-10 text-center space-y-4"
            >
              <div className="w-14 h-14 rounded-full bg-[#00d8ff]/20 text-[#00d8ff] border border-[#00d8ff]/30 flex items-center justify-center mx-auto">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-2xl font-heading font-bold uppercase tracking-wider text-brand-white">
                Opération validée
              </h3>
              <p className="text-xs text-brand-white/70 leading-relaxed max-w-xs mx-auto">
                {successMessage}
              </p>
              <button
                onClick={() => setIsSuccessModalOpen(false)}
                className="w-full py-3 bg-[#00d8ff] hover:bg-brand-white text-black font-heading font-black text-xs uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
              >
                Retour au planning
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
