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
  const { data: recipes, error } = await client
    .from("recipes")
    .select("slug, title, display_order, category")
    .order("display_order", { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  // Categories in correct order
  const catOrder = { "breakfast": 1, "lunch": 2, "dinner": 3, "snack": 4 };
  recipes.sort((a, b) => {
    if (catOrder[a.category] !== catOrder[b.category]) {
      return catOrder[a.category] - catOrder[b.category];
    }
    return (a.display_order || 0) - (b.display_order || 0);
  });

  const generatedFiles = [];
  const missingFiles = [];

  for (let i = 0; i < recipes.length; i++) {
    const r = recipes[i];
    const filename = `${r.slug}.webp`;
    const path = `recipes/${filename}`;
    
    if (fs.existsSync(path)) {
      generatedFiles.push(`${i + 1}. ${r.title} — ${r.slug} — ${filename}`);
    } else {
      missingFiles.push(`${i + 1}. ${r.title} — ${r.slug} — ${filename}`);
    }
  }

  console.log("=== FICHIERS EXISTANTS / GÉNÉRÉS ===");
  generatedFiles.forEach(f => console.log(f));
  
  console.log("\n=== FICHIERS MANQUANTS ===");
  missingFiles.forEach(f => console.log(f));
}

main();
