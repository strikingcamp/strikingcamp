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

async function checkCreditTables() {
  console.log("Testing insert into member_session_credits...");
  // Test insert a dummy row and delete it immediately to verify all columns
  const testId = "00000000-0000-0000-0000-000000000001";
  const { data, error } = await client.from("member_session_credits").insert({
    id: testId,
    user_id: "00000000-0000-0000-0000-000000000000",
    plan_id: "4a47a8db-3837-4e28-9a4a-c2fe82d5fc41",
    total_credits: 1,
    remaining_credits: 1,
    starts_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
    status: "active",
    stripe_checkout_session_id: "cs_test_probe_1",
  }).select();

  console.log("member_session_credits insert test:", { success: !error, error: error?.message, data });

  if (data) {
    await client.from("member_session_credits").delete().eq("id", testId);
    console.log("Cleaned up dummy member_session_credits test row.");
  }

  console.log("\nTesting insert into session_credit_transactions...");
  const txTestId = "00000000-0000-0000-0000-000000000002";
  const { data: txData, error: txError } = await client.from("session_credit_transactions").insert({
    id: txTestId,
    credit_pack_id: testId,
    user_id: "00000000-0000-0000-0000-000000000000",
    delta: 1,
    transaction_type: "purchase",
    reason: "Achat pack test",
  }).select();

  console.log("session_credit_transactions insert test:", { success: !txError, error: txError?.message, data: txData });
  if (txData) {
    await client.from("session_credit_transactions").delete().eq("id", txTestId);
    console.log("Cleaned up dummy session_credit_transactions test row.");
  }
}

checkCreditTables().catch(console.error);
