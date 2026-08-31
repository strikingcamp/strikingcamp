import { SupabaseClient } from "@supabase/supabase-js";

export interface ServiceSetting {
  id?: string;
  service_key: "private" | "small_group" | "events" | string;
  service_name: string;
  description: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export const DEFAULT_SERVICE_SETTINGS: Record<string, boolean> = {
  private: true,
  small_group: false,
  events: true,
};

export const INITIAL_SERVICES_METADATA: Omit<ServiceSetting, "id">[] = [
  {
    service_key: "private",
    service_name: "Cours privés",
    description: "Réservations individuelles sur-mesure avec coach (50 min).",
    is_active: true,
  },
  {
    service_key: "small_group",
    service_name: "Small Group",
    description: "Cours en petit groupe avec capacité limitée à 20 personnes.",
    is_active: false,
  },
  {
    service_key: "events",
    service_name: "Événements",
    description: "Stages, camps d'entraînement intensifs et événements Striking Camp.",
    is_active: true,
  },
];

/**
 * Récupère le dictionnaire des statuts des services { private: boolean, small_group: boolean, events: boolean }
 */
export async function getServiceSettingsMap(
  supabase: SupabaseClient
): Promise<Record<string, boolean>> {
  try {
    const { data, error } = await supabase
      .from("service_settings")
      .select("service_key, is_active");

    if (error || !data || data.length === 0) {
      return { ...DEFAULT_SERVICE_SETTINGS };
    }

    const map: Record<string, boolean> = { ...DEFAULT_SERVICE_SETTINGS };
    for (const item of data) {
      if (item.service_key) {
        map[item.service_key] = Boolean(item.is_active);
      }
    }
    return map;
  } catch (err) {
    console.warn("[getServiceSettingsMap] Erreur lecture service_settings, fallback aux valeurs par défaut :", err);
    return { ...DEFAULT_SERVICE_SETTINGS };
  }
}

/**
 * Récupère la liste complète des services avec métadonnées pour l'interface Admin
 */
export async function getAdminServiceSettingsList(
  supabase: SupabaseClient
): Promise<ServiceSetting[]> {
  try {
    const { data, error } = await supabase
      .from("service_settings")
      .select("id, service_key, service_name, description, is_active, created_at, updated_at")
      .order("created_at", { ascending: true });

    if (error || !data || data.length === 0) {
      return INITIAL_SERVICES_METADATA.map((s, idx) => ({
        id: `mock_${idx}`,
        ...s,
      }));
    }

    return data as ServiceSetting[];
  } catch (err) {
    console.error("[getAdminServiceSettingsList] Erreur :", err);
    return INITIAL_SERVICES_METADATA.map((s, idx) => ({
      id: `mock_${idx}`,
      ...s,
    }));
  }
}

/**
 * Met à jour le statut d'un service côté Admin (avec persistance en base)
 */
export async function updateAdminServiceStatus(
  supabase: SupabaseClient,
  serviceKey: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Essai via la RPC sécurisée admin_update_service_status
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "admin_update_service_status",
      {
        p_service_key: serviceKey,
        p_is_active: isActive,
      }
    );

    if (!rpcError && rpcData && typeof rpcData === "object") {
      const res = rpcData as { success?: boolean; error?: string; message?: string };
      if (res.success !== false) {
        return { success: true };
      }
    }

    // 2. Fallback direct update via table service_settings si l'utilisateur est admin
    const { error: updateError } = await supabase
      .from("service_settings")
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq("service_key", serviceKey);

    if (updateError) {
      console.error("[updateAdminServiceStatus] Erreur update :", updateError);
      return { success: false, error: updateError.message };
    }

    return { success: true };
  } catch (err) {
    console.error("[updateAdminServiceStatus] Exception :", err);
    return {
      success: false,
      error: (err as Error).message || "Erreur lors de la mise à jour du service.",
    };
  }
}
