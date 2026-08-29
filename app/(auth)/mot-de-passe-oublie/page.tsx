"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getAuthRedirectUrl } from "@/lib/auth-helpers";
import { motion } from "framer-motion";
import { Loader2, Mail, AlertCircle, CheckCircle } from "lucide-react";

/**
 * Page de réinitialisation du mot de passe — /mot-de-passe-oublie
 *
 * Mode diagnostic activé : affiche le détail complet de authError (message, status, code)
 * et journalise dans la console.
 */
export default function MotDePasseOubliePage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorDetails, setErrorDetails] = useState<{
    message: string;
    status?: number;
    code?: string;
  } | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErrorDetails(null);

    const cleanEmail = email.trim();

    try {
      const supabase = createClient();

      const { error: authError } = await supabase.auth.resetPasswordForEmail(
        cleanEmail,
        {
          redirectTo: getAuthRedirectUrl("/auth/callback?next=/reset-password"),
        }
      );

      if (authError) {
        console.error("Supabase resetPasswordForEmail authError:", authError);
        setErrorDetails({
          message: authError.message || "Erreur inconnue",
          status: authError.status,
          code: (authError as { code?: string }).code,
        });
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);
    } catch (err: unknown) {
      console.error("Exception in resetPasswordForEmail:", err);
      const message = err instanceof Error ? err.message : "Exception inattendue";
      setErrorDetails({ message });
      setLoading(false);
    }
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
              Demande envoyée à Supabase avec succès.
            </h2>
            <p className="text-brand-white/50 text-sm leading-relaxed">
              Un email de réinitialisation a été transmis pour{" "}
              <span className="text-brand-white font-medium">{email.trim()}</span>.
              <br />
              Vérifiez votre boîte de réception et vos courriers indésirables.
            </p>
            <Link
              href="/connexion"
              className="inline-block mt-8 px-6 py-3 bg-brand-blue text-brand-black font-semibold text-sm uppercase tracking-wide rounded-sm hover:bg-brand-white transition-colors"
            >
              Retour à la connexion
            </Link>
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
            Mot de passe oublié
          </h1>
          <p className="mt-2 text-brand-white/50 text-sm">
            Entrez votre email pour recevoir un lien de réinitialisation
          </p>
        </div>

        {/* Formulaire */}
        <div className="bg-brand-white/5 border border-brand-white/10 rounded-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium text-brand-white/60 uppercase tracking-wider mb-2"
              >
                Adresse email
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-white/30"
                />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-brand-white/5 border border-brand-white/10 rounded-sm pl-10 pr-4 py-3 text-brand-white placeholder-brand-white/20 text-sm focus:outline-none focus:border-brand-blue transition-colors"
                  placeholder="votre@email.com"
                />
              </div>
            </div>

            {/* Message d'erreur diagnostic détaillé */}
            {errorDetails && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-sm p-3 space-y-1"
              >
                <div className="flex items-center gap-2 font-semibold text-sm">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>Erreur retournée :</span>
                </div>
                <div className="pl-6 space-y-0.5">
                  <p>
                    <span className="text-brand-white/60">Message :</span>{" "}
                    <span className="font-mono text-red-300">{errorDetails.message}</span>
                  </p>
                  {errorDetails.status !== undefined && (
                    <p>
                      <span className="text-brand-white/60">Status HTTP :</span>{" "}
                      <span className="font-mono text-red-300">{errorDetails.status}</span>
                    </p>
                  )}
                  {errorDetails.code && (
                    <p>
                      <span className="text-brand-white/60">Code d&apos;erreur :</span>{" "}
                      <span className="font-mono text-red-300">{errorDetails.code}</span>
                    </p>
                  )}
                </div>
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
                  Envoi en cours…
                </>
              ) : (
                "Envoyer le lien"
              )}
            </button>
          </form>
        </div>

        {/* Lien retour */}
        <p className="text-center mt-6 text-brand-white/40 text-sm">
          <Link
            href="/connexion"
            className="text-brand-blue hover:text-brand-white transition-colors font-medium"
          >
            ← Retour à la connexion
          </Link>
        </p>
      </motion.div>
    </section>
  );
}
