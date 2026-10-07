import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const envContent = fs.readFileSync(".env.local", "utf-8");
const env = {};
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const idx = trimmed.indexOf("=");
  if (idx !== -1) {
    env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
  }
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

const client = createClient(supabaseUrl, supabaseServiceKey);

async function inspectDb() {
  console.log("=== INSPECTION SUPABASE ===");

  // 1. Inspecter plans
  const { data: plans, error: errPlans } = await client.from("plans").select("*");
  console.log("Plans actuels :", plans?.map(p => ({ id: p.id, code: p.code, name: p.name, price_cents: p.price_cents })));

  // 2. Tenter un insert/upsert des 3 plans dans public.plans
  const newPlans = [
    {
      code: "decouverte_1",
      name: "Découverte — 1 séance",
      type: "small_group",
      price_cents: 2000,
      commitment: null,
      private_sessions_per_period: null,
      allows_private: false,
      allows_small_group: true,
      allows_collective: true,
      is_active: true,
      badge_text: "Achat unique",
      features: [
        "1 séance Small Group sans engagement",
        "Valable 30 jours à compter de l'achat",
        "Accès à tous les créneaux collectifs (12 pers. max)"
      ],
      display_order: 10
    },
    {
      code: "decouverte_3",
      name: "Découverte — 3 séances",
      type: "small_group",
      price_cents: 4900,
      commitment: null,
      private_sessions_per_period: null,
      allows_private: false,
      allows_small_group: true,
      allows_collective: true,
      is_active: true,
      badge_text: "Achat unique",
      features: [
        "3 séances Small Group sans engagement",
        "Valable 30 jours à compter de l'achat",
        "Accès à tous les créneaux collectifs (12 pers. max)"
      ],
      display_order: 11
    },
    {
      code: "pack_10_small_group",
      name: "Pack 10 séances — Small Group",
      type: "small_group",
      price_cents: 18000,
      commitment: null,
      private_sessions_per_period: null,
      allows_private: false,
      allows_small_group: true,
      allows_collective: true,
      is_active: true,
      badge_text: "Achat unique",
      features: [
        "10 séances Small Group",
        "Valable 3 mois à compter de l'achat",
        "Accès à tous les créneaux collectifs (12 pers. max)",
        "Suivi technique personnalisé"
      ],
      display_order: 12
    }
  ];

  console.log("\nInsertion des 3 plans dans public.plans via service_role...");
  const { data: insertedPlans, error: insertErr } = await client
    .from("plans")
    .upsert(newPlans, { onConflict: "code" })
    .select();

  console.log("Résultat insertion plans :", { success: !insertErr, error: insertErr?.message, plans: insertedPlans });
}

inspectDb().catch(console.error);
