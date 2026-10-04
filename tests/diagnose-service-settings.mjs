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
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

const anonClient = createClient(supabaseUrl, supabaseAnonKey);
const adminClient = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
  console.log("=== DIAGNOSTIC SERVICE_SETTINGS ===");

  console.log("\n1. Query via adminClient (service_role)...");
  const { data: adminData, error: adminErr } = await adminClient
    .from("service_settings")
    .select("service_key, is_active");
  console.log("Admin result:", { adminData, adminErr });

  console.log("\n2. Query via anonClient (browser/member client)...");
  const { data: anonData, error: anonErr } = await anonClient
    .from("service_settings")
    .select("service_key, is_active");
  console.log("Anon result:", { anonData, anonErr });

  if (anonErr) {
    console.log("Detailed anon error:", {
      message: anonErr.message,
      code: anonErr.code,
      details: anonErr.details,
      hint: anonErr.hint,
    });
  }
}

check().catch(console.error);
