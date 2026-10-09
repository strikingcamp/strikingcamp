import { NextRequest, NextResponse } from "next/server";
import { stripe, SESSION_PACKS, computePackExpirationDate } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const bodyText = await req.text();
  const signature = req.headers.get("stripe-signature");

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: any;

  try {
    if (webhookSecret && signature) {
      event = stripe.webhooks.constructEvent(bodyText, signature, webhookSecret);
    } else {
      // Fallback dev / non-vérifié si secret non configuré
      event = JSON.parse(bodyText);
    }
  } catch (err: any) {
    console.error("[Stripe Webhook] Erreur signature webhook :", err.message);
    return NextResponse.json(
      { error: `Erreur webhook : ${err.message}` },
      { status: 400 }
    );
  }

  // Traitement de l'événement checkout.session.completed (désactivé pour l'attribution automatique)
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as any;

    console.log(
      `[Stripe Webhook] Événement checkout.session.completed reçu pour la session ${session?.id}. L'attribution automatique est désactivée (circuit validation administrative obligatoire).`
    );
    // STRIKING CAMP : L'attribution de crédits et d'abonnements est strictement réservée
    // à la validation administrative via les RPC sécurisées.
    return NextResponse.json({
      received: true,
      message: "Direct credit allocation via Stripe webhook is disabled. Administrative approval required.",
    });
  }

  return NextResponse.json({ received: true });
}

/**
 * Traitement idempotent de l'achat d'un pack de crédits suite au paiement Stripe
 */
async function handleCheckoutSessionCompleted(session: any) {
  const metadata = session.metadata || {};
  const packId = metadata.packId;
  let userId = metadata.userId || session.client_reference_id;

  if (!packId || !SESSION_PACKS[packId]) {
    console.warn("[Stripe Webhook] Session sans packId valide :", session.id);
    return;
  }

  const pack = SESSION_PACKS[packId];
  const supabase = createAdminClient();

  // 1. Protection contre les doublons : Idempotence stricte via stripe_checkout_session_id
  const { data: existingPack } = await supabase
    .from("member_session_credits")
    .select("id")
    .eq("stripe_checkout_session_id", session.id)
    .maybeSingle();

  if (existingPack) {
    console.log(`[Stripe Webhook] Session ${session.id} déjà traitée (Pack ID: ${existingPack.id}). Idempotence garantie.`);
    return;
  }

  // 2. Si aucun userId dans metadata, chercher ou associer via l'email du client
  const customerEmail =
    session.customer_details?.email || session.customer_email;

  if (!userId && customerEmail) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", customerEmail)
      .maybeSingle();

    if (profile?.id) {
      userId = profile.id;
    } else {
      // Chercher dans auth.users
      const { data: authUser } = await supabase.auth.admin.listUsers();
      const matched = authUser?.users?.find(
        (u) => u.email?.toLowerCase() === customerEmail.toLowerCase()
      );
      if (matched?.id) {
        userId = matched.id;
      }
    }
  }

  if (!userId) {
    console.error(
      `[Stripe Webhook] Impossible d'associer le pack ${packId} : Aucun userId ni email trouvé pour la session ${session.id}`
    );
    return;
  }

  // 3. Récupération du plan_id correspondant au planCode dans public.plans
  const { data: planData } = await supabase
    .from("plans")
    .select("id")
    .eq("code", pack.planCode)
    .maybeSingle();

  if (!planData) {
    console.error(`[Stripe Webhook] Plan introuvable pour le code ${pack.planCode}`);
    return;
  }

  const startsAt = new Date();
  const expiresAt = computePackExpirationDate(pack.id, startsAt);

  // 4. Insertion du pack dans public.member_session_credits
  const { data: newPack, error: packErr } = await supabase
    .from("member_session_credits")
    .insert({
      user_id: userId,
      plan_id: planData.id,
      total_credits: pack.totalCredits,
      remaining_credits: pack.totalCredits,
      starts_at: startsAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      status: "active",
      stripe_payment_intent_id: session.payment_intent ? String(session.payment_intent) : null,
      stripe_checkout_session_id: session.id,
    })
    .select()
    .single();

  if (packErr || !newPack) {
    console.error("[Stripe Webhook] Erreur création member_session_credits :", packErr);
    throw packErr;
  }

  // 5. Insertion de la transaction d'audit initiale dans public.session_credit_transactions
  const { error: txErr } = await supabase
    .from("session_credit_transactions")
    .insert({
      credit_pack_id: newPack.id,
      user_id: userId,
      delta: pack.totalCredits,
      transaction_type: "purchase",
      reason: `Achat Stripe en ligne : ${pack.name} (${pack.priceEuros} €)`,
    });

  if (txErr) {
    console.error("[Stripe Webhook] Erreur enregistrement session_credit_transactions :", txErr);
  }

  console.log(
    `[Stripe Webhook] ✅ Pack créé avec succès pour l'utilisateur ${userId} : ${pack.name} (${pack.totalCredits} crédits, expire le ${expiresAt.toISOString()})`
  );
}
