import { NextRequest, NextResponse } from 'next/server';
import { breachService } from '@/lib/services/breach.service';
import { requireSession } from '@/lib/auth/session';
import { getOrganizationAction } from '@/app/actions/session';

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession(); // Requires auth
    const organization = await getOrganizationAction();
    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 400 });
    }

    const body = await request.json();
    
    if (!body.title || !body.description) {
      return NextResponse.json({ error: 'Title and description are required' }, { status: 400 });
    }

    const breach = await breachService.reportBreach(organization.id, body);

    return NextResponse.json({ success: true, breach });
  } catch (error: any) {
    console.error('Breach reporting error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireSession();
    
    const body = await request.json();
    const { id, status, correctiveActions } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await breachService.updateBreachStatus(id, status, correctiveActions);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Breach update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
