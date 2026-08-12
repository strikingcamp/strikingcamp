import PlanningSection from "@/components/sections/PlanningSection";
import PricingSection from "@/components/sections/PricingSection";

export const metadata = {
  title: 'Planning des Cours & Tarifs | Boxe, Kick Boxing, Lady Striking Marseille',
  description: "Découvrez notre planning de cours : Boxe Anglaise, Kick Boxing, Muay Thaï et cours Lady 100% femmes. Small groups et cours privés au Striking Camp Marseille.",
};

export default function PlanningPage() {
  return (
    <div className="pt-20 bg-[#0a1120]">
      <PlanningSection />
      <PricingSection />
    </div>
  );
}
