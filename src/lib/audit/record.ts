import 'server-only';
import { headers } from 'next/headers';
import { AuditService } from '@/lib/services/audit.service';

const audit = new AuditService();

export interface AuditEntry {
  userId: string;
  organizationId?: string | null;
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, unknown>;
}

/**
 * Journal des actions sensibles (table audit_logs, RLS : l'auteur écrit sa
 * propre ligne dans son organisation). Ne bloque jamais l'action : un échec
 * d'écriture est signalé dans les journaux du serveur.
 */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    let ip: string | undefined;
    let userAgent: string | undefined;
    try {
      const h = await headers();
      ip = h.get('x-nf-client-connection-ip') ?? h.get('x-real-ip') ?? h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? undefined;
      userAgent = h.get('user-agent')?.slice(0, 300) ?? undefined;
    } catch {
      /* hors requête HTTP (tâche planifiée) */
    }
    await audit.log(entry.userId, entry.organizationId ?? null, entry.action, entry.entityType, entry.entityId, undefined, entry.details, ip, userAgent);
  } catch (error) {
    console.error('[audit] écriture impossible', { action: entry.action, error: error instanceof Error ? error.message : String(error) });
  }
}
