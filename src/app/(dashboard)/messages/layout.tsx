import { redirect } from 'next/navigation';
import { isClientAccessEnabled } from '@/lib/launch/client-access';

// V1 réservée aux professionnels : cette rubrique suppose des comptes clients.
export default function ClientAccountsOnlyLayout({ children }: { children: React.ReactNode }) {
  if (!isClientAccessEnabled()) redirect('/dashboard');
  return children;
}
