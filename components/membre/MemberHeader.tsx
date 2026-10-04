"use client";

import Link from "next/link";
import { Bell } from "lucide-react";

import { useMember } from "@/components/membre/MemberContext";

interface MemberHeaderProps {
  firstName?: string;
  lastName?: string;
  role?: string;
}

export default function MemberHeader({ firstName, lastName, role = "Membre" }: MemberHeaderProps) {
  const { unreadNotificationsCount } = useMember();
  const initials = firstName
    ? `${firstName.charAt(0)}${lastName ? lastName.charAt(0) : ""}`.toUpperCase()
    : "M";

  return (
    <header className="sticky top-0 z-30 w-full bg-[#0a1120]/80 backdrop-blur-md border-b border-brand-white/10 py-3.5 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <Link href="/membre" className="flex items-center gap-2">
          <span className="text-lg sm:text-xl font-heading font-bold uppercase tracking-widest text-brand-blue">
            STRIKING <span className="text-brand-white">CAMP</span>
          </span>
          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-brand-blue/15 text-brand-blue border border-brand-blue/30 tracking-wider hidden xs:inline-block">
            {role}
          </span>
        </Link>

        {/* Quick Nav Right */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/membre/alertes"
            className="w-9 h-9 rounded-full bg-brand-white/5 hover:bg-brand-white/10 border border-brand-white/10 flex items-center justify-center text-brand-white/70 hover:text-brand-white transition-colors relative"
            aria-label={unreadNotificationsCount > 0 ? `Alertes (${unreadNotificationsCount} non lues)` : "Alertes"}
          >
            <Bell size={16} />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-brand-blue text-brand-black text-[10px] font-heading font-black flex items-center justify-center shadow-[0_0_8px_rgba(47,174,224,0.6)]">
                {unreadNotificationsCount > 99 ? "99+" : unreadNotificationsCount}
              </span>
            )}
          </Link>

          <Link
            href="/membre/profil"
            className="flex items-center gap-2 pl-2 pr-3 py-1 bg-brand-white/5 hover:bg-brand-white/10 border border-brand-white/10 rounded-full transition-colors group"
          >
            <div className="w-7 h-7 rounded-full bg-brand-blue text-brand-black font-bold text-xs flex items-center justify-center font-heading">
              {initials}
            </div>
            <span className="text-xs font-medium text-brand-white/80 group-hover:text-brand-white hidden sm:inline-block">
              {firstName ? firstName : "Mon Profil"}
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
