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

export type BookingSlot = {
  id?: string;
  discipline: string;
  sessionType: "Cours Privé" | "Small Group" | "Collectifs";
  day: string;
  time: string;
  level?: string;
  status?: string;
  date?: string;
  startsAt?: string;
  classSessionId?: string | null;
  class_session_id?: string | null;
  user_id?: string;
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
    time: "07:00 → 07:50",
    date: "31 Août 2026",
    level: "Fondamentaux",
    status: "Inscrit (20 places)",
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
  hasCollectiveAccess: boolean;
  planName: string;
  activePlanNames: string[];
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

  const [hasActiveSubscription, setHasActiveSubscription] = useState(true);
  const [hasPrivateAccess, setHasPrivateAccess] = useState(true);
  const [hasSmallGroupAccess, setHasSmallGroupAccess] = useState(true);
  const [hasCollectiveAccess, setHasCollectiveAccess] = useState(true);
  const [planName, setPlanName] = useState("Formule Complète");
  const [activePlanNames, setActivePlanNames] = useState<string[]>(["Cours Privé - Mensuel", "Small Group"]);
  const [privateSessionsQuota, setPrivateSessionsQuota] = useState<number | null>(8);
  const [privateQuota, setPrivateQuota] = useState<MemberPrivateQuotaStatus | null>({
    success: true,
    hasActivePrivatePlan: true,
    quotaTotal: 8,
    sessionsConsumed: 2,
    sessionsRemaining: 6,
    cycleStart: "2026-08-25T00:00:00Z",
    cycleEnd: "2026-09-25T23:59:59Z",
  });
  const [isLoadingData, setIsLoadingData] = useState(false);

  const [availableSessions, setAvailableSessions] = useState<ClassSession[]>([]);
  const [allConfirmedBookings, setAllConfirmedBookings] = useState<ConfirmedBookingInfo[]>([]);
  const [serviceSettings, setServiceSettings] = useState<Record<string, boolean>>(DEFAULT_SERVICE_SETTINGS);
  
  // État partagé et synchronisé des réservations (initialisation identique SSR et Client)
  const [userBookings, setUserBookings] = useState<BookingSlot[]>(DEFAULT_DEMO_BOOKINGS);

  // Synchronisation post-hydratation depuis le localStorage client
  useEffect(() => {
    try {
      const savedBookings = localStorage.getItem(DEMO_STORAGE_KEY_BOOKINGS);
      if (savedBookings) {
        setUserBookings(JSON.parse(savedBookings));
      }
      const savedQuota = localStorage.getItem(DEMO_STORAGE_KEY_QUOTA);
      if (savedQuota) {
        setPrivateQuota(JSON.parse(savedQuota));
      }
    } catch {
      // ignore
    }
  }, []);

  const supabase = createClient();

  // Sauvegarde automatique des réservations synchronisées
  const saveBookings = useCallback((newList: BookingSlot[]) => {
    setUserBookings(newList);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(DEMO_STORAGE_KEY_BOOKINGS, JSON.stringify(newList));
      } catch (err) {
        console.error("Erreur sauvegarde localStorage :", err);
      }
    }
  }, []);

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
      console.log("[MemberContext] --> refreshMemberData() démarré...");

      // 0. Charger les paramètres globaux des services (Feature flags)
      try {
        const settings = await getServiceSettingsMap(supabase);
        setServiceSettings(settings);
      } catch (settingsErr) {
        console.warn("[MemberContext] Erreur lecture service_settings (conservation de l'état précédent) :", settingsErr);
      }

      // 1. Toujours charger les sessions réelles et les réservations globales (accès public/anon ou auth)
      const sessions = await getActiveClassSessions(supabase);
      console.log("[MemberContext] class_sessions récupérées :", sessions.length, "créneaux");
      setAvailableSessions(sessions);

      const { data: confirmedBookingsData, error: confirmedErr } = await supabase
        .from("bookings")
        .select("class_session_id, user_id")
        .eq("status", "confirmed")
        .not("class_session_id", "is", null);

      if (confirmedErr) {
        console.warn("[MemberContext] Erreur lecture réservations confirmées :", confirmedErr);
      } else {
        console.log("[MemberContext] Total réservations confirmées en base :", confirmedBookingsData?.length || 0);
      }

      setAllConfirmedBookings(
        (confirmedBookingsData || []).map((b) => ({
          class_session_id: b.class_session_id as string,
          user_id: b.user_id as string,
        }))
      );

      // 2. Vérification de la session utilisateur connectée
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      console.log("[MemberContext] Utilisateur Supabase connecté :", user ? `${user.email} (ID: ${user.id})` : "Aucun utilisateur connecté", { userErr });

      if (!user) {
        setCurrentUserId(null);
        setUserBookings([]);
        return;
      }

      setCurrentUserId(user.id);

      const access = await getMemberPlanAccess(supabase, user.id);
      console.log("[MemberContext] Droits d'accès formule :", access);
      setHasActiveSubscription(access.hasActiveSubscription);
      setHasPrivateAccess(access.hasPrivateAccess);
      setHasSmallGroupAccess(access.hasSmallGroupAccess);
      setHasCollectiveAccess(access.hasCollectiveAccess);
      setPlanName(access.planName || "Formule Active");
      setActivePlanNames(access.activePlanNames || []);
      setPrivateSessionsQuota(access.privateSessionsQuota ?? 8);

      const quotaStatus = await getMemberPrivateQuotaStatus(supabase);
      if (quotaStatus.success) {
        setPrivateQuota(quotaStatus);
      }

      // Récupération des réservations réelles de l'utilisateur
      const realBookings = await getMemberUpcomingBookings(supabase, user.id);
      console.log("[MemberContext] Réservations de l'utilisateur :", realBookings.length, realBookings);
      setUserBookings(realBookings);

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
    console.log("[MemberContext] --> bookSmallGroup appelé avec sessionId :", sessionId, "currentUserId :", currentUserId);

    if (!sessionId || !sessionId.includes("-")) {
      const msg = `Identifiant de séance invalide ou non UUID : ${sessionId}`;
      console.error("[MemberContext] ERREUR :", msg);
      return { success: false, error: msg };
    }

    const result = await apiBookSmallGroup(supabase, sessionId);
    console.log("[MemberContext] <-- Résultat apiBookSmallGroup :", result);

    if (!result.success) {
      return { success: false, error: result.error || "Impossible d'effectuer la réservation." };
    }

    console.log("[MemberContext] ✅ Réservation validée, rafraîchissement des données...");
    await refreshMemberData();
    return { success: true, bookingId: result.bookingId };
  };

  // Annulation Small Group réelle via RPC Supabase
  const cancelSmallGroup = async (bookingId: string) => {
    console.log("[MemberContext] --> cancelSmallGroup appelé avec bookingId :", bookingId);

    if (!bookingId || !bookingId.includes("-")) {
      const msg = `Identifiant de réservation invalide : ${bookingId}`;
      console.error("[MemberContext] ERREUR :", msg);
      return { success: false, error: msg };
    }

    const result = await apiCancelSmallGroup(supabase, bookingId);
    console.log("[MemberContext] <-- Résultat apiCancelSmallGroup :", result);

    if (!result.success) {
      return { success: false, error: result.error || "Impossible d'annuler cette réservation." };
    }

    console.log("[MemberContext] ✅ Annulation validée, rafraîchissement des données...");
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
        hasCollectiveAccess,
        planName,
        activePlanNames,
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
