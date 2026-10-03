"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  X,
  Lock,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import {
  getAdminProgramsAction,
  upsertAdminProgramAction,
  deleteAdminProgramAction,
  upsertAdminSessionAction,
  deleteAdminSessionAction,
  upsertAdminExerciseAction,
  deleteAdminExerciseAction,
} from "@/app/(admin)/admin/defis/actions";
import {
  WorkoutProgram,
  ProgramSession,
  ProgramExercise,
  ProgramLocation,
  ProgramLevel,
  FitnessGoal,
} from "@/lib/supabase/defis-platform";

export default function AdminProgramsTab() {
  const [programs, setPrograms] = useState<WorkoutProgram[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLocation, setFilterLocation] = useState<string>("all");
  const [filterGoal, setFilterGoal] = useState<string>("all");
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);

  // Notification
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modals
  const [isProgramModalOpen, setIsProgramModalOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<WorkoutProgram | null>(null);
  const [programToDelete, setProgramToDelete] = useState<WorkoutProgram | null>(null);

  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [sessionProgramId, setSessionProgramId] = useState<string | null>(null);
  const [editingSession, setEditingSession] = useState<ProgramSession | null>(null);

  const [isExerciseModalOpen, setIsExerciseModalOpen] = useState(false);
  const [exerciseSessionId, setExerciseSessionId] = useState<string | null>(null);
  const [editingExercise, setEditingExercise] = useState<ProgramExercise | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Program Form
  const [pTitle, setPTitle] = useState("");
  const [pSlug, setPSlug] = useState("");
  const [pDescription, setPDescription] = useState("");
  const [pGoal, setPGoal] = useState<FitnessGoal | "both">("both");
  const [pLocation, setPLocation] = useState<ProgramLocation>("home");
  const [pEquipment, setPEquipment] = useState<string[]>(["bodyweight"]);
  const [pLevel, setPLevel] = useState<ProgramLevel>("Débutant");
  const [pSessionsPerWeek, setPSessionsPerWeek] = useState(3);
  const [pDurationWeeks, setPDurationWeeks] = useState(4);
  const [pIsKbShred, setPIsKbShred] = useState(false);
  const [pIsPremium, setPIsPremium] = useState(false);
  const [pIsActive, setPIsActive] = useState(true);
  const [pDisplayOrder, setPDisplayOrder] = useState(10);

  // Session Form
  const [sDayNumber, setSDayNumber] = useState(1);
  const [sTitle, setSTitle] = useState("");
  const [sDescription, setSDescription] = useState("");
  const [sDuration, setSDuration] = useState(30);
  const [sIsClub, setSIsClub] = useState(false);
  const [sClubTag, setSClubTag] = useState("");
  const [sIsActive, setSIsActive] = useState(true);
  const [sDisplayOrder, setSDisplayOrder] = useState(1);

  // Exercise Form
  const [eName, setEName] = useState("");
  const [eSets, setESets] = useState(3);
  const [eReps, setEReps] = useState("12 reps");
  const [eRest, setERest] = useState(60);
  const [eInstructions, setEInstructions] = useState("");
  const [eDisplayOrder, setEDisplayOrder] = useState(1);

  const showNotification = (text: string, type: "success" | "error" = "success") => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchPrograms = async () => {
    setIsLoading(true);
    const res = await getAdminProgramsAction();
    if (res.success && res.data) {
      setPrograms(res.data);
      if (!selectedProgramId && res.data.length > 0) {
        setSelectedProgramId(res.data[0].id);
      }
    } else {
      showNotification(res.error || "Erreur de chargement des programmes.", "error");
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchPrograms();
  }, []);

  const openCreateProgram = () => {
    setEditingProgram(null);
    setPTitle("");
    setPSlug("");
    setPDescription("");
    setPGoal("both");
    setPLocation("home");
    setPEquipment(["bodyweight"]);
    setPLevel("Débutant");
    setPSessionsPerWeek(3);
    setPDurationWeeks(4);
    setPIsKbShred(false);
    setPIsPremium(false);
    setPIsActive(true);
    setPDisplayOrder(10);
    setIsProgramModalOpen(true);
  };

  const openEditProgram = (p: WorkoutProgram) => {
    setEditingProgram(p);
    setPTitle(p.title);
    setPSlug(p.slug);
    setPDescription(p.description || "");
    setPGoal(p.primary_goal);
    setPLocation(p.location);
    setPEquipment(p.required_equipment || ["bodyweight"]);
    setPLevel(p.level);
    setPSessionsPerWeek(p.sessions_per_week);
    setPDurationWeeks(p.duration_weeks);
    setPIsKbShred(p.is_kb_shred);
    setPIsPremium(p.is_premium);
    setPIsActive(p.is_active);
    setPDisplayOrder(p.display_order);
    setIsProgramModalOpen(true);
  };

  const handleSaveProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pTitle.trim()) {
      showNotification("Le titre du programme est obligatoire.", "error");
      return;
    }

    setIsSubmitting(true);
    const res = await upsertAdminProgramAction({
      id: editingProgram?.id,
      title: pTitle.trim(),
      slug: pSlug.trim() || undefined,
      description: pDescription.trim() || null,
      primary_goal: pGoal,
      location: pLocation,
      required_equipment: pEquipment,
      level: pLevel,
      sessions_per_week: Number(pSessionsPerWeek),
      duration_weeks: Number(pDurationWeeks),
      is_kb_shred: pIsKbShred,
      is_premium: pIsPremium,
      is_active: pIsActive,
      display_order: Number(pDisplayOrder),
    });

    if (res.success) {
      showNotification(editingProgram ? "Programme mis à jour !" : "Programme créé !");
      setIsProgramModalOpen(false);
      fetchPrograms();
    } else {
      showNotification(res.error || "Erreur de sauvegarde.", "error");
    }
    setIsSubmitting(false);
  };

  const handleDeleteProgram = async () => {
    if (!programToDelete) return;
    setIsSubmitting(true);
    const res = await deleteAdminProgramAction(programToDelete.id);
    if (res.success) {
      showNotification("Programme supprimé.");
      setProgramToDelete(null);
      fetchPrograms();
    } else {
      showNotification(res.error || "Erreur de suppression.", "error");
    }
    setIsSubmitting(false);
  };

  // Sessions CRUD
  const openCreateSession = (programId: string) => {
    setSessionProgramId(programId);
    setEditingSession(null);
    setSDayNumber(1);
    setSTitle("");
    setSDescription("");
    setSDuration(30);
    setSIsClub(false);
    setSClubTag("");
    setSIsActive(true);
    setSDisplayOrder(1);
    setIsSessionModalOpen(true);
  };

  const openEditSession = (programId: string, s: ProgramSession) => {
    setSessionProgramId(programId);
    setEditingSession(s);
    setSDayNumber(s.day_number);
    setSTitle(s.title);
    setSDescription(s.description || "");
    setSDuration(s.duration_minutes);
    setSIsClub(s.is_club_session);
    setSClubTag(s.club_discipline_tag || "");
    setSIsActive(s.is_active);
    setSDisplayOrder(s.display_order);
    setIsSessionModalOpen(true);
  };

  const handleSaveSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionProgramId || !sTitle.trim()) return;

    setIsSubmitting(true);
    const res = await upsertAdminSessionAction(sessionProgramId, {
      id: editingSession?.id,
      day_number: Number(sDayNumber),
      title: sTitle.trim(),
      description: sDescription.trim() || null,
      duration_minutes: Number(sDuration),
      is_club_session: sIsClub,
      club_discipline_tag: sIsClub ? sClubTag.trim() || "Cours Club" : null,
      is_active: sIsActive,
      display_order: Number(sDisplayOrder),
    });

    if (res.success) {
      showNotification(editingSession ? "Séance mise à jour !" : "Séance ajoutée !");
      setIsSessionModalOpen(false);
      fetchPrograms();
    } else {
      showNotification(res.error || "Erreur lors de l'enregistrement de la séance.", "error");
    }
    setIsSubmitting(false);
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm("Voulez-vous supprimer cette séance et tous ses exercices ?")) return;
    const res = await deleteAdminSessionAction(sessionId);
    if (res.success) {
      showNotification("Séance supprimée.");
      fetchPrograms();
    } else {
      showNotification(res.error || "Erreur de suppression.", "error");
    }
  };

  // Exercises CRUD
  const openCreateExercise = (sessionId: string) => {
    setExerciseSessionId(sessionId);
    setEditingExercise(null);
    setEName("");
    setESets(3);
    setEReps("12 reps");
    setERest(60);
    setEInstructions("");
    setEDisplayOrder(1);
    setIsExerciseModalOpen(true);
  };

  const openEditExercise = (sessionId: string, ex: ProgramExercise) => {
    setExerciseSessionId(sessionId);
    setEditingExercise(ex);
    setEName(ex.name);
    setESets(ex.sets);
    setEReps(ex.reps_or_duration);
    setERest(ex.rest_seconds);
    setEInstructions(ex.instructions || "");
    setEDisplayOrder(ex.display_order);
    setIsExerciseModalOpen(true);
  };

  const handleSaveExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exerciseSessionId || !eName.trim()) return;

    setIsSubmitting(true);
    const res = await upsertAdminExerciseAction(exerciseSessionId, {
      id: editingExercise?.id,
      name: eName.trim(),
      sets: Number(eSets),
      reps_or_duration: eReps.trim(),
      rest_seconds: Number(eRest),
      instructions: eInstructions.trim() || null,
      display_order: Number(eDisplayOrder),
    });

    if (res.success) {
      showNotification(editingExercise ? "Exercice mis à jour !" : "Exercice ajouté !");
      setIsExerciseModalOpen(false);
      fetchPrograms();
    } else {
      showNotification(res.error || "Erreur de sauvegarde de l'exercice.", "error");
    }
    setIsSubmitting(false);
  };

  const handleDeleteExercise = async (exerciseId: string) => {
    if (!confirm("Supprimer cet exercice ?")) return;
    const res = await deleteAdminExerciseAction(exerciseId);
    if (res.success) {
      showNotification("Exercice supprimé.");
      fetchPrograms();
    } else {
      showNotification(res.error || "Erreur de suppression.", "error");
    }
  };

  const selectedProgram = programs.find((p) => p.id === selectedProgramId) || programs[0] || null;

  return (
    <div className="space-y-6">
      {/* Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-xl border flex items-center gap-2 shadow-2xl text-xs font-bold ${
              notification.type === "success"
                ? "bg-black border-[#5E4075] text-[#F8F9ED]"
                : "bg-black border-rose-500/50 text-rose-300"
            }`}
          >
            {notification.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            <span>{notification.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-heading font-black uppercase text-white tracking-wider">
            Programmes d'Entraînement & Sessions
          </h2>
          <p className="text-xs sm:text-sm text-white/60">
            Gestion des programmes Maison, Salle, Hybride et KB SHRED avec architecture séances & exercices.
          </p>
        </div>

        <button
          onClick={openCreateProgram}
          className="px-4 py-2 rounded-xl bg-[#5E4075] text-white hover:bg-[#6f4d8b] font-heading font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Plus size={16} />
          <span>Nouveau Programme</span>
        </button>
      </div>

      {/* Vue en 2 Colonnes (Liste des programmes à gauche + Détail / Séances à droite) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Colonne Gauche : Liste des programmes */}
        <div className="lg:col-span-5 space-y-3">
          <div className="p-3 bg-black border border-white/10 rounded-xl flex items-center justify-between text-xs font-bold text-white/70 uppercase">
            <span>Programmes Référencés ({programs.length})</span>
          </div>

          <div className="space-y-2 max-h-[750px] overflow-y-auto pr-1">
            {isLoading ? (
              <div className="p-8 text-center text-white/40">
                <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-[#F8F9ED]" />
                <span>Chargement des programmes...</span>
              </div>
            ) : programs.length === 0 ? (
              <div className="p-8 text-center text-white/40 bg-black rounded-xl border border-white/10">
                Aucun programme créé.
              </div>
            ) : (
              programs.map((p) => {
                const isSelected = p.id === selectedProgramId;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedProgramId(p.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer space-y-2.5 ${
                      isSelected
                        ? "bg-[#5E4075]/20 border-[#5E4075]"
                        : "bg-black border-white/10 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-heading font-bold text-white text-sm uppercase">
                            {p.title}
                          </h4>
                          {p.is_kb_shred && (
                            <span className="px-1.5 py-0.5 rounded bg-white/10 text-[#F8F9ED] text-[9px] font-bold uppercase border border-white/20">
                              KB SHRED
                            </span>
                          )}
                          {p.is_premium && (
                            <span className="px-1.5 py-0.5 rounded bg-[#5E4075]/30 text-[#F8F9ED] text-[9px] font-bold uppercase border border-[#5E4075]/50 flex items-center gap-0.5">
                              <Lock size={8} />
                              <span>Premium</span>
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-white/50 font-mono mt-0.5">{p.slug}</p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditProgram(p);
                          }}
                          className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-white/70 hover:text-white cursor-pointer"
                          title="Modifier"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setProgramToDelete(p);
                          }}
                          className="p-1.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 cursor-pointer"
                          title="Supprimer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[10px] text-white/60">
                      <span className="px-2 py-0.5 rounded bg-white/5">
                        {p.location === "home" && "Maison"}
                        {p.location === "gym" && "Salle"}
                        {p.location === "club" && "Club"}
                        {p.location === "hybrid" && "Hybride"}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-white/5">{p.level}</span>
                      <span className="px-2 py-0.5 rounded bg-white/5">
                        {p.sessions_per_week}x/sem • {p.duration_weeks} sem
                      </span>
                      <span className="px-2 py-0.5 rounded bg-white/5 font-bold text-[#F8F9ED]">
                        {p.sessions?.length || 0} séances
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Colonne Droite : Sessions & Exercices du Programme Sélectionné */}
        <div className="lg:col-span-7 space-y-4">
          {selectedProgram ? (
            <div className="p-6 rounded-2xl bg-black border border-white/10 space-y-6">
              {/* Header Programme Sélectionné */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#F8F9ED] uppercase tracking-wider">
                      Structure & Séances
                    </span>
                    <span className="text-xs text-white/40">•</span>
                    <span className="text-xs text-white/60">{selectedProgram.title}</span>
                  </div>
                  <h3 className="text-lg font-heading font-black uppercase text-white">
                    {selectedProgram.title}
                  </h3>
                  {selectedProgram.description && (
                    <p className="text-xs text-white/60">{selectedProgram.description}</p>
                  )}
                </div>

                <button
                  onClick={() => openCreateSession(selectedProgram.id)}
                  className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                >
                  <Plus size={14} className="text-[#5E4075]" />
                  <span>Ajouter une Séance</span>
                </button>
              </div>

              {/* Liste des Séances */}
              <div className="space-y-4">
                {(!selectedProgram.sessions || selectedProgram.sessions.length === 0) ? (
                  <div className="p-8 text-center text-white/40 bg-white/[0.02] rounded-xl border border-white/5">
                    Aucune séance configurée pour ce programme. Cliquez sur "Ajouter une Séance" pour débuter.
                  </div>
                ) : (
                  selectedProgram.sessions.map((s) => (
                    <div
                      key={s.id}
                      className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3"
                    >
                      {/* Ligne Séance */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="w-5 h-5 rounded-full bg-[#5E4075]/30 text-[#F8F9ED] text-[10px] font-bold flex items-center justify-center">
                              {s.day_number}
                            </span>
                            <h4 className="font-bold text-white text-xs uppercase">{s.title}</h4>
                            {s.is_club_session ? (
                              <span className="px-1.5 py-0.5 rounded bg-white/10 text-[#F8F9ED] border border-white/20 text-[9px] font-bold uppercase">
                                Club • {s.club_discipline_tag || "Physique"}
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded bg-white/5 text-white/60 text-[9px]">
                                {s.duration_minutes} min
                              </span>
                            )}
                          </div>
                          {s.description && <p className="text-[11px] text-white/50">{s.description}</p>}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openCreateExercise(s.id)}
                            className="px-2 py-1 rounded bg-[#5E4075]/20 hover:bg-[#5E4075]/40 text-[#F8F9ED] text-[10px] font-bold uppercase flex items-center gap-1 cursor-pointer"
                          >
                            <Plus size={12} />
                            <span>Exercice</span>
                          </button>
                          <button
                            onClick={() => openEditSession(selectedProgram.id, s)}
                            className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-white/70 cursor-pointer"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={() => handleDeleteSession(s.id)}
                            className="p-1.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 cursor-pointer"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Liste des Exercices de la Séance */}
                      <div className="pl-6 space-y-1.5 border-l-2 border-white/10">
                        {(!s.exercises || s.exercises.length === 0) ? (
                          <p className="text-[11px] text-white/30 italic">Aucun exercice dans cette séance.</p>
                        ) : (
                          s.exercises.map((ex) => (
                            <div
                              key={ex.id}
                              className="p-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 flex items-center justify-between gap-2 text-xs"
                            >
                              <div className="space-y-0.5">
                                <span className="font-semibold text-white">{ex.name}</span>
                                <div className="text-[10px] text-white/50 flex items-center gap-2">
                                  <span className="text-[#F8F9ED] font-bold">{ex.sets} séries</span>
                                  <span>•</span>
                                  <span>{ex.reps_or_duration}</span>
                                  <span>•</span>
                                  <span>Repos : {ex.rest_seconds}s</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => openEditExercise(s.id, ex)}
                                  className="p-1 rounded text-white/40 hover:text-white cursor-pointer"
                                >
                                  <Edit2 size={11} />
                                </button>
                                <button
                                  onClick={() => handleDeleteExercise(ex.id)}
                                  className="p-1 rounded text-rose-400 hover:text-rose-300 cursor-pointer"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-white/40 bg-black rounded-2xl border border-white/10">
              Sélectionnez un programme pour voir et modifier ses séances.
            </div>
          )}
        </div>
      </div>

      {/* Modal Création / Édition Programme */}
      <AnimatePresence>
        {isProgramModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-black border border-white/15 rounded-2xl w-full max-w-2xl p-6 space-y-5 shadow-2xl text-xs text-white"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h3 className="text-base font-heading font-black uppercase text-white">
                  {editingProgram ? "Modifier le Programme" : "Créer un Programme d'Entraînement"}
                </h3>
                <button onClick={() => setIsProgramModalOpen(false)} className="text-white/60 hover:text-white cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveProgram} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-white/70 uppercase">Titre du Programme *</label>
                    <input
                      type="text"
                      required
                      value={pTitle}
                      onChange={(e) => setPTitle(e.target.value)}
                      placeholder="Ex: Striker Hypertrophie Pectoraux & Dos"
                      className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-[#5E4075]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-white/70 uppercase">Slug URL</label>
                    <input
                      type="text"
                      value={pSlug}
                      onChange={(e) => setPSlug(e.target.value)}
                      placeholder="ex: striker-hypertrophie-pecs-dos"
                      className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white font-mono focus:outline-none focus:border-[#5E4075]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-white/70 uppercase">Description</label>
                  <textarea
                    rows={2}
                    value={pDescription}
                    onChange={(e) => setPDescription(e.target.value)}
                    placeholder="Description concise du cycle et des résultats visés..."
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-[#5E4075]"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="text-white/70 uppercase font-bold">Lieu</label>
                    <select
                      value={pLocation}
                      onChange={(e) => setPLocation(e.target.value as ProgramLocation)}
                      className="w-full px-3 py-2 rounded-lg bg-black border border-white/10 text-white"
                    >
                      <option value="home">Maison</option>
                      <option value="gym">Salle</option>
                      <option value="club">Club</option>
                      <option value="hybrid">Hybride</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-white/70 uppercase font-bold">Objectif</label>
                    <select
                      value={pGoal}
                      onChange={(e) => setPGoal(e.target.value as FitnessGoal | "both")}
                      className="w-full px-3 py-2 rounded-lg bg-black border border-white/10 text-white"
                    >
                      <option value="weight_loss">Perte de poids</option>
                      <option value="muscle_gain">Gain musculaire</option>
                      <option value="both">Les deux (Hybride)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-white/70 uppercase font-bold">Niveau</label>
                    <select
                      value={pLevel}
                      onChange={(e) => setPLevel(e.target.value as ProgramLevel)}
                      className="w-full px-3 py-2 rounded-lg bg-black border border-white/10 text-white"
                    >
                      <option value="Débutant">Débutant</option>
                      <option value="Intermédiaire">Intermédiaire</option>
                      <option value="Avancé">Avancé</option>
                      <option value="Tous niveaux">Tous niveaux</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-white/70 uppercase font-bold">Séances/sem</label>
                    <input
                      type="number"
                      min="1"
                      max="7"
                      value={pSessionsPerWeek}
                      onChange={(e) => setPSessionsPerWeek(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white font-bold"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 p-3 rounded-xl bg-white/[0.03] border border-white/10">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pIsKbShred}
                      onChange={(e) => setPIsKbShred(e.target.checked)}
                      className="w-4 h-4 rounded text-[#5E4075] bg-black border-white/20"
                    />
                    <span className="font-bold text-[#F8F9ED]">Programme KB SHRED</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pIsPremium}
                      onChange={(e) => setPIsPremium(e.target.checked)}
                      className="w-4 h-4 rounded text-[#5E4075] bg-black border-white/20"
                    />
                    <span className="font-bold text-white">Réservé Premium</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pIsActive}
                      onChange={(e) => setPIsActive(e.target.checked)}
                      className="w-4 h-4 rounded text-[#5E4075] bg-black border-white/20"
                    />
                    <span className="font-bold text-white">Actif</span>
                  </label>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsProgramModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl bg-[#5E4075] hover:bg-[#6f4d8b] text-white font-heading font-black uppercase tracking-wider cursor-pointer"
                  >
                    {isSubmitting ? "Enregistrement..." : editingProgram ? "Mettre à jour" : "Créer"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Création / Édition Séance */}
      <AnimatePresence>
        {isSessionModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-black border border-white/15 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl text-xs text-white"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h3 className="text-base font-heading font-black uppercase text-white">
                  {editingSession ? "Modifier la Séance" : "Ajouter une Séance"}
                </h3>
                <button onClick={() => setIsSessionModalOpen(false)} className="text-white/60 hover:text-white cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveSession} className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-white/70 uppercase">Jour #</label>
                    <input
                      type="number"
                      min="1"
                      value={sDayNumber}
                      onChange={(e) => setSDayNumber(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white font-bold"
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="font-bold text-white/70 uppercase">Titre de la séance *</label>
                    <input
                      type="text"
                      required
                      value={sTitle}
                      onChange={(e) => setSTitle(e.target.value)}
                      placeholder="Ex: Poussées explosives & Swings"
                      className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-[#5E4075]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-white/70 uppercase">Description / Consignes</label>
                  <textarea
                    rows={2}
                    value={sDescription}
                    onChange={(e) => setSDescription(e.target.value)}
                    placeholder="Focus sur le tempo et le gainage..."
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-[#5E4075]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-white/70 uppercase">Durée estimée (min)</label>
                    <input
                      type="number"
                      min="5"
                      value={sDuration}
                      onChange={(e) => setSDuration(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-white/70 uppercase">Tag Discipline Club</label>
                    <input
                      type="text"
                      value={sClubTag}
                      onChange={(e) => setSClubTag(e.target.value)}
                      placeholder="Ex: KB Shred / Boxing Shred"
                      className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/10 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sIsClub}
                    onChange={(e) => setSIsClub(e.target.checked)}
                    className="w-4 h-4 rounded text-[#5E4075] bg-black border-white/20"
                  />
                  <span className="font-bold text-white">Cette séance renvoie vers un créneau physique au club</span>
                </label>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsSessionModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl bg-[#5E4075] hover:bg-[#6f4d8b] text-white font-heading font-black uppercase cursor-pointer"
                  >
                    {isSubmitting ? "Enregistrement..." : editingSession ? "Mettre à jour" : "Ajouter"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Création / Édition Exercice */}
      <AnimatePresence>
        {isExerciseModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-black border border-white/15 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl text-xs text-white"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h3 className="text-base font-heading font-black uppercase text-white">
                  {editingExercise ? "Modifier l'Exercice" : "Ajouter un Exercice"}
                </h3>
                <button onClick={() => setIsExerciseModalOpen(false)} className="text-white/60 hover:text-white cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveExercise} className="space-y-3">
                <div className="space-y-1">
                  <label className="font-bold text-white/70 uppercase">Nom de l'exercice *</label>
                  <input
                    type="text"
                    required
                    value={eName}
                    onChange={(e) => setEName(e.target.value)}
                    placeholder="Ex: Goblet Squat avec Kettlebell"
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white font-bold focus:outline-none focus:border-[#5E4075]"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-white/70 uppercase">Séries</label>
                    <input
                      type="number"
                      min="1"
                      value={eSets}
                      onChange={(e) => setESets(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-white/70 uppercase">Reps / Durée</label>
                    <input
                      type="text"
                      value={eReps}
                      onChange={(e) => setEReps(e.target.value)}
                      placeholder="12 reps"
                      className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-white/70 uppercase">Repos (sec)</label>
                    <input
                      type="number"
                      min="0"
                      step="5"
                      value={eRest}
                      onChange={(e) => setERest(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-white/70 uppercase">Consignes d'exécution</label>
                  <textarea
                    rows={2}
                    value={eInstructions}
                    onChange={(e) => setEInstructions(e.target.value)}
                    placeholder="Dos neutre, descente contrôlée en 3 sec..."
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-[#5E4075]"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsExerciseModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl bg-[#5E4075] hover:bg-[#6f4d8b] text-white font-heading font-black uppercase cursor-pointer"
                  >
                    {isSubmitting ? "Enregistrement..." : editingExercise ? "Mettre à jour" : "Ajouter"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Suppression Programme */}
      <AnimatePresence>
        {programToDelete && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-black border border-rose-500/30 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl text-xs text-white"
            >
              <div className="flex items-center gap-3 text-rose-400">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                  <Trash2 size={20} />
                </div>
                <div>
                  <h4 className="text-base font-heading font-black uppercase text-white">Supprimer le Programme</h4>
                  <p className="text-[11px] text-white/50">Toutes les séances associées seront supprimées.</p>
                </div>
              </div>

              <p className="text-white/70">
                Confirmer la suppression de <span className="font-bold text-white">« {programToDelete.title} »</span> ?
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setProgramToDelete(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold uppercase cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDeleteProgram}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold uppercase cursor-pointer"
                >
                  {isSubmitting ? "Suppression..." : "Supprimer"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
