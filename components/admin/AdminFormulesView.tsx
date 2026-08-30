"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CreditCard,
  Search,
  CheckCircle2,
  XCircle,
  Edit2,
  X,
  Loader2,
  ArrowLeft,
  Sparkles,
  Users,
  Shield,
  Layers,
  Calendar,
  Euro,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  type AdminPlanItem,
  type UpdatePlanPayload,
  updatePlanAdmin,
  togglePlanStatusAdmin,
} from "@/lib/supabase/admin";
import { cn } from "@/lib/utils";

interface AdminFormulesViewProps {
  initialPlans: AdminPlanItem[];
}

export default function AdminFormulesView({
  initialPlans,
}: AdminFormulesViewProps) {
  const router = useRouter();
  const supabase = createClient();

  const [plans, setPlans] = useState<AdminPlanItem[]>(initialPlans);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<
    "all" | "small_group" | "collective" | "private"
  >("all");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");

  // État Modale Édition
  const [editingPlan, setEditingPlan] = useState<AdminPlanItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editPriceEuros, setEditPriceEuros] = useState<string>("");
  const [editCommitment, setEditCommitment] = useState<"monthly" | "annual">("monthly");
  const [editPrivateSessions, setEditPrivateSessions] = useState<number | null>(null);
  const [editIsActive, setEditIsActive] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);

  // KPIs
  const stats = useMemo(() => {
    const total = plans.length;
    const active = plans.filter((p) => p.is_active).length;
    const smallGroupCount = plans.filter((p) => p.type === "small_group").length;
    const collectiveCount = plans.filter((p) => p.type === "collective").length;
    const privateCount = plans.filter((p) => p.type === "private").length;

    return {
      total,
      active,
      smallGroupCount,
      collectiveCount,
      privateCount,
    };
  }, [plans]);

  // Filtrage
  const filteredPlans = useMemo(() => {
    return plans.filter((p) => {
      // Type
      if (typeFilter !== "all" && p.type !== typeFilter) {
        return false;
      }

      // Statut
      if (statusFilter === "active" && !p.is_active) return false;
      if (statusFilter === "inactive" && p.is_active) return false;

      // Recherche
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesCode = (p.code || "").toLowerCase().includes(q);
        const matchesType = p.type.toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesType) {
          return false;
        }
      }

      return true;
    });
  }, [plans, typeFilter, statusFilter, searchTerm]);

  // Ouvrir la modale d'édition
  const openEditModal = (plan: AdminPlanItem) => {
    setEditingPlan(plan);
    setEditName(plan.name);
    setEditPriceEuros((plan.price_cents / 100).toString());
    setEditCommitment((plan.commitment as "monthly" | "annual") || "monthly");
    setEditPrivateSessions(
      plan.type === "private"
        ? (plan.private_sessions_per_period || 8)
        : null
    );
    setEditIsActive(plan.is_active);
    setModalError(null);
    setModalSuccess(null);
  };

  // Bascule rapide Actif <-> Inactif
  const handleToggleStatus = async (plan: AdminPlanItem) => {
    const targetStatus = !plan.is_active;
    const res = await togglePlanStatusAdmin(supabase, plan.id, targetStatus);
    if (res.success) {
      setPlans((prev) =>
        prev.map((item) =>
          item.id === plan.id ? { ...item, is_active: targetStatus } : item
        )
      );
      router.refresh();
    } else {
      alert("Erreur lors du changement de statut : " + (res.error || ""));
    }
  };

  // Soumission Modification
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;

    setIsSubmitting(true);
    setModalError(null);
    setModalSuccess(null);

    const priceNum = parseFloat(editPriceEuros);
    if (isNaN(priceNum) || priceNum < 0) {
      setModalError("Veuillez renseigner un tarif valide (supérieur ou égal à 0).");
      setIsSubmitting(false);
      return;
    }

    const priceCents = Math.round(priceNum * 100);

    let privateSessions: number | null = null;
    if (editingPlan.type === "private") {
      if (editPrivateSessions !== 8 && editPrivateSessions !== 12) {
        setModalError("Pour une formule privée, le nombre de séances doit être de 8 ou 12.");
        setIsSubmitting(false);
        return;
      }
      privateSessions = editPrivateSessions;
    }

    const payload: UpdatePlanPayload = {
      name: editName.trim(),
      price_cents: priceCents,
      commitment: editCommitment,
      private_sessions_per_period: privateSessions,
      is_active: editIsActive,
    };

    const res = await updatePlanAdmin(supabase, editingPlan.id, payload);

    if (!res.success) {
      setModalError(res.error || "Erreur lors de la modification de la formule.");
      setIsSubmitting(false);
      return;
    }

    // Mise à jour de l'état local
    setPlans((prev) =>
      prev.map((p) =>
        p.id === editingPlan.id
          ? {
              ...p,
              name: editName.trim(),
              price_cents: priceCents,
              commitment: editCommitment,
              private_sessions_per_period: privateSessions,
              is_active: editIsActive,
            }
          : p
      )
    );

    setModalSuccess("Formule mise à jour avec succès !");
    setIsSubmitting(false);

    setTimeout(() => {
      setEditingPlan(null);
      router.refresh();
    }, 600);
  };

  // Helpers de rendu
  const renderTypeBadge = (type: string) => {
    switch (type) {
      case "small_group":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-brand-blue/15 text-brand-blue border border-brand-blue/30">
            <Users size={12} /> Small Group
          </span>
        );
      case "collective":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <Layers size={12} /> Collectif
          </span>
        );
      case "private":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Shield size={12} /> Cours Privé
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-brand-white/10 text-brand-white/70">
            {type}
          </span>
        );
    }
  };

  const renderCommitmentBadge = (commitment?: string | null) => {
    if (commitment === "annual") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-purple-500/15 text-purple-300 border border-purple-500/30">
          <Calendar size={11} /> 12 mois (Annuel)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-sky-500/15 text-sky-300 border border-sky-500/30">
        <Calendar size={11} /> 1 mois (Mensuel)
      </span>
    );
  };

  return (
    <div className="space-y-8 font-sans">
      {/* HEADER */}
      <div className="border-b border-brand-white/10 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-blue/10 border border-brand-blue/30 flex items-center justify-center text-brand-blue">
              <CreditCard size={22} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-heading font-black uppercase tracking-wider text-brand-white">
                Catalogue des <span className="text-brand-blue">Formules</span>
              </h1>
              <p className="text-xs text-brand-white/60 mt-0.5">
                Gestion des tarifs, engagements et séances privées de Striking Camp
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white text-xs font-semibold rounded-xl uppercase tracking-wider border border-brand-white/10 transition-colors"
          >
            <ArrowLeft size={14} /> Dashboard
          </Link>
          <Link
            href="/admin/abonnements"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-brand-blue/15 hover:bg-brand-blue/25 text-brand-blue text-xs font-semibold rounded-xl uppercase tracking-wider border border-brand-blue/30 transition-colors"
          >
            <Users size={14} /> Abonnements membres
          </Link>
        </div>
      </div>

      {/* KPI STATS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Total Formules */}
        <div className="bg-[#0f172a]/90 border border-brand-white/10 rounded-2xl p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden shadow-lg shadow-black/20">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-brand-white/50">
              Total Formules
            </span>
            <div className="w-7 h-7 rounded-lg bg-brand-white/5 border border-brand-white/10 flex items-center justify-center text-brand-white/70">
              <Layers size={14} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-heading font-black text-brand-white">
              {stats.total}
            </span>
            <span className="text-[11px] text-brand-white/50 block mt-0.5">
              Catalogue actif & inactif
            </span>
          </div>
        </div>

        {/* Formules Actives */}
        <div className="bg-[#0f172a]/90 border border-emerald-500/20 rounded-2xl p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden shadow-lg shadow-black/20">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400/80">
              Actives
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 size={14} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-heading font-black text-emerald-400">
              {stats.active}
            </span>
            <span className="text-[11px] text-brand-white/50 block mt-0.5">
              Proposées aux membres
            </span>
          </div>
        </div>

        {/* Small Group */}
        <div className="bg-[#0f172a]/90 border border-brand-blue/20 rounded-2xl p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden shadow-lg shadow-black/20">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-brand-blue">
              Small Group
            </span>
            <div className="w-7 h-7 rounded-lg bg-brand-blue/10 border border-brand-blue/20 flex items-center justify-center text-brand-blue">
              <Users size={14} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-heading font-black text-brand-blue">
              {stats.smallGroupCount}
            </span>
            <span className="text-[11px] text-brand-white/50 block mt-0.5">
              Accès créneaux limités
            </span>
          </div>
        </div>

        {/* Collectif */}
        <div className="bg-[#0f172a]/90 border border-emerald-500/20 rounded-2xl p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden shadow-lg shadow-black/20">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
              Collectifs
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Layers size={14} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-heading font-black text-emerald-300">
              {stats.collectiveCount}
            </span>
            <span className="text-[11px] text-brand-white/50 block mt-0.5">
              Accès cours illimité
            </span>
          </div>
        </div>

        {/* Cours Privés */}
        <div className="bg-[#0f172a]/90 border border-amber-500/20 rounded-2xl p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden shadow-lg shadow-black/20 col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
              Cours Privés
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Shield size={14} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-heading font-black text-amber-400">
              {stats.privateCount}
            </span>
            <span className="text-[11px] text-brand-white/50 block mt-0.5">
              8 séances / mois
            </span>
          </div>
        </div>
      </div>

      {/* FILTRES ET RECHERCHE */}
      <div className="bg-[#0f172a]/80 border border-brand-white/10 rounded-2xl p-4 sm:p-5 space-y-4">
        {/* Catégories Onglets */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setTypeFilter("all")}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer",
              typeFilter === "all"
                ? "bg-brand-white text-brand-black shadow-md shadow-brand-white/10"
                : "bg-brand-white/5 text-brand-white/60 hover:text-brand-white hover:bg-brand-white/10"
            )}
          >
            Toutes ({plans.length})
          </button>
          <button
            onClick={() => setTypeFilter("small_group")}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer",
              typeFilter === "small_group"
                ? "bg-brand-blue text-white shadow-md shadow-brand-blue/20"
                : "bg-brand-blue/10 text-brand-blue hover:bg-brand-blue/20"
            )}
          >
            <Users size={13} /> Small Group ({stats.smallGroupCount})
          </button>
          <button
            onClick={() => setTypeFilter("collective")}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer",
              typeFilter === "collective"
                ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
            )}
          >
            <Layers size={13} /> Collectifs ({stats.collectiveCount})
          </button>
          <button
            onClick={() => setTypeFilter("private")}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer",
              typeFilter === "private"
                ? "bg-amber-500 text-brand-black shadow-md shadow-amber-500/20 font-black"
                : "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
            )}
          >
            <Shield size={13} /> Cours Privés ({stats.privateCount})
          </button>
        </div>

        {/* Barre de recherche et statut */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-brand-white/5">
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-white/40"
            />
            <input
              type="text"
              placeholder="Rechercher une formule par nom ou code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#020617] border border-brand-white/10 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-brand-white placeholder:text-brand-white/30 focus:border-brand-blue outline-none transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-white/40 hover:text-brand-white"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as "all" | "active" | "inactive")
              }
              className="bg-[#020617] border border-brand-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-brand-white focus:border-brand-blue outline-none cursor-pointer"
            >
              <option value="all">Tous les statuts</option>
              <option value="active">Actives uniquement</option>
              <option value="inactive">Inactives uniquement</option>
            </select>
          </div>
        </div>
      </div>

      {/* LISTE DES FORMULES */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-white/50">
            {filteredPlans.length} formule{filteredPlans.length > 1 ? "s" : ""} affichée{filteredPlans.length > 1 ? "s" : ""}
          </span>
        </div>

        {filteredPlans.length === 0 ? (
          <div className="bg-[#0f172a]/60 border border-brand-white/10 border-dashed rounded-2xl p-12 text-center space-y-3">
            <CreditCard size={32} className="mx-auto text-brand-white/30" />
            <p className="text-sm font-semibold text-brand-white/70">
              Aucune formule ne correspond à vos critères de recherche.
            </p>
            <button
              onClick={() => {
                setSearchTerm("");
                setTypeFilter("all");
                setStatusFilter("all");
              }}
              className="text-xs font-bold text-brand-blue hover:underline uppercase tracking-wider cursor-pointer"
            >
              Réinitialiser les filtres
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPlans.map((plan) => {
              const priceEuros = (plan.price_cents / 100).toLocaleString("fr-FR", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              });

              return (
                <div
                  key={plan.id}
                  className={cn(
                    "bg-[#0f172a] border rounded-2xl p-5 sm:p-6 transition-all relative overflow-hidden flex flex-col justify-between gap-4 shadow-lg shadow-black/20",
                    plan.is_active
                      ? "border-brand-white/10 hover:border-brand-blue/40"
                      : "border-brand-white/5 opacity-60 bg-[#0f172a]/50"
                  )}
                >
                  {/* Top Bar: Name + Badges */}
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-heading font-black text-lg text-brand-white uppercase tracking-wider">
                            {plan.name}
                          </h3>
                        </div>
                        {plan.code && (
                          <span className="text-[11px] font-mono text-brand-white/40 block">
                            Code : {plan.code}
                          </span>
                        )}
                      </div>

                      {/* Statut Toggle Switch */}
                      <button
                        onClick={() => handleToggleStatus(plan)}
                        title={plan.is_active ? "Désactiver la formule" : "Activer la formule"}
                        className="cursor-pointer transition-transform hover:scale-105 shrink-0"
                      >
                        {plan.is_active ? (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            <ToggleRight size={14} className="text-emerald-400" />
                            <span>Active</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-white/10 text-brand-white/40 border border-brand-white/10">
                            <ToggleLeft size={14} className="text-brand-white/40" />
                            <span>Inactive</span>
                          </div>
                        )}
                      </button>
                    </div>

                    {/* Badges Type & Engagement */}
                    <div className="flex items-center gap-2 flex-wrap mt-3">
                      {renderTypeBadge(plan.type)}
                      {renderCommitmentBadge(plan.commitment)}
                      {plan.type === "private" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          <Sparkles size={11} /> {plan.private_sessions_per_period || 8} séances privées
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bottom: Price + Actions */}
                  <div className="pt-4 border-t border-brand-white/10 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-brand-white/40 block">
                        Tarif mensuel
                      </span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl sm:text-3xl font-heading font-black text-brand-white">
                          {priceEuros} €
                        </span>
                        <span className="text-xs font-semibold text-brand-white/50">
                          / mois
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => openEditModal(plan)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-blue hover:bg-brand-blue-hover text-brand-black text-xs font-bold rounded-xl uppercase tracking-wider transition-colors cursor-pointer shadow-md shadow-brand-blue/20"
                    >
                      <Edit2 size={13} /> Modifier
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODALE DE MODIFICATION D'UNE FORMULE */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0f172a] border border-brand-white/15 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl shadow-black/80">
            {/* Header Modale */}
            <div className="px-6 py-5 border-b border-brand-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-brand-blue/15 border border-brand-blue/30 flex items-center justify-center text-brand-blue">
                  <Edit2 size={16} />
                </div>
                <div>
                  <h3 className="font-heading font-black text-lg uppercase tracking-wider text-brand-white">
                    Modifier la formule
                  </h3>
                  <span className="text-xs text-brand-white/50">
                    Code : {editingPlan.code || editingPlan.id}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setEditingPlan(null)}
                className="text-brand-white/40 hover:text-brand-white transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Formulaire */}
            <form onSubmit={handleEditSubmit} className="p-6 space-y-5">
              {modalError && (
                <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {modalSuccess && (
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 size={15} className="shrink-0" />
                  <span>{modalSuccess}</span>
                </div>
              )}

              {/* Nom de la formule */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-brand-white/70">
                  Nom affiché de la formule <span className="text-brand-blue">*</span>
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  placeholder="Ex: Small Group - Mensuel"
                  className="w-full bg-[#020617] border border-brand-white/15 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold text-brand-white focus:border-brand-blue outline-none transition-colors"
                />
              </div>

              {/* Tarif & Engagement */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Tarif Mensuel */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-brand-white/70">
                    Tarif mensuel (€) <span className="text-brand-blue">*</span>
                  </label>
                  <div className="relative">
                    <Euro
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-white/40"
                    />
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={editPriceEuros}
                      onChange={(e) => setEditPriceEuros(e.target.value)}
                      required
                      placeholder="Ex: 120"
                      className="w-full bg-[#020617] border border-brand-white/15 rounded-xl pl-9 pr-4 py-2.5 text-xs sm:text-sm font-semibold text-brand-white focus:border-brand-blue outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Engagement */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-brand-white/70">
                    Type d&apos;engagement <span className="text-brand-blue">*</span>
                  </label>
                  <select
                    value={editCommitment}
                    onChange={(e) =>
                      setEditCommitment(e.target.value as "monthly" | "annual")
                    }
                    className="w-full bg-[#020617] border border-brand-white/15 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-brand-white focus:border-brand-blue outline-none cursor-pointer"
                  >
                    <option value="monthly">Mensuel (1 mois)</option>
                    <option value="annual">Annuel (12 mois)</option>
                  </select>
                </div>
              </div>

              {/* Séances privées (uniquement si type === 'private') */}
              {editingPlan.type === "private" && (
                <div className="space-y-1.5 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-amber-400">
                    Séances privées par période <span className="text-brand-blue">*</span>
                  </label>
                  <select
                    value={editPrivateSessions || 8}
                    onChange={(e) =>
                      setEditPrivateSessions(parseInt(e.target.value, 10))
                    }
                    className="w-full bg-[#020617] border border-amber-500/30 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-brand-white focus:border-amber-400 outline-none cursor-pointer"
                  >
                    <option value={8}>8 séances privées / mois</option>
                  </select>
                  <span className="text-[11px] text-amber-300/70 block mt-1">
                    Conformément aux règles du club, les formules privées comprennent strictement 8 séances.
                  </span>
                </div>
              )}

              {/* Statut Actif / Inactif */}
              <div className="flex items-center justify-between bg-[#020617] border border-brand-white/10 rounded-xl p-3.5">
                <div>
                  <span className="text-xs font-bold text-brand-white block">
                    Statut de la formule
                  </span>
                  <span className="text-[11px] text-brand-white/50">
                    {editIsActive
                      ? "La formule est active et proposée aux membres."
                      : "La formule est masquée et inactive."}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setEditIsActive(!editIsActive)}
                  className="cursor-pointer transition-transform hover:scale-105"
                >
                  {editIsActive ? (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                      <ToggleRight size={16} /> Active
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-brand-white/10 text-brand-white/40 border border-brand-white/10">
                      <ToggleLeft size={16} /> Inactive
                    </div>
                  )}
                </button>
              </div>

              {/* Boutons Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-brand-white/10">
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl border border-brand-white/10 text-brand-white/70 hover:text-brand-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-blue hover:bg-brand-blue-hover text-brand-black text-xs font-black uppercase tracking-wider transition-colors cursor-pointer shadow-lg shadow-brand-blue/20 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Enregistrement...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} />
                      <span>Enregistrer</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
