import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  addPushSubscription,
  removePushSubscription,
  type PushSubscriptionInput,
} from "@/lib/supabase/notifications";

/**
 * Validation stricte d'un endpoint Web Push
 */
function isValidEndpoint(endpoint: unknown): endpoint is string {
  if (typeof endpoint !== "string") return false;
  const trimmed = endpoint.trim();
  if (!trimmed.startsWith("https://") && !trimmed.startsWith("http://localhost")) {
    return false;
  }
  return trimmed.length >= 10 && trimmed.length <= 2048;
}

/**
 * Validation d'une clé de cryptage Web Push (base64)
 */
function isValidPushKey(key: unknown): key is string {
  if (typeof key !== "string") return false;
  const trimmed = key.trim();
  return trimmed.length >= 8 && trimmed.length <= 512;
}

/**
 * POST /api/notifications/push-subscription
 * Enregistre ou met à jour une souscription Web Push pour l'utilisateur connecté.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Non autorisé — session requise" },
        { status: 401 }
      );
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Corps de requête JSON invalide" },
        { status: 400 }
      );
    }

    const { endpoint, p256dh_key, auth_key, user_agent } = body || {};

    if (!isValidEndpoint(endpoint)) {
      return NextResponse.json(
        { error: "Format d'endpoint Web Push invalide (doit être une URL HTTPS valide)" },
        { status: 400 }
      );
    }

    if (!isValidPushKey(p256dh_key) || !isValidPushKey(auth_key)) {
      return NextResponse.json(
        { error: "Clés de chiffrement Web Push (p256dh / auth) invalides ou manquantes" },
        { status: 400 }
      );
    }

    const subscriptionInput: PushSubscriptionInput = {
      endpoint: endpoint.trim(),
      p256dh_key: p256dh_key.trim(),
      auth_key: auth_key.trim(),
      user_agent: typeof user_agent === "string" ? user_agent.slice(0, 500) : null,
    };

    // SÉCURITÉ : user.id provient EXCLUSIVEMENT de la session authentifiée
    const subscription = await addPushSubscription(
      supabase,
      user.id,
      subscriptionInput
    );

    return NextResponse.json(
      {
        success: true,
        id: subscription.id,
        endpoint: subscription.endpoint,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[POST /api/notifications/push-subscription] Erreur :", error);
    return NextResponse.json(
      { error: "Erreur serveur lors de l'enregistrement de l'abonnement push" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications/push-subscription
 * Supprime une souscription Web Push par son endpoint pour l'utilisateur connecté.
 */
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Non autorisé — session requise" },
        { status: 401 }
      );
    }

    let endpoint: string | null = null;

    try {
      const body = await req.json();
      endpoint = body?.endpoint;
    } catch {
      // Fallback si passé en query param
      const url = new URL(req.url);
      endpoint = url.searchParams.get("endpoint");
    }

    if (!endpoint || !isValidEndpoint(endpoint)) {
      return NextResponse.json(
        { error: "Endpoint manquant ou invalide" },
        { status: 400 }
      );
    }

    // SÉCURITÉ : suppression filtrée par user.id authentifié
    const removed = await removePushSubscription(
      supabase,
      user.id,
      endpoint.trim()
    );

    return NextResponse.json(
      {
        success: removed,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[DELETE /api/notifications/push-subscription] Erreur :", error);
    return NextResponse.json(
      { error: "Erreur serveur lors de la suppression de l'abonnement push" },
      { status: 500 }
    );
  }
}
