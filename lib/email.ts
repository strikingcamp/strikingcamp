import { Resend } from "resend";

/**
 * Configuration centralisée du client Resend.
 *
 * Variables d'environnement utilisées :
 * - RESEND_API_KEY : Clé API secrète de Resend
 * - RESEND_FROM_EMAIL : Adresse d'expéditeur validée (défaut : "Striking Camp <contact@strikingcamp.com>")
 * - CONTACT_RECIPIENT_EMAIL : Adresse de réception des messages (défaut : "strikingcamp13@gmail.com")
 */

const DEFAULT_FROM = process.env.RESEND_FROM_EMAIL || "Striking Camp <contact@strikingcamp.com>";
const DEFAULT_ADMIN_RECIPIENT = process.env.CONTACT_RECIPIENT_EMAIL || "strikingcamp13@gmail.com";
const CLUB_LOCATION = "Striking Camp Marseille — 13008 Marseille";

let resendInstance: Resend | null = null;

export function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    return null;
  }

  if (!resendInstance) {
    resendInstance = new Resend(apiKey);
  }

  return resendInstance;
}

export interface SendContactEmailParams {
  name: string;
  email: string;
  message: string;
}

export interface BookingEmailData {
  memberEmail: string;
  memberName: string;
  discipline: string;
  sessionType: string; // "Small Group" | "Cours Privé" | "Collectif"
  date: string;
  time: string;
  location?: string;
}

export interface AdminBookingNotificationData {
  action: "booking" | "cancellation";
  memberName: string;
  memberEmail?: string;
  discipline: string;
  sessionType: string;
  date: string;
  time: string;
}

/**
 * 1. Notification de contact
 */
export async function sendContactNotificationEmail(
  params: SendContactEmailParams
): Promise<{ success: boolean; error?: string }> {
  const resend = getResendClient();

  // Mode développement ou clé absente : log en console et validation fluide
  if (!resend) {
    console.info(
      `[Contact - Mode Simulation] Message reçu pour ${DEFAULT_ADMIN_RECIPIENT} :`,
      {
        fromName: params.name,
        fromEmail: params.email,
        messagePreview: params.message.substring(0, 100),
      }
    );
    return { success: true };
  }

  try {
    const { error } = await resend.emails.send({
      from: DEFAULT_FROM,
      to: [DEFAULT_ADMIN_RECIPIENT],
      replyTo: params.email,
      subject: `Nouveau message de ${params.name} — Striking Camp`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #070c16; color: #ffffff; padding: 32px; border-radius: 8px; border: 1px solid #1e293b;">
          <div style="border-bottom: 2px solid #00d8ff; padding-bottom: 16px; margin-bottom: 24px;">
            <h2 style="color: #00d8ff; text-transform: uppercase; margin: 0; font-size: 20px; letter-spacing: 1px;">Striking Camp Marseille</h2>
            <p style="color: #94a3b8; font-size: 13px; margin: 4px 0 0 0;">Nouveau message reçu depuis le formulaire de contact</p>
          </div>
          
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #1e293b; color: #64748b; width: 110px; font-size: 12px; font-weight: bold; text-transform: uppercase;">Expéditeur</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #1e293b; color: #ffffff; font-size: 14px; font-weight: bold;">${params.name}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #1e293b; color: #64748b; font-size: 12px; font-weight: bold; text-transform: uppercase;">Email</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #1e293b; color: #00d8ff; font-size: 14px;">
                <a href="mailto:${params.email}" style="color: #00d8ff; text-decoration: none;">${params.email}</a>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0; color: #64748b; font-size: 12px; font-weight: bold; text-transform: uppercase; vertical-align: top;">Message</td>
              <td style="padding: 12px 0; color: #e2e8f0; line-height: 1.6; white-space: pre-wrap; font-size: 14px;">${params.message}</td>
            </tr>
          </table>
          
          <div style="border-top: 1px solid #1e293b; padding-top: 16px; font-size: 11px; color: #64748b; text-align: center;">
            Message transmis automatiquement depuis <strong>strikingcamp.com</strong>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error("[Resend] Erreur lors de l'envoi de l'email de contact :", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur inattendue lors de l'envoi de l'email.";
    console.error("[Resend] Exception sendContactNotificationEmail :", err);
    return { success: false, error: msg };
  }
}

/**
 * 2. Confirmation de réservation envoyée au membre
 */
export async function sendBookingConfirmationEmail(
  data: BookingEmailData
): Promise<{ success: boolean; error?: string }> {
  const resend = getResendClient();
  if (!resend) {
    return { success: false, error: "RESEND_API_KEY non configurée" };
  }

  const location = data.location || CLUB_LOCATION;

  try {
    const { error } = await resend.emails.send({
      from: DEFAULT_FROM,
      to: [data.memberEmail],
      subject: `Confirmation de votre réservation — ${data.discipline} (${data.date})`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #070c16; color: #ffffff; padding: 32px; border-radius: 8px; border: 1px solid #1e293b;">
          <div style="border-bottom: 2px solid #00d8ff; padding-bottom: 16px; margin-bottom: 24px;">
            <h2 style="color: #00d8ff; text-transform: uppercase; margin: 0; font-size: 20px; letter-spacing: 1px;">Striking Camp Marseille</h2>
            <p style="color: #94a3b8; font-size: 13px; margin: 4px 0 0 0;">Votre séance est confirmée</p>
          </div>

          <p style="font-size: 15px; color: #ffffff; margin-bottom: 20px;">
            Bonjour <strong>${data.memberName}</strong>,
          </p>
          <p style="font-size: 14px; color: #cbd5e1; line-height: 1.5; margin-bottom: 24px;">
            Votre réservation pour le cours de <strong>${data.discipline}</strong> a bien été enregistrée. Voici le récapitulatif de votre séance :
          </p>

          <div style="background: #0f172a; border: 1px solid #1e293b; border-radius: 6px; padding: 20px; margin-bottom: 24px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 12px; font-weight: bold; text-transform: uppercase; width: 120px;">Discipline</td>
                <td style="padding: 8px 0; color: #00d8ff; font-size: 14px; font-weight: bold;">${data.discipline}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 12px; font-weight: bold; text-transform: uppercase;">Formule</td>
                <td style="padding: 8px 0; color: #ffffff; font-size: 14px;">${data.sessionType}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 12px; font-weight: bold; text-transform: uppercase;">Date</td>
                <td style="padding: 8px 0; color: #ffffff; font-size: 14px; font-weight: bold;">${data.date}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 12px; font-weight: bold; text-transform: uppercase;">Horaire</td>
                <td style="padding: 8px 0; color: #ffffff; font-size: 14px; font-weight: bold;">${data.time}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 12px; font-weight: bold; text-transform: uppercase;">Lieu</td>
                <td style="padding: 8px 0; color: #cbd5e1; font-size: 13px;">${location}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 12px; font-weight: bold; text-transform: uppercase;">Statut</td>
                <td style="padding: 8px 0; color: #10b981; font-size: 13px; font-weight: bold;">Réservation confirmée</td>
              </tr>
            </table>
          </div>

          <div style="background: rgba(0, 216, 255, 0.05); border: 1px solid rgba(0, 216, 255, 0.2); border-radius: 6px; padding: 14px; margin-bottom: 24px;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0; line-height: 1.5;">
              💡 <strong>Rappel :</strong> Merci de vous présenter 10 minutes avant le début de la séance en tenue de sport adaptée. En cas d&apos;empêchement, vous pouvez annuler votre créneau depuis votre espace membre.
            </p>
          </div>

          <div style="text-align: center; margin-top: 24px;">
            <a href="https://strikingcamp.com/membre" style="display: inline-block; background: #00d8ff; color: #070c16; font-weight: bold; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">
              Accéder à mon espace membre
            </a>
          </div>

          <div style="border-top: 1px solid #1e293b; padding-top: 16px; margin-top: 32px; font-size: 11px; color: #64748b; text-align: center;">
            Striking Camp Marseille — Email envoyé automatiquement
          </div>
        </div>
      `,
    });

    if (error) {
      console.error("[Resend] Erreur sendBookingConfirmationEmail :", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur inattendue.";
    console.error("[Resend] Exception sendBookingConfirmationEmail :", err);
    return { success: false, error: msg };
  }
}

/**
 * 3. Annulation de réservation envoyée au membre
 */
export async function sendBookingCancellationEmail(
  data: BookingEmailData
): Promise<{ success: boolean; error?: string }> {
  const resend = getResendClient();
  if (!resend) {
    return { success: false, error: "RESEND_API_KEY non configurée" };
  }

  try {
    const { error } = await resend.emails.send({
      from: DEFAULT_FROM,
      to: [data.memberEmail],
      subject: `Annulation de votre réservation — ${data.discipline} (${data.date})`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #070c16; color: #ffffff; padding: 32px; border-radius: 8px; border: 1px solid #1e293b;">
          <div style="border-bottom: 2px solid #ef4444; padding-bottom: 16px; margin-bottom: 24px;">
            <h2 style="color: #ef4444; text-transform: uppercase; margin: 0; font-size: 20px; letter-spacing: 1px;">Striking Camp Marseille</h2>
            <p style="color: #94a3b8; font-size: 13px; margin: 4px 0 0 0;">Confirmation d'annulation de séance</p>
          </div>

          <p style="font-size: 15px; color: #ffffff; margin-bottom: 20px;">
            Bonjour <strong>${data.memberName}</strong>,
          </p>
          <p style="font-size: 14px; color: #cbd5e1; line-height: 1.5; margin-bottom: 24px;">
            Votre réservation pour le cours de <strong>${data.discipline}</strong> a bien été annulée :
          </p>

          <div style="background: #0f172a; border: 1px solid #1e293b; border-radius: 6px; padding: 20px; margin-bottom: 24px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 12px; font-weight: bold; text-transform: uppercase; width: 120px;">Discipline</td>
                <td style="padding: 8px 0; color: #ffffff; font-size: 14px; font-weight: bold;">${data.discipline}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 12px; font-weight: bold; text-transform: uppercase;">Date & Heure</td>
                <td style="padding: 8px 0; color: #ffffff; font-size: 14px;">${data.date} à ${data.time}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 12px; font-weight: bold; text-transform: uppercase;">Statut</td>
                <td style="padding: 8px 0; color: #ef4444; font-size: 13px; font-weight: bold;">Séance annulée</td>
              </tr>
            </table>
          </div>

          <p style="font-size: 13px; color: #94a3b8; line-height: 1.5;">
            Votre place a été remise à disposition. Vous pouvez réserver un autre créneau à tout moment depuis votre espace membre.
          </p>

          <div style="text-align: center; margin-top: 24px;">
            <a href="https://strikingcamp.com/membre/planning" style="display: inline-block; background: #00d8ff; color: #070c16; font-weight: bold; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-size: 13px; text-transform: uppercase;">
              Voir le planning
            </a>
          </div>

          <div style="border-top: 1px solid #1e293b; padding-top: 16px; margin-top: 32px; font-size: 11px; color: #64748b; text-align: center;">
            Striking Camp Marseille — Email envoyé automatiquement
          </div>
        </div>
      `,
    });

    if (error) {
      console.error("[Resend] Erreur sendBookingCancellationEmail :", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur inattendue.";
    console.error("[Resend] Exception sendBookingCancellationEmail :", err);
    return { success: false, error: msg };
  }
}

/**
 * 4. Notification envoyée à l'administrateur
 */
export async function sendAdminBookingNotification(
  data: AdminBookingNotificationData
): Promise<{ success: boolean; error?: string }> {
  const resend = getResendClient();
  if (!resend) {
    return { success: false, error: "RESEND_API_KEY non configurée" };
  }

  const isBooking = data.action === "booking";
  const title = isBooking ? "Nouvelle réservation enregistrée" : "Annulation de réservation";
  const color = isBooking ? "#00d8ff" : "#ef4444";
  const statusBadge = isBooking ? "RÉSERVATION CONFIRMÉE" : "RÉSERVATION ANNULÉE";

  try {
    const { error } = await resend.emails.send({
      from: DEFAULT_FROM,
      to: [DEFAULT_ADMIN_RECIPIENT],
      subject: `[Admin] ${title} : ${data.memberName} — ${data.discipline} (${data.date})`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #070c16; color: #ffffff; padding: 32px; border-radius: 8px; border: 1px solid #1e293b;">
          <div style="border-bottom: 2px solid ${color}; padding-bottom: 16px; margin-bottom: 24px;">
            <h2 style="color: ${color}; text-transform: uppercase; margin: 0; font-size: 18px; letter-spacing: 1px;">Admin Striking Camp</h2>
            <p style="color: #94a3b8; font-size: 13px; margin: 4px 0 0 0;">${title}</p>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #1e293b; color: #64748b; width: 120px; font-size: 12px; font-weight: bold; text-transform: uppercase;">Membre</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #1e293b; color: #ffffff; font-size: 14px; font-weight: bold;">
                ${data.memberName} ${data.memberEmail ? `<span style="color: #94a3b8; font-weight: normal;">(${data.memberEmail})</span>` : ""}
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #1e293b; color: #64748b; font-size: 12px; font-weight: bold; text-transform: uppercase;">Discipline</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #1e293b; color: #ffffff; font-size: 14px;">${data.discipline}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #1e293b; color: #64748b; font-size: 12px; font-weight: bold; text-transform: uppercase;">Type</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #1e293b; color: #cbd5e1; font-size: 14px;">${data.sessionType}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #1e293b; color: #64748b; font-size: 12px; font-weight: bold; text-transform: uppercase;">Date & Heure</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #1e293b; color: #ffffff; font-size: 14px; font-weight: bold;">${data.date} à ${data.time}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 12px; font-weight: bold; text-transform: uppercase;">Action</td>
              <td style="padding: 8px 0; color: ${color}; font-size: 13px; font-weight: bold;">${statusBadge}</td>
            </tr>
          </table>

          <div style="text-align: center; margin-top: 24px;">
            <a href="https://strikingcamp.com/admin/reservations" style="display: inline-block; background: #1e293b; color: #ffffff; border: 1px solid #334155; font-weight: bold; text-decoration: none; padding: 10px 20px; border-radius: 4px; font-size: 12px; text-transform: uppercase;">
              Ouvrir l'émargement Admin
            </a>
          </div>

          <div style="border-top: 1px solid #1e293b; padding-top: 16px; margin-top: 32px; font-size: 11px; color: #64748b; text-align: center;">
            Notification système automatique — Striking Camp
          </div>
        </div>
      `,
    });

    if (error) {
      console.error("[Resend] Erreur sendAdminBookingNotification :", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur inattendue.";
    console.error("[Resend] Exception sendAdminBookingNotification :", err);
    return { success: false, error: msg };
  }
}

export interface TrialBookingEmailData {
  prospectEmail: string;
  prospectName: string;
  discipline: string;
  date: string;
  time: string;
  location?: string;
}

export interface AdminTrialNotificationData {
  prospectName: string;
  prospectEmail: string;
  prospectPhone: string;
  discipline: string;
  date: string;
  time: string;
}

const OFFICIAL_VENUE = "Marseille Fight Club — 268 avenue de la Capelette, 13010 Marseille";

/**
 * 5. Confirmation de cours d'essai envoyée au prospect
 */
export async function sendTrialBookingConfirmationEmail(
  data: TrialBookingEmailData
): Promise<{ success: boolean; error?: string }> {
  const resend = getResendClient();
  if (!resend) {
    console.info("[Trial Email - Mode Simulation] Confirmation prospect :", data);
    return { success: true };
  }

  const location = data.location || OFFICIAL_VENUE;

  try {
    const { error } = await resend.emails.send({
      from: DEFAULT_FROM,
      to: [data.prospectEmail],
      subject: `Confirmation de ton cours d'essai — ${data.discipline} (${data.date})`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #070c16; color: #ffffff; padding: 32px; border-radius: 8px; border: 1px solid #1e293b;">
          <div style="border-bottom: 2px solid #00d8ff; padding-bottom: 16px; margin-bottom: 24px;">
            <h2 style="color: #00d8ff; text-transform: uppercase; margin: 0; font-size: 20px; letter-spacing: 1px;">Striking Camp Marseille</h2>
            <p style="color: #94a3b8; font-size: 13px; margin: 4px 0 0 0;">Ton cours d'essai est réservé !</p>
          </div>

          <p style="font-size: 15px; color: #ffffff; margin-bottom: 16px;">
            Bonjour <strong>${data.prospectName}</strong>,
          </p>
          <p style="font-size: 14px; color: #cbd5e1; line-height: 1.5; margin-bottom: 24px;">
            Nous avons bien enregistré ta réservation pour ton cours d'essai au Striking Camp. Voici le récapitulatif de ta séance :
          </p>

          <div style="background: #0f172a; border: 1px solid #1e293b; border-radius: 6px; padding: 20px; margin-bottom: 24px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 12px; font-weight: bold; text-transform: uppercase; width: 120px;">Discipline</td>
                <td style="padding: 8px 0; color: #00d8ff; font-size: 14px; font-weight: bold;">${data.discipline}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 12px; font-weight: bold; text-transform: uppercase;">Formule</td>
                <td style="padding: 8px 0; color: #ffffff; font-size: 14px;">Cours d'essai gratuit</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 12px; font-weight: bold; text-transform: uppercase;">Date</td>
                <td style="padding: 8px 0; color: #ffffff; font-size: 14px; font-weight: bold;">${data.date}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 12px; font-weight: bold; text-transform: uppercase;">Horaire</td>
                <td style="padding: 8px 0; color: #ffffff; font-size: 14px; font-weight: bold;">${data.time}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 12px; font-weight: bold; text-transform: uppercase;">Lieu</td>
                <td style="padding: 8px 0; color: #cbd5e1; font-size: 13px;">${location}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 12px; font-weight: bold; text-transform: uppercase;">Statut</td>
                <td style="padding: 8px 0; color: #10b981; font-size: 13px; font-weight: bold;">Confirmé</td>
              </tr>
            </table>
          </div>

          <div style="background: rgba(0, 216, 255, 0.05); border: 1px solid rgba(0, 216, 255, 0.2); border-radius: 6px; padding: 16px; margin-bottom: 24px;">
            <p style="color: #00d8ff; font-size: 13px; font-weight: bold; margin: 0 0 8px 0;">
              🥊 Conseils pratiques pour ta séance :
            </p>
            <ul style="color: #94a3b8; font-size: 12px; margin: 0; padding-left: 18px; line-height: 1.6;">
              <li>Arriver <strong>10 minutes en avance</strong> pour l'accueil par le coach.</li>
              <li>Prévoir une tenue de sport adaptée (t-shirt / short de sport).</li>
              <li>Penser à prendre une bouteille d'eau et une serviette.</li>
              <li>Des gants de boxe peuvent t'être prêtés pour cette première séance.</li>
            </ul>
          </div>

          <div style="border-top: 1px solid #1e293b; padding-top: 16px; margin-top: 32px; font-size: 11px; color: #64748b; text-align: center;">
            Striking Camp Marseille — 268 avenue de la Capelette, 13010 Marseille<br />
            Email envoyé automatiquement depuis <strong>strikingcamp.com</strong>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error("[Resend] Erreur sendTrialBookingConfirmationEmail :", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur inattendue.";
    console.error("[Resend] Exception sendTrialBookingConfirmationEmail :", err);
    return { success: false, error: msg };
  }
}

/**
 * 6. Notification d'un nouveau cours d'essai envoyée à l'administrateur / coach
 */
export async function sendAdminTrialBookingNotification(
  data: AdminTrialNotificationData
): Promise<{ success: boolean; error?: string }> {
  const resend = getResendClient();
  if (!resend) {
    console.info("[Trial Email - Mode Simulation] Alerte admin nouveau prospect :", data);
    return { success: true };
  }

  try {
    const { error } = await resend.emails.send({
      from: DEFAULT_FROM,
      to: [DEFAULT_ADMIN_RECIPIENT],
      subject: `[Nouveau Cours d'Essai] ${data.prospectName} — ${data.discipline} (${data.date})`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #070c16; color: #ffffff; padding: 32px; border-radius: 8px; border: 1px solid #1e293b;">
          <div style="border-bottom: 2px solid #00d8ff; padding-bottom: 16px; margin-bottom: 24px;">
            <h2 style="color: #00d8ff; text-transform: uppercase; margin: 0; font-size: 18px; letter-spacing: 1px;">Admin Striking Camp</h2>
            <p style="color: #94a3b8; font-size: 13px; margin: 4px 0 0 0;">Nouvelle réservation de cours d'essai</p>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #1e293b; color: #64748b; width: 120px; font-size: 12px; font-weight: bold; text-transform: uppercase;">Prospect</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #1e293b; color: #ffffff; font-size: 14px; font-weight: bold;">
                ${data.prospectName}
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #1e293b; color: #64748b; font-size: 12px; font-weight: bold; text-transform: uppercase;">Téléphone</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #1e293b; color: #00d8ff; font-size: 14px; font-weight: bold;">
                <a href="tel:${data.prospectPhone}" style="color: #00d8ff; text-decoration: none;">${data.prospectPhone}</a>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #1e293b; color: #64748b; font-size: 12px; font-weight: bold; text-transform: uppercase;">Email</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #1e293b; color: #ffffff; font-size: 14px;">
                <a href="mailto:${data.prospectEmail}" style="color: #ffffff; text-decoration: none;">${data.prospectEmail}</a>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #1e293b; color: #64748b; font-size: 12px; font-weight: bold; text-transform: uppercase;">Discipline</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #1e293b; color: #00d8ff; font-size: 14px; font-weight: bold;">${data.discipline}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #1e293b; color: #64748b; font-size: 12px; font-weight: bold; text-transform: uppercase;">Date & Heure</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #1e293b; color: #ffffff; font-size: 14px; font-weight: bold;">${data.date} à ${data.time}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 12px; font-weight: bold; text-transform: uppercase;">Type</td>
              <td style="padding: 8px 0; color: #f59e0b; font-size: 13px; font-weight: bold;">COURS D'ESSAI</td>
            </tr>
          </table>

          <div style="text-align: center; margin-top: 24px;">
            <a href="https://strikingcamp.com/admin/reservations" style="display: inline-block; background: #1e293b; color: #ffffff; border: 1px solid #334155; font-weight: bold; text-decoration: none; padding: 10px 20px; border-radius: 4px; font-size: 12px; text-transform: uppercase;">
              Voir dans le planning Admin
            </a>
          </div>

          <div style="border-top: 1px solid #1e293b; padding-top: 16px; margin-top: 32px; font-size: 11px; color: #64748b; text-align: center;">
            Notification automatique Striking Camp
          </div>
        </div>
      `,
    });

    if (error) {
      console.error("[Resend] Erreur sendAdminTrialBookingNotification :", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur inattendue.";
    console.error("[Resend] Exception sendAdminTrialBookingNotification :", err);
    return { success: false, error: msg };
  }
}

