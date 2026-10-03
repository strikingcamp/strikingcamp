import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

// Parse .env.local manually
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
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

console.log("Supabase URL:", supabaseUrl);
console.log("Has Anon Key:", !!supabaseAnonKey);
console.log("Has Service Key:", !!supabaseServiceKey);

async function test() {
  const client = createClient(supabaseUrl, supabaseAnonKey);

  console.log("\n1. Testing query with Anon Key on 'recipes':");
  const { data: recipes, error: recipesErr } = await client
    .from("recipes")
    .select("id, title, category, is_premium, is_active");

  if (recipesErr) {
    console.error("❌ Error querying recipes:", recipesErr);
  } else {
    console.log(`✅ Success: Found ${recipes?.length} recipes with anon key.`);
    if (recipes && recipes.length > 0) {
      console.log("Sample recipes:", recipes.slice(0, 3));
    }
  }

  console.log("\n2. Testing query with join 'ingredients:recipe_ingredients(*)':");
  const { data: recipesWithIng, error: ingErr } = await client
    .from("recipes")
    .select("*, ingredients:recipe_ingredients(*)")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (ingErr) {
    console.error("❌ Error querying recipes with ingredients:", ingErr);
  } else {
    console.log(`✅ Success: Found ${recipesWithIng?.length} recipes with ingredients.`);
  }

  if (supabaseServiceKey) {
    console.log("\n3. Testing query with Service Role Key:");
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: adminRecipes, error: adminErr } = await adminClient
      .from("recipes")
      .select("id, title, is_active");
    if (adminErr) {
      console.error("❌ Admin error:", adminErr);
    } else {
      console.log(`✅ Admin Success: Found ${adminRecipes?.length} recipes.`);
    }
  }
}

test().catch(console.error);
