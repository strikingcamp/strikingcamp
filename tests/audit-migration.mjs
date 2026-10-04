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

async function runAudit() {
  console.log("=== AUDIT COMPLET BASE SUPABASE ===");

  // 1. Total recipes
  const { data: allRecipes, error: recErr } = await client
    .from("recipes")
    .select("id, slug, title, target_goal, prep_time_minutes, calories, proteins_g, carbs_g, fats_g, is_active");
  if (recErr) throw recErr;

  console.log("Nombre total de recettes :", allRecipes.length);

  // 2. Total ingredients
  const { data: allIngredients, error: ingErr } = await client
    .from("recipe_ingredients")
    .select("id, recipe_id, name, quantity, unit");
  if (ingErr) throw ingErr;

  console.log("Nombre total d'ingrédients :", allIngredients.length);

  // 3. Check 40 new recipes
  const newRecipeIds = [];
  for (let i = 1; i <= 40; i++) {
    const hex = i.toString().padStart(12, "0");
    newRecipeIds.push(`e2000001-0001-4000-8000-${hex}`);
  }
  const foundNew = allRecipes.filter((r) => newRecipeIds.includes(r.id));
  console.log(`Nouvelles recettes trouvées : ${foundNew.length}/40`);

  // 4. Check legacy recipes preserved
  const legacyRecipes = allRecipes.filter((r) => !newRecipeIds.includes(r.id));
  console.log(`Anciennes recettes préservées : ${legacyRecipes.length} (attendu: 34)`);

  // 5. Check slug uniqueness
  const slugs = allRecipes.map((r) => r.slug);
  const slugSet = new Set(slugs);
  const duplicates = slugs.length - slugSet.size;
  console.log(`Doublons de slugs : ${duplicates}`);

  // 6. Check ingredients per recipe
  const ingredientsByRecipe = new Map();
  for (const ing of allIngredients) {
    const list = ingredientsByRecipe.get(ing.recipe_id) || [];
    list.push(ing);
    ingredientsByRecipe.set(ing.recipe_id, list);
  }

  const recipesWithoutIngredients = allRecipes.filter((r) => {
    const ings = ingredientsByRecipe.get(r.id);
    return !ings || ings.length === 0;
  });
  console.log(`Recettes sans ingrédients (total) : ${recipesWithoutIngredients.length}`);

  const newRecipesWithoutIngredients = foundNew.filter((r) => {
    const ings = ingredientsByRecipe.get(r.id);
    return !ings || ings.length === 0;
  });
  console.log(`Nouvelles recettes sans ingrédients : ${newRecipesWithoutIngredients.length}`);

  // 7. Check data integrity: calories, macros, prep_time
  const missingData = allRecipes.filter(
    (r) =>
      r.calories == null ||
      r.proteins_g == null ||
      r.carbs_g == null ||
      r.fats_g == null ||
      r.prep_time_minutes == null ||
      !r.title ||
      !r.slug
  );
  console.log(`Données manquantes (macros/temps) : ${missingData.length}`);

  // 8. Check goals distribution
  const goalCounts = {};
  for (const r of allRecipes) {
    goalCounts[r.target_goal] = (goalCounts[r.target_goal] || 0) + 1;
  }
  console.log("Répartition target_goal :", goalCounts);

  // 9. Check user_fitness_profiles prep_time_preference column
  const { data: ufpList, error: ufpErr } = await client
    .from("user_fitness_profiles")
    .select("id, user_id, prep_time_preference")
    .limit(5);

  if (!ufpErr) {
    console.log("prep_time_preference présent dans user_fitness_profiles : OUI");
    console.log("Profils vérifiés avec prep_time_preference :", ufpList.length);
  } else {
    console.error("Erreur lecture prep_time_preference :", ufpErr);
  }

  console.log("\n=== FIN AUDIT ===");
}

runAudit().catch(console.error);
