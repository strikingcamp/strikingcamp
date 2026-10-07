import { NextRequest, NextResponse } from "next/server";
import { stripe, SESSION_PACKS } from "@/lib/stripe";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { packId, redirectUrl } = body;

    if (!packId || !SESSION_PACKS[packId]) {
      return NextResponse.json(
        { error: "Identifiant de pack invalide ou introuvable." },
        { status: 400 }
      );
    }

    const pack = SESSION_PACKS[packId];

    // Vérifier l'utilisateur connecté via les cookies Supabase
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Ignore in route handlers
            }
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Restriction stricte : Offres découverte achetables 1 seule fois à vie par membre
    if (user && (pack.id === "decouverte_1" || pack.id === "decouverte_3")) {
      const { checkMemberPackEligibility } = await import("@/lib/supabase/membership-requests");
      const eligibility = await checkMemberPackEligibility(supabase, user.id, pack.id);
      if (!eligibility.isEligible) {
        return NextResponse.json(
          { error: eligibility.alreadyUsed ? "Offre découverte déjà utilisée pour ce compte." : eligibility.reason },
          { status: 400 }
        );
      }
    }

    const origin = req.headers.get("origin") || "https://www.strikingcamp.com";
    const successUrl = `${origin}/membre/planning?payment=success&pack=${pack.id}`;
    const cancelUrl = redirectUrl || `${origin}/tarifs?payment=cancelled`;

    // Création de la Checkout Session en mode 'payment' (Paiement unique)
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: pack.name,
              description: pack.description,
              images: [`${origin}/sacSalle.jpg`],
            },
            unit_amount: pack.priceCents,
          },
          quantity: 1,
        },
      ],
      customer_email: user?.email || undefined,
      client_reference_id: user?.id || undefined,
      metadata: {
        packId: pack.id,
        planCode: pack.planCode,
        totalCredits: pack.totalCredits.toString(),
        userId: user?.id || "",
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      locale: "fr",
      allow_promotion_codes: true,
    });

    return NextResponse.json({
      success: true,
      url: session.url,
      sessionId: session.id,
    });
  } catch (error: any) {
    console.error("[Stripe Checkout API] Erreur :", error);
    return NextResponse.json(
      { error: error?.message || "Erreur lors de l'initialisation du paiement Stripe." },
      { status: 500 }
    );
  }
}
