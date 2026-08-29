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
  type SmallGroupBooking,
} from "@/lib/supabase/small-group";

export type BookingSlot = {
  id?: string;
  discipline: string;
  sessionType: "Cours Privé" | "Small Group" | "Collectifs";
  day: string;
  time: string;
  level?: string;
  status?: string;
  date?: string;
  classSessionId?: string;
};

interface MemberContextType {
  // Quick Action Modal (+)
  isQuickActionOpen: boolean;
  openQuickAction: () => void;
  closeQuickAction: () => void;

  // Booking Confirm Modal (Small Group)
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
  isLoadingData: boolean;

  // Available sessions in database
  availableSessions: ClassSession[];

  // Real bookings list from Supabase
  userBookings: BookingSlot[];

  // Supabase RPC Actions
  bookSmallGroup: (slot: BookingSlot) => Promise<{ success: boolean; error?: string }>;
  cancelSmallGroup: (bookingId: string) => Promise<{ success: boolean; error?: string }>;
  refreshMemberData: () => Promise<void>;
}

const MemberContext = createContext<MemberContextType | undefined>(undefined);

export function MemberProvider({ children }: { children: React.ReactNode }) {
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);
  const [isBookingConfirmOpen, setIsBookingConfirmOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<BookingSlot | null>(null);

  const [isBookingCancelOpen, setIsBookingCancelOpen] = useState(false);
  const [slotToCancel, setSlotToCancel] = useState<BookingSlot | null>(null);

  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [hasPrivateAccess, setHasPrivateAccess] = useState(false);
  const [hasSmallGroupAccess, setHasSmallGroupAccess] = useState(false);
  const [hasCollectiveAccess, setHasCollectiveAccess] = useState(false);
  const [planName, setPlanName] = useState("");
  const [activePlanNames, setActivePlanNames] = useState<string[]>([]);
  const [privateSessionsQuota, setPrivateSessionsQuota] = useState<number | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Sessions disponibles et Réservations réelles depuis Supabase
  const [availableSessions, setAvailableSessions] = useState<ClassSession[]>([]);
  const [userBookings, setUserBookings] = useState<BookingSlot[]>([]);

  const supabase = createClient();

  const refreshMemberData = useCallback(async () => {
    try {
      setIsLoadingData(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setIsLoadingData(false);
        return;
      }

      // 1. Récupération des droits d'accès cumulés
      const access = await getMemberPlanAccess(supabase, user.id);
      setHasActiveSubscription(access.hasActiveSubscription);
      setHasPrivateAccess(access.hasPrivateAccess);
      setHasSmallGroupAccess(access.hasSmallGroupAccess);
      setHasCollectiveAccess(access.hasCollectiveAccess);
      setPlanName(access.planName || "");
      setActivePlanNames(access.activePlanNames || []);
      setPrivateSessionsQuota(access.privateSessionsQuota ?? null);

      // 2. Récupération des sessions actives de cours
      const sessions = await getActiveClassSessions(supabase);
      setAvailableSessions(sessions);

      // 3. Récupération des réservations réelles de l'utilisateur
      const realBookings = await getMemberUpcomingBookings(supabase, user.id);
      setUserBookings(
        realBookings.map((b) => ({
          id: b.id,
          discipline: b.discipline,
          sessionType: b.sessionType,
          day: b.day,
          time: b.time,
          date: b.date,
          level: b.level,
          status: b.status,
          classSessionId: b.class_session_id || undefined,
        }))
      );
    } catch (err) {
      console.error("Erreur lors de l'actualisation des données membre :", err);
    } finally {
      setIsLoadingData(false);
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

  // Réservation via la fonction RPC Supabase create_small_group_booking (AUCUN FALLBACK LOCAL)
  const bookSmallGroup = async (slot: BookingSlot) => {
    let targetSessionId = slot.classSessionId;

    // Si le slot n'a pas encore de classSessionId, chercher la correspondance dans availableSessions
    if (!targetSessionId && availableSessions.length > 0) {
      const match = availableSessions.find(
        (s) =>
          s.discipline.toLowerCase() === slot.discipline.toLowerCase() &&
          s.type === "small_group"
      );
      if (match) {
        targetSessionId = match.id;
      }
    }

    if (!targetSessionId) {
      console.error("Impossible de réserver : aucun identifiant class_session_id disponible.");
      return {
        success: false,
        error: "Aucune séance correspondante trouvée dans la base de données (public.class_sessions).",
      };
    }

    const res = await apiBookSmallGroup(supabase, targetSessionId);

    if (res.success) {
      await refreshMemberData();
      return { success: true };
    }

    return { success: false, error: res.error };
  };

  // Annulation via la fonction RPC Supabase cancel_small_group_booking
  const cancelSmallGroup = async (bookingId: string) => {
    const res = await apiCancelSmallGroup(supabase, bookingId);

    if (res.success) {
      await refreshMemberData();
      return { success: true };
    }

    return { success: false, error: res.error };
  };

  return (
    <MemberContext.Provider
      value={{
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
        isLoadingData,
        availableSessions,
        userBookings,
        bookSmallGroup,
        cancelSmallGroup,
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
    throw new Error("useMember must be used within a MemberProvider");
  }
  return context;
}
