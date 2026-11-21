import { CheckCircle2 } from 'lucide-react';

interface Acknowledgement {
  workReportId: string;
  signerName: string;
  decision: 'accepted' | 'accepted_with_reservations';
  comment: string | null;
  acknowledgedAt: string;
  reportSummary: string;
}

/** Session 20 — réceptions signées par le client depuis son portail. */
export default function ClientAcknowledgementsPanel({ acknowledgements }: { acknowledgements: Acknowledgement[] }) {
  return (
    <section className="px-4 sm:px-8 max-w-7xl mx-auto pb-8" data-testid="client-acknowledgements">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
        <h2 className="text-lg font-bold text-gray-900 flex items-center"><CheckCircle2 className="w-5 h-5 mr-2 text-gray-400" />Réception par le client</h2>
        {acknowledgements.length === 0 ? (
          <p className="text-sm text-gray-500">
            Aucune réception signée. Une fois le compte rendu finalisé, votre client peut le consulter et le signer depuis son espace MonService (s’il dispose d’un compte relié à sa fiche).
          </p>
        ) : (
          <ul className="space-y-2">
            {acknowledgements.map((ack) => (
              <li key={ack.workReportId} className={`text-sm rounded-xl border p-3 ${ack.decision === 'accepted' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
                <p className="font-medium">
                  {ack.decision === 'accepted' ? 'Acceptée sans réserve' : 'Acceptée avec réserves'} — {ack.signerName},{' '}
                  {new Date(ack.acknowledgedAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Paris' })}
                </p>
                <p className="text-xs opacity-80">Compte rendu : {ack.reportSummary}</p>
                {ack.comment && <p className="mt-1 whitespace-pre-line">{ack.comment}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
