import type { Metadata } from "next";
import PricingSection from "@/components/sections/PricingSection";

export const metadata: Metadata = {
  title: "Tarifs et Formules de Boxe à Marseille | Striking Camp",
  description:
    "Découvrez les tarifs et formules d'abonnement au Striking Camp Marseille (13010) : Cours Collectifs, Small Group et Cours Privés (8 séances/mois). Sans engagement ou annuel.",
};

export default function TarifsPage() {
  return (
    <div className="pt-20 bg-transparent min-h-screen">
      <PricingSection />
    </div>
  );
}
