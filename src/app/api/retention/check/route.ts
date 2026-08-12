import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/session';
import { retentionService } from '@/lib/services/retention.service';

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    if (!session.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const expired = await retentionService.getExpiredDocuments(session.organizationId);

    // Dans un vrai environnement de production, une tâche en arrière-plan gérerait l'anonymisation 
    // et l'envoi d'e-mails pour prévenir (J-30). Ici, on automatise l'anonymisation sur les expirés.
    let processed = 0;
    for (const doc of expired) {
      await retentionService.anonymizeDocument(doc.id, doc.type as 'invoice' | 'quote');
      processed++;
    }

    return NextResponse.json({ 
      expired, 
      processed,
      message: `${processed} documents automatically anonymized.` 
    });
  } catch (error) {
    console.error('Retention check error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
