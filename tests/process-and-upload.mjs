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

async function processAndUpload(inputPath, slug) {
  const webpBuffer = await sharp(inputPath)
    .resize(1200, 900, { fit: "cover", position: "center" })
    .webp({ quality: 88 })
    .toBuffer();

  console.log(`Processed ${slug}.webp, size: ${webpBuffer.length} bytes`);

  const { data, error } = await client.storage
    .from("recipes")
    .upload(`${slug}.webp`, webpBuffer, {
      contentType: "image/webp",
      upsert: true
    });

  if (error) throw error;

  const publicUrl = `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/recipes/${slug}.webp`;
  console.log(`Uploaded to Supabase Storage: ${publicUrl}`);

  const { error: dbErr } = await client
    .from("recipes")
    .update({ image_url: publicUrl })
    .eq("slug", slug);

  if (dbErr) throw dbErr;
  console.log(`Updated database record for slug '${slug}'.`);
}

const artifactDir = "C:\\Users\\Mahfo\\.gemini\\antigravity-ide\\brain\\ae1fff3e-a1f5-4586-9039-2ece0fbe2984";
const files = fs.readdirSync(artifactDir).filter(f => f.startsWith("fb_fruits_rouges_") && f.endsWith(".jpg"));
if (files.length > 0) {
  const latestFile = path.join(artifactDir, files[files.length - 1]);
  processAndUpload(latestFile, "fromage-blanc-fruits-rouges-chia").catch(console.error);
} else {
  console.log("No matching image found.");
}
