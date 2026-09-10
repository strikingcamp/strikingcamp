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
    // 1. Vérification stricte de l'authentification : seuls les membres connectés peuvent charger le résumé des réservations
    const authSupabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await authSupabase.auth.getUser();

    if (authError || !user) {
      return [];
    }

    const currentUserId = user.id;

    // 2. Utilisation sécurisée du client admin côté serveur pour agréger les comptages
    let supabase = null;
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        supabase = createAdminClient();
      } catch (adminErr) {
        console.warn("[getConfirmedBookingsSummaryAction] Erreur createAdminClient, fallback authSupabase :", adminErr);
      }
    }

    if (!supabase) {
      supabase = authSupabase;
    }

    // 3. Réservations confirmées des membres
    const { data: memberBookings, error: memberErr } = await supabase
      .from("bookings")
      .select("class_session_id, user_id")
      .eq("status", "confirmed")
      .not("class_session_id", "is", null);

    if (memberErr) {
      console.error("[getConfirmedBookingsSummaryAction] Erreur lecture bookings :", memberErr);
    }

    // 4. Réservations d'essai confirmées des prospects
    const { data: trialBookings, error: trialErr } = await supabase
      .from("trial_bookings")
      .select("id, class_session_id")
      .eq("status", "confirmed")
      .not("class_session_id", "is", null);

    if (trialErr) {
      console.warn("[getConfirmedBookingsSummaryAction] Erreur lecture trial_bookings :", trialErr);
    }

    const summaries: ConfirmedBookingSummary[] = [];

    // Masquage de confidentialité : seul l'user_id de l'utilisateur connecté est conservé tel quel
    // Les autres membres sont anonymisés sous 'other_member' pour protéger leur vie privée tout en conservant le décompte exact
    if (memberBookings && Array.isArray(memberBookings)) {
      for (const b of memberBookings) {
        if (b.class_session_id) {
          const isMe = b.user_id === currentUserId;
          summaries.push({
            class_session_id: b.class_session_id as string,
            user_id: isMe ? currentUserId : "other_member",
          });
        }
      }
    }

    if (trialBookings && Array.isArray(trialBookings)) {
      for (const tb of trialBookings) {
        if (tb.class_session_id) {
          summaries.push({
            class_session_id: tb.class_session_id as string,
            user_id: "trial_booked",
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
