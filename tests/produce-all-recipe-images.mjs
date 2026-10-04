import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import { runFullAudit } from './audit-recipe-images.mjs';

// Configuration environnement
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

/**
 * Pipeline idempotent & restartable de production des images de recettes
 */
export async function runProductionPipeline(options = { dryRun: false }) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('   STRIKING CAMP — PIPELINE DE PRODUCTION IMAGES RECETTES');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. Chargement des données sources
  const { data: recipes, error: rErr } = await supabase
    .from('recipes')
    .select('id, slug, title, category, image_url, display_order, is_active, ingredients:recipe_ingredients(name, quantity, unit)')
    .order('display_order', { ascending: true });

  if (rErr) {
    console.error('Erreur lecture recipes:', rErr);
    return;
  }

  // 2. Chargement des prompts pré-générés
  if (!fs.existsSync('tests/recipes-prompts-full.json')) {
    console.error('Fichier tests/recipes-prompts-full.json introuvable !');
    return;
  }
  const promptsList = JSON.parse(fs.readFileSync('tests/recipes-prompts-full.json', 'utf-8'));
  const promptMap = new Map(promptsList.map(p => [p.slug, p]));

  // 3. Inspection du bucket Storage 'recipes'
  const { data: storageFiles, error: sErr } = await supabase.storage.from('recipes').list('', { limit: 200 });
  if (sErr) {
    console.error('Erreur lecture storage:', sErr);
    return;
  }

  const storageMap = new Map((storageFiles || []).map(f => [f.name, f]));

  let validesCount = 0;
  let missingCount = 0;
  let remainingQueue = [];

  console.log(`Catalogue total : ${recipes.length} recettes\n`);

  for (let i = 0; i < recipes.length; i++) {
    const recipe = recipes[i];
    const indexStr = String(i + 1).padStart(2, '0');
    const slug = recipe.slug;
    const expectedFilename = `${slug}.webp`;
    const expectedPublicUrl = `${supabaseUrl}/storage/v1/object/public/recipes/${expectedFilename}`;
    const storageFile = storageMap.get(expectedFilename);

    let isStorageValid = false;

    if (storageFile && (storageFile.metadata?.size || 0) > 1000) {
      // Vérification HTTP publique
      try {
        const checkRes = await fetch(expectedPublicUrl);
        if (checkRes.status === 200 && checkRes.headers.get('content-type') === 'image/webp') {
          isStorageValid = true;
        }
      } catch (err) {
        isStorageValid = false;
      }
    }

    // Cas 1 : Image déjà 100% valide et synchronisée
    if (isStorageValid && recipe.image_url === expectedPublicUrl) {
      console.log(`[IMAGE ${indexStr}/${recipes.length}] ${slug} → VALIDE (SKIP)`);
      validesCount++;
      continue;
    }

    // Cas 2 : Image Storage valide mais image_url en base non synchronisée
    if (isStorageValid && recipe.image_url !== expectedPublicUrl) {
      console.log(`[IMAGE ${indexStr}/${recipes.length}] ${slug} → STORAGE OK, SYNCHRONISATION BASE...`);
      await supabase.from('recipes').update({ image_url: expectedPublicUrl }).eq('slug', slug);
      console.log(`   ✓ URL synchronisée : ${expectedPublicUrl}`);
      validesCount++;
      continue;
    }

    // Cas 3 : Image manquante ou corrompue → ajout à la file de traitement
    missingCount++;
    const promptItem = promptMap.get(slug);
    remainingQueue.push({
      index: i + 1,
      indexStr,
      recipe,
      slug,
      expectedFilename,
      expectedPublicUrl,
      prompt: promptItem?.prompt || null
    });

    console.log(`[IMAGE ${indexStr}/${recipes.length}] ${slug} → MANQUANTE / À PRODUIRE`);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`ÉTAT DE LA FILE D'ATTENTE :`);
  console.log(`- Images déjà validées : ${validesCount} / ${recipes.length}`);
  console.log(`- Images restantes     : ${remainingQueue.length} / ${recipes.length}`);
  if (remainingQueue.length > 0) {
    console.log(`- Prochaine image      : [${remainingQueue[0].indexStr}] ${remainingQueue[0].slug}`);
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Si exécution à sec (mode check d'état)
  if (options.dryRun) {
    console.log('Mode vérification terminé (aucun appel de génération déclenché).\n');
    await runFullAudit();
    return;
  }

  // Traitement séquentiel des images de la file d'attente
  for (const item of remainingQueue) {
    console.log(`\n============================================================`);
    console.log(`[TRAITEMENT ${item.indexStr}/${recipes.length}] ${item.slug}`);
    console.log(`Titre : ${item.recipe.title}`);
    console.log(`Prompt : ${item.prompt?.slice(0, 100)}...`);

    // Note : Lorsque le quota IA sera réinitialisé, ce point recevra l'appel image
    // Si l'environnement retourne 429 RESOURCE_EXHAUSTED :
    // Le script s'arrête immédiatement et proprement.
  }

  // Audit final systématique
  await runFullAudit();
}

// Exécution par défaut en mode audit / check d'état
runProductionPipeline({ dryRun: true });
