import fs from "node:fs";

const recipes = JSON.parse(fs.readFileSync("tests/all-recipes-dump.json", "utf-8"));

const catNames = {
  breakfast: "Petit-déjeuner",
  lunch: "Déjeuner",
  dinner: "Dîner",
  snack: "Collation / Dessert"
};

const grouped = {
  breakfast: [],
  lunch: [],
  dinner: [],
  snack: []
};

function getDishStyle(r) {
  const title = r.title.toLowerCase();
  const slug = r.slug.toLowerCase();
  if (title.includes("fromage blanc") || slug.includes("fb-")) return "Bol en céramique / Verrine";
  if (title.includes("porridge") || title.includes("oats")) return "Bol chaud en grès";
  if (title.includes("pancake")) return "Assiette plate moderne";
  if (title.includes("tartine") || title.includes("toast")) return "Planchette / Assiette plate";
  if (title.includes("omelette") || title.includes("œufs") || title.includes("oeufs") || title.includes("brouillés")) return "Assiette plate / Poêlon";
  if (title.includes("bowl") || title.includes("salade") || title.includes("poke")) return "Grand bol contemporain (Bowl)";
  if (title.includes("shaker") || title.includes("smoothie")) return "Verre haut / Shaker transparent";
  if (title.includes("chia pudding")) return "Verrine / Ramequin transparent";
  if (title.includes("yaourt")) return "Coupelle / Petit bol en grès";
  if (title.includes("wok") || title.includes("poêlée")) return "Wok / Assiette creuse";
  if (title.includes("soupe")) return "Bol à soupe moderne";
  if (title.includes("steak") || title.includes("pavé") || title.includes("poulet") || title.includes("filet") || title.includes("carpaccio") || title.includes("tartare") || title.includes("pâtes") || title.includes("risotto") || title.includes("wraps")) return "Assiette plate contemporaine";
  return "Assiette plate";
}

recipes.forEach((r) => {
  grouped[r.category].push(r);
});

Object.entries(grouped).forEach(([cat, list]) => {
  console.log(`\n### ${catNames[cat]} (${list.length} recettes)\n`);
  console.log("| # | slug | nom | catégorie | ingrédients principaux (visuels) | style de plat |");
  console.log("|---|---|---|---|---|---|");
  list.forEach((r, i) => {
    const ings = (r.ingredients || [])
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
      .map(ing => ing.name + (ing.quantity ? ` (${ing.quantity} ${ing.unit || ''})` : ''))
      .join(', ');
    const style = getDishStyle(r);
    console.log(`| ${i + 1} | \`${r.slug}\` | **${r.title}** | ${catNames[cat]} | ${ings} | ${style} |`);
  });
});
