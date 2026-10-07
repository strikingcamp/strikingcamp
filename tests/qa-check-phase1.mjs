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
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

const client = createClient(supabaseUrl, supabaseServiceKey);

async function checkPhase1() {
  console.log("=== PHASE 1 : VÉRIFICATION BASE DE DONNÉES SUPABASE ===");

  // 1. Table member_session_credits
  const res1 = await client.from("member_session_credits").select("*", { count: "exact", head: true });
  if (res1.error) {
    console.log("❌ Table member_session_credits :", res1.error.message);
  } else {
    console.log("✅ Table member_session_credits : EXISTE (count =", res1.count, ")");
  }

  // 2. Table session_credit_transactions
  const res2 = await client.from("session_credit_transactions").select("*", { count: "exact", head: true });
  if (res2.error) {
    console.log("❌ Table session_credit_transactions :", res2.error.message);
  } else {
    console.log("✅ Table session_credit_transactions : EXISTE (count =", res2.count, ")");
  }

  // 3. Colonne credit_pack_id dans bookings
  const res3 = await client.from("bookings").select("id, credit_pack_id").limit(1);
  if (res3.error) {
    console.log("❌ Colonne bookings.credit_pack_id :", res3.error.message);
  } else {
    console.log("✅ Colonne bookings.credit_pack_id : EXISTE");
  }

  // 4. Plans decouverte_1, decouverte_3, pack_10_small_group
  const resPlans = await client.from("plans").select("id, code, name, price_cents, is_active").in("code", ["decouverte_1", "decouverte_3", "pack_10_small_group"]);
  if (resPlans.error) {
    console.log("❌ Table plans :", resPlans.error.message);
  } else {
    console.log("✅ Plans packs dans public.plans :", resPlans.data);
  }

  // 5. Test RPCs existantes
  // RPC create_small_group_booking
  const rpc1 = await client.rpc("create_small_group_booking", { p_class_session_id: "00000000-0000-0000-0000-000000000000" });
  console.log("ℹ️ RPC create_small_group_booking réponse :", rpc1.error?.message || rpc1.data);

  // RPC cancel_small_group_booking
  const rpc2 = await client.rpc("cancel_small_group_booking", { p_booking_id: "00000000-0000-0000-0000-000000000000" });
  console.log("ℹ️ RPC cancel_small_group_booking réponse :", rpc2.error?.message || rpc2.data);

  // RPC admin_adjust_member_credits
  const rpc3 = await client.rpc("admin_adjust_member_credits", {
    p_credit_pack_id: "00000000-0000-0000-0000-000000000000",
    p_delta: 1,
    p_reason: "Test existence"
  });
  console.log("ℹ️ RPC admin_adjust_member_credits réponse :", rpc3.error?.message || rpc3.data);
}

checkPhase1().catch(console.error);
