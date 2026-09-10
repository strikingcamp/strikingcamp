import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

export interface AdminAuthSuccess {
  authorized: true;
  user: User;
}

export interface AdminAuthFailure {
  authorized: false;
  error: string;
}

export type AdminAuthResult = AdminAuthSuccess | AdminAuthFailure;

/**
 * Vérifie l'authentification et le rôle ADMIN côté serveur via les cookies de session.
 * RÈGLE DE SÉCURITÉ P0 :
 * Le rôle ADMIN est déterminé STRICTEMENT et EXCLUSIVEMENT via `user.app_metadata.role`.
 * Aucun fallback sur `user_metadata` n'est autorisé.
 *
 * @throws Error si l'utilisateur n'est pas authentifié ou n'a pas le rôle ADMIN
 * @returns User authentifié avec privilèges administrateur
 */
export async function assertAdminUser(): Promise<User> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Session invalide ou expirée. Veuillez vous reconnecter.");
  }

  const role = (user.app_metadata?.role || "").toUpperCase();
  if (role !== "ADMIN") {
    throw new Error("Accès refusé. Privilèges administrateur requis (app_metadata.role = 'ADMIN').");
  }

  return user;
}

/**
 * Version non-jetable (safe) pour les actions qui souhaitent renvoyer un objet résultat
 * plutôt que de lever une exception.
 */
export async function verifyAdminAuth(): Promise<AdminAuthResult> {
  try {
    const user = await assertAdminUser();
    return { authorized: true, user };
  } catch (err) {
    const error = err as Error;
    return {
      authorized: false,
      error: error.message || "Accès refusé. Privilèges administrateur requis.",
    };
  }
}
