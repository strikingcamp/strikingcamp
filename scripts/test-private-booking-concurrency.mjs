import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8")
    .split("\n")
    .filter(l => l.includes("="))
    .map(l => {
      const idx = l.indexOf("=");
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "")];
    })
);

const adminClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const TEST_PREFIX = "SC_CONCURRENCY_TEST";
const RUN_ID = Date.now();
const USER_COUNT = 10;
const SESSION_CAPACITY = 6;
const PASSWORD = `TestPass_${RUN_ID}!Secure`;

async function main() {
  console.log("=======================================================================");
  console.log("TEST AUTOMATISÉ DE CONCURRENCE — COURS INDIVIDUELS STRIKING CAMP");
  console.log(`Préfixe d'isolation : ${TEST_PREFIX}_${RUN_ID}`);
  console.log(`Capacité de la séance : ${SESSION_CAPACITY} participants`);
  console.log(`Nombre de membres concurrents : ${USER_COUNT}`);
  console.log("=======================================================================\n");

  const createdUserIds = [];
  const createdSubIds = [];
  const userClients = [];
  let testSession = null;

  try {
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ÉTAPE 1 : RÉCUPÉRATION DU PLAN COURS INDIVIDUEL
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log("--- 1. VÉRIFICATION DU PLAN COURS INDIVIDUEL ---");
    const { data: plans, error: planErr } = await adminClient
      .from("plans")
      .select("id, code, name, type, allows_private")
      .eq("type", "private")
      .eq("allows_private", true)
      .limit(1);

    if (planErr || !plans || plans.length === 0) {
      throw new Error(`Plan Cours Individuel introuvable : ${planErr?.message}`);
    }
    const privatePlan = plans[0];
    console.log(`Plan sélectionné : ${privatePlan.name} (${privatePlan.code}) — ID : ${privatePlan.id}\n`);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ÉTAPE 2 : CRÉATION DE 10 UTILISATEURS AUTH + PROFILS + ABONNEMENTS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log("--- 2. CRÉATION DES 10 MEMBRES TEMPORAIRES ISOLÉS ---");
    const subStartDate = new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString();
    const subEndDate = new Date(Date.now() + 360 * 24 * 3600 * 1000).toISOString();

    for (let i = 1; i <= USER_COUNT; i++) {
      const email = `${TEST_PREFIX.toLowerCase()}_u${i}_${RUN_ID}@strikingcamp-test.internal`;
      
      // A. Création dans Supabase Auth
      const { data: authData, error: authErr } = await adminClient.auth.admin.createUser({
        email,
        password: PASSWORD,
        email_confirm: true,
        user_metadata: {
          first_name: `TestMembre${i}`,
          last_name: `Concurrency${RUN_ID}`,
          test_tag: TEST_PREFIX
        }
      });

      if (authErr) {
        throw new Error(`Échec création user ${i} : ${authErr.message}`);
      }

      const userId = authData.user.id;
      createdUserIds.push(userId);

      // B. Création de l'abonnement actif Cours Individuels (quota: 8)
      const { data: subData, error: subErr } = await adminClient
        .from("subscriptions")
        .insert({
          user_id: userId,
          plan_id: privatePlan.id,
          status: "active",
          started_at: subStartDate,
          ends_at: subEndDate,
          private_sessions_quota: 8
        })
        .select()
        .single();

      if (subErr) {
        throw new Error(`Échec création abonnement user ${i} : ${subErr.message}`);
      }
      createdSubIds.push(subData.id);

      // C. Authentification individuelle du membre (client dédié avec JWT personnel)
      const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
      const { data: sessionData, error: signErr } = await client.auth.signInWithPassword({
        email,
        password: PASSWORD
      });

      if (signErr) {
        throw new Error(`Échec connexion user ${i} : ${signErr.message}`);
      }

      userClients.push({
        index: i,
        email,
        userId,
        client,
        token: sessionData.session.access_token
      });

      console.log(`  ✓ Membre #${i} prêt (${email}) — ID : ${userId.slice(0, 8)}...`);
    }

    console.log(`\nLes 10 membres de test sont initialisés et authentifiés avec leurs propres JWT.\n`);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ÉTAPE 3 : CRÉATION DE LA SÉANCE DE COURS INDIVIDUEL (CAPACITÉ = 6)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log("--- 3. CRÉATION DU CRÉNEAU CIBLE (CAPACITÉ = 6) ---");
    const sessionStart = new Date(Date.now() + 15 * 24 * 3600 * 1000).toISOString();
    const sessionEnd = new Date(Date.now() + 15 * 24 * 3600 * 1000 + 3600 * 1000).toISOString();

    const { data: sess, error: sessErr } = await adminClient
      .from("class_sessions")
      .insert({
        type: "private",
        discipline: `Cours Individuel Concurrence ${RUN_ID}`,
        level: "Tous niveaux",
        starts_at: sessionStart,
        ends_at: sessionEnd,
        max_capacity: SESSION_CAPACITY,
        is_active: true
      })
      .select()
      .single();

    if (sessErr) {
      throw new Error(`Impossible de créer la séance de test : ${sessErr.message}`);
    }
    testSession = sess;
    console.log(`Séance créée : ID ${sess.id}`);
    console.log(`Discipline : ${sess.discipline}`);
    console.log(`Capacité max : ${sess.max_capacity}`);
    console.log(`Début : ${sess.starts_at}\n`);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ÉTAPE 4 : SIMULATION CONCURRENTE VIA PROMISE.ALL (10 REQUÊTES EN MÊME TEMPS)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log("--- 4. DÉCLENCHEMENT CONCURRENT DE 10 RÉSERVATIONS SIMULTANÉES ---");
    console.log(`Lancement de 10 appels RPC en simultané via Promise.all sur la session ${sess.id}...\n`);

    const startTime = Date.now();

    const bookingPromises = userClients.map(async ({ index, email, userId, client }) => {
      const callStart = Date.now();
      try {
        const { data, error } = await client.rpc("create_private_booking", {
          p_class_session_id: sess.id
        });
        const duration = Date.now() - callStart;
        return {
          index,
          email,
          userId,
          callStart: callStart - startTime,
          duration,
          response: data || { error: error?.message, success: false },
          error: error || null
        };
      } catch (err) {
        const duration = Date.now() - callStart;
        return {
          index,
          email,
          userId,
          callStart: callStart - startTime,
          duration,
          response: { error: err.message, success: false },
          error: err
        };
      }
    });

    const attemptsResults = await Promise.all(bookingPromises);
    const totalElapsed = Date.now() - startTime;
    console.log(`Tous les 10 appels sont terminés en ${totalElapsed} ms.\n`);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ÉTAPE 5 : ANALYSE ET VÉRIFICATION DIRECTE EN BASE DE DONNÉES
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log("--- 5. VÉRIFICATION DIRECTE DANS LA BASE SUPABASE ---");

    // A. Interrogation directe de la table bookings
    const { data: dbBookings, error: bErr } = await adminClient
      .from("bookings")
      .select("id, user_id, status, attendance_status, created_at")
      .eq("class_session_id", sess.id);

    if (bErr) throw new Error(`Erreur lecture bookings : ${bErr.message}`);

    const confirmedBookingsInDb = dbBookings.filter(b => b.status === "confirmed");
    const uniqueUsersInDb = new Set(dbBookings.map(b => b.user_id));
    const duplicateUsersInDb = dbBookings.length - uniqueUsersInDb.size;

    console.log(`Réservations enregistrées dans class_sessions/bookings : ${dbBookings.length}`);
    console.log(`Réservations confirmées (status = confirmed) : ${confirmedBookingsInDb.length}`);
    console.log(`Doublons d'utilisateurs détectés : ${duplicateUsersInDb}`);

    // B. Vérification des quotas pour chacun des 10 membres
    const memberQuotaSummary = [];
    for (const u of userClients) {
      // Calcul des séances consommées dans le cycle pour ce membre
      const { data: userCycleBookings, error: uqErr } = await adminClient
        .from("bookings")
        .select("id, status, is_late_cancellation")
        .eq("user_id", u.userId)
        .eq("status", "confirmed");

      if (uqErr) throw uqErr;
      const consumed = userCycleBookings.length;
      const remainingQuota = 8 - consumed;

      const attempt = attemptsResults.find(a => a.userId === u.userId);
      const isConfirmed = attempt?.response?.success === true;

      memberQuotaSummary.push({
        index: u.index,
        email: u.email,
        userId: u.userId,
        isConfirmed,
        consumed,
        remainingQuota,
        rpcResponse: attempt?.response
      });
    }

    // C. Décompte des retours RPC
    const confirmedAttempts = attemptsResults.filter(a => a.response?.success === true);
    const sessionFullAttempts = attemptsResults.filter(a => a.response?.success === false && a.response?.error === "SESSION_FULL");
    const otherFailedAttempts = attemptsResults.filter(a => a.response?.success === false && a.response?.error !== "SESSION_FULL");

    console.log("\n=======================================================================");
    console.log("RÉSULTATS INDIVIDUELS DES 10 TENTATIVES");
    console.log("=======================================================================");

    for (const a of attemptsResults.sort((x, y) => x.index - y.index)) {
      const resp = a.response;
      const statusIcon = resp.success ? "✅ ACCEPTÉE (CONFIRMÉE)" : `❌ REFUSÉE (${resp.error})`;
      console.log(`Membre #${a.index} (${a.email}) :`);
      console.log(`   Décalage départ : +${a.callStart}ms | Durée : ${a.duration}ms`);
      console.log(`   Statut : ${statusIcon}`);
      console.log(`   Réponse : ${JSON.stringify(resp)}`);
    }

    console.log("\n=======================================================================");
    console.log("VÉRIFICATION DES QUOTAS INDIVIDUELS (8 INITIAL)");
    console.log("=======================================================================");
    for (const m of memberQuotaSummary.sort((x, y) => x.index - y.index)) {
      console.log(`Membre #${m.index} : Statut = ${m.isConfirmed ? "RÉSERVÉ" : "NON RÉSERVÉ"} | Consommé = ${m.consumed} | Solde restant = ${m.remainingQuota}/8`);
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ÉTAPE 6 : VALIDATION DES CRITÈRES DU TEST
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log("\n=======================================================================");
    console.log("CONTRÔLE DES CRITÈRES DE SUCCÈS");
    console.log("=======================================================================");

    const criterion1 = confirmedAttempts.length === 6 && confirmedBookingsInDb.length === 6;
    const criterion2 = sessionFullAttempts.length === 4;
    const criterion3 = otherFailedAttempts.length === 0;
    const criterion4 = duplicateUsersInDb === 0;
    const criterion5 = confirmedBookingsInDb.length <= SESSION_CAPACITY;
    const criterion6 = memberQuotaSummary.every(m => m.isConfirmed ? m.remainingQuota === 7 : m.remainingQuota === 8);

    console.log(`1. Exactement 6 réservations confirmées : ${criterion1 ? "✅ CONFORME" : "❌ NON CONFORME"} (${confirmedAttempts.length} reçues, ${confirmedBookingsInDb.length} en base)`);
    console.log(`2. Exactement 4 refus SESSION_FULL : ${criterion2 ? "✅ CONFORME" : "❌ NON CONFORME"} (${sessionFullAttempts.length} reçus)`);
    console.log(`3. Aucun autre type d'erreur imprévue : ${criterion3 ? "✅ CONFORME" : "❌ NON CONFORME"} (${otherFailedAttempts.length} erreurs)`);
    console.log(`4. Aucun doublon de réservation : ${criterion4 ? "✅ CONFORME" : "❌ NON CONFORME"} (${duplicateUsersInDb} doublons)`);
    console.log(`5. Capacité maximale (6) jamais dépassée : ${criterion5 ? "✅ CONFORME" : "❌ NON CONFORME"}`);
    console.log(`6. Intégrité des quotas (7 restants si confirmé, 8 si refusé) : ${criterion6 ? "✅ CONFORME" : "❌ NON CONFORME"}`);

    const isTestPassed = criterion1 && criterion2 && criterion3 && criterion4 && criterion5 && criterion6;

    console.log(`\nVERDICT TECHNIQUE : ${isTestPassed ? ">>> TEST RÉUSSI <<<" : ">>> TEST ÉCHOUÉ <<<"}`);

    if (!isTestPassed) {
      throw new Error("Au moins un critère de concurrence n'a pas été respecté.");
    }

  } finally {
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ÉTAPE 7 : NETTOYAGE RIGOUREUX DE TOUTES LES DONNÉES DE TEST
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log("\n--- 7. NETTOYAGE COMPLET DES DONNÉES DU TEST ---");

    let cleanBookings = 0;
    let cleanSessions = 0;
    let cleanSubs = 0;
    let cleanUsers = 0;

    // A. Suppression des réservations du créneau
    if (testSession?.id) {
      const { data: bDeleted } = await adminClient
        .from("bookings")
        .delete()
        .eq("class_session_id", testSession.id)
        .select();
      cleanBookings = bDeleted?.length || 0;
      console.log(`  ✓ Réservations supprimées : ${cleanBookings}`);

      // B. Suppression de la séance temporaire
      const { data: sDeleted } = await adminClient
        .from("class_sessions")
        .delete()
        .eq("id", testSession.id)
        .select();
      cleanSessions = sDeleted?.length || 0;
      console.log(`  ✓ Séance temporaire supprimée : ${cleanSessions}`);
    }

    // C. Suppression des abonnements de test
    if (createdSubIds.length > 0) {
      const { data: subDeleted } = await adminClient
        .from("subscriptions")
        .delete()
        .in("id", createdSubIds)
        .select();
      cleanSubs = subDeleted?.length || 0;
      console.log(`  ✓ Abonnements temporaires supprimés : ${cleanSubs}`);
    }

    // D. Suppression des utilisateurs Auth temporaires (qui supprime aussi profiles par cascade)
    for (const uid of createdUserIds) {
      try {
        await adminClient.auth.admin.deleteUser(uid);
        cleanUsers++;
      } catch (err) {
        console.warn(`  ⚠️ Avertissement suppression user ${uid} :`, err.message);
      }
    }
    console.log(`  ✓ Utilisateurs Auth & Profils temporaires supprimés : ${cleanUsers} / ${createdUserIds.length}`);

    // E. Vérification qu'aucune donnée avec le préfixe ne subsiste
    const { data: remainingUsers } = await adminClient.auth.admin.listUsers();
    const remainingTestUsers = remainingUsers?.users?.filter(u => u.email?.includes(TEST_PREFIX.toLowerCase())) || [];
    console.log(`Vérification résiduelle : ${remainingTestUsers.length} utilisateur de test persistant.`);
    console.log("Nettoyage vérifié et clôturé avec succès.\n");
  }
}

main().catch(err => {
  console.error("\nErreur critique lors du test de concurrence :", err);
  process.exit(1);
});

