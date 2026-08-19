import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const RECIPIENT_EMAIL = "strikingcamp13@gmail.com";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, message } = body;

    // Validation basique des champs
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Tous les champs sont requis." },
        { status: 400 }
      );
    }

    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      console.error("RESEND_API_KEY manquante dans les variables d'environnement.");
      return NextResponse.json(
        { error: "Configuration serveur manquante. Veuillez contacter l'administrateur." },
        { status: 500 }
      );
    }

    const resend = new Resend(apiKey);

    const { error } = await resend.emails.send({
      from: "Striking Camp <onboarding@resend.dev>",
      to: [RECIPIENT_EMAIL],
      replyTo: email,
      subject: `Nouveau message de ${name} — Striking Camp`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a1120; color: #ffffff; padding: 32px; border-radius: 8px;">
          <h2 style="color: #00d8ff; text-transform: uppercase; margin-bottom: 24px;">Nouveau message — Striking Camp</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #2a3441; color: #9ca3af; width: 120px; font-size: 14px; font-weight: bold; text-transform: uppercase;">Nom</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #2a3441; color: #ffffff;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #2a3441; color: #9ca3af; font-size: 14px; font-weight: bold; text-transform: uppercase;">Email</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #2a3441; color: #00d8ff;">
                <a href="mailto:${email}" style="color: #00d8ff; text-decoration: none;">${email}</a>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0; color: #9ca3af; font-size: 14px; font-weight: bold; text-transform: uppercase; vertical-align: top;">Message</td>
              <td style="padding: 12px 0; color: #e5e7eb; line-height: 1.6; white-space: pre-wrap;">${message}</td>
            </tr>
          </table>
          <p style="margin-top: 32px; font-size: 12px; color: #6b7280; border-top: 1px solid #2a3441; padding-top: 16px;">
            Ce message a été envoyé depuis le formulaire de contact du site <strong>strikingcamp.fr</strong>.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("Erreur Resend :", error);
      return NextResponse.json(
        { error: "L'envoi de l'email a échoué. Veuillez réessayer." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Message envoyé avec succès." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Erreur route /api/contact :", error);
    return NextResponse.json(
      { error: "Une erreur inattendue s'est produite." },
      { status: 500 }
    );
  }
}
