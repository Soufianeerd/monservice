'use server';
import { auth } from '@/lib/auth/server';
import { db } from '@/lib/db/server';
import { registerSchema } from '@/lib/validation/schemas';
import { sql } from 'drizzle-orm';
import { provisionSignupIdentity } from '@/lib/auth/provisioning';
import { getSessionContext } from '@/lib/auth/session';
import { organizationService } from '@/lib/services/organization.service';
import { CLOSED_SECTOR_MESSAGE, isSectorOpenForRegistration } from '@/lib/registration/options';
import { CLIENT_ACCESS_CLOSED_MESSAGE, isClientAccessEnabled } from '@/lib/launch/client-access';
import { createOwnWorkspace, currentPendingTeamInvitation, currentTeamRemoval } from '@/lib/services/team.service';
import { TEAM_ROLE_LABELS } from '@/lib/team/invitation';

/** Provider credentials and stable application IDs are provisioned separately. */
export async function registerAction(data: {
  name: string; email: string; password?: string; orgName?: string;
  profileType?: 'client' | 'professional'; sector?: string; profession?: string;
}): Promise<{ success: boolean; error?: string; requiresEmailConfirmation?: boolean; userId?: string }> {
  const parsed = registerSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Données invalides.' };
  const input = parsed.data;
  if (input.profileType !== 'professional' && !isClientAccessEnabled()) return { success: false, error: CLIENT_ACCESS_CLOSED_MESSAGE };
  if (input.profileType === 'professional' && !isSectorOpenForRegistration(input.sector)) return { success: false, error: CLOSED_SECTOR_MESSAGE };
  try {
    const { data: created, error } = await auth.signUp.email({
      email: input.email.trim().toLowerCase(), name: input.name, password: input.password,
    });
    if (error || !created?.user) return { success: false, error: 'Impossible de créer le compte.' };
    const userId = await provisionSignupIdentity(created.user.id, input);
    return { success: true, userId, requiresEmailConfirmation: !created.token };
  } catch {
    return { success: false, error: 'Impossible de finaliser le compte. Réessayez ou contactez le support.' };
  }
}

/** Recovery decisions come from the verified provider and stored application. */
export async function getAccountRecoveryAction() {
  const { data, error } = await auth.getSession();
  if (error || !data?.user) return null;
  if (data.user.emailVerified) await db.execute(sql`select public.link_current_reenrollment()`);
  const profile = await getSessionContext();
  const organization = profile?.organizationId ? await organizationService.getById(profile.organizationId) : null;
  const needsWorkspace = profile?.profileType === 'professional' && !organization;
  // Collaborateur invité sans organisation, ou retiré de son équipe : lus par
  // des fonctions bornées au compte connecté (aucun identifiant transmis).
  const invitation = needsWorkspace && !profile?.organizationId ? await currentPendingTeamInvitation() : null;
  const removal = !profile ? await currentTeamRemoval() : null;
  return { email: data.user.email, emailVerified: data.user.emailVerified, profileType: profile?.profileType ?? null,
    needsWorkspace, hasProfile: !!profile,
    pendingInvitation: invitation ? { organizationName: invitation.organizationName, roleLabel: TEAM_ROLE_LABELS[invitation.role] } : null,
    removedFrom: removal?.organizationName ?? null,
    clientRegistrationOpen: isClientAccessEnabled() };
}

export async function completeProfileAction(input: {
  profileType?: 'client' | 'professional'; orgName?: string; sector?: string; profession?: string;
}) {
  const { data, error } = await auth.getSession();
  if (error || !data?.user?.emailVerified) throw new Error('Confirmez votre adresse email pour continuer.');
  const profile = await getSessionContext();
  const parsed = registerSchema.safeParse({ ...input, name: data.user.name || 'Compte', email: data.user.email,
    password: 'RecoveryValidation1!', profileType: profile?.profileType ?? input.profileType });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Données invalides.');
  const values = parsed.data;
  if (values.profileType !== 'professional' && !isClientAccessEnabled()) throw new Error(CLIENT_ACCESS_CLOSED_MESSAGE);
  if (values.profileType === 'professional' && !isSectorOpenForRegistration(values.sector)) throw new Error(CLOSED_SECTOR_MESSAGE);
  // NULL resolves exclusively to the verified transaction context in PostgreSQL.
  await db.execute(sql`select public.provision_app_user(null,${values.profileType},${values.orgName ?? null},${values.sector ?? null},${values.profession ?? null})`);
  const current = await getSessionContext();
  if (current?.profileType === 'professional' && values.orgName) {
    if (!current.organizationId) {
      // Professionnel sans organisation (inscrit sur invitation) : espace personnel.
      await createOwnWorkspace({ orgName: values.orgName, sector: values.sector ?? 'other', profession: values.profession });
    } else {
      const organization = await organizationService.getById(current.organizationId);
      if (!organization) await db.execute(sql`select public.recover_current_workspace(${values.orgName},${values.sector ?? null},${values.profession ?? null})`);
    }
  }
  return { destination: current?.profileType === 'client' ? '/client/dashboard' : '/dashboard' };
}
