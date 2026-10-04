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

async function listAll() {
  const { data: recipes, error } = await client
    .from("recipes")
    .select("id, slug, title, category, target_goal, prep_time_minutes, calories, proteins_g, carbs_g, fats_g, ingredients:recipe_ingredients(name, quantity, unit)")
    .order("category", { ascending: true })
    .order("title", { ascending: true });

  if (error) throw error;

  console.log(`TOTAL RECETTES: ${recipes.length}`);
  
  const byCat = {
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: []
  };

  recipes.forEach((r) => {
    if (!byCat[r.category]) byCat[r.category] = [];
    byCat[r.category].push(r);
  });

  Object.entries(byCat).forEach(([cat, list]) => {
    console.log(`\n=== CATEGORIE: ${cat.toUpperCase()} (${list.length}) ===`);
    list.forEach((r, idx) => {
      const ings = (r.ingredients || []).map(i => `${i.name}${i.quantity ? ` (${i.quantity}${i.unit || ''})` : ''}`).join(", ");
      console.log(`${idx + 1}. [${r.slug}] "${r.title}" | Ingrédients: ${ings || 'N/A'}`);
    });
  });
}

listAll().catch(console.error);
