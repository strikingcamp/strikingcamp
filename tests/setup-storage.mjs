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

async function checkStorage() {
  console.log("Checking storage buckets...");
  const { data: buckets, error: bErr } = await client.storage.listBuckets();
  console.log("Buckets list result:", { buckets, bErr });

  // If recipes bucket does not exist, create it
  const hasRecipesBucket = buckets?.some(b => b.id === "recipes" || b.name === "recipes");
  if (!hasRecipesBucket) {
    console.log("Creating public bucket 'recipes'...");
    const { data: created, error: createErr } = await client.storage.createBucket("recipes", {
      public: true,
      fileSizeLimit: 5242880,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/avif"]
    });
    console.log("Create bucket result:", { created, createErr });
  } else {
    console.log("Bucket 'recipes' already exists. Ensuring it is public...");
    const { data: updated, error: updateErr } = await client.storage.updateBucket("recipes", {
      public: true,
      fileSizeLimit: 5242880,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/avif"]
    });
    console.log("Update bucket result:", { updated, updateErr });
  }

  // Check public URL generation
  const { data: publicUrlData } = client.storage.from("recipes").getPublicUrl("fromage-blanc-fruits-rouges-chia.webp");
  console.log("Sample Public URL:", publicUrlData.publicUrl);
}

checkStorage().catch(console.error);
