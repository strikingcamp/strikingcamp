import fs from 'fs';
import path from 'path';
import { processAndUploadImage } from './process-recipe-image.mjs';

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: node tests/run-single-upload.mjs <inputPath> <slug>');
    process.exit(1);
  }

  const [input, slug] = args;
  
  const res = await processAndUploadImage(input, slug);
  console.log(`✓ Processus réussi pour ${slug} : ${res.publicUrl}`);
}

main().catch(err => {
  console.error('Erreur upload:', err);
  process.exit(1);
});
