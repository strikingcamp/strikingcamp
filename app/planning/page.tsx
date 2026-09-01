import PlanningSection from "@/components/sections/PlanningSection";

export const metadata = {
  title: "Planning des Cours de Boxe et Sports de Combat à Marseille | Striking Camp",
  description:
    "Consultez les horaires et le planning des cours au Striking Camp Marseille (13010) : Boxe Anglaise, Kick Boxing, Muay Thaï, Lady Striking, Small Group et cours privés du lundi au samedi.",
};

export default function PlanningPage() {
  return (
    <div className="pt-20 bg-transparent min-h-screen">
      <PlanningSection />
    </div>
  );
}
