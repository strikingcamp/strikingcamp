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

async function main() {
  const { data: recipe, error } = await client
    .from("recipes")
    .select("id, slug, title, recipe_ingredients(name, quantity, unit)")
    .eq("slug", "fromage-blanc-mangue-coco")
    .single();

  if (error) {
    console.error(error);
    return;
  }
  console.log(JSON.stringify(recipe, null, 2));
}
main();
