import ClubSection from "@/components/sections/ClubSection";

export const metadata = {
  title: 'Le Meilleur Club de Boxe et Kick Boxing à Marseille - Striking Camp',
  description: 'Rejoignez le meilleur club de pieds-poings et striking de Marseille. Boxe anglaise, Kick Boxing, Boxe Thaï avec le meilleur coach individuel de la cité phocéenne. Entraînement niveau mondial.',
};

export default function ClubPage() {
  return (
    <div className="pt-20 bg-brand-black min-h-screen">
      <ClubSection />
    </div>
  );
}
