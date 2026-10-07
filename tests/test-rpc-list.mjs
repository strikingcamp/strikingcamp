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

async function checkRpc() {
  const rpcs = ["exec_sql", "exec", "run_sql", "execute_sql", "sql"];
  for (const r of rpcs) {
    const { data, error } = await client.rpc(r, { query: "SELECT 1;" });
    console.log(`RPC ${r}:`, error ? error.message : data);
  }
}

checkRpc().catch(console.error);
