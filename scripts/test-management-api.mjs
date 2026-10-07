import fs from "node:fs";

const envContent = fs.readFileSync(".env.local", "utf-8");
const env = {};
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const idx = trimmed.indexOf("=");
  if (idx !== -1) env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
}

const key = env.SUPABASE_SERVICE_ROLE_KEY;
const ref = "azfifhmrmdoyzetcfvli";

async function testManagement() {
  const urls = [
    `https://api.supabase.com/v1/projects/${ref}/database/query`,
    `https://${ref}.supabase.co/database/query`,
    `https://${ref}.supabase.co/rest/v1/`
  ];

  for (const u of urls) {
    try {
      const res = await fetch(u, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": key,
          "Authorization": `Bearer ${key}`
        },
        body: JSON.stringify({ query: "SELECT 1" })
      });
      console.log(`URL ${u} -> status:`, res.status);
      const txt = await res.text();
      console.log("Response sample:", txt.slice(0, 150));
    } catch (e) {
      console.log(`URL ${u} -> error:`, e.message);
    }
  }
}

testManagement().catch(console.error);
