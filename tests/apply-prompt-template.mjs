import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Applique tests/recipe-prompt-template.txt aux recettes dont l'image n'est pas encore validée.
// - Titre et ingrédients lus en base (lecture seule).
// - Les entrées dont l'image est déjà valide (Storage > 1 Ko + image_url synchronisée) restent inchangées.
// - Sauvegarde de tests/recipes-prompts-full.json avant écriture.

const env = fs.readFileSync('.env.local', 'utf-8');
const envVars = Object.fromEntries(
  env.split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'))
    .map(l => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    })
);

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabase = createClient(supabaseUrl, envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const PROMPTS_PATH = 'tests/recipes-prompts-full.json';
const TEMPLATE_PATH = 'tests/recipe-prompt-template.txt';

function formatIngredients(ingredients) {
  return (ingredients || [])
    .map(ing => (ing.quantity ? `${ing.name} (${ing.quantity} ${ing.unit || ''})`.trim() : ing.name))
    .join(', ');
}

async function main() {
  const template = fs.readFileSync(TEMPLATE_PATH, 'utf-8').trim();
  const prompts = JSON.parse(fs.readFileSync(PROMPTS_PATH, 'utf-8'));

  const { data: recipes, error: rErr } = await supabase
    .from('recipes')
    .select('slug, title, image_url, ingredients:recipe_ingredients(name, quantity, unit)');
  if (rErr) throw rErr;
  const recipeMap = new Map(recipes.map(r => [r.slug, r]));

  const { data: storageFiles, error: sErr } = await supabase.storage.from('recipes').list('', { limit: 200 });
  if (sErr) throw sErr;
  const storageMap = new Map((storageFiles || []).map(f => [f.name, f]));

  let kept = 0;
  let updated = 0;
  const missingInDb = [];

  const next = prompts.map(p => {
    const recipe = recipeMap.get(p.slug);
    if (!recipe) {
      missingInDb.push(p.slug);
      return p;
    }
    const file = storageMap.get(`${p.slug}.webp`);
    const expectedUrl = `${supabaseUrl}/storage/v1/object/public/recipes/${p.slug}.webp`;
    const isValid = file && (file.metadata?.size || 0) > 1000 && recipe.image_url === expectedUrl;
    if (isValid) {
      kept++;
      return p;
    }
    const ingredients = formatIngredients(recipe.ingredients);
    updated++;
    return {
      ...p,
      title: recipe.title,
      ingredients,
      prompt: template
        .replace('{{RECIPE_TITLE}}', recipe.title)
        .replace('{{STRICT_INGREDIENTS}}', ingredients),
    };
  });

  const backup = PROMPTS_PATH.replace('.json', `.backup-${Date.now()}.json`);
  fs.copyFileSync(PROMPTS_PATH, backup);
  fs.writeFileSync(PROMPTS_PATH, JSON.stringify(next, null, 2), 'utf-8');

  console.log(`Sauvegarde : ${backup}`);
  console.log(`Entrées conservées (image valide) : ${kept}`);
  console.log(`Entrées mises à jour avec le nouveau modèle : ${updated}`);
  if (missingInDb.length) console.log(`Slugs absents de la base (inchangés) : ${missingInDb.join(', ')}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
