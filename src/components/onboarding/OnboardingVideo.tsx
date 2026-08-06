import { PlayCircle } from 'lucide-react';

export default function OnboardingVideo({ url }: { url?: string }) {
  return (
    <div className="w-full aspect-video bg-gray-100 rounded-lg flex flex-col items-center justify-center text-gray-500 mb-4 border border-gray-200">
      <PlayCircle className="w-12 h-12 text-indigo-400 mb-2" />
      <span className="text-sm font-medium">
        {url ? "Chargement de la vidéo..." : "Tutoriel Vidéo (Placeholder)"}
      </span>
      {url && <span className="text-xs mt-1 text-gray-400">{url}</span>}
    </div>
  );
}
