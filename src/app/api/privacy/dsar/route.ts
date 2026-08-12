import { NextRequest, NextResponse } from 'next/server';
import { dsarService } from '@/lib/services/dsar.service';
import { requireSession } from '@/lib/auth/session';
import { getOrganizationAction } from '@/app/actions/session';

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const organization = await getOrganizationAction();
    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 400 });
    }

    const body = await request.json();
    const { type, details } = body;

    if (!type || !details) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const requestObj = await dsarService.createRequest(session.userId, organization.id, type, details);

    return NextResponse.json({ success: true, request: requestObj });
  } catch (error: any) {
    console.error('DSAR creation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireSession();
    
    // In a real app, verify user has admin rights for this action
    
    const body = await request.json();
    const { requestId, response, status } = body;

    if (!requestId || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await dsarService.processRequest(requestId, response || '', status, session.userId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DSAR processing error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
