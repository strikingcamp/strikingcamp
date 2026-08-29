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

import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Crée un client Supabase avec la clé service_role (Admin Privileged Client).
 * ⚠️ STRICTEMENT RÉSERVÉ AU SERVEUR (Server Actions, Route Handlers).
 * Ne JAMAIS exporter ni appeler côté client.
 */
export function createAdminClient(): SupabaseClient {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  if (!serviceRoleKey) {
    throw new Error(
      "La variable d'environnement SUPABASE_SERVICE_ROLE_KEY n'est pas configurée dans .env.local"
    );
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
