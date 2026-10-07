import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const envContent = fs.readFileSync(".env.local", "utf-8");
const env = {};
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const idx = trimmed.indexOf("=");
  if (idx !== -1) env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
}

const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  console.log("Checking Supabase connection...");
  const { data: plans, error: pErr } = await client.from("plans").select("id, code, name, price_cents").limit(5);
  console.log("Plans sample:", plans, "Error:", pErr);

  const { data: credits, error: cErr } = await client.from("member_session_credits").select("count").limit(1);
  console.log("member_session_credits:", { credits, error: cErr?.message });
}

test().catch(console.error);
