"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, ShieldCheck, Users, Layers, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type PlanCategory = "Cours Privés" | "Small Group" | "Collectifs";
type BillingCycle = "Annuel" | "Mensuel";

type PlanDetails = {
  price: string;
  priceValue: number;
  subtitle: string;
  planKey: string;
  commitmentKey: "annual" | "monthly";
  features: string[];
};

const defaultPricing: Record<
  PlanCategory,
  Record<BillingCycle, PlanDetails>
> = {
  "Cours Privés": {
    Annuel: {
      price: "299€",
      priceValue: 299,
      subtitle: "Engagement 12 mois",
      planKey: "private_8_annual",
      commitmentKey: "annual",
      features: [
        "8 séances privées par mois",
        "Suivi technique sur-mesure avec le coach",
        "Accès illimité aux séances Small Group",
        "Accès illimité aux cours collectifs",
        "Frais d'adhésion offerts",
      ],
    },
    Mensuel: {
      price: "390€",
      priceValue: 390,
      subtitle: "Sans engagement",
      planKey: "private_8_monthly",
      commitmentKey: "monthly",
      features: [
        "8 séances privées par mois",
        "Suivi technique sur-mesure avec le coach",
        "Accès illimité aux séances Small Group",
        "Accès illimité aux cours collectifs",
        "Possibilité d'inviter un(e) ami(e)",
        "Frais d'adhésion offerts",
      ],
    },
  },
  "Small Group": {
    Annuel: {
      price: "80€",
      priceValue: 80,
      subtitle: "Engagement 12 mois",
      planKey: "small_group_annual",
      commitmentKey: "annual",
      features: [
        "Accès illimité aux séances Small Group",
        "Accès illimité aux cours collectifs",
        "Suivi technique personnalisé en groupe réduit",
        "Toutes disciplines incluses (Boxe, Kick, Thaï)",
        "Frais d'adhésion : 39€",
      ],
    },
    Mensuel: {
      price: "120€",
      priceValue: 120,
      subtitle: "Sans engagement",
      planKey: "small_group_monthly",
      commitmentKey: "monthly",
      features: [
        "Accès illimité aux séances Small Group",
        "Accès illimité aux cours collectifs",
        "Suivi technique personnalisé en groupe réduit",
        "Toutes disciplines incluses (Boxe, Kick, Thaï)",
        "Frais d'adhésion : 39€",
      ],
    },
  },
  Collectifs: {
    Annuel: {
      price: "35€",
      priceValue: 35,
      subtitle: "Engagement 12 mois",
      planKey: "collective_annual",
      commitmentKey: "annual",
      features: [
        "Accès illimité aux cours collectifs officiels",
        "Kick Boxing & Striking",
        "Préparation physique & cardio combat",
        "Frais d'adhésion : 39€",
      ],
    },
    Mensuel: {
      price: "60€",
      priceValue: 60,
      subtitle: "Sans engagement",
      planKey: "collective_monthly",
      commitmentKey: "monthly",
      features: [
        "Accès illimité aux cours collectifs officiels",
        "Kick Boxing & Striking",
        "Préparation physique & cardio combat",
        "Frais d'adhésion : 39€",
      ],
    },
  },
};

const categories: { id: PlanCategory; label: string; icon: typeof ShieldCheck; badge: string }[] = [
  { id: "Small Group", label: "Small Group", icon: Users, badge: "Recommandé" },
  { id: "Collectifs", label: "Collectifs", icon: Layers, badge: "Accès libre" },
  { id: "Cours Privés", label: "Cours Privés", icon: ShieldCheck, badge: "Sur-mesure" },
];

export default function PricingSection() {
  const supabase = createClient();
  const [activeCategory, setActiveCategory] = useState<PlanCategory>("Small Group");
  const [activeCycle, setActiveCycle] = useState<BillingCycle>("Annuel");
  const [livePricing, setLivePricing] = useState(defaultPricing);

  // Synchronisation dynamique avec public.plans (Supabase)
  useEffect(() => {
    async function syncPlans() {
      try {
        const { data: plansData } = await supabase
          .from("plans")
          .select("id, name, code, type, commitment, price_cents, private_sessions_per_period, is_active")
          .eq("is_active", true);

        if (plansData && plansData.length > 0) {
          setLivePricing((prev) => {
            const updated = JSON.parse(JSON.stringify(prev));

            for (const p of plansData) {
              const euros = Math.round(p.price_cents / 100);
              const cycle: BillingCycle = p.commitment === "annual" ? "Annuel" : "Mensuel";

              if (p.type === "small_group") {
                if (updated["Small Group"]?.[cycle]) {
                  updated["Small Group"][cycle].price = `${euros}€`;
                  updated["Small Group"][cycle].priceValue = euros;
                  updated["Small Group"][cycle].planKey = p.code || p.id;
                }
              } else if (p.type === "collective") {
                if (updated["Collectifs"]?.[cycle]) {
                  updated["Collectifs"][cycle].price = `${euros}€`;
                  updated["Collectifs"][cycle].priceValue = euros;
                  updated["Collectifs"][cycle].planKey = p.code || p.id;
                }
              } else if (p.type === "private" && (p.private_sessions_per_period === 8 || !p.private_sessions_per_period)) {
                if (updated["Cours Privés"]?.[cycle]) {
                  updated["Cours Privés"][cycle].price = `${euros}€`;
                  updated["Cours Privés"][cycle].priceValue = euros;
                  updated["Cours Privés"][cycle].planKey = p.code || p.id;
                }
              }
            }

            return updated;
          });
        }
      } catch (err) {
        console.warn("Utilisation des tarifs locaux :", err);
      }
    }

    syncPlans();
  }, [supabase]);

  const currentPlan = livePricing[activeCategory][activeCycle];

  return (
    <section className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto font-sans">
      
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-brand-blue/10 border border-brand-blue/20 rounded-full text-brand-blue text-xs font-semibold uppercase tracking-widest mb-4">
          <Sparkles size={14} />
          Formules & Abonnements
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-heading font-black uppercase tracking-tight text-brand-white">
          NOS <span className="text-brand-blue">TARIFS</span>
        </h1>
        <p className="mt-4 text-brand-white/70 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
          Cours Collectifs, Small Group et Coaching Privé au Striking Camp. Choisissez la formule adaptée à vos objectifs et votre rythme.
        </p>
      </div>

      {/* Category Tabs (Pills) */}
      <div className="flex justify-center mb-6">
        <div className="flex flex-wrap items-center justify-center gap-2 max-w-2xl w-full">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "py-3 px-5 sm:px-6 rounded-full text-xs sm:text-sm font-heading font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center gap-2",
                  isActive
                    ? "bg-brand-blue text-brand-black shadow-lg shadow-brand-blue/20 font-black"
                    : "bg-brand-white/5 text-brand-white/70 hover:bg-brand-white/10 hover:text-brand-white border border-brand-white/10"
                )}
              >
                <Icon size={16} className={cn("shrink-0", isActive ? "text-brand-black" : "text-brand-blue")} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Billing Cycle Switcher (Annuel / Mensuel) */}
      <div className="flex justify-center mb-10 sm:mb-12">
        <div className="inline-flex p-1 rounded-full bg-[#0c1322] border border-brand-white/10 shadow-lg">
          {(["Annuel", "Mensuel"] as BillingCycle[]).map((cycle) => {
            const isActive = activeCycle === cycle;
            return (
              <button
                key={cycle}
                onClick={() => setActiveCycle(cycle)}
                className={cn(
                  "py-2 px-5 rounded-full text-xs font-heading font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer",
                  isActive
                    ? "bg-brand-blue/20 text-brand-blue border border-brand-blue/30 font-black shadow-sm"
                    : "text-brand-white/60 hover:text-brand-white"
                )}
              >
                {cycle === "Annuel" ? "Engagement 12 mois" : "Sans engagement"}
              </button>
            );
          })}
        </div>
      </div>

      {/* Pricing Featured Card (Matching /evenements Hero Card Style) */}
      <div className="max-w-3xl mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${activeCategory}-${activeCycle}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="relative rounded-2xl bg-gradient-to-br from-[#0c1626] via-[#101e35] to-[#070c16] border border-brand-blue/40 p-6 sm:p-10 shadow-[0_0_50px_rgba(47,174,224,0.15)] overflow-hidden"
          >
            {/* Ambient Radial Glow */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-brand-blue/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
              
              {/* Left & Center: Details & Features */}
              <div className="md:col-span-2 space-y-5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="px-3 py-1 rounded-full bg-brand-blue text-brand-black font-heading font-bold text-xs uppercase tracking-wider">
                    FORMULE {activeCategory.toUpperCase()}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase border bg-brand-blue/20 text-brand-blue border-brand-blue/30">
                    {activeCycle === "Annuel" ? "12 Mois" : "Mensuel"}
                  </span>
                  <span className="text-xs text-[#22c55e] font-bold">
                    • Accès immédiat
                  </span>
                </div>

                <div>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold uppercase tracking-wider text-brand-white">
                    {activeCategory}
                  </h2>
                  <p className="text-xs sm:text-sm text-brand-white/70 mt-1">
                    {currentPlan.subtitle} • Accompagnement pédagogique complet
                  </p>
                </div>

                {/* Features list */}
                <div className="space-y-2.5 pt-2">
                  <p className="text-xs font-heading font-bold uppercase tracking-wider text-brand-blue">
                    Inclus dans votre formule :
                  </p>
                  <div className="space-y-2 text-xs sm:text-sm text-brand-white/80">
                    {currentPlan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-2.5">
                        <CheckCircle2 size={16} className="text-[#22c55e] shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: CTA & Price Card */}
              <div className="bg-[#070c16]/80 border border-brand-white/10 rounded-xl p-6 text-center space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-brand-white/50">
                    Tarif d&apos;abonnement
                  </p>
                  <div className="flex items-baseline justify-center gap-1 mt-1">
                    <span className="text-4xl sm:text-5xl font-heading font-black text-brand-blue">
                      {currentPlan.price}
                    </span>
                    <span className="text-xs text-brand-white/60 font-medium uppercase tracking-wider">
                      / mois
                    </span>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <Link
                    href="/connexion"
                    className="w-full py-3.5 px-6 bg-brand-blue hover:bg-brand-white text-brand-black font-heading font-bold text-sm uppercase tracking-wider rounded-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-blue/30"
                  >
                    SOUSCRIRE EN LIGNE
                    <ArrowRight size={16} />
                  </Link>
                  <Link
                    href="/contact"
                    className="block w-full py-2.5 px-4 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white/80 text-xs font-semibold uppercase tracking-wider rounded-sm transition-colors"
                  >
                    Une question sur les tarifs ?
                  </Link>
                </div>

                <p className="text-[11px] text-brand-white/40 leading-tight">
                  Paiement sécurisé • Aucun engagement caché.
                </p>
              </div>

            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Info Notice */}
      <div className="mt-14 sm:mt-16 text-center p-8 bg-[#0c1322] border border-brand-white/10 rounded-2xl max-w-2xl mx-auto space-y-3">
        <h3 className="text-lg font-heading font-bold uppercase tracking-wider text-brand-white">
          Besoin d&apos;un conseil sur la formule adaptée ?
        </h3>
        <p className="text-xs sm:text-sm text-brand-white/60 leading-relaxed max-w-lg mx-auto">
          Contactez le coach Mahfoud pour échanger sur vos objectifs et déterminer le programme le plus adapté à votre progression.
        </p>
        <div className="pt-2">
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-white/10 hover:bg-brand-white/20 text-brand-white font-heading font-bold text-xs uppercase tracking-wider rounded-sm transition-colors"
          >
            CONTACTER LE CLUB
          </Link>
        </div>
      </div>

    </section>
  );
}
