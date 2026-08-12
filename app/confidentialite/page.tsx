export const metadata = {
  title: "Politique de confidentialité | Striking Camp",
};

export default function PrivacyPage() {
  return (
    <div className="bg-brand-black min-h-screen pt-32 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="font-heading text-4xl font-bold uppercase tracking-widest mb-12">Politique de Confidentialité</h1>
        
        <div className="space-y-8 text-brand-white/80 font-light leading-relaxed">
          <section>
            <h2 className="font-bold text-brand-white text-xl uppercase tracking-wider mb-4">1. Données personnelles collectées</h2>
            <p>Dans le cadre de l'utilisation du site, nous pouvons être amenés à collecter certaines données (ex: via un formulaire de contact). Ces données sont exclusivement utilisées pour répondre à vos demandes.</p>
          </section>

          <section>
            <h2 className="font-bold text-brand-white text-xl uppercase tracking-wider mb-4">2. Finalité du traitement</h2>
            <p>Les informations recueillies sont destinées uniquement à la gestion de la relation client/adhérent de Striking Camp.</p>
          </section>
          
          <section>
            <h2 className="font-bold text-brand-white text-xl uppercase tracking-wider mb-4">3. Vos droits</h2>
            <p>Conformément au RGPD et à la loi Informatique et Libertés, vous disposez d'un droit d'accès, de rectification, d'effacement et d'opposition sur vos données personnelles. Vous pouvez exercer ce droit en nous contactant.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
