"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, User, Phone, Mail, Lock, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: {
    firstName: string;
    lastName: string;
    phone: string;
  };
  onSuccess?: () => void;
}

export function EditProfileModal({
  isOpen,
  onClose,
  initialData,
  onSuccess,
}: EditProfileModalProps) {
  const [firstName, setFirstName] = useState(initialData.firstName);
  const [lastName, setLastName] = useState(initialData.lastName);
  const [phone, setPhone] = useState(initialData.phone);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
      },
    });

    setLoading(false);

    if (updateError) {
      setError(updateError.message || "Erreur lors de la mise à jour");
      return;
    }

    setSuccess(true);
    if (onSuccess) onSuccess();
  };

  const handleClose = () => {
    setSuccess(false);
    setError(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
          />

          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative w-full max-w-md bg-[#0f172a] border border-brand-white/10 rounded-xl p-6 sm:p-8 shadow-2xl z-10"
          >
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-brand-white/50 hover:text-brand-white p-2 rounded-full"
            >
              <X size={18} />
            </button>

            {!success ? (
              <div>
                <h3 className="text-xl font-heading font-bold uppercase tracking-wider text-brand-white mb-2">
                  Modifier mon profil
                </h3>
                <p className="text-xs text-brand-white/50 mb-6">
                  Mettez à jour vos coordonnées personnelles.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-brand-white/60 uppercase tracking-wider mb-2">
                      Prénom
                    </label>
                    <div className="relative">
                      <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-white/30" />
                      <input
                        type="text"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full bg-brand-white/5 border border-brand-white/10 rounded-sm pl-10 pr-4 py-2.5 text-brand-white text-sm focus:outline-none focus:border-brand-blue"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-brand-white/60 uppercase tracking-wider mb-2">
                      Nom
                    </label>
                    <div className="relative">
                      <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-white/30" />
                      <input
                        type="text"
                        required
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full bg-brand-white/5 border border-brand-white/10 rounded-sm pl-10 pr-4 py-2.5 text-brand-white text-sm focus:outline-none focus:border-brand-blue"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-brand-white/60 uppercase tracking-wider mb-2">
                      Téléphone
                    </label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-white/30" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="06 12 34 56 78"
                        className="w-full bg-brand-white/5 border border-brand-white/10 rounded-sm pl-10 pr-4 py-2.5 text-brand-white text-sm focus:outline-none focus:border-brand-blue"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded p-2">
                      <AlertCircle size={14} />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="flex-1 py-2.5 px-4 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white/70 text-xs font-bold uppercase tracking-wider rounded-sm"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-2.5 px-4 bg-brand-blue hover:bg-brand-white text-brand-black font-heading font-bold text-xs uppercase tracking-wider rounded-sm flex items-center justify-center gap-2"
                    >
                      {loading ? <Loader2 size={14} className="animate-spin" /> : "Enregistrer"}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="text-center py-4">
                <CheckCircle2 size={36} className="text-[#22c55e] mx-auto mb-3" />
                <h4 className="text-lg font-heading font-bold uppercase text-brand-white mb-1">
                  Profil mis à jour
                </h4>
                <p className="text-xs text-brand-white/60 mb-5">
                  Vos informations ont été actualisées avec succès.
                </p>
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full py-2.5 bg-brand-blue text-brand-black font-bold uppercase text-xs rounded-sm hover:bg-brand-white"
                >
                  Fermer
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChangePasswordModal({
  isOpen,
  onClose,
}: ChangePasswordModalProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password: password,
    });

    setLoading(false);

    if (updateError) {
      setError(updateError.message || "Erreur lors de la mise à jour");
      return;
    }

    setSuccess(true);
  };

  const handleClose = () => {
    setPassword("");
    setConfirmPassword("");
    setSuccess(false);
    setError(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
          />

          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative w-full max-w-md bg-[#0f172a] border border-brand-white/10 rounded-xl p-6 sm:p-8 shadow-2xl z-10"
          >
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-brand-white/50 hover:text-brand-white p-2 rounded-full"
            >
              <X size={18} />
            </button>

            {!success ? (
              <div>
                <h3 className="text-xl font-heading font-bold uppercase tracking-wider text-brand-white mb-2">
                  Modifier mon mot de passe
                </h3>
                <p className="text-xs text-brand-white/50 mb-6">
                  Choisissez un nouveau mot de passe sécurisé.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-brand-white/60 uppercase tracking-wider mb-2">
                      Nouveau mot de passe
                    </label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-white/30" />
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-brand-white/5 border border-brand-white/10 rounded-sm pl-10 pr-4 py-2.5 text-brand-white text-sm focus:outline-none focus:border-brand-blue"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-brand-white/60 uppercase tracking-wider mb-2">
                      Confirmer le mot de passe
                    </label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-white/30" />
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-brand-white/5 border border-brand-white/10 rounded-sm pl-10 pr-4 py-2.5 text-brand-white text-sm focus:outline-none focus:border-brand-blue"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded p-2">
                      <AlertCircle size={14} />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="flex-1 py-2.5 px-4 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white/70 text-xs font-bold uppercase tracking-wider rounded-sm"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-2.5 px-4 bg-brand-blue hover:bg-brand-white text-brand-black font-heading font-bold text-xs uppercase tracking-wider rounded-sm flex items-center justify-center gap-2"
                    >
                      {loading ? <Loader2 size={14} className="animate-spin" /> : "Mettre à jour"}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="text-center py-4">
                <CheckCircle2 size={36} className="text-[#22c55e] mx-auto mb-3" />
                <h4 className="text-lg font-heading font-bold uppercase text-brand-white mb-1">
                  Mot de passe modifié
                </h4>
                <p className="text-xs text-brand-white/60 mb-5">
                  Votre mot de passe a été mis à jour avec succès.
                </p>
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full py-2.5 bg-brand-blue text-brand-black font-bold uppercase text-xs rounded-sm hover:bg-brand-white"
                >
                  Fermer
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
