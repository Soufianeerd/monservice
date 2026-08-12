import { Metadata } from 'next';
import BreachManager from '@/components/settings/BreachManager';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Violations de données | RGPD',
};

export default function BreachPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/parametres/privacy" className="p-2 bg-white rounded-full shadow hover:bg-gray-50 text-gray-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Violations de données</h1>
      </div>
      <BreachManager />
    </div>
  );
}
