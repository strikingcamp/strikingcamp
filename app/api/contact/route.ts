import { NextRequest, NextResponse } from "next/server";
import { sendContactNotificationEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, message } = body;

    // Validation des champs
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Tous les champs sont requis." },
        { status: 400 }
      );
    }

    const result = await sendContactNotificationEmail({
      name: String(name).trim(),
      email: String(email).trim(),
      message: String(message).trim(),
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "L'envoi de l'email a échoué. Veuillez réessayer." },
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
