"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users,
  Search,
  UserPlus,
  Edit2,
  Calendar,
  Layers,
  Shield,
  Phone,
  ArrowLeft,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronRight,
  UserCheck,
  UserX,
  CreditCard,
  History,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  type AdminMemberDetail,
  type AdminMembersPageData,
  type CreateMemberPayload,
  type UpdateMemberPayload,
  createMemberAdmin,
  updateMemberAdmin,
} from "@/lib/supabase/admin";
import { createMemberServerAction } from "@/app/(admin)/admin/membres/actions";
import { cn } from "@/lib/utils";

interface AdminMembersViewProps {
  initialData: AdminMembersPageData;
}

export default function AdminMembersView({
  initialData,
}: AdminMembersViewProps) {
  const router = useRouter();
  const supabase = createClient();

  const [members, setMembers] = useState<AdminMemberDetail[]>(initialData.members);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<
    "all" | "active_sub" | "no_sub" | "small_group" | "collective" | "private"
  >("all");

  // Formules actives
  const activePlans = useMemo(
    () => (initialData.plans || []).filter((p) => p.is_active !== false),
    [initialData.plans]
  );

  // Modale Création
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addFirstName, setAddFirstName] = useState("");
  const [addLastName, setAddLastName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addPlanId, setAddPlanId] = useState("");
  const [addStartDate, setAddStartDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [addStatus, setAddStatus] = useState<"active" | "paused" | "expired">("active");
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccessMessage, setAddSuccessMessage] = useState<string | null>(null);
  const [isAddSubmitting, setIsAddSubmitting] = useState(false);

  // Synchronisation automatique de la formule par défaut
  useEffect(() => {
    if (activePlans.length > 0 && (!addPlanId || !activePlans.some((p) => p.id === addPlanId))) {
      setAddPlanId(activePlans[0].id);
    }
  }, [activePlans, addPlanId]);

  // Modale Édition Profil
  const [editingMember, setEditingMember] = useState<AdminMemberDetail | null>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  // Fiche Membre Détaillée (Drawer / Modale)
  const [selectedMember, setSelectedMember] = useState<AdminMemberDetail | null>(null);

  // KPIs
  const stats = useMemo(() => {
    const total = members.length;
    const withActiveSubscription = members.filter((m) => !!m.activeSubscription).length;
    const withoutSubscription = members.filter((m) => !m.activeSubscription).length;
    const smallGroupMembers = members.filter(
      (m) => m.activeSubscription?.planType === "small_group"
    ).length;
    const collectiveMembers = members.filter(
      (m) => m.activeSubscription?.planType === "collective"
    ).length;
    const privateMembers = members.filter(
      (m) => m.activeSubscription?.planType === "private"
    ).length;

    return {
      total,
      withActiveSubscription,
      withoutSubscription,
      smallGroupMembers,
      collectiveMembers,
      privateMembers,
    };
  }, [members]);

  // Filtrage
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      // Catégorie
      if (filterCategory === "active_sub" && !m.activeSubscription) return false;
      if (filterCategory === "no_sub" && m.activeSubscription) return false;
      if (
        filterCategory === "small_group" &&
        m.activeSubscription?.planType !== "small_group"
      ) {
        return false;
      }
      if (
        filterCategory === "collective" &&
        m.activeSubscription?.planType !== "collective"
      ) {
        return false;
      }
      if (
        filterCategory === "private" &&
        m.activeSubscription?.planType !== "private"
      ) {
        return false;
      }

      // Recherche texte
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = m.fullName.toLowerCase().includes(q);
        const matchesFirst = m.firstName.toLowerCase().includes(q);
        const matchesLast = m.lastName.toLowerCase().includes(q);
        const matchesPhone = (m.phone || "").toLowerCase().includes(q);
        const matchesPlan = (m.activeSubscription?.planName || "").toLowerCase().includes(q);

        if (!matchesName && !matchesFirst && !matchesLast && !matchesPhone && !matchesPlan) {
          return false;
        }
      }

      return true;
    });
  }, [members, filterCategory, searchTerm]);

  // Création membre
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    setIsAddSubmitting(true);

    if (!addFirstName.trim() || !addLastName.trim()) {
      setAddError("Le prénom et le nom sont obligatoires.");
      setIsAddSubmitting(false);
      return;
    }

    if (!addEmail.trim()) {
      setAddError("L'adresse email est obligatoire.");
      setIsAddSubmitting(false);
      return;
    }

    if (!addPhone.trim()) {
      setAddError("Le numéro de téléphone est obligatoire.");
      setIsAddSubmitting(false);
      return;
    }

    const selectedPlanId = addPlanId || activePlans[0]?.id;
    if (!selectedPlanId) {
      setAddError("Veuillez sélectionner une formule d'abonnement.");
      setIsAddSubmitting(false);
      return;
    }

    const payload: CreateMemberPayload = {
      firstName: addFirstName.trim(),
      lastName: addLastName.trim(),
      email: addEmail.trim(),
      phone: addPhone.trim(),
      planId: selectedPlanId,
      subscriptionStartDate: addStartDate ? new Date(`${addStartDate}T00:00:00Z`).toISOString() : undefined,
      subscriptionStatus: addStatus,
    };

    // Appel de la Server Action sécurisée (orchestration Auth -> Profile -> Subscription)
    const res = await createMemberServerAction(payload);

    if (!res.success) {
      setAddError(res.error || "Erreur lors de la création du membre.");
      setIsAddSubmitting(false);
      return;
    }

    const newMemberId = res.data?.id || `temp-${Date.now()}`;
    const chosenPlan = initialData.plans.find((p) => p.id === selectedPlanId);

    const newSubItem = chosenPlan
      ? {
          id: res.data?.subscriptionId || `sub-${Date.now()}`,
          planId: chosenPlan.id,
          planName: chosenPlan.name,
          planType: chosenPlan.type,
          status: addStatus,
          started_at: payload.subscriptionStartDate || new Date().toISOString(),
          ends_at: null,
          created_at: new Date().toISOString(),
        }
      : null;

    const newMember: AdminMemberDetail = {
      id: newMemberId,
      firstName: payload.firstName,
      lastName: payload.lastName,
      fullName: `${payload.lastName} ${payload.firstName}`.trim(),
      phone: payload.phone || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      activeSubscription: addStatus === "active" ? newSubItem : null,
      subscriptions: newSubItem ? [newSubItem] : [],
      bookings: [],
      bookingsCount: 0,
    };

    setMembers((prev) => [newMember, ...prev]);
    setAddSuccessMessage(
      `Membre ${payload.firstName} ${payload.lastName} créé avec succès ! Un email d'invitation avec un lien pour définir son mot de passe a été envoyé à ${payload.email}.`
    );
    setIsAddSubmitting(false);
    setIsAddModalOpen(false);
    setAddFirstName("");
    setAddLastName("");
    setAddEmail("");
    setAddPhone("");
    setAddPlanId(activePlans[0]?.id || "");
    setAddStartDate(new Date().toISOString().split("T")[0]);
    setAddStatus("active");
    router.refresh();
  };

  // Ouverture modale édition
  const openEditModal = (m: AdminMemberDetail) => {
    setEditingMember(m);
    setEditFirstName(m.firstName);
    setEditLastName(m.lastName);
    setEditPhone(m.phone || "");
    setEditError(null);
  };

  // Édition profil membre
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    setEditError(null);
    setIsEditSubmitting(true);

    const payload: UpdateMemberPayload = {
      firstName: editFirstName.trim(),
      lastName: editLastName.trim(),
      phone: editPhone.trim() || undefined,
    };

    const res = await updateMemberAdmin(supabase, editingMember.id, payload);

    if (!res.success) {
      setEditError(res.error || "Erreur lors de la modification du membre.");
      setIsEditSubmitting(false);
      return;
    }

    const updatedFullName = `${payload.lastName || ""} ${payload.firstName || ""}`.trim();

    setMembers((prev) =>
      prev.map((m) =>
        m.id === editingMember.id
          ? {
              ...m,
              firstName: payload.firstName || m.firstName,
              lastName: payload.lastName || m.lastName,
              fullName: updatedFullName || m.fullName,
              phone: payload.phone ?? m.phone,
              updated_at: new Date().toISOString(),
            }
          : m
      )
    );

    if (selectedMember && selectedMember.id === editingMember.id) {
      setSelectedMember((prev) =>
        prev
          ? {
              ...prev,
              firstName: payload.firstName || prev.firstName,
              lastName: payload.lastName || prev.lastName,
              fullName: updatedFullName || prev.fullName,
              phone: payload.phone ?? prev.phone,
            }
          : null
      );
    }

    setIsEditSubmitting(false);
    setEditingMember(null);
    router.refresh();
  };

  // Rendu Badges de Formule
  const renderPlanBadge = (sub?: AdminMemberDetail["activeSubscription"]) => {
    if (!sub) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-brand-white/5 text-brand-white/50 border border-brand-white/10">
          <UserX size={11} /> Sans abonnement
        </span>
      );
    }

    switch (sub.planType) {
      case "small_group":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-brand-blue/15 text-brand-blue border border-brand-blue/30">
            <Users size={11} /> {sub.planName}
          </span>
        );
      case "collective":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <Layers size={11} /> {sub.planName}
          </span>
        );
      case "private":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Shield size={11} /> {sub.planName}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-brand-white/10 text-brand-white/80">
            {sub.planName}
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 font-sans">
      {/* HEADER */}
      <div className="border-b border-brand-white/10 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-blue/10 border border-brand-blue/30 flex items-center justify-center text-brand-blue">
              <Users size={22} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-heading font-black uppercase tracking-wider text-brand-white">
                Gestion des <span className="text-brand-blue">Membres</span>
              </h1>
              <p className="text-xs text-brand-white/60 mt-0.5">
                Annuaire des membres, fiches personnelles et suivi des abonnements
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
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
            <CreditCard size={14} /> Abonnements
          </Link>
          <button
            onClick={() => {
              setAddFirstName("");
              setAddLastName("");
              setAddPhone("");
              setAddError(null);
              setIsAddModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-blue hover:bg-brand-blue-hover text-brand-black text-xs font-black rounded-xl uppercase tracking-wider transition-colors cursor-pointer shadow-lg shadow-brand-blue/20"
          >
            <UserPlus size={15} /> Nouveau Membre
          </button>
        </div>
      </div>

      {/* KPI STATS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3.5 sm:gap-4">
        {/* Total Membres */}
        <div className="bg-[#0f172a]/90 border border-brand-white/10 rounded-2xl p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden shadow-lg shadow-black/20">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-brand-white/50">
              Total Membres
            </span>
            <div className="w-7 h-7 rounded-lg bg-brand-white/5 border border-brand-white/10 flex items-center justify-center text-brand-white/70">
              <Users size={14} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-heading font-black text-brand-white">
              {stats.total}
            </span>
            <span className="text-[11px] text-brand-white/50 block mt-0.5">
              Profils enregistrés
            </span>
          </div>
        </div>

        {/* Abonnés Actifs */}
        <div className="bg-[#0f172a]/90 border border-emerald-500/20 rounded-2xl p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden shadow-lg shadow-black/20">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
              Abonnés
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <UserCheck size={14} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-heading font-black text-emerald-400">
              {stats.withActiveSubscription}
            </span>
            <span className="text-[11px] text-brand-white/50 block mt-0.5">
              Formule en cours
            </span>
          </div>
        </div>

        {/* Sans Formule */}
        <div className="bg-[#0f172a]/90 border border-brand-white/10 rounded-2xl p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden shadow-lg shadow-black/20">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-brand-white/50">
              Sans Formule
            </span>
            <div className="w-7 h-7 rounded-lg bg-brand-white/5 border border-brand-white/10 flex items-center justify-center text-brand-white/40">
              <UserX size={14} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-heading font-black text-brand-white/60">
              {stats.withoutSubscription}
            </span>
            <span className="text-[11px] text-brand-white/50 block mt-0.5">
              En attente d&apos;attribution
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
              {stats.smallGroupMembers}
            </span>
            <span className="text-[11px] text-brand-white/50 block mt-0.5">
              Membres Small Group
            </span>
          </div>
        </div>

        {/* Collectif */}
        <div className="bg-[#0f172a]/90 border border-emerald-500/20 rounded-2xl p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden shadow-lg shadow-black/20">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
              Collectif
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Layers size={14} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-heading font-black text-emerald-300">
              {stats.collectiveMembers}
            </span>
            <span className="text-[11px] text-brand-white/50 block mt-0.5">
              Membres Collectifs
            </span>
          </div>
        </div>

        {/* Cours Privés */}
        <div className="bg-[#0f172a]/90 border border-amber-500/20 rounded-2xl p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden shadow-lg shadow-black/20">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
              Privés
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Shield size={14} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-heading font-black text-amber-400">
              {stats.privateMembers}
            </span>
            <span className="text-[11px] text-brand-white/50 block mt-0.5">
              Membres Cours Privés
            </span>
          </div>
        </div>
      </div>

      {/* Notification de succès d'invitation */}
      {addSuccessMessage && (
        <div className="bg-[#22c55e]/15 border border-[#22c55e]/30 rounded-2xl p-4 flex items-start justify-between gap-3 text-xs sm:text-sm text-[#22c55e] shadow-lg shadow-[#22c55e]/10">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={20} className="shrink-0 mt-0.5" />
            <span className="font-semibold leading-relaxed">{addSuccessMessage}</span>
          </div>
          <button
            onClick={() => setAddSuccessMessage(null)}
            className="p-1 text-[#22c55e]/70 hover:text-[#22c55e] rounded-lg transition-colors cursor-pointer"
            title="Fermer"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* FILTRES ET RECHERCHE */}
      <div className="bg-[#0f172a]/80 border border-brand-white/10 rounded-2xl p-4 sm:p-5 space-y-4">
        {/* Catégories Onglets */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilterCategory("all")}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer",
              filterCategory === "all"
                ? "bg-brand-white text-brand-black shadow-md shadow-brand-white/10"
                : "bg-brand-white/5 text-brand-white/60 hover:text-brand-white hover:bg-brand-white/10"
            )}
          >
            Tous ({members.length})
          </button>
          <button
            onClick={() => setFilterCategory("active_sub")}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer",
              filterCategory === "active_sub"
                ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
            )}
          >
            <UserCheck size={13} /> Abonnés actifs ({stats.withActiveSubscription})
          </button>
          <button
            onClick={() => setFilterCategory("no_sub")}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer",
              filterCategory === "no_sub"
                ? "bg-brand-white/20 text-brand-white shadow-md"
                : "bg-brand-white/5 text-brand-white/50 hover:bg-brand-white/10"
            )}
          >
            <UserX size={13} /> Sans formule ({stats.withoutSubscription})
          </button>
          <button
            onClick={() => setFilterCategory("small_group")}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer",
              filterCategory === "small_group"
                ? "bg-brand-blue text-white shadow-md shadow-brand-blue/20"
                : "bg-brand-blue/10 text-brand-blue hover:bg-brand-blue/20"
            )}
          >
            <Users size={13} /> Small Group ({stats.smallGroupMembers})
          </button>
          <button
            onClick={() => setFilterCategory("collective")}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer",
              filterCategory === "collective"
                ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
            )}
          >
            <Layers size={13} /> Collectifs ({stats.collectiveMembers})
          </button>
          <button
            onClick={() => setFilterCategory("private")}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer",
              filterCategory === "private"
                ? "bg-amber-500 text-brand-black shadow-md shadow-amber-500/20 font-black"
                : "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
            )}
          >
            <Shield size={13} /> Cours Privés ({stats.privateMembers})
          </button>
        </div>

        {/* Barre de recherche */}
        <div className="pt-2 border-t border-brand-white/5">
          <div className="relative w-full">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-white/40"
            />
            <input
              type="text"
              placeholder="Rechercher un membre par nom, prénom, téléphone ou formule..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#020617] border border-brand-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs font-medium text-brand-white placeholder:text-brand-white/30 focus:border-brand-blue outline-none transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-white/40 hover:text-brand-white cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* LISTE DES MEMBRES */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-white/50">
            {filteredMembers.length} membre{filteredMembers.length > 1 ? "s" : ""} trouvé{filteredMembers.length > 1 ? "s" : ""}
          </span>
        </div>

        {filteredMembers.length === 0 ? (
          <div className="bg-[#0f172a]/60 border border-brand-white/10 border-dashed rounded-2xl p-12 text-center space-y-3">
            <Users size={32} className="mx-auto text-brand-white/30" />
            <p className="text-sm font-semibold text-brand-white/70">
              Aucun membre ne correspond à vos critères de recherche.
            </p>
            <button
              onClick={() => {
                setSearchTerm("");
                setFilterCategory("all");
              }}
              className="text-xs font-bold text-brand-blue hover:underline uppercase tracking-wider cursor-pointer"
            >
              Réinitialiser les filtres
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMembers.map((member) => {
              const initials =
                `${(member.firstName[0] || "").toUpperCase()}${(member.lastName[0] || "").toUpperCase()}` || "MB";

              return (
                <div
                  key={member.id}
                  className="bg-[#0f172a] border border-brand-white/10 hover:border-brand-blue/40 rounded-2xl p-5 transition-all relative overflow-hidden flex flex-col justify-between gap-4 shadow-lg shadow-black/20"
                >
                  {/* Top Bar: Avatar + Name + Phone */}
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-brand-blue/15 border border-brand-blue/30 flex items-center justify-center text-brand-blue font-heading font-black text-sm shrink-0">
                          {initials}
                        </div>
                        <div className="space-y-0.5">
                          <h3 className="font-heading font-black text-base text-brand-white uppercase tracking-wider leading-tight">
                            {member.fullName}
                          </h3>
                          {member.phone ? (
                            <div className="flex items-center gap-1.5 text-xs text-brand-white/50">
                              <Phone size={11} className="text-brand-white/40" />
                              <span>{member.phone}</span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-brand-white/30 italic block">
                              Aucun téléphone renseigné
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => openEditModal(member)}
                        title="Modifier les coordonnées"
                        className="p-2 rounded-xl bg-brand-white/5 hover:bg-brand-white/10 text-brand-white/50 hover:text-brand-white transition-colors cursor-pointer shrink-0"
                      >
                        <Edit2 size={13} />
                      </button>
                    </div>

                    {/* Statut & Formule */}
                    <div className="pt-2 border-t border-brand-white/5 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] uppercase font-bold text-brand-white/40">
                          Formule Active
                        </span>
                        {renderPlanBadge(member.activeSubscription)}
                      </div>

                      {member.activeSubscription?.ends_at && (
                        <div className="flex items-center justify-between text-[11px] text-brand-white/50">
                          <span>Échéance :</span>
                          <span className="font-mono text-brand-white/70">
                            {new Date(member.activeSubscription.ends_at).toLocaleDateString("fr-FR")}
                          </span>
                        </div>
                      )}

                      {member.activeSubscription?.private_sessions_quota !== null &&
                        member.activeSubscription?.private_sessions_quota !== undefined && (
                          <div className="flex items-center justify-between text-[11px] text-amber-300">
                            <span className="flex items-center gap-1">
                              <Sparkles size={11} /> Quota séances privées :
                            </span>
                            <span className="font-bold">
                              {member.activeSubscription.private_sessions_quota} séances
                            </span>
                          </div>
                        )}
                    </div>
                  </div>

                  {/* Bottom: Bookings Count + Actions */}
                  <div className="pt-3 border-t border-brand-white/10 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-brand-white/40">
                      {member.bookingsCount} réservation{member.bookingsCount > 1 ? "s" : ""}
                    </span>

                    <button
                      onClick={() => setSelectedMember(member)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-brand-white/5 hover:bg-brand-blue/15 text-brand-white hover:text-brand-blue border border-brand-white/10 hover:border-brand-blue/30 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                    >
                      <span>Fiche Membre</span>
                      <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODALE D'AJOUT D'UN MEMBRE */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0f172a] border border-brand-white/15 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl shadow-black/80">
            {/* Header */}
            <div className="px-6 py-5 border-b border-brand-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-brand-blue/15 border border-brand-blue/30 flex items-center justify-center text-brand-blue">
                  <UserPlus size={16} />
                </div>
                <div>
                  <h3 className="font-heading font-black text-lg uppercase tracking-wider text-brand-white">
                    Ajouter un Membre
                  </h3>
                  <span className="text-xs text-brand-white/50">
                    Création d&apos;un nouveau profil dans l&apos;annuaire
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-brand-white/40 hover:text-brand-white transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Formulaire */}
            <form onSubmit={handleAddSubmit} className="p-6 space-y-5">
              {addError && (
                <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{addError}</span>
                </div>
              )}

              {/* SECTION 1 : INFORMATIONS PERSONNELLES */}
              <div className="space-y-3.5">
                <div className="flex items-center gap-2 pb-1 border-b border-brand-white/10 text-brand-white/70 text-[11px] font-bold uppercase tracking-wider">
                  <UserPlus size={13} className="text-brand-blue" />
                  <span>1. Informations Personnelles</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Prénom */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-brand-white/70">
                      Prénom <span className="text-brand-blue">*</span>
                    </label>
                    <input
                      type="text"
                      value={addFirstName}
                      onChange={(e) => setAddFirstName(e.target.value)}
                      required
                      placeholder="Jean"
                      className="w-full bg-[#020617] border border-brand-white/15 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-brand-white focus:border-brand-blue outline-none transition-colors"
                    />
                  </div>

                  {/* Nom */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-brand-white/70">
                      Nom <span className="text-brand-blue">*</span>
                    </label>
                    <input
                      type="text"
                      value={addLastName}
                      onChange={(e) => setAddLastName(e.target.value)}
                      required
                      placeholder="Dupont"
                      className="w-full bg-[#020617] border border-brand-white/15 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-brand-white focus:border-brand-blue outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-brand-white/70">
                      Email <span className="text-brand-blue">*</span>
                    </label>
                    <input
                      type="email"
                      value={addEmail}
                      onChange={(e) => setAddEmail(e.target.value)}
                      required
                      placeholder="jean.dupont@exemple.com"
                      className="w-full bg-[#020617] border border-brand-white/15 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-brand-white focus:border-brand-blue outline-none transition-colors"
                    />
                  </div>

                  {/* Téléphone */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-brand-white/70">
                      Téléphone <span className="text-brand-blue">*</span>
                    </label>
                    <input
                      type="tel"
                      value={addPhone}
                      onChange={(e) => setAddPhone(e.target.value)}
                      required
                      placeholder="06 12 34 56 78"
                      className="w-full bg-[#020617] border border-brand-white/15 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-brand-white focus:border-brand-blue outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2 : FORMULE & ABONNEMENT */}
              <div className="space-y-3.5 pt-2">
                <div className="flex items-center gap-2 pb-1 border-b border-brand-white/10 text-brand-white/70 text-[11px] font-bold uppercase tracking-wider">
                  <CreditCard size={13} className="text-brand-blue" />
                  <span>2. Formule & Abonnement</span>
                </div>

                {/* Formule */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-brand-white/70">
                    Formule attribuée <span className="text-brand-blue">*</span>
                  </label>
                  <select
                    value={addPlanId || activePlans[0]?.id || ""}
                    onChange={(e) => setAddPlanId(e.target.value)}
                    required
                    className="w-full bg-[#020617] border border-brand-white/15 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-brand-white focus:border-brand-blue outline-none transition-colors"
                  >
                    {activePlans.length === 0 ? (
                      <option value="">Aucune formule active disponible</option>
                    ) : (
                      activePlans.map((p) => {
                        const priceFormatted = typeof p.price_cents === "number" ? `${(p.price_cents / 100).toFixed(0)}€` : "";
                        return (
                          <option key={p.id} value={p.id}>
                            {p.name}{priceFormatted ? ` — ${priceFormatted}` : ""}
                          </option>
                        );
                      })
                    )}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Date de début */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-brand-white/70">
                      Date de début <span className="text-brand-blue">*</span>
                    </label>
                    <input
                      type="date"
                      value={addStartDate}
                      onChange={(e) => setAddStartDate(e.target.value)}
                      required
                      className="w-full bg-[#020617] border border-brand-white/15 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-brand-white focus:border-brand-blue outline-none transition-colors"
                    />
                  </div>

                  {/* Statut */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-brand-white/70">
                      Statut initial <span className="text-brand-blue">*</span>
                    </label>
                    <select
                      value={addStatus}
                      onChange={(e) =>
                        setAddStatus(e.target.value as "active" | "paused" | "expired")
                      }
                      className="w-full bg-[#020617] border border-brand-white/15 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-brand-white focus:border-brand-blue outline-none transition-colors"
                    >
                      <option value="active">Actif</option>
                      <option value="paused">Suspendu</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-brand-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={isAddSubmitting}
                  className="px-4 py-2.5 rounded-xl border border-brand-white/10 text-brand-white/70 hover:text-brand-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isAddSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-blue hover:bg-brand-blue-hover text-brand-black text-xs font-black uppercase tracking-wider transition-colors cursor-pointer shadow-lg shadow-brand-blue/20 disabled:opacity-50"
                >
                  {isAddSubmitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Création orchestrée...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} />
                      <span>Créer le membre & Activer</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE D'ÉDITION D'UN MEMBRE */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0f172a] border border-brand-white/15 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl shadow-black/80">
            {/* Header */}
            <div className="px-6 py-5 border-b border-brand-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-brand-blue/15 border border-brand-blue/30 flex items-center justify-center text-brand-blue">
                  <Edit2 size={16} />
                </div>
                <div>
                  <h3 className="font-heading font-black text-lg uppercase tracking-wider text-brand-white">
                    Modifier les Coordonnées
                  </h3>
                  <span className="text-xs text-brand-white/50">
                    ID : {editingMember.id.slice(0, 8)}...
                  </span>
                </div>
              </div>
              <button
                onClick={() => setEditingMember(null)}
                className="text-brand-white/40 hover:text-brand-white transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Formulaire */}
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              {editError && (
                <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Prénom */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-brand-white/70">
                    Prénom <span className="text-brand-blue">*</span>
                  </label>
                  <input
                    type="text"
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    required
                    className="w-full bg-[#020617] border border-brand-white/15 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-brand-white focus:border-brand-blue outline-none transition-colors"
                  />
                </div>

                {/* Nom */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-brand-white/70">
                    Nom <span className="text-brand-blue">*</span>
                  </label>
                  <input
                    type="text"
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    required
                    className="w-full bg-[#020617] border border-brand-white/15 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-brand-white focus:border-brand-blue outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Téléphone */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-brand-white/70">
                  Numéro de téléphone
                </label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="06 12 34 56 78"
                  className="w-full bg-[#020617] border border-brand-white/15 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-brand-white focus:border-brand-blue outline-none transition-colors"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-brand-white/10">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  disabled={isEditSubmitting}
                  className="px-4 py-2.5 rounded-xl border border-brand-white/10 text-brand-white/70 hover:text-brand-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isEditSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-blue hover:bg-brand-blue-hover text-brand-black text-xs font-black uppercase tracking-wider transition-colors cursor-pointer shadow-lg shadow-brand-blue/20 disabled:opacity-50"
                >
                  {isEditSubmitting ? (
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

      {/* FICHE MEMBRE COMPLÈTE (MODALE LARGE) */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0f172a] border border-brand-white/15 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl shadow-black/80 space-y-6 p-6">
            {/* Header Fiche */}
            <div className="flex items-start justify-between border-b border-brand-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-brand-blue/15 border border-brand-blue/30 flex items-center justify-center text-brand-blue font-heading font-black text-base shrink-0">
                  {`${(selectedMember.firstName[0] || "").toUpperCase()}${(selectedMember.lastName[0] || "").toUpperCase()}` || "MB"}
                </div>
                <div>
                  <h2 className="text-xl font-heading font-black text-brand-white uppercase tracking-wider">
                    {selectedMember.fullName}
                  </h2>
                  <div className="flex items-center gap-3 text-xs text-brand-white/50 mt-0.5">
                    {selectedMember.phone && (
                      <span className="flex items-center gap-1">
                        <Phone size={12} /> {selectedMember.phone}
                      </span>
                    )}
                    {selectedMember.created_at && (
                      <span className="flex items-center gap-1">
                        <Calendar size={12} /> Inscrit le{" "}
                        {new Date(selectedMember.created_at).toLocaleDateString("fr-FR")}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedMember(null)}
                className="text-brand-white/40 hover:text-brand-white transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Formule Active En Vedette */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-white/50">
                Abonnement Actuel
              </span>

              {selectedMember.activeSubscription ? (
                <div className="bg-[#020617] border border-emerald-500/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-heading font-black text-base text-brand-white uppercase">
                        {selectedMember.activeSubscription.planName}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                        Actif
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-brand-white/60">
                      <span>
                        Début :{" "}
                        {new Date(selectedMember.activeSubscription.started_at).toLocaleDateString("fr-FR")}
                      </span>
                      {selectedMember.activeSubscription.ends_at && (
                        <span>
                          Fin :{" "}
                          {new Date(selectedMember.activeSubscription.ends_at).toLocaleDateString("fr-FR")}
                        </span>
                      )}
                    </div>

                    {selectedMember.activeSubscription.private_sessions_quota !== null &&
                      selectedMember.activeSubscription.private_sessions_quota !== undefined && (
                        <div className="text-xs text-amber-300 font-semibold flex items-center gap-1 pt-1">
                          <Sparkles size={13} /> Quota restant :{" "}
                          <span className="font-black text-sm">
                            {selectedMember.activeSubscription.private_sessions_quota} séances
                          </span>
                        </div>
                      )}
                  </div>

                  <Link
                    href="/admin/abonnements"
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-brand-blue/15 hover:bg-brand-blue/25 text-brand-blue border border-brand-blue/30 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shrink-0"
                  >
                    <CreditCard size={13} /> Gérer
                  </Link>
                </div>
              ) : (
                <div className="bg-[#020617] border border-brand-white/10 rounded-xl p-4 flex items-center justify-between gap-3">
                  <span className="text-xs text-brand-white/50">
                    Aucun abonnement actif pour ce membre.
                  </span>
                  <Link
                    href="/admin/abonnements"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-blue hover:bg-brand-blue-hover text-brand-black rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shrink-0"
                  >
                    <CreditCard size={13} /> Attribuer
                  </Link>
                </div>
              )}
            </div>

            {/* Historique des Abonnements */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-white/50 flex items-center gap-1.5">
                <History size={13} /> Historique des Abonnements ({selectedMember.subscriptions.length})
              </span>

              {selectedMember.subscriptions.length === 0 ? (
                <p className="text-xs text-brand-white/40 italic">
                  Aucun historique d&apos;abonnement.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {selectedMember.subscriptions.map((sub) => (
                    <div
                      key={sub.id}
                      className="bg-[#020617]/60 border border-brand-white/5 rounded-xl p-3 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <span className="font-semibold text-brand-white block">
                          {sub.planName}
                        </span>
                        <span className="text-[11px] text-brand-white/40">
                          Du {new Date(sub.started_at).toLocaleDateString("fr-FR")}{" "}
                          {sub.ends_at
                            ? `au ${new Date(sub.ends_at).toLocaleDateString("fr-FR")}`
                            : "(sans fin)"}
                        </span>
                      </div>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                          sub.status === "active" && "bg-emerald-500/15 text-emerald-400",
                          (sub.status === "paused" || (sub.status as string) === "suspended") &&
                            "bg-amber-500/15 text-amber-400",
                          sub.status === "expired" && "bg-brand-white/10 text-brand-white/40",
                          sub.status === "cancelled" && "bg-red-500/15 text-red-400"
                        )}
                      >
                        {sub.status === "active"
                          ? "Actif"
                          : sub.status === "paused" || (sub.status as string) === "suspended"
                          ? "Suspendu"
                          : sub.status === "cancelled"
                          ? "Résilié"
                          : "Expiré"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Historique des Réservations */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-white/50 flex items-center gap-1.5">
                <Clock size={13} /> Historique des Réservations ({selectedMember.bookings.length})
              </span>

              {selectedMember.bookings.length === 0 ? (
                <p className="text-xs text-brand-white/40 italic">
                  Aucune réservation enregistrée.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {selectedMember.bookings.map((b) => (
                    <div
                      key={b.id}
                      className="bg-[#020617]/60 border border-brand-white/5 rounded-xl p-3 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <span className="font-semibold text-brand-white block">
                          {b.discipline} • {b.sessionType === "small_group" ? "Small Group" : "Collectif"}
                        </span>
                        <span className="text-[11px] text-brand-white/40">
                          {new Date(b.starts_at).toLocaleDateString("fr-FR", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-brand-blue/15 text-brand-blue">
                        {b.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-brand-white/10 flex justify-end">
              <button
                onClick={() => setSelectedMember(null)}
                className="px-4 py-2 bg-brand-white/10 hover:bg-brand-white/20 text-brand-white text-xs font-bold rounded-xl uppercase tracking-wider transition-colors cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
