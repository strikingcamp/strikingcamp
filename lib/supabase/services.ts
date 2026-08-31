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
 * Lève une erreur explicite si la lecture échoue afin d'éviter tout écrasement silencieux des états.
 */
export async function getServiceSettingsMap(
  supabase: SupabaseClient
): Promise<Record<string, boolean>> {
  const { data, error } = await supabase
    .from("service_settings")
    .select("service_key, is_active");

  if (error) {
    console.error("[getServiceSettingsMap] Erreur lecture Supabase service_settings :", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    throw new Error(`[getServiceSettingsMap] ${error.message}`);
  }

  const map: Record<string, boolean> = {};
  for (const item of data || []) {
    if (item.service_key) {
      map[item.service_key] = Boolean(item.is_active);
    }
  }

  console.log("[getServiceSettingsMap] Statuts des services chargés depuis la BDD :", map);
  return map;
}

/**
 * Récupère la liste complète des services avec métadonnées pour l'interface Admin.
 * Lève une exception explicite en cas d'erreur Supabase pour ne pas masquer la cause racine.
 */
export async function getAdminServiceSettingsList(
  supabase: SupabaseClient
): Promise<ServiceSetting[]> {
  const { data, error } = await supabase
    .from("service_settings")
    .select("id, service_key, service_name, description, is_active, created_at, updated_at")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[getAdminServiceSettingsList] Erreur lecture Supabase :", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    throw new Error(`[getAdminServiceSettingsList] ${error.message}`);
  }

  console.log("[getAdminServiceSettingsList] Services chargés depuis la BDD :", data);
  return (data || []) as ServiceSetting[];
}

/**
 * Met à jour le statut d'un service côté Admin via la RPC sécurisée admin_update_service_status.
 * N'utilise AUCUN update direct sur la table pour garantir la sécurité et l'isolation des droits.
 */
export async function updateAdminServiceStatus(
  supabase: SupabaseClient,
  serviceKey: string,
  isActive: boolean,
  previousValue?: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    // Appel strict et exclusif de la RPC sécurisée admin_update_service_status
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "admin_update_service_status",
      {
        p_service_key: serviceKey,
        p_is_active: isActive,
      }
    );

    console.log("[updateAdminServiceStatus RPC Result]", {
      serviceId: serviceKey,
      previousValue: previousValue ?? !isActive,
      newValue: isActive,
      supabaseResponse: rpcData,
      error: rpcError,
    });

    if (rpcError) {
      console.error("[updateAdminServiceStatus] Erreur RPC admin_update_service_status :", {
        message: rpcError.message,
        code: rpcError.code,
        details: rpcError.details,
        hint: rpcError.hint,
      });
      return { success: false, error: rpcError.message };
    }

    if (rpcData && typeof rpcData === "object") {
      const res = rpcData as { success?: boolean; error?: string; message?: string };
      if (res.success === false) {
        return {
          success: false,
          error: res.message || res.error || "Échec de la mise à jour du statut.",
        };
      }
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
