"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  User,
  Mail,
  Phone,
  Shield,
  LogOut,
  Edit3,
  Lock,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { EditProfileModal, ChangePasswordModal } from "./modals/ProfileModals";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface MemberProfileViewProps {
  initialUser: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    role: string;
    createdAt?: string;
  };
}

export default function MemberProfileView({ initialUser }: MemberProfileViewProps) {
  const [userData, setUserData] = useState(initialUser);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/connexion");
    router.refresh();
  };

  const initials = userData.firstName
    ? `${userData.firstName.charAt(0)}${userData.lastName ? userData.lastName.charAt(0) : ""}`.toUpperCase()
    : "M";

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8 pt-2">
      
      {/* Header & Avatar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-5 pb-6 border-b border-brand-white/10">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-brand-blue to-[#00d8ff] text-brand-black flex items-center justify-center text-3xl font-heading font-black shadow-lg shadow-brand-blue/20">
          {initials}
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-heading font-bold uppercase tracking-wider text-brand-white">
              {userData.firstName || userData.lastName
                ? `${userData.firstName} ${userData.lastName}`.trim()
                : "Mon Profil"}
            </h1>
            <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded bg-brand-blue/20 text-brand-blue border border-brand-blue/30">
              {userData.role}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-brand-white/50">{userData.email}</p>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━
          INFORMATIONS PERSONNELLES
          ━━━━━━━━━━━━━━━━━━━━ */}
      <section className="space-y-4">
        <h2 className="text-base font-heading font-bold uppercase tracking-wider text-brand-white flex items-center gap-2">
          <User size={18} className="text-brand-blue" />
          Informations personnelles
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Prénom */}
          <div className="p-4 bg-[#0f172a] border border-brand-white/10 rounded-xl space-y-1">
            <p className="text-[11px] font-semibold text-brand-white/40 uppercase tracking-wider">
              Prénom
            </p>
            <p className="text-sm font-bold text-brand-white">
              {userData.firstName || "Non renseigné"}
            </p>
          </div>

          {/* Nom */}
          <div className="p-4 bg-[#0f172a] border border-brand-white/10 rounded-xl space-y-1">
            <p className="text-[11px] font-semibold text-brand-white/40 uppercase tracking-wider">
              Nom
            </p>
            <p className="text-sm font-bold text-brand-white">
              {userData.lastName || "Non renseigné"}
            </p>
          </div>

          {/* Email */}
          <div className="p-4 bg-[#0f172a] border border-brand-white/10 rounded-xl space-y-1">
            <p className="text-[11px] font-semibold text-brand-white/40 uppercase tracking-wider flex items-center gap-1.5">
              <Mail size={13} className="text-brand-blue" />
              Adresse Email
            </p>
            <p className="text-sm font-bold text-brand-white truncate">
              {userData.email}
            </p>
          </div>

          {/* Téléphone */}
          <div className="p-4 bg-[#0f172a] border border-brand-white/10 rounded-xl space-y-1">
            <p className="text-[11px] font-semibold text-brand-white/40 uppercase tracking-wider flex items-center gap-1.5">
              <Phone size={13} className="text-brand-blue" />
              Téléphone
            </p>
            <p className="text-sm font-bold text-brand-white">
              {userData.phone || "Non renseigné"}
            </p>
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━
          SECTION : MON COMPTE
          ━━━━━━━━━━━━━━━━━━━━ */}
      <section className="space-y-4">
        <h2 className="text-base font-heading font-bold uppercase tracking-wider text-brand-white flex items-center gap-2">
          <Shield size={18} className="text-brand-blue" />
          Mon compte
        </h2>

        <div className="bg-[#0f172a] border border-brand-white/10 rounded-xl divide-y divide-brand-white/5 overflow-hidden">
          {/* Bouton : Modifier mon profil */}
          <button
            onClick={() => setIsEditProfileOpen(true)}
            className="w-full p-4 flex items-center justify-between hover:bg-brand-white/5 transition-colors cursor-pointer text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-brand-blue/10 text-brand-blue flex items-center justify-center">
                <Edit3 size={17} />
              </div>
              <div>
                <p className="text-sm font-heading font-bold uppercase tracking-wider text-brand-white group-hover:text-brand-blue transition-colors">
                  Modifier mon profil
                </p>
                <p className="text-xs text-brand-white/40">
                  Nom, prénom et numéro de téléphone
                </p>
              </div>
            </div>
            <ChevronRight size={18} className="text-brand-white/40 group-hover:text-brand-white transition-colors" />
          </button>

          {/* Bouton : Modifier mon mot de passe */}
          <button
            onClick={() => setIsChangePasswordOpen(true)}
            className="w-full p-4 flex items-center justify-between hover:bg-brand-white/5 transition-colors cursor-pointer text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-brand-blue/10 text-brand-blue flex items-center justify-center">
                <Lock size={17} />
              </div>
              <div>
                <p className="text-sm font-heading font-bold uppercase tracking-wider text-brand-white group-hover:text-brand-blue transition-colors">
                  Modifier mon mot de passe
                </p>
                <p className="text-xs text-brand-white/40">
                  Sécurité et accès à votre compte
                </p>
              </div>
            </div>
            <ChevronRight size={18} className="text-brand-white/40 group-hover:text-brand-white transition-colors" />
          </button>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━
          DÉCONNEXION
          ━━━━━━━━━━━━━━━━━━━━ */}
      <div className="pt-4 pb-2">
        <form action="/deconnexion" method="POST">
          <button
            type="submit"
            disabled={isLoggingOut}
            className="w-full py-4 px-6 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 rounded-xl font-heading font-bold text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut size={18} />
            DÉCONNEXION
          </button>
        </form>
      </div>

      {/* Modals de profil */}
      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        initialData={{
          firstName: userData.firstName,
          lastName: userData.lastName,
          phone: userData.phone,
        }}
        onSuccess={() => {
          // Recharger ou mettre à jour
          router.refresh();
        }}
      />

      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />

    </div>
  );
}
