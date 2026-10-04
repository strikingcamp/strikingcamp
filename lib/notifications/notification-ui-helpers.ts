/**
 * Utilitaires UI pour le centre de notifications et alertes membre.
 * Ce module est conçu pour être pur (sans dépendances React ou JSX)
 * afin d'être exécutable à la fois dans le navigateur et dans les suites de tests Node.js.
 */

export interface NotificationCategoryMeta {
  label: string;
  badgeClass: string;
  iconBgClass: string;
  defaultActionLabel: string;
  iconType: "utensils" | "dumbbell" | "flame" | "bell";
}

/**
 * Valide et sécurise l'URL d'action contre les attaques d'open redirect.
 * Seules les URLs relatives internes (commençant par un seul slash "/") sont autorisées.
 * Rejette explicitement :
 * - Les URLs externes (http://, https://)
 * - Les URLs protocol-relative (//evil.com)
 * - Les URI pseudo-protocoles (javascript:, data:, vbscript:)
 * - Les chaînes vides ou non string
 */
export function getSafeActionUrl(url?: string | null): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();

  // Doit commencer par '/' mais PAS par '//'
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return null;
  }

  // Vérification de sécurité contre les contournements javascript:
  const normalized = trimmed.toLowerCase();
  if (
    normalized.includes("javascript:") ||
    normalized.includes("data:") ||
    normalized.includes("vbscript:")
  ) {
    return null;
  }

  return trimmed;
}

/**
 * Formate un horodatage ISO en texte relatif ou date locale française (Europe/Paris)
 */
export function formatNotificationDate(dateIso: string): string {
  if (!dateIso) return "";
  try {
    const date = new Date(dateIso);
    if (isNaN(date.getTime())) return dateIso;

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMin / 60);

    if (diffMin < 1) return "À l'instant";
    if (diffMin < 60) return `Il y a ${diffMin} min`;
    if (diffHours < 24 && date.getDate() === now.getDate()) {
      return `Aujourd'hui à ${date.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Paris",
      })}`;
    }

    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Paris",
    });
  } catch {
    return dateIso;
  }
}

/**
 * Associe les métadonnées de catégorie (libellé, badge, action par défaut, type d'icône)
 */
export function getNotificationCategoryMeta(category: string): NotificationCategoryMeta {
  switch (category) {
    case "meal_breakfast":
      return {
        label: "Petit-Déjeuner",
        iconType: "utensils",
        badgeClass: "bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/30",
        iconBgClass: "bg-[#22c55e]/10 text-[#22c55e]",
        defaultActionLabel: "Consigner mon repas",
      };
    case "meal_lunch":
      return {
        label: "Déjeuner",
        iconType: "utensils",
        badgeClass: "bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/30",
        iconBgClass: "bg-[#22c55e]/10 text-[#22c55e]",
        defaultActionLabel: "Consigner mon repas",
      };
    case "meal_snack":
      return {
        label: "Collation",
        iconType: "utensils",
        badgeClass: "bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/30",
        iconBgClass: "bg-[#22c55e]/10 text-[#22c55e]",
        defaultActionLabel: "Consigner ma collation",
      };
    case "meal_dinner":
      return {
        label: "Dîner",
        iconType: "utensils",
        badgeClass: "bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/30",
        iconBgClass: "bg-[#22c55e]/10 text-[#22c55e]",
        defaultActionLabel: "Consigner mon dîner",
      };
    case "workout_digital":
      return {
        label: "Séance Digitale",
        iconType: "dumbbell",
        badgeClass: "bg-[#00d8ff]/15 text-[#00d8ff] border-[#00d8ff]/30",
        iconBgClass: "bg-[#00d8ff]/10 text-[#00d8ff]",
        defaultActionLabel: "Démarrer la séance",
      };
    case "workout_club":
      return {
        label: "Cours au Club",
        iconType: "flame",
        badgeClass: "bg-brand-blue/15 text-brand-blue border-brand-blue/30",
        iconBgClass: "bg-brand-blue/10 text-brand-blue",
        defaultActionLabel: "Voir ma réservation",
      };
    case "general":
    default:
      return {
        label: "Information",
        iconType: "bell",
        badgeClass: "bg-brand-white/10 text-brand-white/80 border-brand-white/15",
        iconBgClass: "bg-brand-white/5 text-brand-white/80",
        defaultActionLabel: "Voir les détails",
      };
  }
}
