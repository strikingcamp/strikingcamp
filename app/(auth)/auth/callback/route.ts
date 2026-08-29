import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Route de callback OAuth/Email — GET /auth/callback
 *
 * Supabase redirige ici après :
 * - Confirmation d'email à l'inscription (type: signup) -> /membre
 * - Réinitialisation de mot de passe (type: recovery) -> /reset-password
 * - Invitation administrateur (type: invite) -> /reset-password
 *
 * Le paramètre `code` est échangé contre une session via PKCE.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type");
  const rawNext = searchParams.get("next");

  // Détermination stricte de la destination selon le type d'événement
  let next = "/membre";
  if (rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//")) {
    next = rawNext;
  } else if (type === "recovery" || type === "invite") {
    next = "/reset-password";
  }

  if (code) {
    const supabase = await createClient();

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data?.user) {
      const user = data.user;
      const meta = user.user_metadata || {};

      // Synchronisation de sécurité dans public.profiles si le profil n'existe pas encore
      const firstName = meta.first_name || null;
      const lastName = meta.last_name || null;
      const phone = meta.phone || null;

      if (firstName || lastName || phone) {
        await supabase
          .from("profiles")
          .upsert(
            {
              id: user.id,
              first_name: firstName,
              last_name: lastName,
              phone: phone,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "id" }
          );
      }

      const redirectUrl = new URL(next, request.url);
      return NextResponse.redirect(redirectUrl);
    }
  }

  const urlError = searchParams.get("error");
  const urlErrorCode = searchParams.get("error_code");

  // Si Supabase renvoie une erreur sur un lien de recovery, rediriger vers /reset-password avec l'erreur
  if (urlError || urlErrorCode) {
    if (type === "recovery" || rawNext === "/reset-password") {
      const resetErrorRedirect = new URL("/reset-password", request.url);
      if (urlError) resetErrorRedirect.searchParams.set("error", urlError);
      if (urlErrorCode) resetErrorRedirect.searchParams.set("error_code", urlErrorCode);
      return NextResponse.redirect(resetErrorRedirect);
    }
  }

  // Redirection vers une page d'erreur en cas d'échec
  const errorRedirect = new URL("/connexion", request.url);
  errorRedirect.searchParams.set("error", "callback_error");
  return NextResponse.redirect(errorRedirect);
}
