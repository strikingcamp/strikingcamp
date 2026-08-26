import { SupabaseClient } from "@supabase/supabase-js";

export interface Plan {
  id: string;
  name: string;
  code?: string | null;
  type?: string | null; // enum: 'private' | 'small_group' | 'collective' etc.
  commitment?: string | null;
  private_sessions_per_period?: number | null; // 8 or 12
  is_active?: boolean;
  [key: string]: unknown;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  started_at: string;
  expires_at?: string | null;
  plan?: Plan | null;
  [key: string]: unknown;
}

export interface PrivateSlot {
  id: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  [key: string]: unknown;
}

export interface BookingWithSlot {
  id: string;
  user_id: string;
  private_slot_id: string | null;
  class_session_id: string | null;
  status: string;
  created_at: string;
  cancelled_at?: string | null;
  discipline?: string | null;
  private_slot?: PrivateSlot | null;
  [key: string]: unknown;
}

export interface MemberPrivateQuota {
  hasPrivateAccess: boolean;
  planName?: string;
  totalQuota: number;
  usedQuota: number;
  remainingQuota: number;
  periodStart?: Date;
  periodEnd?: Date;
  periodStartIso?: string;
  periodEndIso?: string;
}

export interface FormattedPrivateSlot {
  id: string;
  dayName: string; // e.g. "Lundi"
  dateFormatted: string; // e.g. "15 Septembre"
  fullDate: string; // YYYY-MM-DD
  timeSlot: string; // e.g. "08:00 – 08:50"
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  isReserved: boolean;
  reservedByCurrentUser: boolean;
}

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

function unwrapSingle<T>(val: T | T[] | null | undefined): T | null {
  if (!val) return null;
  if (Array.isArray(val)) return val.length > 0 ? val[0] : null;
  return val;
}

/**
 * Calcule la période mensuelle courante [periodStart, periodEnd]
 * à partir de la date anniversaire subscriptions.started_at
 */
export function getCurrentSubscriptionPeriod(
  startedAtIso: string,
  referenceDate: Date = new Date()
): { periodStart: Date; periodEnd: Date } {
  const startAnchor = new Date(startedAtIso);
  if (isNaN(startAnchor.getTime())) {
    const now = referenceDate;
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return { periodStart: start, periodEnd: end };
  }

  const anchorDay = startAnchor.getDate();
  const anchorHours = startAnchor.getHours();
  const anchorMinutes = startAnchor.getMinutes();
  const anchorSeconds = startAnchor.getSeconds();

  let year = startAnchor.getFullYear();
  let month = startAnchor.getMonth();

  let pStart = new Date(year, month, anchorDay, anchorHours, anchorMinutes, anchorSeconds);
  let pEnd = new Date(year, month + 1, anchorDay, anchorHours, anchorMinutes, anchorSeconds);

  if (referenceDate < pStart) {
    return { periodStart: pStart, periodEnd: pEnd };
  }

  while (referenceDate >= pEnd) {
    month++;
    pStart = pEnd;
    pEnd = new Date(year, month + 1, anchorDay, anchorHours, anchorMinutes, anchorSeconds);
  }

  return { periodStart: pStart, periodEnd: pEnd };
}

/**
 * Vérifie si un plan donne accès aux séances privées et extrait son quota (8 ou 12)
 * en utilisant exclusivement les colonnes réelles : plans.type = 'private' et plans.private_sessions_per_period
 */
export function extractPrivateQuotaFromPlan(plan: Plan | null | undefined): {
  hasPrivateAccess: boolean;
  quota: number;
} {
  if (!plan) {
    return { hasPrivateAccess: false, quota: 0 };
  }

  const isPrivate = plan.type === "private";
  const quota = plan.private_sessions_per_period;

  if (isPrivate && typeof quota === "number" && (quota === 8 || quota === 12)) {
    return { hasPrivateAccess: true, quota };
  }

  // Fallback si quota valide
  if (isPrivate && typeof quota === "number" && quota > 0) {
    return { hasPrivateAccess: true, quota };
  }

  return { hasPrivateAccess: false, quota: 0 };
}

/**
 * Récupère l'abonnement actif du membre avec son plan
 */
export async function getMemberActiveSubscription(
  supabase: SupabaseClient,
  userId: string
): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*, plan:plans(*)")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Erreur lors de la récupération de l'abonnement :", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return null;
  }

  if (!data) return null;

  const raw = data as Record<string, unknown>;
  const plan = unwrapSingle(raw.plan as Plan | Plan[]);

  return {
    ...raw,
    plan,
  } as Subscription;
}

/**
 * Calcule le quota du membre en tenant compte des réservations de la période courante
 * Règle d'annulation :
 * - Annulation >= 24h avant le début : non consommée (quota préservé).
 * - Annulation < 24h avant le début : consommée (décomptée du quota).
 */
export async function getMemberPrivateQuota(
  supabase: SupabaseClient,
  userId: string
): Promise<MemberPrivateQuota> {
  const subscription = await getMemberActiveSubscription(supabase, userId);

  if (!subscription) {
    return {
      hasPrivateAccess: false,
      totalQuota: 0,
      usedQuota: 0,
      remainingQuota: 0,
    };
  }

  const { hasPrivateAccess, quota: totalQuota } = extractPrivateQuotaFromPlan(
    subscription.plan
  );

  if (!hasPrivateAccess || totalQuota <= 0) {
    return {
      hasPrivateAccess: false,
      planName: subscription.plan?.name,
      totalQuota: 0,
      usedQuota: 0,
      remainingQuota: 0,
    };
  }

  const { periodStart, periodEnd } = getCurrentSubscriptionPeriod(
    subscription.started_at
  );

  // Récupérer les réservations privées du membre
  const { data: bookings, error } = await supabase
    .from("bookings")
    .select("id, user_id, private_slot_id, status, created_at, cancelled_at, private_slot:private_slots(id, starts_at, ends_at)")
    .eq("user_id", userId)
    .not("private_slot_id", "is", null);

  if (error) {
    console.error("Erreur lors de la récupération des réservations :", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return {
      hasPrivateAccess: true,
      planName: subscription.plan?.name,
      totalQuota,
      usedQuota: 0,
      remainingQuota: totalQuota,
      periodStart,
      periodEnd,
      periodStartIso: periodStart.toISOString(),
      periodEndIso: periodEnd.toISOString(),
    };
  }

  let usedCount = 0;

  for (const rawBooking of (bookings || []) as Record<string, unknown>[]) {
    const bookingDate = new Date(rawBooking.created_at as string);
    const rawSlot = unwrapSingle(rawBooking.private_slot as PrivateSlot | PrivateSlot[]);

    // Vérifier si la réservation appartient à la période courante
    if (bookingDate >= periodStart && bookingDate < periodEnd) {
      if (rawBooking.status === "confirmed") {
        usedCount += 1;
      } else if (rawBooking.status === "cancelled") {
        // Règle des 24h
        const slotStartsAt = rawSlot?.starts_at
          ? new Date(rawSlot.starts_at)
          : null;
        const cancelledAt = rawBooking.cancelled_at
          ? new Date(rawBooking.cancelled_at as string)
          : null;

        if (slotStartsAt && cancelledAt) {
          const diffMs = slotStartsAt.getTime() - cancelledAt.getTime();
          const diffHours = diffMs / (1000 * 60 * 60);

          // Si annulé moins de 24h avant le début -> comptabilisé
          if (diffHours < 24) {
            usedCount += 1;
          }
        } else if (!cancelledAt) {
          // Annulation sans date précisée -> reste comptabilisée par précaution
          usedCount += 1;
        }
      }
    }
  }

  const remainingQuota = Math.max(0, totalQuota - usedCount);

  return {
    hasPrivateAccess: true,
    planName: subscription.plan?.name,
    totalQuota,
    usedQuota: usedCount,
    remainingQuota,
    periodStart,
    periodEnd,
    periodStartIso: periodStart.toISOString(),
    periodEndIso: periodEnd.toISOString(),
  };
}

/**
 * Récupère tous les créneaux privés actifs et calcule leur disponibilité
 * en interrogeant la fonction RPC get_reserved_private_slot_ids()
 */
export async function getPrivateSlotsWithAvailability(
  supabase: SupabaseClient,
  currentUserId?: string
): Promise<FormattedPrivateSlot[]> {
  const now = new Date();

  // 1. Récupérer les créneaux privés actifs dont la fin est future
  const { data: slots, error: slotsError } = await supabase
    .from("private_slots")
    .select("id, starts_at, ends_at, is_active")
    .eq("is_active", true)
    .gte("ends_at", now.toISOString())
    .order("starts_at", { ascending: true });

  if (slotsError) {
    console.error("Erreur slots privés :", {
      message: slotsError.message,
      code: slotsError.code,
      details: slotsError.details,
      hint: slotsError.hint,
    });
    return [];
  }

  if (!slots || slots.length === 0) {
    return [];
  }

  // 2. Récupérer la liste anonymisée des IDs de créneaux réservés via la RPC SECURITY DEFINER
  const { data: reservedSlotIds, error: rpcError } = await supabase.rpc(
    "get_reserved_private_slot_ids"
  );

  if (rpcError) {
    console.error("Erreur RPC get_reserved_private_slot_ids :", {
      message: rpcError.message,
      code: rpcError.code,
      details: rpcError.details,
      hint: rpcError.hint,
    });
  }

  const reservedSet = new Set<string>();
  if (Array.isArray(reservedSlotIds)) {
    for (const item of reservedSlotIds) {
      if (typeof item === "string") {
        reservedSet.add(item);
      } else if (item && typeof item === "object" && "private_slot_id" in item) {
        reservedSet.add(item.private_slot_id as string);
      }
    }
  }

  // 3. Récupérer les réservations de l'utilisateur actuel pour marquer ses propres créneaux
  const userBookedSlotIds = new Set<string>();
  if (currentUserId) {
    const { data: userBookings } = await supabase
      .from("bookings")
      .select("private_slot_id")
      .eq("user_id", currentUserId)
      .eq("status", "confirmed")
      .not("private_slot_id", "is", null);

    for (const b of userBookings || []) {
      if (b.private_slot_id) userBookedSlotIds.add(b.private_slot_id);
    }
  }

  return slots.map((slot) => {
    const startDate = new Date(slot.starts_at);
    const endDate = new Date(slot.ends_at);

    const dayName = DAY_NAMES_FR[startDate.getDay()];
    const dateFormatted = `${startDate.getDate()} ${MONTH_NAMES_FR[startDate.getMonth()]}`;
    const fullDate = startDate.toISOString().split("T")[0];

    const startHours = String(startDate.getHours()).padStart(2, "0");
    const startMins = String(startDate.getMinutes()).padStart(2, "0");
    const endHours = String(endDate.getHours()).padStart(2, "0");
    const endMins = String(endDate.getMinutes()).padStart(2, "0");
    const timeSlot = `${startHours}:${startMins} – ${endHours}:${endMins}`;

    const isReserved = reservedSet.has(slot.id);
    const reservedByCurrentUser = userBookedSlotIds.has(slot.id);

    return {
      id: slot.id,
      dayName,
      dateFormatted,
      fullDate,
      timeSlot,
      startsAt: slot.starts_at,
      endsAt: slot.ends_at,
      isActive: slot.is_active,
      isReserved,
      reservedByCurrentUser,
    };
  });
}

/**
 * Récupère les prochaines réservations de séances privées du membre connecté
 */
export async function getMemberUpcomingPrivateBookings(
  supabase: SupabaseClient,
  userId: string
): Promise<BookingWithSlot[]> {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("bookings")
    .select("id, user_id, private_slot_id, class_session_id, status, created_at, cancelled_at, private_slot:private_slots(id, starts_at, ends_at, is_active)")
    .eq("user_id", userId)
    .eq("status", "confirmed")
    .not("private_slot_id", "is", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erreur prochaines réservations :", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return [];
  }

  const result: BookingWithSlot[] = [];

  for (const raw of (data || []) as Record<string, unknown>[]) {
    const slot = unwrapSingle(raw.private_slot as PrivateSlot | PrivateSlot[]);
    if (!slot?.starts_at || new Date(slot.starts_at).toISOString() >= now) {
      result.push({
        ...(raw as unknown as BookingWithSlot),
        private_slot: slot,
      });
    }
  }

  return result;
}

/**
 * Crée une réservation de séance privée via la fonction RPC create_private_booking
 */
export async function bookPrivateSlot(
  supabase: SupabaseClient,
  params: {
    slotId: string;
    discipline?: string;
  }
): Promise<{ success: boolean; error?: string; bookingId?: string; quotaRemaining?: number }> {
  const { data, error } = await supabase.rpc("create_private_booking", {
    p_private_slot_id: params.slotId,
  });

  if (error) {
    console.error("Erreur RPC create_private_booking :", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return {
      success: false,
      error: error.message || "Une erreur est survenue lors de la réservation.",
    };
  }

  if (data && typeof data === "object") {
    if (!data.success) {
      return {
        success: false,
        error: (data.error as string) || "Impossible de réserver ce créneau.",
      };
    }

    return {
      success: true,
      bookingId: data.booking_id as string,
      quotaRemaining: data.quota_remaining as number,
    };
  }

  return {
    success: false,
    error: "Réponse inattendue du serveur.",
  };
}

/**
 * Annule une réservation privée via la fonction RPC cancel_private_booking
 */
export async function cancelPrivateBooking(
  supabase: SupabaseClient,
  bookingId: string
): Promise<{ success: boolean; error?: string; isWithin24h?: boolean }> {
  const { data, error } = await supabase.rpc("cancel_private_booking", {
    p_booking_id: bookingId,
  });

  if (error) {
    console.error("Erreur RPC cancel_private_booking :", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return {
      success: false,
      error: error.message || "Erreur lors de l'annulation de la réservation.",
    };
  }

  if (data && typeof data === "object") {
    if (!data.success) {
      return {
        success: false,
        error: (data.error as string) || "Impossible d'annuler cette réservation.",
      };
    }

    return {
      success: true,
      isWithin24h: data.is_within_24h as boolean,
    };
  }

  return {
    success: false,
    error: "Réponse inattendue du serveur.",
  };
}
