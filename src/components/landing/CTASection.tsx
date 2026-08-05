import Link from 'next/link';

export default function CTASection() {
  return (
    <div className="bg-indigo-700">
      <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:py-20 lg:px-8 lg:flex lg:items-center lg:justify-between">
        <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          <span className="block">Prêt à développer votre activité ?</span>
          <span className="block text-indigo-200">Rejoignez-nous dès aujourd&apos;hui.</span>
        </h2>
        <div className="mt-8 flex lg:mt-0 lg:flex-shrink-0">
          <div className="inline-flex rounded-md shadow">
            <Link
              href="/register"
              className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-indigo-600 bg-white hover:bg-indigo-50"
            >
              Créer mon compte
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
