import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex justify-center md:justify-start space-x-6 md:order-2 mb-6 md:mb-0">
            <Link href="/mentions-legales" className="text-gray-400 hover:text-gray-500 text-sm">
              Mentions légales
            </Link>
            <Link href="/confidentialite" className="text-gray-400 hover:text-gray-500 text-sm">
              Confidentialité
            </Link>
            <Link href="/conditions" className="text-gray-400 hover:text-gray-500 text-sm">
              CGU
            </Link>
          </div>
          <div className="mt-8 md:mt-0 md:order-1">
            <p className="text-center md:text-left text-base text-gray-400">
              &copy; {new Date().getFullYear()} MonService. Tous droits réservés.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
