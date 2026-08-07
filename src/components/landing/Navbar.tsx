import Link from 'next/link';
import { getSessionAction } from '@/app/actions/session';
import { Hexagon } from 'lucide-react';

export default async function Navbar() {
  const { user } = await getSessionAction();

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          <div className="flex-shrink-0 flex items-center">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="bg-primary-600 p-1.5 rounded-lg group-hover:scale-105 transition-transform">
                <Hexagon className="w-6 h-6 text-white fill-white" />
              </div>
              <span className="text-2xl font-black text-gray-900 tracking-tight">
                MonService
              </span>
            </Link>
          </div>
          <div className="hidden md:flex space-x-8">
            <Link href="#features" className="text-gray-600 hover:text-primary-600 font-medium transition-colors">Fonctionnalités</Link>
            <Link href="#how-it-works" className="text-gray-600 hover:text-primary-600 font-medium transition-colors">Comment ça marche</Link>
            <Link href="#pricing" className="text-gray-600 hover:text-primary-600 font-medium transition-colors">Tarifs</Link>
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-4">
                <Link href={user.profileType === 'client' ? '/client/dashboard' : '/dashboard'} className="bg-primary-600 text-white px-5 py-2.5 rounded-xl hover:bg-primary-700 font-semibold transition-all shadow-sm shadow-primary-200 hover:shadow-md">
                  Accéder au compte
                </Link>
              </div>
            ) : (
              <>
                <Link href="/login" className="text-gray-600 hover:text-gray-900 font-semibold hidden sm:block">Se connecter</Link>
                <Link href="/register" className="bg-gray-900 text-white px-5 py-2.5 rounded-xl hover:bg-gray-800 font-semibold transition-all shadow-sm hover:shadow-md">
                  S&apos;inscrire
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
