import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

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
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function buildMasterPrompt(recipeTitle, ingredientsList, category) {
  const containerType = category === 'breakfast' || category === 'snack' || recipeTitle.toLowerCase().includes('bowl')
    ? 'contemporary dark charcoal matte ceramic bowl'
    : recipeTitle.toLowerCase().includes('shaker') || recipeTitle.toLowerCase().includes('smoothie')
    ? 'contemporary elegant transparent glass'
    : 'contemporary dark charcoal matte ceramic plate';

  return `Create an ultra-realistic professional culinary food photograph for the Striking Camp nutrition application.

RECIPE:
${recipeTitle}

STRICT INGREDIENTS:
${ingredientsList}

IMPORTANT INGREDIENT RULE:
Show ONLY the ingredients explicitly listed above.
Do not add, remove, replace, invent or decorate the dish with any ingredient that is not listed in the recipe.
Do not add herbs, spices, sauces, oils, seeds, fruits, vegetables, toppings or garnishes unless they are explicitly listed in the ingredients.
The visual must represent the actual recipe accurately.

FOOD PRESENTATION:
Prepare the exact recipe as one realistic complete serving.
The dish must look like real food prepared by a professional chef for a premium sports nutrition application.
Respect realistic quantities, proportions, textures and cooking methods.
Every ingredient must be visually identifiable when possible.
Do not create an exaggerated oversized portion.
Do not make the food artificially perfect.

STYLE — STRIKING CAMP:
Premium athletic nutrition editorial photography.
Dark, modern, sophisticated, clean, powerful, minimal, premium sports nutrition aesthetic.
The complete recipe library must look as if every photograph was taken by the SAME professional food photographer, in the SAME studio, using the SAME photographic setup.

TABLEWARE:
Plated in a ${containerType}.
Preferred tableware colors: dark charcoal, anthracite, deep navy, dark slate, mineral grey.
Never use white plates, colorful plates, patterned tableware, plastic containers, or cheap commercial packaging.

BACKGROUND:
Dark anthracite concrete, dark slate, dark mineral stone, or subtly textured dark charcoal surface.
Minimal environment. Clean and sophisticated. No kitchen clutter.

COMPOSITION:
The food must occupy approximately 70–80% of the image. Centered composition with strong visual hierarchy. Leave subtle breathing room around the food. No excessive props.

CAMERA:
Professional full-frame culinary photography. Medium close-up. Natural dining perspective at approximately a 45-degree angle. Professional macro-level food detail.

DEPTH OF FIELD:
Moderate shallow depth of field (approx f/3.2). The complete main dish must be sharp with the background softly blurred.

LIGHTING:
Soft natural lateral light coming from approximately 45 degrees, subtle reflector fill, soft sculpted shadows, neutral slightly warm color temperature around 5400K. Preserve realistic food colors.

FOOD REALISM:
Ultra-realistic professional culinary photography. Realistic food textures, moisture, cooking marks, browning, and natural structures. No CGI, no 3D render, no plastic or synthetic appearance.

STRICTLY FORBIDDEN:
No people, no hands, no gym equipment, no boxing gloves, no fitness accessories, no text, no typography, no labels, no packaging, no watermark, no logo, no decorative ingredients not present in the recipe, no random herbs, seeds or sauces, no floating food, no CGI.

IMAGE FORMAT:
Landscape 4:3 ratio, high detail professional food photography.

DO NOT GENERATE ANY TEXT INSIDE THE IMAGE. ONLY SHOW THE ACTUAL FOOD FROM THE RECIPE.`;
}

async function generateAllPrompts() {
  console.log('Chargement des recettes et ingrédients depuis Supabase...');
  const { data: recipes, error: rErr } = await supabase
    .from('recipes')
    .select('id, slug, title, category, target_goal, image_url, display_order, is_active, ingredients:recipe_ingredients(name, quantity, unit)')
    .order('display_order', { ascending: true });

  if (rErr) {
    console.error('Erreur Supabase:', rErr);
    return;
  }

  const promptManifest = recipes.map((r, index) => {
    const ingredientsFormatted = (r.ingredients || [])
      .map(ing => ing.quantity ? `${ing.name} (${ing.quantity} ${ing.unit || ''})`.trim() : ing.name)
      .join(', ');

    const promptText = buildMasterPrompt(r.title, ingredientsFormatted, r.category);

    return {
      index: index + 1,
      id: r.id,
      slug: r.slug,
      title: r.title,
      category: r.category,
      ingredients: ingredientsFormatted,
      imageName: r.slug.replace(/-/g, '_'),
      prompt: promptText
    };
  });

  fs.writeFileSync('tests/recipes-prompts-full.json', JSON.stringify(promptManifest, null, 2));
  console.log(`✓ 74 Prompts générés et sauvegardés dans tests/recipes-prompts-full.json selon le Master Prompt Striking Camp !`);
}

generateAllPrompts();
