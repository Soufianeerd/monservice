'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

const faqData: FAQItem[] = [
  {
    question: 'Puis-je utiliser MonService gratuitement ?',
    answer: 'Oui. Pendant la période de lancement, toutes les fonctionnalités sont gratuites et sans carte bancaire. Si une offre payante est introduite plus tard, vous serez prévenu à l\'avance et rien ne sera facturé sans votre accord.',
  },
  {
    question: 'Dois-je installer un logiciel sur mon ordinateur ?',
    answer: 'Non, MonService est une application web accessible depuis n\'importe quel navigateur (Chrome, Safari, Firefox). Vous n\'avez rien à installer ni à mettre à jour.',
  },
  {
    question: 'Puis-je accéder à MonService depuis mon téléphone ?',
    answer: 'Oui, notre interface est entièrement pensée pour s\'adapter aux écrans de smartphones et tablettes. Vous pouvez consulter vos rendez-vous et vos clients en déplacement.',
  },
  {
    question: 'Comment sont protégées mes données ?',
    answer: 'Votre base de données est stockée dans l\'Union européenne (Francfort) et les échanges sont chiffrés. Chaque organisation est cloisonnée au niveau de la base : personne d\'autre que vous et vos collaborateurs autorisés n\'accède à vos clients, devis et factures.',
  },
  {
    question: 'Suis-je engagé ?',
    answer: 'Non. Il n\'y a ni abonnement ni engagement pendant le lancement. Vous pouvez demander l\'export ou la suppression de vos données à tout moment.',
  }
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="py-24 bg-gray-50 border-t border-gray-100">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-extrabold text-center text-gray-900 sm:text-4xl mb-12">Questions fréquentes</h2>
        <div className="space-y-4">
          {faqData.map((item, index) => (
            <div key={index} className="border border-gray-200 bg-white rounded-xl overflow-hidden shadow-sm transition-colors hover:border-gray-300">
              <button
                className="flex justify-between items-center w-full p-5 text-left font-semibold text-gray-900 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                aria-expanded={openIndex === index}
              >
                <span className="pr-4">{item.question}</span>
                {openIndex === index ? <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />}
              </button>
              <div
                className={`transition-all duration-300 ease-in-out ${
                  openIndex === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                }`}
                aria-hidden={openIndex !== index}
              >
                <div className="p-5 border-t border-gray-100 text-gray-600 bg-gray-50/50 leading-relaxed text-sm">
                  <p>{item.answer}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
