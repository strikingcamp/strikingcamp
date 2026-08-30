"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  X,
  Target,
  Flame,
  Award,
  Zap,
  Calendar,
  Lock,
  Eye,
  Sliders,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface AdminDefiItem {
  id: string;
  title: string;
  category: "Assiduité" | "Performance" | "Technique" | "Spécial";
  description: string;
  rules: string;
  startDate?: string;
  endDate?: string;
  pointsExp: number;
  badgeReward: string;
  status: "Publié" | "Brouillon" | "Archivé";
  isActive: boolean;
}

const INITIAL_DEFIS: AdminDefiItem[] = [
  {
    id: "defi_1",
    title: "Assiduité 4 Semaines",
    category: "Assiduité",
    description: "Effectuez au moins 1 séance par semaine pendant 4 semaines consécutives.",
    rules: "Minimum 4 séances validées par le coach en Small Group ou Cours Privé sur 28 jours.",
    startDate: "2026-09-01",
    endDate: "2026-09-30",
    pointsExp: 500,
    badgeReward: "Striker Régulier",
    status: "Publié",
    isActive: true,
  },
  {
    id: "defi_2",
    title: "100 Rounds Club",
    category: "Performance",
    description: "Accumulez 100 rounds d'entraînement intenses sur le mois de Septembre.",
    rules: "Comptabilisation automatique : 5 rounds par cours Boxing Bag / Shred / Striking.",
    startDate: "2026-09-01",
    endDate: "2026-09-30",
    pointsExp: 1000,
    badgeReward: "Gant d'Acier",
    status: "Publié",
    isActive: true,
  },
  {
    id: "defi_3",
    title: "Master Striking",
    category: "Technique",
    description: "Validez l'enchaînement technique officiel de niveau Confirmé avec votre coach.",
    rules: "Validation manuelle par le coach lors d'une séance privée ou d'un cours Élite.",
    startDate: "2026-09-15",
    endDate: "2026-10-15",
    pointsExp: 750,
    badgeReward: "Maître du Ring",
    status: "Brouillon",
    isActive: false,
  },
];

export default function AdminDefisView() {
  const [defis, setDefis] = useState<AdminDefiItem[]>(INITIAL_DEFIS);
  const [filterStatus, setFilterStatus] = useState<"Tous" | "Publié" | "Brouillon">("Tous");

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingDefi, setEditingDefi] = useState<AdminDefiItem | null>(null);

  // Formulaire d'ajout
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState<AdminDefiItem["category"]>("Performance");
  const [formDescription, setFormDescription] = useState("");
  const [formRules, setFormRules] = useState("");
  const [formStartDate, setFormStartDate] = useState("2026-09-01");
  const [formEndDate, setFormEndDate] = useState("2026-09-30");
  const [formPointsExp, setFormPointsExp] = useState(500);
  const [formBadgeReward, setFormBadgeReward] = useState("Champion du Camp");
  const [formStatus, setFormStatus] = useState<AdminDefiItem["status"]>("Publié");

  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleCreateDefi = () => {
    if (!formTitle.trim()) return;

    const newDefi: AdminDefiItem = {
      id: `defi_${Date.now()}`,
      title: formTitle,
      category: formCategory,
      description: formDescription,
      rules: formRules,
      startDate: formStartDate,
      endDate: formEndDate,
      pointsExp: formPointsExp,
      badgeReward: formBadgeReward,
      status: formStatus,
      isActive: formStatus === "Publié",
    };

    setDefis(prev => [newDefi, ...prev]);
    setIsAddModalOpen(false);
    setFormTitle("");
    setFormDescription("");
    setFormRules("");
    showNotification(`Défi "${newDefi.title}" créé avec succès.`);
  };

  const handleSaveEdit = () => {
    if (!editingDefi) return;
    setDefis(prev => prev.map(d => d.id === editingDefi.id ? editingDefi : d));
    setEditingDefi(null);
    showNotification(`Défi "${editingDefi.title}" mis à jour.`);
  };

  const toggleDefiActive = (id: string) => {
    setDefis(prev => prev.map(d => d.id === id ? { ...d, isActive: !d.isActive } : d));
    showNotification("Statut du défi mis à jour.");
  };

  const handleDeleteDefi = (id: string) => {
    setDefis(prev => prev.filter(d => d.id !== id));
    showNotification("Défi supprimé.");
  };

  const filteredDefis = defis.filter(d => {
    if (filterStatus === "Tous") return true;
    return d.status === filterStatus;
  });

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-6xl mx-auto">
      
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-white/10 pb-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#00d8ff]/10 border border-[#00d8ff]/30 rounded-full text-[#00d8ff] text-xs font-semibold uppercase tracking-wider mb-1">
            <Trophy size={13} />
            <span>Gamification & Récompenses</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-heading font-black uppercase tracking-wider text-brand-white">
            GESTION DES DÉFIS
          </h1>
          <p className="text-xs sm:text-sm text-brand-white/60">
            Créez, publiez et modifiez les défis proposés aux membres dans l&apos;application.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#00d8ff] hover:bg-brand-white text-black font-heading font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-[#00d8ff]/20 cursor-pointer shrink-0"
        >
          <Plus size={16} />
          Créer un nouveau défi
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

      {/* Filtres rapides */}
      <div className="flex gap-2">
        {(["Tous", "Publié", "Brouillon"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setFilterStatus(tab)}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition-all cursor-pointer",
              filterStatus === tab
                ? "bg-[#00d8ff] text-black shadow-md shadow-[#00d8ff]/20"
                : "bg-brand-white/5 text-brand-white/60 hover:text-brand-white hover:bg-brand-white/10 border border-brand-white/10"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Liste des défis */}
      <div className="grid grid-cols-1 gap-4">
        {filteredDefis.map(defi => (
          <div
            key={defi.id}
            className={cn(
              "p-5 sm:p-6 rounded-2xl border transition-all space-y-4 shadow-xl",
              defi.isActive
                ? "bg-[#0f172a] border-brand-white/10 hover:border-[#00d8ff]/40"
                : "bg-zinc-900/60 border-zinc-800 opacity-60"
            )}
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="text-lg sm:text-xl font-heading font-black uppercase tracking-wider text-brand-white">
                    {defi.title}
                  </h3>
                  <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded bg-[#00d8ff]/15 text-[#00d8ff] border border-[#00d8ff]/30">
                    {defi.category}
                  </span>
                  <span className={cn(
                    "text-[10px] font-black uppercase px-2.5 py-0.5 rounded border",
                    defi.status === "Publié"
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      : "bg-zinc-800 text-zinc-400 border-zinc-700"
                  )}>
                    {defi.status}
                  </span>
                </div>

                <p className="text-xs text-brand-white/80 leading-relaxed">
                  {defi.description}
                </p>

                <div className="p-3 bg-black/40 border border-brand-white/5 rounded-xl text-[11px] text-brand-white/60 space-y-1">
                  <div><strong>Règles & Objectifs :</strong> {defi.rules}</div>
                  <div className="flex items-center gap-4 pt-1 text-xs text-brand-white/70">
                    {defi.startDate && (
                      <span className="flex items-center gap-1">
                        <Calendar size={12} className="text-[#00d8ff]" />
                        Période : {defi.startDate} → {defi.endDate || "Permanent"}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-[#00d8ff] font-bold">
                      <Sparkles size={12} />
                      +{defi.pointsExp} XP
                    </span>
                    <span className="flex items-center gap-1 text-amber-400 font-bold">
                      <Award size={12} />
                      Badge : {defi.badgeReward}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex sm:flex-col items-center gap-2 justify-end shrink-0">
                <button
                  onClick={() => setEditingDefi(defi)}
                  className="px-3.5 py-2 bg-brand-white/5 hover:bg-brand-white/15 text-brand-white border border-brand-white/10 rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Edit2 size={13} />
                  Modifier
                </button>

                <button
                  onClick={() => toggleDefiActive(defi.id)}
                  className={cn(
                    "px-3.5 py-2 rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition-colors cursor-pointer",
                    defi.isActive
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-zinc-800 text-zinc-500 border border-zinc-700"
                  )}
                >
                  {defi.isActive ? "Actif" : "Désactivé"}
                </button>

                <button
                  onClick={() => handleDeleteDefi(defi.id)}
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
          MODAL 1 : CRÉER UN DÉFI
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
              className="relative w-full max-w-xl bg-[#0f172a] border border-[#00d8ff]/30 rounded-2xl p-6 sm:p-8 shadow-2xl z-10 space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-brand-white/10">
                <h3 className="text-xl font-heading font-black uppercase tracking-wider text-brand-white">
                  Créer un défi
                </h3>
                <button onClick={() => setIsAddModalOpen(false)} className="text-brand-white/50 hover:text-brand-white">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="text-brand-white/60 uppercase font-bold block mb-1.5">Titre du défi</label>
                  <input
                    type="text"
                    placeholder="Ex: 100 Rounds Club"
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
                      <option value="Assiduité">Assiduité</option>
                      <option value="Performance">Performance</option>
                      <option value="Technique">Technique</option>
                      <option value="Spécial">Spécial</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-brand-white/60 uppercase font-bold block mb-1.5">Statut initial</label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as any)}
                      className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-brand-white"
                    >
                      <option value="Publié">Publié</option>
                      <option value="Brouillon">Brouillon</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-brand-white/60 uppercase font-bold block mb-1.5">Description pour le membre</label>
                  <textarea
                    rows={2}
                    placeholder="Courte description stimulante..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-brand-white"
                  />
                </div>

                <div>
                  <label className="text-brand-white/60 uppercase font-bold block mb-1.5">Règles & Conditions de validation</label>
                  <textarea
                    rows={2}
                    placeholder="Ex: 5 rounds validés par séance..."
                    value={formRules}
                    onChange={(e) => setFormRules(e.target.value)}
                    className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-brand-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-brand-white/60 uppercase font-bold block mb-1.5">Date début</label>
                    <input
                      type="date"
                      value={formStartDate}
                      onChange={(e) => setFormStartDate(e.target.value)}
                      className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-brand-white"
                    />
                  </div>
                  <div>
                    <label className="text-brand-white/60 uppercase font-bold block mb-1.5">Date fin</label>
                    <input
                      type="date"
                      value={formEndDate}
                      onChange={(e) => setFormEndDate(e.target.value)}
                      className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-brand-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-brand-white/60 uppercase font-bold block mb-1.5">Points XP</label>
                    <input
                      type="number"
                      value={formPointsExp}
                      onChange={(e) => setFormPointsExp(Number(e.target.value))}
                      className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-brand-white"
                    />
                  </div>
                  <div>
                    <label className="text-brand-white/60 uppercase font-bold block mb-1.5">Nom du Badge</label>
                    <input
                      type="text"
                      value={formBadgeReward}
                      onChange={(e) => setFormBadgeReward(e.target.value)}
                      className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-brand-white"
                    />
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
                  onClick={handleCreateDefi}
                  className="flex-1 py-3 bg-[#00d8ff] hover:bg-brand-white text-black font-heading font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg shadow-[#00d8ff]/20"
                >
                  Créer et publier
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MODAL 2 : MODIFIER UN DÉFI
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatePresence>
        {editingDefi && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setEditingDefi(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-xl bg-[#0f172a] border border-[#00d8ff]/30 rounded-2xl p-6 sm:p-8 shadow-2xl z-10 space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-brand-white/10">
                <h3 className="text-xl font-heading font-black uppercase tracking-wider text-brand-white">
                  Modifier le défi
                </h3>
                <button onClick={() => setEditingDefi(null)} className="text-brand-white/50 hover:text-brand-white">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="text-brand-white/60 uppercase font-bold block mb-1.5">Titre du défi</label>
                  <input
                    type="text"
                    value={editingDefi.title}
                    onChange={(e) => setEditingDefi({ ...editingDefi, title: e.target.value })}
                    className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-brand-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-brand-white/60 uppercase font-bold block mb-1.5">Catégorie</label>
                    <select
                      value={editingDefi.category}
                      onChange={(e) => setEditingDefi({ ...editingDefi, category: e.target.value as any })}
                      className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-brand-white"
                    >
                      <option value="Assiduité">Assiduité</option>
                      <option value="Performance">Performance</option>
                      <option value="Technique">Technique</option>
                      <option value="Spécial">Spécial</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-brand-white/60 uppercase font-bold block mb-1.5">Statut</label>
                    <select
                      value={editingDefi.status}
                      onChange={(e) => setEditingDefi({ ...editingDefi, status: e.target.value as any })}
                      className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-brand-white"
                    >
                      <option value="Publié">Publié</option>
                      <option value="Brouillon">Brouillon</option>
                      <option value="Archivé">Archivé</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-brand-white/60 uppercase font-bold block mb-1.5">Description</label>
                  <textarea
                    rows={2}
                    value={editingDefi.description}
                    onChange={(e) => setEditingDefi({ ...editingDefi, description: e.target.value })}
                    className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-brand-white"
                  />
                </div>

                <div>
                  <label className="text-brand-white/60 uppercase font-bold block mb-1.5">Règles & Conditions</label>
                  <textarea
                    rows={2}
                    value={editingDefi.rules}
                    onChange={(e) => setEditingDefi({ ...editingDefi, rules: e.target.value })}
                    className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-brand-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-brand-white/60 uppercase font-bold block mb-1.5">Points XP</label>
                    <input
                      type="number"
                      value={editingDefi.pointsExp}
                      onChange={(e) => setEditingDefi({ ...editingDefi, pointsExp: Number(e.target.value) })}
                      className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-brand-white"
                    />
                  </div>
                  <div>
                    <label className="text-brand-white/60 uppercase font-bold block mb-1.5">Badge Reward</label>
                    <input
                      type="text"
                      value={editingDefi.badgeReward}
                      onChange={(e) => setEditingDefi({ ...editingDefi, badgeReward: e.target.value })}
                      className="w-full bg-[#0a1120] border border-brand-white/10 rounded-xl p-3 text-brand-white"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-brand-white/10">
                  <span className="text-brand-white font-bold uppercase">Actif dans l&apos;application</span>
                  <input
                    type="checkbox"
                    checked={editingDefi.isActive}
                    onChange={(e) => setEditingDefi({ ...editingDefi, isActive: e.target.checked })}
                    className="w-5 h-5 accent-[#00d8ff] rounded cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setEditingDefi(null)}
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
