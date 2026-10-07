import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const envContent = fs.readFileSync(".env.local", "utf-8");
const env = {};
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const idx = trimmed.indexOf("=");
  if (idx !== -1) env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
}

const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function inspectCourseCredits() {
  console.log("Checking table course_credits structure and content...");
  const { data, error } = await client.from("course_credits").select("*").limit(5);
  console.log("course_credits select:", { data, error });

  // Check plans table for decouverte or pack codes
  const { data: plans } = await client.from("plans").select("*");
  console.log("Existing plans in DB:", plans?.map(p => ({ code: p.code, name: p.name, price_cents: p.price_cents })));
}

inspectCourseCredits().catch(console.error);
