"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import { Loader2, Lock, AlertCircle, CheckCircle, ArrowRight, ShieldCheck } from "lucide-react";

/**
 * Page de saisie du nouveau mot de passe — /reset-password
 *
 * Gère de manière universelle :
 * 1. Le flux PKCE (paramètre ?code=...)
 * 2. Le flux Implicit Tokens (hash fragment #access_token=...&type=recovery)
 * 3. Les sessions déjà établies
 * 4. La détection et l'affichage immédiat des liens expirés ou invalides
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const supabase = createClient();

    async function initRecovery() {
      try {
        // 1. Vérification des erreurs dans l'URL (query params et hash fragment)
        const searchParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));

        const urlError = searchParams.get("error") || hashParams.get("error");
        const urlErrorDesc = searchParams.get("error_description") || hashParams.get("error_description");
        const urlErrorCode = searchParams.get("error_code") || hashParams.get("error_code");

        if (urlError || urlErrorCode === "otp_expired") {
          if (isMounted) {
            setErrorMessage(
              urlErrorCode === "otp_expired" || urlErrorDesc?.includes("expired")
                ? "Ce lien de réinitialisation a expiré ou a déjà été utilisé."
                : urlErrorDesc || "Le lien de réinitialisation est invalide."
            );
            setIsVerifying(false);
          }
          return;
        }

        // 2. Échange automatique du code PKCE (?code=...) si présent
        const code = searchParams.get("code");
        if (code) {
          console.log("[ResetPassword] Échange du code d'authentification en cours...");
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            console.error("[ResetPassword] Erreur exchangeCodeForSession :", exchangeError);
            if (isMounted) {
              setErrorMessage("Le lien de réinitialisation a expiré ou a déjà été utilisé. Veuillez faire une nouvelle demande.");
              setIsVerifying(false);
            }
            return;
          }

          if (data?.session && isMounted) {
            console.log("[ResetPassword] Session de récupération validée via PKCE.");
            setSessionReady(true);
            setIsVerifying(false);
            // Nettoie l'URL sans recharger la page
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
          }
        }

        // 3. Vérification immédiate si la session est déjà établie
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session && isMounted) {
          setSessionReady(true);
          setIsVerifying(false);
          return;
        }

        // 4. Écoute des événements d'authentification (tokens hash ou background exchange)
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
          if (
            event === "PASSWORD_RECOVERY" ||
            event === "SIGNED_IN" ||
            event === "INITIAL_SESSION" ||
            event === "USER_UPDATED" ||
            session !== null
          ) {
            if (isMounted) {
              setSessionReady(true);
              setIsVerifying(false);
            }
          }
        });

        // 5. Délai de garde (5 secondes) : si aucune session n'est détectée
        const timer = setTimeout(() => {
          if (isMounted) {
            setSessionReady((ready) => {
              if (!ready) {
                setErrorMessage("Aucune session de récupération valide détectée. Ce lien est peut-être expiré.");
                setIsVerifying(false);
              }
              return ready;
            });
          }
        }, 5000);

        return () => {
          subscription.unsubscribe();
          clearTimeout(timer);
        };
      } catch (err) {
        console.error("[ResetPassword] Erreur d'initialisation :", err);
        if (isMounted) {
          setErrorMessage("Une erreur inattendue est survenue lors de la vérification du lien.");
          setIsVerifying(false);
        }
      }
    }

    initRecovery();

    return () => {
      isMounted = false;
    };
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

    try {
      const supabase = createClient();

      const { error: updateError } = await supabase.auth.updateUser({
        password: password.trim(),
      });

      if (updateError) {
        console.error("[ResetPassword] Erreur updateUser :", updateError);
        setError(updateError.message || "Impossible de mettre à jour le mot de passe. Veuillez réessayer.");
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);

      // Déconnexion propre de la session de récupération pour forcer la reconnexion sécurisée
      await supabase.auth.signOut();

      // Redirection vers /connexion avec confirmation
      setTimeout(() => {
        router.push("/connexion?reset=success");
      }, 2000);
    } catch (err: unknown) {
      console.error("[ResetPassword] Exception handleSubmit :", err);
      setError("Une erreur inattendue est survenue.");
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
            <CheckCircle size={48} className="text-emerald-400 mx-auto mb-6" />
            <h2 className="text-2xl font-heading font-bold uppercase tracking-wider text-brand-white mb-3">
              Mot de passe mis à jour !
            </h2>
            <p className="text-brand-white/60 text-sm mb-6">
              Votre nouveau mot de passe a été enregistré. Redirection vers la page de connexion…
            </p>
            <div className="inline-flex items-center gap-2 text-brand-blue text-xs font-semibold uppercase tracking-wider">
              <Loader2 size={14} className="animate-spin" />
              Connexion en cours…
            </div>
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
            Définissez votre nouveau mot de passe sécurisé
          </p>
        </div>

        {/* Contenu principal */}
        <div className="bg-brand-white/5 border border-brand-white/10 rounded-sm p-8">
          {isVerifying ? (
            <div className="flex flex-col items-center justify-center gap-3 text-brand-white/60 text-sm py-8">
              <Loader2 size={24} className="animate-spin text-brand-blue" />
              <span>Vérification et validation du lien de sécurité…</span>
            </div>
          ) : errorMessage || !sessionReady ? (
            <div className="text-center space-y-4 py-3">
              <AlertCircle size={40} className="text-amber-400 mx-auto" />
              <h3 className="text-lg font-heading font-bold uppercase text-brand-white">
                Lien expiré ou invalide
              </h3>
              <p className="text-xs text-brand-white/60 leading-relaxed max-w-xs mx-auto">
                {errorMessage || "Ce lien de réinitialisation a expiré ou a déjà été utilisé. Veuillez faire une nouvelle demande."}
              </p>
              <div className="pt-2">
                <Link
                  href="/mot-de-passe-oublie"
                  className="inline-flex items-center gap-2 px-5 py-3 bg-brand-blue text-brand-black font-semibold text-xs uppercase tracking-wider rounded-sm hover:bg-brand-white transition-colors"
                >
                  Demander un nouveau lien
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-sm text-emerald-400 text-xs mb-2">
                <ShieldCheck size={16} className="shrink-0" />
                <span>Session de récupération validée avec succès.</span>
              </div>

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
                className="w-full bg-brand-blue text-brand-black font-semibold text-sm uppercase tracking-wide py-3.5 rounded-sm hover:bg-brand-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Enregistrement du mot de passe…
                  </>
                ) : (
                  "Enregistrer le nouveau mot de passe"
                )}
              </button>
            </form>
          )}
        </div>

        {/* Retour connexion */}
        <p className="text-center mt-6 text-brand-white/40 text-sm">
          Vous vous souvenez de votre mot de passe ?{" "}
          <Link
            href="/connexion"
            className="text-brand-blue hover:text-brand-white transition-colors font-medium"
          >
            Se connecter
          </Link>
        </p>
      </motion.div>
    </section>
  );
}
