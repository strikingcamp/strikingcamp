import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter(l => l.trim() && !l.startsWith('#') && l.includes('='))
    .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim()]; })
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: storageFiles } = await supabase.storage.from('recipes').list('', { limit: 200 });
  const storageWebp = (storageFiles || []).filter(f => f.name.endsWith('.webp')).map(f => f.name);

  const { data: dbRecipes } = await supabase.from('recipes').select('id, slug, title, image_url');

  const storageSlugs = storageWebp.map(f => f.replace('.webp', ''));
  const validImageUrl = dbRecipes.filter(r => r.image_url && r.image_url.includes('/recipes/') && storageWebp.includes(r.slug + '.webp'));
  const missingImage = dbRecipes.filter(r => !r.image_url || !storageWebp.includes(r.slug + '.webp'));
  const storageWithoutRecipe = storageSlugs.filter(slug => !dbRecipes.some(r => r.slug === slug));

  console.log('--- RECAPITULATIF SUPABASE ---');
  console.log('Total recettes en DB:', dbRecipes.length);
  console.log('Fichiers webp dans Storage:', storageWebp.length);
  console.log('Recettes avec image_url valide et matchante:', validImageUrl.length);
  console.log('Recettes sans image:', missingImage.length);
  console.log('Fichiers Storage sans recette en DB:', storageWithoutRecipe.length);
  console.log('Premier slug manquant:', missingImage[0]?.slug, `(${missingImage[0]?.title})`);
  console.log('\nFichiers dans Storage:');
  storageWebp.forEach((f, i) => console.log(` ${i+1}. ${f}`));
}

run();
