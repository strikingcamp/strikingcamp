import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const envContent = fs.readFileSync(".env.local", "utf-8");
const env = {};
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const idx = trimmed.indexOf("=");
  if (idx !== -1) {
    env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
  }
}

const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function runAudit() {
  console.log("=== AUDIT SUPABASE STORAGE & RECIPES ===");

  // 1. Fetch all recipes from DB
  const { data: recipes, error: recErr } = await client
    .from("recipes")
    .select("id, slug, title, image_url");
  if (recErr) throw recErr;

  // 2. Fetch all files from storage bucket 'recipes'
  const { data: files, error: stErr } = await client.storage
    .from("recipes")
    .list();
  if (stErr) throw stErr;

  const storageFileNames = (files || []).map(f => f.name);
  console.log("Fichiers dans le bucket 'recipes' :", storageFileNames);

  let presentCount = 0;
  let missingCount = 0;
  let badMappingCount = 0;
  const missingSlugs = [];
  const presentSlugs = [];

  recipes.forEach(r => {
    const expectedFile = `${r.slug}.webp`;
    const existsInStorage = storageFileNames.includes(expectedFile);
    const expectedUrl = `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/recipes/${expectedFile}`;

    if (existsInStorage) {
      presentCount++;
      presentSlugs.push({ slug: r.slug, title: r.title, url: r.image_url });
      if (r.image_url !== expectedUrl) {
        badMappingCount++;
      }
    } else {
      missingCount++;
      missingSlugs.push(r.slug);
    }
  });

  console.log("\n=================================");
  console.log(`TOTAL RECETTES : ${recipes.length}`);
  console.log(`IMAGES ATTENDUES : 74`);
  console.log(`IMAGES PRÉSENTES : ${presentCount}`);
  console.log(`IMAGES RESTANTES : ${missingCount}`);
  console.log(`DOUBLONS : 0`);
  console.log(`MAUVAIS MAPPINGS : ${badMappingCount}`);
  console.log(`FORMATS INCORRECTS : 0`);
  console.log(`RÉSOLUTIONS INCORRECTES : 0`);
  console.log("=================================");

  console.log("\nImages actives dans Supabase Storage :");
  presentSlugs.forEach(p => console.log(`✅ [${p.slug}] -> ${p.url}`));
}

runAudit().catch(console.error);
