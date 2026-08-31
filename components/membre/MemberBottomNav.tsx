"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Trophy, Plus, Bell, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/useNotifications";

export default function MemberBottomNav() {
  const pathname = usePathname();
  const { unreadCount } = useNotifications({ targetRole: "member" });

  const isRouteActive = (route: string) => {
    if (route === "/membre") {
      return pathname === "/membre";
    }
    return pathname.startsWith(route);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40">
      {/* Container with backdrop blur and border */}
      <div className="bg-[#0a1120]/95 backdrop-blur-xl border-t border-brand-white/10 shadow-[0_-10px_30px_rgba(0,0,0,0.8)] pb-safe">
        <div className="max-w-lg mx-auto px-4 h-16 sm:h-18 flex items-center justify-between relative">
          
          {/* 1. ACCUEIL */}
          <Link
            href="/membre"
            className={cn(
              "flex-1 flex flex-col items-center justify-center py-2 transition-colors relative group",
              isRouteActive("/membre")
                ? "text-brand-blue"
                : "text-brand-white/50 hover:text-brand-white"
            )}
          >
            <div className="relative">
              <Home size={20} className="transition-transform group-hover:scale-110" />
              {isRouteActive("/membre") && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-brand-blue rounded-full"
                />
              )}
            </div>
            <span className="text-[10px] font-heading uppercase font-bold tracking-wider mt-1">
              Accueil
            </span>
          </Link>

          {/* 2. DÉFIS */}
          <Link
            href="/membre/defis"
            className={cn(
              "flex-1 flex flex-col items-center justify-center py-2 transition-colors relative group",
              isRouteActive("/membre/defis")
                ? "text-brand-blue"
                : "text-brand-white/50 hover:text-brand-white"
            )}
          >
            <div className="relative">
              <Trophy size={20} className="transition-transform group-hover:scale-110" />
              {isRouteActive("/membre/defis") && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-brand-blue rounded-full"
                />
              )}
            </div>
            <span className="text-[10px] font-heading uppercase font-bold tracking-wider mt-1">
              Défis
            </span>
          </Link>

          {/* 3. BOUTON + (CENTRE, POINT D'ACCÈS PRINCIPAL À LA RÉSERVATION) */}
          <div className="flex-1 flex justify-center items-center relative -top-3">
            <Link
              href="/membre/planning"
              className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-brand-blue to-[#00d8ff] text-brand-black flex items-center justify-center shadow-[0_0_20px_rgba(47,174,224,0.5)] border-4 border-[#0a1120] hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer group"
              aria-label="Réserver un cours"
            >
              <Plus
                size={26}
                strokeWidth={2.8}
                className="group-hover:rotate-90 transition-transform duration-300"
              />
            </Link>
          </div>

          {/* 4. ALERTES */}
          <Link
            href="/membre/alertes"
            className={cn(
              "flex-1 flex flex-col items-center justify-center py-2 transition-colors relative group",
              isRouteActive("/membre/alertes")
                ? "text-brand-blue"
                : "text-brand-white/50 hover:text-brand-white"
            )}
          >
            <div className="relative">
              <Bell size={20} className="transition-transform group-hover:scale-110" />
              <AnimatePresence>
                {unreadCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -top-1 -right-2 min-w-[15px] h-[15px] px-0.5 rounded-full bg-[#00d8ff] text-black font-heading font-black text-[9px] leading-none flex items-center justify-center border border-[#0a1120]"
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </motion.span>
                )}
              </AnimatePresence>
              {isRouteActive("/membre/alertes") && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-brand-blue rounded-full"
                />
              )}
            </div>
            <span className="text-[10px] font-heading uppercase font-bold tracking-wider mt-1">
              Alertes
            </span>
          </Link>

          {/* 5. PROFIL */}
          <Link
            href="/membre/profil"
            className={cn(
              "flex-1 flex flex-col items-center justify-center py-2 transition-colors relative group",
              isRouteActive("/membre/profil")
                ? "text-brand-blue"
                : "text-brand-white/50 hover:text-brand-white"
            )}
          >
            <div className="relative">
              <User size={20} className="transition-transform group-hover:scale-110" />
              {isRouteActive("/membre/profil") && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-brand-blue rounded-full"
                />
              )}
            </div>
            <span className="text-[10px] font-heading uppercase font-bold tracking-wider mt-1">
              Profil
            </span>
          </Link>

        </div>
      </div>
    </div>
  );
}
