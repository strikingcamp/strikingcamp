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

async function run() {
  console.log("=== VÉRIFICATION AVANT APPLICATION ===");
  
  const { count: countBefore, error: errBefore } = await client
    .from("recipes")
    .select("*", { count: "exact", head: true });
  console.log("Nombre de recettes AVANT:", countBefore);

  const { count: ingBefore, error: ingErrBefore } = await client
    .from("recipe_ingredients")
    .select("*", { count: "exact", head: true });
  console.log("Nombre d'ingrédients AVANT:", ingBefore);

  // Test target_goal with new value 'recomposition' / 'maintenance' / 'all'
  console.log("\nTesting if recipes table accepts 'all' or 'recomposition'...");
  const testRecipe = {
    id: "e2000001-0001-4000-8000-000000000001",
    title: "Fromage blanc aux fruits rouges & graines de chia",
    slug: "fromage-blanc-fruits-rouges-chia",
    category: "breakfast",
    target_goal: "all",
    prep_time_minutes: 5,
    difficulty: "Facile",
    calories: 260,
    proteins_g: 28,
    carbs_g: 22,
    fats_g: 5,
    image_url: "/images/recipes/fb-fruits-rouges.jpg",
    instructions: "1. Verser 250g de fromage blanc 0% ou 3% dans un bol.\n2. Ajouter 100g de mélange de fruits rouges.\n3. Saupoudrer de 1 cuillère à café de graines de chia (5g).\n4. Déguster frais.",
    tags: ["high_protein", "quick", "breakfast", "clean_eating", "vegetarian"],
    is_premium: false,
    is_active: true,
    display_order: 10
  };

  const { data: upsertData, error: upsertErr } = await client
    .from("recipes")
    .upsert(testRecipe, { onConflict: "slug" })
    .select();

  console.log("Upsert test recipe result:", { success: !upsertErr, error: upsertErr });

  // Test user_fitness_profiles prep_time_preference column
  console.log("\nTesting user_fitness_profiles prep_time_preference column...");
  const { data: ufpList } = await client.from("user_fitness_profiles").select("id, user_id").limit(1);
  if (ufpList && ufpList.length > 0) {
    const testId = ufpList[0].id;
    const { error: updateErr } = await client
      .from("user_fitness_profiles")
      .update({ prep_time_preference: "quick" })
      .eq("id", testId);
    console.log("prep_time_preference update test:", { success: !updateErr, error: updateErr });
  } else {
    console.log("No existing user_fitness_profiles rows to update.");
  }
}

run().catch(console.error);
