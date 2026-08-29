import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * proxy.ts — Remplace middleware.ts dans Next.js 16.
 *
 * Rôles :
 * 1. Rafraîchit automatiquement les tokens Supabase à chaque requête.
 * 2. Protège les routes /admin/* en vérifiant le rôle ADMIN côté serveur.
 * 3. Protège les routes /membre/* en redirigeant les utilisateurs non
 *    authentifiés vers /connexion.
 * 4. Redirige les utilisateurs déjà connectés qui accèdent aux pages
 *    d'auth (/connexion, /inscription) vers /membre ou /admin selon leur rôle.
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

  // Rafraîchit la session si elle a expiré via validation de token côté serveur
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Helper pour créer une redirection en conservant systématiquement les cookies rafraîchis
  const createRedirectWithCookies = (url: URL | string) => {
    const redirectResponse = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value);
    });
    return redirectResponse;
  };

  const { pathname } = request.nextUrl;
  const userRole = (user?.app_metadata?.role || user?.user_metadata?.role || "").toUpperCase();

  // 1. Protection des routes /admin — accessible STRICTEMENT au rôle ADMIN
  if (pathname.startsWith("/admin")) {
    if (!user) {
      const redirectUrl = new URL("/connexion", request.url);
      redirectUrl.searchParams.set("next", pathname);
      return createRedirectWithCookies(redirectUrl);
    }

    if (userRole !== "ADMIN") {
      // Redirection vers l'espace membre pour les clients/coachs non-admins
      return createRedirectWithCookies(new URL("/membre", request.url));
    }
  }

  // 2. Protection des routes /membre — accessible à tout utilisateur connecté
  if (pathname.startsWith("/membre")) {
    if (!user) {
      const redirectUrl = new URL("/connexion", request.url);
      redirectUrl.searchParams.set("next", pathname);
      return createRedirectWithCookies(redirectUrl);
    }
  }

  // 3. Pages d'auth — redirige les utilisateurs déjà connectés vers leur destination
  const authPaths = ["/connexion", "/inscription"];
  if (authPaths.some((p) => pathname.startsWith(p)) && user) {
    const rawNext = request.nextUrl.searchParams.get("next");
    const nextPath = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : null;

    if (nextPath) {
      // Si la destination cible est /admin/* mais que l'utilisateur n'est pas ADMIN
      if (nextPath.startsWith("/admin") && userRole !== "ADMIN") {
        return createRedirectWithCookies(new URL("/membre", request.url));
      }
      return createRedirectWithCookies(new URL(nextPath, request.url));
    }

    if (userRole === "ADMIN") {
      return createRedirectWithCookies(new URL("/admin", request.url));
    }
    return createRedirectWithCookies(new URL("/membre", request.url));
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
