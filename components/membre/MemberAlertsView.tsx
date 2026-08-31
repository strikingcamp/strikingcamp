"use client";

import { useState } from "react";
import {
  Bell,
  CheckCircle,
  AlertTriangle,
  Clock,
  Info,
  Calendar,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type AlertType =
  | "nouvel_evenement"
  | "confirmation"
  | "annulation"
  | "rappel"
  | "club_info";

interface AlertItem {
  id: string;
  type: AlertType;
  title: string;
  message: string;
  date: string;
  isRead?: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

const mockAlertsPreview: AlertItem[] = [
  {
    id: "1",
    type: "nouvel_evenement",
    title: "Stage Spécial Boxe Anglaise",
    message: "Un nouveau stage exclusif avec coach invité a été publié pour le 15 Septembre.",
    date: "Il y a 2 heures",
    actionUrl: "/evenements",
    actionLabel: "Voir l'événement",
  },
  {
    id: "2",
    type: "confirmation",
    title: "Réservation confirmée",
    message: "Votre créneau de Small Group Kick Boxing du Mardi 18:00 est confirmé.",
    date: "Hier à 14:30",
    actionUrl: "/membre/planning",
    actionLabel: "Voir mon planning",
  },
  {
    id: "3",
    type: "club_info",
    title: "Rappel Équipement",
    message: "Pensez à vos protège-tibias et bandages pour les séances de sparring du vendredi.",
    date: "Il y a 3 jours",
  },
];

export default function MemberAlertsView() {
  // Par défaut en V1 : état vide propre
  const [showDemo, setShowDemo] = useState(false);
  const alerts = showDemo ? mockAlertsPreview : [];

  const getAlertIcon = (type: AlertType) => {
    switch (type) {
      case "nouvel_evenement":
        return <Sparkles size={18} className="text-amber-400" />;
      case "confirmation":
        return <CheckCircle size={18} className="text-[#22c55e]" />;
      case "annulation":
        return <AlertTriangle size={18} className="text-red-400" />;
      case "rappel":
        return <Clock size={18} className="text-[#00d8ff]" />;
      case "club_info":
        return <Info size={18} className="text-brand-blue" />;
    }
  };

  const getAlertBadge = (type: AlertType) => {
    switch (type) {
      case "nouvel_evenement":
        return "bg-amber-500/15 text-amber-400 border-amber-500/30";
      case "confirmation":
        return "bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/30";
      case "annulation":
        return "bg-red-500/15 text-red-400 border-red-500/30";
      case "rappel":
        return "bg-[#00d8ff]/15 text-[#00d8ff] border-[#00d8ff]/30";
      case "club_info":
        return "bg-brand-blue/15 text-brand-blue border-brand-blue/30";
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6 pt-2">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Bell size={22} className="text-brand-blue" />
            <h1 className="text-3xl font-heading font-black uppercase tracking-wider text-brand-white">
              Mes Alertes
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-brand-white/50">
            Notifications de réservations, nouveaux événements, rappels et actualités.
          </p>
        </div>

        {/* Aperçu interactif V1 */}
        <button
          onClick={() => setShowDemo(!showDemo)}
          className="text-[11px] font-heading font-bold uppercase tracking-wider px-3 py-1.5 rounded-full bg-brand-white/5 hover:bg-brand-white/10 text-brand-white/60 hover:text-brand-white border border-brand-white/10 transition-colors cursor-pointer"
        >
          {showDemo ? "Afficher état réel (vide)" : "Aperçu des types"}
        </button>
      </div>

      {/* Catégories d'alertes prévues */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <div className="bg-[#0f172a] border border-amber-500/20 rounded-lg p-3 text-center">
          <Sparkles size={16} className="text-amber-400 mx-auto mb-1" />
          <p className="text-[10px] font-heading font-bold uppercase tracking-wider text-amber-300">
            Nouvel Événement
          </p>
        </div>
        <div className="bg-[#0f172a] border border-brand-white/5 rounded-lg p-3 text-center">
          <CheckCircle size={16} className="text-[#22c55e] mx-auto mb-1" />
          <p className="text-[10px] font-heading font-bold uppercase tracking-wider text-brand-white/80">
            Confirmation
          </p>
        </div>
        <div className="bg-[#0f172a] border border-brand-white/5 rounded-lg p-3 text-center">
          <AlertTriangle size={16} className="text-red-400 mx-auto mb-1" />
          <p className="text-[10px] font-heading font-bold uppercase tracking-wider text-brand-white/80">
            Annulation
          </p>
        </div>
        <div className="bg-[#0f172a] border border-brand-white/5 rounded-lg p-3 text-center">
          <Clock size={16} className="text-[#00d8ff] mx-auto mb-1" />
          <p className="text-[10px] font-heading font-bold uppercase tracking-wider text-brand-white/80">
            Rappel
          </p>
        </div>
        <div className="col-span-2 sm:col-span-1 bg-[#0f172a] border border-brand-white/5 rounded-lg p-3 text-center">
          <Info size={16} className="text-brand-blue mx-auto mb-1" />
          <p className="text-[10px] font-heading font-bold uppercase tracking-wider text-brand-white/80">
            Info Club
          </p>
        </div>
      </div>

      {/* Contenu : État vide ou Liste */}
      {alerts.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#0f172a]/60 border border-brand-white/10 border-dashed rounded-xl p-12 text-center space-y-4 my-8"
        >
          <div className="w-16 h-16 rounded-full bg-brand-white/5 text-brand-white/30 flex items-center justify-center mx-auto">
            <Bell size={28} />
          </div>
          <div>
            <h2 className="text-lg font-heading font-bold uppercase tracking-wider text-brand-white/80">
              Vous n'avez aucune alerte.
            </h2>
            <p className="text-xs text-brand-white/40 mt-1 max-w-sm mx-auto">
              Vos prochaines confirmations de réservations, nouveaux événements et informations du club apparaîtront ici.
            </p>
          </div>
          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <Link
              href="/evenements"
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/20 text-amber-300 border border-amber-500/30 font-heading font-bold text-xs uppercase tracking-wider rounded-sm hover:bg-amber-500 hover:text-black transition-colors"
            >
              <Sparkles size={14} />
              Découvrir les événements
            </Link>
            <Link
              href="/membre/planning"
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-blue text-brand-black font-heading font-bold text-xs uppercase tracking-wider rounded-sm hover:bg-brand-white transition-colors"
            >
              <Calendar size={14} />
              Accéder au planning
            </Link>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-3"
        >
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={cn(
                "rounded-xl p-4 sm:p-5 flex items-start gap-4 transition-all border",
                alert.type === "nouvel_evenement"
                  ? "bg-gradient-to-r from-[#171f30] to-[#0f172a] border-amber-500/30 shadow-lg shadow-amber-500/5"
                  : "bg-[#0f172a] border-brand-white/10 hover:border-brand-blue/30"
              )}
            >
              <div className="w-10 h-10 rounded-lg bg-brand-white/5 flex items-center justify-center shrink-0 mt-0.5">
                {getAlertIcon(alert.type)}
              </div>
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      "text-[10px] font-bold uppercase px-2 py-0.5 rounded border tracking-wider",
                      getAlertBadge(alert.type)
                    )}
                  >
                    {alert.title}
                  </span>
                  <span className="text-[11px] text-brand-white/40">{alert.date}</span>
                </div>
                <p className="text-xs sm:text-sm text-brand-white/80 leading-relaxed pt-0.5">
                  {alert.message}
                </p>

                {alert.actionUrl && alert.actionLabel && (
                  <div className="pt-2">
                    <Link
                      href={alert.actionUrl}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black border border-amber-500/40 rounded-sm text-xs font-heading font-bold uppercase tracking-wider transition-colors"
                    >
                      {alert.actionLabel}
                      <ArrowRight size={13} />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          ))}
        </motion.div>
      )}

    </div>
  );
}
