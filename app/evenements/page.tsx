import type { Metadata } from "next";
import EventsSection from "@/components/sections/EventsSection";
import { getPublicEvents } from "@/lib/supabase/events";
import { createClient } from "@/lib/supabase/server";

// Revalidation périodique ISR (1 heure) + immédiate à la demande via revalidatePath
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Événements & Stages de Sports de Combat à Marseille | Striking Camp",
  description:
    "Participez aux stages intensifs, masterclasses et camps d'entraînement de Boxe Anglaise, Kick Boxing et Muay Thaï au Striking Camp Marseille (13010).",
};

export default async function EvenementsPage() {
  const supabase = await createClient();
  const events = await getPublicEvents(supabase);

  return (
    <div className="pt-24 pb-16 bg-transparent min-h-screen">
      <EventsSection initialEvents={events} />
    </div>
  );
}
