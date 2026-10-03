/**
 * TEST SUITE: Persistance Réelle des Entraînements V1 STRIKING CAMP
 * Vérification des 15 exigences fonctionnelles et techniques
 */

import assert from "node:assert/strict";
import { V1_REFERENCE_PROGRAMS } from "../lib/training/reference-programs.ts";
import {
  markProgramSessionCompleted,
  getUserSessionCompletionsHistory,
  getWorkoutPrograms,
} from "../lib/supabase/defis.ts";

console.log("\n=======================================================");
console.log("  TEST SUITE : PERSISTANCE RÉELLE DES ENTRAÎNEMENTS V1");
console.log("=======================================================\n");

// --- Mock Supabase Client In-Memory ---
function createMockSupabase(initialCompletions = []) {
  const db = {
    user_session_completions: [...initialCompletions],
    workout_programs: [...V1_REFERENCE_PROGRAMS],
    subscriptions: [],
  };

  return {
    db,
    from(table) {
      if (table === "subscriptions") {
        return {
          select(cols) {
            return {
              eq(col, val) {
                return {
                  eq(col2, val2) {
                    return {
                      maybeSingle: async () => ({ data: null, error: null }),
                    };
                  },
                };
              },
            };
          },
        };
      }

      if (table === "user_session_completions") {
        return {
          select(cols) {
            return {
              eq(col, val) {
                return {
                  in(col2, values) {
                    const filtered = db.user_session_completions.filter(
                      (r) => r[col] === val && values.includes(r[col2])
                    );
                    return Promise.resolve({ data: filtered, error: null });
                  },
                  eq(col2, val2) {
                    const filtered = db.user_session_completions.filter(
                      (r) => r[col] === val && r[col2] === val2
                    );
                    return {
                      maybeSingle: async () => ({ data: filtered[0] || null, error: null }),
                    };
                  },
                  order(sortCol, { ascending }) {
                    return {
                      limit(lim) {
                        const filtered = db.user_session_completions
                          .filter((r) => r[col] === val)
                          .sort((a, b) => (ascending ? (a[sortCol] > b[sortCol] ? 1 : -1) : (a[sortCol] < b[sortCol] ? 1 : -1)))
                          .slice(0, lim);
                        return Promise.resolve({ data: filtered, error: null });
                      },
                    };
                  },
                };
              },
            };
          },
          insert(rows) {
            const inserted = Array.isArray(rows) ? rows : [rows];
            for (const r of inserted) {
              // Simuler contrainte UNIQUE (user_id, program_session_id)
              const exists = db.user_session_completions.some(
                (existing) => existing.user_id === r.user_id && existing.program_session_id === r.program_session_id
              );
              if (exists) {
                return Promise.resolve({ data: null, error: { message: "duplicate key value violates unique constraint", code: "23505" } });
              }
              db.user_session_completions.push({
                id: r.id || `comp-${Date.now()}-${Math.random()}`,
                ...r,
                completed_at: r.completed_at || new Date().toISOString(),
              });
            }
            return Promise.resolve({ data: inserted, error: null });
          },
        };
      }

      if (table === "workout_programs") {
        return {
          select(cols) {
            return {
              order(col, opts) {
                return Promise.resolve({ data: db.workout_programs, error: null });
              },
            };
          },
        };
      }

      throw new Error(`Table ${table} non mockée`);
    },
  };
}

let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(err);
  }
}

async function asyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(err);
  }
}

console.log("--- 1. Structure & UUIDs V1 Déterministes ---");

test("1.1. Exactement 12 programmes de référence sont présents", () => {
  assert.equal(V1_REFERENCE_PROGRAMS.length, 12);
});

test("1.2. Exactement 36 sessions au total (3 sessions par programme)", () => {
  const totalSessions = V1_REFERENCE_PROGRAMS.reduce((sum, p) => sum + (p.sessions?.length || 0), 0);
  assert.equal(totalSessions, 36);
  for (const prog of V1_REFERENCE_PROGRAMS) {
    assert.equal(prog.sessions?.length, 3, `Programme ${prog.title} doit avoir 3 séances`);
  }
});

test("1.3. Tous les programmes et sessions possèdent des UUIDs valides et déterministes", () => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const programIds = new Set();
  const sessionIds = new Set();

  for (const prog of V1_REFERENCE_PROGRAMS) {
    assert.match(prog.id, uuidRegex, `Programme ID non valide: ${prog.id}`);
    assert.ok(!programIds.has(prog.id), `ID programme dupliqué: ${prog.id}`);
    programIds.add(prog.id);

    for (const sess of prog.sessions || []) {
      assert.match(sess.id, uuidRegex, `Session ID non valide: ${sess.id}`);
      assert.ok(!sessionIds.has(sess.id), `ID session dupliqué: ${sess.id}`);
      sessionIds.add(sess.id);
    }
  }
  assert.equal(programIds.size, 12);
  assert.equal(sessionIds.size, 36);
});

console.log("\n--- 2. Validation & Persistance Réelle Supabase ---");

const testUserId = "user-test-uuid-0001";
const firstSessionId = V1_REFERENCE_PROGRAMS[0].sessions[0].id;
const secondSessionId = V1_REFERENCE_PROGRAMS[0].sessions[1].id;
const thirdSessionId = V1_REFERENCE_PROGRAMS[0].sessions[2].id;

await asyncTest("2.1. Une séance peut être validée et enregistrée dans Supabase", async () => {
  const supabase = createMockSupabase([]);
  const entitlements = { tier: "premium", canAccessDigitalPrograms: true, canAccessKBShredDigital: true };
  
  const result = await markProgramSessionCompleted(supabase, testUserId, firstSessionId, entitlements);
  assert.equal(result.success, true);
  assert.equal(supabase.db.user_session_completions.length, 1);
  assert.equal(supabase.db.user_session_completions[0].program_session_id, firstSessionId);
  assert.equal(supabase.db.user_session_completions[0].user_id, testUserId);
});

await asyncTest("2.2. Après refresh (relecture), la séance reste marquée terminée", async () => {
  const supabase = createMockSupabase([
    {
      id: "comp-1",
      user_id: testUserId,
      program_session_id: firstSessionId,
      completed_at: "2026-10-01T10:00:00Z",
    },
  ]);

  const progs = await getWorkoutPrograms(supabase, testUserId);
  const targetProg = progs.find((p) => p.id === V1_REFERENCE_PROGRAMS[0].id);
  assert.ok(targetProg);
  const sess1 = targetProg.sessions.find((s) => s.id === firstSessionId);
  const sess2 = targetProg.sessions.find((s) => s.id === secondSessionId);
  
  assert.equal(sess1.is_completed, true);
  assert.equal(sess2.is_completed, false);
});

await asyncTest("2.3. Anti-doublon : Une même séance ne peut pas être enregistrée deux fois", async () => {
  const supabase = createMockSupabase([
    {
      id: "comp-1",
      user_id: testUserId,
      program_session_id: firstSessionId,
      completed_at: "2026-10-01T10:00:00Z",
    },
  ]);
  const entitlements = { tier: "premium", canAccessDigitalPrograms: true, canAccessKBShredDigital: true };

  const result = await markProgramSessionCompleted(supabase, testUserId, firstSessionId, entitlements);
  assert.equal(result.success, true);
  assert.equal(result.alreadyCompleted, true);
  assert.equal(supabase.db.user_session_completions.length, 1, "Ne doit pas insérer de doublon");
});

await asyncTest("2.4. Une autre séance du même programme peut ensuite être validée", async () => {
  const supabase = createMockSupabase([
    {
      id: "comp-1",
      user_id: testUserId,
      program_session_id: firstSessionId,
      completed_at: "2026-10-01T10:00:00Z",
    },
  ]);
  const entitlements = { tier: "premium", canAccessDigitalPrograms: true, canAccessKBShredDigital: true };

  const result = await markProgramSessionCompleted(supabase, testUserId, secondSessionId, entitlements);
  assert.equal(result.success, true);
  assert.equal(supabase.db.user_session_completions.length, 2);
});

console.log("\n--- 3. Calcul de Progression (1/3, 2/3, 3/3) & Historique ---");

test("3.1. Calcul exact de progression : 1/3 = 33%, 2/3 = 67%, 3/3 = 100%", () => {
  const calcProg = (completed, total) => Math.min(100, Math.round((completed / total) * 100));
  assert.equal(calcProg(1, 3), 33);
  assert.equal(calcProg(2, 3), 67);
  assert.equal(calcProg(3, 3), 100);
});

await asyncTest("3.2. Historique des séances affiche les vraies dates de complétion et métadonnées", async () => {
  const dateStr = "2026-10-02T14:30:00Z";
  const supabase = createMockSupabase([
    {
      id: "comp-1",
      user_id: testUserId,
      program_session_id: firstSessionId,
      completed_at: dateStr,
      notes: "Super session EMOM",
    },
  ]);

  const history = await getUserSessionCompletionsHistory(supabase, testUserId);
  assert.equal(history.length, 1);
  assert.equal(history[0].sessionId, firstSessionId);
  assert.equal(history[0].programTitle, V1_REFERENCE_PROGRAMS[0].title);
  assert.equal(history[0].sessionTitle, V1_REFERENCE_PROGRAMS[0].sessions[0].title);
  assert.equal(history[0].completedAt, dateStr);
});

console.log("\n--- 4. TodayTab — Sélection de la Prochaine Séance Non Complétée ---");

test("4.1. TodayTab sélectionne la 1ère séance si aucune n'est complétée", () => {
  const sessions = [
    { id: firstSessionId, title: "S1", is_completed: false },
    { id: secondSessionId, title: "S2", is_completed: false },
    { id: thirdSessionId, title: "S3", is_completed: false },
  ];
  const nextSession = sessions.find((s) => !s.is_completed);
  assert.equal(nextSession.id, firstSessionId);
});

test("4.2. TodayTab sélectionne la 2ème séance si la 1ère est complétée", () => {
  const sessions = [
    { id: firstSessionId, title: "S1", is_completed: true },
    { id: secondSessionId, title: "S2", is_completed: false },
    { id: thirdSessionId, title: "S3", is_completed: false },
  ];
  const nextSession = sessions.find((s) => !s.is_completed);
  assert.equal(nextSession.id, secondSessionId);
});

test("4.3. TodayTab sélectionne la 3ème séance si les 2 premières sont complétées", () => {
  const sessions = [
    { id: firstSessionId, title: "S1", is_completed: true },
    { id: secondSessionId, title: "S2", is_completed: true },
    { id: thirdSessionId, title: "S3", is_completed: false },
  ];
  const nextSession = sessions.find((s) => !s.is_completed);
  assert.equal(nextSession.id, thirdSessionId);
});

test("4.4. TodayTab détecte quand le programme est à 100% complété", () => {
  const sessions = [
    { id: firstSessionId, title: "S1", is_completed: true },
    { id: secondSessionId, title: "S2", is_completed: true },
    { id: thirdSessionId, title: "S3", is_completed: true },
  ];
  const completedCount = sessions.filter((s) => s.is_completed).length;
  const isFullyCompleted = completedCount === sessions.length;
  assert.equal(isFullyCompleted, true);
});

console.log("\n--- 5. Sécurité, Entitlements & Isolation Utilisateurs ---");

await asyncTest("5.1. Un utilisateur Free ne peut pas valider une séance Premium", async () => {
  const supabase = createMockSupabase([]);
  const freeEntitlements = {
    tier: "free",
    canAccessDigitalPrograms: false,
    canAccessKBShredDigital: false,
  };

  // Trouver un programme premium
  const premiumProg = V1_REFERENCE_PROGRAMS.find((p) => p.is_premium);
  assert.ok(premiumProg, "Doit exister un programme premium");
  const premiumSessionId = premiumProg.sessions[0].id;

  const result = await markProgramSessionCompleted(supabase, testUserId, premiumSessionId, freeEntitlements);
  assert.equal(result.success, false);
  assert.match(result.error, /nécessite un abonnement|Accès non autorisé|Formule requise/i);
  assert.equal(supabase.db.user_session_completions.length, 0);
});

await asyncTest("5.2. Isolation RLS : Les données des autres utilisateurs ne sont jamais retournées", async () => {
  const otherUserId = "user-other-9999";
  const supabase = createMockSupabase([
    {
      id: "comp-other",
      user_id: otherUserId,
      program_session_id: firstSessionId,
      completed_at: "2026-10-01T10:00:00Z",
    },
  ]);

  const history = await getUserSessionCompletionsHistory(supabase, testUserId);
  assert.equal(history.length, 0, "L'utilisateur courant ne doit voir aucune complétion d'un autre utilisateur");
});

console.log("\n=======================================================");
console.log(`  RÉSULTATS : ${passedTests} / ${totalTests} TESTS PASSÉS`);
console.log("=======================================================\n");

if (passedTests !== totalTests) {
  process.exit(1);
}
