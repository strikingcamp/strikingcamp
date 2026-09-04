import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  sendTrialBookingConfirmationEmail,
  sendAdminTrialBookingNotification,
} from "@/lib/email";
import { formatToParisDate, formatToParisTime } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      classSessionId,
      firstName,
      lastName,
      email,
      phone,
      consentContact,
      honeypot,
    } = body;

    // 1. Honeypot anti-spam : si rempli par un robot, rejet silencieux immédiat
    if (honeypot && String(honeypot).trim() !== "") {
      console.warn("[/api/trial-bookings] Rejet bot honeypot détecté :", { email, phone });
      return NextResponse.json(
        { success: false, error: "SPAM_DETECTED", message: "Requête invalide." },
        { status: 400 }
      );
    }

    // 2. Validation des données reçues
    if (!classSessionId || typeof classSessionId !== "string") {
      return NextResponse.json(
        { success: false, error: "INVALID_SESSION", message: "Veuillez sélectionner un créneau." },
        { status: 400 }
      );
    }

    const cleanFirstName = String(firstName || "").trim();
    const cleanLastName = String(lastName || "").trim();
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanPhone = String(phone || "").trim();

    if (!cleanFirstName || !cleanLastName) {
      return NextResponse.json(
        { success: false, error: "INVALID_NAME", message: "Le prénom et le nom sont requis." },
        { status: 400 }
      );
    }

    if (!cleanEmail || !cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      return NextResponse.json(
        { success: false, error: "INVALID_EMAIL", message: "Veuillez renseigner une adresse email valide." },
        { status: 400 }
      );
    }

    if (cleanPhone.replace(/[^0-9+]/g, "").length < 8) {
      return NextResponse.json(
        { success: false, error: "INVALID_PHONE", message: "Veuillez renseigner un numéro de téléphone valide." },
        { status: 400 }
      );
    }

    if (consentContact !== true) {
      return NextResponse.json(
        {
          success: false,
          error: "CONSENT_REQUIRED",
          message: "Veuillez accepter d'être contacté concernant votre cours d'essai.",
        },
        { status: 400 }
      );
    }

    // 3. Appel de la RPC sécurisée Supabase
    const supabase = await createClient();

    const { data: rpcData, error: rpcError } = await supabase.rpc("create_trial_booking", {
      p_class_session_id: classSessionId,
      p_first_name: cleanFirstName,
      p_last_name: cleanLastName,
      p_email: cleanEmail,
      p_phone: cleanPhone,
      p_consent: true,
    });

    if (rpcError) {
      console.error("[/api/trial-bookings] Erreur RPC create_trial_booking :", rpcError);
      return NextResponse.json(
        {
          success: false,
          error: rpcError.code || "DB_ERROR",
          message: rpcError.message || "Erreur lors de la réservation du cours d'essai.",
        },
        { status: 500 }
      );
    }

    if (rpcData && typeof rpcData === "object") {
      const res = rpcData as Record<string, unknown>;

      if (res.success === false) {
        const errCode = (res.error as string) || "RESERVATION_REJECTED";
        const errMsg =
          (res.message as string) || "Impossible de réserver ce cours d'essai.";
        return NextResponse.json(
          { success: false, error: errCode, message: errMsg },
          { status: 400 }
        );
      }

      // 4. Réservation confirmée : formatage des informations pour les emails
      const bookingId = (res.booking_id as string) || "";
      const discipline = (res.discipline as string) || "Cours d'essai";
      const startsAt = (res.starts_at as string) || "";
      const endsAt = (res.ends_at as string) || "";

      let formattedDate = "Date confirmée";
      let formattedTime = "Horaire confirmé";

      if (startsAt) {
        const sDate = new Date(startsAt);
        const dayName = new Intl.DateTimeFormat("fr-FR", {
          timeZone: "Europe/Paris",
          weekday: "long",
        }).format(sDate);
        const dayFormatted = dayName.charAt(0).toUpperCase() + dayName.slice(1);

        const dayNum = new Intl.DateTimeFormat("fr-FR", {
          timeZone: "Europe/Paris",
          day: "numeric",
        }).format(sDate);

        const monthName = new Intl.DateTimeFormat("fr-FR", {
          timeZone: "Europe/Paris",
          month: "long",
        }).format(sDate);

        formattedDate = `${dayFormatted} ${dayNum} ${monthName}`;

        const startTime = formatToParisTime(startsAt);
        let endTime = "";
        if (endsAt) {
          endTime = formatToParisTime(endsAt);
        } else {
          const eDate = new Date(sDate.getTime() + 50 * 60 * 1000);
          endTime = formatToParisTime(eDate);
        }
        formattedTime = `${startTime} – ${endTime}`;
      }

      const fullName = `${cleanFirstName} ${cleanLastName}`;

      // 5. Déclenchement attendu des notifications emails avec observabilité des logs
      const emailResults = await Promise.allSettled([
        sendTrialBookingConfirmationEmail({
          prospectEmail: cleanEmail,
          prospectName: cleanFirstName,
          discipline,
          date: formattedDate,
          time: formattedTime,
          location: "Marseille Fight Club — 268 avenue de la Capelette, 13010 Marseille",
        }),
        sendAdminTrialBookingNotification({
          prospectName: fullName,
          prospectEmail: cleanEmail,
          prospectPhone: cleanPhone,
          discipline,
          date: formattedDate,
          time: formattedTime,
        }),
      ]);

      emailResults.forEach((result, index) => {
        if (result.status === "rejected") {
          console.error(
            `[/api/trial-bookings] Email ${index} rejeté :`,
            result.reason
          );
        } else if (!result.value.success) {
          console.warn(
            `[/api/trial-bookings] Échec envoi email ${index} :`,
            result.value.error
          );
        }
      });

      return NextResponse.json({
        success: true,
        bookingId,
        discipline,
        date: formattedDate,
        time: formattedTime,
        firstName: cleanFirstName,
        lastName: cleanLastName,
        email: cleanEmail,
        phone: cleanPhone,
        message: "Votre cours d'essai a été réservé avec succès !",
      });
    }

    return NextResponse.json(
      { success: false, error: "UNEXPECTED_RESPONSE", message: "Réponse inattendue du serveur." },
      { status: 500 }
    );
  } catch (err) {
    console.error("[POST /api/trial-bookings] Exception :", err);
    return NextResponse.json(
      {
        success: false,
        error: "SERVER_EXCEPTION",
        message: (err as Error).message || "Une erreur inattendue est survenue.",
      },
      { status: 500 }
    );
  }
}
