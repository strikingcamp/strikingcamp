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

const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  console.log("Checking user_fitness_profiles columns...");
  const { data: ufp, error: ufpErr } = await client.from("user_fitness_profiles").select("*").limit(1);
  if (ufpErr) {
    console.error("ufpErr:", ufpErr);
  } else {
    console.log("user_fitness_profiles sample row fields:", ufp.length > 0 ? Object.keys(ufp[0]) : "table is empty");
  }

  console.log("\nChecking recipes count...");
  const { count: recCount, error: recErr } = await client.from("recipes").select("*", { count: "exact", head: true });
  console.log("Recipes count:", recCount, "Error:", recErr);

  console.log("\nChecking recipe_ingredients count...");
  const { count: ingCount, error: ingErr } = await client.from("recipe_ingredients").select("*", { count: "exact", head: true });
  console.log("Ingredients count:", ingCount, "Error:", ingErr);
}

check().catch(console.error);
