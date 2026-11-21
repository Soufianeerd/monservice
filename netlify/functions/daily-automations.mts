// Tâche planifiée Netlify : chaque matin (7 h UTC, soit 8 h en hiver et 9 h en
// été à Paris), déclenche les relances de factures et de devis et les demandes
// d'avis activées par chaque organisation. La route vérifie CRON_SECRET et
// s'exécute sous le rôle restreint monservice_reminders ; un même rappel ne
// part jamais deux fois, même si la tâche est relancée.
//
// Netlify n'exécute les fonctions planifiées que sur le déploiement publié.

export default async function dailyAutomations(): Promise<Response> {
  const base = process.env.URL;
  const secret = process.env.CRON_SECRET;
  if (!base || !secret) {
    console.error('[daily-automations] URL ou CRON_SECRET manquant : aucune exécution');
    return new Response('not configured', { status: 500 });
  }
  const response = await fetch(new URL('/api/reminders/check', base), {
    headers: { 'x-cron-secret': secret },
  });
  const body = await response.text();
  console.info('[daily-automations]', response.status, body.slice(0, 200));
  return new Response(null, { status: response.ok ? 204 : 502 });
}

export const config = {
  schedule: '0 7 * * *',
};
