import { NextRequest, NextResponse } from 'next/server';
import { breachService } from '@/lib/services/breach.service';
import { requireProfessional } from '@/lib/auth/session';
import { toErrorResponse } from '@/lib/utils/api-response';

export async function POST(request: NextRequest) {
  try {
    const session = await requireProfessional();

    const body = await request.json();
    
    if (!body?.title || !body?.description) {
      return NextResponse.json({ error: 'Title and description are required' }, { status: 400 });
    }

    const breach = await breachService.reportBreach(session.organizationId, body);

    return NextResponse.json({ success: true, breach });
  } catch (error: unknown) {
    return toErrorResponse(error, 'Erreur lors de la déclaration de violation');
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireProfessional();
    
    const body = await request.json();
    const { id, status, correctiveActions } = body || {};

    if (!id || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const existing = await breachService.getById(id, session.organizationId);
    if (!existing) {
      return NextResponse.json({ error: 'Violation introuvable ou accès refusé' }, { status: 404 });
    }

    await breachService.updateBreachStatus(id, session.organizationId, status, correctiveActions);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return toErrorResponse(error, 'Erreur lors de la mise à jour de la violation');
  }
}
