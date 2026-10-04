import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

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

const artifactDir = "C:\\Users\\Mahfo\\.gemini\\antigravity-ide\\brain\\ae1fff3e-a1f5-4586-9039-2ece0fbe2984";
const prompts = JSON.parse(fs.readFileSync("tests/recipes-prompts-full.json", "utf-8"));

async function syncAll() {
  console.log("=== SYNC RECIPES IMAGES TO SUPABASE STORAGE ===");

  const artifactFiles = fs.readdirSync(artifactDir);
  let uploadedCount = 0;
  let missingCount = 0;
  const missingList = [];
  const uploadedList = [];

  for (const item of prompts) {
    let matching = artifactFiles.filter(
      (f) => (f.endsWith(".jpg") || f.endsWith(".png") || f.endsWith(".webp")) && (
        f.startsWith(item.imageName) ||
        (item.slug === "fromage-blanc-fruits-rouges-chia" && f.startsWith("fb_fruits_rouges")) ||
        (item.slug === "porridge-beurre-cacahuete-banane" && f.startsWith("porridge_peanut_banana")) ||
        (item.slug === "fromage-blanc-banane-beurre-cacahuete" && f.startsWith("fb_banana_peanut"))
      )
    );

    if (matching.length === 0) {
      missingCount++;
      missingList.push(item);
      continue;
    }

    matching.sort();
    const sourceFile = path.join(artifactDir, matching[matching.length - 1]);
    const targetWebpName = `${item.slug}.webp`;

    try {
      const webpBuffer = await sharp(sourceFile)
        .resize(1200, 900, { fit: "cover", position: "center" })
        .webp({ quality: 88 })
        .toBuffer();

      const { error: upErr } = await client.storage
        .from("recipes")
        .upload(targetWebpName, webpBuffer, {
          contentType: "image/webp",
          upsert: true,
        });

      if (upErr) {
        console.error(`Error uploading ${targetWebpName}:`, upErr);
        continue;
      }

      const publicUrl = `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/recipes/${targetWebpName}`;
      await client.from("recipes").update({ image_url: publicUrl }).eq("slug", item.slug);

      uploadedCount++;
      uploadedList.push({ index: item.index, slug: item.slug, title: item.title, publicUrl });
      console.log(`[${item.index}/74] OK -> ${targetWebpName} (${publicUrl})`);
    } catch (err) {
      console.error(`Failed processing ${item.slug}:`, err.message);
    }
  }

  console.log("\n=================================");
  console.log(`TOTAL RECETTES : ${prompts.length}`);
  console.log(`IMAGES TRAITÉES & UPLOADÉES DANS STORAGE : ${uploadedCount}`);
  console.log(`IMAGES RESTANTES (EN ATTENTE DE QUOTA) : ${missingCount}`);
  console.log("=================================");

  uploadedList.forEach((u) => {
    console.log(`✅ #${u.index} [${u.slug}] : ${u.publicUrl}`);
  });
}

syncAll().catch(console.error);
