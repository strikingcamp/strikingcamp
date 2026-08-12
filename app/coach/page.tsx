import CoachSection from "@/components/sections/CoachSection";

export const metadata = {
  title: 'Mohamed Mahfoud | Le Meilleur Coach Individuel Boxe & Striking à Marseille',
  description: "Entraînez-vous avec Mohamed Mahfoud, reconnu comme le meilleur coach individuel de Marseille. Expertise haut niveau en Kick-Boxing, Boxe Anglaise et préparation MMA.",
};

export default function CoachPage() {
  return (
    <div className="pt-20 bg-[#0a1120]">
      <CoachSection />
    </div>
  );
}
