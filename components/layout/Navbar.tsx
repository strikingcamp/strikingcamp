"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Accueil" },
  { href: "/club", label: "Le Club" },
  { href: "/evenements", label: "Événements" },
  { href: "/planning", label: "Planning" },
  { href: "/tarifs", label: "Tarifs" },
  { href: "/contact", label: "Contact" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (pathname?.startsWith("/membre") || pathname?.startsWith("/admin")) {
    return null;
  }

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={cn(
        "fixed top-0 w-full z-50 transition-all duration-300 border-b border-transparent",
        isScrolled
          ? "bg-brand-black/80 backdrop-blur-md border-brand-white/10 py-4"
          : "bg-transparent py-6"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
        <Link href="/" className="text-xl font-heading font-bold uppercase tracking-widest text-brand-blue">
          STRIKING <span className="text-brand-white">CAMP</span>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center space-x-6 lg:space-x-8">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-brand-white/70 hover:text-brand-white transition-colors uppercase tracking-wider"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/connexion"
            className="px-5 py-2.5 bg-brand-blue text-brand-black font-heading font-bold text-xs uppercase tracking-wider hover:bg-brand-white transition-colors rounded-sm shadow-md shadow-brand-blue/20"
          >
            SE CONNECTER
          </Link>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden text-brand-white p-2"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "100vh" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden absolute top-full left-0 w-full bg-brand-black border-t border-brand-white/10 flex flex-col items-center justify-center space-y-6"
          >
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-xl font-heading font-bold text-brand-white hover:text-brand-blue transition-colors uppercase tracking-widest"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/connexion"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-8 py-3.5 bg-brand-blue text-brand-black font-heading font-bold text-base uppercase tracking-wider w-[80%] text-center rounded-sm shadow-lg shadow-brand-blue/30"
            >
              SE CONNECTER
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
