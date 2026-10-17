"use client";

import React from "react";
import type {
  AdminClassSessionSummary,
  AdminBookingParticipant,
} from "@/lib/supabase/admin";
import { formatToParisTime } from "@/lib/supabase/admin";

interface AdminPrintAttendanceSheetProps {
  dayLabel: string;
  sessions: AdminClassSessionSummary[];
  bookingsBySession: Record<string, AdminBookingParticipant[]>;
  singleSessionId?: string | null;
}

export default function AdminPrintAttendanceSheet({
  dayLabel,
  sessions,
  bookingsBySession,
  singleSessionId,
}: AdminPrintAttendanceSheetProps) {
  // Si une session spécifique est ciblée pour l'impression, n'imprimer que celle-ci
  const sessionsToPrint = singleSessionId
    ? sessions.filter((s) => s.id === singleSessionId)
    : sessions;

  return (
    <div className="hidden print:block print:w-full print:bg-white print:text-black print:p-6 text-black bg-white">
      {/* Configuration d'impression spécifique A4 & contraste exact */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                size: A4 portrait;
                margin: 12mm 10mm;
              }
              body {
                background: white !important;
                color: black !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
          `,
        }}
      />

      {/* En-tête officiel du club */}
      <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-wider text-black">
            STRIKING CAMP MARSEILLE
          </h1>
          <p className="text-xs uppercase font-semibold text-gray-700">
            Centre d&apos;entraînement de Boxe & Sports de Combat
          </p>
          <p className="text-[11px] text-gray-600">
            268 avenue de la Capelette, 13010 Marseille • Tél : 06 60 30 99 99
          </p>
        </div>
        <div className="text-right">
          <div className="inline-block border-2 border-black px-3 py-1 font-bold text-sm uppercase">
            FEUILLE D&apos;ÉMARGEMENT
          </div>
          <p className="text-xs font-bold mt-1 uppercase text-gray-800">
            {dayLabel}
          </p>
        </div>
      </div>

      {sessionsToPrint.length === 0 ? (
        <div className="text-center py-8 text-sm italic text-gray-500">
          Aucune séance programmée pour cette sélection.
        </div>
      ) : (
        sessionsToPrint.map((session, sIdx) => {
          const allParticipants = bookingsBySession[session.id] || [];
          const confirmedParticipants = allParticipants.filter(
            (p) => p.status === "confirmed"
          );
          const capacity =
            session.max_capacity || (session.type === "private" ? 1 : 12);
          const startTime = formatToParisTime(session.starts_at);
          const endTime = session.ends_at
            ? formatToParisTime(session.ends_at)
            : "";

          return (
            <div
              key={session.id}
              className={`mb-8 ${
                sIdx > 0 && sIdx % 2 === 0 ? "break-before-page" : ""
              }`}
            >
              {/* En-tête de la séance */}
              <div className="bg-gray-100 border border-black p-3 mb-2 flex justify-between items-center">
                <div>
                  <span className="text-base font-black uppercase text-black mr-3">
                    {session.discipline}
                  </span>
                  <span className="text-xs font-bold bg-white border border-black px-2 py-0.5 rounded uppercase mr-2">
                    {session.type === "private" ? "Cours Privé" : "Cours Adulte"}
                  </span>
                  {session.level && (
                    <span className="text-xs text-gray-700 font-medium">
                      ({session.level})
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-sm font-black mr-4">
                    🕒 {startTime} {endTime ? `→ ${endTime}` : ""}
                  </span>
                  <span className="text-xs font-bold bg-black text-white px-2 py-1 rounded">
                    {confirmedParticipants.length} / {capacity} Inscrits
                  </span>
                </div>
              </div>

              {/* Tableau d'émargement */}
              <table className="w-full text-left text-xs border-collapse border border-black mb-3">
                <thead>
                  <tr className="bg-gray-200 border-b border-black text-[11px] font-bold uppercase">
                    <th className="py-2 px-2 border-r border-black w-8 text-center">
                      N°
                    </th>
                    <th className="py-2 px-3 border-r border-black">
                      Nom & Prénom
                    </th>
                    <th className="py-2 px-2 border-r border-black w-36">
                      Statut / Formule
                    </th>
                    <th className="py-2 px-2 border-r border-black w-28">
                      Téléphone
                    </th>
                    <th className="py-2 px-2 border-r border-black w-16 text-center">
                      Présent
                    </th>
                    <th className="py-2 px-2 border-r border-black w-16 text-center">
                      Absent
                    </th>
                    <th className="py-2 px-3">Émargement / Visa</th>
                  </tr>
                </thead>
                <tbody>
                  {confirmedParticipants.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-3 px-3 text-center text-gray-500 italic border-b border-black"
                      >
                        Aucun inscrit enregistré sur ce créneau.
                      </td>
                    </tr>
                  ) : (
                    confirmedParticipants.map((p, idx) => (
                      <tr
                        key={p.bookingId}
                        className="border-b border-gray-400 hover:bg-gray-50"
                      >
                        <td className="py-2 px-2 border-r border-black text-center font-bold">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3 border-r border-black font-semibold text-black">
                          {p.memberName}
                        </td>
                        <td className="py-2 px-2 border-r border-black text-[10px] font-bold">
                          {p.isTrial ? (
                            <span className="bg-gray-200 px-1.5 py-0.5 rounded border border-gray-600 font-black">
                              COURS D&apos;ESSAI
                            </span>
                          ) : (
                            <span>{p.planName}</span>
                          )}
                        </td>
                        <td className="py-2 px-2 border-r border-black text-[11px]">
                          {p.phone || "—"}
                        </td>
                        <td className="py-2 px-2 border-r border-black text-center">
                          <div className="w-5 h-5 border border-black mx-auto flex items-center justify-center font-bold text-xs">
                            {p.attendanceStatus === "present" ? "✓" : ""}
                          </div>
                        </td>
                        <td className="py-2 px-2 border-r border-black text-center">
                          <div className="w-5 h-5 border border-black mx-auto flex items-center justify-center font-bold text-xs">
                            {p.attendanceStatus === "absent" ? "✕" : ""}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-gray-400 text-[10px]">
                          {p.attendedAt ? `Validé à ${p.attendedAt}` : ""}
                        </td>
                      </tr>
                    ))
                  )}

                  {/* Lignes vierges pour inscriptions manuelles sur place */}
                  {[1, 2, 3].map((extraIdx) => (
                    <tr
                      key={`extra-${extraIdx}`}
                      className="border-b border-gray-300 text-gray-400"
                    >
                      <td className="py-2 px-2 border-r border-black text-center text-[10px]">
                        +
                      </td>
                      <td className="py-2 px-3 border-r border-black">
                        &nbsp;
                      </td>
                      <td className="py-2 px-2 border-r border-black">
                        &nbsp;
                      </td>
                      <td className="py-2 px-2 border-r border-black">
                        &nbsp;
                      </td>
                      <td className="py-2 px-2 border-r border-black text-center">
                        <div className="w-5 h-5 border border-gray-400 mx-auto" />
                      </td>
                      <td className="py-2 px-2 border-r border-black text-center">
                        <div className="w-5 h-5 border border-gray-400 mx-auto" />
                      </td>
                      <td className="py-2 px-3">&nbsp;</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Signature coach */}
              <div className="flex justify-between items-center text-[11px] text-gray-700 pt-1 border-t border-gray-300 mb-6">
                <div>
                  Total confirmés :{" "}
                  <strong>{confirmedParticipants.length}</strong> • Places
                  restantes :{" "}
                  <strong>
                    {Math.max(0, capacity - confirmedParticipants.length)}
                  </strong>
                </div>
                <div className="flex items-center gap-4">
                  <span>Visa / Signature Coach :</span>
                  <div className="w-32 border-b border-black h-4" />
                </div>
              </div>
            </div>
          );
        })
      )}

      {/* Horodatage d'impression */}
      <div className="text-[10px] text-gray-500 text-right mt-4 border-t border-gray-300 pt-2">
        Document imprimé depuis l&apos;espace Administration Striking Camp le{" "}
        {new Date().toLocaleDateString("fr-FR")} à{" "}
        {new Date().toLocaleTimeString("fr-FR")}
      </div>
    </div>
  );
}
