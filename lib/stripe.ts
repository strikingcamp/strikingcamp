import Stripe from "stripe";

/**
 * Client Stripe côté serveur pour le Striking Camp.
 * STRICTEMENT utilisé côté serveur (Server Actions, Route Handlers).
 * Ne JAMAIS importer ni exposer côté client.
 */
let _stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY || "sk_test_placeholder";
    _stripeInstance = new Stripe(key, {
      apiVersion: "2025-02-24.acacia" as Stripe.LatestApiVersion,
      appInfo: {
        name: "Striking Camp",
        version: "1.0.0",
      },
    });
  }
  return _stripeInstance;
}

export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    const client = getStripe();
    const value = (client as any)[prop];
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});

/**
 * Définition stricte des offres de Packs de Séances Small Group.
 * Source unique de vérité côté backend (le frontend n'envoie jamais de montant arbitraire).
 */
export interface SessionPackDefinition {
  id: "decouverte_1" | "decouverte_3" | "pack_10_small_group";
  planCode: string;
  name: string;
  priceCents: number; // en centimes (ex: 2000 = 20 €)
  priceEuros: number;
  totalCredits: number;
  validityDays?: number; // 30 jours
  validityMonths?: number; // 3 mois
  description: string;
  badgeText: string;
}

export const SESSION_PACKS: Record<string, SessionPackDefinition> = {
  decouverte_1: {
    id: "decouverte_1",
    planCode: "decouverte_1",
    name: "Découverte — 1 séance",
    priceCents: 2000,
    priceEuros: 20,
    totalCredits: 1,
    validityDays: 30,
    description: "1 séance Small Group sans engagement, valable 30 jours.",
    badgeText: "Achat unique",
  },
  decouverte_3: {
    id: "decouverte_3",
    planCode: "decouverte_3",
    name: "Découverte — 3 séances",
    priceCents: 4900,
    priceEuros: 49,
    totalCredits: 3,
    validityDays: 30,
    description: "Pack découverte 3 séances Small Group, valable 30 jours.",
    badgeText: "Achat unique",
  },
  pack_10_small_group: {
    id: "pack_10_small_group",
    planCode: "pack_10_small_group",
    name: "Pack 10 séances — Small Group",
    priceCents: 18000,
    priceEuros: 180,
    totalCredits: 10,
    validityMonths: 3,
    description: "Pack 10 séances Small Group avec suivi personnalisé, valable 3 mois.",
    badgeText: "Achat unique",
  },
};

/**
 * Calcule déterministement la date d'expiration d'un pack à compter d'une date de départ.
 */
export function computePackExpirationDate(
  packOrId: string | SessionPackDefinition,
  startDate: Date = new Date()
): Date {
  const pack = typeof packOrId === "string" ? SESSION_PACKS[packOrId] : packOrId;
  const expiresAt = new Date(startDate.getTime());

  if (pack?.validityMonths) {
    expiresAt.setMonth(expiresAt.getMonth() + pack.validityMonths);
  } else if (pack?.validityDays) {
    expiresAt.setDate(expiresAt.getDate() + pack.validityDays);
  } else {
    // Par défaut 30 jours
    expiresAt.setDate(expiresAt.getDate() + 30);
  }

  return expiresAt;
}
