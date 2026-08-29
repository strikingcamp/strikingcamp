"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { siteData } from "@/data/content";

export default function Footer() {
  const pathname = usePathname();

  if (pathname?.startsWith("/membre") || pathname?.startsWith("/admin")) {
    return null;
  }

  return (
    <footer className="relative z-20 w-full bg-[#030712]/90 border-t border-brand-white/10 pt-16 pb-8 backdrop-blur-md font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 md:gap-12 mb-14">
          
          {/* COLONNE 1 : MARQUE */}
          <div className="col-span-1">
            <Link href="/" className="text-2xl font-heading font-black uppercase tracking-widest text-brand-white block mb-4">
              STRIKING <span className="text-brand-blue">CAMP</span>
            </Link>
            <p className="text-brand-white/60 text-sm leading-relaxed">
              Boxe Anglaise, Kickboxing & Muay Thaï<br/>
              Marseille
            </p>
          </div>
          
          {/* COLONNE 2 : NAVIGATION */}
          <div>
            <h4 className="text-brand-white font-heading font-bold uppercase tracking-wider mb-5 text-sm">
              Navigation
            </h4>
            <ul className="space-y-3">
              <li>
                <Link href="/" className="text-brand-white/60 hover:text-brand-blue transition-colors text-sm font-medium">
                  Accueil
                </Link>
              </li>
              <li>
                <Link href="/club" className="text-brand-white/60 hover:text-brand-blue transition-colors text-sm font-medium">
                  Le Club
                </Link>
              </li>
              <li>
                <Link href="/planning" className="text-brand-white/60 hover:text-brand-blue transition-colors text-sm font-medium">
                  Planning
                </Link>
              </li>
              <li>
                <Link href="/tarifs" className="text-brand-white/60 hover:text-brand-blue transition-colors text-sm font-medium">
                  Tarifs
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-brand-white/60 hover:text-brand-blue transition-colors text-sm font-medium">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* COLONNE 3 : INFORMATIONS */}
          <div>
            <h4 className="text-brand-white font-heading font-bold uppercase tracking-wider mb-5 text-sm">
              Informations
            </h4>
            <ul className="space-y-3">
              <li>
                <Link href="/mentions-legales" className="text-brand-white/60 hover:text-brand-blue transition-colors text-sm font-medium">
                  Mentions légales
                </Link>
              </li>
              <li>
                <Link href="/confidentialite" className="text-brand-white/60 hover:text-brand-blue transition-colors text-sm font-medium">
                  Politique de confidentialité
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="text-brand-white/60 hover:text-brand-blue transition-colors text-sm font-medium">
                  Politique de cookies
                </Link>
              </li>
            </ul>
          </div>

          {/* COLONNE 4 : SOCIAL */}
          <div>
            <h4 className="text-brand-white font-heading font-bold uppercase tracking-wider mb-5 text-sm">
              Social
            </h4>
            <div className="flex items-center space-x-4">
              <a
                href={siteData.contact.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram Striking Camp"
                className="w-10 h-10 rounded-lg bg-brand-white/5 border border-brand-white/10 flex items-center justify-center text-brand-white/70 hover:text-brand-blue hover:border-brand-blue/40 hover:bg-brand-blue/10 transition-all duration-300 shadow-sm"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
              </a>
              <a
                href={siteData.contact.youtube}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube Striking Camp"
                className="w-10 h-10 rounded-lg bg-brand-white/5 border border-brand-white/10 flex items-center justify-center text-brand-white/70 hover:text-brand-blue hover:border-brand-blue/40 hover:bg-brand-blue/10 transition-all duration-300 shadow-sm"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.94 2c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z"></path>
                  <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon>
                </svg>
              </a>
            </div>
          </div>
        </div>
        
        {/* LIGNE DE SÉPARATION & COPYRIGHT */}
        <div className="border-t border-brand-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-brand-white/40 text-xs text-center md:text-left">
            © 2026 Striking Camp. Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  );
}
