/**
 * Squelette affiché instantanément pendant le chargement d'une page du tableau de
 * bord (fichiers loading.tsx) : la navigation répond tout de suite au clic.
 */
export default function PageSkeleton() {
  return (
    <div role="status" aria-live="polite" className="mx-auto w-full max-w-6xl animate-pulse space-y-6 p-1">
      <span className="sr-only">Chargement de la page…</span>
      <div className="h-8 w-1/3 rounded-lg bg-gray-200" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="h-24 rounded-xl bg-gray-100" />
        <div className="h-24 rounded-xl bg-gray-100" />
        <div className="h-24 rounded-xl bg-gray-100" />
      </div>
      <div className="h-72 rounded-xl bg-gray-100" />
    </div>
  );
}
