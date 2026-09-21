import type { Metadata } from "next";
import EventsSection from "@/components/sections/EventsSection";
import { getPublicEvents } from "@/lib/supabase/events";
import { createClient } from "@/lib/supabase/server";

// Revalidation périodique ISR (1 heure) + immédiate à la demande via revalidatePath
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Événements, Stages & Masterclasses de Boxe à Marseille (13010)",
  description:
    "Participez aux stages intensifs, masterclasses et camps d'entraînement de Boxe Anglaise, Kick Boxing et Muay Thaï au Striking Camp Marseille (13010).",
  alternates: {
    canonical: "https://www.strikingcamp.com/evenements",
  },
  openGraph: {
    title: "Événements & Stages de Boxe à Marseille (13010) | Striking Camp",
    description:
      "Participez aux stages intensifs, masterclasses et camps d'entraînement au Striking Camp Marseille (13010).",
    url: "https://www.strikingcamp.com/evenements",
    siteName: "Striking Camp",
    locale: "fr_FR",
    type: "website",
    images: [
      {
        url: "https://www.strikingcamp.com/sacSalle.jpg",
        width: 1200,
        height: 630,
        alt: "Événements et Stages Striking Camp Marseille 13010",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Événements & Stages de Boxe à Marseille (13010) | Striking Camp",
    description:
      "Participez aux stages intensifs et camps d'entraînement au Striking Camp Marseille.",
    images: ["https://www.strikingcamp.com/sacSalle.jpg"],
  },
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
