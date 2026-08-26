import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * proxy.ts — Remplace middleware.ts dans Next.js 16.
 *
 * Rôles :
 * 1. Rafraîchit automatiquement les tokens Supabase à chaque requête.
 * 2. Protège les routes /membre/* en redirigeant les utilisateurs non
 *    authentifiés vers /connexion.
 * 3. Redirige les utilisateurs déjà connectés qui accèdent aux pages
 *    d'auth (/connexion, /inscription) vers /membre.
 *
 * ⚠️ IMPORTANT : Ce proxy ne protège pas les Server Actions.
 * Toujours vérifier l'authentification à l'intérieur de chaque Server Action.
 */
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Écriture des cookies sur la requête (pour les Server Components)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Recréation de la réponse avec les cookies mis à jour
          supabaseResponse = NextResponse.next({ request });
          // Écriture des cookies sur la réponse (pour le navigateur)
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Rafraîchit la session si elle a expiré.
  // getUser() est la méthode recommandée — elle valide le token côté serveur
  // contrairement à getSession() qui se base uniquement sur le cookie local.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Routes protégées — accessible uniquement aux membres connectés
  if (pathname.startsWith("/membre")) {
    if (!user) {
      const redirectUrl = new URL("/connexion", request.url);
      redirectUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Pages d'auth — redirige les membres déjà connectés vers l'espace membre
  const authPaths = ["/connexion", "/inscription"];
  if (authPaths.some((p) => pathname.startsWith(p)) && user) {
    return NextResponse.redirect(new URL("/membre", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Appliqué à toutes les routes sauf :
     * - _next/static (fichiers statiques)
     * - _next/image (optimisation d'images)
     * - favicon.ico, sitemap.xml, robots.txt (fichiers meta)
     * - Fichiers d'assets publics (images, fonts, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2)$).*)",
  ],
};
