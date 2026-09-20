import { NextRequest, NextResponse } from 'next/server';
import { privacyService } from '@/lib/services/privacy.service';
import { requireSession } from '@/lib/auth/session';
import { toErrorResponse } from '@/lib/utils/api-response';

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    if (!session.organizationId) {
      return NextResponse.json({ error: 'Organisation non trouvée' }, { status: 400 });
    }

    const body = await request.json();
    const { consentType, value, metadata } = body || {};

    if (!consentType || typeof value !== 'boolean') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // IP and User-Agent logging for proof of consent
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('remote-addr') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    await privacyService.recordConsent(session.userId, session.organizationId, consentType, value, {
      ...metadata,
      ip,
      userAgent,
      source: 'web_portal',
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return toErrorResponse(error, 'Erreur lors de l’enregistrement du consentement');
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const searchParams = request.nextUrl.searchParams;
    const consentType = searchParams.get('type');

    const history = await privacyService.getConsentHistory(session.userId, consentType || undefined);
    
    return NextResponse.json({ history });
  } catch (error: unknown) {
    return toErrorResponse(error, 'Erreur lors de la récupération des consentements');
  }
}
