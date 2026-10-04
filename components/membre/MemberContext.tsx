"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { createClient } from "@/lib/supabase/client";
import {
  getMemberPlanAccess,
  getMemberUpcomingBookings,
  getActiveClassSessions,
  bookSmallGroupSession as apiBookSmallGroup,
  cancelSmallGroupSession as apiCancelSmallGroup,
  type ClassSession,
} from "@/lib/supabase/small-group";
import {
  getMemberPrivateQuotaStatus,
  bookPrivateSession as apiBookPrivate,
  cancelPrivateSession as apiCancelPrivate,
  type MemberPrivateQuotaStatus,
} from "@/lib/supabase/private-sessions";
import {
  getServiceSettingsMap,
  DEFAULT_SERVICE_SETTINGS,
} from "@/lib/supabase/services";
import { getConfirmedBookingsSummaryAction, getMemberUnreadNotificationsCountAction } from "@/app/(membre)/actions";
import { formatToParisDate, formatToParisTime } from "@/lib/supabase/admin";

export type BookingSlot = {
  id?: string;
  discipline: string;
  sessionType: "Cours Privé" | "Small Group";
  day: string;
  time: string;
  level?: string;
  status?: string;
  date?: string;
  startsAt?: string;
  classSessionId?: string | null;
  class_session_id?: string | null;
  user_id?: string;
  class_session?: ClassSession | null;
};

export interface ConfirmedBookingInfo {
  class_session_id: string;
  user_id: string;
}

const DEMO_STORAGE_KEY_BOOKINGS = "striking_demo_member_bookings_v2";
const DEMO_STORAGE_KEY_QUOTA = "striking_demo_member_quota_v8";

const DEFAULT_DEMO_BOOKINGS: BookingSlot[] = [
  {
    id: "demo_priv_1",
    discipline: "Boxe Anglaise",
    sessionType: "Cours Privé",
    day: "Lundi",
    time: "08:00 → 08:50",
    date: "31 Août 2026",
    level: "Débutant",
    status: "Confirmé (Séance dans < 24h)",
  },
  {
    id: "demo_priv_2",
    discipline: "Kick Boxing",
    sessionType: "Cours Privé",
    day: "Mercredi",
    time: "10:00 → 10:50",
    date: "2 Septembre 2026",
    level: "Intermédiaire",
    status: "Confirmé",
  },
  {
    id: "demo_sg_1",
    discipline: "Boxing Bag",
    sessionType: "Small Group",
    day: "Lundi",
    time: "07:00 → 08:00",
    date: "31 Août 2026",
    level: "Fondamentaux",
    status: "Inscrit",
  },
];

interface MemberContextType {
  currentUserId: string | null;

  // Quick Action Modal (+)
  isQuickActionOpen: boolean;
  openQuickAction: () => void;
  closeQuickAction: () => void;

  // Booking Confirm Modal
  isBookingConfirmOpen: boolean;
  selectedSlot: BookingSlot | null;
  openBookingConfirm: (slot: BookingSlot) => void;
  closeBookingConfirm: () => void;

  // Booking Cancel Modal
  isBookingCancelOpen: boolean;
  slotToCancel: BookingSlot | null;
  openBookingCancel: (slot: BookingSlot) => void;
  closeBookingCancel: () => void;

  // Member Subscription Rights
  hasActiveSubscription: boolean;
  hasPrivateAccess: boolean;
  hasSmallGroupAccess: boolean;
  isEssential: boolean;
  isAllAccess: boolean;
  isLadyStriking: boolean;
  isKidBoxing: boolean;
  selectedDiscipline: string | null;
  birthDate: string | null;
  planName: string;
  activePlanNames: string[];
  activePlanCodes: string[];
  privateSessionsQuota: number | null;
  privateQuota: MemberPrivateQuotaStatus | null;
  isLoadingData: boolean;

  // Available sessions in database
  availableSessions: ClassSession[];
  allConfirmedBookings: ConfirmedBookingInfo[];

  // Service Feature Flags (Gestion des services)
  serviceSettings: Record<string, boolean>;
  isSmallGroupEnabled: boolean;
  isPrivateEnabled: boolean;
  isEventsEnabled: boolean;

  // Real & Synchronized User Bookings
  userBookings: BookingSlot[];

  // Actions synchronisées
  addSynchronizedBooking: (slot: BookingSlot) => void;
  removeSynchronizedBooking: (bookingId: string, shouldRestituteQuota?: boolean) => void;

  bookSmallGroup: (slotOrId: BookingSlot | string) => Promise<{ success: boolean; error?: string; bookingId?: string }>;
  cancelSmallGroup: (bookingId: string) => Promise<{ success: boolean; error?: string }>;
  bookPrivate: (slot: BookingSlot) => Promise<{ success: boolean; error?: string; remainingSessions?: number; bookingId?: string }>;
  cancelPrivate: (bookingId: string) => Promise<{ success: boolean; isLateCancellation?: boolean; message?: string; error?: string }>;
  bookSlot: (slot: BookingSlot) => Promise<{ success: boolean; error?: string; bookingId?: string }>;
  cancelSlot: (bookingId: string) => Promise<{ success: boolean; isLateCancellation?: boolean; message?: string; error?: string }>;
  // Notifications & Alertes
  unreadNotificationsCount: number;
  decrementUnreadCount: () => void;
  resetUnreadCount: () => void;
  refreshNotificationsCount: () => Promise<void>;

  refreshMemberData: () => Promise<void>;
}

const MemberContext = createContext<MemberContextType | undefined>(undefined);

export function MemberProvider({ children }: { children: React.ReactNode }) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);
  const [isBookingConfirmOpen, setIsBookingConfirmOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<BookingSlot | null>(null);

  const [isBookingCancelOpen, setIsBookingCancelOpen] = useState(false);
  const [slotToCancel, setSlotToCancel] = useState<BookingSlot | null>(null);

  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [hasPrivateAccess, setHasPrivateAccess] = useState(false);
  const [hasSmallGroupAccess, setHasSmallGroupAccess] = useState(false);
  const [isEssential, setIsEssential] = useState(false);
  const [isAllAccess, setIsAllAccess] = useState(false);
  const [isLadyStriking, setIsLadyStriking] = useState(false);
  const [isKidBoxing, setIsKidBoxing] = useState(false);
  const [selectedDiscipline, setSelectedDiscipline] = useState<string | null>(null);
  const [birthDate, setBirthDate] = useState<string | null>(null);
  const [planName, setPlanName] = useState("");
  const [activePlanNames, setActivePlanNames] = useState<string[]>([]);
  const [activePlanCodes, setActivePlanCodes] = useState<string[]>([]);
  const [privateSessionsQuota, setPrivateSessionsQuota] = useState<number | null>(null);
  const [privateQuota, setPrivateQuota] = useState<MemberPrivateQuotaStatus | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [availableSessions, setAvailableSessions] = useState<ClassSession[]>([]);
  const [allConfirmedBookings, setAllConfirmedBookings] = useState<ConfirmedBookingInfo[]>([]);
  const [serviceSettings, setServiceSettings] = useState<Record<string, boolean>>(DEFAULT_SERVICE_SETTINGS);
  
  // État partagé et synchronisé des réservations
  const [userBookings, setUserBookings] = useState<BookingSlot[]>([]);

  // Notifications non lues
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);

  const decrementUnreadCount = useCallback(() => {
    setUnreadNotificationsCount((prev) => Math.max(0, prev - 1));
  }, []);

  const resetUnreadCount = useCallback(() => {
    setUnreadNotificationsCount(0);
  }, []);

  const refreshNotificationsCount = useCallback(async () => {
    try {
      const count = await getMemberUnreadNotificationsCountAction();
      setUnreadNotificationsCount(count);
    } catch {
      // ignore
    }
  }, []);

  // Synchronisation post-hydratation pour mode démo si non authentifié
  useEffect(() => {
    try {
      const savedBookings = localStorage.getItem(DEMO_STORAGE_KEY_BOOKINGS);
      if (savedBookings && !currentUserId) {
        setUserBookings(JSON.parse(savedBookings));
      }
      const savedQuota = localStorage.getItem(DEMO_STORAGE_KEY_QUOTA);
      if (savedQuota && !currentUserId) {
        setPrivateQuota(JSON.parse(savedQuota));
      }
    } catch {
      // ignore
    }
  }, [currentUserId]);

  const supabase = createClient();

  // Action : Ajouter une réservation synchronisée
  const addSynchronizedBooking = useCallback((newSlot: BookingSlot) => {
    setUserBookings((prev) => {
      const updated = [newSlot, ...prev];
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(DEMO_STORAGE_KEY_BOOKINGS, JSON.stringify(updated));
        } catch {
          // ignore
        }
      }
      return updated;
    });

    if (newSlot.sessionType === "Cours Privé") {
      setPrivateQuota((prev) => {
        if (!prev) return prev;
        const remaining = Math.max(0, prev.sessionsRemaining - 1);
        const consumed = prev.sessionsConsumed + 1;
        const updated = { ...prev, sessionsRemaining: remaining, sessionsConsumed: consumed };
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(DEMO_STORAGE_KEY_QUOTA, JSON.stringify(updated));
          } catch {
            // ignore
          }
        }
        return updated;
      });
    }
  }, []);

  // Action : Supprimer une réservation synchronisée
  const removeSynchronizedBooking = useCallback((bookingId: string, shouldRestituteQuota = true) => {
    let removedSlot: BookingSlot | undefined;

    setUserBookings((prev) => {
      removedSlot = prev.find((b) => b.id === bookingId);
      const updated = prev.filter((b) => b.id !== bookingId);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(DEMO_STORAGE_KEY_BOOKINGS, JSON.stringify(updated));
        } catch {
          // ignore
        }
      }
      return updated;
    });

    if (removedSlot?.sessionType === "Cours Privé" && shouldRestituteQuota) {
      setPrivateQuota((prev) => {
        if (!prev) return prev;
        const remaining = Math.min(prev.quotaTotal, prev.sessionsRemaining + 1);
        const consumed = Math.max(0, prev.sessionsConsumed - 1);
        const updated = { ...prev, sessionsRemaining: remaining, sessionsConsumed: consumed };
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(DEMO_STORAGE_KEY_QUOTA, JSON.stringify(updated));
          } catch {
            // ignore
          }
        }
        return updated;
      });
    }
  }, []);

  const refreshMemberData = useCallback(async () => {
    try {
      // 0. & 1. & 2. Chargement parallèle des données globales et de l'utilisateur
      const [settingsRes, sessionsRes, confirmedRes, authUserRes] = await Promise.allSettled([
        getServiceSettingsMap(supabase),
        getActiveClassSessions(supabase),
        getConfirmedBookingsSummaryAction(),
        supabase.auth.getUser(),
      ]);

      if (settingsRes.status === "fulfilled") {
        setServiceSettings(settingsRes.value);
      } else {
        console.warn("[MemberContext] Erreur lecture service_settings (conservation de l'état précédent) :", settingsRes.reason);
      }

      if (sessionsRes.status === "fulfilled") {
        setAvailableSessions(sessionsRes.value);
      }

      if (confirmedRes.status === "fulfilled") {
        setAllConfirmedBookings(confirmedRes.value || []);
      } else {
        console.warn("[MemberContext] Erreur lecture réservations confirmées via Server Action :", confirmedRes.reason);
        setAllConfirmedBookings([]);
      }

      const user = authUserRes.status === "fulfilled" ? authUserRes.value.data?.user : null;

      if (!user) {
        setCurrentUserId(null);
        setUserBookings([]);
        return;
      }

      setCurrentUserId(user.id);

      // 3. Chargement parallèle des droits d'accès, du quota privé, des réservations et des alertes du membre
      const [accessRes, quotaStatusRes, realBookingsRes, unreadRes] = await Promise.allSettled([
        getMemberPlanAccess(supabase, user.id),
        getMemberPrivateQuotaStatus(supabase),
        getMemberUpcomingBookings(supabase, user.id),
        getMemberUnreadNotificationsCountAction(),
      ]);

      if (accessRes.status === "fulfilled") {
        const access = accessRes.value;
        setHasActiveSubscription(access.hasActiveSubscription);
        setHasPrivateAccess(access.hasPrivateAccess);
        setHasSmallGroupAccess(access.hasSmallGroupAccess);
        setIsEssential(access.isEssential);
        setIsAllAccess(access.isAllAccess);
        setIsLadyStriking(access.isLadyStriking);
        setIsKidBoxing(access.isKidBoxing);
        setSelectedDiscipline(access.selectedDiscipline || null);
        setBirthDate(access.birthDate || null);
        setPlanName(access.planName || "Formule Active");
        setActivePlanNames(access.activePlanNames || []);
        setActivePlanCodes(access.activePlanCodes || []);
        setPrivateSessionsQuota(access.privateSessionsQuota ?? 8);
      }

      if (quotaStatusRes.status === "fulfilled" && quotaStatusRes.value.success) {
        setPrivateQuota(quotaStatusRes.value);
      }

      if (realBookingsRes.status === "fulfilled") {
        setUserBookings(realBookingsRes.value);
      }

      if (unreadRes.status === "fulfilled") {
        setUnreadNotificationsCount(unreadRes.value);
      }
    } catch (err) {
      console.error("[MemberContext] Erreur lors du chargement des données membre :", err);
    }
  }, [supabase]);

  useEffect(() => {
    refreshMemberData();
  }, [refreshMemberData]);

  const openQuickAction = () => setIsQuickActionOpen(true);
  const closeQuickAction = () => setIsQuickActionOpen(false);

  const openBookingConfirm = (slot: BookingSlot) => {
    setSelectedSlot(slot);
    setIsBookingConfirmOpen(true);
  };

  const closeBookingConfirm = () => {
    setIsBookingConfirmOpen(false);
    setSelectedSlot(null);
  };

  const openBookingCancel = (slot: BookingSlot) => {
    setSlotToCancel(slot);
    setIsBookingCancelOpen(true);
  };

  const closeBookingCancel = () => {
    setIsBookingCancelOpen(false);
    setSlotToCancel(null);
  };

  // Réservation Small Group réelle via RPC Supabase
  const bookSmallGroup = async (slotOrId: BookingSlot | string) => {
    const sessionId = typeof slotOrId === "string" ? slotOrId : (slotOrId.classSessionId || slotOrId.id);

    if (!sessionId || !sessionId.includes("-")) {
      const msg = `Identifiant de séance invalide ou non UUID : ${sessionId}`;
      console.error("[MemberContext] ERREUR :", msg);
      return { success: false, error: msg };
    }

    const result = await apiBookSmallGroup(supabase, sessionId);

    if (!result.success) {
      return { success: false, error: result.error || "Impossible d'effectuer la réservation." };
    }

    // Mise à jour optimiste immédiate : insérer la nouvelle réservation
    const targetSession = availableSessions.find((s) => s.id === sessionId);
    const newBookingId = result.bookingId || `booking_${Date.now()}`;
    const newSlot: BookingSlot = {
      id: newBookingId,
      class_session_id: sessionId,
      classSessionId: sessionId,
      user_id: currentUserId || undefined,
      discipline: targetSession?.discipline || "Cours Adulte",
      sessionType: "Small Group",
      day: targetSession ? formatToParisDate(targetSession.starts_at) : "",
      time: targetSession ? formatToParisTime(targetSession.starts_at) : "",
      startsAt: targetSession?.starts_at,
      status: "confirmed",
      class_session: targetSession,
    };

    setUserBookings((prev) => [newSlot, ...prev.filter((b) => b.class_session_id !== sessionId && b.classSessionId !== sessionId)]);
    if (currentUserId) {
      setAllConfirmedBookings((prev) => [
        ...prev.filter((b) => !(b.class_session_id === sessionId && b.user_id === currentUserId)),
        { class_session_id: sessionId, user_id: currentUserId },
      ]);
    }

    await refreshMemberData();
    return { success: true, bookingId: result.bookingId };
  };

  // Annulation Small Group réelle via RPC Supabase
  const cancelSmallGroup = async (bookingIdOrSessionId: string) => {
    if (!bookingIdOrSessionId || !bookingIdOrSessionId.includes("-")) {
      const msg = `Identifiant invalide : ${bookingIdOrSessionId}`;
      console.error("[MemberContext] ERREUR :", msg);
      return { success: false, error: msg };
    }

    const result = await apiCancelSmallGroup(supabase, bookingIdOrSessionId);

    if (!result.success) {
      return { success: false, error: result.error || "Impossible d'annuler cette réservation." };
    }

    // Mise à jour optimiste immédiate : supprimer la réservation
    setUserBookings((prev) =>
      prev.filter(
        (b) =>
          b.id !== bookingIdOrSessionId &&
          b.class_session_id !== bookingIdOrSessionId &&
          b.classSessionId !== bookingIdOrSessionId
      )
    );

    if (currentUserId) {
      setAllConfirmedBookings((prev) =>
        prev.filter(
          (b) =>
            !(
              (b.class_session_id === bookingIdOrSessionId || b.user_id === currentUserId) &&
              (b.class_session_id === bookingIdOrSessionId ||
                userBookings.some(
                  (ub) =>
                    (ub.id === bookingIdOrSessionId || ub.class_session_id === bookingIdOrSessionId) &&
                    ub.class_session_id === b.class_session_id
                ))
            )
        )
      );
    }

    await refreshMemberData();
    return { success: true };
  };

  // Réservation Cours Privé
  const bookPrivate = async (slot: BookingSlot) => {
    const sessionId = slot.classSessionId || slot.id;
    if (sessionId && sessionId.includes("-")) {
      const res = await apiBookPrivate(supabase, sessionId);
      if (!res.success) {
        return { success: false, error: res.error || res.message };
      }
      await refreshMemberData();
      return {
        success: true,
        bookingId: res.bookingId,
        remainingSessions: res.remainingSessions,
      };
    }
    addSynchronizedBooking(slot);
    return {
      success: true,
      remainingSessions: Math.max(0, (privateQuota?.sessionsRemaining ?? 6) - 1),
    };
  };

  // Annulation Cours Privé
  const cancelPrivate = async (bookingId: string) => {
    if (bookingId && bookingId.includes("-")) {
      const res = await apiCancelPrivate(supabase, bookingId);
      if (!res.success) {
        return { success: false, error: res.error || res.message };
      }
      await refreshMemberData();
      return {
        success: true,
        isLateCancellation: res.isLateCancellation,
        message: res.message,
      };
    }
    const isLate = slotToCancel?.day === "Lundi";
    removeSynchronizedBooking(bookingId, !isLate);
    return {
      success: true,
      isLateCancellation: isLate,
      message: isLate
        ? "Annulation < 24h : la séance reste décomptée."
        : "Annulation ≥ 24h : séance restituée.",
    };
  };

  const bookSlot = async (slot: BookingSlot) => {
    if (slot.sessionType === "Cours Privé") {
      return bookPrivate(slot);
    }
    return bookSmallGroup(slot);
  };

  const cancelSlot = async (bookingId: string) => {
    if (slotToCancel?.sessionType === "Cours Privé") {
      return cancelPrivate(bookingId);
    }
    return cancelSmallGroup(bookingId);
  };

  const isSmallGroupEnabled = serviceSettings.small_group !== false;
  const isPrivateEnabled = serviceSettings.private !== false;
  const isEventsEnabled = serviceSettings.events !== false;

  return (
    <MemberContext.Provider
      value={{
        currentUserId,
        isQuickActionOpen,
        openQuickAction,
        closeQuickAction,
        isBookingConfirmOpen,
        selectedSlot,
        openBookingConfirm,
        closeBookingConfirm,
        isBookingCancelOpen,
        slotToCancel,
        openBookingCancel,
        closeBookingCancel,
        hasActiveSubscription,
        hasPrivateAccess,
        hasSmallGroupAccess,
        isEssential,
        isAllAccess,
        isLadyStriking,
        isKidBoxing,
        selectedDiscipline,
        birthDate,
        planName,
        activePlanNames,
        activePlanCodes,
        privateSessionsQuota,
        privateQuota,
        isLoadingData,
        availableSessions,
        allConfirmedBookings,
        serviceSettings,
        isSmallGroupEnabled,
        isPrivateEnabled,
        isEventsEnabled,
        userBookings,
        addSynchronizedBooking,
        removeSynchronizedBooking,
        bookSmallGroup,
        cancelSmallGroup,
        bookPrivate,
        cancelPrivate,
        bookSlot,
        cancelSlot,
        unreadNotificationsCount,
        decrementUnreadCount,
        resetUnreadCount,
        refreshNotificationsCount,
        refreshMemberData,
      }}
    >
      {children}
    </MemberContext.Provider>
  );
}

export function useMember() {
  const context = useContext(MemberContext);
  if (!context) {
    throw new Error("useMember doit être utilisé au sein d'un MemberProvider");
  }
  return context;
}
