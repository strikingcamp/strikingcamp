"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import { Loader2, Mail, Lock, AlertCircle } from "lucide-react";

function ConnexionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/membre";
  const callbackError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    callbackError ? "Le lien d'authentification a expiré ou est invalide." : null
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError) {
      setError(
        authError.message === "Invalid login credentials"
          ? "Email ou mot de passe incorrect."
          : authError.message || "Une erreur est survenue. Veuillez réessayer."
      );
      setLoading(false);
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
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
          Connexion
        </h1>
        <p className="mt-2 text-brand-white/50 text-sm">
          Accédez à votre espace membre
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

          {/* Mot de passe */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="password"
                className="block text-xs font-medium text-brand-white/60 uppercase tracking-wider"
              >
                Mot de passe
              </label>
              <Link
                href="/mot-de-passe-oublie"
                className="text-xs text-brand-blue hover:text-brand-white transition-colors"
              >
                Mot de passe oublié ?
              </Link>
            </div>
            <div className="relative">
              <Lock
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-white/30"
              />
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
                Connexion…
              </>
            ) : (
              "Se connecter"
            )}
          </button>
        </form>
      </div>

      {/* Lien inscription */}
      <p className="text-center mt-6 text-brand-white/40 text-sm">
        Pas encore membre ?{" "}
        <Link
          href="/inscription"
          className="text-brand-blue hover:text-brand-white transition-colors font-medium"
        >
          Créer un compte
        </Link>
      </p>
    </motion.div>
  );
}

export default function ConnexionPage() {
  return (
    <section className="min-h-screen flex items-center justify-center px-4 py-24">
      <Suspense fallback={<div className="text-brand-white/40 text-sm">Chargement…</div>}>
        <ConnexionForm />
      </Suspense>
    </section>
  );
}
