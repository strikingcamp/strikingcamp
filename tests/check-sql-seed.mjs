import fs from "node:fs";

const sql1 = fs.readFileSync("supabase/migrations/20261003_defis_progression_platform.sql", "utf-8");
const sql2 = fs.readFileSync("supabase/migrations/20261004_defis_rich_seed_and_admin.sql", "utf-8");

console.log("=== VÉRIFICATION DU SEED SQL ===");

// Count recipes in sql1 and sql2
const recipes1Matches = sql1.match(/'e1111111-1111-4111-8111-11111111110[1-4]'/g) || [];
const recipes2Matches = sql2.match(/'r[1-3]000000-0000-4000-8000-0000000000[0-1][0-9]'/g) || [];

console.log(`Recettes dans 20261003 : ${recipes1Matches.length}`);
console.log(`Recettes dans 20261004 : ${recipes2Matches.length}`);
console.log(`Total recettes catalogue : ${recipes1Matches.length + recipes2Matches.length}`);

// Count ingredients
const ing1Matches = sql1.match(/INSERT INTO public\.recipe_ingredients[\s\S]*?ON CONFLICT/);
const ing2Matches = sql2.match(/INSERT INTO public\.recipe_ingredients[\s\S]*?ON CONFLICT/);

const countIng1 = (ing1Matches?.[0].match(/\('e1111111/g) || []).length;
const countIng2 = (ing2Matches?.[0].match(/\('r[1-3]000000/g) || []).length;

console.log(`Ingrédients dans 20261003 : ${countIng1}`);
console.log(`Ingrédients dans 20261004 : ${countIng2}`);
console.log(`Total ingrédients : ${countIng1 + countIng2}`);

// Count workout programs
const prog1 = (sql1.match(/'p1111111-1111-4111-8111-11111111110[1-3]'/g) || []).length;
const prog2 = (sql2.match(/'p[2-4]000000-0000-4000-8000-00000000000[1-4]'/g) || []).length;

console.log(`Programmes d'entraînement : ${prog1 + prog2}`);
