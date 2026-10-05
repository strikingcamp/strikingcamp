"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Edit3,
} from "lucide-react";
import {
  UserFitnessProfile,
  FitnessGender,
  FitnessGoal,
  ActivityLevel,
  TrainingEnvironment,
  PrepTimePreference,
} from "@/lib/supabase/defis-platform";
import { NutritionPlanResult, NutritionPlanSuccess } from "@/lib/nutrition-engine";
import { saveFitnessProfileAction } from "@/app/(membre)/membre/defis/actions";

interface GoalTabProps {
  initialProfile: UserFitnessProfile | null;
  initialBirthDate: string | null;
  nutritionPlan: NutritionPlanResult | null;
  onProfileUpdated: () => void;
}

export default function GoalTab({
  initialProfile,
  initialBirthDate,
  nutritionPlan,
  onProfileUpdated,
}: GoalTabProps) {
  const [isEditing, setIsEditing] = useState(!initialProfile);
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Form State
  const [birthDate, setBirthDate] = useState(initialBirthDate || "");
  const [gender, setGender] = useState<FitnessGender>(initialProfile?.gender || "male");
  const [heightCm, setHeightCm] = useState(initialProfile?.height_cm ? String(initialProfile.height_cm) : "175");
  const [currentWeightKg, setCurrentWeightKg] = useState(initialProfile?.current_weight_kg ? String(initialProfile.current_weight_kg) : "75");
  const [primaryGoal, setPrimaryGoal] = useState<FitnessGoal>(initialProfile?.primary_goal || "weight_loss");
  const [prepTimePreference, setPrepTimePreference] = useState<PrepTimePreference>(initialProfile?.prep_time_preference || "flexible");
  const [targetWeightKg, setTargetWeightKg] = useState(initialProfile?.target_weight_kg ? String(initialProfile.target_weight_kg) : "70");
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(initialProfile?.activity_level || "moderate");
  const [targetWorkoutsPerWeek, setTargetWorkoutsPerWeek] = useState(initialProfile?.target_workouts_per_week || 3);
  const [trainingEnvironment, setTrainingEnvironment] = useState<TrainingEnvironment>(initialProfile?.training_environment || "hybrid");
  const [availableEquipment, setAvailableEquipment] = useState<string[]>(
    initialProfile?.available_equipment || ["bodyweight", "dumbbells", "kettlebell"]
  );

  const toggleEquipment = (eq: string) => {
    setAvailableEquipment((prev) =>
      prev.includes(eq) ? prev.filter((item) => item !== eq) : [...prev, eq]
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);

    const hNum = Number(heightCm);
    const wNum = Number(currentWeightKg);
    const twNum = targetWeightKg ? Number(targetWeightKg) : null;

    if (!birthDate) {
      setSaveError("Veuillez renseigner votre date de naissance.");
      setIsSaving(false);
      return;
    }

    if (!hNum || hNum <= 50 || hNum >= 250) {
      setSaveError("Veuillez renseigner une taille valide (entre 50 et 250 cm).");
      setIsSaving(false);
      return;
    }

    if (!wNum || wNum <= 30 || wNum >= 300) {
      setSaveError("Veuillez renseigner un poids actuel valide (entre 30 et 300 kg).");
      setIsSaving(false);
      return;
    }

    const res = await saveFitnessProfileAction({
      birthDate,
      gender,
      height_cm: hNum,
      current_weight_kg: wNum,
      target_weight_kg: twNum,
      primary_goal: primaryGoal,
      prep_time_preference: prepTimePreference,
      activity_level: activityLevel,
      target_workouts_per_week: targetWorkoutsPerWeek,
      training_environment: trainingEnvironment,
      available_equipment: availableEquipment.length > 0 ? availableEquipment : ["bodyweight"],
    });

    setIsSaving(false);

    if (res.success) {
      setIsEditing(false);
      onProfileUpdated();
    } else {
      setSaveError(res.error || "Erreur lors de l'enregistrement");
    }
  };

  const successPlan = nutritionPlan?.status === "success" ? (nutritionPlan as NutritionPlanSuccess) : null;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MODE SYNTHÈSE / AFFICHAGE
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {!isEditing && initialProfile && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="p-4 sm:p-6 md:p-8 rounded-2xl bg-[#0c1322] border border-brand-white/10 shadow-xl space-y-6 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-blue/15 border border-brand-blue/30 text-brand-blue text-xs font-bold uppercase tracking-wider">
                  Objectif Actif
                </div>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-heading font-black uppercase text-brand-white tracking-wide">
                  {initialProfile.primary_goal === "weight_loss" && "Perte de Poids & Affûtage"}
                  {initialProfile.primary_goal === "muscle_gain" && "Gain Musculaire & Puissance"}
                  {initialProfile.primary_goal === "maintenance" && "Maintien & Performance"}
                  {initialProfile.primary_goal === "recomposition" && "Recomposition Corporelle"}
                </h2>
                <p className="text-xs sm:text-sm text-brand-white/60">
                  Parcours personnalisé digital & physique configuré pour votre profil athlétique.
                </p>
              </div>

              <button
                onClick={() => {
                  setStep(1);
                  setIsEditing(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-brand-white/5 hover:bg-brand-white/10 border border-brand-white/10 text-brand-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all self-start sm:self-center cursor-pointer shrink-0"
              >
                <Edit3 size={14} />
                <span>Modifier le profil</span>
              </button>
            </div>

            {/* Metrics Overview Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 pt-2">
              <div className="p-3.5 sm:p-4 rounded-xl bg-[#070c16]/80 border border-brand-white/10 space-y-1">
                <p className="text-[10px] sm:text-[11px] font-semibold text-brand-white/40 uppercase">Poids Actuel</p>
                <p className="text-lg sm:text-xl md:text-2xl font-heading font-black text-brand-white">
                  {initialProfile.current_weight_kg} <span className="text-xs font-normal text-brand-white/50">kg</span>
                </p>
              </div>

              <div className="p-3.5 sm:p-4 rounded-xl bg-[#070c16]/80 border border-brand-white/10 space-y-1">
                <p className="text-[10px] sm:text-[11px] font-semibold text-brand-white/40 uppercase">Poids Cible</p>
                <p className="text-lg sm:text-xl md:text-2xl font-heading font-black text-brand-blue">
                  {initialProfile.target_weight_kg ? `${initialProfile.target_weight_kg} kg` : "—"}
                </p>
              </div>

              <div className="p-3.5 sm:p-4 rounded-xl bg-[#070c16]/80 border border-brand-white/10 space-y-1">
                <p className="text-[10px] sm:text-[11px] font-semibold text-brand-white/40 uppercase">Cible Énergie</p>
                <p className="text-lg sm:text-xl md:text-2xl font-heading font-black text-brand-white">
                  {successPlan?.targetCalories.value ? `${successPlan.targetCalories.value}` : "—"}{" "}
                  <span className="text-xs font-normal text-brand-white/50">kcal/j</span>
                </p>
              </div>

              <div className="p-3.5 sm:p-4 rounded-xl bg-[#070c16]/80 border border-brand-white/10 space-y-1">
                <p className="text-[10px] sm:text-[11px] font-semibold text-brand-white/40 uppercase">Rythme</p>
                <p className="text-lg sm:text-xl md:text-2xl font-heading font-black text-brand-white">
                  {initialProfile.target_workouts_per_week}{" "}
                  <span className="text-xs font-normal text-brand-white/50">s/sem</span>
                </p>
              </div>
            </div>

            {/* Nutrition Breakdown from Engine */}
            {successPlan && (
              <div className="space-y-3 pt-4 border-t border-brand-white/10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-brand-white/80">
                    Répartition des Macronutriments Estimée
                  </h3>
                  <span className="text-[10px] sm:text-[11px] text-brand-white/40">Moteur déterministe Mifflin-St Jeor</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                  <div className="p-3.5 rounded-xl bg-[#070c16]/80 border border-brand-white/10 space-y-1">
                    <p className="text-[10px] font-bold uppercase text-brand-blue">Protéines</p>
                    <p className="text-base sm:text-lg font-heading font-black text-brand-white">
                      {successPlan.macros.proteins.grams} <span className="text-xs font-normal text-brand-white/50">g</span>
                    </p>
                    <p className="text-[10px] text-brand-white/40">{successPlan.macros.proteins.percentage}% de l'énergie</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#070c16]/80 border border-brand-white/10 space-y-1">
                    <p className="text-[10px] font-bold uppercase text-brand-white/80">Glucides</p>
                    <p className="text-base sm:text-lg font-heading font-black text-brand-white">
                      {successPlan.macros.carbs.grams} <span className="text-xs font-normal text-brand-white/50">g</span>
                    </p>
                    <p className="text-[10px] text-brand-white/40">{successPlan.macros.carbs.percentage}% de l'énergie</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#070c16]/80 border border-brand-white/10 space-y-1">
                    <p className="text-[10px] font-bold uppercase text-brand-white/60">Lipides</p>
                    <p className="text-base sm:text-lg font-heading font-black text-brand-white">
                      {successPlan.macros.fats.grams} <span className="text-xs font-normal text-brand-white/50">g</span>
                    </p>
                    <p className="text-[10px] text-brand-white/40">{successPlan.macros.fats.percentage}% de l'énergie</p>
                  </div>
                </div>

                {/* Technical Alert if Low Calorie */}
                {successPlan.technicalAlert.requires_review && (
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300">
                    <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                    <p className="text-xs leading-relaxed">
                      {successPlan.technicalAlert.message}
                    </p>
                  </div>
                )}

                {/* Legal & Sports Disclaimer */}
                <p className="text-[11px] text-brand-white/40 italic pt-1 text-center sm:text-left">
                  {successPlan.disclaimer}
                </p>
              </div>
            )}
          </div>

          {/* Training Environment & Preferences Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-[#0c1322] border border-brand-white/10 shadow-xl space-y-3">
              <span className="text-brand-blue font-bold text-xs uppercase tracking-wider block">
                Temps de repas souhaité
              </span>
              <p className="text-base font-bold text-brand-white capitalize">
                {(initialProfile.prep_time_preference === "quick" || prepTimePreference === "quick") && "⚡ Rapide (≤ 10 min)"}
                {(initialProfile.prep_time_preference === "standard" || prepTimePreference === "standard") && "⏱️ Standard (10–20 min)"}
                {(!initialProfile.prep_time_preference || initialProfile.prep_time_preference === "flexible") && "🍲 Flexible (Toutes durées)"}
              </p>
              <p className="text-xs text-brand-white/50">
                Utilisé automatiquement pour filtrer vos recommandations de recettes en arrière-plan.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#0c1322] border border-brand-white/10 shadow-xl space-y-3">
              <span className="text-brand-blue font-bold text-xs uppercase tracking-wider block">
                Environnement d'entraînement
              </span>
              <p className="text-base font-bold text-brand-white capitalize">
                {initialProfile.training_environment === "hybrid" && "Hybride (Maison + Striking Camp)"}
                {initialProfile.training_environment === "club" && "Striking Camp (Club)"}
                {initialProfile.training_environment === "home" && "Maison uniquement"}
                {initialProfile.training_environment === "gym" && "Salle de sport classique"}
              </p>
              <p className="text-xs text-brand-white/50">
                Vos suggestions de séances sont adaptées à votre lieu de pratique favori.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#0c1322] border border-brand-white/10 shadow-xl space-y-3">
              <span className="text-brand-blue font-bold text-xs uppercase tracking-wider block">
                Matériel Disponible
              </span>
              <div className="flex flex-wrap gap-2 pt-1">
                {initialProfile.available_equipment.map((eq, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-lg bg-brand-white/5 border border-brand-white/10 text-xs font-semibold text-brand-white/80"
                  >
                    {eq === "bodyweight" && "Poids du corps"}
                    {eq === "dumbbells" && "Haltères"}
                    {eq === "kettlebell" && "Kettlebell (KB Shred)"}
                    {eq === "machines" && "Machines de salle"}
                    {eq !== "bodyweight" && eq !== "dumbbells" && eq !== "kettlebell" && eq !== "machines" && eq}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MODE ONBOARDING / WIZARD INTERACTIF (6 ÉTAPES)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {isEditing && (
        <div className="p-4 sm:p-6 md:p-8 rounded-2xl bg-[#0c1322] border border-brand-white/10 shadow-xl space-y-6">
          {/* Wizard Header */}
          <div className="flex items-center justify-between border-b border-brand-white/10 pb-4">
            <div className="space-y-1">
              <span className="text-brand-blue text-xs font-bold uppercase tracking-wider block">
                Configuration de votre Parcours
              </span>
              <h2 className="text-xl sm:text-2xl font-heading font-black uppercase text-brand-white">
                Étape {step} / 6
              </h2>
            </div>

            {initialProfile && (
              <button
                onClick={() => setIsEditing(false)}
                className="text-xs text-brand-white/50 hover:text-brand-white transition-colors cursor-pointer"
              >
                Annuler
              </button>
            )}
          </div>

          {/* Progress Bar */}
          <div className="w-full h-1.5 bg-black/50 border border-brand-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-blue transition-all duration-300"
              style={{ width: `${(step / 6) * 100}%` }}
            />
          </div>

          {saveError && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {saveError}
            </div>
          )}

          {/* STEP 1: Date de naissance & Sexe */}
          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <h3 className="text-base font-bold text-brand-white uppercase">Informations de base</h3>
              <p className="text-xs text-brand-white/50">
                Nécessaires au calcul scientifique du métabolisme de base (BMR).
              </p>

              <div className="space-y-3">
                <label className="block text-xs font-semibold text-brand-white/70 uppercase">
                  Date de naissance (enregistrée sur votre profil)
                </label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full p-3.5 rounded-xl bg-[#070c16] border border-brand-white/10 text-brand-white text-sm focus:border-brand-blue outline-none transition-colors"
                  required
                />
              </div>

              <div className="space-y-2 pt-2">
                <label className="block text-xs font-semibold text-brand-white/70 uppercase">Sexe</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setGender("male")}
                    className={`p-4 rounded-xl border text-center text-sm font-bold uppercase transition-all cursor-pointer ${
                      gender === "male"
                        ? "bg-brand-blue border-brand-blue text-brand-black shadow-md shadow-brand-blue/20"
                        : "bg-[#070c16]/80 border-brand-white/10 text-brand-white/60 hover:text-brand-white"
                    }`}
                  >
                    Homme
                  </button>
                  <button
                    type="button"
                    onClick={() => setGender("female")}
                    className={`p-4 rounded-xl border text-center text-sm font-bold uppercase transition-all cursor-pointer ${
                      gender === "female"
                        ? "bg-brand-blue border-brand-blue text-brand-black shadow-md shadow-brand-blue/20"
                        : "bg-[#070c16]/80 border-brand-white/10 text-brand-white/60 hover:text-brand-white"
                    }`}
                  >
                    Femme
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Taille & Poids actuel */}
          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <h3 className="text-base font-bold text-brand-white uppercase">Mensurations actuelles</h3>

              <div className="space-y-3">
                <label className="block text-xs font-semibold text-brand-white/70 uppercase">Taille (cm)</label>
                <input
                  type="number"
                  min="80"
                  max="240"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  className="w-full p-3.5 rounded-xl bg-[#070c16] border border-brand-white/10 text-brand-white text-sm focus:border-brand-blue outline-none"
                  placeholder="ex: 178"
                />
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-semibold text-brand-white/70 uppercase">Poids Actuel (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  min="30"
                  max="250"
                  value={currentWeightKg}
                  onChange={(e) => setCurrentWeightKg(e.target.value)}
                  className="w-full p-3.5 rounded-xl bg-[#070c16] border border-brand-white/10 text-brand-white text-sm focus:border-brand-blue outline-none"
                  placeholder="ex: 78.5"
                />
              </div>
            </motion.div>
          )}

          {/* STEP 3: Objectif Principal & Poids Cible */}
          {step === 3 && (
            <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <h3 className="text-base font-bold text-brand-white uppercase">Votre Objectif Principal</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { id: "weight_loss", title: "Perte de Poids", desc: "Déficit calorique modéré, maintien de la masse musculaire." },
                  { id: "muscle_gain", title: "Gain Musculaire", desc: "Surplus énergétique contrôlé, développement athlétique." },
                  { id: "recomposition", title: "Recomposition", desc: "Perte de gras et tonification simultanée." },
                  { id: "maintenance", title: "Maintien & Forme", desc: "Stabilisation du poids et optimisation des performances." },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPrimaryGoal(item.id as FitnessGoal)}
                    className={`p-4 rounded-xl border text-left space-y-1 transition-all cursor-pointer ${
                      primaryGoal === item.id
                        ? "bg-brand-blue border-brand-blue text-brand-black shadow-lg shadow-brand-blue/20"
                        : "bg-[#070c16]/80 border-brand-white/10 text-brand-white/60 hover:text-brand-white"
                    }`}
                  >
                    <p className="text-sm font-heading font-bold uppercase">{item.title}</p>
                    <p className={primaryGoal === item.id ? "text-xs text-brand-black/70" : "text-xs text-brand-white/50"}>
                      {item.desc}
                    </p>
                  </button>
                ))}
              </div>

              <div className="space-y-2 pt-2">
                <label className="block text-xs font-semibold text-brand-white/70 uppercase">
                  Poids Cible souhaité (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={targetWeightKg}
                  onChange={(e) => setTargetWeightKg(e.target.value)}
                  className="w-full p-3.5 rounded-xl bg-[#070c16] border border-brand-white/10 text-brand-white text-sm focus:border-brand-blue outline-none"
                  placeholder="ex: 72.0"
                />
              </div>

              {/* Préférence de temps de préparation */}
              <div className="space-y-2 pt-3 border-t border-brand-white/10">
                <label className="block text-xs font-semibold text-brand-white/70 uppercase">
                  Temps de préparation souhaité pour un repas
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    { id: "quick", label: "⚡ Rapide", sub: "≤ 10 min (Express)" },
                    { id: "standard", label: "⏱️ Standard", sub: "10–20 min (Équilibré)" },
                    { id: "flexible", label: "🍲 Flexible", sub: "Aucune limite" },
                  ].map((timeOption) => (
                    <button
                      key={timeOption.id}
                      type="button"
                      onClick={() => setPrepTimePreference(timeOption.id as PrepTimePreference)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        prepTimePreference === timeOption.id
                          ? "bg-brand-blue border-brand-blue text-brand-black shadow-md shadow-brand-blue/20"
                          : "bg-[#070c16]/80 border-brand-white/10 text-brand-white/60 hover:text-brand-white"
                      }`}
                    >
                      <p className="text-xs font-heading font-bold uppercase">{timeOption.label}</p>
                      <p className={prepTimePreference === timeOption.id ? "text-[10px] text-brand-black/70" : "text-[10px] text-brand-white/40"}>
                        {timeOption.sub}
                      </p>
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-brand-white/40 italic pt-1">
                  Ce paramètre est utilisé en arrière-plan par le moteur de personnalisation pour adapter vos suggestions.
                </p>
              </div>
            </motion.div>
          )}

          {/* STEP 4: Niveau d'activité */}
          {step === 4 && (
            <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <h3 className="text-base font-bold text-brand-white uppercase">Niveau d'activité global</h3>

              <div className="space-y-2.5">
                {[
                  { id: "sedentary", title: "Sédentaire", desc: "Travail de bureau, peu ou pas de marche" },
                  { id: "light", title: "Légèrement actif", desc: "Marche quotidienne régulière, exercice léger 1-2 j/sem" },
                  { id: "moderate", title: "Modérément actif", desc: "Entraînement régulier 3-5 j/sem" },
                  { id: "very_active", title: "Très actif", desc: "Entraînement intensif 6-7 j/sem ou métier physique" },
                  { id: "extra_active", title: "Athlète / Extra actif", desc: "Entraînement biquotidien de combat / haute intensité" },
                ].map((act) => (
                  <button
                    key={act.id}
                    type="button"
                    onClick={() => setActivityLevel(act.id as ActivityLevel)}
                    className={`w-full p-3.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      activityLevel === act.id
                        ? "bg-brand-blue border-brand-blue text-brand-black shadow-md shadow-brand-blue/20"
                        : "bg-[#070c16]/80 border-brand-white/10 text-brand-white/60 hover:text-brand-white"
                    }`}
                  >
                    <div>
                      <p className="text-xs sm:text-sm font-heading font-bold uppercase">{act.title}</p>
                      <p className={activityLevel === act.id ? "text-[11px] text-brand-black/70" : "text-[11px] text-brand-white/50"}>
                        {act.desc}
                      </p>
                    </div>
                    {activityLevel === act.id && <CheckCircle2 size={16} className="text-brand-black" />}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* STEP 5: Rythme et Lieu d'entraînement */}
          {step === 5 && (
            <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <h3 className="text-base font-bold text-brand-white uppercase">Rythme & Environnement</h3>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-brand-white/70 uppercase">
                  Nombre de séances souhaitées par semaine
                </label>
                <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                  {[2, 3, 4, 5, 6].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setTargetWorkoutsPerWeek(num)}
                      className={`py-2.5 sm:py-3 rounded-xl border font-heading font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                        targetWorkoutsPerWeek === num
                          ? "bg-brand-blue border-brand-blue text-brand-black shadow-md shadow-brand-blue/20"
                          : "bg-[#070c16]/80 border-brand-white/10 text-brand-white/60 hover:text-brand-white"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <label className="block text-xs font-semibold text-brand-white/70 uppercase">
                  Lieu d'entraînement privilégié
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { id: "hybrid", label: "Hybride (Club + Maison)" },
                    { id: "club", label: "Striking Camp (Club)" },
                    { id: "home", label: "Maison" },
                    { id: "gym", label: "Salle classique" },
                  ].map((env) => (
                    <button
                      key={env.id}
                      type="button"
                      onClick={() => setTrainingEnvironment(env.id as TrainingEnvironment)}
                      className={`p-3 rounded-xl border text-center text-xs font-heading font-bold uppercase transition-all cursor-pointer ${
                        trainingEnvironment === env.id
                          ? "bg-brand-blue border-brand-blue text-brand-black shadow-md shadow-brand-blue/20"
                          : "bg-[#070c16]/80 border-brand-white/10 text-brand-white/60 hover:text-brand-white"
                      }`}
                    >
                      {env.label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 6: Matériel disponible */}
          {step === 6 && (
            <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <h3 className="text-base font-bold text-brand-white uppercase">Matériel à disposition</h3>
              <p className="text-xs text-brand-white/50">
                Sélectionnez le matériel accessible pour vos séances numériques.
              </p>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: "bodyweight", label: "Poids du corps" },
                  { id: "dumbbells", label: "Haltères" },
                  { id: "kettlebell", label: "Kettlebell (KB Shred)" },
                  { id: "machines", label: "Machines de musculation" },
                ].map((eq) => {
                  const isSelected = availableEquipment.includes(eq.id);
                  return (
                    <button
                      key={eq.id}
                      type="button"
                      onClick={() => toggleEquipment(eq.id)}
                      className={`p-4 rounded-xl border text-center text-xs font-heading font-bold uppercase transition-all cursor-pointer ${
                        isSelected
                          ? "bg-brand-blue border-brand-blue text-brand-black shadow-md shadow-brand-blue/20"
                          : "bg-[#070c16]/80 border-brand-white/10 text-brand-white/50 hover:text-brand-white"
                      }`}
                    >
                      {eq.label}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-brand-white/10">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => Math.max(1, s - 1))}
                className="px-4 py-2.5 rounded-xl bg-brand-white/5 hover:bg-brand-white/10 text-brand-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors cursor-pointer"
              >
                <ArrowLeft size={16} />
                <span>Précédent</span>
              </button>
            ) : <div />}

            {step < 6 ? (
              <button
                type="button"
                onClick={() => setStep((s) => Math.min(6, s + 1))}
                className="px-6 py-2.5 rounded-xl bg-brand-blue hover:bg-brand-white text-brand-black font-heading font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-md shadow-brand-blue/20 cursor-pointer"
              >
                <span>Suivant</span>
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSave}
                className="px-6 py-3 rounded-xl bg-brand-blue hover:bg-brand-white text-brand-black font-heading font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-brand-blue/30 transition-all disabled:opacity-50 cursor-pointer"
              >
                <span>{isSaving ? "Enregistrement..." : "Valider mon profil"}</span>
                <ArrowRight size={16} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
