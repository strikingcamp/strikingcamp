"use client";

import { openCookiePreferences } from "@/lib/analytics";

interface ManageCookiesButtonProps {
  className?: string;
  children?: React.ReactNode;
}

export default function ManageCookiesButton({
  className = "inline-flex items-center gap-2 px-5 py-2.5 bg-brand-blue text-brand-black font-heading font-bold text-xs uppercase tracking-wider rounded-sm hover:bg-brand-white transition-all cursor-pointer shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue",
  children = "Modifier mes préférences de cookies",
}: ManageCookiesButtonProps) {
  return (
    <button
      type="button"
      onClick={() => openCookiePreferences()}
      className={className}
    >
      {children}
    </button>
  );
}
