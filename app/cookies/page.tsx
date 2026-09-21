import ManageCookiesButton from "@/components/analytics/ManageCookiesButton";

export const metadata = {
  title: "Politique de cookies",
  alternates: {
    canonical: "https://www.strikingcamp.com/cookies",
  },
};

export default function CookiesPage() {
  return (
    <div className="bg-brand-black min-h-screen pt-32 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="font-heading text-4xl font-bold uppercase tracking-widest mb-12">Politique de Cookies</h1>
        
        <div className="space-y-8 text-brand-white/80 font-light leading-relaxed">
          <section>
            <h2 className="font-bold text-brand-white text-xl uppercase tracking-wider mb-4">1. Qu'est-ce qu'un cookie ?</h2>
            <p>Un cookie est un petit fichier texte déposé sur votre terminal (ordinateur, tablette, smartphone) lors de la visite d'un site. Il permet de mémoriser certaines de vos actions ou préférences.</p>
          </section>

          <section>
            <h2 className="font-bold text-brand-white text-xl uppercase tracking-wider mb-4">2. Utilisation des cookies</h2>
            <p>Ce site utilise des cookies strictement nécessaires à son fonctionnement technique et, avec votre accord explicite, des cookies de mesure d'audience anonymisée (Google Analytics) pour améliorer l'expérience utilisateur et les services du club.</p>
          </section>
          
          <section className="space-y-4">
            <h2 className="font-bold text-brand-white text-xl uppercase tracking-wider mb-4">3. Gestion de vos préférences</h2>
            <p>Vous pouvez à tout moment accepter, refuser ou modifier vos choix concernant les cookies non essentiels directement via notre panneau de préférences ci-dessous ou depuis le lien &quot;Gestion des cookies&quot; présent en bas de chaque page du site.</p>
            <div className="pt-2">
              <ManageCookiesButton />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
