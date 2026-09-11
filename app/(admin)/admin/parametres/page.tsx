import { getAdminSettingsDataServerAction } from "./actions";
import AdminParametresView from "@/components/admin/AdminParametresView";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Paramètres & Sécurité | Administration Striking Camp",
  description: "Gestion des paramètres généraux, des services, de la sécurité et de la maintenance.",
};

export default async function AdminParametresPage() {
  const result = await getAdminSettingsDataServerAction();

  if (!result.success || !result.data) {
    return (
      <div className="p-8 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
        <h2 className="font-heading font-bold text-base uppercase mb-1">
          Erreur de chargement des paramètres
        </h2>
        <p className="text-xs text-rose-300/80">
          {result.error || "Impossible de récupérer les données administratives."}
        </p>
      </div>
    );
  }

  return <AdminParametresView initialData={result.data} />;
}
