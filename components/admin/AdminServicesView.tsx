"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sliders,
  Sparkles,
  Users,
  User,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Power,
  ShieldCheck,
  Calendar,
  Lock,
  ArrowRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  getAdminServiceSettingsList,
  updateAdminServiceStatus,
  type ServiceSetting,
  DEFAULT_SERVICE_SETTINGS,
} from "@/lib/supabase/services";
import { cn } from "@/lib/utils";

export default function AdminServicesView() {
  const [supabase] = useState(() => createClient());
  const [services, setServices] = useState<ServiceSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchServices = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await getAdminServiceSettingsList(supabase);
      setServices(list);
    } catch (err) {
      console.error("[AdminServicesView] Erreur chargement services :", err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const handleToggleService = async (service: ServiceSetting) => {
    const newStatus = !service.is_active;
    setUpdatingKey(service.service_key);
    setToastMessage(null);

    // Optimistic update
    setServices((prev) =>
      prev.map((s) =>
        s.service_key === service.service_key ? { ...s, is_active: newStatus } : s
      )
    );

    const res = await updateAdminServiceStatus(supabase, service.service_key, newStatus);

    if (res.success) {
      setToastMessage({
        type: "success",
        text: `Le service « ${service.service_name} » est maintenant ${newStatus ? "ACTIVÉ" : "DÉSACTIVÉ"}.`,
      });
    } else {
      // Revert optimistic update
      setServices((prev) =>
        prev.map((s) =>
          s.service_key === service.service_key ? { ...s, is_active: service.is_active } : s
        )
      );
      setToastMessage({
        type: "error",
        text: res.error || "Impossible de mettre à jour le statut du service.",
      });
    }

    setUpdatingKey(null);
    setTimeout(() => {
      setToastMessage((current) => (current?.type === "success" ? null : current));
    }, 4000);
  };

  const getServiceIcon = (key: string) => {
    switch (key) {
      case "private":
        return <User size={22} className="text-[#00d8ff]" />;
      case "small_group":
        return <Users size={22} className="text-amber-400" />;
      case "events":
        return <Sparkles size={22} className="text-emerald-400" />;
      default:
        return <Sliders size={22} className="text-brand-blue" />;
    }
  };

  const getServiceColor = (key: string) => {
    switch (key) {
      case "private":
        return {
          border: "border-[#00d8ff]/30",
          bg: "bg-[#0b1b33]/60",
          glow: "shadow-[#00d8ff]/10",
          accent: "#00d8ff",
        };
      case "small_group":
        return {
          border: "border-amber-500/30",
          bg: "bg-amber-950/20",
          glow: "shadow-amber-500/10",
          accent: "#f59e0b",
        };
      case "events":
        return {
          border: "border-emerald-500/30",
          bg: "bg-emerald-950/20",
          glow: "shadow-emerald-500/10",
          accent: "#10b981",
        };
      default:
        return {
          border: "border-brand-blue/30",
          bg: "bg-brand-blue/10",
          glow: "shadow-brand-blue/10",
          accent: "#00d8ff",
        };
    }
  };

  return (
    <div className="space-y-8">
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          EN-TÊTE PRINCIPAL
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="border-b border-brand-white/10 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 text-xs text-brand-blue uppercase tracking-widest font-heading font-black">
            <Sliders size={16} />
            <span>Paramétrage Système · Striking Camp</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-heading font-black uppercase tracking-wider text-brand-white mt-1">
            Gestion des <span className="text-[#00d8ff]">Services</span>
          </h1>
          <p className="text-xs sm:text-sm text-brand-white/60 mt-1 max-w-2xl">
            Activez ou désactivez globalement certains modules. Les modifications s&apos;appliquent en temps réel à l&apos;espace membre et verrouillent les réservations côté Supabase.
          </p>
        </div>

        <button
          onClick={fetchServices}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white text-xs font-heading font-bold uppercase tracking-wider rounded-lg border border-brand-white/10 transition-all cursor-pointer disabled:opacity-50 shrink-0 self-start sm:self-auto"
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
          CARTE D'AVERTISSEMENT SÉCURITÉ ARCHITECTURE
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="bg-[#0b1b33]/40 border border-[#00d8ff]/20 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 text-xs text-brand-white/80">
        <ShieldCheck size={20} className="text-[#00d8ff] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold uppercase tracking-wider text-[#00d8ff]">
            Sécurité Multi-Niveaux & Protection des Données
          </p>
          <p className="text-brand-white/70 leading-relaxed">
            Désactiver un service masque instantanément ses sections dans l&apos;espace membre et bloque les RPCs de réservation (ex : <code className="bg-black/40 px-1 py-0.5 rounded text-amber-300">create_small_group_booking</code>). <strong>Aucune donnée historique ni séance n&apos;est supprimée</strong> de la base de données.
          </p>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          GRILLE DES SERVICES
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {services.map((service) => {
          const colors = getServiceColor(service.service_key);
          const isPending = updatingKey === service.service_key;

          return (
            <motion.div
              key={service.service_key}
              layout
              className={cn(
                "rounded-2xl border p-6 flex flex-col justify-between gap-5 transition-all shadow-lg",
                service.is_active
                  ? `${colors.border} ${colors.bg} ${colors.glow}`
                  : "border-zinc-800 bg-zinc-900/60 opacity-70"
              )}
            >
              {/* Top info */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-brand-white/5 border border-brand-white/10 flex items-center justify-center">
                    {getServiceIcon(service.service_key)}
                  </div>

                  {/* Badge Statut */}
                  <span
                    className={cn(
                      "text-[10px] font-black uppercase px-2.5 py-1 rounded-full border flex items-center gap-1.5",
                      service.is_active
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                        : "bg-red-500/15 text-red-400 border-red-500/30"
                    )}
                  >
                    <span
                      className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        service.is_active ? "bg-emerald-400 animate-pulse" : "bg-red-400"
                      )}
                    />
                    {service.is_active ? "Actif" : "Désactivé"}
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-heading font-black uppercase tracking-wider text-brand-white">
                    {service.service_name}
                  </h3>
                  <p className="text-xs text-brand-white/60 mt-1 leading-relaxed min-h-[36px]">
                    {service.description || "Service Striking Camp"}
                  </p>
                </div>

                {/* Détails du comportement */}
                <div className="bg-black/30 border border-brand-white/5 rounded-xl p-3 text-[11px] space-y-1.5 text-brand-white/70">
                  <div className="font-bold text-brand-white/90 uppercase tracking-wider flex items-center gap-1">
                    <ArrowRight size={12} className="text-[#00d8ff]" />
                    Effet immédiat :
                  </div>
                  {service.service_key === "small_group" && (
                    <p>
                      {service.is_active
                        ? "Visible sur /membre/planning (23 séances/semaine réservables)."
                        : "Onglet et créneaux masqués. Réservations bloquées côté Supabase."}
                    </p>
                  )}
                  {service.service_key === "private" && (
                    <p>
                      {service.is_active
                        ? "Grille des 6 créneaux journaliers accessible et réservable."
                        : "Planning des cours privés masqué. Réservations bloquées côté Supabase."}
                    </p>
                  )}
                  {service.service_key === "events" && (
                    <p>
                      {service.is_active
                        ? "Page et bannières événements visibles pour les membres."
                        : "Section événements masquée dans l'espace membre."}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Switch Switch Button */}
              <div className="pt-4 border-t border-brand-white/10 flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-brand-white/50 uppercase tracking-wider">
                  Contrôle d&apos;accès
                </span>

                <button
                  type="button"
                  onClick={() => handleToggleService(service)}
                  disabled={isPending}
                  aria-label={`Basculer le statut de ${service.service_name}`}
                  className={cn(
                    "relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#00d8ff] focus:ring-offset-2 focus:ring-offset-[#0f172a] disabled:opacity-50",
                    service.is_active ? "bg-emerald-500 shadow-lg shadow-emerald-500/20" : "bg-zinc-700"
                  )}
                >
                  <span className="sr-only">Activer ou désactiver</span>
                  <span
                    className={cn(
                      "pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out flex items-center justify-center",
                      service.is_active ? "translate-x-6" : "translate-x-0"
                    )}
                  >
                    {isPending ? (
                      <Loader2 size={12} className="text-black animate-spin" />
                    ) : service.is_active ? (
                      <Power size={12} className="text-emerald-600 font-black" />
                    ) : (
                      <Power size={12} className="text-zinc-500 font-black" />
                    )}
                  </span>
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
