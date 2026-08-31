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
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useNotifications, formatRelativeTime } from "@/hooks/useNotifications";
import type { Notification } from "@/lib/supabase/notifications";

export default function MemberAlertsView() {
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
    targetRole: "member",
    limit: 50,
    autoSubscribe: true,
  });

  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [isMarkingAll, setIsMarkingAll] = useState<boolean>(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  // Filtrage local
  const filteredNotifications = notifications.filter((notif) => {
    if (filter === "unread") return !notif.is_read;
    return true;
  });

  // Gestion du clic sur une notification (lecture + redirection éventuelle)
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
      console.error("[MemberAlertsView] Erreur clic notification :", err);
      // Fallback redirection
      if (notif.action_url) {
        router.push(notif.action_url);
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  // Marquer toutes les notifications comme lues
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
      case "booking_confirmed":
      case "confirmation":
        return <CheckCircle size={18} className="text-[#22c55e]" />;
      case "booking_cancelled":
      case "annulation":
        return <AlertTriangle size={18} className="text-red-400" />;
      case "challenge_completed":
      case "challenge_published":
        return <Trophy size={18} className="text-amber-400" />;
      case "event":
      case "nouvel_evenement":
        return <Sparkles size={18} className="text-[#00d8ff]" />;
      case "reminder":
      case "rappel":
        return <Clock size={18} className="text-[#00d8ff]" />;
      case "system":
      case "club_info":
      default:
        return <Info size={18} className="text-brand-blue" />;
    }
  };

  // Badge contextuel selon le type
  const getNotificationBadgeClass = (type: string) => {
    switch (type) {
      case "booking_confirmed":
      case "confirmation":
        return "bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/30";
      case "booking_cancelled":
      case "annulation":
        return "bg-red-500/15 text-red-400 border-red-500/30";
      case "challenge_completed":
      case "challenge_published":
        return "bg-amber-500/15 text-amber-300 border-amber-500/30";
      case "event":
      case "nouvel_evenement":
        return "bg-[#00d8ff]/15 text-[#00d8ff] border-[#00d8ff]/30";
      case "reminder":
      case "rappel":
        return "bg-[#00d8ff]/15 text-[#00d8ff] border-[#00d8ff]/30";
      case "system":
      case "club_info":
      default:
        return "bg-brand-blue/15 text-brand-blue border-brand-blue/30";
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6 pt-2 pb-16">
      
      {/* En-tête de la vue */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-white/10 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-blue/15 border border-brand-blue/30 text-brand-blue flex items-center justify-center">
              <Bell size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-heading font-black uppercase tracking-wider text-brand-white">
                  Mes Alertes & Notifications
                </h1>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-[#00d8ff] text-black font-heading font-black text-xs shadow-[0_0_10px_rgba(0,216,255,0.4)]">
                    {unreadCount > 99 ? "99+" : unreadCount} non lue{unreadCount > 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-brand-white/50">
                Confirmations de réservations, actualités du club et défis en temps réel.
              </p>
            </div>
          </div>
        </div>

        {/* Actions d'en-tête */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              disabled={isMarkingAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-white/5 hover:bg-brand-white/10 text-brand-white/80 hover:text-brand-white border border-brand-white/10 text-xs font-heading font-bold uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
            >
              <CheckCheck size={14} className="text-[#00d8ff]" />
              <span>{isMarkingAll ? "Mise à jour..." : "Tout marquer comme lu"}</span>
            </button>
          )}

          <button
            onClick={() => refresh()}
            className="p-2 rounded-lg bg-brand-white/5 hover:bg-brand-white/10 text-brand-white/60 hover:text-brand-white border border-brand-white/10 transition-colors cursor-pointer"
            title="Rafraîchir les notifications"
            aria-label="Rafraîchir"
          >
            <RotateCw size={15} className={cn(isLoading && "animate-spin text-brand-blue")} />
          </button>
        </div>
      </div>

      {/* Onglets de filtrage */}
      <div className="flex items-center gap-2 border-b border-brand-white/10 pb-2">
        <button
          onClick={() => setFilter("all")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-heading font-bold uppercase tracking-wider transition-all cursor-pointer",
            filter === "all"
              ? "bg-brand-blue text-brand-black shadow-sm"
              : "text-brand-white/60 hover:text-brand-white hover:bg-brand-white/5"
          )}
        >
          Toutes ({notifications.length})
        </button>
        <button
          onClick={() => setFilter("unread")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-heading font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer",
            filter === "unread"
              ? "bg-brand-blue text-brand-black shadow-sm"
              : "text-brand-white/60 hover:text-brand-white hover:bg-brand-white/5"
          )}
        >
          <span>Non lues</span>
          {unreadCount > 0 && (
            <span
              className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px] font-black",
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
              className="rounded-xl p-4 sm:p-5 bg-[#0f172a]/60 border border-brand-white/5 animate-pulse flex items-start gap-4"
            >
              <div className="w-10 h-10 rounded-lg bg-brand-white/10 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="flex justify-between items-center">
                  <div className="h-4 w-32 bg-brand-white/10 rounded" />
                  <div className="h-3 w-16 bg-brand-white/5 rounded" />
                </div>
                <div className="h-3 w-full bg-brand-white/5 rounded" />
                <div className="h-3 w-2/3 bg-brand-white/5 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredNotifications.length === 0 ? (
        /* État vide */
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#0f172a]/40 border border-brand-white/10 border-dashed rounded-xl p-12 text-center space-y-4 my-8"
        >
          <div className="w-16 h-16 rounded-full bg-brand-white/5 text-brand-white/30 flex items-center justify-center mx-auto">
            <Bell size={28} />
          </div>
          <div>
            <h2 className="text-lg font-heading font-bold uppercase tracking-wider text-brand-white/80">
              {filter === "unread" ? "Aucune notification non lue" : "Aucune alerte pour le moment"}
            </h2>
            <p className="text-xs text-brand-white/40 mt-1 max-w-sm mx-auto">
              {filter === "unread"
                ? "Vous avez consulté toutes vos alertes. Les nouvelles notifications apparaîtront ici."
                : "Vos prochaines confirmations de réservations, actualités du club et défis apparaîtront ici."}
            </p>
          </div>
          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <Link
              href="/membre/planning"
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-blue text-brand-black font-heading font-bold text-xs uppercase tracking-wider rounded-sm hover:bg-brand-white transition-colors"
            >
              <Calendar size={14} />
              Accéder au planning
            </Link>
          </div>
        </motion.div>
      ) : (
        /* Liste des notifications */
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-3"
        >
          <AnimatePresence initial={false}>
            {filteredNotifications.map((notif) => {
              const isUnread = !notif.is_read;
              const isActionLoading = actionLoadingId === notif.id;

              return (
                <motion.div
                  key={notif.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => handleNotificationClick(notif)}
                  className={cn(
                    "group relative rounded-xl p-4 sm:p-5 flex items-start gap-4 transition-all duration-200 border cursor-pointer select-none",
                    isUnread
                      ? "bg-gradient-to-r from-[#101b33] to-[#0a1120] border-[#00d8ff]/30 shadow-lg shadow-[#00d8ff]/5 hover:border-[#00d8ff]/60"
                      : "bg-[#0a1120]/70 border-brand-white/10 hover:border-brand-white/20 hover:bg-[#0f172a]/80 opacity-85 hover:opacity-100"
                  )}
                >
                  {/* Pastille non lue */}
                  {isUnread && (
                    <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-[#00d8ff] shadow-[0_0_8px_#00d8ff] animate-pulse" />
                  )}

                  {/* Icône de type */}
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

                  {/* Corps de la notification */}
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

                    {/* Bouton d'action si action_url */}
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
