import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Route de déconnexion sécurisée — POST /deconnexion
 *
 * Invalide la session Supabase côté serveur et redirige vers /connexion.
 * La méthode GET ne détruit JAMAIS la session afin d'éviter toute déconnexion
 * involontaire provoquée par le prefetch automatique de Next.js ou par le navigateur.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await supabase.auth.signOut();
  }

  return NextResponse.redirect(new URL("/connexion", request.url), { status: 303 });
}

/**
 * GET /deconnexion — Réponse neutre et non destructive (redirection sans déconnexion)
 */
export async function GET(request: NextRequest) {
  return NextResponse.redirect(new URL("/connexion", request.url), { status: 302 });
}
