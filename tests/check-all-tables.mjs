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

const candidateTables = [
  "profiles",
  "subscriptions",
  "plans",
  "bookings",
  "class_sessions",
  "course_credits",
  "nutrition_platform_settings",
  "user_fitness_profiles",
  "user_weight_logs",
  "recipes",
  "recipe_ingredients",
  "user_daily_food_logs",
  "workout_programs",
  "program_sessions",
  "program_exercises",
  "user_session_completions",
  "challenges",
  "user_challenges"
];

async function checkTables() {
  console.log("Checking candidate tables in database:\n");
  for (const table of candidateTables) {
    const { data, error, count } = await client.from(table).select("*", { count: "exact", head: true });
    if (error) {
      console.log(`❌ Table '${table}': NOT FOUND or Error (${error.code}) - ${error.message}`);
    } else {
      console.log(`✅ Table '${table}': EXISTS (count = ${count})`);
    }
  }
}

checkTables().catch(console.error);
