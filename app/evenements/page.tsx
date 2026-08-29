import type { Metadata } from "next";
import EventsSection from "@/components/sections/EventsSection";

export const metadata: Metadata = {
  title: "Événements, Stages & Masterclasses | Striking Camp Marseille",
  description: "Découvrez les prochains événements du Striking Camp à Marseille : stages intensifs de Muay Thaï, Kick Boxing, masterclasses et camps d'entraînement avec Mahfoud Mohamed.",
};

export default function EvenementsPage() {
  return (
    <div className="pt-24 pb-16 bg-brand-black min-h-screen">
      <EventsSection />
    </div>
  );
}
