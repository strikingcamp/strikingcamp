"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { type CreateMemberPayload, createMemberAdmin } from "@/lib/supabase/admin";

/**
 * Server Action pour la création d'un membre par un administrateur.
 * Exécuté exclusivement côté serveur dans un environnement sécurisé.
 */
export async function createMemberServerAction(
  payload: CreateMemberPayload
): Promise<{ success: boolean; data?: { id: string; subscriptionId?: string }; error?: string }> {
  try {
    // 1. Validation de l'authentification et du rôle ADMIN sur le serveur via les cookies de session
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "Session invalide ou expirée. Veuillez vous reconnecter.",
      };
    }

    const role = (user.app_metadata?.role || "").toUpperCase();
    if (role !== "ADMIN") {
      return {
        success: false,
        error: "Accès refusé. Privilèges administrateur requis (app_metadata.role = 'ADMIN').",
      };
    }

    // 2. Vérification de la clé secrète service_role
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return {
        success: false,
        error: "Configuration requise : SUPABASE_SERVICE_ROLE_KEY n'est pas définie dans .env.local. Renseignez la clé service_role pour permettre la création de membres.",
      };
    }

    const adminSupabase = createAdminClient();

    // 3. Exécution de la création Auth -> Profile côté serveur
    return await createMemberAdmin(adminSupabase, payload);
  } catch (err) {
    const error = err as Error;
    console.error("Erreur createMemberServerAction :", error);
    return {
      success: false,
      error: error.message || "Erreur serveur inattendue.",
    };
  }
}
