"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  type Notification,
  type NotificationTargetRole,
  getNotifications,
  getUnreadNotificationsCount,
  markNotificationAsRead as apiMarkAsRead,
  markAllNotificationsAsRead as apiMarkAllAsRead,
} from "@/lib/supabase/notifications";

export interface UseNotificationsOptions {
  targetRole?: NotificationTargetRole;
  limit?: number;
  autoSubscribe?: boolean;
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const { targetRole = "member", limit = 30, autoSubscribe = true } = options;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  // 1. Rafraîchissement des notifications et du compteur
  const refresh = useCallback(async () => {
    try {
      setError(null);

      const [notifsRes, countRes] = await Promise.all([
        getNotifications(supabase, { targetRole, limit }),
        getUnreadNotificationsCount(supabase),
      ]);

      if (notifsRes.error) {
        setError(notifsRes.error);
      } else {
        setNotifications(notifsRes.data);
      }

      setUnreadCount(countRes);
    } catch (err) {
      console.error("[useNotifications] Erreur refresh :", err);
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, targetRole, limit]);

  // 2. Marquer une notification individuelle comme lue (avec mise à jour optimiste)
  const markAsRead = useCallback(
    async (notificationId: string) => {
      // Sauvegarde état pour rollback en cas d'erreur
      let previousNotifications: Notification[] = [];
      let previousUnreadCount = 0;

      setNotifications((prev) => {
        previousNotifications = prev;
        const target = prev.find((n) => n.id === notificationId);
        if (target && !target.is_read) {
          setUnreadCount((c) => {
            previousUnreadCount = c;
            return Math.max(0, c - 1);
          });
          return prev.map((n) =>
            n.id === notificationId
              ? { ...n, is_read: true, read_at: new Date().toISOString() }
              : n
          );
        }
        return prev;
      });

      const res = await apiMarkAsRead(supabase, notificationId);

      if (!res.success) {
        console.error("[useNotifications] Erreur markAsRead :", res.error);
        // Rollback
        setNotifications(previousNotifications);
        setUnreadCount(previousUnreadCount);
        return { success: false, error: res.error };
      }

      return { success: true };
    },
    [supabase]
  );

  // 3. Tout marquer comme lu (avec mise à jour optimiste)
  const markAllAsRead = useCallback(async () => {
    let previousNotifications: Notification[] = [];
    let previousUnreadCount = 0;

    setNotifications((prev) => {
      previousNotifications = prev;
      return prev.map((n) => ({
        ...n,
        is_read: true,
        read_at: n.read_at || new Date().toISOString(),
      }));
    });

    setUnreadCount((prevCount) => {
      previousUnreadCount = prevCount;
      return 0;
    });

    const res = await apiMarkAllAsRead(supabase);

    if (!res.success) {
      console.error("[useNotifications] Erreur markAllAsRead :", res.error);
      // Rollback
      setNotifications(previousNotifications);
      setUnreadCount(previousUnreadCount);
      return { success: false, error: res.error };
    }

    return { success: true };
  }, [supabase]);

  // 4. Chargement initial
  useEffect(() => {
    refresh();
  }, [refresh]);

  // 5. Abonnement Supabase Realtime (avec nettoyage)
  useEffect(() => {
    if (!autoSubscribe) return;

    const channelName = `realtime:notifications:${targetRole}:${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
        },
        (payload) => {
          console.log("[useNotifications Realtime] Événement reçu :", payload.eventType);

          if (payload.eventType === "INSERT") {
            const newNotif = payload.new as Notification;
            if (newNotif.target_role === targetRole) {
              setNotifications((prev) => [newNotif, ...prev.filter((n) => n.id !== newNotif.id)]);
              if (!newNotif.is_read) {
                setUnreadCount((c) => c + 1);
              }
            }
          } else if (payload.eventType === "UPDATE") {
            const updatedNotif = payload.new as Notification;
            setNotifications((prev) =>
              prev.map((n) => (n.id === updatedNotif.id ? updatedNotif : n))
            );
            // Rafraîchir le compteur pour garantir la cohérence
            getUnreadNotificationsCount(supabase).then((c) => setUnreadCount(c));
          } else if (payload.eventType === "DELETE") {
            const oldId = (payload.old as { id?: string }).id;
            if (oldId) {
              setNotifications((prev) => prev.filter((n) => n.id !== oldId));
              getUnreadNotificationsCount(supabase).then((c) => setUnreadCount(c));
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log(`[useNotifications Realtime] Abonné avec succès (${targetRole})`);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, targetRole, autoSubscribe]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    refresh,
    markAsRead,
    markAllAsRead,
  };
}

/**
 * Helper de formatage de date relative en français
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Récemment";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return "À l'instant";
  if (diffMinutes < 60) return `Il y a ${diffMinutes} min`;
  if (diffHours < 24) {
    const hours = String(date.getHours()).padStart(2, "0");
    const mins = String(date.getMinutes()).padStart(2, "0");
    return `Aujourd'hui à ${hours}:${mins}`;
  }
  if (diffDays === 1) {
    const hours = String(date.getHours()).padStart(2, "0");
    const mins = String(date.getMinutes()).padStart(2, "0");
    return `Hier à ${hours}:${mins}`;
  }
  if (diffDays < 7) return `Il y a ${diffDays} jours`;

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}
