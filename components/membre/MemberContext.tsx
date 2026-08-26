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
  getMemberPrivateQuota,
  getPrivateSlotsWithAvailability,
  getMemberUpcomingPrivateBookings,
  bookPrivateSlot as apiBookPrivateSlot,
  cancelPrivateBooking as apiCancelPrivateBooking,
  type MemberPrivateQuota,
  type FormattedPrivateSlot,
  type BookingWithSlot,
} from "@/lib/supabase/private-sessions";

export type BookingSlot = {
  id?: string;
  discipline: string;
  sessionType: "Small Group" | "Séance Privée" | "Collectifs";
  day: string;
  time: string;
  level?: string;
  status?: string;
  date?: string;
  startsAt?: string;
  isPrivate?: boolean;
  privateSlotId?: string;
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

  // Private Session Modal
  isPrivateSessionOpen: boolean;
  openPrivateSession: () => void;
  closePrivateSession: () => void;

  // Private Coaching Access & Quota (Supabase real state)
  hasPrivateAccess: boolean;
  setHasPrivateAccess: (hasAccess: boolean) => void;
  togglePrivateAccess: () => void;
  privateQuota: MemberPrivateQuota | null;
  privateSlots: FormattedPrivateSlot[];
  isLoadingPrivateData: boolean;

  // Private Slots Reserved State Helper
  reservedPrivateSlots: Record<string, string[]>;
  isPrivateSlotReserved: (day: string, time: string) => boolean;
  reservePrivateSlot: (day: string, time: string) => void;

  // Unified Bookings list (Supabase real bookings + mock small group)
  userBookings: BookingSlot[];
  addBooking: (slot: BookingSlot) => void;
  removeBooking: (slotIdOrTime: string) => void;

  // Supabase actions
  refreshMemberData: () => Promise<void>;
  bookPrivateSession: (
    slotId: string,
    discipline: string
  ) => Promise<{ success: boolean; error?: string }>;
  cancelPrivateSession: (
    bookingId: string
  ) => Promise<{ success: boolean; error?: string; isWithin24h?: boolean }>;
}

const MemberContext = createContext<MemberContextType | undefined>(undefined);

export function MemberProvider({ children }: { children: React.ReactNode }) {
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);
  const [isBookingConfirmOpen, setIsBookingConfirmOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<BookingSlot | null>(null);

  const [isBookingCancelOpen, setIsBookingCancelOpen] = useState(false);
  const [slotToCancel, setSlotToCancel] = useState<BookingSlot | null>(null);

  const [isPrivateSessionOpen, setIsPrivateSessionOpen] = useState(false);

  // Supabase real state for private coaching
  const [hasPrivateAccess, setHasPrivateAccess] = useState(true);
  const [privateQuota, setPrivateQuota] = useState<MemberPrivateQuota | null>(
    null
  );
  const [privateSlots, setPrivateSlots] = useState<FormattedPrivateSlot[]>([]);
  const [supabasePrivateBookings, setSupabasePrivateBookings] = useState<
    BookingWithSlot[]
  >([]);
  const [isLoadingPrivateData, setIsLoadingPrivateData] = useState(true);

  // Fallback mock Small Group bookings
  const [mockBookings, setMockBookings] = useState<BookingSlot[]>([
    {
      id: "mock-1",
      discipline: "Kick Boxing",
      sessionType: "Small Group",
      day: "Mardi",
      time: "18:00",
      level: "Fondamentaux",
      status: "Réservation confirmée",
    },
  ]);

  // Fallback local reserved slots
  const [reservedPrivateSlots, setReservedPrivateSlots] = useState<
    Record<string, string[]>
  >({
    Lundi: ["08:00 – 08:50", "15:00 – 15:50"],
    Mardi: ["10:00 – 10:50"],
    Mercredi: ["09:00 – 09:50", "14:00 – 14:50"],
    Jeudi: ["08:00 – 08:50", "16:00 – 16:50"],
    Vendredi: ["14:00 – 14:50"],
    Samedi: ["09:00 – 09:50"],
  });

  const supabase = createClient();

  // Charge toutes les données Supabase pour l'utilisateur
  const refreshMemberData = useCallback(async () => {
    try {
      setIsLoadingPrivateData(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setIsLoadingPrivateData(false);
        return;
      }

      const [quotaData, slotsData, upcomingData] = await Promise.all([
        getMemberPrivateQuota(supabase, user.id),
        getPrivateSlotsWithAvailability(supabase, user.id),
        getMemberUpcomingPrivateBookings(supabase, user.id),
      ]);

      setPrivateQuota(quotaData);
      setHasPrivateAccess(quotaData.hasPrivateAccess);
      setPrivateSlots(slotsData);
      setSupabasePrivateBookings(upcomingData);
    } catch (err) {
      console.error("Erreur refreshMemberData :", err);
    } finally {
      setIsLoadingPrivateData(false);
    }
  }, [supabase]);

  useEffect(() => {
    refreshMemberData();
  }, [refreshMemberData]);

  // Modals actions
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

  const openPrivateSession = () => setIsPrivateSessionOpen(true);
  const closePrivateSession = () => setIsPrivateSessionOpen(false);

  const togglePrivateAccess = () => setHasPrivateAccess((prev) => !prev);

  // Helper disponibilité créneau
  const isPrivateSlotReserved = (day: string, time: string) => {
    // Si des créneaux Supabase sont chargés pour ce jour et cette heure
    if (privateSlots.length > 0) {
      const match = privateSlots.find(
        (s) => s.dayName.toLowerCase() === day.toLowerCase() && s.timeSlot === time
      );
      if (match) return match.isReserved;
    }
    const reservedForDay = reservedPrivateSlots[day] || [];
    return reservedForDay.includes(time);
  };

  const reservePrivateSlot = (day: string, time: string) => {
    setReservedPrivateSlots((prev) => {
      const currentDay = prev[day] || [];
      if (!currentDay.includes(time)) {
        return {
          ...prev,
          [day]: [...currentDay, time],
        };
      }
      return prev;
    });
  };

  // Réservation d'une séance privée via Supabase
  const bookPrivateSession = async (slotId: string, discipline: string) => {
    const res = await apiBookPrivateSlot(supabase, { slotId, discipline });
    if (res.success) {
      await refreshMemberData();
    }
    return res;
  };

  // Annulation d'une séance privée via Supabase
  const cancelPrivateSession = async (bookingId: string) => {
    const res = await apiCancelPrivateBooking(supabase, bookingId);
    if (res.success) {
      await refreshMemberData();
    }
    return res;
  };

  const addBooking = (slot: BookingSlot) => {
    const newBooking: BookingSlot = {
      ...slot,
      id: `mock-booking-${Date.now()}`,
      status: "Réservation confirmée",
    };
    setMockBookings((prev) => [newBooking, ...prev]);

    if (slot.sessionType === "Séance Privée") {
      reservePrivateSlot(slot.day, slot.time);
    }
  };

  const removeBooking = (idOrTime: string) => {
    setMockBookings((prev) =>
      prev.filter((b) => b.id !== idOrTime && `${b.day}-${b.time}` !== idOrTime)
    );
  };

  // Combine Supabase Real Private Bookings + Mock Small Group Bookings
  const DAY_NAMES_FR = [
    "Dimanche",
    "Lundi",
    "Mardi",
    "Mercredi",
    "Jeudi",
    "Vendredi",
    "Samedi",
  ];
  const MONTH_NAMES_FR = [
    "Janvier",
    "Février",
    "Mars",
    "Avril",
    "Mai",
    "Juin",
    "Juillet",
    "Août",
    "Septembre",
    "Octobre",
    "Novembre",
    "Décembre",
  ];

  const formattedSupabaseBookings: BookingSlot[] = supabasePrivateBookings.map(
    (b) => {
      let dayName = "Séance Privée";
      let timeFormatted = "";
      let fullDateStr = "";

      if (b.private_slot?.starts_at) {
        const start = new Date(b.private_slot.starts_at);
        const end = b.private_slot.ends_at
          ? new Date(b.private_slot.ends_at)
          : new Date(start.getTime() + 50 * 60000);

        dayName = DAY_NAMES_FR[start.getDay()];
        fullDateStr = `${start.getDate()} ${MONTH_NAMES_FR[start.getMonth()]}`;

        const sh = String(start.getHours()).padStart(2, "0");
        const sm = String(start.getMinutes()).padStart(2, "0");
        const eh = String(end.getHours()).padStart(2, "0");
        const em = String(end.getMinutes()).padStart(2, "0");
        timeFormatted = `${sh}:${sm} – ${eh}:${em}`;
      }

      return {
        id: b.id,
        discipline: b.discipline || "Séance Privée Sur-Mesure",
        sessionType: "Séance Privée",
        day: dayName,
        date: fullDateStr,
        time: timeFormatted,
        level: "1 to 1 Sur-Mesure",
        status:
          b.status === "confirmed" ? "Réservation confirmée" : "Annulée",
        startsAt: b.private_slot?.starts_at,
        isPrivate: true,
        privateSlotId: b.private_slot_id || undefined,
      };
    }
  );

  const userBookings = [
    ...formattedSupabaseBookings,
    ...mockBookings,
  ];

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
        isPrivateSessionOpen,
        openPrivateSession,
        closePrivateSession,
        hasPrivateAccess,
        setHasPrivateAccess,
        togglePrivateAccess,
        privateQuota,
        privateSlots,
        isLoadingPrivateData,
        reservedPrivateSlots,
        isPrivateSlotReserved,
        reservePrivateSlot,
        userBookings,
        addBooking,
        removeBooking,
        refreshMemberData,
        bookPrivateSession,
        cancelPrivateSession,
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
