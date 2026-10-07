import fs from "node:fs";

const envContent = fs.readFileSync(".env.local", "utf-8");
const env = {};
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const idx = trimmed.indexOf("=");
  if (idx !== -1) env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
}

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

async function testEndpoints() {
  const sql = "SELECT table_name FROM information_schema.tables WHERE table_schema='public';";
  
  // 1. Endpoint /rest/v1/rpc (test default RPCs)
  const rpcs = ["exec_sql", "run_sql", "execute_sql", "admin_execute_sql", "execute_query"];
  for (const rpc of rpcs) {
    try {
      const res = await fetch(`${url}/rest/v1/rpc/${rpc}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": key,
          "Authorization": `Bearer ${key}`
        },
        body: JSON.stringify({ query: sql, sql: sql })
      });
      console.log(`RPC ${rpc} status:`, res.status);
      if (res.status !== 404) {
        console.log(`RPC ${rpc} response:`, await res.text());
      }
    } catch (e) {
      console.log(`RPC ${rpc} error:`, e.message);
    }
  }
}

testEndpoints().catch(console.error);
