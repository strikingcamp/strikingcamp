import ContactSection from "@/components/sections/ContactSection";

export const metadata = {
  title: 'Contactez Striking Camp | Inscription Club de Boxe 13010 Marseille',
  description: "Rejoignez notre salle de sport de combat à Marseille (13010). Contactez-nous pour réserver votre séance de Boxe Anglaise, Kick Boxing ou Lady Boxing.",
};

export default function ContactPage() {
  return (
    <div className="pt-20 bg-[#0a1120]">
      <ContactSection />
    </div>
  );
}
