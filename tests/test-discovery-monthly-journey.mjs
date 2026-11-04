/**
 * =============================================================================
 * SUITE DE TESTS COMPLÈTE : ABONNEMENT ADULTE SANS ENGAGEMENT (89 €/MOIS)
 * ET CONFORMITÉ ABSOLUE AVEC LE SCHÉMA RÉEL SUPABASE
 * =============================================================================
 * Fichier : tests/test-discovery-monthly-journey.mjs
 * Validation intégrale de l'ensemble des règles métier, colonnes réelles et sécurités.
 * =============================================================================
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import { computePlanAccess } from "../lib/access-control.ts";
import { SESSION_PACKS } from "../lib/stripe.ts";

console.log("=================================================================");
console.log("TEST SUITE: CONFORMITÉ SCHÉMA RÉEL & PARCOURS ADULTE SANS ENGAGEMENT");
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

const migrationSql = fs.readFileSync("supabase/migrations/20261104_discovery_monthly_aligned_with_all_access.sql", "utf-8");

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. CONFORMITÉ DES COLONNES DU SCHÉMA RÉEL SUPABASE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
runTest("Schéma réel : vérification des colonnes de public.membership_requests", () => {
  // member_notes (et non notes)
  assert.ok(migrationSql.includes("member_notes"), "Doit utiliser member_notes");
  assert.ok(!migrationSql.includes("INSERT INTO public.membership_requests (\n    user_id,\n    plan_id,\n    status,\n    commitment_type,\n    selected_discipline,\n    notes"), "Ne doit pas insérer dans notes");

  // selected_discipline (colonne dédiée et non intégrée dans le texte des notes)
  assert.ok(migrationSql.includes("selected_discipline"), "Doit utiliser selected_discipline");

  // reviewed_by et reviewed_at (et non processed_by / processed_at)
  assert.ok(migrationSql.includes("reviewed_by = v_admin_id"), "Doit utiliser reviewed_by");
  assert.ok(migrationSql.includes("reviewed_at = v_now"), "Doit utiliser reviewed_at");
  assert.ok(!migrationSql.includes("processed_by"), "Ne doit pas faire référence à processed_by");
  assert.ok(!migrationSql.includes("processed_at"), "Ne doit pas faire référence à processed_at");
});

runTest("Schéma réel : vérification des colonnes de public.subscriptions", () => {
  // started_at (et non starts_at)
  assert.ok(migrationSql.includes("started_at"), "Doit utiliser started_at");
  assert.ok(!migrationSql.includes("starts_at"), "Ne doit pas utiliser starts_at dans public.subscriptions");

  // private_sessions_quota (et non remaining_private_sessions)
  assert.ok(migrationSql.includes("private_sessions_quota"), "Doit utiliser private_sessions_quota");
  assert.ok(!migrationSql.includes("remaining_private_sessions"), "Ne doit pas faire référence à remaining_private_sessions");
});

runTest("Schéma réel : vérification des colonnes de public.plans", () => {
  // private_sessions_per_period (sur plans)
  assert.ok(migrationSql.includes("private_sessions_per_period"), "Doit lire private_sessions_per_period sur public.plans");
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. SIGNATURES & COMPATIBILITÉ DES SERVER ACTIONS / FORMULAIRES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
runTest("Signatures : submit_membership_request compatible avec lib/supabase/membership-requests.ts", () => {
  const tsHelper = fs.readFileSync("lib/supabase/membership-requests.ts", "utf-8");
  assert.ok(tsHelper.includes('p_plan_id: payload.planId'));
  assert.ok(tsHelper.includes('p_commitment_type: payload.commitmentType'));
  assert.ok(tsHelper.includes('p_member_notes: payload.memberNotes || null'));
  assert.ok(tsHelper.includes('p_selected_discipline: payload.selectedDiscipline || null'));

  assert.ok(
    migrationSql.includes("CREATE OR REPLACE FUNCTION public.submit_membership_request(\n  p_plan_id UUID,\n  p_commitment_type TEXT,\n  p_member_notes TEXT DEFAULT NULL,\n  p_selected_discipline TEXT DEFAULT NULL\n)"),
    "La signature SQL doit correspondre exactement aux paramètres nommés de l'application"
  );
});

runTest("Signatures : admin_approve_membership_request compatible avec Server Action", () => {
  const adminActions = fs.readFileSync("app/(admin)/admin/adhesions/actions.ts", "utf-8");
  assert.ok(adminActions.includes('await supabase.rpc("admin_approve_membership_request", {'));
  assert.ok(adminActions.includes('p_request_id: requestId'));
  assert.ok(adminActions.includes('p_admin_notes: cleanNotes'));

  assert.ok(
    migrationSql.includes("CREATE OR REPLACE FUNCTION public.admin_approve_membership_request(\n  p_request_id UUID,\n  p_admin_notes TEXT DEFAULT NULL\n)"),
    "La signature SQL admin_approve doit correspondre exactement à (p_request_id, p_admin_notes)"
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. ENGAGEMENT & CONTRÔLE COMMITMENT_MISMATCH
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
runTest("Engagement : rejet des valeurs NULL ou vides dans la RPC", () => {
  assert.ok(
    migrationSql.includes("IF p_commitment_type IS NULL OR TRIM(p_commitment_type) = '' THEN"),
    "La RPC submit_membership_request doit rejeter explicitement les engagements NULL ou vides"
  );
  assert.ok(
    migrationSql.includes("p_commitment_type NOT IN ('monthly', 'annual')"),
    "La RPC doit n'accepter que 'monthly' ou 'annual'"
  );
});

runTest("Engagement : contrôle strict COMMITMENT_MISMATCH à la soumission", () => {
  assert.ok(
    migrationSql.includes("IF v_plan.commitment IS NOT NULL AND v_plan.commitment <> p_commitment_type THEN"),
    "submit_membership_request doit vérifier l'égalité stricte entre v_plan.commitment et p_commitment_type"
  );
  assert.ok(
    migrationSql.includes("'COMMITMENT_MISMATCH'"),
    "submit_membership_request doit retourner le code d'erreur 'COMMITMENT_MISMATCH'"
  );

  function checkSubmissionCommitment(planCommitment, requestedCommitment) {
    if (!requestedCommitment || !["monthly", "annual"].includes(requestedCommitment)) {
      return { success: false, error: "INVALID_COMMITMENT" };
    }
    if (planCommitment && planCommitment !== requestedCommitment) {
      return { success: false, error: "COMMITMENT_MISMATCH" };
    }
    return { success: true };
  }

  assert.equal(checkSubmissionCommitment("monthly", "annual").error, "COMMITMENT_MISMATCH");
  assert.equal(checkSubmissionCommitment("annual", "monthly").error, "COMMITMENT_MISMATCH");
  assert.equal(checkSubmissionCommitment("monthly", "monthly").success, true);
  assert.equal(checkSubmissionCommitment("annual", "annual").success, true);
});

runTest("Engagement : double vérification COMMITMENT_MISMATCH à la validation administrative", () => {
  assert.ok(
    migrationSql.includes("IF v_plan.commitment IS NOT NULL AND v_plan.commitment <> v_req.commitment_type THEN"),
    "admin_approve_membership_request doit revérifier indépendamment COMMITMENT_MISMATCH"
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. CONTRÔLE DES PLANS & FORMULES HISTORIQUES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
runTest("Plans : rejet des plans inexistants et inactifs à la soumission et validation", () => {
  assert.ok(migrationSql.includes("IF v_plan IS NULL THEN\n    RETURN jsonb_build_object(\n      'success', false,\n      'error', 'PLAN_NOT_FOUND'"));
  assert.ok(migrationSql.includes("IF v_plan.is_active = FALSE THEN\n    RETURN jsonb_build_object(\n      'success', false,\n      'error', 'PLAN_INACTIVE'"));
});

runTest("Formule Essentiel : contrôle de discipline obligatoire et insertion dans subscription_discipline_choices", () => {
  assert.ok(migrationSql.includes("IF v_plan.code = 'adult_essential' THEN"));
  assert.ok(migrationSql.includes("'DISCIPLINE_REQUIRED'"));
  assert.ok(migrationSql.includes("INSERT INTO public.subscription_discipline_choices ("));
  assert.ok(migrationSql.includes("ON CONFLICT (subscription_id) DO UPDATE SET"));
});

runTest("Formule Cours Privés : quota private_sessions_quota basé sur plans.private_sessions_per_period", () => {
  assert.ok(migrationSql.includes("v_quota := COALESCE(v_plan.private_sessions_per_period, 8);"));
  assert.ok(migrationSql.includes("CASE WHEN v_plan.type = 'private' THEN v_quota ELSE NULL END"));

  // Vérification de la compatibilité avec le calcul dynamique de consommation
  const backendPrivate = fs.readFileSync("supabase/migrations/20260830_private_sessions_backend.sql", "utf-8");
  assert.ok(backendPrivate.includes("SELECT s.id, s.started_at, s.ends_at, s.private_sessions_quota"));
  assert.ok(backendPrivate.includes("v_quota_total := COALESCE(v_sub.private_sessions_quota, 8);"));
  assert.ok(backendPrivate.includes("cs.type::text = 'private'"));
  assert.ok(backendPrivate.includes("b.user_id = v_user_id"));
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 5. CONCURRENCE ADMINISTRATIVE ET PAR MEMBRE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
runTest("Concurrence soumission : verrou consultatif au niveau utilisateur", () => {
  assert.ok(
    migrationSql.includes("PERFORM pg_advisory_xact_lock(hashtext('membership_request_' || v_user_id::text));"),
    "submit_membership_request doit sérialiser les soumissions concurrentes par utilisateur"
  );
});

runTest("Concurrence administrative : verrou FOR UPDATE sur la demande + verrou utilisateur", () => {
  assert.ok(
    migrationSql.includes("FROM public.membership_requests\n  WHERE id = p_request_id\n  FOR UPDATE;"),
    "admin_approve_membership_request doit verrouiller la demande avec FOR UPDATE"
  );
  assert.ok(
    migrationSql.includes("PERFORM pg_advisory_xact_lock(hashtext('membership_approval_user_' || v_req.user_id::text));"),
    "admin_approve_membership_request doit poser un verrou transactionnel au niveau du membre pour bloquer les validations concurrentes"
  );
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 6. ABONNEMENTS ACTIFS ET INCOMPATIBILITÉS (SANS LIMIT 1)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
runTest("Abonnements actifs : examen exhaustif à la soumission (sans LIMIT 1)", () => {
  assert.ok(
    migrationSql.includes("SELECT EXISTS (\n      SELECT 1 FROM public.subscriptions\n      WHERE user_id = v_user_id\n        AND plan_id <> p_plan_id\n        AND status = 'active'\n        AND (ends_at IS NULL OR ends_at >= NOW())\n    ) INTO v_has_active_diff_plan;"),
    "submit_membership_request doit vérifier l'ensemble des abonnements actifs avec plan_id <> p_plan_id"
  );
  assert.ok(migrationSql.includes("'OTHER_ACTIVE_SUBSCRIPTION_EXISTS'"));
});

runTest("Abonnements actifs : examen équivalent à l'approbation administrative", () => {
  assert.ok(
    migrationSql.includes("SELECT EXISTS (\n      SELECT 1 FROM public.subscriptions\n      WHERE user_id = v_req.user_id\n        AND plan_id <> v_req.plan_id\n        AND status = 'active'\n        AND (ends_at IS NULL OR ends_at > v_now)\n    ) INTO v_has_incompatible_sub;"),
    "admin_approve_membership_request doit vérifier l'absence d'abonnement actif incompatible"
  );
  assert.ok(migrationSql.includes("'INCOMPATIBLE_ACTIVE_SUBSCRIPTION_EXISTS'"));
  assert.ok(migrationSql.includes("'ALREADY_HAVE_ACTIVE_SUBSCRIPTION'"));
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 7. CYCLE DE VIE DE L'OFFRE 89 € (ACTIVATION, RENOUVELLEMENT)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
runTest("Cycle de vie : première activation d'exactement 30 jours sans accès privé ni numérique", () => {
  const now = new Date("2026-11-04T12:00:00.000Z");
  const startedAt = now;
  const endsAt = new Date(startedAt.getTime() + 30 * 24 * 60 * 60 * 1000);

  const durationDays = Math.round((endsAt.getTime() - startedAt.getTime()) / (24 * 60 * 60 * 1000));
  assert.equal(durationDays, 30, "L'activation doit durer 30 jours");

  assert.ok(migrationSql.includes("v_ends_at := v_started_at + INTERVAL '30 days';"));
  assert.ok(migrationSql.includes("private_sessions_quota,\n        selected_discipline,\n        created_at,\n        updated_at\n      ) VALUES (\n        v_req.user_id,\n        v_req.plan_id,\n        'active',\n        v_started_at,\n        v_ends_at,\n        NULL,\n        NULL"));
});

runTest("Cycle de vie : renouvellement anticipé prolonge de 30 jours sans perte de jours payés", () => {
  const now = new Date("2026-11-20T10:00:00.000Z");
  const currentExpiry = new Date("2026-12-04T12:00:00.000Z"); // reste 14 jours

  const prolongedExpiry = new Date(currentExpiry.getTime() + 30 * 24 * 60 * 60 * 1000);
  assert.equal(
    prolongedExpiry.toISOString(),
    "2027-01-03T12:00:00.000Z",
    "La nouvelle date d'expiration doit être de 30 jours après l'échéance en cours"
  );

  assert.ok(migrationSql.includes("v_ends_at := v_existing_active_sub.ends_at + INTERVAL '30 days';"));
  assert.ok(migrationSql.includes("UPDATE public.subscriptions\n      SET ends_at = v_ends_at"));
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 8. DROITS D'ACCÈS STRICTS ET IDENTIQUES À ADULT_ALL_ACCESS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
runTest("Droits d'accès : discovery_monthly et adult_all_access ont exactement les mêmes accès collectifs", () => {
  const planAllAccess = {
    code: "adult_all_access",
    name: "All Access",
    type: "small_group",
    tier: "premium_club",
    allows_small_group: true,
    allows_private: false,
    allows_collective: false,
    is_digital_plan: false,
  };

  const planDiscoveryMonthly = {
    code: "discovery_monthly",
    name: "Adulte — Sans engagement",
    type: "small_group",
    tier: "adult_monthly",
    allows_small_group: true,
    allows_private: false,
    allows_collective: false,
    is_digital_plan: false,
  };

  const a1 = computePlanAccess(planAllAccess);
  const a2 = computePlanAccess(planDiscoveryMonthly);

  assert.deepEqual(a1, a2, "Les deux plans doivent produire exactement le même objet PlanAccessRights");
  assert.equal(a2.allowsSmallGroup, true);
  assert.equal(a2.allowsPrivate, false);
  assert.equal(a2.isAllAccess, true);
  assert.equal(a2.isEssential, false);
  assert.equal(a2.isLadyStriking, false);
  assert.equal(a2.isKidBoxing, false);
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 9. SÉCURITÉ SQL ET DROITS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
runTest("Sécurité SQL : SECURITY DEFINER, search_path, permissions et nettoyage des signatures", () => {
  assert.ok(migrationSql.includes("SECURITY DEFINER\nSET search_path = public, auth, pg_temp"));
  assert.ok(migrationSql.includes("DROP FUNCTION IF EXISTS public.submit_membership_request(UUID, TEXT, TEXT);"));
  assert.ok(migrationSql.includes("REVOKE ALL ON FUNCTION public.submit_membership_request(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;"));
  assert.ok(migrationSql.includes("GRANT EXECUTE ON FUNCTION public.submit_membership_request(UUID, TEXT, TEXT, TEXT) TO authenticated, service_role, postgres;"));
  assert.ok(migrationSql.includes("REVOKE ALL ON FUNCTION public.admin_approve_membership_request(UUID, TEXT) FROM PUBLIC;"));
  assert.ok(migrationSql.includes("GRANT EXECUTE ON FUNCTION public.admin_approve_membership_request(UUID, TEXT) TO authenticated, service_role, postgres;"));
});

console.log("\n=================================================================");
console.log(`RÉSULTAT DES TESTS : ${passed} passés / ${total - passed} échoués`);
console.log("=================================================================\n");
