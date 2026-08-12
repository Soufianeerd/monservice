import { Metadata } from 'next';
import DSARManager from '@/components/settings/DSARManager';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'DSAR | RGPD',
};

export default function DSARPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/parametres/privacy" className="p-2 bg-white rounded-full shadow hover:bg-gray-50 text-gray-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Demandes des personnes (DSAR)</h1>
      </div>
      <DSARManager />
    </div>
  );
}
