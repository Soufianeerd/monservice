import Link from 'next/link';
import { getSessionAction } from '@/app/actions/session';
import { Hexagon } from 'lucide-react';

export default async function Navbar() {
  const { user } = await getSessionAction();

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center relative">
          <div className="flex-1 flex justify-start">
            <div className="hidden md:flex space-x-8">
              <Link href="#features" className="text-gray-600 hover:text-primary-600 font-medium transition-colors">Fonctionnalités</Link>
              <Link href="#how-it-works" className="text-gray-600 hover:text-primary-600 font-medium transition-colors">Comment ça marche</Link>
              <Link href="#pricing" className="text-gray-600 hover:text-primary-600 font-medium transition-colors">Tarifs</Link>
            </div>
          </div>

          <div className="flex-1 flex justify-center absolute left-1/2 transform -translate-x-1/2">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="bg-primary-600 p-1.5 rounded-lg group-hover:scale-105 transition-transform shadow-lg shadow-primary-200">
                <Hexagon className="w-6 h-6 text-white fill-white" />
              </div>
              <span className="text-2xl font-black text-gray-900 tracking-tight">
                MonService
              </span>
            </Link>
          </div>

          <div className="flex-1 flex justify-end items-center space-x-4">
            {user ? (
              <Link href={user.profileType === 'client' ? '/client/dashboard' : '/dashboard'} className="bg-primary-600 text-white px-5 py-2.5 rounded-xl hover:bg-primary-700 font-semibold transition-all shadow-sm shadow-primary-200 hover:shadow-md transform hover:scale-105">
                Accéder au compte
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-gray-600 hover:text-gray-900 font-semibold hidden sm:block transition-colors">Se connecter</Link>
                <Link href="/register" className="bg-gray-900 text-white px-5 py-2.5 rounded-xl hover:bg-gray-800 font-semibold transition-all shadow-lg shadow-gray-200 hover:shadow-xl transform hover:scale-105">
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
