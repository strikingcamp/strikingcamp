import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";

/**
 * Route de callback d'authentification — GET /auth/callback
 *
 * Gère :
 * 1. La vérification OTP serveur par token_hash (Recovery / Invite / Signup) : verifyOtp({ token_hash, type })
 * 2. L'échange de code PKCE (OAuth / Auth code) : exchangeCodeForSession(code)
 * 3. L'écriture sécurisée de la session dans les cookies HTTP
 * 4. La redirection vers la destination finale (?next=)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next");

  // Détermination de la destination selon le type
  let next = "/membre";
  if (rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//")) {
    next = rawNext;
  } else if (type === "recovery" || type === "invite") {
    next = "/reset-password";
  }

  const supabase = await createClient();

  // Helper pour synchroniser le profil si nécessaire
  const syncProfileIfAvailable = async (user: { id: string; user_metadata?: Record<string, unknown> }) => {
    const meta = user.user_metadata || {};
    const firstName = (meta.first_name as string) || null;
    const lastName = (meta.last_name as string) || null;
    const phone = (meta.phone as string) || null;

    if (firstName || lastName || phone) {
      await supabase.from("profiles").upsert(
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
  };

  // 1. Validation par token_hash (Option B — Infaillible multi-appareils)
  if (token_hash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash,
      type,
    });

    if (!error && data?.user) {
      await syncProfileIfAvailable(data.user);
      const redirectUrl = new URL(next, request.url);
      return NextResponse.redirect(redirectUrl);
    }

    if (error) {
      console.error("[AuthCallback] Erreur verifyOtp :", error);
      if (type === "recovery" || next === "/reset-password") {
        const resetErrorRedirect = new URL("/reset-password", request.url);
        resetErrorRedirect.searchParams.set("error", "otp_expired");
        resetErrorRedirect.searchParams.set("error_description", error.message);
        return NextResponse.redirect(resetErrorRedirect);
      }
    }
  }

  // 2. Validation par code PKCE (Fallback pour OAuth / Code classique)
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data?.user) {
      await syncProfileIfAvailable(data.user);
      const redirectUrl = new URL(next, request.url);
      return NextResponse.redirect(redirectUrl);
    }

    if (error) {
      console.error("[AuthCallback] Erreur exchangeCodeForSession :", error);
      if (type === "recovery" || next === "/reset-password") {
        const resetErrorRedirect = new URL("/reset-password", request.url);
        resetErrorRedirect.searchParams.set("error", "code_expired");
        resetErrorRedirect.searchParams.set("error_description", error.message);
        return NextResponse.redirect(resetErrorRedirect);
      }
    }
  }

  // 3. Gestion des erreurs transmises directement par Supabase
  const urlError = searchParams.get("error");
  const urlErrorCode = searchParams.get("error_code");
  const urlErrorDesc = searchParams.get("error_description");

  if (urlError || urlErrorCode) {
    if (type === "recovery" || next === "/reset-password") {
      const resetErrorRedirect = new URL("/reset-password", request.url);
      if (urlError) resetErrorRedirect.searchParams.set("error", urlError);
      if (urlErrorCode) resetErrorRedirect.searchParams.set("error_code", urlErrorCode);
      if (urlErrorDesc) resetErrorRedirect.searchParams.set("error_description", urlErrorDesc);
      return NextResponse.redirect(resetErrorRedirect);
    }
  }

  // Échec général : redirection vers /connexion
  const errorRedirect = new URL("/connexion", request.url);
  errorRedirect.searchParams.set("error", "callback_error");
  return NextResponse.redirect(errorRedirect);
}
