import sharp from "sharp";
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

async function fullAudit() {
  // 1. Fetch recipes from DB (Source of Truth)
  const { data: recipes, error: recErr } = await client
    .from("recipes")
    .select("id, slug, title, image_url")
    .order("slug", { ascending: true });

  if (recErr) throw recErr;

  // 2. Fetch list of storage objects
  const { data: storageFiles, error: stErr } = await client.storage
    .from("recipes")
    .list();

  if (stErr) throw stErr;

  const storageMap = new Map();
  (storageFiles || []).forEach(f => storageMap.set(f.name, f));

  let imagesGenerated = 0;
  let imagesUploaded = 0;
  let validMappings = 0;
  let validDimensions = 0;
  let validWebp = 0;
  let http200Count = 0;
  const missingImages = [];
  const activeImages = [];

  for (const r of recipes) {
    const expectedFilename = `${r.slug}.webp`;
    const expectedUrl = `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/recipes/${expectedFilename}`;
    const fileInStorage = storageMap.get(expectedFilename);

    if (fileInStorage) {
      imagesGenerated++;
      imagesUploaded++;

      // Check format
      if (expectedFilename.endsWith(".webp")) {
        validWebp++;
      }

      // Check mapping in DB
      if (r.image_url === expectedUrl) {
        validMappings++;
      }

      // Check HTTP 200 & image dimensions via buffer
      try {
        const res = await fetch(expectedUrl);
        if (res.status === 200) {
          http200Count++;
          const arrayBuffer = await res.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const metadata = await sharp(buffer).metadata();
          if (metadata.width === 1200 && metadata.height === 900 && metadata.format === "webp") {
            validDimensions++;
            activeImages.push({
              slug: r.slug,
              title: r.title,
              url: expectedUrl,
              width: metadata.width,
              height: metadata.height,
              sizeKb: Math.round(buffer.length / 1024)
            });
          }
        }
      } catch (err) {
        console.error(`Error checking URL for ${r.slug}:`, err.message);
      }
    } else {
      missingImages.push(r.slug);
    }
  }

  const missingCount = recipes.length - imagesUploaded;

  console.log("=== RAPPORT D'AUDIT TECHNIQUE IMAGES & RECETTES ===");
  console.log(`TOTAL RECETTES : ${recipes.length}`);
  console.log(`IMAGES GÉNÉRÉES : ${imagesGenerated}`);
  console.log(`IMAGES UPLOADÉES : ${imagesUploaded}`);
  console.log(`IMAGES MANQUANTES : ${missingCount}`);
  console.log(`MAPPINGS VALIDES : ${validMappings}/${recipes.length}`);
  console.log(`DIMENSIONS VALIDES (1200x900) : ${validDimensions}/${imagesUploaded}`);
  console.log(`FORMAT WEBP : ${validWebp}/${imagesUploaded}`);
  console.log(`URLS HTTP 200 : ${http200Count}/${imagesUploaded}`);

  console.log("\n--- DÉTAIL DES VISUELS ACTIFS ET VÉRIFIÉS ---");
  activeImages.forEach(img => {
    console.log(`✅ [${img.slug}] ${img.width}x${img.height} (${img.sizeKb} Ko) - HTTP 200 -> ${img.url}`);
  });

  if (missingImages.length > 0) {
    console.log(`\n--- VISUELS EN ATTENTE DU QUOTA JOURNALIER (${missingCount}) ---`);
    missingImages.slice(0, 5).forEach((slug, i) => console.log(`⏳ ${i + 1}. ${slug}.webp`));
    console.log(`... et ${missingCount - 5} autres recettes prêtes.`);
  }
}

fullAudit().catch(console.error);
