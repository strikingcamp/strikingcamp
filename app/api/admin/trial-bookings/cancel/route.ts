import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { formatToParisDate, formatToParisTime } from "@/lib/supabase/admin";
import {
  sendTrialCancellationConfirmationEmail,
  sendAdminTrialCancellationNotification,
} from "@/lib/email";
import { getTrialTypeLabel } from "@/lib/trial-pricing";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Validation de l'authentification et du rôle administrateur
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED", message: "Authentification requise." },
        { status: 401 }
      );
    }

    const userRole = (user.app_metadata?.role || "").toUpperCase();
    let isUserAdmin = userRole === "ADMIN";

    if (!isUserAdmin) {
      const { data: isAdminRpc } = await supabase.rpc("is_admin");
      if (isAdminRpc === true) {
        isUserAdmin = true;
      }
    }

    if (!isUserAdmin) {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN", message: "Action réservée aux administrateurs." },
        { status: 403 }
      );
    }

    // 2. Extraction du corps de la requête
    const body = await req.json();
    const { trialBookingId, reason } = body;

    if (!trialBookingId || typeof trialBookingId !== "string") {
      return NextResponse.json(
        { success: false, error: "INVALID_ID", message: "Identifiant de réservation d'essai manquant." },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // 3. Récupération des informations de la réservation d'essai et de la séance
    const { data: booking, error: fetchErr } = await adminClient
      .from("trial_bookings")
      .select(`
        id,
        first_name,
        last_name,
        email,
        phone,
        status,
        class_session_id,
        class_sessions:class_session_id (
          id,
          discipline,
          type,
          starts_at,
          ends_at
        )
      `)
      .eq("id", trialBookingId)
      .maybeSingle();

    if (fetchErr || !booking) {
      return NextResponse.json(
        { success: false, error: "NOT_FOUND", message: "Réservation d'essai introuvable." },
        { status: 404 }
      );
    }

    // Protection contre double annulation
    if (booking.status === "cancelled") {
      return NextResponse.json({
        success: true,
        alreadyCancelled: true,
        message: "Cette réservation de cours d'essai a déjà été annulée.",
      });
    }

    // 4. Mise à jour du statut à 'cancelled' (libère instantanément la place)
    const { error: updErr } = await adminClient
      .from("trial_bookings")
      .update({
        status: "cancelled",
        admin_notes: reason || "Annulé par l'administrateur",
        updated_at: new Date().toISOString(),
      })
      .eq("id", trialBookingId);

    if (updErr) {
      console.error("[/api/admin/trial-bookings/cancel] Erreur update :", updErr);
      return NextResponse.json(
        { success: false, error: updErr.code || "DB_ERROR", message: updErr.message },
        { status: 500 }
      );
    }

    // 5. Formatage des informations pour les emails
    const session = Array.isArray(booking.class_sessions)
      ? booking.class_sessions[0]
      : booking.class_sessions;

    const startsAt = session?.starts_at || "";
    const endsAt = session?.ends_at || "";
    const discipline = session?.discipline || "Cours d'essai";
    const rawType = session?.type || "small_group";

    let dateFormatted = "Date confirmée";
    let timeFormatted = "Horaire confirmé";

    if (startsAt) {
      dateFormatted = formatToParisDate(startsAt);
      const startTime = formatToParisTime(startsAt);
      let endTime = "";
      if (endsAt) {
        endTime = formatToParisTime(endsAt);
      } else {
        const sDate = new Date(startsAt);
        const eDate = new Date(sDate.getTime() + 60 * 60 * 1000);
        endTime = formatToParisTime(eDate);
      }
      timeFormatted = `${startTime} → ${endTime}`;
    }

    const prospectName = booking.first_name || "Sportif";
    const fullName = `${booking.first_name || ""} ${booking.last_name || ""}`.trim() || prospectName;

    // 6. Envoi des notifications e-mail Resend (prospect et administrateur)
    try {
      await Promise.allSettled([
        sendTrialCancellationConfirmationEmail({
          prospectEmail: booking.email,
          prospectName,
          discipline,
          sessionType: getTrialTypeLabel(rawType),
          date: dateFormatted,
          time: timeFormatted,
        }),
        sendAdminTrialCancellationNotification({
          prospectName: fullName,
          prospectEmail: booking.email,
          prospectPhone: booking.phone || undefined,
          discipline,
          sessionType: getTrialTypeLabel(rawType),
          date: dateFormatted,
          time: timeFormatted,
        }),
      ]);
    } catch (emailErr) {
      console.error("[/api/admin/trial-bookings/cancel] Erreur envoi emails Resend :", emailErr);
    }

    return NextResponse.json({
      success: true,
      message: "Le cours d'essai a été annulé avec succès. La place a été libérée et les notifications envoyées.",
    });
  } catch (err) {
    console.error("[/api/admin/trial-bookings/cancel] Exception :", err);
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

