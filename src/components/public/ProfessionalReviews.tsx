import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { StarIcon } from 'lucide-react';

export default function ProfessionalReviews() {
  // Placeholder data for reviews
  const reviews = [
    { id: 1, author: 'Jean D.', rating: 5, comment: "Excellente prestation, très professionnel et ponctuel. Je recommande vivement !", date: 'Il y a 2 semaines' },
    { id: 2, author: 'Marie L.', rating: 4, comment: "Bon travail dans l'ensemble. La communication a été fluide.", date: 'Il y a 1 mois' },
  ];

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-medium text-gray-900">Avis clients</h2>
      </CardHeader>
      <CardBody>
        <div className="space-y-6">
          {reviews.map(review => (
            <div key={review.id} className="border-b border-gray-100 pb-6 last:border-0 last:pb-0">
              <div className="flex items-center mb-2">
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <StarIcon key={i} className={`h-4 w-4 ${i < review.rating ? 'fill-current' : 'text-gray-300'}`} />
                  ))}
                </div>
                <span className="ml-2 text-sm font-medium text-gray-900">{review.author}</span>
                <span className="ml-2 text-sm text-gray-500">• {review.date}</span>
              </div>
              <p className="text-sm text-gray-600">{review.comment}</p>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
