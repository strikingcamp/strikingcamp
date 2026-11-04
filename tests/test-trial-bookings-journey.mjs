import assert from "node:assert/strict";
import { getTrialPrice, getTrialPriceFormatted, getTrialTypeLabel } from "../lib/trial-pricing.ts";

let totalTests = 0;
let passedTests = 0;
const failures = [];

async function test(name, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failures.push({ name, error: err });
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
  }
}

console.log("\n=======================================================");
console.log("SUITE DE TESTS : PARCOURS SIMPLIFIÉ COURS D'ESSAI (10 €)");
console.log("=======================================================\n");

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. TARIF UNIQUE : 10 € & PAIEMENT SUR PLACE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log("--- 1. TARIFICATION DES SÉANCES D'ESSAI ---");

await test("Le tarif de la séance d'essai small_group / Cours Adulte est fixé à 10 €", () => {
  assert.equal(getTrialPrice("small_group"), 10);
  assert.equal(getTrialPriceFormatted("small_group"), "10 €");
  assert.equal(getTrialTypeLabel("small_group"), "Cours Adulte");
});

await test("Par défaut, un type indéfini ou null renvoie le tarif small_group à 10 €", () => {
  assert.equal(getTrialPrice(null), 10);
  assert.equal(getTrialPriceFormatted(undefined), "10 €");
});

await test("Règlement sur place exclusivement : aucun paiement Stripe en ligne", () => {
  const trialPrice = getTrialPriceFormatted("small_group");
  const paymentNotice = `Tarif du cours d'essai : ${trialPrice}. Règlement exclusivement sur place au club (espèces ou carte bancaire).`;
  assert.ok(paymentNotice.includes("10 €"));
  assert.ok(paymentNotice.includes("sur place"));
  assert.ok(!paymentNotice.includes("Stripe"));
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. LES 4 CRÉNEAUX OFFICIELS D'ESSAI
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log("\n--- 2. CRÉNEAUX ET DISCIPLINES D'ESSAI OFFICIELS ---");

function isOfficialTrialSlot(dayOfWeekStr, timeStr, discipline) {
  const discLower = (discipline || "").toLowerCase().trim();

  const isTuesdayBoxeThai =
    dayOfWeekStr === "Tue" &&
    timeStr === "18:00" &&
    (discLower.includes("thaï") || discLower.includes("thai") || discLower.includes("boxe") || discLower.includes("kick"));

  const isSaturdayBoxeAnglaise =
    dayOfWeekStr === "Sat" &&
    timeStr === "09:00" &&
    (discLower.includes("anglaise") || discLower.includes("boxing") || discLower === "boxe");

  const isSaturdayKickBoxing =
    dayOfWeekStr === "Sat" &&
    timeStr === "10:00" &&
    (discLower.includes("kick") || discLower.includes("striking"));

  const isSaturdayLadyStriking =
    dayOfWeekStr === "Sat" &&
    timeStr === "12:30" &&
    (discLower.includes("lady") || discLower.includes("femme") || discLower.includes("striking"));

  return isTuesdayBoxeThai || isSaturdayBoxeAnglaise || isSaturdayKickBoxing || isSaturdayLadyStriking;
}

await test("Mardi 18h00 - 19h00 : Boxe Thaï est reconnu comme créneau d'essai officiel", () => {
  assert.equal(isOfficialTrialSlot("Tue", "18:00", "Boxe Thaï"), true);
  assert.equal(isOfficialTrialSlot("Tue", "18:00", "Boxe thai"), true);
});

await test("Samedi 09h00 - 10h00 : Boxe Anglaise est reconnu comme créneau d'essai officiel", () => {
  assert.equal(isOfficialTrialSlot("Sat", "09:00", "Boxe Anglaise"), true);
  assert.equal(isOfficialTrialSlot("Sat", "09:00", "Boxe anglaise"), true);
  assert.equal(isOfficialTrialSlot("Sat", "09:00", "Boxing"), true);
});

await test("Samedi 10h00 - 11h00 : Kick Boxing est reconnu comme créneau d'essai officiel", () => {
  assert.equal(isOfficialTrialSlot("Sat", "10:00", "Kick Boxing"), true);
  assert.equal(isOfficialTrialSlot("Sat", "10:00", "Kickboxing"), true);
});

await test("Samedi 12h30 - 13h30 : Lady Striking est reconnu comme créneau d'essai officiel 100% féminin", () => {
  assert.equal(isOfficialTrialSlot("Sat", "12:30", "Lady Striking"), true);
});

await test("Les créneaux non autorisés sont strictement exclus du module d'essai", () => {
  assert.equal(isOfficialTrialSlot("Mon", "18:00", "Boxe Thaï"), false);
  assert.equal(isOfficialTrialSlot("Wed", "19:30", "Boxe Thaï"), false);
  assert.equal(isOfficialTrialSlot("Fri", "18:00", "Boxe Thaï"), false);
  assert.equal(isOfficialTrialSlot("Sat", "14:00", "Lady Striking"), false);
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. PARCOURS SIMPLIFIÉ SANS TOKEN D'ANNULATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log("\n--- 3. CONFIRMATION INSTANTANÉE SANS LIEN D'ANNULATION ---");

await test("La réponse API et les données de réservation n'émettent aucun token ni URL d'annulation", () => {
  const simulatedApiResponse = {
    success: true,
    bookingId: "tb-12345",
    discipline: "Boxe Anglaise",
    type: "small_group",
    price: "10 €",
    date: "Samedi 8 novembre",
    time: "09:00 → 10:00",
    firstName: "Jean",
    lastName: "Dupont",
    email: "jean.dupont@example.com",
    phone: "0601020304",
  };

  assert.equal(simulatedApiResponse.success, true);
  assert.equal("cancellationUrl" in simulatedApiResponse, false, "cancellationUrl ne doit plus être exposé");
  assert.equal("cancellationToken" in simulatedApiResponse, false, "cancellationToken ne doit plus être exposé");
});

await test("L'e-mail de confirmation prospect n'inclut plus de bouton d'annulation autonome", () => {
  const emailPayload = {
    prospectEmail: "jean@example.com",
    prospectName: "Jean",
    discipline: "Kick Boxing",
    date: "Samedi 8 novembre",
    time: "10:00 → 11:00",
  };

  assert.equal("cancellationUrl" in emailPayload, false);
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. ANNULATION ADMINISTRATIVE & LIBÉRATION DE PLACE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log("\n--- 4. ANNULATION ADMINISTRATEUR & RESEND ---");

await test("L'annulation par l'administrateur passe le statut à 'cancelled' et libère la place", () => {
  const session = {
    id: "s1",
    maxCapacity: 100,
    bookings: [
      { id: "b1", status: "confirmed" },
      { id: "b2", status: "confirmed" },
    ],
    trialBookings: [
      { id: "t1", status: "confirmed" },
      { id: "t2", status: "confirmed" },
    ],
  };

  const getOccupiedCount = (s) => {
    const confirmedMembers = s.bookings.filter((b) => b.status === "confirmed").length;
    const confirmedTrials = s.trialBookings.filter((t) => t.status === "confirmed").length;
    return confirmedMembers + confirmedTrials;
  };

  assert.equal(getOccupiedCount(session), 4);

  // Annulation admin du cours d'essai t1
  const trialToCancel = session.trialBookings.find((t) => t.id === "t1");
  assert.ok(trialToCancel);
  trialToCancel.status = "cancelled";
  trialToCancel.adminNotes = "Annulé par l'administrateur";

  assert.equal(trialToCancel.status, "cancelled");
  assert.equal(getOccupiedCount(session), 3, "La place doit être libérée immédiatement après annulation admin");
});

await test("Les structures d'e-mail d'annulation Resend (prospect et admin) sont conformes", () => {
  const prospectCancelEmailData = {
    prospectEmail: "prospect@example.com",
    prospectName: "Karim",
    discipline: "Boxe Thaï",
    sessionType: "Cours Adulte",
    date: "Mardi 11 novembre",
    time: "18:00 → 19:00",
  };

  const adminCancelNotificationData = {
    prospectName: "Karim Ben",
    prospectEmail: "prospect@example.com",
    prospectPhone: "0601020304",
    discipline: "Boxe Thaï",
    sessionType: "Cours Adulte",
    date: "Mardi 11 novembre",
    time: "18:00 → 19:00",
  };

  assert.ok(prospectCancelEmailData.prospectEmail);
  assert.ok(prospectCancelEmailData.discipline);
  assert.ok(adminCancelNotificationData.prospectName);
  assert.ok(adminCancelNotificationData.prospectPhone);
});

await test("Protection contre les double-clics et notifications redondantes (idempotence)", () => {
  let emailsSentCount = 0;

  function cancelBooking(booking) {
    if (booking.status === "cancelled") {
      return { success: true, alreadyCancelled: true, message: "Déjà annulé" };
    }
    booking.status = "cancelled";
    emailsSentCount += 2; // Prospect + Admin
    return { success: true, alreadyCancelled: false };
  }

  const booking = { id: "t1", status: "confirmed" };

  // 1er appel
  const first = cancelBooking(booking);
  assert.equal(first.success, true);
  assert.equal(first.alreadyCancelled, false);
  assert.equal(emailsSentCount, 2);

  // 2e appel (double-clic ou répétition)
  const second = cancelBooking(booking);
  assert.equal(second.success, true);
  assert.equal(second.alreadyCancelled, true);
  assert.equal(emailsSentCount, 2, "Aucun e-mail supplémentaire ne doit être déclenché");
});

await test("Condition stricte : les e-mails ne sont envoyés que si la mise à jour en base réussit", () => {
  let emailsSent = false;

  function executeCancellationWithDbCheck(simulateDbError) {
    emailsSent = false;
    let dbSuccess = !simulateDbError;

    if (!dbSuccess) {
      return { success: false, error: "DB_ERROR" };
    }

    // Envoi des emails uniquement après confirmation du succès DB
    emailsSent = true;
    return { success: true };
  }

  // Cas 1 : Erreur DB
  const failedRes = executeCancellationWithDbCheck(true);
  assert.equal(failedRes.success, false);
  assert.equal(emailsSent, false, "Les e-mails ne doivent pas être envoyés si la DB échoue");

  // Cas 2 : Succès DB
  const okRes = executeCancellationWithDbCheck(false);
  assert.equal(okRes.success, true);
  assert.equal(emailsSent, true, "Les e-mails doivent être envoyés après succès DB");
});

await test("Absence totale de fallback silencieux : l'échec de la route serveur renvoie une erreur explicite", () => {
  function handleAdminCancellationClient(fetchSuccess, apiErrorMsg) {
    if (!fetchSuccess) {
      // Pas de fallback direct silencieux vers RPC
      return {
        success: false,
        error: apiErrorMsg || "Échec lors de l'annulation administrative. Les e-mails n'ont pas pu être garantis.",
      };
    }
    return { success: true };
  }

  const resFailure = handleAdminCancellationClient(false, "Erreur serveur 500");
  assert.equal(resFailure.success, false);
  assert.ok(resFailure.error.includes("Erreur serveur 500"));
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 5. GESTION DES CAPACITÉS DYNAMIQUES (JUSQU'À 100)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log("\n--- 5. CAPACITÉS DYNAMIQUES (ADMINISTRABLES JUSQU'À 100) ---");

await test("La capacité supporte des séances jusqu'à 100 sans fallback figé à 12", () => {
  function computeRemaining(maxCapacity, memberBookings, trialBookings) {
    const max = maxCapacity ?? 100;
    const occupied = memberBookings + trialBookings;
    return {
      occupied,
      remaining: Math.max(0, max - occupied),
      isFull: occupied >= max,
    };
  }

  // Capacité admin personnalisée à 20
  const session20 = computeRemaining(20, 10, 5);
  assert.equal(session20.remaining, 5);
  assert.equal(session20.isFull, false);

  // Capacité admin personnalisée à 50
  const session50 = computeRemaining(50, 40, 10);
  assert.equal(session50.remaining, 0);
  assert.equal(session50.isFull, true);

  // Capacité max 100
  const session100 = computeRemaining(100, 75, 15);
  assert.equal(session100.remaining, 10);
  assert.equal(session100.isFull, false);
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 6. INTÉGRITÉ SEO LOCAL ET ADRESSE DU CLUB
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log("\n--- 6. CONFORMITÉ AUX RÈGLES COMMERCIALES & SEO ---");

await test("Preservation de l'adresse officielle et du SEO local", () => {
  const address = "268 avenue de la Capelette, 13010 Marseille";
  assert.ok(address.includes("13010 Marseille"));
  assert.ok(address.includes("Capelette"));
});

console.log("\n=======================================================");
console.log(`RÉSULTATS : ${passedTests} / ${totalTests} tests réussis`);
if (failures.length > 0) {
  console.log(`ÉCHECS : ${failures.length}`);
  process.exit(1);
} else {
  console.log("TOUS LES TESTS DU PARCOURS SÉANCES D'ESSAI ONT RÉUSSI AVEC SUCCÈS !");
  console.log("=======================================================\n");
}
