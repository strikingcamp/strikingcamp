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

async function exportJson() {
  const { data: recipes } = await client
    .from("recipes")
    .select("id, slug, title, category, target_goal, prep_time_minutes, calories, proteins_g, carbs_g, fats_g, ingredients:recipe_ingredients(name, quantity, unit, display_order)")
    .order("category", { ascending: true })
    .order("title", { ascending: true });

  fs.writeFileSync("tests/all-recipes-dump.json", JSON.stringify(recipes, null, 2), "utf-8");
  console.log("Exported", recipes.length, "recipes to tests/all-recipes-dump.json");
}

exportJson().catch(console.error);
