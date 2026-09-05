"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Phone,
  User,
  CreditCard,
  AlertTriangle,
  Loader2,
  RefreshCw,
  MessageSquare,
  ShieldCheck,
  Check,
  X,
  Pencil,
  Sparkles,
  Flame,
  Award,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  type MembershipRequestItem,
  type MembershipPlanOption,
  getAdminMembershipRequestsList,
  getAvailablePlansForMembership,
} from "@/lib/supabase/membership-requests";
import {
  approveMembershipRequestServerAction,
  rejectMembershipRequestServerAction,
  updateMembershipRequestServerAction,
} from "@/app/(admin)/admin/adhesions/actions";
import { cn } from "@/lib/utils";

export default function AdminMembershipRequestsView() {
  const [supabase] = useState(() => createClient());
  const [requests, setRequests] = useState<MembershipRequestItem[]>([]);
  const [availablePlans, setAvailablePlans] = useState<MembershipPlanOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [searchTerm, setSearchTerm] = useState("");

  // Modales d'action
  const [approvingReq, setApprovingReq] = useState<MembershipRequestItem | null>(null);
  const [rejectingReq, setRejectingReq] = useState<MembershipRequestItem | null>(null);
  const [editingReq, setEditingReq] = useState<MembershipRequestItem | null>(null);
  const [editPlanId, setEditPlanId] = useState("");
  const [editCommitmentType, setEditCommitmentType] = useState<"monthly" | "annual">("monthly");
  const [editAdminNotes, setEditAdminNotes] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const [list, plans] = await Promise.all([
        getAdminMembershipRequestsList(supabase),
        getAvailablePlansForMembership(supabase),
      ]);
      setRequests(list);
      setAvailablePlans(plans);
    } catch (err) {
      console.error("[AdminMembershipRequestsView] Erreur chargement :", err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleApprove = async () => {
    if (!approvingReq) return;
    setActionLoading(true);

    try {
      const res = await approveMembershipRequestServerAction(approvingReq.id, adminNotes);

      if (res.success) {
        setToastMessage({
          type: "success",
          text: `Demande de ${approvingReq.profile?.first_name || "Membre"} validée. Abonnement actif créé.`,
        });
        setApprovingReq(null);
        setAdminNotes("");
        await fetchRequests();
      } else {
        setToastMessage({
          type: "error",
          text: res.error || "Impossible de valider la demande.",
        });
      }
    } catch (err) {
      console.error("[handleApprove] Erreur validation adhésion :", err);
      setToastMessage({
        type: "error",
        text: (err as Error)?.message || "Une erreur inattendue est survenue lors de la validation.",
      });
    } finally {
      setActionLoading(false);
      setTimeout(() => {
        setToastMessage((c) => (c?.type === "success" ? null : c));
      }, 4000);
    }
  };

  const handleReject = async () => {
    if (!rejectingReq) return;
    setActionLoading(true);

    try {
      const res = await rejectMembershipRequestServerAction(rejectingReq.id, adminNotes);

      if (res.success) {
        setToastMessage({
          type: "success",
          text: `Demande de ${rejectingReq.profile?.first_name || "Membre"} refusée.`,
        });
        setRejectingReq(null);
        setAdminNotes("");
        await fetchRequests();
      } else {
        setToastMessage({
          type: "error",
          text: res.error || "Impossible de refuser la demande.",
        });
      }
    } catch (err) {
      console.error("[handleReject] Erreur refus adhésion :", err);
      setToastMessage({
        type: "error",
        text: (err as Error)?.message || "Une erreur inattendue est survenue lors du refus.",
      });
    } finally {
      setActionLoading(false);
      setTimeout(() => {
        setToastMessage((c) => (c?.type === "success" ? null : c));
      }, 4000);
    }
  };

  const handleOpenEdit = (req: MembershipRequestItem) => {
    setEditingReq(req);
    setEditPlanId(req.plan_id);
    setEditCommitmentType(req.commitment_type || "monthly");
    setEditAdminNotes(req.admin_notes || "");
  };

  const handleUpdate = async () => {
    if (!editingReq || !editPlanId) return;
    setActionLoading(true);

    try {
      const res = await updateMembershipRequestServerAction(editingReq.id, {
        planId: editPlanId,
        commitmentType: editCommitmentType,
        adminNotes: editAdminNotes,
      });

      if (res.success) {
        setToastMessage({
          type: "success",
          text: res.message || `Demande de ${editingReq.profile?.first_name || "Membre"} modifiée avec succès.`,
        });
        setEditingReq(null);
        await fetchRequests();
      } else {
        setToastMessage({
          type: "error",
          text: res.error || "Impossible de modifier la demande d'adhésion.",
        });
      }
    } catch (err) {
      console.error("[handleUpdate] Erreur modification adhésion :", err);
      setToastMessage({
        type: "error",
        text: (err as Error)?.message || "Une erreur inattendue est survenue lors de la modification.",
      });
    } finally {
      setActionLoading(false);
      setTimeout(() => {
        setToastMessage((c) => (c?.type === "success" ? null : c));
      }, 4000);
    }
  };

  // Filtrage
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      // Filtre statut
      if (filterStatus !== "all" && r.status !== filterStatus) {
        return false;
      }

      // Recherche texte
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const fullName = `${r.profile?.first_name || ""} ${r.profile?.last_name || ""}`.toLowerCase();
        const planName = (r.plan?.name || "").toLowerCase();
        const phone = (r.profile?.phone || "").toLowerCase();

        return fullName.includes(query) || planName.includes(query) || phone.includes(query);
      }

      return true;
    });
  }, [requests, filterStatus, searchTerm]);

  // Statistiques rapides
  const stats = useMemo(() => {
    const pendingCount = requests.filter((r) => r.status === "pending").length;
    const approvedCount = requests.filter((r) => r.status === "approved").length;
    const rejectedCount = requests.filter((r) => r.status === "rejected").length;
    return { pendingCount, approvedCount, rejectedCount, total: requests.length };
  }, [requests]);

  const getPlanBadgeClasses = (type?: string) => {
    switch (type) {
      case "private":
        return "bg-[#00d8ff]/15 text-[#00d8ff] border-[#00d8ff]/30";
      case "small_group":
        return "bg-amber-500/15 text-amber-300 border-amber-500/30";
      default:
        return "bg-blue-500/15 text-blue-300 border-blue-500/30";
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          EN-TÊTE
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-brand-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users size={24} className="text-[#00d8ff]" />
            <h1 className="text-2xl sm:text-3xl font-heading font-black uppercase tracking-wider text-brand-white">
              Validation des Adhésions
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-brand-white/60">
            Examinez et activez les demandes d&apos;adhésion des nouveaux membres pour déverrouiller leurs réservations.
          </p>
        </div>

        <button
          onClick={fetchRequests}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white text-xs font-heading font-bold uppercase tracking-wider rounded-lg border border-brand-white/10 transition-all cursor-pointer disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw size={14} className={cn(isLoading && "animate-spin")} />
          Actualiser
        </button>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          TOAST FEEDBACK
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn(
              "p-4 rounded-xl border flex items-center gap-3 text-xs font-medium shadow-xl",
              toastMessage.type === "success"
                ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-300"
                : "bg-red-950/80 border-red-500/40 text-red-300"
            )}
          >
            {toastMessage.type === "success" ? (
              <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle size={18} className="text-red-400 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          STATISTIQUES
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#0f172a] border border-amber-500/30 rounded-2xl p-4 sm:p-5 shadow-lg shadow-amber-500/5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-amber-400">
              En attente
            </span>
            <Clock size={16} className="text-amber-400" />
          </div>
          <span className="text-2xl sm:text-3xl font-heading font-black text-amber-300">
            {stats.pendingCount}
          </span>
        </div>

        <div className="bg-[#0f172a] border border-emerald-500/20 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-emerald-400">
              Validées
            </span>
            <CheckCircle2 size={16} className="text-emerald-400" />
          </div>
          <span className="text-2xl sm:text-3xl font-heading font-black text-emerald-300">
            {stats.approvedCount}
          </span>
        </div>

        <div className="bg-[#0f172a] border border-red-500/20 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-red-400">
              Refusées
            </span>
            <XCircle size={16} className="text-red-400" />
          </div>
          <span className="text-2xl sm:text-3xl font-heading font-black text-red-300">
            {stats.rejectedCount}
          </span>
        </div>

        <div className="bg-[#0f172a] border border-brand-white/10 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-brand-white/40">
              Total dossiers
            </span>
            <CreditCard size={16} className="text-brand-white/40" />
          </div>
          <span className="text-2xl sm:text-3xl font-heading font-black text-brand-white">
            {stats.total}
          </span>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          BARRE D'OUTILS : FILTRES & RECHERCHE
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Onglets statut */}
        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: "pending", label: `En attente (${stats.pendingCount})` },
              { id: "all", label: "Toutes les demandes" },
              { id: "approved", label: `Validées (${stats.approvedCount})` },
              { id: "rejected", label: `Refusées (${stats.rejectedCount})` },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setFilterStatus(t.id)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition-all border cursor-pointer",
                filterStatus === t.id
                  ? "bg-brand-blue text-brand-black border-brand-blue shadow-md shadow-brand-blue/20"
                  : "bg-[#0f172a] text-brand-white/60 border-brand-white/10 hover:border-brand-white/20 hover:text-brand-white"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Barre de recherche */}
        <div className="relative w-full md:w-72">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-white/40" />
          <input
            type="text"
            placeholder="Nom, formule, téléphone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0f172a] border border-brand-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-brand-white placeholder:text-brand-white/30 focus:border-brand-blue outline-none"
          />
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          LISTE DES DEMANDES D'ADHÉSION
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {isLoading ? (
        <div className="p-16 text-center">
          <Loader2 size={32} className="text-brand-blue animate-spin mx-auto mb-3" />
          <p className="text-xs text-brand-white/50 font-heading uppercase">Chargement des dossiers...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="bg-[#0f172a]/60 border border-brand-white/10 rounded-3xl p-12 text-center text-brand-white/40 font-heading text-xs uppercase tracking-wider">
          Aucune demande d&apos;adhésion trouvée dans cette catégorie.
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredRequests.map((req) => {
            const isPending = req.status === "pending";
            const memberFullName = `${req.profile?.first_name || ""} ${req.profile?.last_name || ""}`.trim() || "Nouveau membre";
            const isAnnual = req.commitment_type === "annual";

            return (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "bg-[#0f172a] border rounded-2xl p-5 sm:p-6 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-5",
                  isPending
                    ? "border-amber-500/40 shadow-lg shadow-amber-500/5 bg-gradient-to-r from-[#172033] to-[#0f172a]"
                    : "border-brand-white/10 opacity-80"
                )}
              >
                {/* Colonne 1 : Infos Membre & Formule */}
                <div className="space-y-2.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Badge Statut */}
                    <span
                      className={cn(
                        "text-[10px] font-heading font-black uppercase px-2.5 py-0.5 rounded-full border tracking-wider",
                        req.status === "pending"
                          ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                          : req.status === "approved"
                          ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                          : "bg-red-500/15 text-red-300 border-red-500/30"
                      )}
                    >
                      {req.status === "pending" ? "En attente" : req.status === "approved" ? "Validée" : "Refusée"}
                    </span>

                    {/* Badge Formule */}
                    <span
                      className={cn(
                        "text-[10px] font-heading font-bold uppercase px-2.5 py-0.5 rounded border tracking-wider",
                        getPlanBadgeClasses(req.plan?.type)
                      )}
                    >
                      {req.plan?.name || "Formule"}
                    </span>

                    {/* Badge Engagement */}
                    <span className="text-[10px] font-heading font-bold uppercase px-2 py-0.5 rounded bg-brand-white/5 border border-brand-white/10 text-brand-white/70">
                      {isAnnual ? "Engagement 12 mois" : "Mensuel (Sans engagement)"}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-baseline gap-3">
                    <h3 className="text-base font-heading font-black text-brand-white tracking-wide">
                      {memberFullName}
                    </h3>
                    {req.profile?.phone && (
                      <span className="text-xs text-brand-white/50 flex items-center gap-1">
                        <Phone size={12} className="text-brand-blue" />
                        {req.profile.phone}
                      </span>
                    )}
                  </div>

                  {/* Commentaire éventuel du membre */}
                  {req.member_notes && (
                    <div className="text-xs text-brand-white/80 bg-[#0a1120] border border-brand-white/5 rounded-xl p-3 flex items-start gap-2 max-w-2xl">
                      <MessageSquare size={14} className="text-brand-blue shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-brand-white/50 text-[10px] uppercase block mb-0.5">
                          Note du membre :
                        </span>
                        <p className="italic">{req.member_notes}</p>
                      </div>
                    </div>
                  )}

                  {/* Note admin si déjà traitée */}
                  {req.admin_notes && (
                    <div className="text-xs text-amber-300/90 bg-amber-950/20 border border-amber-500/20 rounded-xl p-3 max-w-2xl">
                      <span className="font-bold text-[10px] uppercase block mb-0.5">Note administrateur :</span>
                      <p>{req.admin_notes}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-[11px] text-brand-white/40 pt-0.5">
                    <span>Reçue le {new Date(req.created_at).toLocaleDateString("fr-FR")} à {new Date(req.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                    {req.reviewed_at && (
                      <span>• Traitée le {new Date(req.reviewed_at).toLocaleDateString("fr-FR")}</span>
                    )}
                  </div>
                </div>

                {/* Colonne 2 : Actions Administrateur */}
                <div className="flex items-center gap-2.5 self-end lg:self-center shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-brand-white/5 w-full lg:w-auto justify-end">
                  {/* Bouton Modifier disponible pour toutes les demandes */}
                  <button
                    onClick={() => handleOpenEdit(req)}
                    className="px-3.5 py-2.5 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white/80 hover:text-brand-white border border-brand-white/10 rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Modifier la formule ou l'engagement"
                  >
                    <Pencil size={14} className="text-[#00d8ff]" />
                    <span>Modifier</span>
                  </button>

                  {isPending && (
                    <>
                      <button
                        onClick={() => {
                          setRejectingReq(req);
                          setAdminNotes("");
                        }}
                        className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition-colors cursor-pointer"
                      >
                        Refuser
                      </button>

                      <button
                        onClick={() => {
                          setApprovingReq(req);
                          setAdminNotes("");
                        }}
                        className="px-5 py-2.5 bg-[#00d8ff] hover:bg-brand-white text-black font-heading font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-[#00d8ff]/20 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Check size={16} strokeWidth={3} />
                        <span>Valider l&apos;adhésion</span>
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MODAL DE VALIDATION
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatePresence>
        {approvingReq && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setApprovingReq(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-[#0f172a] border border-[#00d8ff]/30 rounded-3xl p-6 sm:p-8 shadow-2xl z-10 space-y-6"
            >
              <div className="flex items-center justify-between pb-3 border-b border-brand-white/10">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck size={22} className="text-[#00d8ff]" />
                  <h3 className="text-xl font-heading font-black uppercase tracking-wider text-brand-white">
                    Valider l&apos;adhésion
                  </h3>
                </div>
                <button
                  onClick={() => setApprovingReq(null)}
                  className="p-1 rounded-lg text-brand-white/50 hover:text-brand-white"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4 text-xs text-brand-white/80">
                <p>
                  Vous vous apprêtez à valider la demande d&apos;adhésion pour :
                </p>

                <div className="bg-[#0a1120] border border-brand-white/10 rounded-2xl p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-brand-white/50">Membre :</span>
                    <strong className="text-brand-white">
                      {approvingReq.profile?.first_name} {approvingReq.profile?.last_name}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-brand-white/50">Formule :</span>
                    <strong className="text-[#00d8ff]">{approvingReq.plan?.name}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-brand-white/50">Engagement :</span>
                    <span className="text-brand-white">
                      {approvingReq.commitment_type === "annual" ? "12 mois" : "Mensuel (Sans engagement)"}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-emerald-300 text-[11px] leading-relaxed">
                  ✓ Un abonnement en statut <strong className="uppercase">actif</strong> sera immédiatement créé dans la base de données.
                  <br />
                  ✓ Le membre aura accès direct à ses créneaux de réservation.
                </div>

                <div>
                  <label className="text-[11px] font-heading font-bold uppercase tracking-wider text-brand-white/60 block mb-1.5">
                    Note interne administrateur (optionnelle)
                  </label>
                  <textarea
                    rows={2}
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Ex: Dossier physique vérifié, certificat médical validé..."
                    className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-xs text-brand-white placeholder:text-brand-white/30 focus:border-[#00d8ff] outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setApprovingReq(null)}
                  className="flex-1 py-3 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white/70 font-heading font-bold text-xs uppercase rounded-xl transition-all cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="flex-1 py-3 bg-[#00d8ff] hover:bg-brand-white text-black font-heading font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-[#00d8ff]/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} strokeWidth={3} />}
                  <span>Confirmer & Activer</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MODAL DE REFUS
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatePresence>
        {rejectingReq && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRejectingReq(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-[#0f172a] border border-red-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl z-10 space-y-6"
            >
              <div className="flex items-center justify-between pb-3 border-b border-brand-white/10">
                <div className="flex items-center gap-2.5">
                  <XCircle size={22} className="text-red-400" />
                  <h3 className="text-xl font-heading font-black uppercase tracking-wider text-brand-white">
                    Refuser la demande
                  </h3>
                </div>
                <button
                  onClick={() => setRejectingReq(null)}
                  className="p-1 rounded-lg text-brand-white/50 hover:text-brand-white"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4 text-xs text-brand-white/80">
                <p>
                  Voulez-vous refuser la demande d&apos;adhésion de <strong>{rejectingReq.profile?.first_name} {rejectingReq.profile?.last_name}</strong> ?
                </p>

                <div>
                  <label className="text-[11px] font-heading font-bold uppercase tracking-wider text-brand-white/60 block mb-1.5">
                    Motif du refus (optionnel)
                  </label>
                  <textarea
                    rows={3}
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Ex: Formule non disponible, informations incomplètes..."
                    className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-xs text-brand-white placeholder:text-brand-white/30 focus:border-red-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingReq(null)}
                  className="flex-1 py-3 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white/70 font-heading font-bold text-xs uppercase rounded-xl transition-all cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={actionLoading}
                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-heading font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
                  <span>Refuser la demande</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MODAL DE MODIFICATION D'ADHÉSION
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatePresence>
        {editingReq && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingReq(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-xl bg-[#0f172a] border border-[#00d8ff]/30 rounded-3xl p-6 sm:p-8 shadow-2xl z-10 space-y-5 max-h-[90vh] overflow-y-auto"
            >
              {/* En-tête */}
              <div className="flex items-center justify-between pb-3 border-b border-brand-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#00d8ff]/15 flex items-center justify-center border border-[#00d8ff]/30 text-[#00d8ff]">
                    <Pencil size={18} />
                  </div>
                  <div>
                    <h3 className="text-lg font-heading font-black uppercase tracking-wider text-brand-white">
                      Modifier l&apos;adhésion
                    </h3>
                    <p className="text-[11px] text-brand-white/50">
                      Membre : <strong className="text-brand-white">{editingReq.profile?.first_name} {editingReq.profile?.last_name}</strong>
                      {editingReq.status === "approved" && (
                        <span className="ml-2 text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30 text-[10px]">
                          Dossier Validé
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingReq(null)}
                  className="p-1 rounded-lg text-brand-white/50 hover:text-brand-white cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Sélection de la formule */}
              <div className="space-y-2">
                <label className="text-[11px] font-heading font-bold uppercase tracking-wider text-brand-white/70 block">
                  1. Formule d&apos;entraînement
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {availablePlans.length > 0 ? (
                    availablePlans.map((p) => {
                      const isSelected = editPlanId === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setEditPlanId(p.id)}
                          className={cn(
                            "p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5",
                            isSelected
                              ? "bg-[#00d8ff]/10 border-[#00d8ff] shadow-md shadow-[#00d8ff]/10"
                              : "bg-[#0a1120] border-brand-white/10 hover:border-brand-white/20 text-brand-white/70"
                          )}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className={cn("text-xs font-heading font-black uppercase", isSelected ? "text-[#00d8ff]" : "text-brand-white")}>
                              {p.name}
                            </span>
                            {isSelected && <Check size={14} className="text-[#00d8ff]" />}
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-brand-white/50">
                            <span className="font-heading font-bold text-brand-white/90">
                              {(p.price_cents / 100).toFixed(0)}€<span className="text-[9px] font-normal text-brand-white/50">/mois</span>
                            </span>
                            {typeof p.private_sessions_per_period === "number" && p.private_sessions_per_period > 0 && (
                              <span className="text-[10px] text-amber-300">
                                {p.private_sessions_per_period} cours privés/m
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="col-span-2 text-xs text-brand-white/40 italic p-3 bg-[#0a1120] rounded-xl">
                      Chargement des formules disponibles...
                    </div>
                  )}
                </div>
              </div>

              {/* Sélection de l'engagement */}
              <div className="space-y-2">
                <label className="text-[11px] font-heading font-bold uppercase tracking-wider text-brand-white/70 block">
                  2. Type d&apos;engagement
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setEditCommitmentType("monthly")}
                    className={cn(
                      "p-3 rounded-xl border text-center font-heading font-bold text-xs uppercase tracking-wider transition-all cursor-pointer",
                      editCommitmentType === "monthly"
                        ? "bg-[#00d8ff]/15 border-[#00d8ff] text-[#00d8ff] shadow-md shadow-[#00d8ff]/10"
                        : "bg-[#0a1120] border-brand-white/10 text-brand-white/60 hover:text-brand-white hover:border-brand-white/20"
                    )}
                  >
                    Mensuel (Sans engagement)
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditCommitmentType("annual")}
                    className={cn(
                      "p-3 rounded-xl border text-center font-heading font-bold text-xs uppercase tracking-wider transition-all cursor-pointer",
                      editCommitmentType === "annual"
                        ? "bg-[#00d8ff]/15 border-[#00d8ff] text-[#00d8ff] shadow-md shadow-[#00d8ff]/10"
                        : "bg-[#0a1120] border-brand-white/10 text-brand-white/60 hover:text-brand-white hover:border-brand-white/20"
                    )}
                  >
                    Annuel (Engagement 12 mois)
                  </button>
                </div>
              </div>

              {/* Notes administratives */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-heading font-bold uppercase tracking-wider text-brand-white/60 block">
                  3. Note interne administrateur (optionnelle)
                </label>
                <textarea
                  rows={2}
                  value={editAdminNotes}
                  onChange={(e) => setEditAdminNotes(e.target.value)}
                  placeholder="Ex: Correction de formule suite à demande téléphonique..."
                  className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-xs text-brand-white placeholder:text-brand-white/30 focus:border-[#00d8ff] outline-none"
                />
              </div>

              {/* Récapitulatif avant enregistrement */}
              <div className="bg-[#0a1120] border border-brand-white/10 rounded-2xl p-3.5 space-y-2 text-xs">
                <div className="text-[10px] font-heading font-bold uppercase tracking-wider text-brand-white/40 pb-1 border-b border-brand-white/5">
                  Récapitulatif des modifications
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-brand-white/50">Formule :</span>
                  <div className="text-right">
                    <span className="line-through text-brand-white/40 mr-1.5 text-[11px]">
                      {editingReq.plan?.name}
                    </span>
                    <strong className="text-[#00d8ff]">
                      {availablePlans.find((p) => p.id === editPlanId)?.name || "Formule sélectionnée"}
                    </strong>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-brand-white/50">Engagement :</span>
                  <div className="text-right">
                    <span className="line-through text-brand-white/40 mr-1.5 text-[11px]">
                      {editingReq.commitment_type === "annual" ? "12 mois" : "Mensuel"}
                    </span>
                    <strong className="text-brand-white">
                      {editCommitmentType === "annual" ? "12 mois" : "Mensuel"}
                    </strong>
                  </div>
                </div>

                {editingReq.status === "approved" && (
                  <div className="mt-2 p-2.5 bg-amber-950/30 border border-amber-500/20 rounded-xl text-amber-300 text-[10px] leading-relaxed">
                    ℹ️ Cette adhésion étant déjà validée, l&apos;enregistrement mettra à jour automatiquement l&apos;abonnement actif du membre (formule, date d&apos;échéance et quotas) sans impacter ses réservations existantes.
                  </div>
                )}
              </div>

              {/* Boutons d'action */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setEditingReq(null)}
                  className="flex-1 py-3 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white/70 font-heading font-bold text-xs uppercase rounded-xl transition-all cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleUpdate}
                  disabled={actionLoading || !editPlanId}
                  className="flex-1 py-3 bg-[#00d8ff] hover:bg-brand-white text-black font-heading font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-[#00d8ff]/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} strokeWidth={3} />}
                  <span>Enregistrer les modifications</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

