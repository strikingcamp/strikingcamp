import fs from "node:fs";

const sql1 = fs.readFileSync("supabase/migrations/20261003_defis_progression_platform.sql", "utf-8");
const sql2 = fs.readFileSync("supabase/migrations/20261004_defis_rich_seed_and_admin.sql", "utf-8");

function getRecipeIds(sql) {
  const ids = new Set();
  const regex = /'([er][0-9a-f]{7}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})'/g;
  let match;
  while ((match = regex.exec(sql)) !== null) {
    if (match[1].startsWith("e1111111") || match[1].startsWith("r1000000") || match[1].startsWith("r2000000") || match[1].startsWith("r3000000")) {
      ids.add(match[1]);
    }
  }
  return ids;
}

const ids1 = getRecipeIds(sql1);
const ids2 = getRecipeIds(sql2);

console.log("Recettes distinctes dans 20261003 :", ids1.size);
console.log("Recettes distinctes dans 20261004 :", ids2.size);
console.log("Total recettes uniques :", new Set([...ids1, ...ids2]).size);

function getIngredientCount(sql) {
  const ingMatch = sql.match(/INSERT INTO public\.recipe_ingredients[\s\S]*?ON CONFLICT/);
  if (!ingMatch) return 0;
  return (ingMatch[0].match(/\('([er][0-9a-f-]+)'/g) || []).length;
}

console.log("Nombre d'ingrédients distincts 20261003 :", getIngredientCount(sql1));
console.log("Nombre d'ingrédients distincts 20261004 :", getIngredientCount(sql2));
console.log("Total lignes d'ingrédients :", getIngredientCount(sql1) + getIngredientCount(sql2));
