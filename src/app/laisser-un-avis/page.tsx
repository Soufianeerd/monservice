import type { Metadata } from 'next';
import { isWellFormedReviewToken } from '@/lib/growth/review';
import { previewReviewLink } from '@/lib/services/review.service';
import ReviewForm from './ReviewForm';

export const metadata: Metadata = { title: 'Donner votre avis', robots: { index: false, follow: false } };

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg bg-white rounded-xl shadow p-8 space-y-4" data-testid="review-link">
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        {children}
      </div>
    </main>
  );
}

// Lien à usage unique reçu par le client d'une facture réglée. Aucun compte,
// aucune donnée de facture affichée au-delà du numéro : le jeton est le secret.
export default async function LeaveReviewPage(props: { searchParams: Promise<{ token?: string | string[] }> }) {
  const { token } = await props.searchParams;
  if (!isWellFormedReviewToken(token)) {
    return (
      <Card title="Lien invalide">
        <p className="text-sm text-gray-600">Ce lien est incomplet. Ouvrez-le directement depuis l’e-mail reçu.</p>
      </Card>
    );
  }
  const preview = await previewReviewLink(token);
  if (!preview || preview.state !== 'pending') {
    const message = preview?.state === 'used'
      ? 'Votre avis a bien été enregistré. Merci !'
      : preview?.state === 'expired'
        ? 'Ce lien a expiré.'
        : 'Ce lien n’est plus valable.';
    return (
      <Card title={preview?.state === 'used' ? 'Merci pour votre avis' : 'Lien indisponible'}>
        <p className="text-sm text-gray-600">{message}</p>
      </Card>
    );
  }
  return (
    <Card title={`Votre avis sur ${preview.organizationName}`}>
      <p className="text-sm text-gray-600">
        Suite à la facture {preview.invoiceNumber}. Votre avis sera publié avec le nom que vous choisissez ci-dessous, sur la page publique de {preview.organizationName}. Il ne pourra pas être modifié par l’entreprise.
      </p>
      <ReviewForm token={token} suggestedName={preview.suggestedName} organizationName={preview.organizationName} />
    </Card>
  );
}
