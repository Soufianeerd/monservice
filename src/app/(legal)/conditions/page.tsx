import { Metadata } from 'next';
import { legalService } from '@/lib/services/legal.service';

export const metadata: Metadata = {
  title: 'Conditions Générales de Vente | MonService',
  description: 'Conditions générales de vente (CGV) de la plateforme MonService.',
};

export default async function ConditionsPage() {
  // En production, ces valeurs seraient détectées via la géolocalisation ou la session
  const locale = 'fr';
  const country = 'FR'; 
  
  const termsText = await legalService.getTermsAndConditions(country, locale);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Conditions Générales de Vente</h1>
      
      <div className="bg-white p-8 shadow sm:rounded-lg prose prose-indigo max-w-none">
        {termsText.split('\n\n').map((paragraph, index) => (
          <p key={index} className="text-gray-700 mb-4 leading-relaxed">
            {paragraph}
          </p>
        ))}
      </div>
    </div>
  );
}
