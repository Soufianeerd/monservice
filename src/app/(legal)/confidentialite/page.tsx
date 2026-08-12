import { Metadata } from 'next';
import { legalService } from '@/lib/services/legal.service';

export const metadata: Metadata = {
  title: 'Politique de Confidentialité | MonService',
  description: 'Politique de confidentialité et traitement des données.',
};

export default async function ConfidentialitePage() {
  // En production, ces valeurs seraient détectées via la géolocalisation ou la session
  const locale = 'fr';
  const country = 'FR'; 
  
  const privacyText = await legalService.getPrivacyPolicy(country, locale);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Politique de Confidentialité</h1>
      
      <div className="bg-white p-8 shadow sm:rounded-lg prose prose-indigo max-w-none">
        {privacyText.split('\n\n').map((paragraph, index) => (
          <p key={index} className="text-gray-700 mb-4 leading-relaxed">
            {paragraph}
          </p>
        ))}
      </div>
    </div>
  );
}
