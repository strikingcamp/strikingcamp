"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import { Loader2, Lock, AlertCircle, CheckCircle } from "lucide-react";

/**
 * Page de saisie du nouveau mot de passe — /reset-password
 *
 * Accessible uniquement depuis le lien envoyé par Supabase par email.
 * Supabase injecte le token de session dans l'URL (#access_token=...).
 * Le client Supabase le détecte automatiquement et établit une session temporaire.
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    // Supabase traite le fragment #access_token présent dans l'URL
    // et émet un événement PASSWORD_RECOVERY lorsque la session est établie.
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "PASSWORD_RECOVERY") {
        setSessionReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    setLoading(true);

    const supabase = createClient();

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError("Impossible de mettre à jour le mot de passe. Veuillez réessayer.");
      setLoading(false);
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      router.push("/membre");
    }, 2500);
  }

  if (success) {
    return (
      <section className="min-h-screen flex items-center justify-center px-4 py-24">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md text-center"
        >
          <div className="bg-brand-white/5 border border-brand-white/10 rounded-sm p-10">
            <CheckCircle size={48} className="text-brand-blue mx-auto mb-6" />
            <h2 className="text-2xl font-heading font-bold uppercase tracking-wider text-brand-white mb-3">
              Mot de passe mis à jour
            </h2>
            <p className="text-brand-white/50 text-sm">
              Redirection vers votre espace membre…
            </p>
          </div>
        </motion.div>
      </section>
    );
  }

  return (
    <section className="min-h-screen flex items-center justify-center px-4 py-24">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-10">
          <Link
            href="/"
            className="inline-block text-xl font-heading font-bold uppercase tracking-widest text-brand-blue mb-8"
          >
            STRIKING <span className="text-brand-white">CAMP</span>
          </Link>
          <h1 className="text-3xl font-heading font-bold uppercase tracking-wider text-brand-white">
            Nouveau mot de passe
          </h1>
          <p className="mt-2 text-brand-white/50 text-sm">
            Choisissez un nouveau mot de passe sécurisé
          </p>
        </div>

        {/* Formulaire */}
        <div className="bg-brand-white/5 border border-brand-white/10 rounded-sm p-8">
          {!sessionReady ? (
            <div className="flex items-center justify-center gap-2 text-brand-white/40 text-sm py-4">
              <Loader2 size={16} className="animate-spin" />
              Vérification du lien…
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Nouveau mot de passe */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-medium text-brand-white/60 uppercase tracking-wider mb-2"
                >
                  Nouveau mot de passe
                </label>
                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-white/30"
                  />
                  <input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-brand-white/5 border border-brand-white/10 rounded-sm pl-10 pr-4 py-3 text-brand-white placeholder-brand-white/20 text-sm focus:outline-none focus:border-brand-blue transition-colors"
                    placeholder="Minimum 8 caractères"
                  />
                </div>
              </div>

              {/* Confirmation */}
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-xs font-medium text-brand-white/60 uppercase tracking-wider mb-2"
                >
                  Confirmer le mot de passe
                </label>
                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-white/30"
                  />
                  <input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-brand-white/5 border border-brand-white/10 rounded-sm pl-10 pr-4 py-3 text-brand-white placeholder-brand-white/20 text-sm focus:outline-none focus:border-brand-blue transition-colors"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {/* Message d'erreur */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-sm px-3 py-2"
                >
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}

              {/* Bouton */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-blue text-brand-black font-semibold text-sm uppercase tracking-wide py-3 rounded-sm hover:bg-brand-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Mise à jour…
                  </>
                ) : (
                  "Mettre à jour le mot de passe"
                )}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </section>
  );
}
