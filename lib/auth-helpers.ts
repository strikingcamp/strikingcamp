/**
 * lib/auth-helpers.ts — Gestion centralisée des URLs canoniques pour l'authentification.
 *
 * Utilisé par :
 * - Inscription (/inscription)
 * - Mot de passe oublié (/mot-de-passe-oublie)
 * - Réinitialisation (/reset-password)
 * - Callback OAuth/PKCE (/auth/callback)
 * - Administration (/admin/membres)
 */

export function getAuthRedirectUrl(path: string = "/reset-password"): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  // 1. Variable d'environnement explicite prioritaire
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    const base = process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
    return `${base}${cleanPath}`;
  }

  // 2. Environnement de production Vercel
  if (
    process.env.NEXT_PUBLIC_VERCEL_ENV === "production" ||
    process.env.VERCEL_ENV === "production"
  ) {
    return `https://strikingcamp.com${cleanPath}`;
  }

  // 3. Prévisualisation Vercel
  if (process.env.NEXT_PUBLIC_VERCEL_URL || process.env.VERCEL_URL) {
    const vUrl = process.env.NEXT_PUBLIC_VERCEL_URL || process.env.VERCEL_URL;
    return `https://${vUrl}${cleanPath}`;
  }

  // 4. Si exécuté côté navigateur
  if (typeof window !== "undefined" && window.location?.origin) {
    if (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    ) {
      return `${window.location.origin}${cleanPath}`;
    }
    return `https://strikingcamp.com${cleanPath}`;
  }

  // 5. Mode Node production
  if (process.env.NODE_ENV === "production") {
    return `https://strikingcamp.com${cleanPath}`;
  }

  // 6. Environnement local par défaut
  return `http://localhost:3000${cleanPath}`;
}
