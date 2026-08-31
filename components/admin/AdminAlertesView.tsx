"use client";

import { useState } from "react";
import {
  Bell,
  Plus,
  Send,
  Trash2,
  Edit2,
  Calendar,
  AlertTriangle,
  Info,
  CheckCircle,
  Eye,
  X,
  Users,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface AlerteClub {
  id: string;
  title: string;
  category: "Info Club" | "Modification planning" | "Événement" | "Urgent";
  targetAudience: "Tous les membres" | "Cours Privés" | "Small Group";
  message: string;
  isActive: boolean;
  createdAt: string;
  expiresAt?: string;
  status: "Publiée" | "Brouillon" | "Archivée";
}

const mockAlertesInit: AlerteClub[] = [
  {
    id: "1",
    title: "Stage Spécial Boxe Anglaise - Inscriptions ouvertes",
    category: "Événement",
    targetAudience: "Tous les membres",
    message: "Le stage intensif du 15 Septembre est en ligne. Réservation obligatoire.",
    isActive: true,
    createdAt: "2026-08-30",
    expiresAt: "2026-09-15",
    status: "Publiée",
  },
  {
    id: "2",
    title: "Séances de sparring du Vendredi : protège-tibias obligatoires",
    category: "Info Club",
    targetAudience: "Tous les membres",
    message: "Rappel sécurité pour tous les participants aux sessions du vendredi soir.",
    isActive: true,
    createdAt: "2026-08-28",
    status: "Publiée",
  },
  {
    id: "3",
    title: "Maintenance salle de musculation",
    category: "Modification planning",
    targetAudience: "Tous les membres",
    message: "L'espace musculation sera indisponible le lundi 8 septembre de 8h à 12h.",
    isActive: false,
    createdAt: "2026-08-20",
    status: "Archivée",
  },
];

export default function AdminAlertesView() {
  const [alertes, setAlertes] = useState<AlerteClub[]>(mockAlertesInit);
  const [selectedFilter, setSelectedFilter] = useState<string>("Toutes");
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingAlerte, setEditingAlerte] = useState<AlerteClub | null>(null);

  // Formulaire d'ajout
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<AlerteClub["category"]>("Info Club");
  const [newTarget, setNewTarget] = useState<AlerteClub["targetAudience"]>("Tous les membres");
  const [newMessage, setNewMessage] = useState("");
  const [newExpiresAt, setNewExpiresAt] = useState("");
  const [newStatus, setNewStatus] = useState<AlerteClub["status"]>("Publiée");

  const filteredAlertes = alertes.filter((a) => {
    if (selectedFilter === "Toutes") return true;
    if (selectedFilter === "Actives") return a.isActive;
    if (selectedFilter === "Publiées") return a.status === "Publiée";
    if (selectedFilter === "Brouillons") return a.status === "Brouillon";
    if (selectedFilter === "Archivées") return a.status === "Archivée";
    return true;
  });

  const handleCreateAlerte = () => {
    if (!newTitle || !newMessage) return;

    const alerte: AlerteClub = {
      id: Date.now().toString(),
      title: newTitle,
      category: newCategory,
      targetAudience: newTarget,
      message: newMessage,
      isActive: newStatus === "Publiée",
      createdAt: new Date().toISOString().split("T")[0],
      expiresAt: newExpiresAt || undefined,
      status: newStatus,
    };

    setAlertes([alerte, ...alertes]);
    setIsAddModalOpen(false);
    // Reset form
    setNewTitle("");
    setNewMessage("");
    setNewExpiresAt("");
  };

  const handleToggleActive = (id: string) => {
    setAlertes(
      alertes.map((a) =>
        a.id === id ? { ...a, isActive: !a.isActive, status: !a.isActive ? "Publiée" : "Archivée" } : a
      )
    );
  };

  const handleDelete = (id: string) => {
    setAlertes(alertes.filter((a) => a.id !== id));
  };

  const handleSaveEdit = () => {
    if (!editingAlerte) return;
    setAlertes(alertes.map((a) => (a.id === editingAlerte.id ? editingAlerte : a)));
    setEditingAlerte(null);
  };

  const getCategoryBadge = (cat: AlerteClub["category"]) => {
    switch (cat) {
      case "Urgent":
        return "bg-red-500/15 text-red-400 border-red-500/30";
      case "Événement":
        return "bg-amber-500/15 text-amber-300 border-amber-500/30";
      case "Modification planning":
        return "bg-[#00d8ff]/15 text-[#00d8ff] border-[#00d8ff]/30";
      case "Info Club":
        return "bg-brand-blue/15 text-brand-blue border-brand-blue/30";
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          EN-TÊTE : TITRE + ACTION PRINCIPALE
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-brand-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Bell size={24} className="text-[#00d8ff]" />
            <h1 className="text-2xl sm:text-3xl font-heading font-black uppercase tracking-wider text-brand-white">
              Gestion des Alertes & Notifications
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-brand-white/60">
            Diffusez des annonces, rappels et informations importantes sur l&apos;espace membre.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#00d8ff] hover:bg-brand-white text-black font-heading font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-[#00d8ff]/20 cursor-pointer self-start sm:self-auto"
        >
          <Plus size={16} strokeWidth={3} />
          Créer une alerte
        </button>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          STATISTIQUES RAPIDES
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#0f172a] border border-brand-white/10 rounded-2xl p-4">
          <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-brand-white/40 block mb-1">
            Total alertes
          </span>
          <span className="text-2xl font-heading font-black text-brand-white">{alertes.length}</span>
        </div>
        <div className="bg-[#0f172a] border border-[#00d8ff]/20 rounded-2xl p-4">
          <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-[#00d8ff] block mb-1">
            Actives & Visibles
          </span>
          <span className="text-2xl font-heading font-black text-[#00d8ff]">
            {alertes.filter((a) => a.isActive).length}
          </span>
        </div>
        <div className="bg-[#0f172a] border border-brand-white/10 rounded-2xl p-4">
          <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-brand-white/40 block mb-1">
            Événements
          </span>
          <span className="text-2xl font-heading font-black text-amber-300">
            {alertes.filter((a) => a.category === "Événement").length}
          </span>
        </div>
        <div className="bg-[#0f172a] border border-brand-white/10 rounded-2xl p-4">
          <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-brand-white/40 block mb-1">
            Archivées
          </span>
          <span className="text-2xl font-heading font-black text-brand-white/40">
            {alertes.filter((a) => a.status === "Archivée").length}
          </span>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          FILTRES
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="flex flex-wrap gap-2">
        {["Toutes", "Actives", "Publiées", "Archivées"].map((filter) => (
          <button
            key={filter}
            onClick={() => setSelectedFilter(filter)}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-heading font-bold uppercase tracking-wider transition-all cursor-pointer border",
              selectedFilter === filter
                ? "bg-brand-blue text-brand-black border-brand-blue"
                : "bg-[#0f172a] text-brand-white/60 border-brand-white/10 hover:border-brand-white/20 hover:text-brand-white"
            )}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          LISTE DES ALERTES
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="space-y-3">
        {filteredAlertes.length === 0 ? (
          <div className="bg-[#0f172a]/60 border border-brand-white/10 rounded-2xl p-12 text-center text-brand-white/40 font-heading text-sm uppercase tracking-wider">
            Aucune alerte trouvée dans cette catégorie.
          </div>
        ) : (
          filteredAlertes.map((alerte) => (
            <motion.div
              key={alerte.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "bg-[#0f172a] border rounded-2xl p-5 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4",
                alerte.isActive ? "border-[#00d8ff]/30 shadow-lg shadow-[#00d8ff]/5" : "border-brand-white/10 opacity-75"
              )}
            >
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn("text-[10px] font-heading font-bold uppercase px-2 py-0.5 rounded border", getCategoryBadge(alerte.category))}>
                    {alerte.category}
                  </span>
                  <span className="text-[10px] font-heading font-bold uppercase px-2 py-0.5 rounded bg-brand-white/5 border border-brand-white/10 text-brand-white/70 flex items-center gap-1">
                    <Users size={11} />
                    {alerte.targetAudience}
                  </span>
                  <span className={cn("text-[10px] font-bold uppercase px-2 py-0.5 rounded", alerte.isActive ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" : "bg-neutral-500/15 text-neutral-400 border border-neutral-500/30")}>
                    {alerte.status}
                  </span>
                </div>

                <h3 className="text-base font-heading font-bold text-brand-white tracking-wide">
                  {alerte.title}
                </h3>

                <p className="text-xs text-brand-white/70 leading-relaxed max-w-3xl">
                  {alerte.message}
                </p>

                <div className="flex items-center gap-4 text-[11px] text-brand-white/40 pt-1">
                  <span>Créée le {alerte.createdAt}</span>
                  {alerte.expiresAt && <span>• Expire le {alerte.expiresAt}</span>}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 self-end md:self-center pt-2 md:pt-0 border-t md:border-t-0 border-brand-white/5 w-full md:w-auto justify-end">
                <button
                  onClick={() => handleToggleActive(alerte.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-heading font-bold uppercase tracking-wider transition-all border cursor-pointer",
                    alerte.isActive
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                      : "bg-brand-white/5 text-brand-white/50 border-brand-white/10 hover:text-brand-white"
                  )}
                >
                  {alerte.isActive ? "Désactiver" : "Activer"}
                </button>

                <button
                  onClick={() => setEditingAlerte(alerte)}
                  className="p-2 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white/70 hover:text-brand-white rounded-lg border border-brand-white/10 transition-colors cursor-pointer"
                  title="Modifier"
                >
                  <Edit2 size={14} />
                </button>

                <button
                  onClick={() => handleDelete(alerte.id)}
                  className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/20 transition-colors cursor-pointer"
                  title="Supprimer"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MODAL 1 : CRÉER UNE ALERTE
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
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
                  Nouvelle Alerte Club
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
                    placeholder="Ex: Rappel stage de boxe"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-brand-white focus:border-[#00d8ff] outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-brand-white/60 uppercase font-bold block mb-1.5">Catégorie</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as any)}
                      className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-brand-white focus:border-[#00d8ff] outline-none"
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
                      value={newTarget}
                      onChange={(e) => setNewTarget(e.target.value as any)}
                      className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-brand-white focus:border-[#00d8ff] outline-none"
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
                    placeholder="Rédigez le texte qui sera affiché aux membres..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-brand-white focus:border-[#00d8ff] outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-brand-white/60 uppercase font-bold block mb-1.5">Date d&apos;expiration (optionnel)</label>
                    <input
                      type="date"
                      value={newExpiresAt}
                      onChange={(e) => setNewExpiresAt(e.target.value)}
                      className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-brand-white focus:border-[#00d8ff] outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-brand-white/60 uppercase font-bold block mb-1.5">Statut initial</label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value as any)}
                      className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-brand-white focus:border-[#00d8ff] outline-none"
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
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
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
