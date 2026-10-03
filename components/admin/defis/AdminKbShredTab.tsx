"use client";

import React, { useState, useEffect } from "react";
import {
  Plus,
  ArrowRight,
} from "lucide-react";
import { WorkoutProgram } from "@/lib/supabase/defis-platform";
import { getAdminProgramsAction } from "@/app/(admin)/admin/defis/actions";

interface AdminKbShredTabProps {
  onNavigateTab: (tabId: string) => void;
}

export default function AdminKbShredTab({ onNavigateTab }: AdminKbShredTabProps) {
  const [kbPrograms, setKbPrograms] = useState<WorkoutProgram[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadKbPrograms() {
      setIsLoading(true);
      const res = await getAdminProgramsAction();
      if (res.success && res.data) {
        setKbPrograms(res.data.filter((p) => p.is_kb_shred));
      }
      setIsLoading(false);
    }
    loadKbPrograms();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 sm:p-8 rounded-2xl bg-black border border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="px-2.5 py-1 rounded bg-white/10 text-[#F8F9ED] border border-white/15 text-[10px] font-bold uppercase tracking-wider">
              Pilier Hybride Striking Camp
            </span>
            <h2 className="text-2xl sm:text-3xl font-heading font-black uppercase text-white tracking-wide">
              KB SHRED — Programmes & Sessions Hybrides
            </h2>
            <p className="text-xs sm:text-sm text-white/70 max-w-2xl">
              Le concept signature combinant circuits Kettlebell à haute intensité métabolique (Digital à domicile/salle) et créneaux Small Group encadrés au club.
            </p>
          </div>

          <button
            onClick={() => onNavigateTab("programs")}
            className="px-5 py-2.5 rounded-xl bg-[#5E4075] hover:bg-[#6f4d8b] text-white font-heading font-black text-xs uppercase tracking-wider flex items-center gap-2 self-start sm:self-auto cursor-pointer transition-colors shadow-lg"
          >
            <Plus size={16} />
            <span>Nouveau Protocole KB SHRED</span>
          </button>
        </div>
      </div>

      {/* Cartes des Protocoles KB SHRED */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {isLoading ? (
          <div className="col-span-full p-8 text-center text-white/40">
            Chargement des protocoles KB SHRED...
          </div>
        ) : kbPrograms.length === 0 ? (
          <div className="col-span-full p-8 text-center text-white/40 bg-black rounded-2xl border border-white/10">
            Aucun protocole KB SHRED actif. Créez-en un dans la section Programmes.
          </div>
        ) : (
          kbPrograms.map((prog) => (
            <div
              key={prog.id}
              className="p-6 rounded-2xl bg-black border border-white/10 space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-white/10 text-[#F8F9ED] border border-white/20">
                    {prog.level}
                  </span>
                  <span className="text-xs text-white/50">{prog.sessions?.length || 0} séances au cycle</span>
                </div>

                <h3 className="text-base font-heading font-bold text-white uppercase">{prog.title}</h3>
                <p className="text-xs text-white/60 line-clamp-2">{prog.description}</p>
              </div>

              {/* Sessions preview */}
              <div className="space-y-2 pt-3 border-t border-white/10">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">
                  Découpage du cycle :
                </span>
                <div className="space-y-1">
                  {(prog.sessions || []).slice(0, 3).map((s) => (
                    <div
                      key={s.id}
                      className="p-2 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs"
                    >
                      <span className="font-semibold text-white">
                        J{s.day_number} : {s.title}
                      </span>
                      {s.is_club_session ? (
                        <span className="px-1.5 py-0.5 rounded bg-white/10 text-[#F8F9ED] text-[9px] font-bold uppercase">
                          Club Physique
                        </span>
                      ) : (
                        <span className="text-white/40 text-[10px]">{s.duration_minutes} min</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => onNavigateTab("programs")}
                className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Éditer dans l'onglet Programmes</span>
                <ArrowRight size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
