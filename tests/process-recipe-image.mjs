import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
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

/**
 * Traite une image générée :
 * 1. Vérifie et redimensionne à 1200x900 WebP q=88 avec Sharp
 * 2. Upload dans le bucket Storage 'recipes/<slug>.webp'
 * 3. Vérifie l'accès HTTP public (200 OK, image/webp)
 * 4. Met à jour public.recipes.image_url
 */
export async function processAndUploadImage(inputFilePath, slug) {
  console.log(`\nTraitement de l'image pour : ${slug}`);
  
  if (!fs.existsSync(inputFilePath)) {
    throw new Error(`Fichier source introuvable : ${inputFilePath}`);
  }

  const outputWebpPath = path.join('tests', `${slug}.webp`);

  // 1. Sharp Conversion 1200x900 WebP q=88
  await sharp(inputFilePath)
    .resize(1200, 900, {
      fit: 'cover',
      position: 'center'
    })
    .webp({ quality: 88 })
    .toFile(outputWebpPath);

  const fileStats = fs.statSync(outputWebpPath);
  console.log(`WebP 1200x900 généré (${fileStats.size} octets)`);

  if (fileStats.size < 1000) {
    throw new Error(`Fichier généré suspect/invalide (< 1Ko) : ${fileStats.size} octets`);
  }

  // 2. Upload dans Supabase Storage 'recipes'
  const fileBuffer = fs.readFileSync(outputWebpPath);
  const storagePath = `${slug}.webp`;

  const { error: uploadErr } = await supabase.storage
    .from('recipes')
    .upload(storagePath, fileBuffer, {
      contentType: 'image/webp',
      upsert: true
    });

  if (uploadErr) {
    throw new Error(`Erreur upload Storage (${slug}) : ${uploadErr.message}`);
  }

  // 3. Vérification HTTP publique
  const { data: { publicUrl } } = supabase.storage
    .from('recipes')
    .getPublicUrl(storagePath);

  const testRes = await fetch(publicUrl);
  if (testRes.status !== 200 || testRes.headers.get('content-type') !== 'image/webp') {
    throw new Error(`Échec vérification HTTP (${publicUrl}) : statut ${testRes.status}, type ${testRes.headers.get('content-type')}`);
  }

  // 4. Mise à jour de public.recipes.image_url
  const { error: dbErr } = await supabase
    .from('recipes')
    .update({ image_url: publicUrl })
    .eq('slug', slug);

  if (dbErr) {
    throw new Error(`Erreur mise à jour base (${slug}) : ${dbErr.message}`);
  }

  console.log(`SUCCÈS : ${slug} uploadé et synchronisé -> ${publicUrl}`);

  // Nettoyage temporaire local
  try {
    if (fs.existsSync(outputWebpPath)) fs.unlinkSync(outputWebpPath);
  } catch {}

  return { success: true, publicUrl, size: fileStats.size };
}
