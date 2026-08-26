import { createBrowserClient } from "@supabase/ssr";

/**
 * Crée un client Supabase pour les composants client (navigateur).
 * À utiliser dans les composants avec "use client".
 *
 * createBrowserClient persiste la session dans les cookies HTTP afin que
 * le serveur puisse la lire lors du rendu SSR.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}

