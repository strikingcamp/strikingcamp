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

async function checkRpc() {
  console.log("Checking if exec_sql or query rpc exists...");
  const { data, error } = await client.rpc("exec_sql", { query: "SELECT count(*) FROM public.profiles;" });
  console.log("exec_sql result:", { data, error });

  const { data: d2, error: e2 } = await client.rpc("exec", { sql: "SELECT count(*) FROM public.profiles;" });
  console.log("exec result:", { d2, e2 });
}

checkRpc().catch(console.error);
