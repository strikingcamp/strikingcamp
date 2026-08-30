import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/**
 * Route API Cron pour le maintien automatique de l'horizon de planning (12 semaines d'avance).
 * Déclenchée automatiquement chaque semaine (ex: Vercel Cron, Supabase Edge Function, ou Cron externe).
 * URL : /api/cron/maintain-schedule
 */
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Vérification de sécurité Bearer Token
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Configuration Supabase manquante" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Appel de la RPC intelligente de prolongation
    const { data, error } = await supabase.rpc("maintain_schedule_horizon", {
      p_target_weeks_ahead: 12,
    });

    if (error) {
      console.error("Erreur Cron maintain_schedule_horizon :", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      executedAt: new Date().toISOString(),
      result: data,
    });
  } catch (err: any) {
    console.error("Exception Cron maintain_schedule_horizon :", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Erreur interne" },
      { status: 500 }
    );
  }
}
