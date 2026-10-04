/**
 * MOTEUR DÉTERMINISTE D'ÉVALUATION DES RAPPELS STRIKING CAMP (V1)
 *
 * Principes & Spécifications Métier :
 * 1. Fonctions pures, déterministes, isolées et testables sans effets de bord.
 * 2. Zéro envoi réel : le moteur décide UNIQUEMENT si un rappel est nécessaire (shouldSend).
 * 3. Respect absolu des préférences utilisateur (`user_notification_preferences`).
 * 4. Respect du système de personnalisation existant pour les entraînements digitaux (`personalization-engine.ts`).
 * 5. Gestion des cours physiques au club (H-2 avant `starts_at`).
 * 6. Protection stricte contre les doublons via l'historique `notification_logs`.
 * 7. Prise en compte rigoureuse du fuseau horaire (`Europe/Paris` par défaut).
 */

import type {
  NotificationCategory,
  NotificationChannel,
  NotificationPreferences,
  NotificationLog,
} from "../supabase/notifications";
import type {
  UserFitnessProfile,
  WorkoutProgram,
  ProgramSession,
} from "../supabase/defis-platform";

export const DEFAULT_REMINDER_PREFERENCES: Omit<
  NotificationPreferences,
  "id" | "user_id" | "created_at" | "updated_at"
> = {
  enabled_global: true,
  enabled_meals: true,
  enabled_workouts: true,
  enabled_hydration: false,
  reminder_breakfast_time: "08:00:00",
  reminder_lunch_time: "12:30:00",
  reminder_dinner_time: "19:30:00",
  reminder_snack_time: "16:30:00",
  reminder_workout_time: "18:00:00",
  timezone: "Europe/Paris",
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. TYPES DU MOTEUR DE RAPPELS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type ReminderType =
  | "meal_breakfast"
  | "meal_lunch"
  | "meal_snack"
  | "meal_dinner"
  | "workout_digital"
  | "workout_club";

export interface ReminderDecision {
  shouldSend: boolean;
  category: NotificationCategory;
  channel: NotificationChannel;
  title: string;
  body: string;
  actionUrl: string;
  scheduledFor: string;
  reason: string;
  targetId?: string;
}

export interface ClubBookingItem {
  id: string;
  class_session_id?: string | null;
  starts_at: string;
  ends_at?: string | null;
  discipline?: string | null;
  status: string;
}

export interface FoodLogItem {
  meal_type: string;
  log_date?: string;
  food_name?: string;
}

export interface SessionCompletionItem {
  completed_at: string;
  program_session_id?: string | null;
}

export interface ReminderEvaluationContext {
  userId: string;
  currentTime?: Date; // Référence temporelle (par défaut `new Date()`)
  preferences?: NotificationPreferences | null;
  dailyFoodLogsToday?: FoodLogItem[];
  fitnessProfile?: UserFitnessProfile | null;
  sessionCompletionsToday?: SessionCompletionItem[];
  availablePrograms?: WorkoutProgram[];
  activeProgram?: WorkoutProgram | null;
  activeSession?: ProgramSession | null;
  todayClubBookings?: ClubBookingItem[];
  recentLogsToday?: NotificationLog[];
}

export interface ZonedTimeDetails {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  dateStr: string; // YYYY-MM-DD
  dayOfWeek: number; // 1 = Lundi, 2 = Mardi, ..., 7 = Dimanche
  timeInMinutes: number; // 0 à 1439
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. HELPERS TEMPORELS & FUSEAU HORAIRE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Convertit un objet Date UTC en composantes calendaires et horaires précises selon le fuseau horaire
 */
export function getZonedTimeDetails(
  date: Date = new Date(),
  timeZone: string = "Europe/Paris"
): ZonedTimeDetails {
  const safeTz = timeZone && timeZone.trim() !== "" ? timeZone : "Europe/Paris";

  try {
    const formatter = new Intl.DateTimeFormat("fr-CA", {
      timeZone: safeTz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    const parts = formatter.formatToParts(date);
    const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));

    const year = parseInt(map.year, 10);
    const month = parseInt(map.month, 10);
    const day = parseInt(map.day, 10);
    const hour = parseInt(map.hour, 10);
    const minute = parseInt(map.minute, 10);
    const second = parseInt(map.second, 10);
    const dateStr = `${map.year}-${map.month}-${map.day}`;

    // Calcul du jour de la semaine (1 = Lundi, ..., 7 = Dimanche)
    const dt = new Date(Date.UTC(year, month - 1, day));
    const dayOfWeek = dt.getUTCDay() === 0 ? 7 : dt.getUTCDay();

    return {
      year,
      month,
      day,
      hour,
      minute,
      second,
      dateStr,
      dayOfWeek,
      timeInMinutes: hour * 60 + minute,
    };
  } catch (err) {
    // Fallback UTC si le fuseau est invalide
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();
    const hour = date.getUTCHours();
    const minute = date.getUTCMinutes();
    const second = date.getUTCSeconds();
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayOfWeek = date.getUTCDay() === 0 ? 7 : date.getUTCDay();

    return {
      year,
      month,
      day,
      hour,
      minute,
      second,
      dateStr,
      dayOfWeek,
      timeInMinutes: hour * 60 + minute,
    };
  }
}

/**
 * Convertit une chaîne d'heure "HH:MM:SS" ou "HH:MM" en minutes écoulées depuis minuit
 */
export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [hStr, mStr] = timeStr.split(":");
  const h = parseInt(hStr || "0", 10);
  const m = parseInt(mStr || "0", 10);
  return h * 60 + m;
}

/**
 * Formate des minutes en chaîne "HHhMM" conviviale (ex: 750 -> "12h30")
 */
export function formatMinutesToDisplay(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}h${String(m).padStart(2, "0")}`;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. PROTECTION CONTRE LES DOUBLONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Vérifie si une notification similaire a déjà été envoyée pour cette date / cible
 */
export function hasRecentNotification(
  logs: NotificationLog[] = [],
  category: NotificationCategory,
  dateStr: string,
  identifier?: string
): boolean {
  return logs.some((log) => {
    if (log.category !== category) return false;
    const logDate = log.scheduled_date || (log.sent_at ? log.sent_at.split("T")[0] : "");
    if (logDate !== dateStr) return false;
    if (identifier) {
      if (!log.action_url || !log.action_url.includes(identifier)) {
        return false;
      }
    }
    return true;
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. ÉVALUATION D'UN RAPPEL DE REPAS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type MealCategoryKey =
  | "meal_breakfast"
  | "meal_lunch"
  | "meal_snack"
  | "meal_dinner";

export type ReminderMealTimeKey =
  | "reminder_breakfast_time"
  | "reminder_lunch_time"
  | "reminder_snack_time"
  | "reminder_dinner_time";

interface MealMetadata {
  mealType: string;
  category: NotificationCategory;
  defaultTime: string;
  prefKey: ReminderMealTimeKey;
  title: string;
  body: string;
}

const MEALS_CONFIG: Record<MealCategoryKey, MealMetadata> = {
  meal_breakfast: {
    mealType: "breakfast",
    category: "meal_breakfast",
    defaultTime: "08:00:00",
    prefKey: "reminder_breakfast_time",
    title: "Rappel Petit-Déjeuner 🍳",
    body: "Pense à enregistrer ton petit-déjeuner pour atteindre tes objectifs nutritionnels.",
  },
  meal_lunch: {
    mealType: "lunch",
    category: "meal_lunch",
    defaultTime: "12:30:00",
    prefKey: "reminder_lunch_time",
    title: "Rappel Déjeuner 🥗",
    body: "C'est l'heure du déjeuner ! Note tes apports dans ton journal alimentaire.",
  },
  meal_snack: {
    mealType: "snack",
    category: "meal_snack",
    defaultTime: "16:30:00",
    prefKey: "reminder_snack_time",
    title: "Rappel Collation 🥜",
    body: "Optimise ton énergie de l'après-midi en enregistrant ta collation.",
  },
  meal_dinner: {
    mealType: "dinner",
    category: "meal_dinner",
    defaultTime: "19:30:00",
    prefKey: "reminder_dinner_time",
    title: "Rappel Dîner 🍽️",
    body: "Complète ton journal avec ton dîner pour boucler tes macros de la journée.",
  },
};

/**
 * Évalue l'éligibilité d'un rappel pour une catégorie de repas donnée
 */
export function evaluateMealReminder(
  mealKey: MealCategoryKey,
  context: ReminderEvaluationContext
): ReminderDecision {
  const config = MEALS_CONFIG[mealKey];
  const prefs = context.preferences || DEFAULT_REMINDER_PREFERENCES;
  const timezone = prefs.timezone || "Europe/Paris";
  const currentTime = context.currentTime || new Date();
  const zoned = getZonedTimeDetails(currentTime, timezone);

  const fallbackResult = (shouldSend: boolean, reason: string): ReminderDecision => ({
    shouldSend,
    category: config.category,
    channel: "in_app",
    title: config.title,
    body: config.body,
    actionUrl: "/membre/defis?tab=nutrition",
    scheduledFor: `${zoned.dateStr}T${prefs[config.prefKey] || config.defaultTime}`,
    reason,
  });

  // 1. Vérification des bascules globales et repas
  if (prefs.enabled_global === false) {
    return fallbackResult(false, "Notifications globales désactivées");
  }
  if (prefs.enabled_meals === false) {
    return fallbackResult(false, "Rappels repas désactivés par l'utilisateur");
  }

  // 2. Vérification de l'heure programmée et de la fenêtre d'éligibilité (+75 minutes)
  const targetTimeStr = (prefs[config.prefKey] as string) || config.defaultTime;
  const targetMinutes = parseTimeToMinutes(targetTimeStr);
  const windowEndMinutes = targetMinutes + 75; // Fenêtre de tolérance pour le passage du cron

  if (zoned.timeInMinutes < targetMinutes) {
    return fallbackResult(
      false,
      `Heure de rappel (${formatMinutesToDisplay(targetMinutes)}) pas encore atteinte (${formatMinutesToDisplay(zoned.timeInMinutes)})`
    );
  }

  if (zoned.timeInMinutes > windowEndMinutes) {
    return fallbackResult(
      false,
      `Fenêtre de rappel dépassée (${formatMinutesToDisplay(zoned.timeInMinutes)} > ${formatMinutesToDisplay(windowEndMinutes)})`
    );
  }

  // 3. Vérifier si le repas a déjà été enregistré dans le journal alimentaire aujourd'hui
  const foodLogs = context.dailyFoodLogsToday || [];
  const isAlreadyLogged = foodLogs.some(
    (log) => log.meal_type === config.mealType
  );

  if (isAlreadyLogged) {
    return fallbackResult(
      false,
      `Le repas ${config.mealType} a déjà été enregistré dans le journal aujourd'hui`
    );
  }

  // 4. Protection contre les doublons via notification_logs
  const recentLogs = context.recentLogsToday || [];
  const alreadySent = hasRecentNotification(recentLogs, config.category, zoned.dateStr);

  if (alreadySent) {
    return fallbackResult(
      false,
      `Un rappel pour ${config.mealType} a déjà été envoyé aujourd'hui`
    );
  }

  // Éligibilité confirmée
  return {
    shouldSend: true,
    category: config.category,
    channel: "in_app",
    title: config.title,
    body: config.body,
    actionUrl: "/membre/defis?tab=nutrition",
    scheduledFor: `${zoned.dateStr}T${targetTimeStr}`,
    reason: `Repas ${config.mealType} non enregistré dans la fenêtre horaire prévue`,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 5. ÉVALUATION DE L'ENTRAÎNEMENT DIGITAL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Distribution des jours d'entraînement par fréquence cible (1 = Lundi ... 7 = Dimanche) */
export const SCHEDULED_WORKOUT_DAYS_MAP: Record<number, number[]> = {
  1: [1],
  2: [2, 5],
  3: [1, 3, 5],
  4: [1, 2, 4, 6],
  5: [1, 2, 3, 5, 6],
  6: [1, 2, 3, 4, 5, 6],
  7: [1, 2, 3, 4, 5, 6, 7],
};

/**
 * Évalue l'éligibilité d'un rappel pour l'entraînement digital du jour
 */
export function evaluateDigitalWorkoutReminder(
  context: ReminderEvaluationContext
): ReminderDecision {
  const prefs = context.preferences || DEFAULT_REMINDER_PREFERENCES;
  const timezone = prefs.timezone || "Europe/Paris";
  const currentTime = context.currentTime || new Date();
  const zoned = getZonedTimeDetails(currentTime, timezone);

  const fallbackResult = (shouldSend: boolean, reason: string): ReminderDecision => ({
    shouldSend,
    category: "workout_digital",
    channel: "in_app",
    title: "Séance du jour 🥊",
    body: "Ton entraînement Striking Camp t'attend. Reste régulier dans ta progression !",
    actionUrl: "/membre/defis?tab=workouts",
    scheduledFor: `${zoned.dateStr}T${prefs.reminder_workout_time || "18:00:00"}`,
    reason,
  });

  // 1. Vérification des bascules
  if (prefs.enabled_global === false) {
    return fallbackResult(false, "Notifications globales désactivées");
  }
  if (prefs.enabled_workouts === false) {
    return fallbackResult(false, "Rappels d'entraînement désactivés par l'utilisateur");
  }

  // 2. Vérification si aujourd'hui est un jour d'entraînement prévu pour le membre
  const targetWorkouts = context.fitnessProfile?.target_workouts_per_week || 3;
  const scheduledDays =
    SCHEDULED_WORKOUT_DAYS_MAP[Math.min(7, Math.max(1, targetWorkouts))] || [1, 3, 5];

  if (!scheduledDays.includes(zoned.dayOfWeek)) {
    return fallbackResult(
      false,
      `Aucun entraînement digital prévu ce jour (jour ${zoned.dayOfWeek} hors cycle [${scheduledDays.join(",")}])`
    );
  }

  // 3. Vérification si une séance digitale a déjà été complétée aujourd'hui
  const completions = context.sessionCompletionsToday || [];
  if (completions.length > 0) {
    return fallbackResult(false, "Une séance d'entraînement a déjà été complétée aujourd'hui");
  }

  // 4. Vérification de l'heure programmée et de la fenêtre (+90 minutes)
  const targetTimeStr = prefs.reminder_workout_time || "18:00:00";
  const targetMinutes = parseTimeToMinutes(targetTimeStr);
  const windowEndMinutes = targetMinutes + 90;

  if (zoned.timeInMinutes < targetMinutes) {
    return fallbackResult(
      false,
      `Heure de rappel d'entraînement (${formatMinutesToDisplay(targetMinutes)}) pas encore atteinte (${formatMinutesToDisplay(zoned.timeInMinutes)})`
    );
  }

  if (zoned.timeInMinutes > windowEndMinutes) {
    return fallbackResult(
      false,
      `Fenêtre de rappel d'entraînement dépassée (${formatMinutesToDisplay(zoned.timeInMinutes)} > ${formatMinutesToDisplay(windowEndMinutes)})`
    );
  }

  // 5. Protection contre les doublons
  const recentLogs = context.recentLogsToday || [];
  const alreadySent = hasRecentNotification(recentLogs, "workout_digital", zoned.dateStr);

  if (alreadySent) {
    return fallbackResult(
      false,
      "Un rappel d'entraînement digital a déjà été envoyé aujourd'hui"
    );
  }

  // Personnalisation du message si une séance précise est identifiée
  const sessionTitle = context.activeSession?.title;
  const programTitle = context.activeProgram?.title;
  const body = sessionTitle
    ? `C'est l'heure de ta séance : ${sessionTitle} (${programTitle || "Programme"}). Let's go !`
    : "Ton entraînement Striking Camp t'attend. Reste régulier dans ta progression !";

  return {
    shouldSend: true,
    category: "workout_digital",
    channel: "in_app",
    title: "Séance du jour 🥊",
    body,
    actionUrl: "/membre/defis?tab=workouts",
    scheduledFor: `${zoned.dateStr}T${targetTimeStr}`,
    reason: "Séance digitale programmée aujourd'hui et non complétée",
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 6. ÉVALUATION DU COURS PHYSIQUE AU CLUB (H-2)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Évalue l'éligibilité d'un rappel H-2 pour une réservation de cours physique
 */
export function evaluateClubWorkoutReminder(
  booking: ClubBookingItem,
  context: ReminderEvaluationContext
): ReminderDecision {
  const prefs = context.preferences || DEFAULT_REMINDER_PREFERENCES;
  const timezone = prefs.timezone || "Europe/Paris";
  const currentTime = context.currentTime || new Date();
  const zoned = getZonedTimeDetails(currentTime, timezone);

  const fallbackResult = (shouldSend: boolean, reason: string): ReminderDecision => ({
    shouldSend,
    category: "workout_club",
    channel: "in_app",
    title: "Rappel Entraînement au Club 🥊",
    body: "Ton cours au Striking Camp Marseille commence dans 2 heures. Prépare tes gants et bandages !",
    actionUrl: `/membre/planning?session=${booking.class_session_id || booking.id}`,
    scheduledFor: booking.starts_at,
    targetId: booking.class_session_id || booking.id,
    reason,
  });

  // 1. Vérification des bascules
  if (prefs.enabled_global === false) {
    return fallbackResult(false, "Notifications globales désactivées");
  }
  if (prefs.enabled_workouts === false) {
    return fallbackResult(false, "Rappels d'entraînement désactivés");
  }

  // 2. Vérifier le statut de la réservation
  if (booking.status === "cancelled") {
    return fallbackResult(false, "Réservation annulée");
  }

  // 3. Calcul du décalage avec l'heure de début du cours
  const courseTime = new Date(booking.starts_at).getTime();
  const nowTime = currentTime.getTime();
  const diffMinutes = Math.round((courseTime - nowTime) / (1000 * 60));

  if (diffMinutes <= 0) {
    return fallbackResult(false, "Le cours a déjà commencé ou est passé");
  }

  // Fenêtre H-2 : entre 60 minutes et 150 minutes avant le cours (centré sur 120 min)
  if (diffMinutes > 150) {
    return fallbackResult(
      false,
      `Trop tôt pour le rappel H-2 (le cours débute dans ${diffMinutes} minutes)`
    );
  }

  if (diffMinutes < 60) {
    return fallbackResult(
      false,
      `Fenêtre H-2 dépassée (le cours débute dans moins de 60 minutes : ${diffMinutes} min)`
    );
  }

  // 4. Protection contre les doublons
  const recentLogs = context.recentLogsToday || [];
  const sessionId = booking.class_session_id || booking.id;
  const alreadySent = hasRecentNotification(recentLogs, "workout_club", zoned.dateStr, sessionId);

  if (alreadySent) {
    return fallbackResult(
      false,
      `Un rappel a déjà été envoyé pour la séance club ${sessionId}`
    );
  }

  // Construction du message avec discipline et heure du cours
  const courseZoned = getZonedTimeDetails(new Date(booking.starts_at), timezone);
  const courseHourStr = formatMinutesToDisplay(courseZoned.timeInMinutes);
  const disciplineName = booking.discipline || "Entraînement";

  return {
    shouldSend: true,
    category: "workout_club",
    channel: "in_app",
    title: `Rappel : ${disciplineName} à ${courseHourStr} 🥊`,
    body: `Ton cours de ${disciplineName} commence dans 2 heures (à ${courseHourStr}). Prépare tes affaires !`,
    actionUrl: `/membre/planning?session=${sessionId}`,
    scheduledFor: booking.starts_at,
    targetId: sessionId,
    reason: `Séance club confirmée dans ${diffMinutes} minutes (fenêtre H-2 active)`,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 7. ÉVALUATION GLOBALE DE TOUS LES RAPPELS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Évalue l'ensemble des rappels potentiels pour un utilisateur et retourne la liste des décisions
 */
export function evaluateAllReminders(
  context: ReminderEvaluationContext
): ReminderDecision[] {
  const decisions: ReminderDecision[] = [];

  // A. Évaluation des 4 repas
  const mealKeys: MealCategoryKey[] = [
    "meal_breakfast",
    "meal_lunch",
    "meal_snack",
    "meal_dinner",
  ];

  for (const mealKey of mealKeys) {
    decisions.push(evaluateMealReminder(mealKey, context));
  }

  // B. Évaluation de l'entraînement digital
  decisions.push(evaluateDigitalWorkoutReminder(context));

  // C. Évaluation des cours physiques réservés
  const clubBookings = context.todayClubBookings || [];
  for (const booking of clubBookings) {
    decisions.push(evaluateClubWorkoutReminder(booking, context));
  }

  return decisions;
}

/**
 * Filtre et retourne uniquement les rappels éligibles à un envoi immédiat (shouldSend === true)
 */
export function getEligibleReminders(
  context: ReminderEvaluationContext
): ReminderDecision[] {
  return evaluateAllReminders(context).filter((d) => d.shouldSend);
}
