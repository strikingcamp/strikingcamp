"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Edit2,
  CheckCircle,
  X,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import {
  getAdminPlansAction,
  updateAdminPlanAction,
} from "@/app/(admin)/admin/defis/actions";
import { PlanConfig, PlanEntitlements } from "@/lib/supabase/defis-platform";

export default function AdminPlansTab() {
  const [plans, setPlans] = useState<PlanConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<PlanConfig | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priceEuros, setPriceEuros] = useState(19.9);
  const [commitment, setCommitment] = useState<string>("monthly");
  const [tier, setTier] = useState<"free" | "premium_digital" | "premium_club">("premium_digital");
  const [isDigitalPlan, setIsDigitalPlan] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [badgeText, setBadgeText] = useState("");
  const [trialDays, setTrialDays] = useState(0);
  const [displayOrder, setDisplayOrder] = useState(10);
  const [featuresText, setFeaturesText] = useState("");
  const [stripePriceId, setStripePriceId] = useState("");
  const [stripeProductId, setStripeProductId] = useState("");

  // Entitlements form
  const [entitlements, setEntitlements] = useState<PlanEntitlements>({
    nutrition: true,
    food_log: true,
    recipes_all: true,
    digital_programs: true,
    kb_shred_digital: true,
    advanced_stats: true,
  });

  // Notification
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showNotification = (text: string, type: "success" | "error" = "success") => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchPlans = async () => {
    setIsLoading(true);
    const res = await getAdminPlansAction();
    if (res.success && res.data) {
      setPlans(res.data);
    } else {
      showNotification(res.error || "Erreur de chargement des formules.", "error");
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const openEditModal = (p: PlanConfig) => {
    setEditingPlan(p);
    setName(p.name);
    setDescription(p.description || "");
    setPriceEuros(p.price_cents ? p.price_cents / 100 : 0);
    setCommitment(p.commitment || "monthly");
    setTier(p.tier || "premium_digital");
    setIsDigitalPlan(p.is_digital_plan ?? true);
    setIsActive(p.is_active);
    setBadgeText(p.badge_text || "");
    setTrialDays(p.trial_days || 0);
    setDisplayOrder(p.display_order || 10);
    setFeaturesText(Array.isArray(p.features) ? p.features.join("\n") : "");
    setStripePriceId(p.stripe_price_id || "");
    setStripeProductId(p.stripe_product_id || "");
    setEntitlements(
      p.entitlements || {
        nutrition: true,
        food_log: true,
        recipes_all: true,
        digital_programs: true,
        kb_shred_digital: true,
        advanced_stats: true,
      }
    );
    setIsModalOpen(true);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;

    setIsSubmitting(true);
    const featuresList = featuresText
      .split("\n")
      .map((f) => f.trim())
      .filter((f) => f.length > 0);

    const priceCents = Math.round(Number(priceEuros) * 100);

    const res = await updateAdminPlanAction(editingPlan.id, {
      name: name.trim(),
      description: description.trim() || null,
      price_cents: priceCents,
      commitment: commitment,
      tier: tier,
      is_digital_plan: isDigitalPlan,
      is_active: isActive,
      badge_text: badgeText.trim() || null,
      trial_days: Number(trialDays),
      display_order: Number(displayOrder),
      features: featuresList,
      entitlements: entitlements,
      stripe_price_id: stripePriceId.trim() || null,
      stripe_product_id: stripeProductId.trim() || null,
    });

    if (res.success) {
      showNotification("Offre commerciale mise à jour avec succès !");
      setIsModalOpen(false);
      fetchPlans();
    } else {
      showNotification(res.error || "Erreur de mise à jour.", "error");
    }
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-xl border flex items-center gap-2 shadow-2xl text-xs font-bold ${
              notification.type === "success"
                ? "bg-black border-[#5E4075] text-[#F8F9ED]"
                : "bg-black border-rose-500/50 text-rose-300"
            }`}
          >
            {notification.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            <span>{notification.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-heading font-black uppercase text-white tracking-wider">
            Offres Commerciales & Droits
          </h2>
          <p className="text-xs sm:text-sm text-white/60">
            Configuration des tarifs, engagements et droits d'accès digitaux associés.
          </p>
        </div>

        <button
          onClick={fetchPlans}
          disabled={isLoading}
          className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
          <span>Actualiser</span>
        </button>
      </div>

      {/* Grid des Cartes d'Offres */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading ? (
          <div className="col-span-full p-12 text-center text-white/40 bg-black rounded-2xl border border-white/10">
            <RefreshCw size={24} className="animate-spin mx-auto mb-3 text-[#F8F9ED]" />
            <span>Chargement des offres...</span>
          </div>
        ) : (
          plans.map((p) => {
            const price = (p.price_cents / 100).toLocaleString("fr-FR", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
            });

            return (
              <div
                key={p.id}
                className="p-6 rounded-2xl bg-black border border-white/10 flex flex-col justify-between space-y-5 hover:border-[#5E4075] transition-all relative overflow-hidden"
              >
                {/* Badge */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {p.badge_text && (
                      <span className="px-2 py-0.5 rounded bg-white/10 border border-white/20 text-[#F8F9ED] text-[10px] font-bold uppercase tracking-wider">
                        {p.badge_text}
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white/5 text-white/70">
                      {p.tier === "premium_digital" && "Digital"}
                      {p.tier === "premium_club" && "Club Physique"}
                      {p.tier === "free" && "Gratuit"}
                    </span>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      p.is_active ? "bg-[#5E4075]/20 text-[#F8F9ED]" : "bg-white/5 text-white/40"
                    }`}
                  >
                    {p.is_active ? "Actif" : "Inactif"}
                  </span>
                </div>

                {/* Nom & Prix */}
                <div className="space-y-1">
                  <h3 className="text-base font-heading font-black uppercase text-white tracking-wide">
                    {p.name}
                  </h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-heading font-black text-white">{price} €</span>
                    <span className="text-xs text-white/50">
                      {p.commitment === "monthly" ? "/mois" : p.commitment === "annual" ? "/an" : ""}
                    </span>
                  </div>
                  {p.description && <p className="text-xs text-white/60 line-clamp-2">{p.description}</p>}
                </div>

                {/* Entitlements preview */}
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-2 text-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#F8F9ED] flex items-center gap-1">
                    <span>Droits Numériques (Entitlements)</span>
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px] text-white/70">
                    <div className="flex items-center gap-1.5">
                      <span className={p.entitlements?.nutrition ? "text-[#F8F9ED] font-bold" : "text-white/20"}>
                        {p.entitlements?.nutrition ? "✓" : "✗"}
                      </span>
                      <span>Nutrition</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={p.entitlements?.food_log ? "text-[#F8F9ED] font-bold" : "text-white/20"}>
                        {p.entitlements?.food_log ? "✓" : "✗"}
                      </span>
                      <span>Journal Repas</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={p.entitlements?.recipes_all ? "text-[#F8F9ED] font-bold" : "text-white/20"}>
                        {p.entitlements?.recipes_all ? "✓" : "✗"}
                      </span>
                      <span>Recettes All</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={p.entitlements?.digital_programs ? "text-[#F8F9ED] font-bold" : "text-white/20"}>
                        {p.entitlements?.digital_programs ? "✓" : "✗"}
                      </span>
                      <span>Programmes</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={p.entitlements?.kb_shred_digital ? "text-[#F8F9ED] font-bold" : "text-white/20"}>
                        {p.entitlements?.kb_shred_digital ? "✓" : "✗"}
                      </span>
                      <span>KB SHRED</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={p.entitlements?.advanced_stats ? "text-[#F8F9ED] font-bold" : "text-white/20"}>
                        {p.entitlements?.advanced_stats ? "✓" : "✗"}
                      </span>
                      <span>Statistiques</span>
                    </div>
                  </div>
                </div>

                {/* Action button */}
                <button
                  onClick={() => openEditModal(p)}
                  className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Edit2 size={13} className="text-[#5E4075]" />
                  <span>Configurer l'Offre & Prix</span>
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Édition Offre */}
      <AnimatePresence>
        {isModalOpen && editingPlan && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-black border border-white/15 rounded-2xl w-full max-w-2xl p-6 space-y-5 shadow-2xl text-xs text-white my-auto max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div>
                  <h3 className="text-base font-heading font-black uppercase text-white">
                    Configurer l'Offre : {editingPlan.name}
                  </h3>
                  <p className="text-[11px] text-white/50">Code interne : {editingPlan.code || "N/A"}</p>
                </div>

                <button onClick={() => setIsModalOpen(false)} className="text-white/60 hover:text-white cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSavePlan} className="space-y-4">
                {/* 1. Nom & Description */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="font-bold text-white/70 uppercase">Nom commercial de la formule *</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white font-bold focus:outline-none focus:border-[#5E4075]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-white/70 uppercase">Description</label>
                    <textarea
                      rows={2}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-[#5E4075]"
                    />
                  </div>
                </div>

                {/* 2. Prix & Engagement */}
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
                  <div className="font-bold uppercase tracking-wider text-[#F8F9ED]">
                    Tarification & Engagement
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-white/70 uppercase font-semibold">Prix en Euros (€)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={priceEuros}
                        onChange={(e) => setPriceEuros(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg bg-black border border-white/10 text-[#F8F9ED] font-bold text-sm"
                      />
                      <p className="text-[10px] text-white/40">
                        Stocké en base : {Math.round(Number(priceEuros) * 100)} centimes
                      </p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-white/70 uppercase font-semibold">Engagement</label>
                      <select
                        value={commitment}
                        onChange={(e) => setCommitment(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-black border border-white/10 text-white"
                      >
                        <option value="monthly">Mensuel (Sans engagement)</option>
                        <option value="annual">Annuel (12 mois)</option>
                        <option value="none">Ponctuel / Libre</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-white/70 uppercase font-semibold">Période d'essai (jours)</label>
                      <input
                        type="number"
                        min="0"
                        value={trialDays}
                        onChange={(e) => setTrialDays(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg bg-black border border-white/10 text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Badge & Ordre */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-white/70 uppercase">Badge promotionnel</label>
                    <input
                      type="text"
                      value={badgeText}
                      onChange={(e) => setBadgeText(e.target.value)}
                      placeholder="Ex: Économisez 25% ou Populaire"
                      className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-[#5E4075]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-white/70 uppercase">Ordre d'affichage</label>
                    <input
                      type="number"
                      value={displayOrder}
                      onChange={(e) => setDisplayOrder(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white"
                    />
                  </div>
                </div>

                {/* 4. Entitlements (Droits) */}
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
                  <div className="font-bold uppercase tracking-wider text-[#F8F9ED]">
                    Droits d'accès Numériques (Entitlements)
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={entitlements.nutrition}
                        onChange={(e) => setEntitlements({ ...entitlements, nutrition: e.target.checked })}
                        className="w-4 h-4 rounded text-[#5E4075]"
                      />
                      <span className="font-semibold text-white">Moteur Nutrition</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={entitlements.food_log}
                        onChange={(e) => setEntitlements({ ...entitlements, food_log: e.target.checked })}
                        className="w-4 h-4 rounded text-[#5E4075]"
                      />
                      <span className="font-semibold text-white">Journal Repas</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={entitlements.recipes_all}
                        onChange={(e) => setEntitlements({ ...entitlements, recipes_all: e.target.checked })}
                        className="w-4 h-4 rounded text-[#5E4075]"
                      />
                      <span className="font-semibold text-white">Toutes Recettes</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={entitlements.digital_programs}
                        onChange={(e) => setEntitlements({ ...entitlements, digital_programs: e.target.checked })}
                        className="w-4 h-4 rounded text-[#5E4075]"
                      />
                      <span className="font-semibold text-white">Programmes Maison/Salle</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={entitlements.kb_shred_digital}
                        onChange={(e) => setEntitlements({ ...entitlements, kb_shred_digital: e.target.checked })}
                        className="w-4 h-4 rounded text-[#5E4075]"
                      />
                      <span className="font-semibold text-white">KB SHRED Digital</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={entitlements.advanced_stats}
                        onChange={(e) => setEntitlements({ ...entitlements, advanced_stats: e.target.checked })}
                        className="w-4 h-4 rounded text-[#5E4075]"
                      />
                      <span className="font-semibold text-white">Stats & Courbes</span>
                    </label>
                  </div>
                </div>

                {/* 5. Liste des fonctionnalités (1 par ligne) */}
                <div className="space-y-1">
                  <label className="font-bold text-white/70 uppercase">
                    Liste des Avantages affichés sur la page Tarifs (1 par ligne)
                  </label>
                  <textarea
                    rows={4}
                    value={featuresText}
                    onChange={(e) => setFeaturesText(e.target.value)}
                    placeholder="Moteur nutritionnel personnalisé&#10;Journal alimentaire & suivi des macros&#10;Accès à toutes les recettes sportives..."
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-[#5E4075]"
                  />
                </div>

                {/* 6. Préparation Stripe (IDs prêts sans appels réels) */}
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">
                    Préparation Stripe (Champs Prêts pour Intégration Future)
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="stripe_product_id (ex: prod_...)"
                      value={stripeProductId}
                      onChange={(e) => setStripeProductId(e.target.value)}
                      className="px-3 py-1.5 rounded bg-black/40 border border-white/10 text-white/70 font-mono text-[11px]"
                    />
                    <input
                      type="text"
                      placeholder="stripe_price_id (ex: price_...)"
                      value={stripePriceId}
                      onChange={(e) => setStripePriceId(e.target.value)}
                      className="px-3 py-1.5 rounded bg-black/40 border border-white/10 text-white/70 font-mono text-[11px]"
                    />
                  </div>
                </div>

                {/* Switch Actif */}
                <label className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/10 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-[#5E4075]"
                  />
                  <span className="font-bold text-white">Offre active & proposée aux membres</span>
                </label>

                {/* Buttons */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2 rounded-xl bg-[#5E4075] hover:bg-[#6f4d8b] text-white font-heading font-black uppercase tracking-wider cursor-pointer"
                  >
                    {isSubmitting ? "Sauvegarde..." : "Enregistrer l'Offre"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
