import fs from "node:fs";

const envContent = fs.readFileSync(".env.local", "utf-8");
const keys = [];
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const idx = trimmed.indexOf("=");
  if (idx !== -1) {
    keys.push(trimmed.slice(0, idx).trim());
  }
}

console.log("Keys in .env.local:", keys);
