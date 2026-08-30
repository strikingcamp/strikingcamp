import type { Metadata } from "next";
import { Trophy, Flame, Target, Award, Zap, Lock, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Défis — Espace Membre Striking Camp",
  robots: { index: false, follow: false },
};

export default function MembreDefisPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8 pt-2 pb-16">
      {/* En-tête */}
      <div className="space-y-1">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#00d8ff]/10 border border-[#00d8ff]/30 rounded-full text-[#00d8ff] text-xs font-semibold uppercase tracking-wider mb-2">
          <Sparkles size={13} />
          <span>Gamification & Performance</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-heading font-black uppercase tracking-wider text-brand-white">
          Arène des Défis
        </h1>
        <p className="text-xs sm:text-sm text-brand-white/50">
          Accomplissez des défis, débloquez des ceintures virtuelles et mesurez votre progression.
        </p>
      </div>

      {/* Bannière Teaser Principale */}
      <div className="bg-gradient-to-br from-[#0c182c] via-[#0f172a] to-[#131f37] border border-[#00d8ff]/30 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden space-y-6">
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-[#00d8ff]/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2 max-w-xl">
            <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded bg-[#00d8ff]/20 text-[#00d8ff] border border-[#00d8ff]/30">
              Fonctionnalité en cours de déploiement
            </span>
            <h2 className="text-2xl sm:text-3xl font-heading font-black uppercase tracking-wide text-brand-white">
              Défis prochainement disponibles
            </h2>
            <p className="text-xs sm:text-sm text-brand-white/70 leading-relaxed">
              Le système de défis Striking Camp arrive bientôt dans votre espace membre. Vous pourrez participer à des challenges d’assiduité, battre vos records de rounds et remporter des récompenses exclusives au club.
            </p>
          </div>

          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#00d8ff]/15 border border-[#00d8ff]/30 text-[#00d8ff] flex items-center justify-center shrink-0 shadow-lg shadow-[#00d8ff]/10">
            <Trophy size={36} />
          </div>
        </div>

        {/* Aperçu des catégories de défis */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-brand-white/10">
          <div className="p-4 bg-black/40 border border-brand-white/10 rounded-xl space-y-2 opacity-80">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-[#00d8ff]/10 text-[#00d8ff] flex items-center justify-center">
                <Target size={18} />
              </div>
              <Lock size={14} className="text-brand-white/30" />
            </div>
            <h3 className="font-heading font-bold text-sm uppercase text-brand-white">Défis Hebdomadaires</h3>
            <p className="text-[11px] text-brand-white/50 leading-tight">Objectifs courts pour maintenir une cadence régulière d’entraînement.</p>
          </div>

          <div className="p-4 bg-black/40 border border-brand-white/10 rounded-xl space-y-2 opacity-80">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-[#00d8ff]/10 text-[#00d8ff] flex items-center justify-center">
                <Flame size={18} />
              </div>
              <Lock size={14} className="text-brand-white/30" />
            </div>
            <h3 className="font-heading font-bold text-sm uppercase text-brand-white">Badges Striker</h3>
            <p className="text-[11px] text-brand-white/50 leading-tight">Badges d&apos;accomplissement basés sur vos victoires et assiduités.</p>
          </div>

          <div className="p-4 bg-black/40 border border-brand-white/10 rounded-xl space-y-2 opacity-80">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-[#00d8ff]/10 text-[#00d8ff] flex items-center justify-center">
                <Award size={18} />
              </div>
              <Lock size={14} className="text-brand-white/30" />
            </div>
            <h3 className="font-heading font-bold text-sm uppercase text-brand-white">Rangs & Ceintures</h3>
            <p className="text-[11px] text-brand-white/50 leading-tight">Évolution de votre niveau selon les validations techniques des coachs.</p>
          </div>
        </div>

        <div className="pt-2">
          <Link
            href="/membre"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#00d8ff] hover:bg-brand-white text-black font-heading font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-[#00d8ff]/20"
          >
            Retour au tableau de bord
          </Link>
        </div>
      </div>
    </div>
  );
}
