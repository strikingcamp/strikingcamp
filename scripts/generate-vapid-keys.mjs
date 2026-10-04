/**
 * Script utilitaire pour générer une paire de clés VAPID pour Web Push.
 *
 * Usage :
 *   node scripts/generate-vapid-keys.mjs
 *
 * Sécurité :
 *   - Les clés générées doivent être copiées dans votre fichier `.env.local` (non versionné).
 *   - La clé privée (VAPID_PRIVATE_KEY) ne doit JAMAIS être exposée côté client ni commitée.
 */

import webpush from 'web-push';

console.log('='.repeat(70));
console.log('  STRIKING CAMP — GÉNÉRATEUR DE CLÉS VAPID (WEB PUSH)');
console.log('='.repeat(70));
console.log('\nGénération d\'une nouvelle paire de clés VAPID en cours...\n');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('✅ Clés générées avec succès !\n');
console.log('----------------------------------------------------------------------');
console.log('Copiez les lignes suivantes dans votre fichier .env.local :');
console.log('----------------------------------------------------------------------\n');
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log('VAPID_SUBJECT=mailto:contact@strikingcamp.fr\n');
console.log('----------------------------------------------------------------------');
console.log('RAPPEL DE SÉCURITÉ :');
console.log('  1. NEXT_PUBLIC_VAPID_PUBLIC_KEY : Utilisée par le navigateur pour s\'abonner.');
console.log('  2. VAPID_PRIVATE_KEY : STRICTEMENT serveur (ne jamais préfixer par NEXT_PUBLIC_).');
console.log('  3. VAPID_SUBJECT : Adresse de contact (mailto: ou https://) pour les serveurs push.');
console.log('='.repeat(70));
