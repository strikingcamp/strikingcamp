import type { Metadata } from "next";
import EventsSection from "@/components/sections/EventsSection";

export const metadata: Metadata = {
  title: "Événements | Striking Camp Marseille",
  description: "Découvrez les prochains événements du Striking Camp à Marseille : stages intensifs, masterclasses et camps d'entraînement.",
};

export default function EvenementsPage() {
  return (
    <div className="pt-24 pb-16 bg-brand-black min-h-screen">
      <EventsSection />
    </div>
  );
}
