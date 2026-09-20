import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/session';
import { mfaService } from '@/lib/services/mfa.service';
import { toErrorResponse } from '@/lib/utils/api-response';
import { z } from 'zod';

const verifyMfaSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Le code doit contenir exactement 6 chiffres'),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();

    const body = await req.json().catch(() => null);
    const parsed = verifyMfaSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Code TOTP invalide (6 chiffres requis)' }, { status: 400 });
    }

    const isValid = await mfaService.verifyCode(session.userId, parsed.data.code);

    if (isValid) {
      await mfaService.enableMFA(session.userId);
      return NextResponse.json({ success: true, message: 'MFA vérifié et activé' });
    } else {
      return NextResponse.json({ error: 'Code TOTP incorrect' }, { status: 400 });
    }
  } catch (error: unknown) {
    return toErrorResponse(error, 'Erreur lors de la vérification MFA');
  }
}
