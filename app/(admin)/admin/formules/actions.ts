"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { updatePlanAdmin, togglePlanStatusAdmin, type UpdatePlanPayload } from "@/lib/supabase/admin";

export interface PlanActionResult {
  success: boolean;
  error?: string;
}

/**
 * Server Action : Modifie une formule existante et revalide les pages dépendantes (/tarifs, /membre/adhesion).
 */
export async function updatePlanServerAction(
  planId: string,
  payload: UpdatePlanPayload
): Promise<PlanActionResult> {
  try {
    if (!planId || typeof planId !== "string" || planId.trim() === "") {
      return { success: false, error: "Identifiant de la formule manquant." };
    }

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

    const res = await updatePlanAdmin(supabase, planId, payload);

    if (res.success) {
      // Revalidation instantanée côté serveur
      revalidatePath("/tarifs");
      revalidatePath("/membre/adhesion");
      revalidatePath("/admin/formules");
      revalidatePath("/admin/abonnements");
      return { success: true };
    }

    return { success: false, error: res.error || "Erreur lors de la modification de la formule." };
  } catch (err) {
    console.error("[updatePlanServerAction] Exception :", err);
    return {
      success: false,
      error: (err as Error).message || "Une erreur inattendue est survenue.",
    };
  }
}

/**
 * Server Action : Active ou désactive une formule et revalide les pages publiques et membres.
 */
export async function togglePlanStatusServerAction(
  planId: string,
  isActive: boolean
): Promise<PlanActionResult> {
  try {
    if (!planId || typeof planId !== "string" || planId.trim() === "") {
      return { success: false, error: "Identifiant de la formule manquant." };
    }

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

    const res = await togglePlanStatusAdmin(supabase, planId, isActive);

    if (res.success) {
      revalidatePath("/tarifs");
      revalidatePath("/membre/adhesion");
      revalidatePath("/admin/formules");
      revalidatePath("/admin/abonnements");
      return { success: true };
    }

    return { success: false, error: res.error || "Erreur lors du changement de statut." };
  } catch (err) {
    console.error("[togglePlanStatusServerAction] Exception :", err);
    return {
      success: false,
      error: (err as Error).message || "Une erreur inattendue est survenue.",
    };
  }
}
