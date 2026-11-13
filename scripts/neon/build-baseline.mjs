// Compile the closed canonical migrations on a disposable, empty local PG instance,
// then export their final structure. Never point this tool at a source/target provider.
import fs from 'node:fs';
import postgres from 'postgres';

const sql = postgres('postgres://soufianeelrhadi@127.0.0.1:55439/postgres', { max: 1 });
const quote = x => '"' + x.replaceAll('"', '""') + '"';
const directory = 'drizzle/neon';
fs.mkdirSync(directory, { recursive: true });
const dump = fs.readFileSync('/tmp/monservice-canonical-schema.sql', 'utf8');
const sections = dump.split(/(?=--\n-- Name:)/);
// Explicit bindings reviewed for tenant, closed-account, practitioner, FS and audit identity.
const identityFunctions = new Set(['current_account_is_active', 'current_clinical_practitioner_id', 'current_organization_id', 'is_current_field_service_professional', 'record_field_service_work_order_status_history']);
try {
  const functions = await sql`select p.proname, pg_get_functiondef(p.oid) as definition, pg_get_function_identity_arguments(p.oid) as arguments from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prokind='f' and p.proname<>'handle_new_auth_user' and not exists (select 1 from pg_depend d where d.classid='pg_proc'::regclass and d.objid=p.oid and d.deptype='e') order by p.proname`;
  const converted = functions.map(fn => {
    let body = fn.definition;
    if (body.includes('auth.uid()')) {
      if (!identityFunctions.has(fn.proname)) throw new Error('Unreviewed provider binding: ' + fn.proname);
      body = body.replaceAll('auth.uid()', 'public.current_app_user_id()');
    }
    if (fn.proname === 'protect_account_lifecycle') body = body.replace("current_user = 'authenticated'", "current_user = 'monservice_runtime'");
    if (fn.proname === 'allocate_billing_document_number') body = body.replace(/BEGIN\s*/, `BEGIN\n  IF p_organization_id IS DISTINCT FROM public.current_organization_id() OR public.current_profile_type() IS DISTINCT FROM 'professional' THEN RAISE EXCEPTION 'Billing number authority denied' USING ERRCODE='42501'; END IF;\n`);
    return '-- Reviewed canonical function: ' + fn.proname + '\n' + body + ';';
  });
  const structural = sections.filter(s => !/Type: (FUNCTION|POLICY|ROW SECURITY|SCHEMA|COMMENT)/.test(s)).join('');
  // Remove psql-only commands and schema settings; retain every business object.
  const clean = structural.split('\n').filter(s => !s.startsWith('\\') && !s.startsWith('SELECT pg_catalog.set_config')).join('\n');
  fs.writeFileSync(directory + '/0000_structure.sql', '-- Canonical 0000–0023 business structure. No historical file changed.\nCREATE EXTENSION IF NOT EXISTS btree_gist;\n' + clean.replace(/CREATE TRIGGER [\s\S]*?EXECUTE FUNCTION [^;]+;/g, ''));
  const triggers = await sql`select pg_get_triggerdef(t.oid) as definition from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and not t.tgisinternal order by c.relname,t.tgname`;
  fs.writeFileSync(directory + '/0002_business_guards.sql', converted.join('\n\n') + '\n\n' + triggers.map(t => t.definition + ';').join('\n'));
  const policies = await sql`select * from pg_policies where schemaname='public' order by tablename,policyname`;
  const grants = await sql`select table_name,privilege_type from information_schema.role_table_grants where grantee='authenticated' and table_schema='public' order by table_name,privilege_type`;
  const policySql = [];
  for (const policy of policies) {
    // Each canonical expression is preserved, with its principal bound to the app
    // identity resolved in the transaction, never an unverified browser identifier.
    const bind = expression => expression?.replaceAll('auth.uid()', 'public.current_app_user_id()');
    policySql.push(`-- ${policy.tablename}/${policy.policyname}: ${policy.cmd}, ${policy.permissive}; canonical domain predicate.\nALTER TABLE public.${quote(policy.tablename)} ENABLE ROW LEVEL SECURITY;\nCREATE POLICY ${quote(policy.policyname)} ON public.${quote(policy.tablename)} AS ${policy.permissive} FOR ${policy.cmd} TO monservice_runtime${policy.qual ? ' USING (' + bind(policy.qual) + ')' : ''}${policy.with_check ? ' WITH CHECK (' + bind(policy.with_check) + ')' : ''};`);
  }
  const revoke = 'REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, monservice_runtime;\nREVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, monservice_runtime;\nGRANT USAGE ON SCHEMA public TO monservice_runtime;\n';
  const grantSql = grants.map(g => `GRANT ${g.privilege_type} ON public.${quote(g.table_name)} TO monservice_runtime;`).join('\n');
  const helpers = ['current_app_user_id', 'current_profile_type', 'current_account_is_active', 'current_clinical_practitioner_id', 'current_organization_id', 'is_current_field_service_professional', 'can_insert_patient_message', 'has_patient_practitioner_relationship', 'allocate_billing_document_number'];
  const signatures = functions.filter(f => helpers.includes(f.proname)).map(f => `GRANT EXECUTE ON FUNCTION public.${quote(f.proname)}(${f.arguments}) TO monservice_runtime;`).join('\n');
  fs.writeFileSync(directory + '/0003_canonical_rls.sql', policySql.join('\n\n') + '\n' + revoke + grantSql + '\n' + signatures + '\nGRANT EXECUTE ON FUNCTION public.current_app_user_id(),public.current_profile_type() TO monservice_runtime;\n');
  console.log(JSON.stringify({ functions: functions.length, policies: policies.length, triggers: triggers.length, grants: grants.length }));
} finally { await sql.end(); }
