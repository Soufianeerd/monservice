import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { CLIENT_ACCESS_UNAVAILABLE_PATH, isClientAccessEnabled } from '@/lib/launch/client-access';

/**
 * La signature en ligne suppose un compte client : hors périmètre V1. Le
 * professionnel consigne l'accord de son client depuis la fiche du devis.
 */
export default async function QuoteSignLayout({ children }: { children: React.ReactNode }) {
  await connection();
  if (!isClientAccessEnabled()) redirect(CLIENT_ACCESS_UNAVAILABLE_PATH);
  return children;
}
