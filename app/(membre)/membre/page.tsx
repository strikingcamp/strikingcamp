import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { User, Mail, Phone, Shield, LogOut } from "lucide-react";

export const metadata: Metadata = {
  title: "Mon Espace Membre — Striking Camp",
  robots: { index: false, follow: false },
};

/**
 * Page d'accueil de l'espace membre — /membre
 *
 * Accessible uniquement aux utilisateurs authentifiés.
 * Récupère le profil utilisateur (prénom, nom, email, téléphone, rôle)
 * depuis Supabase Auth.
 */
export default async function MembrePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/connexion");
  }

  const meta = user.user_metadata || {};
  const firstName = meta.first_name || "";
  const lastName = meta.last_name || "";
  const phone = meta.phone || "";
  const role = meta.role || "CLIENT";

  return (
    <section className="min-h-screen flex items-center justify-center px-4 py-24">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-blue/10 border border-brand-blue/20 rounded-full text-brand-blue text-xs font-semibold uppercase tracking-widest mb-4">
            <span className="w-2 h-2 rounded-full bg-brand-blue animate-pulse" />
            Espace Membre
          </div>
          <h1 className="text-3xl sm:text-4xl font-heading font-bold uppercase tracking-wider text-brand-white">
            Bienvenue dans votre espace membre{firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="mt-2 text-brand-white/50 text-sm">
            Gérez vos informations et accédez aux services Striking Camp.
          </p>
        </div>

        {/* Carte de profil */}
        <div className="bg-brand-white/5 border border-brand-white/10 rounded-sm p-6 sm:p-8 mb-6 space-y-6">
          <div className="flex items-center justify-between border-b border-brand-white/10 pb-4">
            <h2 className="text-lg font-heading font-bold uppercase tracking-wider text-brand-white">
              Profil Membre
            </h2>
            <span className="text-xs uppercase tracking-wider px-2.5 py-1 bg-brand-blue/20 text-brand-blue border border-brand-blue/30 rounded-sm font-semibold">
              {role}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nom complet */}
            <div className="flex items-start gap-3 p-3 bg-brand-white/[0.02] border border-brand-white/5 rounded-sm">
              <User size={18} className="text-brand-blue shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-brand-white/40 uppercase tracking-wider">Nom complet</p>
                <p className="text-sm text-brand-white font-medium">
                  {firstName || lastName ? `${firstName} ${lastName}`.trim() : "Non renseigné"}
                </p>
              </div>
            </div>

            {/* Email */}
            <div className="flex items-start gap-3 p-3 bg-brand-white/[0.02] border border-brand-white/5 rounded-sm">
              <Mail size={18} className="text-brand-blue shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-brand-white/40 uppercase tracking-wider">Email</p>
                <p className="text-sm text-brand-white font-medium truncate">
                  {user.email}
                </p>
              </div>
            </div>

            {/* Téléphone */}
            <div className="flex items-start gap-3 p-3 bg-brand-white/[0.02] border border-brand-white/5 rounded-sm">
              <Phone size={18} className="text-brand-blue shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-brand-white/40 uppercase tracking-wider">Téléphone</p>
                <p className="text-sm text-brand-white font-medium">
                  {phone || "Non renseigné"}
                </p>
              </div>
            </div>

            {/* Statut rôle */}
            <div className="flex items-start gap-3 p-3 bg-brand-white/[0.02] border border-brand-white/5 rounded-sm">
              <Shield size={18} className="text-brand-blue shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-brand-white/40 uppercase tracking-wider">Statut</p>
                <p className="text-sm text-brand-white font-medium">
                  Compte actif
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-brand-white/[0.02] border border-brand-white/5 rounded-sm text-xs text-brand-white/50 leading-relaxed">
            💡 Les modules de réservation et de planning personnalisé seront disponibles très prochainement.
          </div>
        </div>

        {/* Action déconnexion */}
        <div className="flex items-center justify-between">
          <form action="/deconnexion" method="POST">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-white/10 hover:bg-red-500/20 text-brand-white/80 hover:text-red-400 border border-brand-white/10 hover:border-red-500/30 text-sm font-medium rounded-sm transition-all cursor-pointer"
            >
              <LogOut size={16} />
              Se déconnecter
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
