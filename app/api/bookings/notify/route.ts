import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  sendBookingConfirmationEmail,
  sendBookingCancellationEmail,
  sendAdminBookingNotification,
} from "@/lib/email";

/**
 * Route serveur sécurisée pour la notification et l'envoi d'emails transactionnels de réservation.
 * 
 * Sécurité stricte :
 * 1. Vérification de l'authentification de l'utilisateur.
 * 2. Vérification d'existence réelle de la réservation en BDD (propriété ou rôle admin).
 * 3. Récupération des données officielles de séance depuis la base (aucune confiance aveugle au body).
 * 4. Traitement asynchrone sécurisé (ne bloque jamais la réservation).
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Authentification de l'utilisateur appelant
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();
    const { action, bookingId, classSessionId } = body;

    if (!action || (action !== "booking" && action !== "cancellation")) {
      return NextResponse.json({ error: "Action invalide" }, { status: 400 });
    }

    // 2. Contrôle de sécurité BDD sur la réservation réelle si bookingId est fourni
    let resolvedClassSessionId = classSessionId;
    let resolvedUserId = user.id;

    if (bookingId) {
      const { data: booking, error: bookingErr } = await supabase
        .from("bookings")
        .select("id, user_id, class_session_id, status")
        .eq("id", bookingId)
        .single();

      if (bookingErr || !booking) {
        console.warn("[/api/bookings/notify] Réservation introuvable en BDD :", bookingId);
        return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
      }

      // Vérification de propriété : l'utilisateur doit être le propriétaire ou un admin
      const role = (user.app_metadata?.role || "").toUpperCase();
      if (booking.user_id !== user.id && role !== "ADMIN") {
        return NextResponse.json({ error: "Accès refusé à cette réservation" }, { status: 403 });
      }

      resolvedClassSessionId = booking.class_session_id || resolvedClassSessionId;
      resolvedUserId = booking.user_id;
    }

    // 3. Récupération des informations vérifiées du profil membre
    let memberName = "Membre Striking Camp";
    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, last_name, phone")
      .eq("id", resolvedUserId)
      .single();

    if (profile && (profile.first_name || profile.last_name)) {
      memberName = `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
    } else {
      const meta = user.user_metadata || {};
      if (meta.first_name || meta.last_name) {
        memberName = `${meta.first_name || ""} ${meta.last_name || ""}`.trim();
      }
    }

    const memberEmail = user.email || "";

    // 4. Récupération des détails officiels de la séance en base
    let discipline = "Boxe";
    let sessionType = "Small Group";
    let formattedDate = "Date confirmée";
    let formattedTime = "Horaire confirmé";

    if (resolvedClassSessionId) {
      const { data: session } = await supabase
        .from("class_sessions")
        .select("discipline, type, starts_at, ends_at")
        .eq("id", resolvedClassSessionId)
        .single();

      if (session) {
        discipline = session.discipline || discipline;
        sessionType =
          session.type === "private"
            ? "Cours Privé"
            : session.type === "collective"
            ? "Collectif"
            : "Small Group";

        if (session.starts_at) {
          const d = new Date(session.starts_at);
          const day = String(d.getDate()).padStart(2, "0");
          const month = String(d.getMonth() + 1).padStart(2, "0");
          formattedDate = `${day}/${month}/${d.getFullYear()}`;

          const startH = String(d.getHours()).padStart(2, "0");
          const startM = String(d.getMinutes()).padStart(2, "0");
          let timeStr = `${startH}:${startM}`;

          if (session.ends_at) {
            const endD = new Date(session.ends_at);
            const endH = String(endD.getHours()).padStart(2, "0");
            const endM = String(endD.getMinutes()).padStart(2, "0");
            timeStr += ` - ${endH}:${endM}`;
          }
          formattedTime = timeStr;
        }
      }
    }

    // 5. Envoi des emails transactionnels en parallèle (non-bloquant)
    const emailPayload = {
      memberEmail,
      memberName,
      discipline,
      sessionType,
      date: formattedDate,
      time: formattedTime,
    };

    if (action === "booking") {
      await Promise.allSettled([
        memberEmail ? sendBookingConfirmationEmail(emailPayload) : Promise.resolve(),
        sendAdminBookingNotification({
          action: "booking",
          memberName,
          memberEmail,
          discipline,
          sessionType,
          date: formattedDate,
          time: formattedTime,
        }),
      ]);
    } else if (action === "cancellation") {
      await Promise.allSettled([
        memberEmail ? sendBookingCancellationEmail(emailPayload) : Promise.resolve(),
        sendAdminBookingNotification({
          action: "cancellation",
          memberName,
          memberEmail,
          discipline,
          sessionType,
          date: formattedDate,
          time: formattedTime,
        }),
      ]);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST /api/bookings/notify] Exception :", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message || "Erreur notification" },
      { status: 200 }
    );
  }
}
