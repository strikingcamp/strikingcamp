import ContactSection from "@/components/sections/ContactSection";

export const metadata = {
  title: "Contact et Accès au Club de Boxe à Marseille (13010)",
  description:
    "Contactez le club Striking Camp au 268 avenue de la Capelette, 13010 Marseille. Téléphone (06.14.95.88.49), email, plan d'accès Google Maps et formulaire d'information.",
  alternates: {
    canonical: "https://www.strikingcamp.com/contact",
  },
  openGraph: {
    title: "Contact et Accès au Club Striking Camp à Marseille (13010)",
    description:
      "Contactez le club Striking Camp au 268 avenue de la Capelette, 13010 Marseille. Téléphone (06.14.95.88.49), plan d'accès et formulaire de contact.",
    url: "https://www.strikingcamp.com/contact",
    siteName: "Striking Camp",
    locale: "fr_FR",
    type: "website",
    images: [
      {
        url: "https://www.strikingcamp.com/sacSalle.jpg",
        width: 1200,
        height: 630,
        alt: "Contact et Accès Striking Camp Marseille 13010",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact et Accès au Club Striking Camp à Marseille (13010)",
    description:
      "Contactez le club Striking Camp au 268 avenue de la Capelette, 13010 Marseille.",
    images: ["https://www.strikingcamp.com/sacSalle.jpg"],
  },
};

export default function ContactPage() {
  return (
    <div className="pt-20 bg-transparent min-h-screen">
      <ContactSection />
    </div>
  );
}
