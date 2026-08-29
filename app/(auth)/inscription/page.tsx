"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getAuthRedirectUrl } from "@/lib/auth-helpers";
import { motion } from "framer-motion";
import { Loader2, Mail, Lock, User, Phone, CheckSquare, Square, AlertCircle, CheckCircle, Sparkles } from "lucide-react";

function InscriptionForm() {
  const searchParams = useSearchParams();
  const planParam = searchParams.get("plan");
  const categoryParam = searchParams.get("category");
  const commitmentParam = searchParams.get("commitment");
  const priceParam = searchParams.get("price");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Engagement label
  const commitmentLabel = commitmentParam === "annual" ? "Engagement 12 mois" : commitmentParam === "monthly" ? "Sans engagement (1 mois)" : "";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!firstName.trim() || !lastName.trim()) {
      setError("Veuillez renseigner votre prénom et votre nom.");
      return;
    }

    if (!phone.trim()) {
      setError("Veuillez renseigner votre numéro de téléphone.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    if (!acceptTerms) {
      setError("Veuillez accepter les Conditions Générales d'Utilisation et la politique de confidentialité.");
      return;
    }

    setLoading(true);

    const supabase = createClient();

    const { error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim(),
          role: "CLIENT", // Rôle par défaut (prêt pour CLIENT | COACH | ADMIN)
          selected_plan: planParam || undefined,
          selected_category: categoryParam || undefined,
          selected_commitment: commitmentParam || undefined,
        },
        // URL de redirection canonique après confirmation email
        emailRedirectTo: getAuthRedirectUrl("/auth/callback"),
      },
    });

    if (authError) {
      if (authError.message.includes("already registered")) {
        setError("Un compte existe déjà avec cette adresse email.");
      } else {
        setError(authError.message || "Une erreur est survenue. Veuillez réessayer.");
      }
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
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
            <CheckCircle
              size={48}
              className="text-brand-blue mx-auto mb-6"
            />
            <h2 className="text-2xl font-heading font-bold uppercase tracking-wider text-brand-white mb-3">
              Vérifiez votre email
            </h2>
            <p className="text-brand-white/50 text-sm leading-relaxed">
              Un email de confirmation a été envoyé à{" "}
              <span className="text-brand-white font-medium">{email}</span>.
              <br />
              Cliquez sur le lien reçu pour activer votre compte membre.
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
        className="w-full max-w-lg"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-block text-xl font-heading font-bold uppercase tracking-widest text-brand-blue mb-6"
          >
            STRIKING <span className="text-brand-white">CAMP</span>
          </Link>
          <h1 className="text-3xl font-heading font-bold uppercase tracking-wider text-brand-white">
            Créer un compte
          </h1>
          <p className="mt-2 text-brand-white/50 text-sm">
            Rejoignez l&apos;espace membres Striking Camp
          </p>
        </div>

        {/* Bannière Formule Sélectionnée */}
        {categoryParam && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-[#00d8ff]/10 border border-[#00d8ff]/30 rounded-lg p-4 flex items-center justify-between gap-3 shadow-lg shadow-[#00d8ff]/5"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#00d8ff]/20 text-[#00d8ff] flex items-center justify-center shrink-0">
                <Sparkles size={16} />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-brand-white/50 tracking-wider block">
                  Formule sélectionnée
                </span>
                <p className="text-sm font-heading font-bold uppercase text-white">
                  {categoryParam} {priceParam ? `• ${priceParam}€ / mois` : ""}
                </p>
                {commitmentLabel && (
                  <span className="text-[11px] text-[#00d8ff] font-medium block">
                    {commitmentLabel}
                  </span>
                )}
              </div>
            </div>
            <Link
              href="/tarifs"
              className="text-[11px] font-bold text-gray-300 hover:text-white underline underline-offset-2 shrink-0"
            >
              Modifier
            </Link>
          </motion.div>
        )}

        {/* Formulaire */}
        <div className="bg-brand-white/5 border border-brand-white/10 rounded-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Prénom et Nom en grille */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="firstName"
                  className="block text-xs font-medium text-brand-white/60 uppercase tracking-wider mb-1.5"
                >
                  Prénom
                </label>
                <div className="relative">
                  <User
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-white/30"
                  />
                  <input
                    id="firstName"
                    type="text"
                    autoComplete="given-name"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full bg-brand-white/5 border border-brand-white/10 rounded-sm pl-10 pr-4 py-2.5 text-brand-white placeholder-brand-white/20 text-sm focus:outline-none focus:border-brand-blue transition-colors"
                    placeholder="Jean"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="lastName"
                  className="block text-xs font-medium text-brand-white/60 uppercase tracking-wider mb-1.5"
                >
                  Nom
                </label>
                <div className="relative">
                  <User
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-white/30"
                  />
                  <input
                    id="lastName"
                    type="text"
                    autoComplete="family-name"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full bg-brand-white/5 border border-brand-white/10 rounded-sm pl-10 pr-4 py-2.5 text-brand-white placeholder-brand-white/20 text-sm focus:outline-none focus:border-brand-blue transition-colors"
                    placeholder="Dupont"
                  />
                </div>
              </div>
            </div>

            {/* Téléphone */}
            <div>
              <label
                htmlFor="phone"
                className="block text-xs font-medium text-brand-white/60 uppercase tracking-wider mb-1.5"
              >
                Numéro de téléphone
              </label>
              <div className="relative">
                <Phone
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-white/30"
                />
                <input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-brand-white/5 border border-brand-white/10 rounded-sm pl-10 pr-4 py-2.5 text-brand-white placeholder-brand-white/20 text-sm focus:outline-none focus:border-brand-blue transition-colors"
                  placeholder="06 12 34 56 78"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium text-brand-white/60 uppercase tracking-wider mb-1.5"
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
                  className="w-full bg-brand-white/5 border border-brand-white/10 rounded-sm pl-10 pr-4 py-2.5 text-brand-white placeholder-brand-white/20 text-sm focus:outline-none focus:border-brand-blue transition-colors"
                  placeholder="votre@email.com"
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium text-brand-white/60 uppercase tracking-wider mb-1.5"
              >
                Mot de passe
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
                  className="w-full bg-brand-white/5 border border-brand-white/10 rounded-sm pl-10 pr-4 py-2.5 text-brand-white placeholder-brand-white/20 text-sm focus:outline-none focus:border-brand-blue transition-colors"
                  placeholder="Minimum 8 caractères"
                />
              </div>
            </div>

            {/* Confirmation */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-xs font-medium text-brand-white/60 uppercase tracking-wider mb-1.5"
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
                  className="w-full bg-brand-white/5 border border-brand-white/10 rounded-sm pl-10 pr-4 py-2.5 text-brand-white placeholder-brand-white/20 text-sm focus:outline-none focus:border-brand-blue transition-colors"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Acceptation des CGU & Confidentialité */}
            <div className="pt-2">
              <label className="flex items-start gap-3 cursor-pointer text-xs text-brand-white/70 leading-relaxed select-none">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="sr-only"
                  required
                />
                <span className="mt-0.5 shrink-0 text-brand-blue">
                  {acceptTerms ? (
                    <CheckSquare size={16} className="text-brand-blue" />
                  ) : (
                    <Square size={16} className="text-brand-white/30" />
                  )}
                </span>
                <span>
                  J&apos;accepte les{" "}
                  <Link
                    href="/mentions-legales"
                    target="_blank"
                    className="text-brand-blue hover:text-brand-white underline underline-offset-2"
                  >
                    Conditions Générales
                  </Link>{" "}
                  et la{" "}
                  <Link
                    href="/confidentialite"
                    target="_blank"
                    className="text-brand-blue hover:text-brand-white underline underline-offset-2"
                  >
                    Politique de confidentialité
                  </Link>
                  .
                </span>
              </label>
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
              className="w-full bg-brand-blue text-brand-black font-semibold text-sm uppercase tracking-wide py-3 rounded-sm hover:bg-brand-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Création du compte…
                </>
              ) : (
                "Créer mon compte"
              )}
            </button>
          </form>
        </div>

        {/* Lien connexion */}
        <p className="text-center mt-6 text-brand-white/40 text-sm">
          Déjà membre ?{" "}
          <Link
            href={`/connexion${categoryParam ? `?plan=${encodeURIComponent(planParam || "")}&category=${encodeURIComponent(categoryParam || "")}` : ""}`}
            className="text-brand-blue hover:text-brand-white transition-colors font-medium"
          >
            Se connecter
          </Link>
        </p>
      </motion.div>
    </section>
  );
}

export default function InscriptionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-brand-white/40 text-sm">Chargement…</div>}>
      <InscriptionForm />
    </Suspense>
  );
}
