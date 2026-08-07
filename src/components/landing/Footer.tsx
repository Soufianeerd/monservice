import Link from 'next/link';
import { Hexagon } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Hexagon className="w-5 h-5 text-gray-300 fill-gray-300" />
            <span className="text-lg font-bold text-gray-900 tracking-tight">MonService</span>
          </div>
          
          <div className="flex justify-center space-x-6 md:order-2">
            <Link href="/mentions-legales" className="text-gray-500 hover:text-gray-900 text-sm font-medium transition-colors">
              Mentions légales
            </Link>
            <Link href="/confidentialite" className="text-gray-500 hover:text-gray-900 text-sm font-medium transition-colors">
              Confidentialité
            </Link>
            <Link href="/conditions" className="text-gray-500 hover:text-gray-900 text-sm font-medium transition-colors">
              CGU
            </Link>
          </div>
          
          <div className="md:order-1">
            <p className="text-center md:text-left text-sm text-gray-400">
              &copy; {new Date().getFullYear()} MonService. Tous droits réservés.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
