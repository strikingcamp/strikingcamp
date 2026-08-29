"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Layers,
  Search,
  Plus,
  Edit2,
  PauseCircle,
  PlayCircle,
  Clock,
  User,
  Phone,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  X,
  Loader2,
  Calendar,
  History,
  ShieldCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  type AdminSubscriptionItem,
  type AdminPlanItem,
  type AdminMemberOption,
  type AdminSubscriptionsData,
  type CreateSubscriptionPayload,
  type UpdateSubscriptionPayload,
  createSubscriptionAdmin,
  updateSubscriptionAdmin,
  toggleSubscriptionStatusAdmin,
} from "@/lib/supabase/admin";
import { cn } from "@/lib/utils";

interface AdminSubscriptionsViewProps {
  initialData: AdminSubscriptionsData;
}

export default function AdminSubscriptionsView({
  initialData,
}: AdminSubscriptionsViewProps) {
  const router = useRouter();
  const supabase = createClient();

  const [subscriptions, setSubscriptions] = useState<AdminSubscriptionItem[]>(
    initialData.subscriptions
  );
  const [plans] = useState<AdminPlanItem[]>(initialData.plans);
  const [members] = useState<AdminMemberOption[]>(initialData.members);

  // Filtres
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "paused" | "expired" | "cancelled"
  >("all");
  const [typeFilter, setTypeFilter] = useState<
    "all" | "small_group" | "collective" | "private"
  >("all");

  // Modales
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<AdminSubscriptionItem | null>(null);
  const [historyMember, setHistoryMember] = useState<{
    userId: string;
    memberName: string;
  } | null>(null);

  // Formulaire Nouvel Abonnement
  const [formUserId, setFormUserId] = useState("");
  const [formPlanId, setFormPlanId] = useState(plans[0]?.id || "");
  const [formStatus, setFormStatus] = useState<"active" | "paused">("active");
  const [formStartDate, setFormStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [formEndDate, setFormEndDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Formulaire Modification
  const [editPlanId, setEditPlanId] = useState("");
  const [editStatus, setEditStatus] = useState<
    "active" | "paused" | "expired" | "cancelled"
  >("active");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Calcul des statistiques en temps réel
  const stats = useMemo(() => {
    let activeSmallGroup = 0;
    let activeCollective = 0;
    let paused = 0;
    let expired = 0;
    let cancelled = 0;

    for (const sub of subscriptions) {
      if (sub.status === "active") {
        if (
          sub.planType === "small_group" ||
          sub.planName.toLowerCase().includes("small group")
        ) {
          activeSmallGroup++;
        } else if (
          sub.planType === "collective" ||
          sub.planName.toLowerCase().includes("collectif")
        ) {
          activeCollective++;
        }
      } else if (sub.status === "paused" || (sub.status as string) === "suspended") {
        paused++;
      } else if (sub.status === "expired") {
        expired++;
      } else if (sub.status === "cancelled") {
        cancelled++;
      }
    }

    return {
      total: subscriptions.length,
      activeTotal: activeSmallGroup + activeCollective,
      activeSmallGroup,
      activeCollective,
      paused,
      suspended: paused,
      expired,
      cancelled,
    };
  }, [subscriptions]);

  // Filtrage de la liste
  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter((sub) => {
      // 1. Filtre recherche
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesName = sub.memberName.toLowerCase().includes(query);
        const matchesPhone = sub.phone.toLowerCase().includes(query);
        const matchesPlan = sub.planName.toLowerCase().includes(query);
        if (!matchesName && !matchesPhone && !matchesPlan) {
          return false;
        }
      }

      // 2. Filtre statut
      if (statusFilter !== "all" && sub.status !== statusFilter) {
        return false;
      }

      // 3. Filtre type de formule
      if (typeFilter !== "all") {
        const isSg =
          sub.planType === "small_group" ||
          sub.planName.toLowerCase().includes("small group");
        const isColl =
          sub.planType === "collective" ||
          sub.planName.toLowerCase().includes("collectif");
        const isPriv =
          sub.planType === "private" ||
          sub.planName.toLowerCase().includes("privé");

        if (typeFilter === "small_group" && !isSg) return false;
        if (typeFilter === "collective" && !isColl) return false;
        if (typeFilter === "private" && !isPriv) return false;
      }

      return true;
    });
  }, [subscriptions, searchTerm, statusFilter, typeFilter]);

  // Recharger les données fraîches
  const refreshData = async () => {
    const { data: subsData } = await supabase
      .from("subscriptions")
      .select(
        "id, user_id, plan_id, status, started_at, ends_at, created_at, plan:plans(id, name, type)"
      )
      .order("created_at", { ascending: false });

    if (subsData) {
      const profilesMap = new Map<
        string,
        { first_name: string; last_name: string; phone: string }
      >();
      for (const m of members) {
        profilesMap.set(m.id, {
          first_name: m.first_name,
          last_name: m.last_name,
          phone: m.phone || "—",
        });
      }

      const plansMap = new Map<string, AdminPlanItem>();
      for (const p of plans) {
        plansMap.set(p.id, p);
      }

      const refreshed: AdminSubscriptionItem[] = [];
      for (const s of subsData as Record<string, unknown>[]) {
        const rawPlan = Array.isArray(s.plan)
          ? s.plan[0]
          : (s.plan as Record<string, unknown> | null);
        const planId = (s.plan_id as string) || (rawPlan?.id as string) || "";
        const fallbackPlan = plansMap.get(planId);

        const planName =
          (rawPlan?.name as string) ||
          fallbackPlan?.name ||
          "Formule non définie";
        const planType = (
          (rawPlan?.type as string) ||
          fallbackPlan?.type ||
          "small_group"
        ).toLowerCase();

        const prof = profilesMap.get(s.user_id as string);
        const firstName = prof?.first_name || "";
        const lastName = prof?.last_name || "";
        const memberName = `${firstName} ${lastName}`.trim() || "Membre";
        const phone = prof?.phone || "—";

        const rawStatus = (s.status as string) || "active";
        let status: "active" | "paused" | "expired" | "cancelled" = "active";
        if (rawStatus === "suspended" || rawStatus === "paused") {
          status = "paused";
        } else if (rawStatus === "expired") {
          status = "expired";
        } else if (rawStatus === "cancelled") {
          status = "cancelled";
        } else {
          status = "active";
        }

        refreshed.push({
          id: s.id as string,
          userId: s.user_id as string,
          memberName,
          firstName,
          lastName,
          phone,
          planId,
          planName,
          planType,
          status,
          started_at:
            (s.started_at as string) ||
            (s.created_at as string) ||
            new Date().toISOString(),
          ends_at: (s.ends_at as string) || null,
          created_at: (s.created_at as string) || new Date().toISOString(),
        });
      }
      setSubscriptions(refreshed);
    }
  };

  // Bascule rapide Actif <-> Suspendu
  const handleToggleStatus = async (
    sub: AdminSubscriptionItem,
    targetStatus: "active" | "paused" | "expired" | "cancelled"
  ) => {
    const res = await toggleSubscriptionStatusAdmin(
      supabase,
      sub.id,
      targetStatus
    );
    if (res.success) {
      setSubscriptions((prev) =>
        prev.map((item) =>
          item.id === sub.id ? { ...item, status: targetStatus } : item
        )
      );
      router.refresh();
    } else {
      alert("Erreur lors du changement de statut : " + (res.error || ""));
    }
  };

  // Ouvrir modal d'ajout
  const openAddModal = (defaultUserId?: string) => {
    setFormUserId(defaultUserId || members[0]?.id || "");
    setFormPlanId(plans[0]?.id || "");
    setFormStatus("active");
    setFormStartDate(new Date().toISOString().split("T")[0]);
    setFormEndDate("");
    setFormError(null);
    setFormSuccess(null);
    setIsAddModalOpen(true);
  };

  // Ouvrir modal d'édition
  const openEditModal = (sub: AdminSubscriptionItem) => {
    setEditingSub(sub);
    setEditPlanId(sub.planId);
    setEditStatus(sub.status);

    const sDate = sub.started_at
      ? new Date(sub.started_at).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];
    setEditStartDate(sDate);

    const eDate = sub.ends_at
      ? new Date(sub.ends_at).toISOString().split("T")[0]
      : "";
    setEditEndDate(eDate);

    setEditError(null);
  };

  // Soumission Création
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    if (!formUserId) {
      setFormError("Veuillez sélectionner un membre.");
      setIsSubmitting(false);
      return;
    }

    if (!formPlanId) {
      setFormError("Veuillez sélectionner une formule.");
      setIsSubmitting(false);
      return;
    }

    const payload: CreateSubscriptionPayload = {
      userId: formUserId,
      planId: formPlanId,
      status: formStatus,
      started_at: new Date(`${formStartDate}T00:00:00Z`).toISOString(),
      ends_at: formEndDate
        ? new Date(`${formEndDate}T23:59:59Z`).toISOString()
        : null,
    };

    const res = await createSubscriptionAdmin(supabase, payload);
    if (!res.success) {
      setFormError(res.error || "Erreur lors de la création de l'abonnement.");
      setIsSubmitting(false);
      return;
    }

    await refreshData();
    setIsSubmitting(false);
    setIsAddModalOpen(false);
    router.refresh();
  };

  // Soumission Modification
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSub) return;
    setIsEditSubmitting(true);
    setEditError(null);

    const payload: UpdateSubscriptionPayload = {
      planId: editPlanId,
      status: editStatus,
      started_at: new Date(`${editStartDate}T00:00:00Z`).toISOString(),
      ends_at: editEndDate
        ? new Date(`${editEndDate}T23:59:59Z`).toISOString()
        : null,
    };

    const res = await updateSubscriptionAdmin(supabase, editingSub.id, payload);
    if (!res.success) {
      setEditError(
        res.error || "Erreur lors de la mise à jour de l'abonnement."
      );
      setIsEditSubmitting(false);
      return;
    }

    await refreshData();
    setIsEditSubmitting(false);
    setEditingSub(null);
    router.refresh();
  };

  // Formattage date
  const formatDate = (isoString?: string | null) => {
    if (!isoString) return "Illimité";
    const d = new Date(isoString);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Badge Statut
  const renderStatusBadge = (
    status: "active" | "paused" | "expired" | "cancelled"
  ) => {
    switch (status) {
      case "active":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/30">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
            Actif
          </span>
        );
      case "paused":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Suspendu
          </span>
        );
      case "expired":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-white/10 text-brand-white/60 border border-brand-white/15">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-white/40" />
            Expiré
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-500/15 text-red-400 border border-red-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
            Résilié
          </span>
        );
    }
  };

  // Badge Catégorie de formule
  const renderCategoryBadge = (planType: string, planName: string) => {
    const isSg =
      planType === "small_group" ||
      planName.toLowerCase().includes("small group");
    const isColl =
      planType === "collective" ||
      planName.toLowerCase().includes("collectif");

    if (isSg) {
      return (
        <span className="px-2 py-0.5 rounded bg-brand-blue/15 text-brand-blue border border-brand-blue/30 text-[9px] font-bold uppercase tracking-wider">
          Small Group
        </span>
      );
    }
    if (isColl) {
      return (
        <span className="px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30 text-[9px] font-bold uppercase tracking-wider">
          Collectif
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded bg-brand-white/10 text-brand-white/70 border border-brand-white/15 text-[9px] font-bold uppercase tracking-wider">
        Privé
      </span>
    );
  };

  // Souscriptions de l'historique du membre sélectionné
  const memberHistoryList = useMemo(() => {
    if (!historyMember) return [];
    return subscriptions.filter((s) => s.userId === historyMember.userId);
  }, [subscriptions, historyMember]);

  return (
    <div className="space-y-8">
      {/* ━━━━━━━━━━━━━━━━━━━━
          HEADER SECTION
          ━━━━━━━━━━━━━━━━━━━━ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-white/10 pb-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-heading font-black uppercase tracking-wider text-brand-white">
            Suivi des <span className="text-brand-blue">Abonnements</span>
          </h1>
          <p className="text-xs sm:text-sm text-brand-white/60 mt-1">
            Gestion des formules membres, contrôle des droits d&apos;accès et attribution des abonnements.
          </p>
        </div>

        <button
          onClick={() => openAddModal()}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-blue hover:bg-brand-white text-brand-black font-heading font-bold text-xs uppercase tracking-wider rounded-sm transition-all shadow-md shadow-brand-blue/20 cursor-pointer"
        >
          <Plus size={16} />
          Nouvel abonnement
        </button>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━
          KPI STAT CARDS
          ━━━━━━━━━━━━━━━━━━━━ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Total Abonnements */}
        <div className="bg-[#0f172a]/80 border border-brand-white/10 rounded-xl p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-white/50">
              Total Souscriptions
            </span>
            <div className="w-9 h-9 rounded-lg bg-brand-blue/15 text-brand-blue flex items-center justify-center border border-brand-blue/30">
              <Layers size={18} />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-3xl font-heading font-black text-brand-white">
              {stats.total}
            </div>
            <p className="text-[11px] text-brand-white/40">
              Historique complet enregistré
            </p>
          </div>
        </div>

        {/* Actifs Small Group */}
        <div className="bg-[#0f172a]/80 border border-brand-white/10 rounded-xl p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-white/50">
              Actifs Small Group
            </span>
            <div className="w-9 h-9 rounded-lg bg-brand-blue/15 text-brand-blue flex items-center justify-center border border-brand-blue/30">
              <ShieldCheck size={18} />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-3xl font-heading font-black text-brand-blue">
              {stats.activeSmallGroup}
            </div>
            <p className="text-[11px] text-[#22c55e] font-semibold">
              Réservations Small Group autorisées
            </p>
          </div>
        </div>

        {/* Actifs Collectifs */}
        <div className="bg-[#0f172a]/80 border border-brand-white/10 rounded-xl p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-white/50">
              Actifs Collectifs
            </span>
            <div className="w-9 h-9 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center border border-purple-500/30">
              <CreditCard size={18} />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-3xl font-heading font-black text-brand-white">
              {stats.activeCollective}
            </div>
            <p className="text-[11px] text-brand-white/40">
              Accès libre aux cours collectifs
            </p>
          </div>
        </div>

        {/* Suspendus & Expirés */}
        <div className="bg-[#0f172a]/80 border border-brand-white/10 rounded-xl p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-white/50">
              Suspendus / Expirés
            </span>
            <div className="w-9 h-9 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Clock size={18} />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-3xl font-heading font-black text-amber-400">
              {stats.suspended + stats.expired}
            </div>
            <p className="text-[11px] text-brand-white/40">
              {stats.suspended} suspendus · {stats.expired} expirés
            </p>
          </div>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━
          FILTERS & SEARCH BAR
          ━━━━━━━━━━━━━━━━━━━━ */}
      <div className="bg-[#0b1322] border border-brand-white/10 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-white/40"
            />
            <input
              type="text"
              placeholder="Rechercher par membre, prénom, nom, téléphone ou formule…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0f172a] border border-brand-white/15 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-brand-white placeholder-brand-white/30 focus:border-brand-blue outline-none transition-colors"
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

          {/* Type Filter */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-brand-white/50 hidden sm:inline">
              Formule :
            </span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
              className="bg-[#0f172a] border border-brand-white/15 rounded-xl px-3 py-2 text-xs font-semibold text-brand-white focus:border-brand-blue outline-none cursor-pointer"
            >
              <option value="all">Toutes formules</option>
              <option value="small_group">Small Group</option>
              <option value="collective">Collectif</option>
              <option value="private">Privé</option>
            </select>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-t border-brand-white/5 pt-3">
          <button
            onClick={() => setStatusFilter("all")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-heading font-bold uppercase tracking-wider transition-all cursor-pointer shrink-0",
              statusFilter === "all"
                ? "bg-brand-blue text-brand-black shadow"
                : "bg-[#0f172a] text-brand-white/60 hover:text-brand-white border border-brand-white/5"
            )}
          >
            Tous ({subscriptions.length})
          </button>
          <button
            onClick={() => setStatusFilter("active")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-heading font-bold uppercase tracking-wider transition-all cursor-pointer shrink-0",
              statusFilter === "active"
                ? "bg-[#22c55e] text-brand-black shadow font-black"
                : "bg-[#0f172a] text-[#22c55e]/70 hover:text-[#22c55e] border border-brand-white/5"
            )}
          >
            Actifs ({stats.activeTotal})
          </button>
          <button
            onClick={() => setStatusFilter("paused")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-heading font-bold uppercase tracking-wider transition-all cursor-pointer shrink-0",
              statusFilter === "paused"
                ? "bg-amber-400 text-brand-black shadow font-black"
                : "bg-[#0f172a] text-amber-400/70 hover:text-amber-400 border border-brand-white/5"
            )}
          >
            Suspendus ({stats.paused})
          </button>
          <button
            onClick={() => setStatusFilter("expired")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-heading font-bold uppercase tracking-wider transition-all cursor-pointer shrink-0",
              statusFilter === "expired"
                ? "bg-brand-white/80 text-brand-black shadow font-black"
                : "bg-[#0f172a] text-brand-white/60 hover:text-brand-white border border-brand-white/5"
            )}
          >
            Expirés ({stats.expired})
          </button>
          <button
            onClick={() => setStatusFilter("cancelled")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-heading font-bold uppercase tracking-wider transition-all cursor-pointer shrink-0",
              statusFilter === "cancelled"
                ? "bg-red-500 text-brand-white shadow font-black"
                : "bg-[#0f172a] text-red-400/70 hover:text-red-400 border border-brand-white/5"
            )}
          >
            Résiliés ({stats.cancelled})
          </button>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━
          SUBSCRIPTIONS LIST
          ━━━━━━━━━━━━━━━━━━━━ */}
      {filteredSubscriptions.length === 0 ? (
        <div className="bg-[#0f172a]/60 border border-brand-white/10 border-dashed rounded-2xl p-12 text-center space-y-3">
          <Layers size={36} className="mx-auto text-brand-white/30" />
          <h3 className="text-base font-heading font-bold uppercase text-brand-white">
            Aucun abonnement trouvé
          </h3>
          <p className="text-xs text-brand-white/50 max-w-sm mx-auto">
            Aucun résultat ne correspond à vos critères de recherche ou de filtre.
          </p>
          {(searchTerm || statusFilter !== "all" || typeFilter !== "all") && (
            <button
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
                setTypeFilter("all");
              }}
              className="mt-2 text-xs font-bold text-brand-blue uppercase hover:underline"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      ) : (
        <div className="bg-[#0b1322] border border-brand-white/10 rounded-2xl shadow-xl overflow-hidden">
          <div className="divide-y divide-brand-white/5">
            {filteredSubscriptions.map((sub) => {
              const initials = sub.firstName
                ? `${sub.firstName.charAt(0)}${sub.lastName ? sub.lastName.charAt(0) : ""}`.toUpperCase()
                : "MB";

              return (
                <div
                  key={sub.id}
                  className="p-4 sm:p-5 hover:bg-brand-white/[0.02] transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  {/* Member & Plan Info */}
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-brand-blue/15 text-brand-blue border border-brand-blue/30 flex items-center justify-center font-heading font-black text-sm shrink-0">
                      {initials}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-heading font-bold text-sm sm:text-base text-brand-white uppercase">
                          {sub.memberName}
                        </span>
                        {renderStatusBadge(sub.status)}
                        {renderCategoryBadge(sub.planType, sub.planName)}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-brand-white/60 flex-wrap">
                        <span className="font-semibold text-brand-white/90">
                          {sub.planName}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Phone size={11} className="text-brand-blue" />
                          {sub.phone}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Dates & Validity */}
                  <div className="flex items-center gap-4 text-xs text-brand-white/60 bg-[#0f172a] px-3.5 py-2 rounded-xl border border-brand-white/5">
                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase font-bold text-brand-white/40 block">
                        Période
                      </span>
                      <div className="flex items-center gap-1.5 font-medium text-brand-white text-xs">
                        <Calendar size={13} className="text-brand-blue shrink-0" />
                        <span>Du {formatDate(sub.started_at)}</span>
                        <span>au</span>
                        <span>{formatDate(sub.ends_at)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Buttons */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    {/* Member History */}
                    <button
                      onClick={() =>
                        setHistoryMember({
                          userId: sub.userId,
                          memberName: sub.memberName,
                        })
                      }
                      className="p-2 rounded-lg bg-brand-white/5 hover:bg-brand-white/10 text-brand-white/70 hover:text-brand-white transition-colors border border-brand-white/10 cursor-pointer"
                      title="Voir l'historique du membre"
                    >
                      <History size={15} />
                    </button>

                    {/* Quick Suspend / Resume */}
                    {sub.status === "active" ? (
                      <button
                        onClick={() => handleToggleStatus(sub, "paused")}
                        className="p-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 transition-colors border border-amber-500/20 cursor-pointer"
                        title="Suspendre l'abonnement"
                      >
                        <PauseCircle size={15} />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleToggleStatus(sub, "active")}
                        className="p-2 rounded-lg bg-[#22c55e]/10 hover:bg-[#22c55e]/20 text-[#22c55e] transition-colors border border-[#22c55e]/20 cursor-pointer"
                        title="Réactiver l'abonnement"
                      >
                        <PlayCircle size={15} />
                      </button>
                    )}

                    {/* Edit */}
                    <button
                      onClick={() => openEditModal(sub)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-white/5 hover:bg-brand-blue hover:text-brand-black text-brand-white text-xs font-semibold uppercase tracking-wider transition-all border border-brand-white/10 cursor-pointer"
                    >
                      <Edit2 size={13} />
                      <span>Modifier</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MODAL : NOUVEL ABONNEMENT
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-[#0b1322] border border-brand-white/15 rounded-2xl p-6 sm:p-8 shadow-2xl z-10 space-y-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-brand-white/10 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-brand-blue/15 text-brand-blue flex items-center justify-center border border-brand-blue/30">
                    <Plus size={16} />
                  </div>
                  <div>
                    <h3 className="text-lg font-heading font-black uppercase tracking-wider text-brand-white">
                      Attribuer un abonnement
                    </h3>
                    <p className="text-[11px] text-brand-white/50">
                      Sélectionnez un membre et sa formule d&apos;adhésion.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1 rounded-lg text-brand-white/50 hover:text-brand-white hover:bg-brand-white/10"
                >
                  <X size={18} />
                </button>
              </div>

              {formError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleCreateSubmit} className="space-y-4">
                {/* Membre */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-brand-white/70">
                    Membre bénéficiaire <span className="text-brand-blue">*</span>
                  </label>
                  <div className="relative">
                    <User
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-white/30"
                    />
                    <select
                      value={formUserId}
                      onChange={(e) => setFormUserId(e.target.value)}
                      required
                      className="w-full bg-[#0f172a] border border-brand-white/15 rounded-xl pl-9 pr-4 py-2.5 text-xs sm:text-sm font-semibold text-brand-white focus:border-brand-blue outline-none cursor-pointer"
                    >
                      <option value="">-- Choisir un membre --</option>
                      {members.map((m) => {
                        const name = `${m.last_name || ""} ${m.first_name || ""}`.trim() || `Membre #${m.id.slice(0, 6)}`;
                        return (
                          <option key={m.id} value={m.id}>
                            {name} {m.phone ? `(${m.phone})` : ""}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                {/* Formule */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-brand-white/70">
                    Formule <span className="text-brand-blue">*</span>
                  </label>
                  <div className="relative">
                    <CreditCard
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-white/30"
                    />
                    <select
                      value={formPlanId}
                      onChange={(e) => setFormPlanId(e.target.value)}
                      required
                      className="w-full bg-[#0f172a] border border-brand-white/15 rounded-xl pl-9 pr-4 py-2.5 text-xs sm:text-sm font-semibold text-brand-white focus:border-brand-blue outline-none cursor-pointer"
                    >
                      <option value="">-- Choisir une formule --</option>
                      {plans.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} [{p.type === "small_group" ? "Small Group" : p.type === "collective" ? "Collectif" : "Privé"}]
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Statut initial */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-brand-white/70">
                    Statut initial
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) =>
                      setFormStatus(e.target.value as "active" | "paused")
                    }
                    className="w-full bg-[#0f172a] border border-brand-white/15 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold text-brand-white focus:border-brand-blue outline-none cursor-pointer"
                  >
                    <option value="active">Actif (Accès et réservations immédiats)</option>
                    <option value="paused">Suspendu (Accès bloqué)</option>
                  </select>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-brand-white/70">
                      Date de début <span className="text-brand-blue">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formStartDate}
                      onChange={(e) => setFormStartDate(e.target.value)}
                      className="w-full bg-[#0f172a] border border-brand-white/15 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-brand-white focus:border-brand-blue outline-none cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-brand-white/70">
                      Date de fin (Optionnelle)
                    </label>
                    <input
                      type="date"
                      value={formEndDate}
                      onChange={(e) => setFormEndDate(e.target.value)}
                      className="w-full bg-[#0f172a] border border-brand-white/15 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-brand-white focus:border-brand-blue outline-none cursor-pointer"
                    />
                    <p className="text-[10px] text-brand-white/40">
                      Laisser vide pour un abonnement illimité.
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-4 border-t border-brand-white/10">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="flex-1 py-2.5 px-4 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white text-xs font-bold uppercase tracking-wider rounded-sm transition-colors cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-2.5 px-4 bg-brand-blue hover:bg-brand-white text-brand-black font-heading font-bold text-xs uppercase tracking-wider rounded-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Création…
                      </>
                    ) : (
                      "Valider l'abonnement"
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MODAL : MODIFIER L'ABONNEMENT
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatePresence>
        {editingSub && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingSub(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-[#0b1322] border border-brand-white/15 rounded-2xl p-6 sm:p-8 shadow-2xl z-10 space-y-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-brand-white/10 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-brand-blue/15 text-brand-blue flex items-center justify-center border border-brand-blue/30">
                    <Edit2 size={16} />
                  </div>
                  <div>
                    <h3 className="text-lg font-heading font-black uppercase tracking-wider text-brand-white">
                      Modifier l&apos;abonnement
                    </h3>
                    <p className="text-[11px] text-brand-white/50">
                      Membre : {editingSub.memberName} ({editingSub.phone})
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setEditingSub(null)}
                  className="p-1 rounded-lg text-brand-white/50 hover:text-brand-white hover:bg-brand-white/10"
                >
                  <X size={18} />
                </button>
              </div>

              {editError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <form onSubmit={handleEditSubmit} className="space-y-4">
                {/* Formule */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-brand-white/70">
                    Formule associée
                  </label>
                  <select
                    value={editPlanId}
                    onChange={(e) => setEditPlanId(e.target.value)}
                    required
                    className="w-full bg-[#0f172a] border border-brand-white/15 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold text-brand-white focus:border-brand-blue outline-none cursor-pointer"
                  >
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} [{p.type === "small_group" ? "Small Group" : p.type === "collective" ? "Collectif" : "Privé"}]
                      </option>
                    ))}
                  </select>
                </div>

                {/* Statut */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-brand-white/70">
                    Statut de l&apos;abonnement
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) =>
                      setEditStatus(
                        e.target.value as
                          | "active"
                          | "paused"
                          | "expired"
                          | "cancelled"
                      )
                    }
                    className="w-full bg-[#0f172a] border border-brand-white/15 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold text-brand-white focus:border-brand-blue outline-none cursor-pointer"
                  >
                    <option value="active">Actif (Accès autorisé)</option>
                    <option value="paused">Suspendu (Accès bloqué)</option>
                    <option value="expired">Expiré (Période échue)</option>
                    <option value="cancelled">Résilié (Annulé)</option>
                  </select>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-brand-white/70">
                      Date de début
                    </label>
                    <input
                      type="date"
                      required
                      value={editStartDate}
                      onChange={(e) => setEditStartDate(e.target.value)}
                      className="w-full bg-[#0f172a] border border-brand-white/15 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-brand-white focus:border-brand-blue outline-none cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-brand-white/70">
                      Date de fin
                    </label>
                    <input
                      type="date"
                      value={editEndDate}
                      onChange={(e) => setEditEndDate(e.target.value)}
                      className="w-full bg-[#0f172a] border border-brand-white/15 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-brand-white focus:border-brand-blue outline-none cursor-pointer"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-4 border-t border-brand-white/10">
                  <button
                    type="button"
                    onClick={() => setEditingSub(null)}
                    className="flex-1 py-2.5 px-4 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white text-xs font-bold uppercase tracking-wider rounded-sm transition-colors cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isEditSubmitting}
                    className="flex-1 py-2.5 px-4 bg-brand-blue hover:bg-brand-white text-brand-black font-heading font-bold text-xs uppercase tracking-wider rounded-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isEditSubmitting ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Mise à jour…
                      </>
                    ) : (
                      "Enregistrer les modifications"
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MODAL : HISTORIQUE DU MEMBRE
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatePresence>
        {historyMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setHistoryMember(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-xl bg-[#0b1322] border border-brand-white/15 rounded-2xl p-6 sm:p-8 shadow-2xl z-10 space-y-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-brand-white/10 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-brand-blue/15 text-brand-blue flex items-center justify-center border border-brand-blue/30">
                    <History size={16} />
                  </div>
                  <div>
                    <h3 className="text-lg font-heading font-black uppercase tracking-wider text-brand-white">
                      Historique des adhésions
                    </h3>
                    <p className="text-[11px] text-brand-white/50">
                      Membre : {historyMember.memberName}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setHistoryMember(null)}
                  className="p-1 rounded-lg text-brand-white/50 hover:text-brand-white hover:bg-brand-white/10"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3">
                {memberHistoryList.length === 0 ? (
                  <p className="text-xs text-brand-white/40 text-center py-6">
                    Aucun abonnement trouvé pour ce membre.
                  </p>
                ) : (
                  memberHistoryList.map((sub, index) => (
                    <div
                      key={sub.id}
                      className="p-4 rounded-xl bg-[#0f172a] border border-brand-white/5 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-heading font-bold text-sm uppercase text-brand-white">
                            {sub.planName}
                          </span>
                          {renderCategoryBadge(sub.planType, sub.planName)}
                        </div>
                        {renderStatusBadge(sub.status)}
                      </div>

                      <div className="flex items-center justify-between text-xs text-brand-white/60">
                        <span>
                          Du {formatDate(sub.started_at)} au {formatDate(sub.ends_at)}
                        </span>
                        <button
                          onClick={() => {
                            setHistoryMember(null);
                            openEditModal(sub);
                          }}
                          className="text-brand-blue hover:underline font-semibold"
                        >
                          Éditer
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-brand-white/10">
                <button
                  onClick={() => {
                    const uid = historyMember.userId;
                    setHistoryMember(null);
                    openAddModal(uid);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-blue/15 hover:bg-brand-blue text-brand-blue hover:text-brand-black text-xs font-bold uppercase tracking-wider transition-all border border-brand-blue/30 cursor-pointer"
                >
                  <Plus size={13} />
                  Ajouter un nouvel abonnement
                </button>

                <button
                  onClick={() => setHistoryMember(null)}
                  className="px-4 py-1.5 rounded-lg bg-brand-white/5 hover:bg-brand-white/10 text-brand-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
