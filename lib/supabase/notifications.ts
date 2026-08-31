import { SupabaseClient } from "@supabase/supabase-js";

export type NotificationTargetRole = "member" | "admin";

export type NotificationType =
  | "booking_confirmed"
  | "booking_cancelled"
  | "new_registration"
  | "new_booking"
  | "challenge_published"
  | "challenge_completed"
  | "system"
  | (string & {});

export interface Notification {
  id: string;
  user_id: string | null;
  target_role: NotificationTargetRole;
  type: NotificationType;
  title: string;
  message: string;
  action_url: string | null;
  action_label: string | null;
  metadata: Record<string, unknown>;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface NotificationFilterOptions {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
  targetRole?: NotificationTargetRole;
  type?: string;
}

export interface CreateNotificationPayload {
  user_id?: string | null;
  target_role?: NotificationTargetRole;
  type: NotificationType;
  title: string;
  message: string;
  action_url?: string | null;
  action_label?: string | null;
  metadata?: Record<string, unknown>;
}

export interface NotificationActionResult {
  success: boolean;
  notification_id?: string;
  updated_count?: number;
  already_read?: boolean;
  read_at?: string;
  error?: string;
  message?: string;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. FONCTIONS CLIENT (FRONTEND AUTHENTIFIÉ & SERVEUR)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Récupère la liste des notifications pour l'utilisateur connecté ou le rôle admin.
 * Sécurisé par les politiques RLS Supabase.
 */
export async function getNotifications(
  supabase: SupabaseClient,
  options: NotificationFilterOptions = {}
): Promise<{ data: Notification[]; count: number; error?: string }> {
  try {
    const { limit = 20, offset = 0, unreadOnly = false, targetRole, type } = options;

    let query = supabase
      .from("notifications")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (unreadOnly) {
      query = query.eq("is_read", false);
    }

    if (targetRole) {
      query = query.eq("target_role", targetRole);
    }

    if (type) {
      query = query.eq("type", type);
    }

    const { data, count, error } = await query;

    if (error) {
      console.error("[getNotifications] Erreur Supabase :", error);
      return { data: [], count: 0, error: error.message };
    }

    return {
      data: (data || []) as Notification[],
      count: count ?? (data?.length || 0),
    };
  } catch (err) {
    console.error("[getNotifications] Exception :", err);
    return { data: [], count: 0, error: (err as Error).message };
  }
}

/**
 * Récupère le compteur de notifications non lues via la RPC get_unread_notifications_count.
 * Accessible aux utilisateurs authentifiés.
 */
export async function getUnreadNotificationsCount(
  supabase: SupabaseClient
): Promise<number> {
  try {
    const { data, error } = await supabase.rpc("get_unread_notifications_count");

    if (error) {
      console.warn("[getUnreadNotificationsCount] RPC error, fallback query :", error.message);
      // Fallback direct query si la RPC rencontre une erreur
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("is_read", false);
      return count ?? 0;
    }

    return typeof data === "number" ? data : 0;
  } catch (err) {
    console.error("[getUnreadNotificationsCount] Exception :", err);
    return 0;
  }
}

/**
 * Marque une notification comme lue via la RPC idempotente mark_notification_as_read.
 * Accessible aux utilisateurs authentifiés (contrôle de propriété strict).
 */
export async function markNotificationAsRead(
  supabase: SupabaseClient,
  notificationId: string
): Promise<NotificationActionResult> {
  try {
    const { data, error } = await supabase.rpc("mark_notification_as_read", {
      p_notification_id: notificationId,
    });

    if (error) {
      console.error("[markNotificationAsRead] Erreur RPC :", error);
      return { success: false, error: error.message };
    }

    if (data && typeof data === "object") {
      const res = data as Record<string, unknown>;
      return {
        success: res.success !== false,
        notification_id: res.notification_id as string,
        already_read: Boolean(res.already_read),
        read_at: res.read_at as string,
        error: res.error as string,
        message: res.message as string,
      };
    }

    return { success: true, notification_id: notificationId };
  } catch (err) {
    console.error("[markNotificationAsRead] Exception :", err);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Marque toutes les notifications non lues comme lues via la RPC mark_all_notifications_as_read.
 * Accessible aux utilisateurs authentifiés (isole les notifications de l'utilisateur connecté).
 */
export async function markAllNotificationsAsRead(
  supabase: SupabaseClient
): Promise<NotificationActionResult> {
  try {
    const { data, error } = await supabase.rpc("mark_all_notifications_as_read");

    if (error) {
      console.error("[markAllNotificationsAsRead] Erreur RPC :", error);
      return { success: false, error: error.message };
    }

    if (data && typeof data === "object") {
      const res = data as Record<string, unknown>;
      return {
        success: res.success !== false,
        updated_count: typeof res.updated_count === "number" ? res.updated_count : 0,
        read_at: res.read_at as string,
        error: res.error as string,
      };
    }

    return { success: true };
  } catch (err) {
    console.error("[markAllNotificationsAsRead] Exception :", err);
    return { success: false, error: (err as Error).message };
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. FONCTIONS SERVEUR / BACKEND (SERVICE_ROLE STRICTEMENT REQUIS)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Création sécurisée d'une notification côté serveur.
 * 
 * ⚠️ ATTENTION : Cette fonction appelle la RPC create_notification() dont l'accès
 * est révoqué pour le rôle public/authenticated. Elle DOIT IMPÉRATIVEMENT être exécutée
 * avec un client admin Supabase (service_role via createAdminClient()) depuis un Server Action,
 * un Route Handler ou un processus backend interne.
 */
export async function createNotificationServer(
  adminSupabase: SupabaseClient,
  payload: CreateNotificationPayload
): Promise<NotificationActionResult> {
  try {
    const { data, error } = await adminSupabase.rpc("create_notification", {
      p_user_id: payload.user_id || null,
      p_target_role: payload.target_role || "member",
      p_type: payload.type,
      p_title: payload.title,
      p_message: payload.message,
      p_action_url: payload.action_url || null,
      p_action_label: payload.action_label || null,
      p_metadata: payload.metadata || {},
    });

    if (error) {
      console.error("[createNotificationServer] Erreur RPC create_notification :", error);
      return { success: false, error: error.message };
    }

    if (data && typeof data === "object") {
      const res = data as Record<string, unknown>;
      return {
        success: res.success !== false,
        notification_id: res.notification_id as string,
        error: res.error as string,
        message: res.message as string,
      };
    }

    return { success: true };
  } catch (err) {
    console.error("[createNotificationServer] Exception :", err);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Helper serveur préparatoire pour créer une notification ciblée vers les administrateurs.
 * Requiert le client privileged service_role.
 */
export async function createAdminNotificationServer(
  adminSupabase: SupabaseClient,
  payload: Omit<CreateNotificationPayload, "target_role">
): Promise<NotificationActionResult> {
  return createNotificationServer(adminSupabase, {
    ...payload,
    target_role: "admin",
  });
}
