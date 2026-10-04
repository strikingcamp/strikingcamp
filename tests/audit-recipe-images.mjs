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

export async function runFullAudit() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('   AUDIT COMPLET DES 74 IMAGES DE RECETTES');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. Fetch all recipes and ingredients
  const { data: recipes, error: rErr } = await supabase
    .from('recipes')
    .select('id, slug, title, category, target_goal, image_url, display_order, is_active, ingredients:recipe_ingredients(name, quantity, unit)')
    .order('display_order', { ascending: true });

  if (rErr) {
    console.error('Erreur lecture recipes:', rErr);
    return;
  }

  // 2. Fetch all storage files in 'recipes' bucket
  const { data: storageFiles, error: sErr } = await supabase.storage.from('recipes').list('', { limit: 200 });

  if (sErr) {
    console.error('Erreur lecture storage:', sErr);
    return;
  }

  const storageMap = new Map();
  for (const f of storageFiles || []) {
    storageMap.set(f.name, f);
  }

  let valides = 0;
  let manquantes = 0;
  let corrompues = 0;
  let malMappees = 0;
  let anciennesUrls = 0;
  const duplicatesMap = new Map();
  let doublons = 0;

  const nonConformes = [];

  for (const recipe of recipes) {
    const slug = recipe.slug;
    const expectedFilename = `${slug}.webp`;
    const expectedPublicUrl = `${supabaseUrl}/storage/v1/object/public/recipes/${expectedFilename}`;
    const storageFile = storageMap.get(expectedFilename);

    let isFilePresent = Boolean(storageFile);
    let isFileValid = false;
    let isCorrupted = false;

    if (storageFile) {
      const size = storageFile.metadata?.size || 0;
      if (size < 1000) {
        // Less than 1KB -> corrupted placeholder
        isCorrupted = true;
      } else {
        isFileValid = true;
      }
    }

    const currentUrl = recipe.image_url || '';
    if (currentUrl.startsWith('/images/recipes/')) {
      anciennesUrls++;
    }

    if (currentUrl) {
      if (duplicatesMap.has(currentUrl)) {
        doublons++;
      } else {
        duplicatesMap.set(currentUrl, slug);
      }
    }

    if (isFileValid && currentUrl === expectedPublicUrl) {
      valides++;
    } else if (isCorrupted) {
      corrompues++;
      nonConformes.push({
        slug,
        title: recipe.title,
        probleme: `Fichier Storage corrompu/invalide (${storageFile.metadata?.size || 0} octets)`,
        action: 'Régénérer l’image, convertir en WebP 1200x900 et ré-uploader'
      });
    } else if (isFileValid && currentUrl !== expectedPublicUrl) {
      malMappees++;
      nonConformes.push({
        slug,
        title: recipe.title,
        probleme: `Fichier Storage valide présent mais image_url en base non synchronisée (${currentUrl})`,
        action: 'Mettre à jour image_url dans public.recipes'
      });
    } else if (!isFilePresent) {
      manquantes++;
      nonConformes.push({
        slug,
        title: recipe.title,
        probleme: `Image non générée / absente du bucket Storage (image_url actuelle: ${currentUrl})`,
        action: 'Générer l’image avec le prompt Striking Camp, convertir en WebP 1200x900, uploader et synchroniser'
      });
    }
  }

  // Check orphans in storage
  const recipeSlugs = new Set(recipes.map(r => r.slug));
  const orphelins = [];
  for (const f of storageFiles || []) {
    const slugName = f.name.replace(/\.webp$/, '');
    if (!recipeSlugs.has(slugName)) {
      orphelins.push(f.name);
    }
  }

  console.log('TOTAL RECETTES : ' + recipes.length);
  console.log('IMAGES VALIDES : ' + valides);
  console.log('IMAGES MANQUANTES : ' + manquantes);
  console.log('IMAGES CORROMPUES : ' + corrompues);
  console.log('IMAGES MAL MAPPÉES : ' + malMappees);
  console.log('ANCIENNES URL LOCALES : ' + anciennesUrls);
  console.log('DOUBLONS : ' + doublons);
  console.log('FICHIERS ORPHELINS DANS STORAGE : ' + orphelins.length);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('   RECETTES NON CONFORMES (' + nonConformes.length + ')');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  nonConformes.forEach((item, index) => {
    console.log(`${index + 1}. [${item.slug}] - ${item.title}`);
    console.log(`   Problème : ${item.probleme}`);
    console.log(`   Action   : ${item.action}\n`);
  });

  return {
    total: recipes.length,
    valides,
    manquantes,
    corrompues,
    malMappees,
    anciennesUrls,
    doublons,
    orphelins: orphelins.length,
    nonConformes
  };
}

runFullAudit();
