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

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

async function testSqlEndpoint() {
  // Test pg / query endpoint
  console.log("Testing POST to /pg / /v1/query with service key...");
  try {
    const res = await fetch(`${supabaseUrl}/pg`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseServiceKey,
        "Authorization": `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ query: "SELECT count(*) FROM public.recipes;" })
    });
    console.log("/pg status:", res.status);
    const text = await res.text();
    console.log("/pg response:", text);
  } catch (err) {
    console.log("/pg fetch error:", err.message);
  }
}

testSqlEndpoint().catch(console.error);
