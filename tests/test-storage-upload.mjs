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

async function testStorageStatus() {
  console.log("=== CHECK STORAGE BUCKET 'recipes' ===");
  const { data: files, error } = await client.storage.from("recipes").list("", { limit: 100 });
  if (error) {
    console.error("Storage error:", error);
    return;
  }
  console.log(`Total files in 'recipes': ${files.length}`);
  for (const f of files) {
    console.log(`- ${f.name} (${f.metadata?.size} bytes)`);
  }
}

testStorageStatus().catch(console.error);
