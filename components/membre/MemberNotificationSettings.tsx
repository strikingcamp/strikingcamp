"use client";

import { useState, useEffect, useTransition } from "react";
import {
  Bell,
  BellOff,
  CheckCircle2,
  AlertCircle,
  Clock,
  Utensils,
  Dumbbell,
  Droplets,
  Smartphone,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  isPushNotificationSupported,
  getCurrentPushSubscription,
  subscribeUserToPush,
  unsubscribeUserFromPush,
} from "@/lib/notifications/register-service-worker";
import {
  updateMemberNotificationPreferencesAction,
} from "@/app/(membre)/actions";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationPreferences,
} from "@/lib/supabase/notifications";


interface MemberNotificationSettingsProps {
  initialPreferences?: NotificationPreferences | null;
  className?: string;
}

type PushState =
  | "checking"
  | "unsupported"
  | "denied"
  | "active"
  | "inactive";

export default function MemberNotificationSettings({
  initialPreferences,
  className,
}: MemberNotificationSettingsProps) {
  // Préférences de notification
  const [prefs, setPrefs] = useState<NotificationPreferences>(() => {
    if (initialPreferences) return initialPreferences;
    return {
      id: "temp",
      user_id: "",
      ...DEFAULT_NOTIFICATION_PREFERENCES,
    };
  });

  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // État Web Push sur l'appareil actuel
  const [pushState, setPushState] = useState<PushState>("checking");
  const [isPushLoading, setIsPushLoading] = useState(false);

  // Vérification de la compatibilité et du statut push sur le terminal actuel
  useEffect(() => {
    async function checkCurrentDevicePush() {
      if (!isPushNotificationSupported()) {
        setPushState("unsupported");
        return;
      }

      if (Notification.permission === "denied") {
        setPushState("denied");
        return;
      }

      try {
        const sub = await getCurrentPushSubscription();
        if (sub) {
          setPushState("active");
        } else {
          setPushState("inactive");
        }
      } catch {
        setPushState("inactive");
      }
    }

    checkCurrentDevicePush();
  }, []);

  // Efface le message de feedback après 4 secondes
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(timer);
  }, [feedback]);

  /**
   * Sauvegarde une modification de préférence utilisateur
   */
  const handleUpdatePref = (
    key: keyof NotificationPreferences,
    value: boolean | string
  ) => {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);

    startTransition(async () => {
      const res = await updateMemberNotificationPreferencesAction({
        [key]: value,
      });

      if (res.success && res.data) {
        setPrefs(res.data);
        setFeedback({
          type: "success",
          message: "Préférences enregistrées",
        });
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Impossible d'enregistrer vos préférences",
        });
      }
    });
  };

  /**
   * Activation des notifications Web Push sur cet appareil
   */
  const handleEnablePush = async () => {
    setIsPushLoading(true);
    setFeedback(null);

    try {
      const subscriptionInput = await subscribeUserToPush();

      if (!subscriptionInput) {
        if (
          typeof window !== "undefined" &&
          "Notification" in window &&
          Notification.permission === "denied"
        ) {
          setPushState("denied");
          setFeedback({
            type: "error",
            message:
              "Les notifications sont bloquées par votre navigateur. Autorisez-les dans les réglages de votre navigateur.",
          });
        } else {
          setFeedback({
            type: "error",
            message: "Impossible d'activer les notifications sur cet appareil.",
          });
        }
        setIsPushLoading(false);
        return;
      }

      // Envoi de la souscription au serveur (user_id validé via session)
      const res = await fetch("/api/notifications/push-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscriptionInput),
      });

      if (!res.ok) {
        throw new Error("Erreur serveur lors de l'enregistrement de l'appareil");
      }

      setPushState("active");
      setFeedback({
        type: "success",
        message: "Notifications push activées sur cet appareil !",
      });
    } catch (err: any) {
      console.error("[MemberNotificationSettings] Erreur activation push :", err);
      setFeedback({
        type: "error",
        message:
          "Une erreur est survenue lors de l'activation des notifications.",
      });
    } finally {
      setIsPushLoading(false);
    }
  };

  /**
   * Désactivation des notifications Web Push sur cet appareil
   */
  const handleDisablePush = async () => {
    setIsPushLoading(true);
    setFeedback(null);

    try {
      const { endpoint } = await unsubscribeUserFromPush();

      if (endpoint) {
        await fetch("/api/notifications/push-subscription", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint }),
        });
      }

      setPushState("inactive");
      setFeedback({
        type: "success",
        message: "Notifications push désactivées sur cet appareil.",
      });
    } catch (err: any) {
      console.error("[MemberNotificationSettings] Erreur désactivation push :", err);
      setFeedback({
        type: "error",
        message:
          "Une erreur est survenue lors de la désactivation des notifications.",
      });
    } finally {
      setIsPushLoading(false);
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* En-tête de section */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Bell size={20} className="text-brand-blue" />
            <h2 className="text-base sm:text-lg font-heading font-bold uppercase tracking-wider text-brand-white">
              Notifications & Rappels
            </h2>
          </div>
          <p className="text-xs text-brand-white/50">
            Personnalisez vos alertes pour vos repas, entraînements et séances au club.
          </p>
        </div>

        {isPending && (
          <div className="flex items-center gap-1.5 text-xs text-brand-blue animate-pulse font-medium">
            <Loader2 size={13} className="animate-spin" />
            <span>Enregistrement...</span>
          </div>
        )}
      </div>

      {/* Message de Feedback */}
      {feedback && (
        <div
          role="status"
          className={cn(
            "p-3 rounded-xl flex items-center gap-2.5 text-xs font-semibold border transition-all animate-in fade-in duration-200",
            feedback.type === "success"
              ? "bg-[#22c55e]/10 border-[#22c55e]/30 text-[#22c55e]"
              : "bg-red-500/10 border-red-500/30 text-red-400"
          )}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 size={16} className="shrink-0" />
          ) : (
            <AlertCircle size={16} className="shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          1. STATUT DES NOTIFICATIONS SUR CET APPAREIL
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="bg-[#0f172a] border border-brand-white/10 rounded-xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-blue/10 text-brand-blue flex items-center justify-center shrink-0 mt-0.5">
              <Smartphone size={20} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-heading font-bold uppercase tracking-wider text-brand-white">
                  Notifications sur cet appareil
                </p>
                {pushState === "active" && (
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/30">
                    Activées
                  </span>
                )}
                {pushState === "inactive" && (
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-brand-white/10 text-brand-white/60 border border-brand-white/10">
                    Désactivées
                  </span>
                )}
              </div>
              <p className="text-xs text-brand-white/50 leading-relaxed">
                Recevez directement les rappels d&apos;entraînement et de nutrition sur votre téléphone ou ordinateur.
              </p>
            </div>
          </div>

          {/* Bouton d'action Push */}
          <div className="shrink-0">
            {pushState === "active" && (
              <button
                type="button"
                disabled={isPushLoading}
                onClick={handleDisablePush}
                className="w-full sm:w-auto px-4 py-2.5 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white/80 hover:text-brand-white border border-brand-white/15 rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isPushLoading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <BellOff size={14} />
                )}
                Désactiver sur cet appareil
              </button>
            )}

            {pushState === "inactive" && (
              <button
                type="button"
                disabled={isPushLoading}
                onClick={handleEnablePush}
                className="w-full sm:w-auto px-4 py-2.5 bg-brand-blue hover:bg-brand-white text-brand-black font-heading font-bold text-xs uppercase tracking-wider rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-md shadow-brand-blue/10"
              >
                {isPushLoading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Bell size={14} />
                )}
                Activer les notifications
              </button>
            )}

            {pushState === "denied" && (
              <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg max-w-xs">
                Bloquées par votre navigateur. Réactivez l&apos;autorisation dans les paramètres de votre navigateur.
              </div>
            )}

            {pushState === "unsupported" && (
              <div className="text-xs text-brand-white/70 bg-brand-white/5 border border-brand-white/10 p-3 rounded-xl max-w-xs space-y-1.5 text-left">
                <p className="font-semibold text-brand-white">Notifications non disponibles sur ce navigateur</p>
                <p className="text-[11px] text-brand-white/50 leading-relaxed">
                  Sur <strong>iPhone / iPad (iOS)</strong>, les notifications Web Push nécessitent d&apos;installer l&apos;application sur votre écran d&apos;accueil : appuyez sur le bouton <strong>Partager</strong> de Safari, puis sélectionnez <strong>&laquo;&nbsp;Sur l&apos;écran d&apos;accueil&nbsp;&raquo;</strong>.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          2. COMMUTATEUR GÉNÉRAL (MASTER TOGGLE)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="bg-[#0f172a] border border-brand-white/10 rounded-xl p-4 sm:p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <label
              htmlFor="switch-enabled-global"
              className="text-sm font-heading font-bold uppercase tracking-wider text-brand-white cursor-pointer"
            >
              Activer l&apos;ensemble des rappels
            </label>
            <p className="text-xs text-brand-white/50">
              Interrupteur général pour tous les rappels programmés.
            </p>
          </div>

          <button
            id="switch-enabled-global"
            role="switch"
            aria-checked={prefs.enabled_global}
            aria-label="Activer l'ensemble des rappels"
            disabled={isPending}
            onClick={() => handleUpdatePref("enabled_global", !prefs.enabled_global)}
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-blue/50 disabled:opacity-50",
              prefs.enabled_global ? "bg-brand-blue" : "bg-brand-white/20"
            )}
          >
            <span
              className={cn(
                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-brand-white shadow ring-0 transition duration-200 ease-in-out",
                prefs.enabled_global ? "translate-x-5" : "translate-x-0"
              )}
            />
          </button>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          3. RAPPELS DE REPAS (NUTRITION)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div
        className={cn(
          "bg-[#0f172a] border border-brand-white/10 rounded-xl p-4 sm:p-5 space-y-4 transition-opacity",
          !prefs.enabled_global && "opacity-50 pointer-events-none"
        )}
      >
        <div className="flex items-center justify-between gap-4 pb-3 border-b border-brand-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#22c55e]/10 text-[#22c55e] flex items-center justify-center">
              <Utensils size={16} />
            </div>
            <div>
              <p className="text-sm font-heading font-bold uppercase tracking-wider text-brand-white">
                Rappels de repas
              </p>
              <p className="text-xs text-brand-white/50">
                Recevoir une notification si un repas n&apos;a pas encore été consigné.
              </p>
            </div>
          </div>

          <button
            role="switch"
            aria-checked={prefs.enabled_meals}
            aria-label="Activer les rappels de repas"
            disabled={!prefs.enabled_global || isPending}
            onClick={() => handleUpdatePref("enabled_meals", !prefs.enabled_meals)}
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-blue/50 disabled:opacity-50",
              prefs.enabled_meals && prefs.enabled_global
                ? "bg-[#22c55e]"
                : "bg-brand-white/20"
            )}
          >
            <span
              className={cn(
                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-brand-white shadow ring-0 transition duration-200 ease-in-out",
                prefs.enabled_meals && prefs.enabled_global
                  ? "translate-x-5"
                  : "translate-x-0"
              )}
            />
          </button>
        </div>

        {/* Grille des horaires de repas */}
        {prefs.enabled_meals && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Petit-déjeuner */}
            <div className="bg-brand-black/40 border border-brand-white/5 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-brand-white/40" />
                <span className="text-xs font-semibold text-brand-white/80">
                  Petit-déjeuner
                </span>
              </div>
              <input
                type="time"
                value={(prefs.reminder_breakfast_time || "08:00:00").slice(0, 5)}
                onChange={(e) =>
                  handleUpdatePref(
                    "reminder_breakfast_time",
                    `${e.target.value}:00`
                  )
                }
                className="bg-[#0f172a] border border-brand-white/15 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-brand-white focus:outline-none focus:border-brand-blue"
              />
            </div>

            {/* Déjeuner */}
            <div className="bg-brand-black/40 border border-brand-white/5 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-brand-white/40" />
                <span className="text-xs font-semibold text-brand-white/80">
                  Déjeuner
                </span>
              </div>
              <input
                type="time"
                value={(prefs.reminder_lunch_time || "12:30:00").slice(0, 5)}
                onChange={(e) =>
                  handleUpdatePref("reminder_lunch_time", `${e.target.value}:00`)
                }
                className="bg-[#0f172a] border border-brand-white/15 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-brand-white focus:outline-none focus:border-brand-blue"
              />
            </div>

            {/* Collation */}
            <div className="bg-brand-black/40 border border-brand-white/5 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-brand-white/40" />
                <span className="text-xs font-semibold text-brand-white/80">
                  Collation
                </span>
              </div>
              <input
                type="time"
                value={(prefs.reminder_snack_time || "16:30:00").slice(0, 5)}
                onChange={(e) =>
                  handleUpdatePref("reminder_snack_time", `${e.target.value}:00`)
                }
                className="bg-[#0f172a] border border-brand-white/15 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-brand-white focus:outline-none focus:border-brand-blue"
              />
            </div>

            {/* Dîner */}
            <div className="bg-brand-black/40 border border-brand-white/5 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-brand-white/40" />
                <span className="text-xs font-semibold text-brand-white/80">
                  Dîner
                </span>
              </div>
              <input
                type="time"
                value={(prefs.reminder_dinner_time || "19:30:00").slice(0, 5)}
                onChange={(e) =>
                  handleUpdatePref("reminder_dinner_time", `${e.target.value}:00`)
                }
                className="bg-[#0f172a] border border-brand-white/15 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-brand-white focus:outline-none focus:border-brand-blue"
              />
            </div>
          </div>
        )}
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          4. RAPPELS D'ENTRAÎNEMENT (DIGITAL & CLUB)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div
        className={cn(
          "bg-[#0f172a] border border-brand-white/10 rounded-xl p-4 sm:p-5 space-y-4 transition-opacity",
          !prefs.enabled_global && "opacity-50 pointer-events-none"
        )}
      >
        <div className="flex items-center justify-between gap-4 pb-3 border-b border-brand-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-blue/10 text-brand-blue flex items-center justify-center">
              <Dumbbell size={16} />
            </div>
            <div>
              <p className="text-sm font-heading font-bold uppercase tracking-wider text-brand-white">
                Rappels d&apos;entraînement
              </p>
              <p className="text-xs text-brand-white/50">
                Séances digitales du jour et rappels H-2 pour vos cours réservés au club.
              </p>
            </div>
          </div>

          <button
            role="switch"
            aria-checked={prefs.enabled_workouts}
            aria-label="Activer les rappels d'entraînement"
            disabled={!prefs.enabled_global || isPending}
            onClick={() =>
              handleUpdatePref("enabled_workouts", !prefs.enabled_workouts)
            }
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-blue/50 disabled:opacity-50",
              prefs.enabled_workouts && prefs.enabled_global
                ? "bg-brand-blue"
                : "bg-brand-white/20"
            )}
          >
            <span
              className={cn(
                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-brand-white shadow ring-0 transition duration-200 ease-in-out",
                prefs.enabled_workouts && prefs.enabled_global
                  ? "translate-x-5"
                  : "translate-x-0"
              )}
            />
          </button>
        </div>

        {/* Horaire entraînement digital */}
        {prefs.enabled_workouts && (
          <div className="space-y-3 pt-1">
            <div className="bg-brand-black/40 border border-brand-white/5 rounded-xl p-3 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-brand-white/80 block">
                  Séance digitale
                </span>
                <span className="text-[11px] text-brand-white/40">
                  Déclenché les jours prévus de votre programme
                </span>
              </div>
              <input
                type="time"
                value={(prefs.reminder_workout_time || "18:00:00").slice(0, 5)}
                onChange={(e) =>
                  handleUpdatePref(
                    "reminder_workout_time",
                    `${e.target.value}:00`
                  )
                }
                className="bg-[#0f172a] border border-brand-white/15 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-brand-white focus:outline-none focus:border-brand-blue"
              />
            </div>

            <p className="text-[11px] text-brand-white/40 bg-brand-white/5 p-2.5 rounded-lg">
              ℹ️ Les cours physiques réservés au club de Marseille bénéficient d&apos;un rappel automatique envoyé <strong>2 heures avant le début de la séance</strong>.
            </p>
          </div>
        )}
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          5. HYDRATATION (BIENTÔT DISPONIBLE)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="bg-[#0f172a]/60 border border-brand-white/5 rounded-xl p-4 sm:p-5 opacity-70">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#00d8ff]/10 text-[#00d8ff] flex items-center justify-center">
              <Droplets size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-heading font-bold uppercase tracking-wider text-brand-white/80">
                  Rappels d&apos;hydratation
                </p>
                <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-brand-white/10 text-brand-white/60 border border-brand-white/10">
                  Bientôt disponible
                </span>
              </div>
              <p className="text-xs text-brand-white/40">
                Rappels périodiques pour optimiser votre hydratation quotidienne.
              </p>
            </div>
          </div>

          <button
            role="switch"
            aria-checked={false}
            aria-label="Rappels d'hydratation (bientôt disponible)"
            disabled
            className="relative inline-flex h-6 w-11 shrink-0 cursor-not-allowed rounded-full border-2 border-transparent bg-brand-white/10 opacity-50"
          >
            <span className="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-brand-white/40 shadow ring-0 translate-x-0" />
          </button>
        </div>
      </div>
    </div>
  );
}
