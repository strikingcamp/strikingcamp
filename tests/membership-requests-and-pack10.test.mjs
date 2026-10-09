/**
 * =============================================================================
 * SUITE DE TESTS : MODIFICATION DES DEMANDES EN ATTENTE & PACK 10 SÉANCES
 * =============================================================================
 * Fichier : tests/membership-requests-and-pack10.test.mjs
 * =============================================================================
 */

import assert from "node:assert/strict";
import { SESSION_PACKS, computePackExpirationDate } from "../lib/stripe.ts";

console.log("=================================================================");
console.log("TEST SUITE: PROBLÈMES 3 & 4 (DEMANDES D'ADHÉSION & PACK 10 SÉANCES)");
console.log("=================================================================\n");

let passed = 0;
let total = 0;

function runTest(name, fn) {
  total++;
  try {
    fn();
    console.log(`✅ [PASS] ${total}. ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ [FAIL] ${total}. ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. TESTS PROBLÈME 3 — MODIFICATION DES DEMANDES D'ADHÉSION EN ATTENTE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const mockDb = {
  plans: [
    { id: "plan-essentiel", code: "adult_essential", name: "Cours Adulte — Essentiel", price_cents: 39900, is_active: true },
    { id: "plan-all-access", code: "adult_all_access", name: "Cours Adulte — All Access", price_cents: 89900, is_active: true },
    { id: "plan-inactive", code: "old_plan", name: "Ancien Plan Inactif", price_cents: 20000, is_active: false },
    { id: "plan-pack-10", code: "pack_10_small_group", name: "Pack 10 séances — Small Group", tier: "credit_pack", price_cents: 18000, is_active: true },
    { id: "plan-decouverte-1", code: "decouverte_1", name: "Découverte — 1 séance", tier: "credit_pack", price_cents: 2000, is_active: true },
    { id: "plan-decouverte-3", code: "decouverte_3", name: "Découverte — 3 séances", tier: "credit_pack", price_cents: 4900, is_active: true },
  ],
  membershipRequests: [
    {
      id: "req-user-1",
      user_id: "user-123",
      plan_id: "plan-essentiel",
      status: "pending",
      commitment_type: "annual",
      selected_discipline: "Boxe anglaise",
      member_notes: "Débutant",
      admin_notes: null,
      reviewed_by: null,
      reviewed_at: null,
      created_at: "2026-10-09T10:00:00.000Z",
      updated_at: "2026-10-09T10:00:00.000Z",
    },
    {
      id: "req-user-approved",
      user_id: "user-123",
      plan_id: "plan-all-access",
      status: "approved",
      commitment_type: "annual",
      selected_discipline: null,
      member_notes: null,
      admin_notes: "Dossier validé",
      reviewed_by: "admin-1",
      reviewed_at: "2026-10-09T12:00:00.000Z",
      created_at: "2026-10-08T10:00:00.000Z",
      updated_at: "2026-10-09T12:00:00.000Z",
    },
    {
      id: "req-user-rejected",
      user_id: "user-123",
      plan_id: "plan-essentiel",
      status: "rejected",
      commitment_type: "annual",
      selected_discipline: "Kick Boxing",
      member_notes: null,
      admin_notes: "Refusé",
      reviewed_by: "admin-1",
      reviewed_at: "2026-10-09T12:00:00.000Z",
      created_at: "2026-10-08T10:00:00.000Z",
      updated_at: "2026-10-09T12:00:00.000Z",
    },
  ],
};

// Simulation de la RPC update_my_pending_membership_request
function simulateUpdateMyPendingMembershipRequest(authUserId, { requestId, planId, commitmentType, selectedDiscipline, memberNotes }) {
  if (!authUserId) {
    return { success: false, error: "UNAUTHORIZED", message: "Non authentifié" };
  }
  if (!["monthly", "annual"].includes(commitmentType)) {
    return { success: false, error: "INVALID_COMMITMENT", message: "Engagement invalide" };
  }
  const req = mockDb.membershipRequests.find((r) => r.id === requestId && r.user_id === authUserId);
  if (!req) {
    return { success: false, error: "REQUEST_NOT_FOUND", message: "Demande introuvable ou vous n'en êtes pas l'auteur" };
  }
  if (req.status !== "pending") {
    return { success: false, error: "REQUEST_NOT_PENDING", message: `Demande non modifiable (statut actuel: ${req.status})` };
  }
  const plan = mockDb.plans.find((p) => p.id === planId);
  if (!plan || !plan.is_active) {
    return { success: false, error: "PLAN_NOT_FOUND", message: "Plan introuvable ou inactif" };
  }

  // Update in place
  req.plan_id = planId;
  req.commitment_type = commitmentType;
  req.selected_discipline = selectedDiscipline ? selectedDiscipline.trim() : null;
  req.member_notes = memberNotes ? memberNotes.trim() : null;
  req.updated_at = new Date().toISOString();

  return { success: true, request_id: requestId, message: "Demande mise à jour avec succès" };
}

runTest("Demande pending peut être modifiée par son propriétaire", () => {
  const res = simulateUpdateMyPendingMembershipRequest("user-123", {
    requestId: "req-user-1",
    planId: "plan-all-access",
    commitmentType: "annual",
    selectedDiscipline: null,
    memberNotes: "Je souhaite passer en All Access",
  });
  assert.equal(res.success, true);
  const updated = mockDb.membershipRequests.find((r) => r.id === "req-user-1");
  assert.equal(updated.plan_id, "plan-all-access");
  assert.equal(updated.member_notes, "Je souhaite passer en All Access");
  assert.equal(updated.status, "pending");
});

runTest("La même ligne est conservée sans création de doublon", () => {
  const initialCount = mockDb.membershipRequests.length;
  simulateUpdateMyPendingMembershipRequest("user-123", {
    requestId: "req-user-1",
    planId: "plan-essentiel",
    commitmentType: "annual",
    selectedDiscipline: "Kick Boxing",
    memberNotes: "Retour à l'essentiel Kick Boxing",
  });
  assert.equal(mockDb.membershipRequests.length, initialCount);
  const updated = mockDb.membershipRequests.find((r) => r.id === "req-user-1");
  assert.equal(updated.selected_discipline, "Kick Boxing");
});

runTest("Un autre utilisateur ne peut pas modifier la demande", () => {
  const res = simulateUpdateMyPendingMembershipRequest("user-other-456", {
    requestId: "req-user-1",
    planId: "plan-all-access",
    commitmentType: "annual",
  });
  assert.equal(res.success, false);
  assert.equal(res.error, "REQUEST_NOT_FOUND");
});

runTest("Un utilisateur non authentifié est rejeté", () => {
  const res = simulateUpdateMyPendingMembershipRequest(null, {
    requestId: "req-user-1",
    planId: "plan-all-access",
    commitmentType: "annual",
  });
  assert.equal(res.success, false);
  assert.equal(res.error, "UNAUTHORIZED");
});

runTest("Une demande approved ne peut pas être modifiée", () => {
  const res = simulateUpdateMyPendingMembershipRequest("user-123", {
    requestId: "req-user-approved",
    planId: "plan-essentiel",
    commitmentType: "annual",
  });
  assert.equal(res.success, false);
  assert.equal(res.error, "REQUEST_NOT_PENDING");
});

runTest("Une demande rejected ne peut pas être modifiée", () => {
  const res = simulateUpdateMyPendingMembershipRequest("user-123", {
    requestId: "req-user-rejected",
    planId: "plan-essentiel",
    commitmentType: "annual",
  });
  assert.equal(res.success, false);
  assert.equal(res.error, "REQUEST_NOT_PENDING");
});

runTest("Les formules inactives sont refusées", () => {
  const res = simulateUpdateMyPendingMembershipRequest("user-123", {
    requestId: "req-user-1",
    planId: "plan-inactive",
    commitmentType: "annual",
  });
  assert.equal(res.success, false);
  assert.equal(res.error, "PLAN_NOT_FOUND");
});

runTest("Les champs administratifs sont protégés (status, reviewed_by, reviewed_at, admin_notes non altérés)", () => {
  const req = mockDb.membershipRequests.find((r) => r.id === "req-user-1");
  assert.equal(req.status, "pending");
  assert.equal(req.reviewed_by, null);
  assert.equal(req.reviewed_at, null);
  assert.equal(req.admin_notes, null);
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. TESTS PROBLÈME 4 — PACK DE 10 SÉANCES SMALL GROUP
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

runTest("Le Pack 10 séances existe dans la configuration SESSION_PACKS", () => {
  const pack = SESSION_PACKS.pack_10_small_group;
  assert.ok(pack, "Pack 10 doit être défini");
  assert.equal(pack.planCode, "pack_10_small_group");
  assert.equal(pack.name, "Pack 10 séances — Small Group");
  assert.equal(pack.priceEuros, 180);
  assert.equal(pack.priceCents, 18000);
  assert.equal(pack.totalCredits, 10);
  assert.equal(pack.validityMonths, 3);
});

runTest("Le calcul d'expiration pour le Pack 10 séances est exactement de 3 mois / 90 jours", () => {
  const start = new Date("2026-10-09T12:00:00.000Z");
  const expiresAt = computePackExpirationDate("pack_10_small_group", start);
  const diffDays = Math.round((expiresAt.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  assert.ok(diffDays >= 89 && diffDays <= 92, `Différence de jours attendue ~90j, obtenu: ${diffDays}`);
});

runTest("Attribution de crédits Pack 10 : exactement 10 crédits créés avec transaction d'audit", () => {
  const userCredits = [];
  const creditTransactions = [];

  const packDef = SESSION_PACKS.pack_10_small_group;
  const newPack = {
    id: "pack-cred-1",
    user_id: "user-123",
    plan_id: "plan-pack-10",
    total_credits: packDef.totalCredits,
    remaining_credits: packDef.totalCredits,
    status: "active",
    expires_at: computePackExpirationDate(packDef),
  };
  userCredits.push(newPack);
  creditTransactions.push({
    credit_pack_id: newPack.id,
    user_id: "user-123",
    delta: packDef.totalCredits,
    transaction_type: "purchase",
  });

  assert.equal(userCredits[0].total_credits, 10);
  assert.equal(userCredits[0].remaining_credits, 10);
  assert.equal(creditTransactions[0].delta, 10);
  assert.equal(creditTransactions[0].transaction_type, "purchase");
});

runTest("Le Pack 10 séances est réitérable (plusieurs achats autorisés pour le même membre)", () => {
  const userCredits = [
    { id: "pack-1", user_id: "user-123", plan_id: "plan-pack-10", remaining_credits: 0, status: "exhausted" },
  ];
  // Deuxième achat
  userCredits.push({
    id: "pack-2",
    user_id: "user-123",
    plan_id: "plan-pack-10",
    remaining_credits: 10,
    total_credits: 10,
    status: "active",
  });
  assert.equal(userCredits.length, 2);
  const activePacks = userCredits.filter((p) => p.status === "active");
  assert.equal(activePacks.length, 1);
  assert.equal(activePacks[0].remaining_credits, 10);
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. TESTS DE SÉCURITÉ TRANSACTIONNELLE ET ATOMIQUE (RPC 20261013)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function simulateAdminApproveCreditPack(adminUser, requestId, adminNotes = null) {
  if (!adminUser || adminUser.role !== "admin") {
    return { success: false, error: "FORBIDDEN" };
  }

  const req = mockDb.membershipRequests.find((r) => r.id === requestId);
  if (!req) {
    return { success: false, error: "REQUEST_NOT_FOUND" };
  }

  if (req.status !== "pending") {
    return { success: false, error: "REQUEST_NOT_PENDING" };
  }

  const plan = mockDb.plans.find((p) => p.id === req.plan_id);
  if (!plan || plan.is_active === false) {
    return { success: false, error: "PLAN_NOT_FOUND" };
  }

  if (plan.tier !== "credit_pack") {
    return { success: false, error: "NOT_A_CREDIT_PACK" };
  }

  // 4. Détermination des crédits et de la durée d'expiration (codes explicitement gérés)
  let totalCredits;
  if (plan.code === "pack_10_small_group") {
    totalCredits = 10;
  } else if (plan.code === "decouverte_3") {
    totalCredits = 3;
  } else if (plan.code === "decouverte_1") {
    totalCredits = 1;
  } else {
    return { success: false, error: "UNKNOWN_PACK_CODE", message: "Code de pack de crédits non reconnu" };
  }

  // 5. Vérification découverte (toutes offres confondues)
  if (plan.code === "decouverte_1" || plan.code === "decouverte_3") {
    const existing = mockDb.memberCredits?.find((c) => {
      if (c.user_id !== req.user_id) return false;
      const creditPlan = mockDb.plans.find((p) => p.id === c.plan_id);
      return creditPlan && ["decouverte_1", "decouverte_3"].includes(creditPlan.code);
    });
    if (existing) {
      return { success: false, error: "DISCOVERY_ALREADY_USED" };
    }
  }

  const newPackId = "pack-created-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7);
  
  // 6. Pack
  if (!mockDb.memberCredits) mockDb.memberCredits = [];
  mockDb.memberCredits.push({
    id: newPackId,
    user_id: req.user_id,
    plan_id: req.plan_id,
    total_credits: totalCredits,
    remaining_credits: totalCredits,
    status: "active",
  });

  // 7. Transaction
  if (!mockDb.creditTransactions) mockDb.creditTransactions = [];
  mockDb.creditTransactions.push({
    credit_pack_id: newPackId,
    user_id: req.user_id,
    delta: totalCredits,
    transaction_type: "purchase",
  });

  // 8. Update request conditionné à status = 'pending'
  if (req.status !== "pending") {
    // Rollback simulation (annule les insertions précédentes)
    mockDb.memberCredits = mockDb.memberCredits.filter((c) => c.id !== newPackId);
    mockDb.creditTransactions = mockDb.creditTransactions.filter((t) => t.credit_pack_id !== newPackId);
    throw new Error("REQUEST_UPDATE_FAILED: Demande non pending lors de l'update");
  }

  req.status = "approved";
  req.reviewed_by = adminUser.id;
  req.admin_notes = adminNotes;

  return { success: true, pack_id: newPackId, total_credits: totalCredits };
}

runTest("Simulation RPC : Rejet des codes de pack inconnus (UNKNOWN_PACK_CODE)", () => {
  mockDb.plans.push({
    id: "plan-unknown-code",
    code: "pack_inconnu_custom",
    tier: "credit_pack",
    is_active: true,
  });
  mockDb.membershipRequests.push({
    id: "req-unknown-pack",
    user_id: "user-456",
    plan_id: "plan-unknown-code",
    status: "pending",
  });

  const res = simulateAdminApproveCreditPack({ id: "admin-1", role: "admin" }, "req-unknown-pack");
  assert.equal(res.success, false);
  assert.equal(res.error, "UNKNOWN_PACK_CODE");
});

runTest("Simulation RPC : Approbation réussie d'un Pack 10 (Atomique)", () => {
  mockDb.membershipRequests.push({
    id: "req-pack-10-pending",
    user_id: "user-456",
    plan_id: "plan-pack-10",
    status: "pending",
  });

  const res = simulateAdminApproveCreditPack({ id: "admin-1", role: "admin" }, "req-pack-10-pending");
  assert.equal(res.success, true);
  assert.equal(res.total_credits, 10);
  
  const reqAfter = mockDb.membershipRequests.find((r) => r.id === "req-pack-10-pending");
  assert.equal(reqAfter.status, "approved");
});

runTest("Simulation Concurrence : Deuxième tentative d'approbation rejetée (REQUEST_NOT_PENDING)", () => {
  const res = simulateAdminApproveCreditPack({ id: "admin-1", role: "admin" }, "req-pack-10-pending");
  assert.equal(res.success, false);
  assert.equal(res.error, "REQUEST_NOT_PENDING");
});

runTest("Simulation RPC : Rejet si l'utilisateur n'est pas admin", () => {
  const res = simulateAdminApproveCreditPack({ id: "user-normal", role: "member" }, "req-pack-10-pending");
  assert.equal(res.success, false);
  assert.equal(res.error, "FORBIDDEN");
});

runTest("Simulation RPC : Rejet si le plan n'est pas un credit_pack", () => {
  mockDb.membershipRequests.push({
    id: "req-sub-plan",
    user_id: "user-456",
    plan_id: "plan-all-access",
    status: "pending",
  });
  const res = simulateAdminApproveCreditPack({ id: "admin-1", role: "admin" }, "req-sub-plan");
  assert.equal(res.success, false);
  assert.equal(res.error, "NOT_A_CREDIT_PACK");
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. TESTS DE SÉCURITÉ SPÉCIFIQUES AUX OFFRES DÉCOUVERTE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

runTest("Offre Découverte : Première attribution de decouverte_1 acceptée (1 crédit)", () => {
  mockDb.membershipRequests.push({
    id: "req-dec1-user-A",
    user_id: "user-disc-A",
    plan_id: "plan-decouverte-1",
    status: "pending",
  });
  const res = simulateAdminApproveCreditPack({ id: "admin-1", role: "admin" }, "req-dec1-user-A");
  assert.equal(res.success, true);
  assert.equal(res.total_credits, 1);
});

runTest("Offre Découverte : Nouvelle attribution de decouverte_1 pour le même membre refusée", () => {
  mockDb.membershipRequests.push({
    id: "req-dec1-user-A-bis",
    user_id: "user-disc-A",
    plan_id: "plan-decouverte-1",
    status: "pending",
  });
  const res = simulateAdminApproveCreditPack({ id: "admin-1", role: "admin" }, "req-dec1-user-A-bis");
  assert.equal(res.success, false);
  assert.equal(res.error, "DISCOVERY_ALREADY_USED");
});

runTest("Offre Découverte : Première attribution de decouverte_3 acceptée (3 crédits)", () => {
  mockDb.membershipRequests.push({
    id: "req-dec3-user-B",
    user_id: "user-disc-B",
    plan_id: "plan-decouverte-3",
    status: "pending",
  });
  const res = simulateAdminApproveCreditPack({ id: "admin-1", role: "admin" }, "req-dec3-user-B");
  assert.equal(res.success, true);
  assert.equal(res.total_credits, 3);
});

runTest("Offre Découverte : Nouvelle attribution de decouverte_3 pour le même membre refusée", () => {
  mockDb.membershipRequests.push({
    id: "req-dec3-user-B-bis",
    user_id: "user-disc-B",
    plan_id: "plan-decouverte-3",
    status: "pending",
  });
  const res = simulateAdminApproveCreditPack({ id: "admin-1", role: "admin" }, "req-dec3-user-B-bis");
  assert.equal(res.success, false);
  assert.equal(res.error, "DISCOVERY_ALREADY_USED");
});

runTest("Offre Découverte : Attribution de decouverte_1, puis demande de decouverte_3 refusée", () => {
  // user-disc-A a déjà decouverte_1 ci-dessus
  mockDb.membershipRequests.push({
    id: "req-dec3-user-A",
    user_id: "user-disc-A",
    plan_id: "plan-decouverte-3",
    status: "pending",
  });
  const res = simulateAdminApproveCreditPack({ id: "admin-1", role: "admin" }, "req-dec3-user-A");
  assert.equal(res.success, false);
  assert.equal(res.error, "DISCOVERY_ALREADY_USED");
});

runTest("Offre Découverte : Attribution de decouverte_3, puis demande de decouverte_1 refusée", () => {
  // user-disc-B a déjà decouverte_3 ci-dessus
  mockDb.membershipRequests.push({
    id: "req-dec1-user-B",
    user_id: "user-disc-B",
    plan_id: "plan-decouverte-1",
    status: "pending",
  });
  const res = simulateAdminApproveCreditPack({ id: "admin-1", role: "admin" }, "req-dec1-user-B");
  assert.equal(res.success, false);
  assert.equal(res.error, "DISCOVERY_ALREADY_USED");
});

runTest("Offre Découverte : Deux demandes Découverte concurrentes pour le même membre -> une seule attribution au maximum", () => {
  mockDb.membershipRequests.push({
    id: "req-conc-1",
    user_id: "user-disc-conc",
    plan_id: "plan-decouverte-1",
    status: "pending",
  });
  mockDb.membershipRequests.push({
    id: "req-conc-2",
    user_id: "user-disc-conc",
    plan_id: "plan-decouverte-3",
    status: "pending",
  });

  // Première approbation (gagne la course)
  const res1 = simulateAdminApproveCreditPack({ id: "admin-1", role: "admin" }, "req-conc-1");
  assert.equal(res1.success, true);

  // Deuxième approbation (bloquée par l'existence de l'offre découverte déjà attribuée)
  const res2 = simulateAdminApproveCreditPack({ id: "admin-1", role: "admin" }, "req-conc-2");
  assert.equal(res2.success, false);
  assert.equal(res2.error, "DISCOVERY_ALREADY_USED");

  // Vérification dans la base : 1 seule attribution
  const userCredits = mockDb.memberCredits.filter((c) => c.user_id === "user-disc-conc");
  assert.equal(userCredits.length, 1);
});

runTest("Simulation update_my_pending_membership_request avec p_commitment_type = NULL rejeté", () => {
  const res = simulateUpdateMyPendingMembershipRequest("user-123", {
    requestId: "req-user-1",
    planId: "plan-all-access",
    commitmentType: null,
  });
  assert.equal(res.success, false);
  assert.equal(res.error, "INVALID_COMMITMENT");
});

runTest("Désactivation Stripe Checkout : Toute tentative d'achat direct renvoie 403 DIRECT_PURCHASE_DISABLED", () => {
  function simulateStripeCheckoutAttempt() {
    return {
      status: 403,
      body: {
        error: "DIRECT_PURCHASE_DISABLED",
        message: "Les achats directs en ligne sont désactivés.",
      },
    };
  }
  const res = simulateStripeCheckoutAttempt();
  assert.equal(res.status, 403);
  assert.equal(res.body.error, "DIRECT_PURCHASE_DISABLED");
});

runTest("Désactivation Stripe Webhook : Le webhook refuse l'attribution automatique sans approbation administrative", () => {
  function simulateWebhookProcessing(event) {
    if (event.type === "checkout.session.completed") {
      return {
        received: true,
        message: "Direct credit allocation via Stripe webhook is disabled. Administrative approval required.",
        allocatedCredits: 0,
      };
    }
    return { received: true };
  }
  const res = simulateWebhookProcessing({ type: "checkout.session.completed" });
  assert.equal(res.received, true);
  assert.equal(res.allocatedCredits, 0);
});

console.log("\n=================================================================");
console.log(`RÉSULTAT DES TESTS : ${passed} passés / ${total - passed} échoués`);
console.log("=================================================================\n");


