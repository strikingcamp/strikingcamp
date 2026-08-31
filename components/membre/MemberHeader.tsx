"use client";

import Link from "next/link";
import { User } from "lucide-react";
import NotificationBell from "@/components/notifications/NotificationBell";

interface MemberHeaderProps {
  firstName?: string;
  lastName?: string;
  role?: string;
}

export default function MemberHeader({ firstName, lastName, role = "Membre" }: MemberHeaderProps) {
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
          <NotificationBell
            href="/membre/alertes"
            targetRole="member"
            iconSize={16}
            ariaLabel="Alertes et notifications membre"
          />

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
