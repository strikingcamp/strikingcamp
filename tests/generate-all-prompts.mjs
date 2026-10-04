import fs from "node:fs";

const recipes = JSON.parse(fs.readFileSync("tests/all-recipes-dump.json", "utf-8"));

function getClean3WordName(slug, index) {
  const parts = slug.split("-").filter(p => p.length > 0 && !["de", "du", "des", "la", "le", "les", "et", "au", "aux", "a", "d"].includes(p));
  const w1 = parts[0] || "dish";
  const w2 = parts[1] || "food";
  const w3 = parts[2] || `${index + 1}`;
  return `${w1.slice(0, 10)}_${w2.slice(0, 10)}_${w3.slice(0, 10)}`.toLowerCase().replace(/[^a-z0-9_]/g, "");
}

function buildPrompt(recipe, index) {
  const title = recipe.title;
  const ingredients = (recipe.ingredients || [])
    .map((i) => i.name)
    .filter(Boolean)
    .join(", ");

  let tableware = "dark charcoal matte ceramic plate";
  let angle = "45-degree angled view";

  const lowerTitle = title.toLowerCase();
  const lowerSlug = recipe.slug.toLowerCase();

  if (lowerTitle.includes("shaker") || lowerTitle.includes("smoothie")) {
    tableware = "clean transparent highball glass";
    angle = "30-degree angled side view showcasing layers and thick texture";
  } else if (lowerTitle.includes("chia pudding") || lowerTitle.includes("cheesecake") || lowerTitle.includes("tiramisu") || lowerTitle.includes("compote")) {
    tableware = "transparent glass dessert ramekin";
    angle = "35-degree angled side view displaying delicious layers";
  } else if (lowerTitle.includes("bowl") || lowerTitle.includes("salade") || lowerTitle.includes("poke") || lowerTitle.includes("porridge") || lowerTitle.includes("fromage blanc") || lowerTitle.includes("yaourt") || lowerTitle.includes("cottage")) {
    tableware = "dark charcoal matte ceramic bowl";
    angle = "45-degree angled view";
  } else if (lowerTitle.includes("tartine") || lowerTitle.includes("toast")) {
    tableware = "dark slate serving board or dark ceramic plate";
    angle = "45-degree angled view";
  } else if (lowerTitle.includes("pancake")) {
    tableware = "dark artisanal ceramic flat plate";
    angle = "40-degree angled view showing the stacked fluffiness";
  } else if (lowerTitle.includes("wok") || lowerTitle.includes("poêlée") || lowerTitle.includes("curry") || lowerTitle.includes("chili")) {
    tableware = "dark cast-iron skillet or dark shallow ceramic bowl";
    angle = "45-degree angled view";
  }

  const shortName = getClean3WordName(recipe.slug, index);

  return {
    index: index + 1,
    id: recipe.id,
    slug: recipe.slug,
    title: recipe.title,
    category: recipe.category,
    ingredients,
    imageName: shortName,
    prompt: `Professional culinary food photography of ${title}, featuring strictly: ${ingredients}. Elegantly plated in a ${tableware}, placed on a dark anthracite concrete and slate tabletop. ${angle}. Soft natural side lighting coming from a 45-degree angle, gentle sculpting shadows, natural vibrant colors (5400K), realistic crisp food textures, shallow depth of field (f/3.2), high-end athletic sports nutrition aesthetic. Clean centered composition with breathing room, no text, no watermark, no logos, ultra-realistic culinary editorial shot.`
  };
}

const promptList = recipes.map(buildPrompt);
fs.writeFileSync("tests/recipes-prompts-full.json", JSON.stringify(promptList, null, 2), "utf-8");
console.log(`Generated ${promptList.length} prompts with valid 3-word ImageNames.`);
