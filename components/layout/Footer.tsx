import Link from "next/link";
import { siteData } from "@/data/content";

export default function Footer() {
  return (
    <footer className="bg-brand-black border-t border-brand-white/10 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-1">
            <Link href="/" className="text-2xl font-heading font-bold uppercase tracking-widest text-brand-white block mb-4">
              STRIKING <span className="text-brand-blue">CAMP</span>
            </Link>
            <p className="text-brand-white/60 text-sm">
              {siteData.global.disciplines}<br/>
              {siteData.global.location}
            </p>
          </div>
          
          <div>
            <h4 className="text-brand-white font-bold uppercase tracking-wider mb-6 text-sm">Navigation</h4>
            <ul className="space-y-4">
              <li><Link href="/" className="text-brand-white/60 hover:text-brand-blue transition-colors text-sm">Accueil</Link></li>
              <li><Link href="#le-club" className="text-brand-white/60 hover:text-brand-blue transition-colors text-sm">Le Club</Link></li>
              <li><Link href="#le-coach" className="text-brand-white/60 hover:text-brand-blue transition-colors text-sm">Le Coach</Link></li>
              <li><Link href="#contact" className="text-brand-white/60 hover:text-brand-blue transition-colors text-sm">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-brand-white font-bold uppercase tracking-wider mb-6 text-sm">Informations</h4>
            <ul className="space-y-4">
              <li><Link href="/mentions-legales" className="text-brand-white/60 hover:text-brand-white transition-colors text-sm">Mentions légales</Link></li>
              <li><Link href="/confidentialite" className="text-brand-white/60 hover:text-brand-white transition-colors text-sm">Politique de confidentialité</Link></li>
              <li><Link href="/cookies" className="text-brand-white/60 hover:text-brand-white transition-colors text-sm">Politique de cookies</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-brand-white font-bold uppercase tracking-wider mb-6 text-sm">Social</h4>
            <div className="flex space-x-4">
              <a href={siteData.contact.instagram} target="_blank" rel="noopener noreferrer" className="text-brand-white/60 hover:text-brand-blue transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
              </a>
              <a href={siteData.contact.youtube} target="_blank" rel="noopener noreferrer" className="text-brand-white/60 hover:text-brand-blue transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.94 2c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg>
              </a>
            </div>
          </div>
        </div>
        
        <div className="border-t border-brand-white/10 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-brand-white/40 text-xs text-center md:text-left">
            {siteData.global.copyright}
          </p>
          <p className="text-brand-white/40 text-xs mt-4 md:mt-0">
            Design & Développement par <a href="https://mickaelcode.com/" target="_blank" rel="noopener noreferrer" className="text-brand-white hover:text-brand-blue transition-colors">Mickael</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
