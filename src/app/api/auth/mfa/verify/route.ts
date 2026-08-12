import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/session';
import { mfaService } from '@/lib/services/mfa.service';

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    if (!session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    }

    const isValid = await mfaService.verifyCode(session.userId, code);

    if (isValid) {
      await mfaService.enableMFA(session.userId);
      return NextResponse.json({ success: true, message: 'MFA verified and enabled' });
    } else {
      return NextResponse.json({ error: 'Invalid TOTP code' }, { status: 400 });
    }
  } catch (error) {
    console.error('MFA verification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
