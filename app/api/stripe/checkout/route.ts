import { NextRequest, NextResponse } from "next/server";
import { stripe, SESSION_PACKS } from "@/lib/stripe";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  // STRIKING CAMP : Circuit d'achat direct Stripe désactivé.
  // Toutes les offres, formules et packs doivent impérativement faire l'objet
  // d'une demande d'adhésion ou de pack soumise à validation administrative préalable.
  return NextResponse.json(
    {
      error: "DIRECT_PURCHASE_DISABLED",
      message:
        "Les achats directs en ligne sont désactivés. Veuillez effectuer votre demande d'adhésion ou de pack depuis votre espace membre. Les droits seront activés après validation par l'administration du club.",
    },
    { status: 403 }
  );
}
