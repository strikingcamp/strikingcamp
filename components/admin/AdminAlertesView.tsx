"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  X,
  AlertTriangle,
  Info,
  Calendar,
  Sparkles,
  Send,
  Radio,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface AdminAlerteItem {
  id: string;
  title: string;
  category: "Info Club" | "Modification planning" | "Événement" | "Urgent";
  message: string;
  targetAudience: "Tous les membres" | "Cours Privés" | "Small Group";
  publishedAt: string;
  expiresAt?: string;
  status: "Publiée" | "Brouillon" | "Archivée";
  isActive: boolean;
}

const INITIAL_ALERTES: AdminAlerteItem[] = [
  {
    id: "alert_1",
    title: "Mise à jour des créneaux Small Group de rentrée",
    category: "Modification planning",
    message: "Le nouveau planning officiel Small Group (23 séances hebdomadaires) est désormais actif. Pensez à réserver vos créneaux.",
    targetAudience: "Tous les membres",
    publishedAt: "2026-08-30",
    expiresAt: "2026-09-15",
    status: "Publiée",
    isActive: true,
  },
  {
    id: "alert_2",
    title: "Stage Spécial Sparring & Striking — 12 Septembre",
    category: "Événement",
    message: "Inscriptions ouvertes pour le masterclass exclusif animé par le head coach. Places limitées.",
    targetAudience: "Tous les membres",
    publishedAt: "2026-08-28",
    expiresAt: "2026-09-12",
    status: "Publiée",
    isActive: true,
  },
  {
    id: "alert_3",
    title: "Rappel : Règle des 24h pour les cours privés",
    category: "Info Club",
    message: "Toute annulation ou modification de cours privé doit être effectuée au moins 24h avant la séance afin de préserver votre quota.",
    targetAudience: "Cours Privés",
    publishedAt: "2026-08-25",
    expiresAt: "2026-10-01",
    status: "Publiée",
    isActive: true,
  },
];

function getCategoryBadge(cat: AdminAlerteItem["category"]) {
  switch (cat) {
    case "Urgent":
      return "bg-red-500/20 text-red-400 border-red-500/30";
    case "Modification planning":
      return "bg-[#00d8ff]/15 text-[#00d8ff] border-[#00d8ff]/30";
    case "Événement":
      return "bg-purple-500/20 text-purple-400 border-purple-500/30";
    case "Info Club":
    default:
      return "bg-brand-white/10 text-brand-white/70 border-brand-white/20";
  }
}

export default function AdminAlertesView() {
  const [alertes, setAlertes] = useState<AdminAlerteItem[]>(INITIAL_ALERTES);
  const [filterCategory, setFilterCategory] = useState<string>("Toutes");

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAlerte, setEditingAlerte] = useState<AdminAlerteItem | null>(null);

  // Formulaire d'ajout
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState<AdminAlerteItem["category"]>("Info Club");
  const [formMessage, setFormMessage] = useState("");
  const [formTarget, setFormTarget] = useState<AdminAlerteItem["targetAudience"]>("Tous les membres");
  const [formExpiresAt, setFormExpiresAt] = useState("2026-09-30");
  const [formStatus, setFormStatus] = useState<AdminAlerteItem["status"]>("Publiée");

  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleCreateAlerte = () => {
    if (!formTitle.trim()) return;

    const newAlerte: AdminAlerteItem = {
      id: `alert_${Date.now()}`,
      title: formTitle,
      category: formCategory,
      message: formMessage,
      targetAudience: formTarget,
      publishedAt: new Date().toISOString().split("T")[0],
      expiresAt: formExpiresAt,
      status: formStatus,
      isActive: formStatus === "Publiée",
    };

    setAlertes(prev => [newAlerte, ...prev]);
    setIsAddModalOpen(false);
    setFormTitle("");
    setFormMessage("");
    showNotification(`Alerte "${newAlerte.title}" diffusée.`);
  };

  const handleSaveEdit = () => {
    if (!editingAlerte) return;
    setAlertes(prev => prev.map(a => a.id === editingAlerte.id ? editingAlerte : a));
    setEditingAlerte(null);
    showNotification(`Alerte "${editingAlerte.title}" mise à jour.`);
  };

  const toggleAlerteActive = (id: string) => {
    setAlertes(prev => prev.map(a => a.id === id ? { ...a, isActive: !a.isActive } : a));
    showNotification("Statut de l'alerte mis à jour.");
  };

  const handleDeleteAlerte = (id: string) => {
    setAlertes(prev => prev.filter(a => a.id !== id));
    showNotification("Alerte supprimée.");
  };

  const filteredAlertes = alertes.filter(a => {
    if (filterCategory === "Toutes") return true;
    return a.category === filterCategory;
  });

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-6xl mx-auto">
      
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-white/10 pb-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#00d8ff]/10 border border-[#00d8ff]/30 rounded-full text-[#00d8ff] text-xs font-semibold uppercase tracking-wider mb-1">
            <Bell size={13} />
            <span>Centre de communication & alertes</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-heading font-black uppercase tracking-wider text-brand-white">
            ALERTES & MESSAGES
          </h1>
          <p className="text-xs sm:text-sm text-brand-white/60">
            Diffusez des notifications, actualités et modifications importantes auprès des membres.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#00d8ff] hover:bg-brand-white text-black font-heading font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-[#00d8ff]/20 cursor-pointer shrink-0"
        >
          <Plus size={16} />
          Créer une alerte
        </button>
      </div>

      {/* Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-6 right-6 z-50 bg-[#0f172a] border border-[#00d8ff] text-[#00d8ff] px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-heading font-bold uppercase"
          >
            <CheckCircle size={16} />
            <span>{notification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filtres par catégorie */}
      <div className="flex flex-wrap gap-2">
        {["Toutes", "Info Club", "Modification planning", "Événement", "Urgent"].map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition-all cursor-pointer",
              filterCategory === cat
                ? "bg-[#00d8ff] text-black shadow-md shadow-[#00d8ff]/20"
                : "bg-brand-white/5 text-brand-white/60 hover:text-brand-white hover:bg-brand-white/10 border border-brand-white/10"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Liste des alertes */}
      <div className="grid grid-cols-1 gap-4">
        {filteredAlertes.map(alerte => (
          <div
            key={alerte.id}
            className={cn(
              "p-5 sm:p-6 rounded-2xl border transition-all space-y-3 shadow-xl",
              alerte.isActive
                ? "bg-[#0f172a] border-brand-white/10 hover:border-[#00d8ff]/40"
                : "bg-zinc-900/60 border-zinc-800 opacity-60"
            )}
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="text-lg sm:text-xl font-heading font-black uppercase tracking-wider text-brand-white">
                    {alerte.title}
                  </h3>
                  <span className={cn("text-[10px] font-bold uppercase px-2.5 py-0.5 rounded border", getCategoryBadge(alerte.category))}>
                    {alerte.category}
                  </span>
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-brand-white/5 border border-brand-white/10 text-brand-white/60">
                    Cible : {alerte.targetAudience}
                  </span>
                  <span className={cn(
                    "text-[10px] font-black uppercase px-2 py-0.5 rounded border",
                    alerte.status === "Publiée"
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      : "bg-zinc-800 text-zinc-400 border-zinc-700"
                  )}>
                    {alerte.status}
                  </span>
                </div>

                <p className="text-xs text-brand-white/80 leading-relaxed pt-1">
                  {alerte.message}
                </p>

                <div className="flex items-center gap-4 text-[11px] text-brand-white/40 pt-2 border-t border-brand-white/5">
                  <span>Publiée le : <strong>{alerte.publishedAt}</strong></span>
                  {alerte.expiresAt && <span>Expire le : <strong>{alerte.expiresAt}</strong></span>}
                </div>
              </div>

              {/* Actions */}
              <div className="flex sm:flex-col items-center gap-2 justify-end shrink-0">
                <button
                  onClick={() => setEditingAlerte(alerte)}
                  className="px-3.5 py-2 bg-brand-white/5 hover:bg-brand-white/15 text-brand-white border border-brand-white/10 rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Edit2 size={13} />
                  Modifier
                </button>

                <button
                  onClick={() => toggleAlerteActive(alerte.id)}
                  className={cn(
                    "px-3.5 py-2 rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition-colors cursor-pointer",
                    alerte.isActive
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-zinc-800 text-zinc-500 border border-zinc-700"
                  )}
                >
                  {alerte.isActive ? "Active" : "Désactivée"}
                </button>

                <button
                  onClick={() => handleDeleteAlerte(alerte.id)}
                  className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer"
                  title="Supprimer"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MODAL 1 : CRÉER UNE ALERTE
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-[#0f172a] border border-[#00d8ff]/30 rounded-2xl p-6 sm:p-8 shadow-2xl z-10 space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-brand-white/10">
                <h3 className="text-xl font-heading font-black uppercase tracking-wider text-brand-white">
                  Créer et diffuser une alerte
                </h3>
                <button onClick={() => setIsAddModalOpen(false)} className="text-brand-white/50 hover:text-brand-white">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="text-brand-white/60 uppercase font-bold block mb-1.5">Titre du message</label>
                  <input
                    type="text"
                    placeholder="Ex: Modification exceptionnelle de planning"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-brand-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-brand-white/60 uppercase font-bold block mb-1.5">Catégorie</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as any)}
                      className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-brand-white"
                    >
                      <option value="Info Club">Info Club</option>
                      <option value="Modification planning">Modification planning</option>
                      <option value="Événement">Événement</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-brand-white/60 uppercase font-bold block mb-1.5">Public cible</label>
                    <select
                      value={formTarget}
                      onChange={(e) => setFormTarget(e.target.value as any)}
                      className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-brand-white"
                    >
                      <option value="Tous les membres">Tous les membres</option>
                      <option value="Cours Privés">Cours Privés</option>
                      <option value="Small Group">Small Group</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-brand-white/60 uppercase font-bold block mb-1.5">Message complet</label>
                  <textarea
                    rows={3}
                    placeholder="Contenu détaillé de l'alerte..."
                    value={formMessage}
                    onChange={(e) => setFormMessage(e.target.value)}
                    className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-brand-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-brand-white/60 uppercase font-bold block mb-1.5">Date d&apos;expiration</label>
                    <input
                      type="date"
                      value={formExpiresAt}
                      onChange={(e) => setFormExpiresAt(e.target.value)}
                      className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-brand-white"
                    />
                  </div>
                  <div>
                    <label className="text-brand-white/60 uppercase font-bold block mb-1.5">Statut initial</label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as any)}
                      className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-brand-white"
                    >
                      <option value="Publiée">Publiée</option>
                      <option value="Brouillon">Brouillon</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-3 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white/70 font-heading font-bold text-xs uppercase rounded-xl transition-all cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  onClick={handleCreateAlerte}
                  className="flex-1 py-3 bg-[#00d8ff] hover:bg-brand-white text-black font-heading font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg shadow-[#00d8ff]/20"
                >
                  Publier l&apos;alerte
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MODAL 2 : MODIFIER UNE ALERTE
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatePresence>
        {editingAlerte && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setEditingAlerte(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-[#0f172a] border border-[#00d8ff]/30 rounded-2xl p-6 sm:p-8 shadow-2xl z-10 space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-brand-white/10">
                <h3 className="text-xl font-heading font-black uppercase tracking-wider text-brand-white">
                  Modifier l&apos;alerte
                </h3>
                <button onClick={() => setEditingAlerte(null)} className="text-brand-white/50 hover:text-brand-white">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="text-brand-white/60 uppercase font-bold block mb-1.5">Titre du message</label>
                  <input
                    type="text"
                    value={editingAlerte.title}
                    onChange={(e) => setEditingAlerte({ ...editingAlerte, title: e.target.value })}
                    className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-brand-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-brand-white/60 uppercase font-bold block mb-1.5">Catégorie</label>
                    <select
                      value={editingAlerte.category}
                      onChange={(e) => setEditingAlerte({ ...editingAlerte, category: e.target.value as any })}
                      className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-brand-white"
                    >
                      <option value="Info Club">Info Club</option>
                      <option value="Modification planning">Modification planning</option>
                      <option value="Événement">Événement</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-brand-white/60 uppercase font-bold block mb-1.5">Public cible</label>
                    <select
                      value={editingAlerte.targetAudience}
                      onChange={(e) => setEditingAlerte({ ...editingAlerte, targetAudience: e.target.value as any })}
                      className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-brand-white"
                    >
                      <option value="Tous les membres">Tous les membres</option>
                      <option value="Cours Privés">Cours Privés</option>
                      <option value="Small Group">Small Group</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-brand-white/60 uppercase font-bold block mb-1.5">Message complet</label>
                  <textarea
                    rows={3}
                    value={editingAlerte.message}
                    onChange={(e) => setEditingAlerte({ ...editingAlerte, message: e.target.value })}
                    className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-brand-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-brand-white/60 uppercase font-bold block mb-1.5">Date d&apos;expiration</label>
                    <input
                      type="date"
                      value={editingAlerte.expiresAt || ""}
                      onChange={(e) => setEditingAlerte({ ...editingAlerte, expiresAt: e.target.value })}
                      className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-brand-white"
                    />
                  </div>
                  <div>
                    <label className="text-brand-white/60 uppercase font-bold block mb-1.5">Statut</label>
                    <select
                      value={editingAlerte.status}
                      onChange={(e) => setEditingAlerte({ ...editingAlerte, status: e.target.value as any })}
                      className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-brand-white"
                    >
                      <option value="Publiée">Publiée</option>
                      <option value="Brouillon">Brouillon</option>
                      <option value="Archivée">Archivée</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-brand-white/10">
                  <span className="text-brand-white font-bold uppercase">Active & Visible</span>
                  <input
                    type="checkbox"
                    checked={editingAlerte.isActive}
                    onChange={(e) => setEditingAlerte({ ...editingAlerte, isActive: e.target.checked })}
                    className="w-5 h-5 accent-[#00d8ff] rounded cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setEditingAlerte(null)}
                  className="flex-1 py-3 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white/70 font-heading font-bold text-xs uppercase rounded-xl transition-all cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 py-3 bg-[#00d8ff] hover:bg-brand-white text-black font-heading font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg shadow-[#00d8ff]/20"
                >
                  Enregistrer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
