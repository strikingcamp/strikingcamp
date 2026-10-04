"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  CheckCheck,
  Clock,
  Utensils,
  Dumbbell,
  Flame,
  ArrowRight,
  Settings,
  Sparkles,
  Inbox,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { NotificationLog } from "@/lib/supabase/notifications";
import {
  markMemberNotificationAsReadAction,
  markAllMemberNotificationsAsReadAction,
} from "@/app/(membre)/actions";
import { useMember } from "@/components/membre/MemberContext";

interface MemberAlertsViewProps {
  initialNotifications?: NotificationLog[];
}

import {
  getSafeActionUrl,
  formatNotificationDate,
  getNotificationCategoryMeta,
} from "@/lib/notifications/notification-ui-helpers";

const CATEGORY_ICON_MAP = {
  utensils: Utensils,
  dumbbell: Dumbbell,
  flame: Flame,
  bell: Bell,
};

export default function MemberAlertsView({
  initialNotifications = [],
}: MemberAlertsViewProps) {
  const router = useRouter();
  const { decrementUnreadCount, resetUnreadCount } = useMember();

  const [notifications, setNotifications] =
    useState<NotificationLog[]>(initialNotifications);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [isPending, startTransition] = useTransition();
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);

  // Nombre de notifications non lues calculé en temps réel
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );

  // Liste filtrée selon l'onglet actif
  const filteredNotifications = useMemo(() => {
    if (filter === "unread") {
      return notifications.filter((n) => !n.is_read);
    }
    return notifications;
  }, [notifications, filter]);

  /**
   * Marque une notification comme lue et met à jour l'état local et global
   */
  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const target = notifications.find((n) => n.id === id);
    if (!target || target.is_read) return;

    // Mise à jour optimiste immédiate
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    decrementUnreadCount();

    try {
      await markMemberNotificationAsReadAction(id);
    } catch (err) {
      console.error("[MemberAlertsView] Erreur marquage lu :", err);
    }
  };

  /**
   * Marque l'ensemble des notifications non lues comme lues
   */
  const handleMarkAllAsRead = () => {
    if (unreadCount === 0) return;

    startTransition(async () => {
      // Optimiste
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      resetUnreadCount();

      try {
        await markAllMemberNotificationsAsReadAction();
      } catch (err) {
        console.error("[MemberAlertsView] Erreur tout marquer lu :", err);
      }
    });
  };

  /**
   * Clic sur une notification : la marque comme lue et navigue vers l'action_url sécurisée
   */
  const handleNotificationClick = async (notif: NotificationLog) => {
    const safeUrl = getSafeActionUrl(notif.action_url);

    if (!notif.is_read) {
      setActionInProgressId(notif.id);
      await handleMarkAsRead(notif.id);
      setActionInProgressId(null);
    }

    if (safeUrl) {
      router.push(safeUrl);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6 pt-2 pb-12">
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          1. EN-TÊTE PRINCIPAL DU CENTRE DE NOTIFICATIONS
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-heading font-black uppercase tracking-wider text-brand-white">
              Notifications
            </h1>
            {unreadCount > 0 && (
              <span
                data-testid="unread-badge-count"
                className="px-2 py-0.5 rounded-full bg-brand-blue/15 text-brand-blue border border-brand-blue/30 text-xs font-heading font-bold"
              >
                {unreadCount} non lue{unreadCount > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-brand-white/50">
            Retrouvez tous vos rappels de nutrition, entraînements et séances au club.
          </p>
        </div>

        {/* Actions d'en-tête */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {unreadCount > 0 && (
            <button
              type="button"
              disabled={isPending}
              onClick={handleMarkAllAsRead}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-white/5 hover:bg-brand-white/10 text-brand-white/80 hover:text-brand-white border border-brand-white/10 text-xs font-heading font-bold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 size={13} className="animate-spin text-brand-blue" />
              ) : (
                <CheckCheck size={14} className="text-brand-blue" />
              )}
              <span>Tout marquer comme lu</span>
            </button>
          )}

          <Link
            href="/membre/profil"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-white/5 hover:bg-brand-white/10 text-brand-white/70 hover:text-brand-white border border-brand-white/10 text-xs font-heading font-bold uppercase tracking-wider transition-colors"
            title="Gérer mes préférences de rappels"
          >
            <Settings size={14} />
            <span className="hidden xs:inline">Réglages</span>
          </Link>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          2. FILTRES D'AFFICHAGE (TOUTES / NON LUES)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="flex items-center gap-2 border-b border-brand-white/10 pb-3">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={cn(
            "px-3.5 py-1.5 rounded-lg text-xs font-heading font-bold uppercase tracking-wider transition-all cursor-pointer",
            filter === "all"
              ? "bg-brand-blue text-brand-black shadow-md shadow-brand-blue/10"
              : "text-brand-white/60 hover:text-brand-white hover:bg-brand-white/5"
          )}
        >
          Toutes ({notifications.length})
        </button>

        <button
          type="button"
          onClick={() => setFilter("unread")}
          className={cn(
            "px-3.5 py-1.5 rounded-lg text-xs font-heading font-bold uppercase tracking-wider transition-all cursor-pointer relative",
            filter === "unread"
              ? "bg-brand-blue text-brand-black shadow-md shadow-brand-blue/10"
              : "text-brand-white/60 hover:text-brand-white hover:bg-brand-white/5"
          )}
        >
          <span>Non lues</span>
          {unreadCount > 0 && (
            <span
              className={cn(
                "ml-1.5 px-1.5 py-0.2 rounded-full text-[10px]",
                filter === "unread"
                  ? "bg-brand-black text-brand-blue font-black"
                  : "bg-brand-blue/20 text-brand-blue font-bold"
              )}
            >
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          3. LISTE DES NOTIFICATIONS OU ÉTATS VIDES
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {filteredNotifications.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#0f172a]/60 border border-brand-white/10 rounded-2xl p-8 sm:p-12 text-center space-y-4 my-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-brand-white/5 text-brand-white/40 flex items-center justify-center mx-auto">
            {filter === "unread" ? <CheckCheck size={22} /> : <Inbox size={22} />}
          </div>

          <div className="space-y-1">
            <h2 className="text-base sm:text-lg font-heading font-bold uppercase tracking-wider text-brand-white/90">
              {filter === "unread"
                ? "Vous êtes à jour !"
                : "Aucune notification pour le moment"}
            </h2>
            <p className="text-xs text-brand-white/40 max-w-md mx-auto leading-relaxed">
              {filter === "unread"
                ? "Toutes vos alertes ont été consultées. Les prochains rappels de repas et de séances s'afficheront ici."
                : "Vos rappels programmés (repas, entraînements digitaux et cours physiques au club) apparaîtront automatiquement ici."}
            </p>
          </div>

          <div className="pt-2 flex flex-wrap justify-center gap-2.5">
            {filter === "unread" && (
              <button
                type="button"
                onClick={() => setFilter("all")}
                className="px-4 py-2 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white border border-brand-white/15 rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition-colors"
              >
                Voir toutes les notifications
              </button>
            )}
            <Link
              href="/membre/profil"
              className="px-4 py-2 bg-brand-blue/15 hover:bg-brand-blue text-brand-blue hover:text-brand-black border border-brand-blue/30 rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5"
            >
              <Settings size={13} />
              <span>Gérer mes alertes</span>
            </Link>
            <Link
              href="/membre/planning"
              className="px-4 py-2 bg-brand-blue hover:bg-brand-white text-brand-black font-heading font-bold text-xs uppercase tracking-wider rounded-xl transition-colors"
            >
              Voir le planning
            </Link>
          </div>
        </motion.div>
      ) : (
        <div className="space-y-2.5">
          <AnimatePresence initial={false}>
            {filteredNotifications.map((notif) => {
              const meta = getNotificationCategoryMeta(notif.category);
              const Icon = CATEGORY_ICON_MAP[meta.iconType] || Bell;
              const safeUrl = getSafeActionUrl(notif.action_url);
              const formattedDate = formatNotificationDate(
                notif.sent_at || notif.scheduled_date
              );
              const isUnread = !notif.is_read;

              return (
                <motion.div
                  key={notif.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => handleNotificationClick(notif)}
                  className={cn(
                    "rounded-xl p-4 sm:p-4.5 border transition-all duration-150 flex items-start gap-3 sm:gap-4 relative group",
                    safeUrl ? "cursor-pointer" : "cursor-default",
                    isUnread
                      ? "bg-[#0f172a] border-brand-blue/30 shadow-lg shadow-brand-blue/5 hover:border-brand-blue/60"
                      : "bg-[#0b1220]/70 border-brand-white/5 hover:border-brand-white/15 hover:bg-[#0f172a]/70"
                  )}
                >
                  {/* Point indicateur non lu */}
                  {isUnread && (
                    <span
                      title="Non lue"
                      className="absolute top-4 right-4 w-2 h-2 rounded-full bg-brand-blue shadow-[0_0_8px_rgba(47,174,224,0.8)] animate-pulse"
                    />
                  )}

                  {/* Icône de catégorie */}
                  <div
                    className={cn(
                      "w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                      meta.iconBgClass
                    )}
                  >
                    <Icon size={18} />
                  </div>

                  {/* Contenu textuel */}
                  <div className="flex-1 min-w-0 space-y-1 pr-6 sm:pr-8">
                    {/* Badge catégorie + Date */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={cn(
                          "text-[9px] sm:text-[10px] font-heading font-bold uppercase tracking-wider px-2 py-0.5 rounded border",
                          meta.badgeClass
                        )}
                      >
                        {meta.label}
                      </span>
                      <span className="text-[11px] text-brand-white/40 flex items-center gap-1 font-mono">
                        <Clock size={11} />
                        {formattedDate}
                      </span>
                    </div>

                    {/* Titre */}
                    <h3
                      className={cn(
                        "text-sm font-heading font-bold tracking-wide",
                        isUnread ? "text-brand-white" : "text-brand-white/80"
                      )}
                    >
                      {notif.title}
                    </h3>

                    {/* Corps du message */}
                    <p className="text-xs text-brand-white/60 leading-relaxed break-words">
                      {notif.body}
                    </p>

                    {/* Bouton d'action et marquage individuel */}
                    <div className="pt-2 flex items-center gap-2 flex-wrap">
                      {safeUrl && (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-heading font-bold uppercase tracking-wider transition-colors",
                            isUnread
                              ? "bg-brand-blue text-brand-black hover:bg-brand-white"
                              : "bg-brand-white/10 text-brand-white hover:bg-brand-white/20"
                          )}
                        >
                          <span>{meta.defaultActionLabel}</span>
                          <ArrowRight size={12} />
                        </span>
                      )}

                      {isUnread && (
                        <button
                          type="button"
                          onClick={(e) => handleMarkAsRead(notif.id, e)}
                          disabled={actionInProgressId === notif.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-brand-white/40 hover:text-brand-white hover:bg-brand-white/5 transition-colors cursor-pointer"
                          title="Marquer comme lu"
                        >
                          <Check size={13} className="text-[#22c55e]" />
                          <span>Marquer comme lu</span>
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          4. PIED DE PAGE : RAPPEL ET ACCÈS RÉGLAGES
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="bg-[#0f172a]/40 border border-brand-white/5 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-brand-white/50">
        <div className="flex items-center gap-2">
          <Sparkles size={15} className="text-brand-blue shrink-0" />
          <span>
            Les horaires de rappels sont entièrement personnalisables dans votre profil.
          </span>
        </div>
        <Link
          href="/membre/profil"
          className="text-brand-blue hover:text-brand-white font-heading font-bold uppercase tracking-wider shrink-0 transition-colors"
        >
          Configurer mes horaires →
        </Link>
      </div>
    </div>
  );
}
