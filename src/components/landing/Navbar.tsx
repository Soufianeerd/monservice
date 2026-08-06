import Link from 'next/link';
import { getSessionAction } from '@/app/actions/session';

export default async function Navbar() {
  const { user } = await getSessionAction();

  return (
    <nav className="bg-white border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex-shrink-0 flex items-center">
            <Link href="/" className="text-2xl font-bold text-indigo-600">
              MonService
            </Link>
          </div>
          <div className="hidden md:flex space-x-8">
            <Link href="#features" className="text-gray-600 hover:text-gray-900 font-medium">Fonctionnalités</Link>
            <Link href="#sectors" className="text-gray-600 hover:text-gray-900 font-medium">Secteurs</Link>
            <Link href="#pricing" className="text-gray-600 hover:text-gray-900 font-medium">Tarifs</Link>
            <Link href="#faq" className="text-gray-600 hover:text-gray-900 font-medium">FAQ</Link>
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-4">
                <Link href="/api/auth/signout" className="text-gray-600 hover:text-red-600 font-medium transition-colors">
                  Déconnexion
                </Link>
                <Link href={user.profileType === 'client' ? '/client/dashboard' : '/dashboard'} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 font-medium transition-colors">
                  Aller au Dashboard
                </Link>
              </div>
            ) : (
              <>
                <Link href="/login" className="text-gray-600 hover:text-gray-900 font-medium hidden sm:block">Connexion</Link>
                <Link href="/register" className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 font-medium transition-colors">
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
