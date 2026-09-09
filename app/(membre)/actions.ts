"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";

export interface ConfirmedBookingSummary {
  class_session_id: string;
  user_id: string;
}

/**
 * Récupère l'ensemble des réservations confirmées en base (Small Group et Cours Privés, membres + essais)
 * de manière sécurisée côté serveur, afin de permettre au planning de déterminer avec exactitude
 * le nombre réel de places occupées (bookedCount) et les créneaux complets (isOccupiedByOther).
 *
 * Source de vérité unique :
 * - public.bookings (status = 'confirmed')
 * - public.trial_bookings (status = 'confirmed')
 */
export async function getConfirmedBookingsSummaryAction(): Promise<ConfirmedBookingSummary[]> {
  try {
    let supabase = null;
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        supabase = createAdminClient();
      } catch (adminErr) {
        console.warn("[getConfirmedBookingsSummaryAction] Erreur createAdminClient, fallback createClient :", adminErr);
      }
    }

    if (!supabase) {
      supabase = await createClient();
    }

    // 1. Réservations confirmées des membres
    const { data: memberBookings, error: memberErr } = await supabase
      .from("bookings")
      .select("class_session_id, user_id")
      .eq("status", "confirmed")
      .not("class_session_id", "is", null);

    if (memberErr) {
      console.error("[getConfirmedBookingsSummaryAction] Erreur lecture bookings :", memberErr);
    }

    // 2. Réservations d'essai confirmées des prospects
    const { data: trialBookings, error: trialErr } = await supabase
      .from("trial_bookings")
      .select("id, class_session_id")
      .eq("status", "confirmed")
      .not("class_session_id", "is", null);

    if (trialErr) {
      console.warn("[getConfirmedBookingsSummaryAction] Erreur lecture trial_bookings :", trialErr);
    }

    const summaries: ConfirmedBookingSummary[] = [];

    if (memberBookings && Array.isArray(memberBookings)) {
      for (const b of memberBookings) {
        if (b.class_session_id) {
          summaries.push({
            class_session_id: b.class_session_id as string,
            user_id: (b.user_id as string) || "member",
          });
        }
      }
    }

    if (trialBookings && Array.isArray(trialBookings)) {
      for (const tb of trialBookings) {
        if (tb.class_session_id) {
          summaries.push({
            class_session_id: tb.class_session_id as string,
            user_id: `trial_${tb.id}`,
          });
        }
      }
    }

    return summaries;
  } catch (err) {
    console.error("[getConfirmedBookingsSummaryAction] Exception :", err);
    return [];
  }
}
