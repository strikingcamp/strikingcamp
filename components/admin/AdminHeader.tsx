"use client";

import { Menu, Shield, LogOut } from "lucide-react";
import Link from "next/link";

interface AdminHeaderProps {
  onToggleSidebar?: () => void;
  adminName?: string;
}

export default function AdminHeader({
  onToggleSidebar,
  adminName = "Administrateur",
}: AdminHeaderProps) {
  return (
    <header className="sticky top-0 z-30 h-16 bg-[#060a14]/90 backdrop-blur-md border-b border-brand-white/10 px-4 sm:px-8 flex items-center justify-between">
      {/* Left: Mobile Toggle & Welcome */}
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 -ml-2 rounded-lg text-brand-white/70 hover:text-brand-white hover:bg-brand-white/5 lg:hidden cursor-pointer"
          aria-label="Ouvrir le menu"
        >
          <Menu size={22} />
        </button>

        <div className="hidden sm:block">
          <span className="text-xs font-bold text-brand-white/40 uppercase tracking-wider block">
            Tableau de bord de gestion
          </span>
          <span className="text-sm font-heading font-black uppercase tracking-wider text-brand-white">
            Striking Camp Marseille
          </span>
        </div>
      </div>

      {/* Right: Admin badge & Actions */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Admin Tag */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-blue/15 border border-brand-blue/30 text-brand-blue text-xs font-heading font-bold uppercase tracking-wider">
          <Shield size={14} />
          <span className="hidden sm:inline">{adminName}</span>
          <span className="sm:hidden">Admin</span>
        </div>

        {/* Logout button */}
        <Link
          href="/deconnexion"
          className="p-2 rounded-lg text-brand-white/60 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all cursor-pointer"
          title="Déconnexion"
        >
          <LogOut size={18} />
        </Link>
      </div>
    </header>
  );
}
