export default function FAQ() {
  const faqs = [
    {
      q: 'Comment fonctionne la facturation ?',
      a: 'Vous pouvez tester MonService gratuitement pendant 14 jours. Ensuite, vous serez facturé mensuellement selon le plan choisi.'
    },
    {
      q: 'Est-il possible d\'annuler à tout moment ?',
      a: 'Oui, nos abonnements sont sans engagement. Vous pouvez annuler votre abonnement quand vous le souhaitez depuis vos paramètres.'
    },
    {
      q: 'Qu\'est-ce que la marketplace ?',
      a: 'C\'est un espace public où les particuliers peuvent rechercher des professionnels par secteur et par ville pour leur demander des devis.'
    },
    {
      q: 'Mes données sont-elles sécurisées ?',
      a: 'Toutes vos données sont chiffrées et sauvegardées quotidiennement. Nous respectons scrupuleusement la réglementation RGPD.'
    }
  ];

  return (
    <div id="faq" className="py-24 bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">Questions Fréquentes</h2>
        </div>
        <div className="space-y-8">
          {faqs.map((faq, index) => (
            <div key={index}>
              <h3 className="text-lg font-bold text-gray-900">{faq.q}</h3>
              <p className="mt-2 text-gray-600">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
