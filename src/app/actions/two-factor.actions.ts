'use server';

import QRCode from 'qrcode';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db/server';
import { getPendingSecondFactorContext, getSessionContext, requireSession } from '@/lib/auth/session';
import { AppError } from '@/lib/errors';
import { allowAttempt } from '@/lib/auth/shared-rate-limit';
import { recordAudit } from '@/lib/audit/record';
import { generateTotpSecret, otpauthUri, verifyTotp } from '@/lib/auth/two-factor/totp';
import {
  decryptSecret,
  encryptSecret,
  generateRecoveryCodes,
  hashRecoveryCode,
  isTwoFactorConfigured,
  normalizeRecoveryCode,
} from '@/lib/auth/two-factor/crypto';
import { clearSecondFactor, markSecondFactorVerified } from '@/lib/auth/two-factor/session-cookie';

type Outcome = { ok: true } | { ok: false; error: string };

async function scalar<T>(query: ReturnType<typeof sql>): Promise<T | undefined> {
  const rows = await db.execute<{ value: T }>(query);
  return Array.isArray(rows) ? rows[0]?.value : undefined;
}

async function storedSecret(userId: string): Promise<string | null> {
  const payload = await scalar<string | null>(sql`select public.two_factor_secret() as value`);
  return payload ? decryptSecret(payload, userId) : null;
}

/** Vérifie un code TOTP (consommé) ou un code de secours (supprimé). */
async function consumeSecondFactor(userId: string, code: string): Promise<'totp' | 'recovery' | null> {
  const compact = code.replace(/\s/g, '');
  if (/^\d{6}$/.test(compact)) {
    const secret = await storedSecret(userId);
    const step = secret ? verifyTotp(secret, compact) : null;
    if (step === null) return null;
    return (await scalar<boolean>(sql`select public.two_factor_consume_step(${step}) as value`)) ? 'totp' : null;
  }
  if (normalizeRecoveryCode(code).length !== 10) return null;
  const used = await scalar<boolean>(sql`select public.two_factor_consume_recovery(${hashRecoveryCode(code)}) as value`);
  return used ? 'recovery' : null;
}

/** Après le mot de passe : faut-il encore le second facteur ? */
export async function isSecondFactorRequiredAction(): Promise<boolean> {
  return (await getPendingSecondFactorContext()) !== null;
}

export async function getTwoFactorStatusAction(): Promise<{ enabled: boolean; available: boolean }> {
  await requireSession();
  const enabled = Boolean(await scalar<boolean>(sql`select public.two_factor_enabled() as value`));
  return { enabled, available: isTwoFactorConfigured() };
}

/** Étape 1 : nouveau secret, en attente tant qu'un premier code n'est pas validé. */
export async function startTwoFactorEnrollmentAction(): Promise<{ secret: string; uri: string; qrCode: string }> {
  const ctx = await requireSession();
  if (!isTwoFactorConfigured()) throw new AppError('Double authentification indisponible pour le moment.', 503, 'TWO_FACTOR_UNAVAILABLE');
  if (await scalar<boolean>(sql`select public.two_factor_enabled() as value`)) {
    throw new AppError('La double authentification est déjà active.', 409, 'TWO_FACTOR_ALREADY_ENABLED');
  }
  const secret = generateTotpSecret();
  await db.execute(sql`select public.two_factor_set_pending(${encryptSecret(secret, ctx.userId)})`);
  const uri = otpauthUri(secret, ctx.email ?? ctx.userId);
  const qrCode = await QRCode.toDataURL(uri, { margin: 1, width: 220 });
  return { secret, uri, qrCode };
}

/** Étape 2 : premier code valide → activation et codes de secours (affichés une seule fois). */
export async function confirmTwoFactorEnrollmentAction(code: string): Promise<{ ok: true; recoveryCodes: string[] } | { ok: false; error: string }> {
  const ctx = await requireSession();
  if (!(await allowAttempt('2fa-enroll:user', ctx.userId, 10, 900))) {
    return { ok: false, error: 'Trop de tentatives. Réessayez dans quelques minutes.' };
  }
  const secret = await storedSecret(ctx.userId);
  const step = secret ? verifyTotp(secret, code) : null;
  if (step === null) return { ok: false, error: 'Code incorrect. Vérifiez l’heure de votre téléphone et réessayez.' };
  const recoveryCodes = generateRecoveryCodes();
  const hashes = recoveryCodes.map(hashRecoveryCode);
  const hashArray = sql`ARRAY[${sql.join(hashes.map((hash) => sql`${hash}`), sql`, `)}]::text[]`;
  const activated = await scalar<boolean>(sql`select public.two_factor_activate(${step}, ${hashArray}) as value`);
  if (!activated) return { ok: false, error: 'Activation impossible. Recommencez la configuration.' };
  await markSecondFactorVerified(ctx.userId);
  await recordAudit({ userId: ctx.userId, organizationId: ctx.organizationId, action: 'two_factor.enabled', entityType: 'user', entityId: ctx.userId });
  return { ok: true, recoveryCodes };
}

/** Désactivation : exige un code valide, même avec une session déjà vérifiée. */
export async function disableTwoFactorAction(code: string): Promise<Outcome> {
  const ctx = await requireSession();
  if (!(await allowAttempt('2fa:user', ctx.userId, 5, 900))) {
    return { ok: false, error: 'Trop de tentatives. Réessayez dans quelques minutes.' };
  }
  if (!(await consumeSecondFactor(ctx.userId, code))) return { ok: false, error: 'Code incorrect.' };
  await db.execute(sql`select public.two_factor_disable()`);
  await clearSecondFactor();
  await recordAudit({ userId: ctx.userId, organizationId: ctx.organizationId, action: 'two_factor.disabled', entityType: 'user', entityId: ctx.userId });
  return { ok: true };
}

/** Connexion : second facteur demandé après le mot de passe. */
export async function verifySecondFactorAction(code: string): Promise<Outcome> {
  const pending = await getPendingSecondFactorContext();
  if (!pending) {
    return (await getSessionContext()) ? { ok: true } : { ok: false, error: 'Session expirée. Reconnectez-vous.' };
  }
  if (!(await allowAttempt('2fa:user', pending.userId, 5, 900))) {
    return { ok: false, error: 'Trop de tentatives. Réessayez dans 15 minutes.' };
  }
  const method = await consumeSecondFactor(pending.userId, code);
  if (!method) {
    await recordAudit({ userId: pending.userId, organizationId: pending.organizationId, action: 'two_factor.failed', entityType: 'user', entityId: pending.userId });
    return { ok: false, error: 'Code incorrect ou déjà utilisé.' };
  }
  await markSecondFactorVerified(pending.userId);
  await recordAudit({
    userId: pending.userId,
    organizationId: pending.organizationId,
    action: method === 'recovery' ? 'two_factor.recovery_code_used' : 'two_factor.verified',
    entityType: 'user',
    entityId: pending.userId,
  });
  return { ok: true };
}
