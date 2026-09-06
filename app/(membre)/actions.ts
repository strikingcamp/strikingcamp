"use server";

import { createAdminClient } from "@/lib/supabase/server";

export interface ConfirmedBookingSummary {
  class_session_id: string;
  user_id: string;
}

/**
 * Récupère l'ensemble des réservations confirmées en base (Small Group et Cours Privés)
 * de manière sécurisée côté serveur (via createAdminClient service_role), afin de permettre
 * au planning membre de déterminer avec exactitude les créneaux déjà réservés (isOccupiedByOther)
 * pour n'importe quel membre connecté sans être bloqué par la politique RLS du navigateur.
 *
 * Respect absolu de la vie privée : seules les colonnes minimales nécessaires (class_session_id, user_id)
 * sont interrogées et renvoyées (aucun nom, email, téléphone ou profil).
 */
export async function getConfirmedBookingsSummaryAction(): Promise<ConfirmedBookingSummary[]> {
  try {
    const adminSupabase = createAdminClient();
    const { data, error } = await adminSupabase
      .from("bookings")
      .select("class_session_id, user_id")
      .eq("status", "confirmed")
      .not("class_session_id", "is", null);

    if (error) {
      console.error("[getConfirmedBookingsSummaryAction] Erreur lecture bookings :", error);
      return [];
    }

    return (data || []).map((b) => ({
      class_session_id: b.class_session_id as string,
      user_id: b.user_id as string,
    }));
  } catch (err) {
    console.error("[getConfirmedBookingsSummaryAction] Exception :", err);
    return [];
  }
}

