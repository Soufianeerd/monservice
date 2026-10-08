# Supabase → Neon migration

Status: implementation and validation in progress. No production cutover authorized or performed.

## Git and scope

`migration/neon-full` starts at `ddc2408` on `security/core-p0-hardening` and preserves
`50788be`, `7feaf33`, `ddc2408`. Source project `leydfjctaxohovcmcgea` is read-only.
No public deployment, remote Git push, or source mutation is part of validation.
Security tests target the isolated Neon branch and synthetic fixtures only.

## Verified infrastructure

- Canonical EU project: `misty-field-54835523` / `Monservice-Europe`, AWS Frankfurt
  (`aws-eu-central-1`), PostgreSQL 18.
- Empty production: `br-little-surf-b1l5wgni` / `production`.
- Validation: `br-jolly-flower-b1ptunij` / `migration-validation`.
- Ohio `snowy-heart-26768144` is preserved and unused for imports.
- Neon CLI 8.0.7 authenticated; project-scoped MCP and five relevant skills installed.
- Official CLI generated `neon.ts`; plan reviewed before apply. Managed Better Auth
  and private `clinical-documents` / `einvoices` exist only on validation so far.
- Validation Auth allows localhost, email/password signup and login; shared SMTP
  verification method OTP; verification and signup/signin emails disabled for fixtures.

## Source inventory and rollback assets

Observed PostgreSQL 17.6, database 18,574,483 bytes, 57 business tables. Five
application users; every other business table empty. Sixteen Auth accounts,
eleven email identities, no MFA factors. One private clinical bucket, zero objects.
No clinical data is present in this snapshot. The CLI account lists other projects;
the secured database connection explicitly identifies the required project and
successfully reads its catalogs. No other Supabase project was used.

The canonical snapshot has the same business tables/columns except
`users.account_closed_at`, which is repo-only (Gate 1 migration 0023). Source has
25 Drizzle migration records; these are inventoried rather than blindly replayed.
Full constraints/functions/policies/indexes/triggers and source migration hashes
are retained in the private inventory for further reconciliation.

Private assets: `~/.local/share/monservice-migration/2026-10-09/`, directory 0700,
files 0600. Contains source environment, `source-public.dump` (329,532 bytes),
catalog inventory, minimum Auth re-enrollment records and app-user records.
Passwords/sessions are never used for provider transfer. The source remains the
primary rollback system; no source rows or objects have been changed/deleted.

## Identity and RLS architecture

Stable `public.users.id` retains every business reference. `user_identities` binds
provider IDs to it. Existing accounts use a server-owned re-enrollment allowlist;
linking requires the actual Neon provider account's verified email. No browser
email or requested application ID determines linking.

Verified Neon session → provider ID → `SET LOCAL monservice.provider_user_id`
inside a transaction → stored app identity/tenant/profile → restricted runtime
login → RLS. The runtime login is `NOINHERIT`, `NOBYPASSRLS`, nonsuperuser and owns
zero business tables (verified on Neon). Migration owner credentials are isolated
in an ignored admin environment. Pool reuse cannot retain transaction-local GUCs.

`drizzle/neon` is a new explicit baseline. Historical `drizzle/postgres` files are
unchanged. Structure is compiled from canonical migrations on disposable PG,
never copied blindly from source drift. Business FK/composite FK/CHECK/index,
scheduling exclusions and 19 triggers are retained. Provider-specific Auth trigger
and Storage catalog are omitted. Identity-bearing helper functions have explicit
reviewed bindings; canonical policy predicates are versioned individually.
Additive policies/guards cover client billing, professional mutations, closed
accounts, portal access and RBAC. Further capability validation remains mandatory.

## Storage and application boundaries

Private S3 transport uses branch credentials and path-style addressing. Every
domain adapter verifies active session and domain resource before upload/presign.
E-invoice paths include organization, document ID and a random version component;
uploads disallow overwriting. Clinical downloads require RLS-visible metadata.
Presigned GET lifetime is at most 60 seconds. Already-issued URLs remain usable
until expiry; account closure prevents new URLs but does not revoke old S3 URLs.

Neon SDK manages the Next 16 Auth proxy and cookies. Session helpers remain the
application boundary. Managed MFA is unsupported; the previous misleading setup
UI is removed. Stripe/Resend remain external and require separate narrow server
capabilities where they mutate business data without a browser session.

## Pending acceptance criteria

Auth/browser verification, all canonical RLS/DB/security/regression tests,
production build, full authenticated Playwright, storage expiry/isolation,
capacity check, five-user reconciliation/re-enrollment, isolated-branch CI,
deterministic production replay and deployment/rollback preflight are pending.
No GO status is claimed until these pass. Real clinical production data requires
demonstrated HDS coverage if introduced later.

Official contracts verified: [Neon CLI](https://neon.com/docs/cli),
[Next.js Auth SDK](https://neon.com/docs/auth/quick-start/nextjs-api-only),
[Supabase Auth migration](https://neon.com/docs/auth/migrate/from-supabase),
[Neon config](https://neon.com/docs/cli/config).
