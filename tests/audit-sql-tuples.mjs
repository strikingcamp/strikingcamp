import fs from 'fs';

function auditFile(filePath) {
  console.log(`\n================ AUDITING ${filePath} ================`);
  const content = fs.readFileSync(filePath, 'utf8');

  // Split by INSERT INTO
  const parts = content.split(/INSERT\s+INTO\s+/i);
  
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    const openParenIdx = part.indexOf('(');
    const closeParenIdx = part.indexOf(')', openParenIdx);
    const table = part.substring(0, openParenIdx).trim();
    const colsStr = part.substring(openParenIdx + 1, closeParenIdx);
    const cols = colsStr.split(',').map(c => c.trim()).filter(Boolean);

    const valuesIdx = part.toUpperCase().indexOf('VALUES', closeParenIdx);
    const afterValues = part.substring(valuesIdx + 6);
    
    // Find where ON CONFLICT or ; or next statement starts
    const endMatch = afterValues.match(/(?:ON\s+CONFLICT|;\s*$)/i);
    const valuesBlock = endMatch ? afterValues.substring(0, endMatch.index).trim() : afterValues.trim();

    console.log(`\nTable: ${table}`);
    console.log(`Expected columns (${cols.length}): ${cols.join(', ')}`);

    // Extract tuples
    let tuples = [];
    let depth = 0;
    let currentTuple = '';
    let inString = false;

    for (let j = 0; j < valuesBlock.length; j++) {
      const char = valuesBlock[j];
      const prevChar = j > 0 ? valuesBlock[j - 1] : '';

      if (char === "'" && prevChar !== '\\') {
        if (valuesBlock[j + 1] === "'") {
          currentTuple += "''";
          j++;
          continue;
        }
        inString = !inString;
      }

      if (!inString) {
        if (char === '(') {
          if (depth === 0) currentTuple = '';
          else currentTuple += char;
          depth++;
          continue;
        } else if (char === ')') {
          depth--;
          if (depth === 0) {
            tuples.push(currentTuple.trim());
            currentTuple = '';
            continue;
          }
        }
      }
      if (depth > 0) currentTuple += char;
    }

    tuples.forEach((t, idx) => {
      let items = [];
      let curItem = '';
      let inStr = false;
      let arrayDepth = 0;

      for (let k = 0; k < t.length; k++) {
        const c = t[k];
        const pc = k > 0 ? t[k - 1] : '';
        if (c === "'" && pc !== '\\') {
          if (t[k + 1] === "'") {
            curItem += "''";
            k++;
            continue;
          }
          inStr = !inStr;
        }
        if (!inStr) {
          if (c === '[') arrayDepth++;
          else if (c === ']') arrayDepth--;
          else if (c === ',' && arrayDepth === 0) {
            items.push(curItem.trim());
            curItem = '';
            continue;
          }
        }
        curItem += c;
      }
      if (curItem.trim()) items.push(curItem.trim());

      if (items.length !== cols.length) {
        console.error(`  ❌ TUPLE ${idx + 1} MISMATCH! Expected ${cols.length} cols, got ${items.length} values.`);
        console.error(`     First item: ${items[0]}`);
        console.error(`     All values:`, items);
      } else {
        console.log(`  ✅ Tuple ${idx + 1} OK (${items.length} cols) -> ${items[0].substring(0, 38)}`);
      }
    });
  }
}

auditFile('supabase/migrations/20261004_defis_rich_seed_and_admin.sql');
