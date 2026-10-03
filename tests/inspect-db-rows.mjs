import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const envContent = fs.readFileSync(".env.local", "utf-8");
const env = {};
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const idx = trimmed.indexOf("=");
  if (idx !== -1) {
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    env[key] = val;
  }
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

const anonClient = createClient(supabaseUrl, supabaseAnonKey);
const adminClient = createClient(supabaseUrl, supabaseServiceKey);

async function inspect() {
  console.log("=== INSPECTING RECIPES ===");

  const { data: anonData, error: anonErr } = await anonClient.from("recipes").select("*");
  console.log("Anon query data count:", anonData?.length, "Error:", anonErr);

  const { data: adminData, error: adminErr } = await adminClient.from("recipes").select("*");
  console.log("Admin query data count:", adminData?.length, "Error:", adminErr);

  if (adminData && adminData.length > 0) {
    console.log("Sample recipe from DB:", adminData[0].title, "(is_premium:", adminData[0].is_premium, ", is_active:", adminData[0].is_active, ")");
  }

  const { data: progData, error: progErr } = await adminClient.from("workout_programs").select("id, title, is_active");
  console.log("Workout programs count:", progData?.length, "Error:", progErr);

  const { data: plansData, error: plansErr } = await adminClient.from("plans").select("id, code, name, price_cents, is_digital_plan, tier");
  console.log("Plans count:", plansData?.length, "Error:", plansErr);
  if (plansData) {
    console.log("Plans list:", plansData);
  }
}

inspect().catch(console.error);
