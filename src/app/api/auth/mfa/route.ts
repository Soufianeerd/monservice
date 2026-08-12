import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/session';
import { mfaService } from '@/lib/services/mfa.service';

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    if (!session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { secret, otpauthUrl } = await mfaService.generateSecret(session.userId);
    const qrCode = await mfaService.generateQRCode(otpauthUrl);

    return NextResponse.json({ secret, qrCode });
  } catch (error) {
    console.error('MFA activation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await requireSession();
    if (!session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await mfaService.disableMFA(session.userId);

    return NextResponse.json({ message: 'MFA disabled successfully' });
  } catch (error) {
    console.error('MFA deactivation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
