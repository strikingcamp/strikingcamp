"use client";

import React, { createContext, useContext, useState } from "react";

export type BookingSlot = {
  id?: string;
  discipline: string;
  sessionType: "Small Group" | "Séance Privée" | "Collectifs";
  day: string;
  time: string;
  level?: string;
  status?: string;
  date?: string;
};

interface MemberContextType {
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

  // Private Session Modal
  isPrivateSessionOpen: boolean;
  openPrivateSession: () => void;
  closePrivateSession: () => void;

  // Private Coaching Access Logic (V1 interface readiness)
  hasPrivateAccess: boolean;
  setHasPrivateAccess: (hasAccess: boolean) => void;
  togglePrivateAccess: () => void;

  // Private Slots Reserved State (Mock/UI state)
  reservedPrivateSlots: Record<string, string[]>;
  isPrivateSlotReserved: (day: string, time: string) => boolean;
  reservePrivateSlot: (day: string, time: string) => void;

  // Mock Bookings list for V1 interaction testing
  userBookings: BookingSlot[];
  addBooking: (slot: BookingSlot) => void;
  removeBooking: (slotIdOrTime: string) => void;
}

const MemberContext = createContext<MemberContextType | undefined>(undefined);

export function MemberProvider({ children }: { children: React.ReactNode }) {
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);
  const [isBookingConfirmOpen, setIsBookingConfirmOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<BookingSlot | null>(null);

  const [isBookingCancelOpen, setIsBookingCancelOpen] = useState(false);
  const [slotToCancel, setSlotToCancel] = useState<BookingSlot | null>(null);

  const [isPrivateSessionOpen, setIsPrivateSessionOpen] = useState(false);

  // Droit d'accès aux séances privées (V1 interface : modifiable pour tester les 2 cas)
  const [hasPrivateAccess, setHasPrivateAccess] = useState(true);

  // État des créneaux privés réservés par jour (pour tester l'état gris/désactivé)
  const [reservedPrivateSlots, setReservedPrivateSlots] = useState<Record<string, string[]>>({
    Lundi: ["08:00 – 08:50", "15:00 – 15:50"],
    Mardi: ["10:00 – 10:50"],
    Mercredi: ["09:00 – 09:50", "14:00 – 14:50"],
    Jeudi: ["08:00 – 08:50", "16:00 – 16:50"],
    Vendredi: ["14:00 – 14:50"],
    Samedi: ["09:00 – 09:50"],
  });

  // Pour la V1, on initialise avec une réservation exemple pour voir le rendu de la carte
  const [userBookings, setUserBookings] = useState<BookingSlot[]>([
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

  const isPrivateSlotReserved = (day: string, time: string) => {
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

  const addBooking = (slot: BookingSlot) => {
    const newBooking: BookingSlot = {
      ...slot,
      id: `booking-${Date.now()}`,
      status: "Réservation confirmée",
    };
    setUserBookings((prev) => [newBooking, ...prev]);

    if (slot.sessionType === "Séance Privée") {
      reservePrivateSlot(slot.day, slot.time);
    }
  };

  const removeBooking = (idOrTime: string) => {
    setUserBookings((prev) =>
      prev.filter((b) => b.id !== idOrTime && `${b.day}-${b.time}` !== idOrTime)
    );
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
        isPrivateSessionOpen,
        openPrivateSession,
        closePrivateSession,
        hasPrivateAccess,
        setHasPrivateAccess,
        togglePrivateAccess,
        reservedPrivateSlots,
        isPrivateSlotReserved,
        reservePrivateSlot,
        userBookings,
        addBooking,
        removeBooking,
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
