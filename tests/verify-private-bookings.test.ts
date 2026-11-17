import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import {
  getAdminDashboardData,
  getAdminWeeklyReservationsData,
  formatToParisTime,
  formatToParisDate,
} from '../lib/supabase/admin';

const envContent = fs.readFileSync('.env.local', 'utf8');
const env: Record<string, string> = {};
for (const line of envContent.split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const idx = t.indexOf('=');
  if (idx !== -1) {
    env[t.slice(0, idx).trim()] = t.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
  }
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function runVerificationTests() {
  console.log('================================================================');
  console.log('SUITE DE TESTS DE VÉRIFICATION — RÉSERVATIONS INDIVIDUELLES');
  console.log('================================================================\n');

  let passedTests = 0;
  const totalTests = 7;

  // ---------------------------------------------------------------------------
  // TEST 1, 2, 3, 4: Vérification des créneaux 08h00, 10h00, 11h00, 14h00
  // ---------------------------------------------------------------------------
  console.log('--- TEST 1, 2, 3, 4 : Vérification des créneaux 08h00, 10h00, 11h00, 14h00 ---');
  
  // Test 1: Créneau 08h00
  const { data: s08 } = await supabase
    .from('class_sessions')
    .select('id, starts_at, ends_at, type')
    .eq('type', 'private')
    .eq('starts_at', '2026-08-31T06:00:00+00:00')
    .maybeSingle();
  const time08 = s08 ? formatToParisTime(s08.starts_at) : null;
  console.log(`[TEST 1] Créneau 08h00 (starts_at: ${s08?.starts_at}) -> Heure Paris: ${time08}`);
  if (time08 === '08:00') {
    console.log('  -> SUCCÈS : 08h00 correctement résolu');
    passedTests++;
  } else {
    console.error('  -> ÉCHEC TEST 1 : attendu 08:00, obtenu', time08);
  }

  // Test 2: Créneau 10h00
  const { data: s10 } = await supabase
    .from('class_sessions')
    .select('id, starts_at, ends_at, type')
    .eq('type', 'private')
    .eq('starts_at', '2026-10-27T09:00:00+00:00')
    .maybeSingle();
  const time10 = s10 ? formatToParisTime(s10.starts_at) : null;
  console.log(`[TEST 2] Créneau 10h00 (starts_at: ${s10?.starts_at}) -> Heure Paris: ${time10}`);
  if (time10 === '10:00') {
    console.log('  -> SUCCÈS : 10h00 correctement résolu');
    passedTests++;
  } else {
    console.error('  -> ÉCHEC TEST 2 : attendu 10:00, obtenu', time10);
  }

  // Test 3: Créneau 11h00 (séance hiver UTC+1 : 2026-11-19 à 10:00:00Z -> 11:00 Paris)
  const { data: s11 } = await supabase
    .from('class_sessions')
    .select('id, starts_at, ends_at, type')
    .eq('type', 'private')
    .eq('starts_at', '2026-11-19T10:00:00+00:00')
    .maybeSingle();
  const time11 = s11 ? formatToParisTime(s11.starts_at) : null;
  console.log(`[TEST 3] Créneau 11h00 (starts_at: ${s11?.starts_at}) -> Heure Paris: ${time11}`);
  if (time11 === '11:00') {
    console.log('  -> SUCCÈS : 11h00 correctement résolu');
    passedTests++;
  } else {
    console.error('  -> ÉCHEC TEST 3 : attendu 11:00, obtenu', time11);
  }

  // Test 4: Créneau 14h00 (séance du 2026-11-17 à 13:00:00Z -> 14:00 Paris)
  const { data: s14 } = await supabase
    .from('class_sessions')
    .select('id, starts_at, ends_at, type')
    .eq('type', 'private')
    .eq('starts_at', '2026-11-17T13:00:00+00:00')
    .maybeSingle();
  const time14 = s14 ? formatToParisTime(s14.starts_at) : null;
  console.log(`[TEST 4] Créneau 14h00 (starts_at: ${s14?.starts_at}) -> Heure Paris: ${time14}`);
  if (time14 === '14:00') {
    console.log('  -> SUCCÈS : 14h00 correctement résolu');
    passedTests++;
  } else {
    console.error('  -> ÉCHEC TEST 4 : attendu 14:00, obtenu', time14);
  }

  // ---------------------------------------------------------------------------
  // TEST 5: Réservation avec profil incomplet (admin Mohamed: NULL dans profiles)
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 5 : Réservation avec profil incomplet (Fallback Auth) ---');
  const dashboardData = await getAdminDashboardData(supabase);
  console.log(`Dernières réservations récupérées sur le dashboard : ${dashboardData.recentBookings.length}`);
  for (const b of dashboardData.recentBookings) {
    console.log(`  - [${b.sessionType}] ${b.memberName} | ${b.sessionName} | ${b.sessionDate} (${b.sessionTime}) | Statut: ${b.status} | Durée: ${b.durationFormatted}`);
  }

  const hasGenericFallback = dashboardData.recentBookings.some(b => b.memberName === 'Membre');
  const hasAdminName = dashboardData.recentBookings.some(b => b.memberName.includes('Mohamed') || b.memberName.includes('Diane'));
  console.log(`Présence de fallback générique 'Membre' : ${hasGenericFallback ? 'OUI' : 'NON'}`);
  console.log(`Présence du nom résolu : ${hasAdminName ? 'OUI' : 'NON'}`);
  if (!hasGenericFallback && hasAdminName) {
    console.log('  -> SUCCÈS TEST 5 : Les profils incomplets résolvent le nom via Auth sans afficher "Membre"');
    passedTests++;
  } else {
    console.error('  -> ÉCHEC TEST 5');
  }

  // ---------------------------------------------------------------------------
  // TEST 6: Affichage systématique en Europe/Paris & Durée 50 minutes
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 6 : Fuseau horaire Europe/Paris et durée 50 minutes ---');
  const weekly = await getAdminWeeklyReservationsData(supabase, '2026-11-16', '2026-11-21');
  console.log(`Séances privées de la semaine 16-21 Nov 2026 : ${weekly.privateSessions.length}`);
  
  // Trouver la séance réservée du 19 Nov 2026
  const session19Nov = weekly.privateSessions.find(
    s => formatToParisDate(s.starts_at) === '2026-11-19' && (weekly.bookingsBySessionId[s.id]?.length || 0) > 0
  );
  console.log('Séance réservée trouvée pour le 19 Nov 2026 :');
  console.log('  ID :', session19Nov?.id);
  console.log('  starts_at (UTC) :', session19Nov?.starts_at);
  console.log('  Heure début Paris :', session19Nov ? formatToParisTime(session19Nov.starts_at) : 'N/A');
  console.log('  Heure fin Paris :', session19Nov?.ends_at ? formatToParisTime(session19Nov.ends_at) : 'N/A');
  
  const bks19Nov = session19Nov ? weekly.bookingsBySessionId[session19Nov.id] : [];
  console.log(`  Participants inscrits : ${bks19Nov?.length || 0}`);
  if (bks19Nov && bks19Nov.length > 0) {
    for (const p of bks19Nov) {
      console.log(`    - Membre : ${p.memberName} | Formule : ${p.planName} | Statut : ${p.status}`);
    }
  }

  const isParisCorrect = Boolean(
    session19Nov &&
    session19Nov.starts_at &&
    session19Nov.ends_at &&
    formatToParisTime(session19Nov.starts_at) === '11:00' &&
    formatToParisTime(session19Nov.ends_at) === '11:50'
  );
  if (isParisCorrect) {
    console.log('  -> SUCCÈS TEST 6 : Heures calculées en Europe/Paris (11:00 -> 11:50, 50 min exactes)');
    passedTests++;
  } else {
    console.error('  -> ÉCHEC TEST 6');
  }

  // ---------------------------------------------------------------------------
  // TEST 7: Absence de régression sur les réservations collectives (small_group)
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 7 : Absence de régression sur les cours collectifs ---');
  console.log(`Séances Small Group de la semaine : ${weekly.smallGroupSessions.length}`);
  const sampleSmallGroup = weekly.smallGroupSessions[0];
  console.log(`Exemple séance collective : ${sampleSmallGroup?.discipline} à ${formatToParisTime(sampleSmallGroup?.starts_at)} (Capacité: ${sampleSmallGroup?.max_capacity}, Inscrits: ${sampleSmallGroup?.bookedCount})`);
  
  if (weekly.smallGroupSessions.length > 0 && sampleSmallGroup.max_capacity === 12) {
    console.log('  -> SUCCÈS TEST 7 : Planning et séances collectives intacts (capacité 12, templates respectés)');
    passedTests++;
  } else {
    console.error('  -> ÉCHEC TEST 7');
  }

  console.log(`\n================================================================`);
  console.log(`RÉSULTAT GLOBAL : ${passedTests} / ${totalTests} TESTS VALIDÉS AVEC SUCCÈS`);
  console.log(`================================================================`);

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runVerificationTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
