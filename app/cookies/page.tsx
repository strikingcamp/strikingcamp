export const metadata = {
  title: "Politique de cookies | Striking Camp",
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
            <p>Ce site utilise des cookies strictement nécessaires à son fonctionnement technique et, le cas échéant, des cookies de mesure d'audience anonymisée pour améliorer l'expérience utilisateur.</p>
          </section>
          
          <section>
            <h2 className="font-bold text-brand-white text-xl uppercase tracking-wider mb-4">3. Gestion des cookies</h2>
            <p>Vous pouvez à tout moment configurer votre navigateur pour bloquer ces cookies. Cependant, certaines fonctionnalités du site pourraient ne plus fonctionner correctement.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
