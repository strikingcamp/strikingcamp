import type { Metadata } from "next";
import PricingSection from "@/components/sections/PricingSection";

export const metadata: Metadata = {
  title: "Tarifs & Formules | Striking Camp Marseille",
  description: "Découvrez les tarifs et formules de Striking Camp à Marseille : Cours Collectifs, Small Group et Cours Privés (8 séances). Formules annuelles et mensuelles.",
};

export default function TarifsPage() {
  return (
    <div className="pt-20 bg-[#0a1120] min-h-screen">
      <PricingSection />
    </div>
  );
}
