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

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data: recipes } = await supabase.from('recipes').select('slug, image_url, title, display_order').order('display_order', { ascending: true });
  const { data: storageFiles } = await supabase.storage.from('recipes').list('', { limit: 200 });
  const storageSet = new Set((storageFiles || []).map(f => f.name));

  console.log('Total recipes in DB:', recipes.length);
  console.log('Total files in Storage:', storageSet.size);

  const validated = recipes.filter(r => storageSet.has(r.slug + '.webp') && r.image_url?.includes('/storage/v1/object/public/recipes/' + r.slug + '.webp'));
  console.log('Validated recipes (Storage + image_url):', validated.length);

  const missing = recipes.filter(r => !storageSet.has(r.slug + '.webp'));
  console.log('Missing images in Storage:', missing.length);

  if (missing.length > 0) {
    console.log('First missing:', missing[0].slug, '—', missing[0].title);
  }
}

main();
