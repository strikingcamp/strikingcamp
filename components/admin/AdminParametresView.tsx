"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Settings,
  Shield,
  Sliders,
  Calendar,
  Layers,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Lock,
  Server,
  Database,
  Key,
  Clock,
  UserCheck,
  ShieldAlert,
  Info,
  Radio,
  FileText,
  Check,
  X,
  Mail,
  LogOut,
} from "lucide-react";
import {
  type AdminSettingsData,
  type SystemDiagnosticReport,
  toggleServiceStatusServerAction,
  triggerScheduleSyncServerAction,
  revalidateApplicationCacheServerAction,
  runSystemDiagnosticServerAction,
  requestAdminEmailChangeServerAction,
  updateAdminPasswordServerAction,
  signOutCurrentAdminSessionServerAction,
  revokeAllAdminSessionsServerAction,
} from "@/app/(admin)/admin/parametres/actions";
import { type ServiceSetting } from "@/lib/supabase/services";
import { siteData } from "@/data/content";
import { cn } from "@/lib/utils";

type TabKey = "general" | "services" | "reservations" | "securite" | "maintenance";

interface AdminParametresViewProps {
  initialData: AdminSettingsData;
}

export default function AdminParametresView({ initialData }: AdminParametresViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("general");
  const [isPending, startTransition] = useTransition();

  // Données locales
  const [services, setServices] = useState<ServiceSetting[]>(initialData.services);
  const adminEmail = initialData.adminUser.email;
  const auditLogs = initialData.auditLogs;
  const [diagnosticReport, setDiagnosticReport] = useState<SystemDiagnosticReport | null>(null);

  // Modales de sécurité compte
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);

  // Formulaires modales sécurité
  const [emailInput, setEmailInput] = useState("");
  const [currentPasswordInput, setCurrentPasswordInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [confirmPasswordInput, setConfirmPasswordInput] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);

  // Messages de retour
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  // Modales de confirmation maintenance
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    actionType: "TOGGLE_SERVICE" | "SYNC_SCHEDULE" | "PURGE_CACHE";
    payload?: { serviceKey?: string; newStatus?: boolean; serviceName?: string };
  }>({
    isOpen: false,
    title: "",
    description: "",
    actionType: "SYNC_SCHEDULE",
  });

  const [loadingServiceKey, setLoadingServiceKey] = useState<string | null>(null);

  // Gestion du feedback temporisé
  const triggerFeedback = (type: "success" | "error" | "info", message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback((prev) => (prev?.message === message ? null : prev));
    }, 6000);
  };

  // Handlers Sécurité Compte Admin
  const handleOpenEmailModal = () => {
    setEmailInput("");
    setModalError(null);
    setModalSuccess(null);
    setIsEmailModalOpen(true);
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setModalSuccess(null);

    const email = emailInput.trim();
    if (!email) {
      setModalError("L'adresse email est requise.");
      return;
    }
    if (email.toLowerCase() === adminEmail.toLowerCase()) {
      setModalError("La nouvelle adresse email doit être différente de l'adresse actuelle.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await requestAdminEmailChangeServerAction(email);
        if (res.success) {
          setModalSuccess(res.message || "Un email de confirmation a été envoyé.");
          triggerFeedback("success", res.message || "Demande envoyée avec succès.");
          setTimeout(() => {
            setIsEmailModalOpen(false);
          }, 2500);
        } else {
          setModalError(res.error || "Impossible de modifier l'adresse email.");
        }
      } catch {
        setModalError("Une erreur inattendue est survenue.");
      }
    });
  };

  const handleOpenPasswordModal = () => {
    setCurrentPasswordInput("");
    setPasswordInput("");
    setConfirmPasswordInput("");
    setModalError(null);
    setModalSuccess(null);
    setIsPasswordModalOpen(true);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setModalSuccess(null);

    if (!currentPasswordInput) {
      setModalError("Veuillez saisir votre mot de passe actuel.");
      return;
    }
    if (!passwordInput || passwordInput.length < 8) {
      setModalError("Le nouveau mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (passwordInput !== confirmPasswordInput) {
      setModalError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    if (currentPasswordInput.trim() === passwordInput.trim()) {
      setModalError("Le nouveau mot de passe doit être différent du mot de passe actuel.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await updateAdminPasswordServerAction(
          currentPasswordInput,
          passwordInput,
          confirmPasswordInput
        );
        if (res.success) {
          setModalSuccess("Votre mot de passe a été modifié avec succès.");
          triggerFeedback("success", "Votre mot de passe a été modifié avec succès.");
          setCurrentPasswordInput("");
          setPasswordInput("");
          setConfirmPasswordInput("");
          setTimeout(() => {
            setIsPasswordModalOpen(false);
          }, 2000);
        } else {
          setModalError(res.error || "Échec de la modification du mot de passe.");
        }
      } catch {
        setModalError("Une erreur inattendue est survenue.");
      }
    });
  };

  const handleSignOutCurrentSession = () => {
    startTransition(async () => {
      try {
        const res = await signOutCurrentAdminSessionServerAction();
        if (res.success) {
          triggerFeedback("success", "Session déconnectée avec succès. Redirection...");
          setTimeout(() => {
            router.replace("/connexion");
          }, 800);
        } else {
          triggerFeedback("error", res.error || "Échec de la déconnexion.");
        }
      } catch {
        triggerFeedback("error", "Une erreur inattendue est survenue.");
      }
    });
  };

  const handleOpenRevokeModal = () => {
    setModalError(null);
    setIsRevokeModalOpen(true);
  };

  const handleRevokeAllSubmit = () => {
    setModalError(null);
    startTransition(async () => {
      try {
        const res = await revokeAllAdminSessionsServerAction();
        if (res.success) {
          triggerFeedback("success", "Toutes les sessions ont été révoquées. Redirection...");
          setIsRevokeModalOpen(false);
          setTimeout(() => {
            router.replace("/connexion?revoked=all");
          }, 1200);
        } else {
          setModalError(res.error || "Échec de la révocation des sessions.");
          triggerFeedback("error", res.error || "Échec de la révocation.");
        }
      } catch {
        setModalError("Une erreur inattendue est survenue.");
      }
    });
  };

  // 1. Déclenchement de la confirmation de changement de statut de service
  const handleServiceToggleClick = (service: ServiceSetting) => {
    const nextStatus = !service.is_active;

    if (!nextStatus) {
      // Désactivation : confirmation explicite requise
      setConfirmModal({
        isOpen: true,
        title: `Désactiver le service « ${service.service_name} » ?`,
        description: `La désactivation rendra immédiatement ce service indisponible aux membres et sur le planning public. Les réservations existantes restent en base de données.`,
        actionType: "TOGGLE_SERVICE",
        payload: {
          serviceKey: service.service_key,
          newStatus: false,
          serviceName: service.service_name,
        },
      });
    } else {
      // Activation directe
      executeServiceToggle(service.service_key, true);
    }
  };

  // Exécution du toggle service
  const executeServiceToggle = (serviceKey: string, newStatus: boolean) => {
    setLoadingServiceKey(serviceKey);
    startTransition(async () => {
      try {
        const res = await toggleServiceStatusServerAction(serviceKey, newStatus);
        if (res.success) {
          setServices((prev) =>
            prev.map((s) =>
              s.service_key === serviceKey ? { ...s, is_active: newStatus } : s
            )
          );
          triggerFeedback(
            "success",
            res.message || `Service ${serviceKey} mis à jour avec succès.`
          );
          router.refresh();
        } else {
          triggerFeedback("error", res.error || "Échec de la mise à jour du service.");
        }
      } catch {
        triggerFeedback("error", "Une erreur inattendue est survenue.");
      } finally {
        setLoadingServiceKey(null);
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      }
    });
  };

  // 2. Synchronisation du planning
  const executeScheduleSync = () => {
    startTransition(async () => {
      try {
        const res = await triggerScheduleSyncServerAction();
        if (res.success) {
          triggerFeedback(
            "success",
            res.message || "Horizon de planning synchronisé avec succès."
          );
          router.refresh();
        } else {
          triggerFeedback("error", res.error || "Échec de la synchronisation.");
        }
      } catch {
        triggerFeedback("error", "Une erreur inattendue est survenue.");
      } finally {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      }
    });
  };

  // 3. Revalidation du cache
  const executeCachePurge = () => {
    startTransition(async () => {
      try {
        const res = await revalidateApplicationCacheServerAction();
        if (res.success) {
          triggerFeedback(
            "success",
            res.message || "Cache applicatif revalidé avec succès."
          );
          router.refresh();
        } else {
          triggerFeedback("error", res.error || "Échec de la revalidation du cache.");
        }
      } catch {
        triggerFeedback("error", "Une erreur inattendue est survenue.");
      } finally {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      }
    });
  };

  // 4. Lancement du diagnostic système en direct
  const handleRunDiagnostic = () => {
    startTransition(async () => {
      try {
        const res = await runSystemDiagnosticServerAction();
        if (res.success && res.data) {
          setDiagnosticReport(res.data);
          triggerFeedback("success", "Diagnostic système exécuté avec succès.");
        } else {
          triggerFeedback("error", res.error || "Erreur lors du diagnostic.");
        }
      } catch {
        triggerFeedback("error", "Une erreur inattendue est survenue.");
      }
    });
  };

  // Validation du modal générique
  const handleConfirmModalSubmit = () => {
    if (confirmModal.actionType === "TOGGLE_SERVICE" && confirmModal.payload?.serviceKey) {
      executeServiceToggle(
        confirmModal.payload.serviceKey,
        Boolean(confirmModal.payload.newStatus)
      );
    } else if (confirmModal.actionType === "SYNC_SCHEDULE") {
      executeScheduleSync();
    } else if (confirmModal.actionType === "PURGE_CACHE") {
      executeCachePurge();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-brand-white/10 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-black uppercase tracking-wider text-brand-white">
            Paramètres & <span className="text-brand-blue">Sécurité</span>
          </h1>
          <p className="text-xs text-brand-white/60 mt-1">
            Contrôle opérationnel, état des services, règles métier et diagnostic système.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-blue/10 border border-brand-blue/30 text-brand-blue text-xs font-heading font-bold uppercase tracking-wider">
            <Shield size={14} />
            Privilèges Admin Actifs
          </span>
        </div>
      </div>

      {/* Bannière de feedback */}
      {feedback && (
        <div
          className={cn(
            "p-4 rounded-xl border text-xs font-semibold flex items-center justify-between gap-3 animate-in fade-in duration-200",
            feedback.type === "success" &&
              "bg-emerald-500/10 border-emerald-500/30 text-emerald-300",
            feedback.type === "error" &&
              "bg-rose-500/10 border-rose-500/30 text-rose-300",
            feedback.type === "info" &&
              "bg-brand-blue/10 border-brand-blue/30 text-brand-blue"
          )}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" && <CheckCircle2 size={16} />}
            {feedback.type === "error" && <AlertTriangle size={16} />}
            {feedback.type === "info" && <Info size={16} />}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="p-1 hover:bg-brand-white/10 rounded transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Navigation par Onglets */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-brand-white/10 scrollbar-thin">
        {[
          { key: "general", label: "Général", icon: Settings },
          { key: "services", label: "Services", icon: Sliders },
          { key: "reservations", label: "Réservations", icon: Calendar },
          { key: "securite", label: "Sécurité & Audit", icon: Shield },
          { key: "maintenance", label: "Maintenance", icon: Wrench },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabKey)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-heading font-bold uppercase tracking-wider transition-all whitespace-nowrap",
                isActive
                  ? "bg-brand-blue text-brand-black shadow-md shadow-brand-blue/20"
                  : "text-brand-white/60 hover:text-brand-white hover:bg-brand-white/5 border border-transparent"
              )}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 1. ONGLET GÉNÉRAL */}
      {/* ========================================================================= */}
      {activeTab === "general" && (
        <div className="space-y-6">
          <div className="bg-[#0f172a]/60 border border-brand-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between border-b border-brand-white/10 pb-4 mb-6">
              <div>
                <h3 className="text-base font-heading font-black uppercase text-brand-white flex items-center gap-2">
                  <Settings size={18} className="text-brand-blue" />
                  Informations Générales du Club
                </h3>
                <p className="text-xs text-brand-white/50 mt-0.5">
                  Coordonnées officielles, localisation et configuration régionale.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded bg-brand-white/5 border border-brand-white/10 text-[10px] font-bold uppercase tracking-wider text-brand-white/50">
                Lecture seule · V1
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-1.5 bg-[#080d1a]/50 p-4 rounded-lg border border-brand-white/5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-white/40">
                  Nom de l&apos;établissement
                </span>
                <p className="text-sm font-semibold text-brand-white">
                  Striking Camp Marseille
                </p>
                <p className="text-[11px] text-brand-white/40">Club de sports de combat et striking</p>
              </div>

              <div className="space-y-1.5 bg-[#080d1a]/50 p-4 rounded-lg border border-brand-white/5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-white/40">
                  Email de contact officiel
                </span>
                <p className="text-sm font-semibold text-brand-white">
                  contact@strikingcamp.fr
                </p>
                <p className="text-[11px] text-brand-white/40">Réception des demandes et notifications</p>
              </div>

              <div className="space-y-1.5 bg-[#080d1a]/50 p-4 rounded-lg border border-brand-white/5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-white/40">
                  Téléphone du club
                </span>
                <p className="text-sm font-semibold text-brand-white">
                  {siteData.contact.phone}
                </p>
                <p className="text-[11px] text-brand-white/40">Ligne directe accueil et réservations</p>
              </div>

              <div className="space-y-1.5 bg-[#080d1a]/50 p-4 rounded-lg border border-brand-white/5 md:col-span-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-white/40">
                  Adresse physique officielle
                </span>
                <p className="text-sm font-semibold text-brand-white">
                  268 avenue de la Capelette, 13010 Marseille
                </p>
                <p className="text-[11px] text-brand-white/40">Quartier Capelette · 10e arrondissement · Parking & Accès PMR</p>
              </div>

              <div className="space-y-1.5 bg-[#080d1a]/50 p-4 rounded-lg border border-brand-white/5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-white/40">
                  Horaires d&apos;ouverture
                </span>
                <p className="text-sm font-semibold text-brand-white">
                  Lundi - Samedi : 07h00 - 21h30
                </p>
                <p className="text-[11px] text-brand-white/40">Dimanche fermé ou stages exceptionnels</p>
              </div>

              <div className="space-y-1.5 bg-[#080d1a]/50 p-4 rounded-lg border border-brand-white/5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-white/40">
                  Fuseau horaire système
                </span>
                <p className="text-sm font-semibold text-brand-white flex items-center gap-1.5">
                  <Clock size={14} className="text-brand-blue" />
                  Europe / Paris (UTC+1 / UTC+2)
                </p>
                <p className="text-[11px] text-brand-white/40">Gestion automatique des créneaux été/hiver</p>
              </div>

              <div className="space-y-1.5 bg-[#080d1a]/50 p-4 rounded-lg border border-brand-white/5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-white/40">
                  Devise monétaire
                </span>
                <p className="text-sm font-semibold text-brand-white">
                  Euro (€ - EUR)
                </p>
                <p className="text-[11px] text-brand-white/40">Facturation et abonnements en centimes</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. ONGLET SERVICES */}
      {/* ========================================================================= */}
      {activeTab === "services" && (
        <div className="space-y-6">
          {/* Cartes des services configurables */}
          <div className="bg-[#0f172a]/60 border border-brand-white/10 rounded-xl p-6 space-y-6">
            <div>
              <h3 className="text-base font-heading font-black uppercase text-brand-white flex items-center gap-2">
                <Sliders size={18} className="text-brand-blue" />
                Interrupteurs des Services (service_settings)
              </h3>
              <p className="text-xs text-brand-white/50 mt-0.5">
                Activez ou désactivez les services en temps réel. La désactivation exige une confirmation.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((service) => {
                const isLoading = loadingServiceKey === service.service_key || isPending;
                return (
                  <div
                    key={service.service_key}
                    className="bg-[#080d1a]/60 border border-brand-white/10 rounded-xl p-5 flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-heading font-bold uppercase text-brand-white">
                          {service.service_name}
                        </h4>
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                            service.is_active
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : "bg-brand-white/5 text-brand-white/40 border border-brand-white/10"
                          )}
                        >
                          {service.is_active ? "Actif" : "Inactif"}
                        </span>
                      </div>
                      <p className="text-xs text-brand-white/60 leading-relaxed">
                        {service.description || "Aucune description renseignée."}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-brand-white/10 flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase text-brand-white/40">
                        État du service
                      </span>
                      <button
                        disabled={isLoading}
                        onClick={() => handleServiceToggleClick(service)}
                        className={cn(
                          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50",
                          service.is_active ? "bg-brand-blue" : "bg-brand-white/20"
                        )}
                      >
                        <span
                          className={cn(
                            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-brand-white shadow ring-0 transition duration-200 ease-in-out",
                            service.is_active ? "translate-x-5" : "translate-x-0"
                          )}
                        />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Capacités officielles des cours */}
          <div className="bg-[#0f172a]/60 border border-brand-white/10 rounded-xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-brand-white/10 pb-4">
              <div>
                <h3 className="text-base font-heading font-black uppercase text-brand-white flex items-center gap-2">
                  <Layers size={18} className="text-brand-blue" />
                  Capacités Officielles & Sources de Vérité
                </h3>
                <p className="text-xs text-brand-white/50 mt-0.5">
                  Limites d&apos;accueil par créneau (verrouillées dans le code et les RPCs SQL).
                </p>
              </div>
              <span className="px-2.5 py-1 rounded bg-brand-white/5 border border-brand-white/10 text-[10px] font-bold uppercase tracking-wider text-brand-white/50">
                Lecture seule · V1
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#080d1a]/50 border border-brand-blue/20 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-heading font-bold uppercase text-brand-blue">
                    Small Group
                  </span>
                  <span className="text-xl font-heading font-black text-brand-white">
                    {initialData.capacities.smallGroup} max
                  </span>
                </div>
                <p className="text-xs text-brand-white/60">
                  Cours semi-privés encadrés avec coaching de proximité. Réservation nominative obligatoire.
                </p>
                <div className="pt-2 border-t border-brand-white/5 text-[10px] text-brand-white/40">
                  Vérifié dans RPC <code>book_small_group_session</code> & templates.
                </div>
              </div>

              <div className="bg-[#080d1a]/50 border border-brand-white/10 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-heading font-bold uppercase text-brand-white/70">
                    Cours Collectifs
                  </span>
                  <span className="text-xl font-heading font-black text-brand-white">
                    {initialData.capacities.collective} max
                  </span>
                </div>
                <p className="text-xs text-brand-white/60">
                  Grandes séances d&apos;entraînement, sacs de frappe et sparring selon les niveaux.
                </p>
                <div className="pt-2 border-t border-brand-white/5 text-[10px] text-brand-white/40">
                  Jauge d&apos;accueil standard pour les formules collectives.
                </div>
              </div>

              <div className="bg-[#080d1a]/50 border border-brand-white/10 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-heading font-bold uppercase text-brand-white/70">
                    Cours Privés
                  </span>
                  <span className="text-xl font-heading font-black text-brand-white">
                    {initialData.capacities.private} max
                  </span>
                </div>
                <p className="text-xs text-brand-white/60">
                  Séance 1-on-1 avec un coach dédié (50 minutes de travail personnalisé).
                </p>
                <div className="pt-2 border-t border-brand-white/5 text-[10px] text-brand-white/40">
                  Réservation individuelle exclusive par créneau horaire.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. ONGLET RÉSERVATIONS */}
      {/* ========================================================================= */}
      {activeTab === "reservations" && (
        <div className="space-y-6">
          <div className="bg-[#0f172a]/60 border border-brand-white/10 rounded-xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-brand-white/10 pb-4">
              <div>
                <h3 className="text-base font-heading font-black uppercase text-brand-white flex items-center gap-2">
                  <Calendar size={18} className="text-brand-blue" />
                  Règles Métier de Réservation
                </h3>
                <p className="text-xs text-brand-white/50 mt-0.5">
                  Politiques appliquées de manière stricte par le moteur de réservation et la base de données.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded bg-brand-white/5 border border-brand-white/10 text-[10px] font-bold uppercase tracking-wider text-brand-white/50">
                Lecture seule · V1
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#080d1a]/50 p-5 rounded-xl border border-brand-white/5 space-y-2">
                <div className="flex items-center gap-2 text-brand-blue font-heading font-bold text-xs uppercase">
                  <Clock size={16} />
                  Délai d&apos;annulation standard (24 heures)
                </div>
                <p className="text-xs text-brand-white/70 leading-relaxed">
                  Toute annulation effectuée plus de 24 heures avant l&apos;horaire de début de la séance libère immédiatement la place sans pénalité. Le quota de séance du membre est automatiquement préservé.
                </p>
              </div>

              <div className="bg-[#080d1a]/50 p-5 rounded-xl border border-brand-white/5 space-y-2">
                <div className="flex items-center gap-2 text-rose-400 font-heading font-bold text-xs uppercase">
                  <AlertTriangle size={16} />
                  Annulation tardive (&lt; 24 heures)
                </div>
                <p className="text-xs text-brand-white/70 leading-relaxed">
                  L&apos;annulation à moins de 24 heures marque la réservation en annulation tardive (<code>isLateCancellation = true</code>). La séance est décomptée afin d&apos;éviter les désistements de dernière minute.
                </p>
              </div>

              <div className="bg-[#080d1a]/50 p-5 rounded-xl border border-brand-white/5 space-y-2">
                <div className="flex items-center gap-2 text-brand-blue font-heading font-bold text-xs uppercase">
                  <Lock size={16} />
                  Verrouillage au démarrage de séance
                </div>
                <p className="text-xs text-brand-white/70 leading-relaxed">
                  Dès que l&apos;heure <code>starts_at</code> d&apos;un cours est atteinte, toute nouvelle réservation ou annulation autonome par le membre est automatiquement rejetée par les RPCs Supabase.
                </p>
              </div>

              <div className="bg-[#080d1a]/50 p-5 rounded-xl border border-brand-white/5 space-y-2">
                <div className="flex items-center gap-2 text-brand-blue font-heading font-bold text-xs uppercase">
                  <UserCheck size={16} />
                  Protection Anti-Doublon & Concurrence
                </div>
                <p className="text-xs text-brand-white/70 leading-relaxed">
                  Un membre ne peut détenir qu&apos;une seule réservation active par créneau horaire. Les verrous SQL transactionnels empêchent tout surbooking au-delà de la capacité maximale.
                </p>
              </div>

              <div className="bg-[#080d1a]/50 p-5 rounded-xl border border-brand-white/5 space-y-2">
                <div className="flex items-center gap-2 text-brand-blue font-heading font-bold text-xs uppercase">
                  <Radio size={16} />
                  Règles des Cours d&apos;Essai
                </div>
                <p className="text-xs text-brand-white/70 leading-relaxed">
                  Limité strictement à un seul cours d&apos;essai par personne. Les réservations sont isolées dans la table <code>trial_bookings</code> avec contrôle d&apos;email, téléphone et vérification d&apos;activation du service.
                </p>
              </div>

              <div className="bg-[#080d1a]/50 p-5 rounded-xl border border-brand-white/5 space-y-2">
                <div className="flex items-center gap-2 text-brand-blue font-heading font-bold text-xs uppercase">
                  <Layers size={16} />
                  Contrôle d&apos;accès lié aux Abonnements
                </div>
                <p className="text-xs text-brand-white/70 leading-relaxed">
                  L&apos;accès aux séances Small Group exige un abonnement actif avec le flag <code>allows_small_group = true</code> ou une formule dédiée. Les cours privés décomptent le quota <code>private_sessions_quota</code>.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. ONGLET SÉCURITÉ */}
      {/* ========================================================================= */}
      {activeTab === "securite" && (
        <div className="space-y-6">
          {/* Compte Administrateur & Sessions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. Compte Administrateur (Email & Mot de passe) */}
            <div className="bg-[#0f172a]/60 border border-brand-white/10 rounded-xl p-6 space-y-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-brand-white/10 pb-3 mb-4">
                  <h3 className="text-sm font-heading font-bold uppercase text-brand-white flex items-center gap-2">
                    <UserCheck size={16} className="text-brand-blue" />
                    Compte Administrateur
                  </h3>
                  <span className="px-2 py-0.5 rounded bg-brand-blue/10 text-brand-blue text-[10px] font-bold uppercase">
                    Authentification Supabase
                  </span>
                </div>

                <div className="space-y-4 text-xs">
                  {/* Email de connexion */}
                  <div className="p-4 rounded-lg bg-[#080d1a]/60 border border-brand-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-brand-white/40">
                        Email de connexion
                      </span>
                      <button
                        type="button"
                        onClick={handleOpenEmailModal}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-brand-blue/10 hover:bg-brand-blue/20 text-brand-blue border border-brand-blue/30 text-[11px] font-heading font-bold uppercase tracking-wider transition-colors"
                      >
                        <Mail size={12} />
                        Modifier l&apos;email
                      </button>
                    </div>
                    <p className="font-semibold text-brand-white text-sm">
                      {adminEmail}
                    </p>
                    <p className="text-[11px] text-brand-white/40">
                      L&apos;adresse email utilisée pour accéder à votre espace administrateur.
                    </p>
                  </div>

                  {/* Mot de passe */}
                  <div className="p-4 rounded-lg bg-[#080d1a]/60 border border-brand-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-brand-white/40">
                        Mot de passe
                      </span>
                      <button
                        type="button"
                        onClick={handleOpenPasswordModal}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-brand-white/10 hover:bg-brand-white/20 text-brand-white border border-brand-white/20 text-[11px] font-heading font-bold uppercase tracking-wider transition-colors"
                      >
                        <Lock size={12} />
                        Modifier le mot de passe
                      </button>
                    </div>
                    <p className="font-mono text-xs text-brand-white/50 tracking-widest">
                      ••••••••••••••••
                    </p>
                    <p className="text-[11px] text-brand-white/40">
                      Votre mot de passe est protégé et n&apos;est jamais affiché.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Sessions & Connexions */}
            <div className="bg-[#0f172a]/60 border border-brand-white/10 rounded-xl p-6 space-y-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-brand-white/10 pb-3 mb-4">
                  <h3 className="text-sm font-heading font-bold uppercase text-brand-white flex items-center gap-2">
                    <Clock size={16} className="text-brand-blue" />
                    Session Actuelle
                  </h3>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Active
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-4 rounded-lg bg-[#080d1a]/60 border border-brand-white/5 space-y-2">
                    <div className="flex justify-between py-1 border-b border-brand-white/5">
                      <span className="text-brand-white/50">Email</span>
                      <span className="font-semibold text-brand-white">
                        {adminEmail}
                      </span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-brand-white/5">
                      <span className="text-brand-white/50">Dernière connexion</span>
                      <span className="font-semibold text-brand-white">
                        {initialData.adminUser.lastSignInAt
                          ? new Date(initialData.adminUser.lastSignInAt).toLocaleString("fr-FR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Session active"}
                      </span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-brand-white/5">
                      <span className="text-brand-white/50">Date de création</span>
                      <span className="font-semibold text-brand-white">
                        {initialData.adminUser.createdAt
                          ? new Date(initialData.adminUser.createdAt).toLocaleDateString("fr-FR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })
                          : "—"}
                      </span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-brand-white/5">
                      <span className="text-brand-white/50">Fournisseur d&apos;authentification</span>
                      <span className="font-semibold text-brand-white uppercase text-[11px]">
                        {initialData.adminUser.provider || "Email / Mot de passe"}
                      </span>
                    </div>

                    <div className="flex justify-between py-1">
                      <span className="text-brand-white/50">Identifiant UUID</span>
                      <span className="font-mono text-[11px] text-brand-blue truncate max-w-[200px]">
                        {initialData.adminUser.id}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions de déconnexion */}
              <div className="pt-4 border-t border-brand-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleSignOutCurrentSession}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-brand-white/5 hover:bg-brand-white/10 text-brand-white border border-brand-white/10 text-xs font-heading font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
                >
                  <LogOut size={13} />
                  Déconnecter cette session
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleOpenRevokeModal}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-heading font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
                >
                  <LogOut size={13} />
                  Déconnecter toutes les sessions
                </button>
              </div>
            </div>
          </div>

          {/* 3. Privilèges Administrateur & Protections Serveur */}
          <div className="bg-[#0f172a]/60 border border-brand-white/10 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-brand-white/10 pb-3">
              <h3 className="text-sm font-heading font-bold uppercase text-brand-white flex items-center gap-2">
                <ShieldAlert size={16} className="text-brand-blue" />
                Privilèges Administrateur & Protections Serveur
              </h3>
              <span className="px-2.5 py-0.5 rounded bg-brand-white/5 text-brand-white/40 border border-brand-white/10 text-[10px] font-bold uppercase">
                Lecture seule stricte
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="p-3.5 rounded-lg bg-[#080d1a]/50 border border-brand-white/5 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-white/40">
                  Rôle (app_metadata)
                </span>
                <p className="text-sm font-heading font-bold text-emerald-400 uppercase">
                  {initialData.adminUser.role}
                </p>
                <p className="text-[10px] text-brand-white/40">Source immuable Supabase Auth</p>
              </div>

              <div className="p-3.5 rounded-lg bg-[#080d1a]/50 border border-brand-white/5 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-white/40">
                  Protection Serveur
                </span>
                <p className="text-sm font-heading font-bold text-emerald-400 uppercase flex items-center gap-1">
                  <CheckCircle2 size={14} /> assertAdminUser()
                </p>
                <p className="text-[10px] text-brand-white/40">Contrôle Fail-Closed systématique</p>
              </div>

              <div className="p-3.5 rounded-lg bg-[#080d1a]/50 border border-brand-white/5 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-white/40">
                  Sécurité BDD (RLS)
                </span>
                <p className="text-sm font-heading font-bold text-emerald-400 uppercase flex items-center gap-1">
                  <CheckCircle2 size={14} /> public.is_admin()
                </p>
                <p className="text-[10px] text-brand-white/40">Politiques SQL actives</p>
              </div>

              <div className="p-3.5 rounded-lg bg-[#080d1a]/50 border border-brand-white/5 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-white/40">
                  Protection Cron
                </span>
                <p className="text-sm font-heading font-bold text-emerald-400 uppercase flex items-center gap-1">
                  <CheckCircle2 size={14} /> {initialData.security.cronProtectionStatus}
                </p>
                <p className="text-[10px] text-brand-white/40">
                  {initialData.env.cronSecret ? "CRON_SECRET actif" : "Repli SERVICE_ROLE actif"}
                </p>
              </div>
            </div>
          </div>

          {/* État des Variables d'Environnement */}
          <div className="bg-[#0f172a]/60 border border-brand-white/10 rounded-xl p-6 space-y-4">
            <div>
              <h3 className="text-sm font-heading font-bold uppercase text-brand-white flex items-center gap-2">
                <Key size={16} className="text-brand-blue" />
                Variables d&apos;Environnement & Secrets Serveur
              </h3>
              <p className="text-xs text-brand-white/50 mt-0.5">
                Statut de configuration côté serveur. Les valeurs secrètes ne sont JAMAIS exposées au client.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  name: "NEXT_PUBLIC_SUPABASE_URL",
                  status: initialData.env.supabaseUrl ? "ok" : "error",
                  statusText: initialData.env.supabaseUrl ? "Configuré" : "Non configuré",
                  desc: "URL de l'instance Supabase",
                },
                {
                  name: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
                  status: (initialData.env.supabasePublishableKey ?? initialData.env.supabaseAnonKey) ? "ok" : "error",
                  statusText: (initialData.env.supabasePublishableKey ?? initialData.env.supabaseAnonKey) ? "Configurée" : "Non configurée",
                  desc: "Clé publique Supabase (publishable / anon key)",
                },
                {
                  name: "SUPABASE_SERVICE_ROLE_KEY",
                  status: initialData.env.supabaseServiceRoleKey ? "ok" : "error",
                  statusText: initialData.env.supabaseServiceRoleKey ? "Configurée (serveur)" : "Non configurée",
                  desc: "Clé administrateur (serveur uniquement)",
                },
                {
                  name: "RESEND_API_KEY",
                  status: initialData.env.resendApiKey ? "ok" : "warning",
                  statusText: initialData.env.resendApiKey ? "Configuré" : "Non configuré",
                  desc: "Envoi des emails transactionnels",
                },
                {
                  name: "CRON_SECRET",
                  status: initialData.env.cronSecret
                    ? "ok"
                    : initialData.env.supabaseServiceRoleKey
                    ? "fallback"
                    : "error",
                  statusText: initialData.env.cronSecret
                    ? "Protégé (CRON_SECRET dédié)"
                    : initialData.env.supabaseServiceRoleKey
                    ? "Protégé (repli Service Role)"
                    : "Non protégé",
                  desc: "Protection des tâches planifiées",
                },
              ].map((v) => (
                <div
                  key={v.name}
                  className="bg-[#080d1a]/50 p-4 rounded-lg border border-brand-white/5 flex flex-col justify-between space-y-2"
                >
                  <div>
                    <span className="font-mono text-xs font-semibold text-brand-white">
                      {v.name}
                    </span>
                    <p className="text-[10px] text-brand-white/40 mt-0.5">{v.desc}</p>
                  </div>
                  <div className="pt-2 border-t border-brand-white/5 flex items-center justify-between">
                    <span className="text-[10px] uppercase text-brand-white/50 font-bold">
                      Statut
                    </span>
                    {v.status === "ok" ? (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-semibold text-[10px] flex items-center gap-1">
                        <Check size={12} /> {v.statusText}
                      </span>
                    ) : v.status === "fallback" ? (
                      <span className="px-2 py-0.5 rounded bg-brand-blue/15 text-brand-blue font-semibold text-[10px] flex items-center gap-1">
                        <Check size={12} /> {v.statusText}
                      </span>
                    ) : v.status === "warning" ? (
                      <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 font-semibold text-[10px] flex items-center gap-1">
                        <AlertTriangle size={12} /> {v.statusText}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-400 font-semibold text-[10px] flex items-center gap-1">
                        <X size={12} /> {v.statusText}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Journal d'Audit Administratif */}
          <div className="bg-[#0f172a]/60 border border-brand-white/10 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-heading font-bold uppercase text-brand-white flex items-center gap-2">
                  <FileText size={16} className="text-brand-blue" />
                  Journal d&apos;Audit Administratif (10 dernières actions)
                </h3>
                <p className="text-xs text-brand-white/50 mt-0.5">
                  Traçabilité immuable des mutations et opérations d&apos;administration.
                </p>
              </div>
              <span className="text-[10px] text-brand-white/40 uppercase font-semibold">
                Table : public.admin_audit_logs
              </span>
            </div>

            {auditLogs.length === 0 ? (
              <div className="bg-[#080d1a]/40 rounded-lg p-8 text-center text-xs text-brand-white/40 border border-dashed border-brand-white/10">
                Aucune action enregistrée pour le moment. Les prochaines opérations administratives apparaîtront ici.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-brand-white/70">
                  <thead className="bg-[#080d1a]/80 text-[10px] font-bold uppercase text-brand-white/40 border-b border-brand-white/10">
                    <tr>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Administrateur</th>
                      <th className="py-3 px-4">Catégorie</th>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Détails</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-white/5">
                    {auditLogs.map((log) => {
                      const dateFormatted = new Date(log.created_at).toLocaleString("fr-FR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      });
                      return (
                        <tr key={log.id} className="hover:bg-brand-white/5 transition-colors">
                          <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px]">
                            {dateFormatted}
                          </td>
                          <td className="py-3 px-4 font-semibold text-brand-white">
                            {log.admin_email}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded bg-brand-white/5 border border-brand-white/10 text-[10px] font-bold uppercase">
                              {log.category}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-brand-blue">
                            {log.action}
                          </td>
                          <td className="py-3 px-4 text-brand-white/50 max-w-xs truncate font-mono text-[10px]">
                            {log.details ? JSON.stringify(log.details) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. ONGLET MAINTENANCE */}
      {/* ========================================================================= */}
      {activeTab === "maintenance" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Action 1 : Synchroniser le planning */}
            <div className="bg-[#0f172a]/60 border border-brand-white/10 rounded-xl p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-heading font-bold uppercase text-brand-white flex items-center gap-2">
                    <Calendar size={16} className="text-brand-blue" />
                    Synchroniser le planning
                  </h3>
                  <span className="px-2 py-0.5 rounded bg-brand-blue/10 text-brand-blue text-[10px] font-bold uppercase">
                    12 semaines
                  </span>
                </div>
                <p className="text-xs text-brand-white/60 leading-relaxed">
                  Vérifie les créneaux récurrents et prolonge automatiquement l&apos;horizon du planning jusqu&apos;à 12 semaines en avant.
                </p>
                <div className="pt-2 text-[11px] text-brand-white/40 space-y-1">
                  <div>Séances actives : <span className="text-brand-white font-semibold">{initialData.planning.totalActiveSessions}</span></div>
                  <div>Horizon max : <span className="text-brand-white font-semibold">{initialData.planning.maxSessionDate ? new Date(initialData.planning.maxSessionDate).toLocaleDateString("fr-FR") : "—"}</span></div>
                </div>
              </div>

              <button
                disabled={isPending}
                onClick={() =>
                  setConfirmModal({
                    isOpen: true,
                    title: "Synchroniser l'horizon du planning ?",
                    description: "Cette opération va exécuter la fonction de maintenance SQL 'maintain_schedule_horizon(12)' pour garantir la disponibilité des 12 prochaines semaines.",
                    actionType: "SYNC_SCHEDULE",
                  })
                }
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-blue hover:bg-brand-blue/90 text-brand-black text-xs font-heading font-bold uppercase tracking-wider rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw size={14} className={isPending ? "animate-spin" : ""} />
                Lancer la synchronisation
              </button>
            </div>

            {/* Action 2 : Revalider le cache Next.js */}
            <div className="bg-[#0f172a]/60 border border-brand-white/10 rounded-xl p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-heading font-bold uppercase text-brand-white flex items-center gap-2">
                    <Server size={16} className="text-brand-blue" />
                    Revalider le cache Next.js
                  </h3>
                  <span className="px-2 py-0.5 rounded bg-brand-white/5 text-brand-white/50 text-[10px] font-bold uppercase">
                    revalidatePath
                  </span>
                </div>
                <p className="text-xs text-brand-white/60 leading-relaxed">
                  Purge le cache de rendu côté serveur pour rafraîchir immédiatement les pages publiques (/planning, /tarifs) et les dashboards.
                </p>
              </div>

              <button
                disabled={isPending}
                onClick={() =>
                  setConfirmModal({
                    isOpen: true,
                    title: "Revalider le cache de l'application ?",
                    description: "Cette opération va purger le cache serveur Next.js sur l'ensemble des routes publiques et administratives.",
                    actionType: "PURGE_CACHE",
                  })
                }
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-white/10 hover:bg-brand-white/20 text-brand-white text-xs font-heading font-bold uppercase tracking-wider rounded-lg border border-brand-white/10 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={14} className={isPending ? "animate-spin" : ""} />
                Revalider le cache
              </button>
            </div>

            {/* Action 3 : Diagnostic système complet */}
            <div className="bg-[#0f172a]/60 border border-brand-white/10 rounded-xl p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-heading font-bold uppercase text-brand-white flex items-center gap-2">
                    <Database size={16} className="text-brand-blue" />
                    Diagnostic Système en direct
                  </h3>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-[10px] font-bold uppercase">
                    Temps réel
                  </span>
                </div>
                <p className="text-xs text-brand-white/60 leading-relaxed">
                  Teste en profondeur les connexions Supabase, les templates de planning, les services, les permissions RLS et les secrets serveur.
                </p>
              </div>

              <button
                disabled={isPending}
                onClick={handleRunDiagnostic}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-brand-black text-xs font-heading font-bold uppercase tracking-wider rounded-lg transition-colors disabled:opacity-50"
              >
                <CheckCircle2 size={14} className={isPending ? "animate-spin" : ""} />
                Exécuter le diagnostic
              </button>
            </div>
          </div>

          {/* Rapport de Diagnostic Système */}
          {diagnosticReport && (
            <div className="bg-[#0f172a]/60 border border-brand-white/10 rounded-xl p-6 space-y-4 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-brand-white/10 pb-4">
                <div>
                  <h3 className="text-sm font-heading font-bold uppercase text-brand-white flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    Rapport de Diagnostic Système
                  </h3>
                  <p className="text-[11px] text-brand-white/40 mt-0.5">
                    Généré le {new Date(diagnosticReport.timestamp).toLocaleTimeString("fr-FR")} · Statut général :{" "}
                    <span
                      className={cn(
                        "font-bold uppercase",
                        diagnosticReport.overallStatus === "healthy" && "text-emerald-400",
                        diagnosticReport.overallStatus === "warning" && "text-amber-400",
                        diagnosticReport.overallStatus === "degraded" && "text-rose-400"
                      )}
                    >
                      {diagnosticReport.overallStatus === "healthy"
                        ? "Opérationnel"
                        : diagnosticReport.overallStatus === "warning"
                        ? "Attention requise"
                        : "Dégradé"}
                    </span>
                  </p>
                </div>

                <button
                  onClick={() => setDiagnosticReport(null)}
                  className="text-xs text-brand-white/40 hover:text-brand-white flex items-center gap-1"
                >
                  <X size={14} /> Fermer
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {diagnosticReport.checks.map((check) => (
                  <div
                    key={check.id}
                    className="p-3.5 rounded-lg bg-[#080d1a]/60 border border-brand-white/5 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="font-semibold text-brand-white flex items-center gap-2">
                        {check.status === "ok" && (
                          <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                        )}
                        {check.status === "warning" && (
                          <AlertTriangle size={14} className="text-amber-400 shrink-0" />
                        )}
                        {check.status === "error" && (
                          <XCircle size={14} className="text-rose-400 shrink-0" />
                        )}
                        <span>{check.label}</span>
                      </div>
                      <p className="text-[11px] text-brand-white/50">{check.details}</p>
                    </div>
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded text-[9px] font-bold uppercase shrink-0",
                        check.status === "ok" && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
                        check.status === "warning" && "bg-amber-500/10 text-amber-400 border border-amber-500/20",
                        check.status === "error" && "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      )}
                    >
                      {check.status === "ok" ? "OK" : check.status === "warning" ? "ATTENTION" : "ERREUR"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALE DE CONFIRMATION GÉNÉRIQUE */}
      {/* ========================================================================= */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0f172a] border border-brand-white/20 rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-400">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-base font-heading font-black uppercase text-brand-white">
                  {confirmModal.title}
                </h3>
                <p className="text-[10px] text-brand-white/40 uppercase font-semibold">
                  Action administrative requise
                </p>
              </div>
            </div>

            <p className="text-xs text-brand-white/70 leading-relaxed">
              {confirmModal.description}
            </p>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-brand-white/10">
              <button
                type="button"
                disabled={isPending}
                onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-lg text-xs font-heading font-bold uppercase tracking-wider text-brand-white/60 hover:text-brand-white hover:bg-brand-white/5 transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleConfirmModalSubmit}
                className="px-4 py-2 rounded-lg text-xs font-heading font-bold uppercase tracking-wider bg-brand-blue hover:bg-brand-blue/90 text-brand-black transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isPending && <RefreshCw size={14} className="animate-spin" />}
                Confirmer l&apos;opération
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALE 1 : MODIFIER L'EMAIL DE CONNEXION */}
      {/* ========================================================================= */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0f172a] border border-brand-white/20 rounded-xl p-6 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-brand-white/10 pb-3">
              <div className="flex items-center gap-2.5 text-brand-white">
                <div className="w-8 h-8 rounded-lg bg-brand-blue/10 border border-brand-blue/30 flex items-center justify-center text-brand-blue shrink-0">
                  <Mail size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-heading font-bold uppercase text-brand-white">
                    Modifier l&apos;adresse email
                  </h3>
                  <p className="text-[10px] text-brand-white/40 uppercase font-semibold">
                    Compte administrateur
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isPending}
                onClick={() => setIsEmailModalOpen(false)}
                className="text-brand-white/40 hover:text-brand-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="p-3 rounded-lg bg-[#080d1a]/60 border border-brand-white/5 space-y-1 text-xs">
                <span className="text-[10px] uppercase font-bold text-brand-white/40">
                  Email actuel
                </span>
                <p className="font-semibold text-brand-white">{adminEmail}</p>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="admin-new-email"
                  className="block text-xs font-heading font-bold uppercase tracking-wider text-brand-white/70"
                >
                  Nouvelle adresse email
                </label>
                <input
                  id="admin-new-email"
                  type="email"
                  required
                  autoFocus
                  disabled={isPending}
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="nouvelle-adresse@exemple.fr"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#080d1a] border border-brand-white/20 text-brand-white text-xs placeholder:text-brand-white/30 focus:outline-none focus:border-brand-blue transition-colors disabled:opacity-50"
                />
              </div>

              <p className="text-[11px] text-brand-white/50 leading-relaxed">
                Un email de confirmation sera envoyé à la nouvelle adresse. Vous devrez cliquer sur le lien reçu pour valider définitivement le changement.
              </p>

              {modalError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                  <AlertTriangle size={14} className="shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {modalSuccess && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 size={14} className="shrink-0" />
                  <span>{modalSuccess}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-brand-white/10">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setIsEmailModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-heading font-bold uppercase tracking-wider text-brand-white/60 hover:text-brand-white hover:bg-brand-white/5 transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isPending || !emailInput}
                  className="px-4 py-2 rounded-lg text-xs font-heading font-bold uppercase tracking-wider bg-brand-blue hover:bg-brand-blue/90 text-brand-black transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isPending && <RefreshCw size={14} className="animate-spin" />}
                  Envoyer la demande
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALE 2 : MODIFIER LE MOT DE PASSE */}
      {/* ========================================================================= */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0f172a] border border-brand-white/20 rounded-xl p-6 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-brand-white/10 pb-3">
              <div className="flex items-center gap-2.5 text-brand-white">
                <div className="w-8 h-8 rounded-lg bg-brand-white/10 border border-brand-white/20 flex items-center justify-center text-brand-white shrink-0">
                  <Lock size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-heading font-bold uppercase text-brand-white">
                    Modifier le mot de passe
                  </h3>
                  <p className="text-[10px] text-brand-white/40 uppercase font-semibold">
                    Compte administrateur
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isPending}
                onClick={() => setIsPasswordModalOpen(false)}
                className="text-brand-white/40 hover:text-brand-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="admin-current-password"
                  className="block text-xs font-heading font-bold uppercase tracking-wider text-brand-white/70"
                >
                  Mot de passe actuel
                </label>
                <input
                  id="admin-current-password"
                  type="password"
                  required
                  autoFocus
                  disabled={isPending}
                  value={currentPasswordInput}
                  onChange={(e) => setCurrentPasswordInput(e.target.value)}
                  placeholder="Votre mot de passe actuel"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#080d1a] border border-brand-white/20 text-brand-white text-xs placeholder:text-brand-white/30 focus:outline-none focus:border-brand-blue transition-colors disabled:opacity-50"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="admin-new-password"
                  className="block text-xs font-heading font-bold uppercase tracking-wider text-brand-white/70"
                >
                  Nouveau mot de passe
                </label>
                <input
                  id="admin-new-password"
                  type="password"
                  required
                  disabled={isPending}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Minimum 8 caractères"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#080d1a] border border-brand-white/20 text-brand-white text-xs placeholder:text-brand-white/30 focus:outline-none focus:border-brand-blue transition-colors disabled:opacity-50"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="admin-confirm-password"
                  className="block text-xs font-heading font-bold uppercase tracking-wider text-brand-white/70"
                >
                  Confirmer le nouveau mot de passe
                </label>
                <input
                  id="admin-confirm-password"
                  type="password"
                  required
                  disabled={isPending}
                  value={confirmPasswordInput}
                  onChange={(e) => setConfirmPasswordInput(e.target.value)}
                  placeholder="Répétez le nouveau mot de passe"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#080d1a] border border-brand-white/20 text-brand-white text-xs placeholder:text-brand-white/30 focus:outline-none focus:border-brand-blue transition-colors disabled:opacity-50"
                />
              </div>

              <p className="text-[11px] text-brand-white/50 leading-relaxed">
                Le mot de passe doit comporter au moins 8 caractères. Il est chiffré et protégé par Supabase Auth.
              </p>

              {modalError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                  <AlertTriangle size={14} className="shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {modalSuccess && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 size={14} className="shrink-0" />
                  <span>{modalSuccess}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-brand-white/10">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-heading font-bold uppercase tracking-wider text-brand-white/60 hover:text-brand-white hover:bg-brand-white/5 transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isPending || !currentPasswordInput || !passwordInput || !confirmPasswordInput}
                  className="px-4 py-2 rounded-lg text-xs font-heading font-bold uppercase tracking-wider bg-brand-blue hover:bg-brand-blue/90 text-brand-black transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isPending && <RefreshCw size={14} className="animate-spin" />}
                  Modifier le mot de passe
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALE 3 : DÉCONNEXION DE TOUTES LES SESSIONS */}
      {/* ========================================================================= */}
      {isRevokeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0f172a] border border-rose-500/30 rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shrink-0">
                <LogOut size={20} />
              </div>
              <div>
                <h3 className="text-base font-heading font-black uppercase text-brand-white">
                  Déconnecter toutes les sessions ?
                </h3>
                <p className="text-[10px] text-rose-400 uppercase font-semibold">
                  Action de sécurité sensible
                </p>
              </div>
            </div>

            <p className="text-xs text-brand-white/70 leading-relaxed">
              Cette action déconnectera votre compte administrateur de tous les appareils actuellement connectés. Votre session active prendra fin immédiatement et vous serez redirigé vers la page de connexion.
            </p>

            {modalError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertTriangle size={14} className="shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-brand-white/10">
              <button
                type="button"
                disabled={isPending}
                onClick={() => setIsRevokeModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-heading font-bold uppercase tracking-wider text-brand-white/60 hover:text-brand-white hover:bg-brand-white/5 transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleRevokeAllSubmit}
                className="px-4 py-2 rounded-lg text-xs font-heading font-bold uppercase tracking-wider bg-rose-500 hover:bg-rose-600 text-white transition-colors disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-rose-500/20"
              >
                {isPending && <RefreshCw size={14} className="animate-spin" />}
                Déconnecter toutes les sessions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
