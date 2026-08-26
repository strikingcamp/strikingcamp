import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Crée un client Supabase pour les Server Components, Route Handlers
 * et Server Actions.
 *
 * ⚠️ Toujours créer une nouvelle instance par requête — ne jamais partager
 * un client entre plusieurs requêtes.
 *
 * cookies() est async dans Next.js 16 — cette fonction doit être appelée
 * depuis un contexte async (Server Component, Route Handler...).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // setAll est appelé depuis un Server Component où les cookies
            // ne peuvent pas être modifiés. Ignoré ici car le proxy (proxy.ts)
            // prend en charge le rafraîchissement des tokens.
          }
        },
      },
    }
  );
}
