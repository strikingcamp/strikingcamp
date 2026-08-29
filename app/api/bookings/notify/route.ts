import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  sendBookingConfirmationEmail,
  sendBookingCancellationEmail,
  sendAdminBookingNotification,
} from "@/lib/email";

/**
 * Route serveur pour l'envoi asynchrone et sécurisé des emails de réservation.
 * 
 * ⚠️ N'est appelée qu'après confirmation réelle de la réservation / annulation dans Supabase.
 * Ne bloque jamais l'interface utilisateur en cas d'erreur réseau sur l'email.
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
    const { action, classSessionId, bookingId, slotInfo } = body;

    if (!action || (action !== "booking" && action !== "cancellation")) {
      return NextResponse.json({ error: "Action invalide" }, { status: 400 });
    }

    // 2. Récupération des informations utilisateur
    const userMeta = user.user_metadata || {};
    let memberName = `${userMeta.first_name || ""} ${userMeta.last_name || ""}`.trim();

    if (!memberName) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", user.id)
        .single();

      if (profile) {
        memberName = `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
      }
    }

    if (!memberName) {
      memberName = "Membre Striking Camp";
    }

    const memberEmail = user.email || "";

    // 3. Récupération des détails de la séance
    let discipline = slotInfo?.discipline || "Boxe Anglaise";
    let sessionType = slotInfo?.sessionType || "Small Group";
    let formattedDate = slotInfo?.date || "Date confirmée";
    let formattedTime = slotInfo?.time || "Horaire confirmé";

    // Si un classSessionId est fourni, récupérer les données officielles
    if (classSessionId) {
      const { data: session } = await supabase
        .from("class_sessions")
        .select("discipline, type, starts_at, ends_at")
        .eq("id", classSessionId)
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

    // 4. Déclenchement des emails en parallèle
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
    console.error("[POST /api/bookings/notify] Erreur :", error);
    // On retourne quand même 200/succès pour ne pas bloquer le flux de l'utilisateur
    return NextResponse.json({ success: false, error: "Erreur envoi notification" }, { status: 200 });
  }
}
