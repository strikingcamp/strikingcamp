"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  Users,
  BookmarkCheck,
  CreditCard,
  Layers,
  Sparkles,
  Settings,
  ArrowLeft,
  Shield,
  Trophy,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const navItems = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    label: "Planning & Cours",
    href: "/admin/planning",
    icon: Calendar,
  },
  {
    label: "Défis",
    href: "/admin/defis",
    icon: Trophy,
  },
  {
    label: "Alertes",
    href: "/admin/alertes",
    icon: Bell,
  },
  {
    label: "Membres",
    href: "/admin/membres",
    icon: Users,
  },
  {
    label: "Réservations",
    href: "/admin/reservations",
    icon: BookmarkCheck,
  },
  {
    label: "Formules & Tarifs",
    href: "/admin/formules",
    icon: CreditCard,
  },
  {
    label: "Abonnements",
    href: "/admin/abonnements",
    icon: Layers,
  },
  {
    label: "Événements",
    href: "/admin/evenements",
    icon: Sparkles,
  },
  {
    label: "Paramètres & Sécurité",
    href: "/admin/parametres",
    icon: Settings,
  },
];

export default function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const pathname = usePathname();

  const isActive = (item: (typeof navItems)[0]) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname.startsWith(item.href);
  };

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-brand-black/80 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 bottom-0 w-64 bg-[#080d1a] border-r border-brand-white/10 z-50 flex flex-col transition-transform duration-300 lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo & Header */}
        <div className="h-16 border-b border-brand-white/10 flex items-center justify-between px-6">
          <Link href="/admin" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-blue/15 text-brand-blue flex items-center justify-center border border-brand-blue/30 font-heading font-black text-sm">
              SC
            </div>
            <div>
              <span className="font-heading font-black text-base uppercase tracking-wider text-brand-white">
                STRIKING <span className="text-brand-blue">CAMP</span>
              </span>
              <span className="text-[9px] font-bold text-brand-blue uppercase tracking-widest -mt-1 flex items-center gap-1">
                <Shield size={10} />
                ESPACE ADMIN
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation links */}
        <div className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-brand-white/40">
            Menu d&apos;administration
          </div>

          {navItems.map((item) => {
            const active = isActive(item);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-heading font-bold uppercase tracking-wider transition-all duration-200",
                  active
                    ? "bg-brand-blue text-brand-black shadow-md shadow-brand-blue/20"
                    : "text-brand-white/60 hover:text-brand-white hover:bg-brand-white/5"
                )}
              >
                <Icon size={18} className={cn(active ? "text-brand-black" : "text-brand-blue/80")} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Footer shortcuts */}
        <div className="p-4 border-t border-brand-white/10 space-y-2">
          <Link
            href="/membre"
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-brand-white/70 hover:text-brand-white hover:bg-brand-white/5 rounded-lg transition-colors"
          >
            <ArrowLeft size={14} className="text-brand-blue" />
            <span>Retour Espace Membre</span>
          </Link>
          <div className="px-3 pt-1 text-[10px] text-brand-white/30">
            Striking Camp Administration · V1.0
          </div>
        </div>
      </aside>
    </>
  );
}
