import { Client } from "pg";
import fs from "node:fs";

const envContent = fs.readFileSync(".env.local", "utf-8");
const env = {};
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const idx = trimmed.indexOf("=");
  if (idx !== -1) env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
}

// Project ref: azfifhmrmdoyzetcfvli
const ref = "azfifhmrmdoyzetcfvli";
const sql = fs.readFileSync("supabase/migrations/20261008_session_credits_system.sql", "utf-8");

async function applySql() {
  console.log("Tentative d'application de la migration SQL...");
  
  // Test via management endpoint / pg endpoint Supabase
  try {
    const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/`, {
      method: "GET",
      headers: {
        "apikey": env.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      }
    });
    console.log("RPC list status:", res.status);
  } catch (e) {
    console.log("Fetch error:", e.message);
  }
}

applySql().catch(console.error);
