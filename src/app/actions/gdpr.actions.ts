'use server';
import { requireSession } from '@/lib/auth/session';
import { accountPrivacyService } from '@/lib/services/account-privacy.service';
import { auth } from '@/lib/auth/server';
import { AppError } from '@/lib/errors';

function jsonExport(scope: string, payload: unknown) {
  return { filename:`monservice-${scope}-${new Date().toISOString().slice(0,10)}.json`,contentType:'application/json',data:JSON.stringify(payload,null,2) };
}
export async function exportMyDataAction() {
  const ctx=await requireSession();
  const payload=await accountPrivacyService.exportPersonal(ctx);
  console.info('[audit] privacy.personal_export',{ userId:ctx.userId });
  return jsonExport('donnees-personnelles',payload);
}
export async function exportOrganizationDataAction() {
  const ctx=await requireSession();
  const payload=await accountPrivacyService.exportOrganization(ctx);
  console.info('[audit] privacy.organization_export',{ userId:ctx.userId,organizationId:ctx.organizationId });
  return jsonExport('organisation',payload);
}
export async function getAccountDeletionPreviewAction() {
  await requireSession();
  return { compte:'fermeture et anonymisation du profil',organisation:'conservée',documents:'conservés sans modification',identityProvider:'identité conservée, accès applicatif bloqué',retention:'Les autres données conservées nécessitent une politique de rétention et un traitement dédiés.' };
}
export async function deleteMyAccountAction(confirmationEmail:string): Promise<{success:boolean;error?:string}> {
  const ctx=await requireSession();
  try {
    const result=await accountPrivacyService.closePersonalAccount(ctx,confirmationEmail);
    console.info('[audit] privacy.account_closed',{ userId:ctx.userId });
    // Closure is already enforced by server session resolution and restrictive RLS.
    // Cookie/session revocation failure must not report a committed closure as failed.
    try { await auth.signOut(); }
    catch { console.warn('[privacy] signout unavailable after account closure',{ userId:ctx.userId }); }
    return result;
  } catch(error) {
    if (error instanceof AppError && error.statusCode === 400) return {success:false,error:error.message};
    console.error('[privacy] account closure failed',{userId:ctx.userId});
    return {success:false,error:'La fermeture a échoué. Contactez le support.'};
  }
}
