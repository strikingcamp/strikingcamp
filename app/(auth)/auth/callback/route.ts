import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Route de callback OAuth/Email — GET /auth/callback
 *
 * Supabase redirige ici après :
 * - Confirmation d'email à l'inscription
 * - Réinitialisation de mot de passe (via resetPasswordForEmail)
 * - (futur) OAuth (Google, etc.)
 *
 * Le paramètre `code` est échangé contre une session via PKCE.
 * Le paramètre `next` détermine la redirection finale.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/membre";

  if (code) {
    const supabase = await createClient();

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Redirection vers une page d'erreur en cas d'échec
  return NextResponse.redirect(
    `${origin}/connexion?error=callback_error`
  );
}
