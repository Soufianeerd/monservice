export default function OnboardingProgress({ 
  progress, 
  completedCount, 
  totalCount 
}: { 
  progress: number; 
  completedCount: number; 
  totalCount: number;
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700">Progression</span>
        <span className="text-sm font-medium text-indigo-600">{completedCount} sur {totalCount}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div 
          className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500" 
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    </div>
  );
}
