import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/session';
import { mfaService } from '@/lib/services/mfa.service';
import { toErrorResponse } from '@/lib/utils/api-response';

export async function POST() {
  try {
    const session = await requireSession();

    const { secret, otpauthUrl } = await mfaService.generateSecret(session.userId);
    const qrCode = await mfaService.generateQRCode(otpauthUrl);

    return NextResponse.json({ secret, qrCode });
  } catch (error: unknown) {
    return toErrorResponse(error, 'Erreur lors de l’activation MFA');
  }
}

export async function DELETE() {
  try {
    const session = await requireSession();

    await mfaService.disableMFA(session.userId);

    return NextResponse.json({ message: 'MFA désactivé avec succès' });
  } catch (error: unknown) {
    return toErrorResponse(error, 'Erreur lors de la désactivation MFA');
  }
}
