"use client";

import Link from "next/link";
import { Bell, User } from "lucide-react";

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
          <Link
            href="/membre/alertes"
            className="w-9 h-9 rounded-full bg-brand-white/5 hover:bg-brand-white/10 border border-brand-white/10 flex items-center justify-center text-brand-white/70 hover:text-brand-white transition-colors relative"
            aria-label="Alertes"
          >
            <Bell size={16} />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-brand-blue animate-pulse" />
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
