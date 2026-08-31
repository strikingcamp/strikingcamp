"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  CheckCircle,
  AlertTriangle,
  Clock,
  Info,
  Calendar,
  Sparkles,
  ArrowRight,
  CheckCheck,
  Check,
  RotateCw,
  UserPlus,
  Users,
  BookmarkCheck,
  Radio,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useNotifications, formatRelativeTime } from "@/hooks/useNotifications";
import type { Notification } from "@/lib/supabase/notifications";

export default function AdminAlertesView() {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    refresh,
    markAsRead,
    markAllAsRead,
  } = useNotifications({
    targetRole: "admin",
    limit: 50,
    autoSubscribe: true,
  });

  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Filtrage local
  const filteredNotifications = notifications.filter((notif) => {
    if (filter === "unread") return !notif.is_read;
    return true;
  });

  // Gestion du clic sur notification admin (lecture + redirection éventuelle)
  const handleNotificationClick = async (notif: Notification) => {
    setActionLoadingId(notif.id);
    try {
      if (!notif.is_read) {
        await markAsRead(notif.id);
      }
      if (notif.action_url) {
        router.push(notif.action_url);
      }
    } catch (err) {
      console.error("[AdminAlertesView] Erreur clic notification :", err);
      if (notif.action_url) {
        router.push(notif.action_url);
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  // Marquer toutes les notifications admin comme lues
  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0 || isMarkingAll) return;
    setIsMarkingAll(true);
    try {
      await markAllAsRead();
    } finally {
      setIsMarkingAll(false);
    }
  };

  // Icône contextuelle selon le type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "new_registration":
      case "new_member":
        return <UserPlus size={18} className="text-[#00d8ff]" />;
      case "new_booking":
      case "booking_confirmed":
        return <BookmarkCheck size={18} className="text-[#22c55e]" />;
      case "booking_cancelled":
      case "cancellation_admin":
        return <AlertTriangle size={18} className="text-red-400" />;
      case "challenge_completed":
      case "challenge_published":
        return <Sparkles size={18} className="text-amber-400" />;
      case "system":
      case "club_info":
      default:
        return <Info size={18} className="text-brand-blue" />;
    }
  };

  // Badge contextuel selon le type
  const getNotificationBadgeClass = (type: string) => {
    switch (type) {
      case "new_registration":
      case "new_member":
        return "bg-[#00d8ff]/15 text-[#00d8ff] border-[#00d8ff]/30";
      case "new_booking":
      case "booking_confirmed":
        return "bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/30";
      case "booking_cancelled":
      case "cancellation_admin":
        return "bg-red-500/15 text-red-400 border-red-500/30";
      case "challenge_completed":
      case "challenge_published":
        return "bg-amber-500/15 text-amber-300 border-amber-500/30";
      case "system":
      case "club_info":
      default:
        return "bg-brand-blue/15 text-brand-blue border-brand-blue/30";
    }
  };

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-5xl mx-auto">
      
      {/* En-tête de la vue Admin */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-white/10 pb-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-blue/10 border border-brand-blue/30 rounded-full text-brand-blue text-xs font-heading font-bold uppercase tracking-wider mb-1">
            <Bell size={13} />
            <span>Centre de notifications administrateur</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-heading font-black uppercase tracking-wider text-brand-white">
              Alertes & Activités Club
            </h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-[#00d8ff] text-black font-heading font-black text-xs shadow-[0_0_10px_rgba(0,216,255,0.5)]">
                {unreadCount > 99 ? "99+" : unreadCount} non lue{unreadCount > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-brand-white/50">
            Flux d'événements opérationnels en temps réel : inscriptions, réservations et alertes du club.
          </p>
        </div>

        {/* Actions d'en-tête */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              disabled={isMarkingAll}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-brand-blue text-brand-black hover:bg-brand-white font-heading font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-md shadow-brand-blue/10"
            >
              <CheckCheck size={14} />
              <span>{isMarkingAll ? "Mise à jour..." : "Tout marquer comme lu"}</span>
            </button>
          )}

          <button
            onClick={() => refresh()}
            className="p-2.5 rounded-lg bg-brand-white/5 hover:bg-brand-white/10 text-brand-white/60 hover:text-brand-white border border-brand-white/10 transition-colors cursor-pointer"
            title="Rafraîchir"
            aria-label="Rafraîchir"
          >
            <RotateCw size={16} className={cn(isLoading && "animate-spin text-brand-blue")} />
          </button>
        </div>
      </div>

      {/* Onglets de filtrage */}
      <div className="flex items-center gap-2 border-b border-brand-white/10 pb-3">
        <button
          onClick={() => setFilter("all")}
          className={cn(
            "px-4 py-2 rounded-lg text-xs font-heading font-bold uppercase tracking-wider transition-all cursor-pointer",
            filter === "all"
              ? "bg-brand-blue text-brand-black shadow-sm"
              : "text-brand-white/60 hover:text-brand-white hover:bg-brand-white/5"
          )}
        >
          Toutes les notifications ({notifications.length})
        </button>
        <button
          onClick={() => setFilter("unread")}
          className={cn(
            "px-4 py-2 rounded-lg text-xs font-heading font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer",
            filter === "unread"
              ? "bg-brand-blue text-brand-black shadow-sm"
              : "text-brand-white/60 hover:text-brand-white hover:bg-brand-white/5"
          )}
        >
          <span>Non lues</span>
          {unreadCount > 0 && (
            <span
              className={cn(
                "px-1.5 py-0.5 rounded-full text-[10px] font-black",
                filter === "unread" ? "bg-brand-black text-brand-blue" : "bg-[#00d8ff] text-black"
              )}
            >
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* État de chargement initial */}
      {isLoading && notifications.length === 0 ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-xl p-5 bg-[#080d1a] border border-brand-white/5 animate-pulse flex items-start gap-4"
            >
              <div className="w-10 h-10 rounded-lg bg-brand-white/10 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="flex justify-between items-center">
                  <div className="h-4 w-36 bg-brand-white/10 rounded" />
                  <div className="h-3 w-20 bg-brand-white/5 rounded" />
                </div>
                <div className="h-3 w-full bg-brand-white/5 rounded" />
                <div className="h-3 w-3/4 bg-brand-white/5 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredNotifications.length === 0 ? (
        /* État vide */
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#080d1a]/50 border border-brand-white/10 border-dashed rounded-xl p-12 text-center space-y-4 my-8"
        >
          <div className="w-16 h-16 rounded-full bg-brand-white/5 text-brand-white/30 flex items-center justify-center mx-auto">
            <Bell size={28} />
          </div>
          <div>
            <h2 className="text-lg font-heading font-bold uppercase tracking-wider text-brand-white/80">
              {filter === "unread"
                ? "Aucune alerte administrative non lue"
                : "Aucune notification administrative pour le moment"}
            </h2>
            <p className="text-xs text-brand-white/40 mt-1 max-w-sm mx-auto">
              {filter === "unread"
                ? "Toutes les alertes ont été consultées."
                : "Les nouvelles inscriptions, réservations et annulations apparaîtront ici."}
            </p>
          </div>
          <div className="pt-2 flex justify-center gap-3">
            <Link
              href="/admin/reservations"
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white border border-brand-white/10 font-heading font-bold text-xs uppercase tracking-wider rounded-lg transition-colors"
            >
              <BookmarkCheck size={14} className="text-brand-blue" />
              Voir les réservations
            </Link>
          </div>
        </motion.div>
      ) : (
        /* Liste des notifications admin */
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-3"
        >
          <AnimatePresence initial={false}>
            {filteredNotifications.map((notif) => {
              const isUnread = !notif.is_read;

              return (
                <motion.div
                  key={notif.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => handleNotificationClick(notif)}
                  className={cn(
                    "group relative rounded-xl p-5 flex items-start gap-4 transition-all duration-200 border cursor-pointer select-none",
                    isUnread
                      ? "bg-gradient-to-r from-[#0c1629] to-[#080d1a] border-[#00d8ff]/30 shadow-lg shadow-[#00d8ff]/5 hover:border-[#00d8ff]/60"
                      : "bg-[#080d1a] border-brand-white/10 hover:border-brand-white/20 hover:bg-[#0c1426] opacity-85 hover:opacity-100"
                  )}
                >
                  {/* Pastille non lue */}
                  {isUnread && (
                    <span className="absolute top-3.5 right-3.5 w-2 h-2 rounded-full bg-[#00d8ff] shadow-[0_0_8px_#00d8ff] animate-pulse" />
                  )}

                  {/* Icône */}
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border",
                      isUnread
                        ? "bg-brand-blue/15 border-brand-blue/30"
                        : "bg-brand-white/5 border-brand-white/10 text-brand-white/40"
                    )}
                  >
                    {getNotificationIcon(notif.type)}
                  </div>

                  {/* Détails */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 pr-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "text-[10px] font-heading font-black uppercase px-2 py-0.5 rounded border tracking-wider",
                            getNotificationBadgeClass(notif.type)
                          )}
                        >
                          {notif.title}
                        </span>
                        {notif.is_read && (
                          <span className="text-[10px] font-bold text-brand-white/30 flex items-center gap-1">
                            <Check size={12} className="text-[#22c55e]" /> Consultée
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-medium text-brand-white/40">
                        {formatRelativeTime(notif.created_at)}
                      </span>
                    </div>

                    <p
                      className={cn(
                        "text-xs sm:text-sm leading-relaxed",
                        isUnread ? "text-brand-white font-medium" : "text-brand-white/70"
                      )}
                    >
                      {notif.message}
                    </p>

                    {/* Bouton d'action si présent */}
                    {notif.action_url && (
                      <div className="pt-2">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-heading font-bold uppercase tracking-wider transition-all",
                            isUnread
                              ? "bg-brand-blue text-brand-black hover:bg-brand-white shadow-sm"
                              : "bg-brand-white/10 hover:bg-brand-white/20 text-brand-white/80"
                          )}
                        >
                          <span>{notif.action_label || "Consulter"}</span>
                          <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

    </div>
  );
}
