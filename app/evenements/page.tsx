import type { Metadata } from "next";
import EventsSection from "@/components/sections/EventsSection";

export const metadata: Metadata = {
  title: "Événements & Stages de Sports de Combat à Marseille | Striking Camp",
  description:
    "Participez aux stages intensifs, masterclasses et camps d'entraînement de Boxe Anglaise, Kick Boxing et Muay Thaï au Striking Camp Marseille (13010).",
};

export default function EvenementsPage() {
  return (
    <div className="pt-24 pb-16 bg-transparent min-h-screen">
      <EventsSection />
    </div>
  );
}
