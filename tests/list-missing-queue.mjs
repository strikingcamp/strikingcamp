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
  const { data: recipes } = await supabase.from('recipes').select('slug, title, display_order, category').order('display_order', { ascending: true });
  const { data: storageFiles } = await supabase.storage.from('recipes').list('', { limit: 200 });
  const storageSet = new Set((storageFiles || []).map(f => f.name));

  const prompts = JSON.parse(fs.readFileSync('tests/recipes-prompts-full.json', 'utf-8'));
  const promptMap = new Map(prompts.map(p => [p.slug, p]));

  // Find missing recipes according to prompts order or recipes order
  console.log('--- ETAT ACTUEL STORAGE (' + storageSet.size + ' fichiers) ---');
  for (const f of storageSet) {
    console.log(' - ' + f);
  }

  console.log('\n--- FILE DES RECETTES MANQUANTES DANS PROMPTS ---');
  let count = 0;
  for (let i = 0; i < prompts.length; i++) {
    const p = prompts[i];
    const filename = `${p.slug}.webp`;
    if (!storageSet.has(filename)) {
      count++;
      if (count <= 15) {
        console.log(`${count}. [Index prompt ${i+1}] ${p.slug} (${p.title})`);
      }
    }
  }
  console.log('Total manquant dans prompts:', count);
}

main();
