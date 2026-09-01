import ContactSection from "@/components/sections/ContactSection";

export const metadata = {
  title: "Contact et Accès au Club Striking Camp Marseille 13010",
  description:
    "Contactez le club Striking Camp au 268 avenue de la Capelette, 13010 Marseille. Téléphone (06.14.95.88.49), email, plan d'accès Google Maps et formulaire d'information.",
};

export default function ContactPage() {
  return (
    <div className="pt-20 bg-transparent min-h-screen">
      <ContactSection />
    </div>
  );
}
