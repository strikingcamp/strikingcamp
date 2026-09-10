import { NextRequest, NextResponse } from "next/server";
import { sendContactNotificationEmail } from "@/lib/email";

// Limiteur de fréquence en mémoire glissant (5 messages par 10 minutes par IP)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000; // 10 minutes
  const maxRequests = 5;

  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxRequests) {
    return false;
  }

  entry.count += 1;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown-ip";

    // 1. Contrôle anti-abus de fréquence
    if (!checkRateLimit(ip)) {
      console.warn("[/api/contact] Rate limit dépassé pour l'IP :", ip);
      return NextResponse.json(
        { error: "Trop de messages envoyés. Veuillez patienter quelques minutes avant de réessayer." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { name, email, message, honeypot } = body;

    // 2. Honeypot anti-spam : si rempli par un robot, rejet silencieux immédiat
    if (honeypot && String(honeypot).trim() !== "") {
      console.warn("[/api/contact] Bot honeypot détecté :", { email, ip });
      // Réponse positive factice pour ne pas alerter le robot
      return NextResponse.json(
        { success: true, message: "Message envoyé avec succès." },
        { status: 200 }
      );
    }

    // 3. Validation stricte des données
    const cleanName = String(name || "").trim();
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanMessage = String(message || "").trim();

    if (!cleanName || cleanName.length > 150) {
      return NextResponse.json(
        { error: "Veuillez renseigner un nom valide (150 caractères max)." },
        { status: 400 }
      );
    }

    if (!cleanEmail || !cleanEmail.includes("@") || !cleanEmail.includes(".") || cleanEmail.length > 200) {
      return NextResponse.json(
        { error: "Veuillez renseigner une adresse email valide." },
        { status: 400 }
      );
    }

    if (!cleanMessage || cleanMessage.length < 5 || cleanMessage.length > 5000) {
      return NextResponse.json(
        { error: "Votre message doit comporter entre 5 et 5000 caractères." },
        { status: 400 }
      );
    }

    // 4. Envoi de l'email via Resend
    const result = await sendContactNotificationEmail({
      name: cleanName,
      email: cleanEmail,
      message: cleanMessage,
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
