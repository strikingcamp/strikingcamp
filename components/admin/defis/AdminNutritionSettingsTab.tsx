"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Save,
} from "lucide-react";
import {
  getAdminNutritionSettingsAction,
  updateAdminNutritionSettingsAction,
} from "@/app/(admin)/admin/defis/actions";
import {
  NutritionPlatformSettings,
  DEFAULT_NUTRITION_SETTINGS,
} from "@/lib/supabase/defis-platform";

export default function AdminNutritionSettingsTab() {
  const [settings, setSettings] = useState<NutritionPlatformSettings>(DEFAULT_NUTRITION_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form states
  const [weightLossDelta, setWeightLossDelta] = useState(-400);
  const [muscleGainDelta, setMuscleGainDelta] = useState(300);
  const [maintenanceDelta, setMaintenanceDelta] = useState(0);

  const [protWeightLoss, setProtWeightLoss] = useState(2.0);
  const [protMuscleGain, setProtMuscleGain] = useState(2.0);
  const [protMaintenance, setProtMaintenance] = useState(1.6);

  const [fatWeightLoss, setFatWeightLoss] = useState(0.9);
  const [fatMuscleGain, setFatMuscleGain] = useState(1.0);
  const [fatMaintenance, setFatMaintenance] = useState(0.9);

  const [floorFemale, setFloorFemale] = useState(1200);
  const [floorMale, setFloorMale] = useState(1500);

  const [disclaimerText, setDisclaimerText] = useState(DEFAULT_NUTRITION_SETTINGS.disclaimer_text);

  const showNotification = (text: string, type: "success" | "error" = "success") => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchSettings = async () => {
    setIsLoading(true);
    const res = await getAdminNutritionSettingsAction();
    if (res.success && res.data) {
      const data = res.data;
      setSettings(data);
      setWeightLossDelta(data.weight_loss_caloric_delta);
      setMuscleGainDelta(data.muscle_gain_caloric_delta);
      setMaintenanceDelta(data.maintenance_caloric_delta);
      setProtWeightLoss(data.protein_ratio_weight_loss);
      setProtMuscleGain(data.protein_ratio_muscle_gain);
      setProtMaintenance(data.protein_ratio_maintenance);
      setFatWeightLoss(data.fat_ratio_weight_loss);
      setFatMuscleGain(data.fat_ratio_muscle_gain);
      setFatMaintenance(data.fat_ratio_maintenance);
      setFloorFemale(data.technical_caloric_floor_female);
      setFloorMale(data.technical_caloric_floor_male);
      setDisclaimerText(data.disclaimer_text || DEFAULT_NUTRITION_SETTINGS.disclaimer_text);
    } else {
      showNotification(res.error || "Paramètres par défaut chargés.", "error");
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const res = await updateAdminNutritionSettingsAction({
      id: settings.id,
      default_bmr_formula: "mifflin_st_jeor",
      weight_loss_caloric_delta: Number(weightLossDelta),
      muscle_gain_caloric_delta: Number(muscleGainDelta),
      maintenance_caloric_delta: Number(maintenanceDelta),
      protein_ratio_weight_loss: Number(protWeightLoss),
      protein_ratio_muscle_gain: Number(protMuscleGain),
      protein_ratio_maintenance: Number(protMaintenance),
      fat_ratio_weight_loss: Number(fatWeightLoss),
      fat_ratio_muscle_gain: Number(fatMuscleGain),
      fat_ratio_maintenance: Number(fatMaintenance),
      technical_caloric_floor_female: Number(floorFemale),
      technical_caloric_floor_male: Number(floorMale),
      disclaimer_text: disclaimerText.trim(),
    });

    if (res.success) {
      showNotification("Paramètres nutritionnels enregistrés avec succès !");
      fetchSettings();
    } else {
      showNotification(res.error || "Erreur d'enregistrement.", "error");
    }
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-6 max-w-4xl">
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-heading font-black uppercase text-white tracking-wider">
            Paramètres du Moteur Nutritionnel
          </h2>
          <p className="text-xs sm:text-sm text-white/60">
            Formule active : <span className="text-[#F8F9ED] font-bold">Mifflin-St Jeor (V1)</span>. Ajustements caloriques et ratios de macronutriments en g/kg.
          </p>
        </div>

        <button
          onClick={fetchSettings}
          disabled={isLoading}
          className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
          <span>Actualiser</span>
        </button>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6 text-xs text-white">
        {/* 1. Méthode BMR & Ajustements caloriques */}
        <div className="p-6 rounded-2xl bg-black border border-white/10 space-y-4">
          <div className="pb-2 border-b border-white/10">
            <h3 className="text-sm font-heading font-bold uppercase text-white tracking-wider">
              Ajustements Caloriques selon l'Objectif
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5 p-3.5 rounded-xl bg-white/[0.02] border border-white/10">
              <label className="font-bold text-white/80 uppercase">Perte de Poids (Déficit)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="50"
                  max="0"
                  value={weightLossDelta}
                  onChange={(e) => setWeightLossDelta(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-black border border-white/10 text-white font-bold text-sm"
                />
                <span className="text-white/40 font-bold">kcal</span>
              </div>
              <p className="text-[10px] text-white/40">Déficit appliqué sur le TDEE calculé</p>
            </div>

            <div className="space-y-1.5 p-3.5 rounded-xl bg-white/[0.02] border border-white/10">
              <label className="font-bold text-white/80 uppercase">Gain Musculaire (Surplus)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="50"
                  min="0"
                  value={muscleGainDelta}
                  onChange={(e) => setMuscleGainDelta(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-black border border-white/10 text-white font-bold text-sm"
                />
                <span className="text-white/40 font-bold">kcal</span>
              </div>
              <p className="text-[10px] text-white/40">Surplus appliqué sur le TDEE</p>
            </div>

            <div className="space-y-1.5 p-3.5 rounded-xl bg-white/[0.02] border border-white/10">
              <label className="font-bold text-white/80 uppercase">Maintien Athlétique</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="50"
                  value={maintenanceDelta}
                  onChange={(e) => setMaintenanceDelta(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-black border border-white/10 text-white font-bold text-sm"
                />
                <span className="text-white/40 font-bold">kcal</span>
              </div>
              <p className="text-[10px] text-white/40">Ajustement sur la dépense énergétique</p>
            </div>
          </div>
        </div>

        {/* 2. Ratios Protéines & Lipides en g/kg */}
        <div className="p-6 rounded-2xl bg-black border border-white/10 space-y-4">
          <div className="pb-2 border-b border-white/10">
            <h3 className="text-sm font-heading font-bold uppercase text-white tracking-wider">
              Ratios de Macronutriments (g par kg de poids corporel)
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Protéines */}
            <div className="space-y-3 p-4 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="font-bold uppercase tracking-wider text-[#F8F9ED]">
                Protéines (g / kg)
              </span>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Perte de poids :</span>
                  <input
                    type="number"
                    step="0.1"
                    min="1.0"
                    max="3.0"
                    value={protWeightLoss}
                    onChange={(e) => setProtWeightLoss(Number(e.target.value))}
                    className="w-20 px-2.5 py-1.5 rounded bg-black border border-white/10 text-white font-bold text-right"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Gain musculaire :</span>
                  <input
                    type="number"
                    step="0.1"
                    min="1.0"
                    max="3.0"
                    value={protMuscleGain}
                    onChange={(e) => setProtMuscleGain(Number(e.target.value))}
                    className="w-20 px-2.5 py-1.5 rounded bg-black border border-white/10 text-white font-bold text-right"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Maintien :</span>
                  <input
                    type="number"
                    step="0.1"
                    min="1.0"
                    max="3.0"
                    value={protMaintenance}
                    onChange={(e) => setProtMaintenance(Number(e.target.value))}
                    className="w-20 px-2.5 py-1.5 rounded bg-black border border-white/10 text-white font-bold text-right"
                  />
                </div>
              </div>
            </div>

            {/* Lipides */}
            <div className="space-y-3 p-4 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="font-bold uppercase tracking-wider text-white/70">
                Lipides (g / kg)
              </span>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Perte de poids :</span>
                  <input
                    type="number"
                    step="0.05"
                    min="0.5"
                    max="2.0"
                    value={fatWeightLoss}
                    onChange={(e) => setFatWeightLoss(Number(e.target.value))}
                    className="w-20 px-2.5 py-1.5 rounded bg-black border border-white/10 text-white font-bold text-right"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Gain musculaire :</span>
                  <input
                    type="number"
                    step="0.05"
                    min="0.5"
                    max="2.0"
                    value={fatMuscleGain}
                    onChange={(e) => setFatMuscleGain(Number(e.target.value))}
                    className="w-20 px-2.5 py-1.5 rounded bg-black border border-white/10 text-white font-bold text-right"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Maintien :</span>
                  <input
                    type="number"
                    step="0.05"
                    min="0.5"
                    max="2.0"
                    value={fatMaintenance}
                    onChange={(e) => setFatMaintenance(Number(e.target.value))}
                    className="w-20 px-2.5 py-1.5 rounded bg-black border border-white/10 text-white font-bold text-right"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Seuils Techniques de Protection & Disclaimer */}
        <div className="p-6 rounded-2xl bg-black border border-white/10 space-y-4">
          <div className="pb-2 border-b border-white/10">
            <h3 className="text-sm font-heading font-bold uppercase text-white tracking-wider">
              Seuils Techniques de Protection & Avertissements
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
              <label className="font-bold text-white/70 uppercase">Seuil d'alerte Femme (kcal)</label>
              <input
                type="number"
                min="800"
                max="2000"
                value={floorFemale}
                onChange={(e) => setFloorFemale(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-black border border-white/10 text-white font-bold"
              />
              <p className="text-[10px] text-white/40">Déclenche l'avertissement de sécurité si la cible calculée est inférieure</p>
            </div>

            <div className="space-y-1.5 p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
              <label className="font-bold text-white/70 uppercase">Seuil d'alerte Homme (kcal)</label>
              <input
                type="number"
                min="1000"
                max="2500"
                value={floorMale}
                onChange={(e) => setFloorMale(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-black border border-white/10 text-white font-bold"
              />
              <p className="text-[10px] text-white/40">Déclenche l'avertissement de sécurité si la cible calculée est inférieure</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-white/70 uppercase">
              Message d'avertissement non médical affiché aux membres
            </label>
            <textarea
              rows={2}
              value={disclaimerText}
              onChange={(e) => setDisclaimerText(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.02] border border-white/10 text-white focus:outline-none focus:border-[#5E4075]"
            />
          </div>
        </div>

        {/* Bouton de Sauvegarde */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-8 py-3 rounded-xl bg-[#5E4075] hover:bg-[#6f4d8b] text-white font-heading font-black uppercase tracking-wider flex items-center gap-2 transition-colors cursor-pointer shadow-lg"
          >
            <Save size={16} />
            <span>{isSubmitting ? "Enregistrement..." : "Sauvegarder les Paramètres"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
