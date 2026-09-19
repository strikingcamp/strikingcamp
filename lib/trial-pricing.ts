/**
 * Configuration centralisée des tarifs des Cours d'Essai Striking Camp.
 * 
 * TARIFS OFFICIELS :
 * - Cours d'essai Collectif : 10 €
 * - Cours d'essai Small Group : 15 €
 * - Cours d'essai Privé : 25 €
 * 
 * Architecture préparée pour l'intégration ultérieure du paiement HelloAsso.
 */

export type TrialSessionType = "collective" | "small_group" | "private";

export interface TrialPricingItem {
  type: TrialSessionType;
  label: string;
  categoryLabel: string;
  price: number; // Prix en euros
  priceFormatted: string;
  badge: string;
  description: string;
}

export const TRIAL_PRICING: Record<TrialSessionType, TrialPricingItem> = {
  collective: {
    type: "collective",
    label: "Collectif",
    categoryLabel: "Cours Collectif",
    price: 10,
    priceFormatted: "10 €",
    badge: "Tarif Essai 10 €",
    description: "Séance collective d'essai encadrée par le coach",
  },
  small_group: {
    type: "small_group",
    label: "Small Group",
    categoryLabel: "Small Group",
    price: 15,
    priceFormatted: "15 €",
    badge: "Tarif Essai 15 €",
    description: "Séance en petit groupe (12 max) avec suivi technique personnalisé",
  },
  private: {
    type: "private",
    label: "Privé",
    categoryLabel: "Cours Privé",
    price: 25,
    priceFormatted: "25 €",
    badge: "Tarif Essai 25 €",
    description: "Séance individuelle sur-mesure avec le coach Mahfoud",
  },
};

/**
 * Retourne le prix numérique en euros d'un cours d'essai selon son type.
 */
export function getTrialPrice(type: string | null | undefined): number {
  if (type === "small_group") return TRIAL_PRICING.small_group.price;
  if (type === "private") return TRIAL_PRICING.private.price;
  return TRIAL_PRICING.collective.price;
}

/**
 * Retourne le prix formaté ("10 €", "15 €", "25 €") d'un cours d'essai.
 */
export function getTrialPriceFormatted(type: string | null | undefined): string {
  if (type === "small_group") return TRIAL_PRICING.small_group.priceFormatted;
  if (type === "private") return TRIAL_PRICING.private.priceFormatted;
  return TRIAL_PRICING.collective.priceFormatted;
}

/**
 * Retourne le libellé propre du type de cours ("Collectif", "Small Group", "Privé").
 */
export function getTrialTypeLabel(type: string | null | undefined): string {
  if (type === "small_group") return TRIAL_PRICING.small_group.label;
  if (type === "private") return TRIAL_PRICING.private.label;
  return TRIAL_PRICING.collective.label;
}

/**
 * Retourne le libellé de catégorie complet ("Cours Collectif", "Small Group", "Cours Privé").
 */
export function getTrialCategoryLabel(type: string | null | undefined): string {
  if (type === "small_group") return TRIAL_PRICING.small_group.categoryLabel;
  if (type === "private") return TRIAL_PRICING.private.categoryLabel;
  return TRIAL_PRICING.collective.categoryLabel;
}
