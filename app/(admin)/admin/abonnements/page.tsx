import Link from "next/link";
import { Layers, ArrowLeft } from "lucide-react";

export default function AdminAbonnementsPage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-brand-white/10 pb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-black uppercase tracking-wider text-brand-white">
            Suivi des <span className="text-brand-blue">Abonnements</span>
          </h1>
          <p className="text-xs text-brand-white/60 mt-1">
            Gestion des souscriptions actives, expirées et suspendues.
          </p>
        </div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white text-xs font-semibold rounded uppercase tracking-wider border border-brand-white/10"
        >
          <ArrowLeft size={14} /> Retour Dashboard
        </Link>
      </div>

      <div className="bg-[#0f172a]/60 border border-brand-white/10 border-dashed rounded-xl p-12 text-center space-y-3">
        <Layers size={32} className="mx-auto text-brand-blue/60" />
        <h3 className="text-lg font-heading font-bold uppercase text-brand-white">
          Module Abonnements Admin
        </h3>
        <p className="text-xs text-brand-white/50 max-w-md mx-auto">
          Ce module permettra de filtrer les abonnements par statut et de consulter leurs dates d&apos;échéance.
        </p>
      </div>
    </div>
  );
}
