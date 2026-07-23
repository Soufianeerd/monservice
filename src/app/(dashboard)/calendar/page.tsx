import CalendarView from '@/components/crm/CalendarView';

export default function CalendarPage() {
  return (
    <div className="p-4 sm:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Calendrier</h1>
      </div>

      <p className="text-gray-600">
        Visualisez et organisez vos tâches, échéances de factures et dates de clôture de deals. Glissez-déposez un événement pour changer sa date.
      </p>

      <div className="mt-6">
        <CalendarView />
      </div>
    </div>
  );
}
