"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/useNotifications";
import type { NotificationTargetRole } from "@/lib/supabase/notifications";

interface NotificationBellProps {
  href?: string;
  targetRole?: NotificationTargetRole;
  unreadCount?: number;
  className?: string;
  iconSize?: number;
  badgeClassName?: string;
  ariaLabel?: string;
}

export default function NotificationBell({
  href = "/membre/alertes",
  targetRole = "member",
  unreadCount: propUnreadCount,
  className,
  iconSize = 18,
  badgeClassName,
  ariaLabel = "Notifications et alertes",
}: NotificationBellProps) {
  // Si le compte non lu n'est pas fourni en prop, on le charge via le hook
  const { unreadCount: hookUnreadCount } = useNotifications({
    targetRole,
    autoSubscribe: true,
  });

  const count = typeof propUnreadCount === "number" ? propUnreadCount : hookUnreadCount;
  const displayCount = count > 99 ? "99+" : count.toString();

  return (
    <Link
      href={href}
      className={cn(
        "relative w-9 h-9 rounded-full bg-brand-white/5 hover:bg-brand-white/10 border border-brand-white/10 flex items-center justify-center text-brand-white/70 hover:text-brand-white transition-colors group cursor-pointer",
        className
      )}
      aria-label={`${ariaLabel} (${count} non lue${count > 1 ? "s" : ""})`}
      title={`${ariaLabel} (${count} non lue${count > 1 ? "s" : ""})`}
    >
      <Bell
        size={iconSize}
        className="transition-transform group-hover:scale-110 duration-200"
      />

      <AnimatePresence>
        {count > 0 && (
          <motion.span
            key="unread-badge"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
            className={cn(
              "absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#00d8ff] text-black font-heading font-black text-[10px] leading-none flex items-center justify-center shadow-[0_0_10px_rgba(0,216,255,0.6)] border border-[#060a14]",
              badgeClassName
            )}
          >
            {displayCount}
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  );
}
