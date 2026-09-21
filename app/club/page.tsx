import ClubSection from "@/components/sections/ClubSection";

export const metadata = {
  title: "Le Club, Notre Méthode et Notre Philosophie à Marseille (13010)",
  description:
    "Découvrez le club Striking Camp au 268 avenue de la Capelette (13010 Marseille) : notre histoire, la méthode du coach Mahfoud Mohamed, nos disciplines et nos cours Lady Striking.",
  alternates: {
    canonical: "https://www.strikingcamp.com/club",
  },
  openGraph: {
    title: "Le Club Striking Camp à Marseille (13010)",
    description:
      "Découvrez le club Striking Camp au 268 avenue de la Capelette (13010 Marseille) : notre histoire, la méthode du coach Mahfoud Mohamed et notre philosophie.",
    url: "https://www.strikingcamp.com/club",
    siteName: "Striking Camp",
    locale: "fr_FR",
    type: "website",
    images: [
      {
        url: "https://www.strikingcamp.com/sacSalle.jpg",
        width: 1200,
        height: 630,
        alt: "Le Club Striking Camp Marseille 13010",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Le Club Striking Camp à Marseille (13010)",
    description:
      "Découvrez le club Striking Camp au 268 avenue de la Capelette (13010 Marseille) : notre histoire et la méthode du coach.",
    images: ["https://www.strikingcamp.com/sacSalle.jpg"],
  },
};

export default function ClubPage() {
  return (
    <div className="pt-20 bg-transparent min-h-screen">
      <ClubSection />
    </div>
  );
}
