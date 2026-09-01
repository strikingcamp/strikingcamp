import ClubSection from "@/components/sections/ClubSection";

export const metadata = {
  title: "Striking Camp Marseille 13010 | Notre Club, Notre Méthode et Notre Philosophie",
  description:
    "Découvrez le club Striking Camp au 268 avenue de la Capelette (13010 Marseille) : notre histoire, la méthode du coach Mahfoud Mohamed, nos disciplines et nos cours Lady Striking.",
};

export default function ClubPage() {
  return (
    <div className="pt-20 bg-transparent min-h-screen">
      <ClubSection />
    </div>
  );
}
