'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
  link?: string;
}

const faqData: FAQItem[] = [
  {
    question: 'Comment créer un client ?',
    answer: 'Rendez-vous dans l’onglet "Clients" et cliquez sur "Ajouter un client".',
    link: '/clients',
  },
  {
    question: 'Comment créer et envoyer un devis ?',
    answer: 'Créez un devis dans "Facturation" puis cliquez sur "Envoyer".',
    link: '/facturation/devis',
  },
  {
    question: 'Comment accepter un paiement ?',
    answer: 'Intégrez Stripe dans les paramètres de facturation.',
    link: '/parametres/facturation',
  },
  {
    question: 'Mes données sont-elles sécurisées ?',
    answer: 'Toutes vos données sont chiffrées et sauvegardées quotidiennement. Nous respectons scrupuleusement la réglementation RGPD.',
  }
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="py-24 bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-extrabold text-center text-gray-900 sm:text-4xl mb-12">Questions fréquentes</h2>
        <div className="space-y-4">
          {faqData.map((item, index) => (
            <div key={index} className="border bg-white rounded-lg overflow-hidden shadow-sm">
              <button
                className="flex justify-between items-center w-full p-4 text-left font-medium text-gray-900 hover:bg-gray-50 focus:outline-none"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                aria-expanded={openIndex === index}
              >
                {item.question}
                {openIndex === index ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
              </button>
              <div
                className={`transition-all duration-300 ease-in-out ${
                  openIndex === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="p-4 border-t text-gray-600">
                  <p>{item.answer}</p>
                  {item.link && (
                    <a href={item.link} className="text-indigo-600 hover:text-indigo-500 hover:underline mt-3 inline-block font-medium">
                      En savoir plus &rarr;
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
