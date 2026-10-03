import fs from 'fs';

const content = fs.readFileSync('supabase/migrations/20261004_defis_rich_seed_and_admin.sql', 'utf8');

// Check for destructive commands
const destructiveKeywords = ['DROP TABLE', 'TRUNCATE', 'DELETE FROM', 'ALTER TABLE.*DROP'];
destructiveKeywords.forEach(kw => {
  const reg = new RegExp(kw, 'i');
  if (reg.test(content)) {
    console.error(`❌ Destructive keyword found: ${kw}`);
  } else {
    console.log(`✅ Safe: No ${kw} found.`);
  }
});

// Check all UUIDs in the file
const uuidRegex = /'[0-9a-zA-Z]{8}-[0-9a-zA-Z]{4}-[0-9a-zA-Z]{4}-[0-9a-zA-Z]{4}-[0-9a-zA-Z]{12}'/g;
const validUuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
let match;
let totalUuids = 0;
let invalidUuids = [];

while ((match = uuidRegex.exec(content)) !== null) {
  totalUuids++;
  const rawUuid = match[0].replace(/'/g, '');
  if (!validUuidRegex.test(rawUuid)) {
    invalidUuids.push(rawUuid);
  }
}

console.log(`\nUUID Audit:`);
console.log(`Total UUIDs scanned: ${totalUuids}`);
if (invalidUuids.length > 0) {
  console.error(`❌ Invalid UUIDs found:`, invalidUuids);
} else {
  console.log(`✅ All ${totalUuids} UUIDs are 100% valid PostgreSQL hex UUIDs.`);
}
