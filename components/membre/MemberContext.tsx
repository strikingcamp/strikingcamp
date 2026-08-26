"use client";

import React, { createContext, useContext, useState } from "react";

export type BookingSlot = {
  id?: string;
  discipline: string;
  sessionType: "Small Group" | "Collectifs";
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

  // Bookings list (Small Group)
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

  // Initialisation des réservations Small Group
  const [userBookings, setUserBookings] = useState<BookingSlot[]>([
    {
      id: "booking-1",
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

  const addBooking = (slot: BookingSlot) => {
    const newBooking: BookingSlot = {
      ...slot,
      id: `booking-${Date.now()}`,
      status: "Réservation confirmée",
    };
    setUserBookings((prev) => [newBooking, ...prev]);
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
