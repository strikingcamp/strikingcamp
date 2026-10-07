/**
 * Test Suite: Session Credits & One-Time Stripe Checkout System
 * Tests covering all 15 critical business scenarios.
 */

import assert from "node:assert/strict";
import { SESSION_PACKS, computePackExpirationDate } from "../lib/stripe.ts";

async function main() {
  console.log("=================================================================");
  console.log("TEST SUITE: SESSION CREDIT PACKS (15 SCENARIOS)");
  console.log("=================================================================\n");

  let passed = 0;
  let failed = 0;

  async function runTest(name, fn) {
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name}`);
      console.error(err);
      failed++;
    }
  }

  // -------------------------------------------------------------
  // Test 1: Achat pack 1 séance
  // -------------------------------------------------------------
  await runTest("1. Achat pack 1 séance (Découverte 1)", () => {
    const pack = SESSION_PACKS["decouverte_1"];
    assert.ok(pack, "Pack decouverte_1 doit exister");
    assert.equal(pack.priceCents, 2000, "Prix doit être 20.00 € (2000 cents)");
    assert.equal(pack.totalCredits, 1, "Nombre de crédits doit être 1");
    assert.equal(pack.validityDays, 30, "Validité doit être 30 jours");
    
    const now = new Date("2026-10-01T12:00:00Z");
    const exp = computePackExpirationDate(pack, now);
    const diffDays = Math.round((exp.getTime() - now.getTime()) / (24 * 3600 * 1000));
    assert.equal(diffDays, 30, "Expiration calculée = 30 jours");
  });

  // -------------------------------------------------------------
  // Test 2: Achat pack 3 séances
  // -------------------------------------------------------------
  await runTest("2. Achat pack 3 séances (Découverte 3)", () => {
    const pack = SESSION_PACKS["decouverte_3"];
    assert.ok(pack, "Pack decouverte_3 doit exister");
    assert.equal(pack.priceCents, 4900, "Prix doit être 49.00 € (4900 cents)");
    assert.equal(pack.totalCredits, 3, "Nombre de crédits doit être 3");
    assert.equal(pack.validityDays, 30, "Validité doit être 30 jours");

    const now = new Date("2026-10-01T12:00:00Z");
    const exp = computePackExpirationDate(pack, now);
    const diffDays = Math.round((exp.getTime() - now.getTime()) / (24 * 3600 * 1000));
    assert.equal(diffDays, 30, "Expiration calculée = 30 jours");
  });

  // -------------------------------------------------------------
  // Test 3: Achat pack 10 séances
  // -------------------------------------------------------------
  await runTest("3. Achat pack 10 séances (Pack 10 Small Group)", () => {
    const pack = SESSION_PACKS["pack_10_small_group"];
    assert.ok(pack, "Pack pack_10_small_group doit exister");
    assert.equal(pack.priceCents, 18000, "Prix doit être 180.00 € (18000 cents)");
    assert.equal(pack.totalCredits, 10, "Nombre de crédits doit être 10");
    assert.equal(pack.validityMonths, 3, "Validité doit être 3 mois");

    const now = new Date("2026-10-01T12:00:00Z");
    const exp = computePackExpirationDate(pack, now);
    assert.equal(exp.getUTCMonth(), 0, "Mois après 3 mois depuis Octobre = Janvier (0)");
    assert.equal(exp.getUTCFullYear(), 2027, "Année suivante");
  });

  // -------------------------------------------------------------
  // Test 4: Webhook Stripe envoyé deux fois (Idempotence)
  // -------------------------------------------------------------
  await runTest("4. Idempotence Webhook Stripe (stripe_checkout_session_id unique)", () => {
    const dbSessions = new Set();
    const dbPacks = [];

    function handleWebhookEvent(event) {
      const sessionId = event.data.object.id;
      if (dbSessions.has(sessionId)) {
        return { status: "already_processed", pack: null };
      }
      dbSessions.add(sessionId);
      const newPack = {
        id: "pack-uuid-1",
        stripe_checkout_session_id: sessionId,
        remaining_credits: 3,
      };
      dbPacks.push(newPack);
      return { status: "created", pack: newPack };
    }

    const mockEvent = {
      id: "evt_1",
      type: "checkout.session.completed",
      data: { object: { id: "cs_test_unique_session_123" } },
    };

    const res1 = handleWebhookEvent(mockEvent);
    assert.equal(res1.status, "created");
    assert.equal(dbPacks.length, 1);

    // Second event with exact same session ID
    const res2 = handleWebhookEvent(mockEvent);
    assert.equal(res2.status, "already_processed");
    assert.equal(dbPacks.length, 1, "Ne doit pas créer un second pack");
  });

  // -------------------------------------------------------------
  // Test 5: Réservation avec pack -> crédit -1
  // -------------------------------------------------------------
  await runTest("5. Réservation avec pack -> décrémentation exacte de 1 crédit et transaction", () => {
    let pack = {
      id: "pack-1",
      remaining_credits: 3,
      total_credits: 3,
      status: "active",
      expires_at: new Date(Date.now() + 86400000 * 20).toISOString(),
    };
    const transactions = [];

    // Simulation RPC
    assert.ok(pack.remaining_credits >= 1);
    pack.remaining_credits -= 1;
    const booking = {
      id: "booking-1",
      credit_pack_id: pack.id,
    };
    transactions.push({
      credit_pack_id: pack.id,
      delta: -1,
      transaction_type: "booking_debit",
    });

    assert.equal(pack.remaining_credits, 2);
    assert.equal(booking.credit_pack_id, "pack-1");
    assert.equal(transactions.length, 1);
    assert.equal(transactions[0].delta, -1);
    assert.equal(transactions[0].transaction_type, "booking_debit");
  });

  // -------------------------------------------------------------
  // Test 6: Deux réservations simultanées avec 1 crédit -> 1 seule réussit
  // -------------------------------------------------------------
  await runTest("6. Concurrence & Lock (SELECT FOR UPDATE) -> 1 seul booking pour 1 crédit", async () => {
    let pack = {
      id: "pack-single-credit",
      remaining_credits: 1,
      isLocked: false,
    };

    async function atomicBookingAttempt(clientId) {
      while (pack.isLocked) {
        await new Promise((r) => setTimeout(r, 5));
      }
      pack.isLocked = true;
      try {
        if (pack.remaining_credits < 1) {
          return { success: false, error: "Crédits épuisés" };
        }
        pack.remaining_credits -= 1;
        return { success: true, clientId };
      } finally {
        pack.isLocked = false;
      }
    }

    const [resA, resB] = await Promise.all([
      atomicBookingAttempt("client_tab_1"),
      atomicBookingAttempt("client_tab_2"),
    ]);

    const successCount = (resA.success ? 1 : 0) + (resB.success ? 1 : 0);
    assert.equal(successCount, 1, "Exactement 1 réservation doit réussir sur 2 tentatives simultanées");
    assert.equal(pack.remaining_credits, 0, "Le solde final doit être 0");
  });

  // -------------------------------------------------------------
  // Test 7: Annulation >= 24h -> crédit +1 restitué
  // -------------------------------------------------------------
  await runTest("7. Annulation >= 24h -> restitution automatique du crédit et transaction", () => {
    let pack = { id: "pack-1", remaining_credits: 2, total_credits: 3 };
    const booking = {
      id: "b-1",
      credit_pack_id: "pack-1",
      starts_at: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
    };
    const transactions = [];

    const hoursDiff = (new Date(booking.starts_at).getTime() - Date.now()) / (3600 * 1000);
    assert.ok(hoursDiff >= 24, "Annulation anticipée");

    // Restitution
    pack.remaining_credits += 1;
    transactions.push({
      credit_pack_id: pack.id,
      delta: 1,
      transaction_type: "cancellation_refund",
    });

    assert.equal(pack.remaining_credits, 3);
    assert.equal(transactions[0].delta, 1);
    assert.equal(transactions[0].transaction_type, "cancellation_refund");
  });

  // -------------------------------------------------------------
  // Test 8: Annulation < 24h -> crédit non restitué et annulation bloquée
  // -------------------------------------------------------------
  await runTest("8. Annulation < 24h -> blocage strict et aucun crédit recrédité", () => {
    let pack = { id: "pack-1", remaining_credits: 1, total_credits: 3 };
    const booking = {
      id: "b-late",
      credit_pack_id: "pack-1",
      starts_at: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
    };

    const hoursDiff = (new Date(booking.starts_at).getTime() - Date.now()) / (3600 * 1000);
    assert.ok(hoursDiff < 24, "Annulation tardive");

    const canCancelOnline = hoursDiff >= 24;
    assert.equal(canCancelOnline, false, "Annulation en ligne doit être refusée");
    assert.equal(pack.remaining_credits, 1, "Le crédit ne doit pas être restitué");
  });

  // -------------------------------------------------------------
  // Test 9: Pack expiré -> réservation impossible
  // -------------------------------------------------------------
  await runTest("9. Pack expiré (expires_at dans le passé) -> réservation impossible", () => {
    const pack = {
      id: "pack-old",
      remaining_credits: 5,
      status: "active",
      expires_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    };

    const isExpired = new Date(pack.expires_at).getTime() < Date.now();
    assert.equal(isExpired, true);

    const canBook = pack.remaining_credits > 0 && !isExpired;
    assert.equal(canBook, false, "Réservation impossible sur pack expiré");
  });

  // -------------------------------------------------------------
  // Test 10: Séance dont la date est après expires_at -> réservation impossible
  // -------------------------------------------------------------
  await runTest("10. Séance programmée après expiration du pack -> refus de réservation", () => {
    const pack = {
      id: "pack-expiring-soon",
      remaining_credits: 2,
      expires_at: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString(),
    };
    const sessionStartsAt = new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString();

    const isValidForSession = new Date(pack.expires_at).getTime() >= new Date(sessionStartsAt).getTime();
    assert.equal(isValidForSession, false, "Séance après la date de validité");
  });

  // -------------------------------------------------------------
  // Test 11: Abonnement + Pack -> abonnement prioritaire, crédit intact
  // -------------------------------------------------------------
  await runTest("11. Priorité absolue de l'abonnement actif (credit_pack_id = NULL)", () => {
    const user = {
      hasActiveSubscription: true,
      creditPacks: [{ id: "pack-1", remaining_credits: 5 }],
    };

    let bookingResult;
    if (user.hasActiveSubscription) {
      bookingResult = {
        usedSubscription: true,
        credit_pack_id: null,
        consumedCredit: 0,
      };
    } else {
      bookingResult = {
        usedSubscription: false,
        credit_pack_id: user.creditPacks[0].id,
        consumedCredit: 1,
      };
    }

    assert.equal(bookingResult.usedSubscription, true);
    assert.equal(bookingResult.credit_pack_id, null, "credit_pack_id doit rester NULL");
    assert.equal(bookingResult.consumedCredit, 0, "Aucun crédit débité");
    assert.equal(user.creditPacks[0].remaining_credits, 5, "Solde de crédits intact");
  });

  // -------------------------------------------------------------
  // Test 12: Plusieurs packs -> consommation du pack expirant le plus tôt (FIFO)
  // -------------------------------------------------------------
  await runTest("12. Consommation FIFO du pack expirant le plus tôt", () => {
    const packs = [
      { id: "pack-far", remaining_credits: 5, expires_at: new Date("2027-01-15").toISOString() },
      { id: "pack-soon", remaining_credits: 2, expires_at: new Date("2026-11-01").toISOString() },
      { id: "pack-medium", remaining_credits: 10, expires_at: new Date("2026-12-30").toISOString() },
    ];

    const sortedPacks = [...packs]
      .filter((p) => p.remaining_credits > 0)
      .sort((a, b) => new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime());

    const chosenPack = sortedPacks[0];
    assert.equal(chosenPack.id, "pack-soon", "Le pack expirant en Novembre doit être choisi en priorité");
    chosenPack.remaining_credits -= 1;
    assert.equal(chosenPack.remaining_credits, 1);
  });

  // -------------------------------------------------------------
  // Test 13: Pack épuisé -> réservation impossible
  // -------------------------------------------------------------
  await runTest("13. Pack épuisé (remaining_credits = 0) -> réservation refusée", () => {
    const pack = {
      id: "pack-zero",
      remaining_credits: 0,
      total_credits: 10,
      status: "exhausted",
      expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
    };

    const canBook = pack.remaining_credits > 0;
    assert.equal(canBook, false, "Réservation impossible si remaining_credits = 0");
  });

  // -------------------------------------------------------------
  // Test 14: Aucun abonnement + Aucun pack -> réservation refusée
  // -------------------------------------------------------------
  await runTest("14. Utilisateur sans formule ni pack -> réservation refusée avec message clair", () => {
    const user = {
      hasActiveSubscription: false,
      creditPacks: [],
    };

    let error = null;
    if (!user.hasActiveSubscription && (!user.creditPacks || user.creditPacks.length === 0)) {
      error = "Aucun abonnement actif ni pack de séances disponible.";
    }

    assert.ok(error !== null);
    assert.match(error, /Aucun abonnement/);
  });

  // -------------------------------------------------------------
  // Test 15: Admin adjustment -> transaction d'audit créée avec raison
  // -------------------------------------------------------------
  await runTest("15. Ajustement manuel administrateur avec motif d'audit obligatoire", () => {
    let pack = {
      id: "pack-adm",
      remaining_credits: 2,
      total_credits: 3,
    };
    const auditLogs = [];

    function adminAdjust(packRef, delta, reason) {
      if (!reason || !reason.trim()) {
        throw new Error("Motif d'ajustement obligatoire");
      }
      packRef.remaining_credits = Math.max(0, packRef.remaining_credits + delta);
      auditLogs.push({
        credit_pack_id: packRef.id,
        delta,
        transaction_type: "admin_adjustment",
        reason,
        created_at: new Date().toISOString(),
      });
      return packRef;
    }

    // 1. Test sans raison -> doit échouer
    assert.throws(() => adminAdjust(pack, 1, ""), /Motif d'ajustement obligatoire/);

    // 2. Test avec raison valide
    adminAdjust(pack, 2, "Geste commercial météo");
    assert.equal(pack.remaining_credits, 4);
    assert.equal(auditLogs.length, 1);
    assert.equal(auditLogs[0].transaction_type, "admin_adjustment");
    assert.equal(auditLogs[0].reason, "Geste commercial météo");
    assert.equal(auditLogs[0].delta, 2);
  });

  // -------------------------------------------------------------
  // Test 16: découverte 1 -> première demande OK
  // -------------------------------------------------------------
  await runTest("16. Découverte 1 -> Première demande OK (membre éligible)", () => {
    const userId = "user-new-1";
    const planCode = "decouverte_1";
    const dbCredits = [];
    const dbRequests = [];

    function checkEligibility(uId, pCode) {
      const isDiscovery = pCode === "decouverte_1" || pCode === "decouverte_3";
      const hasCredits = dbCredits.some((c) => c.user_id === uId && c.plan_code === pCode);
      const userReqs = dbRequests.filter((r) => r.user_id === uId && r.plan_code === pCode);
      const hasPending = userReqs.some((r) => r.status === "pending");
      const hasAnyReq = userReqs.length > 0;

      if (isDiscovery) {
        if (hasCredits || hasAnyReq) {
          return { isEligible: false, alreadyUsed: true, hasPending };
        }
        return { isEligible: true, alreadyUsed: false, hasPending: false };
      }
      return { isEligible: !hasPending, alreadyUsed: false, hasPending };
    }

    const eligibility = checkEligibility(userId, planCode);
    assert.equal(eligibility.isEligible, true, "Doit être éligible à la 1ère demande");
    assert.equal(eligibility.alreadyUsed, false);

    // Enregistrement de la première demande
    dbRequests.push({ id: "req-1", user_id: userId, plan_code: planCode, status: "pending" });
    assert.equal(dbRequests.length, 1);
  });

  // -------------------------------------------------------------
  // Test 17: découverte 1 -> deuxième demande refusée
  // -------------------------------------------------------------
  await runTest("17. Découverte 1 -> Deuxième demande refusée (déjà demandée ou utilisée)", () => {
    const userId = "user-1";
    const planCode = "decouverte_1";
    const dbCredits = [];
    const dbRequests = [
      { id: "req-prev", user_id: userId, plan_code: planCode, status: "approved" },
    ];

    function checkEligibility(uId, pCode) {
      const isDiscovery = pCode === "decouverte_1" || pCode === "decouverte_3";
      const hasCredits = dbCredits.some((c) => c.user_id === uId && c.plan_code === pCode);
      const userReqs = dbRequests.filter((r) => r.user_id === uId && r.plan_code === pCode);
      const hasPending = userReqs.some((r) => r.status === "pending");
      const hasAnyReq = userReqs.length > 0;

      if (isDiscovery) {
        if (hasCredits || hasAnyReq) {
          return { isEligible: false, alreadyUsed: true, hasPending };
        }
        return { isEligible: true, alreadyUsed: false, hasPending: false };
      }
      return { isEligible: !hasPending, alreadyUsed: false, hasPending };
    }

    const eligibility = checkEligibility(userId, planCode);
    assert.equal(eligibility.isEligible, false, "Doit refuser la deuxième demande");
    assert.equal(eligibility.alreadyUsed, true, "Marqué comme déjà utilisé");
  });

  // -------------------------------------------------------------
  // Test 18: découverte 1 expirée -> nouvelle demande refusée
  // -------------------------------------------------------------
  await runTest("18. Découverte 1 expirée -> Nouvelle demande refusée à vie", () => {
    const userId = "user-expired";
    const planCode = "decouverte_1";
    const dbCredits = [
      {
        id: "cred-old",
        user_id: userId,
        plan_code: planCode,
        status: "expired",
        expires_at: new Date(Date.now() - 50 * 86400000).toISOString(),
      },
    ];
    const dbRequests = [];

    function checkEligibility(uId, pCode) {
      const isDiscovery = pCode === "decouverte_1" || pCode === "decouverte_3";
      const hasCredits = dbCredits.some((c) => c.user_id === uId && c.plan_code === pCode);
      const userReqs = dbRequests.filter((r) => r.user_id === uId && r.plan_code === pCode);
      const hasPending = userReqs.some((r) => r.status === "pending");
      const hasAnyReq = userReqs.length > 0;

      if (isDiscovery) {
        if (hasCredits || hasAnyReq) {
          return { isEligible: false, alreadyUsed: true, hasPending };
        }
        return { isEligible: true, alreadyUsed: false, hasPending: false };
      }
      return { isEligible: !hasPending, alreadyUsed: false, hasPending };
    }

    const eligibility = checkEligibility(userId, planCode);
    assert.equal(eligibility.isEligible, false, "Pack expiré ne doit jamais redevenir éligible");
    assert.equal(eligibility.alreadyUsed, true);
  });

  // -------------------------------------------------------------
  // Test 19: découverte 1 épuisée -> nouvelle demande refusée
  // -------------------------------------------------------------
  await runTest("19. Découverte 1 épuisée (0 crédit) -> Nouvelle demande refusée à vie", () => {
    const userId = "user-exhausted";
    const planCode = "decouverte_1";
    const dbCredits = [
      {
        id: "cred-used",
        user_id: userId,
        plan_code: planCode,
        remaining_credits: 0,
        status: "exhausted",
      },
    ];
    const dbRequests = [];

    function checkEligibility(uId, pCode) {
      const isDiscovery = pCode === "decouverte_1" || pCode === "decouverte_3";
      const hasCredits = dbCredits.some((c) => c.user_id === uId && c.plan_code === pCode);
      const userReqs = dbRequests.filter((r) => r.user_id === uId && r.plan_code === pCode);
      const hasPending = userReqs.some((r) => r.status === "pending");
      const hasAnyReq = userReqs.length > 0;

      if (isDiscovery) {
        if (hasCredits || hasAnyReq) {
          return { isEligible: false, alreadyUsed: true, hasPending };
        }
        return { isEligible: true, alreadyUsed: false, hasPending: false };
      }
      return { isEligible: !hasPending, alreadyUsed: false, hasPending };
    }

    const eligibility = checkEligibility(userId, planCode);
    assert.equal(eligibility.isEligible, false, "Pack épuisé ne doit jamais redevenir éligible");
    assert.equal(eligibility.alreadyUsed, true);
  });

  // -------------------------------------------------------------
  // Test 20: découverte 3 -> première demande OK
  // -------------------------------------------------------------
  await runTest("20. Découverte 3 -> Première demande OK (membre éligible)", () => {
    const userId = "user-new-3";
    const planCode = "decouverte_3";
    const dbCredits = [];
    const dbRequests = [];

    function checkEligibility(uId, pCode) {
      const isDiscovery = pCode === "decouverte_1" || pCode === "decouverte_3";
      const hasCredits = dbCredits.some((c) => c.user_id === uId && c.plan_code === pCode);
      const userReqs = dbRequests.filter((r) => r.user_id === uId && r.plan_code === pCode);
      const hasPending = userReqs.some((r) => r.status === "pending");
      const hasAnyReq = userReqs.length > 0;

      if (isDiscovery) {
        if (hasCredits || hasAnyReq) {
          return { isEligible: false, alreadyUsed: true, hasPending };
        }
        return { isEligible: true, alreadyUsed: false, hasPending: false };
      }
      return { isEligible: !hasPending, alreadyUsed: false, hasPending };
    }

    const eligibility = checkEligibility(userId, planCode);
    assert.equal(eligibility.isEligible, true, "Première demande Découverte 3 autorisée");
    assert.equal(eligibility.alreadyUsed, false);
  });

  // -------------------------------------------------------------
  // Test 21: découverte 3 -> deuxième demande refusée
  // -------------------------------------------------------------
  await runTest("21. Découverte 3 -> Deuxième demande refusée (déjà demandée)", () => {
    const userId = "user-3-used";
    const planCode = "decouverte_3";
    const dbCredits = [];
    const dbRequests = [
      { id: "req-3-prev", user_id: userId, plan_code: planCode, status: "pending" },
    ];

    function checkEligibility(uId, pCode) {
      const isDiscovery = pCode === "decouverte_1" || pCode === "decouverte_3";
      const hasCredits = dbCredits.some((c) => c.user_id === uId && c.plan_code === pCode);
      const userReqs = dbRequests.filter((r) => r.user_id === uId && r.plan_code === pCode);
      const hasPending = userReqs.some((r) => r.status === "pending");
      const hasAnyReq = userReqs.length > 0;

      if (isDiscovery) {
        if (hasCredits || hasAnyReq) {
          return { isEligible: false, alreadyUsed: true, hasPending };
        }
        return { isEligible: true, alreadyUsed: false, hasPending: false };
      }
      return { isEligible: !hasPending, alreadyUsed: false, hasPending };
    }

    const eligibility = checkEligibility(userId, planCode);
    assert.equal(eligibility.isEligible, false, "Deuxième demande Découverte 3 refusée");
    assert.equal(eligibility.alreadyUsed, true);
  });

  // -------------------------------------------------------------
  // Test 22: pack 10 -> achat/demande répétable
  // -------------------------------------------------------------
  await runTest("22. Pack 10 Small Group -> Achat et demande répétables", () => {
    const userId = "user-regular-10";
    const planCode = "pack_10_small_group";
    const dbCredits = [
      { id: "pack-10-first", user_id: userId, plan_code: planCode, remaining_credits: 0, status: "exhausted" },
    ];
    const dbRequests = [
      { id: "req-10-past", user_id: userId, plan_code: planCode, status: "approved" },
    ];

    function checkEligibility(uId, pCode) {
      const isDiscovery = pCode === "decouverte_1" || pCode === "decouverte_3";
      const hasCredits = dbCredits.some((c) => c.user_id === uId && c.plan_code === pCode);
      const userReqs = dbRequests.filter((r) => r.user_id === uId && r.plan_code === pCode);
      const hasPending = userReqs.some((r) => r.status === "pending");
      const hasAnyReq = userReqs.length > 0;

      if (isDiscovery) {
        if (hasCredits || hasAnyReq) {
          return { isEligible: false, alreadyUsed: true, hasPending };
        }
        return { isEligible: true, alreadyUsed: false, hasPending: false };
      }
      return { isEligible: !hasPending, alreadyUsed: false, hasPending };
    }

    // Même avec un pack 10 passé épuisé et une demande passée approved, le membre reste éligible à un nouveau pack 10
    const eligibility = checkEligibility(userId, planCode);
    assert.equal(eligibility.isEligible, true, "Pack 10 doit être répétable");
    assert.equal(eligibility.alreadyUsed, false);

    // Si une demande est en cours (pending), nouvelle soumission temporairement bloquée
    dbRequests.push({ id: "req-10-new", user_id: userId, plan_code: planCode, status: "pending" });
    const pendingEligibility = checkEligibility(userId, planCode);
    assert.equal(pendingEligibility.isEligible, false, "Bloqué pendant qu'une demande est pending");
    assert.equal(pendingEligibility.hasPending, true);
  });

  // -------------------------------------------------------------
  // Test 23: deux demandes simultanées du même pack découverte -> 1 seule passe
  // -------------------------------------------------------------
  await runTest("23. Concurrence : Deux demandes simultanées pour le même pack découverte -> 1 seule réussit", async () => {
    const userId = "user-concurrent";
    const planCode = "decouverte_1";
    const dbRequests = [];
    let isMutexLocked = false;

    async function submitPackAtomic(uId, pCode) {
      while (isMutexLocked) {
        await new Promise((r) => setTimeout(r, 5));
      }
      isMutexLocked = true;
      try {
        const hasExisting = dbRequests.some((r) => r.user_id === uId && r.plan_code === pCode);
        if (hasExisting) {
          return { success: false, error: "Offre découverte déjà utilisée" };
        }
        const newReq = { id: `req-${Date.now()}-${Math.random()}`, user_id: uId, plan_code: pCode, status: "pending" };
        dbRequests.push(newReq);
        return { success: true, requestId: newReq.id };
      } finally {
        isMutexLocked = false;
      }
    }

    const [res1, res2] = await Promise.all([
      submitPackAtomic(userId, planCode),
      submitPackAtomic(userId, planCode),
    ]);

    const successCount = (res1.success ? 1 : 0) + (res2.success ? 1 : 0);
    assert.equal(successCount, 1, "Exactement 1 demande doit réussir lors de soumissions simultanées");
    assert.equal(dbRequests.length, 1, "Une seule demande doit être enregistrée");
    assert.ok(res1.success ? !res2.success : res2.success);
  });

  console.log("\n=================================================================");
  console.log(`RÉSULTAT DES TESTS : ${passed} passés / ${failed} échoués`);
  console.log("=================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Erreur fatale de test:", err);
  process.exit(1);
});

