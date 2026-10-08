# Core P0 security decisions

Baseline: `3b62b4759ff64e18d0354cd0d3be4e510d1c72cf`.

## Client billing authority

Verified server user identity is checked against the stored profile and document.
Only a client profile with an explicit recipient link or the document's CRM user
link can view, accept, reject or sign through client operations. Tenant membership
alone grants no client authority. Professional issuer access is separate.
Accept/reject/view lock the document and check the actor/link in the same transaction.
Client responses use the existing billing DTO allowlists, excluding internal costs.
Legacy client status commands are limited to quote view/refusal and delegate to the
canonical transitions; they cannot write caller-supplied statuses.

## Validation environment

Tests must never use the remote values in `.env.local`. Gate 1 was run with explicit
loopback overrides on isolated PostgreSQL port 55432 and canonical migrations.
The new integration suite fails closed for non-loopback database URLs.
This SQL sandbox does not implement Supabase Auth, PostgREST or Storage APIs.
Supabase RLS SDK tests and authenticated Playwright journeys need the full local
Supabase stack. Starting its isolated container runtime was blocked by disk capacity.
No remote provider, GitHub or Hub writes were performed.

## Tenant ownership

Clients, contacts, deals, products, tasks, legacy invoices and requests now use
strict update allowlists. Ordinary updates reject tenant, resource, creator,
recipient, profile and subscription identities rather than discarding them.
CRM relations, task assignments/polymorphic links and invoice products are checked
under transaction row locks. Tenant predicates and existing FK defenses remain.
Partial updates do not apply creation defaults to omitted task/product fields.
Draft invoice totals and document retention operate on the same transaction.
Changing a draft billing client refreshes its recipient from the stored CRM link.
Document type/number/signature/payment identity cannot be edited by ordinary forms.
Unsafe manual `paid` controls were removed; payment remains server-owned.
Legacy conversion now uses the existing accepted-quote conversion action.
No database migration was needed for these update authorization changes.

## Personal account closure and retention decision

A personal operation must never mutate organization-owned records, even for an
owner/admin. We close and anonymize the app account, preserving its structural
ID/tenant link and organization records (accounting signatures, documents, clinical
records, messages and linked marketplace requests). Their retention/erasure policy
requires a separate product/legal decision. This is not a claim of complete DSAR
coverage or irreversible provider identity deletion.

An additive `users.account_closed_at` is necessary because deleting the user would
break retained accounting/practitioner foreign keys, and no existing lifecycle
field can safely deny access without altering tenant/profile identities. Session
resolution and authenticated RLS must deny closed accounts, including existing
JWTs. Ordinary profile updates cannot unset this field. A restrictive policy is
added to currently protected public tables and storage objects; future RLS tables
must carry this account-lifecycle restriction too. No closed migration is edited.
Organization export uses the existing RBAC engine with explicit `privacy:export`;
no profile or owner-name shortcut grants the permission. Organization deletion
remains a separate, unimplemented administrative workflow.

The sequence allocator is a SECURITY DEFINER function; RLS cannot constrain its
internal writes. Its `authenticated` EXECUTE grant is therefore revoked, leaving
server/service-role allocation only. No application browser caller uses this RPC.

## Gate 1 validation record (2026-10-08)

103 adversarial tests added: billing authority/DTOs (24), strict Core updates and
relations (58), privacy/account/RLS effects (19), closed-account session resolution (2).
All migrations, including 0023, were replayed onto a second empty SQL sandbox before
final DB testing. No production migration was applied.

| Canonical command | Result |
| --- | --- |
| `npm run test:unit` | 51 passed |
| `npm run test:security` | 193 passed |
| `npm run test:db-constraints` | 263 passed |
| `npm run test:compliance` | 16 passed |
| `npm run test:onboarding` | 19 passed |
| `npm run test:practice-structure` | 39 passed |
| `npm run test:patients` | 33 passed |
| `npm run test:scheduling` | 90 passed |
| `npm run test:clinical` | 117 passed |
| `npm run test:patient-portal` | 28 passed |
| `npm run test:field-service` | 18 passed |
| `npm run test:workspace` | 88 passed |
| `npm run test:dashboard` | 9 passed |
| `npm run typecheck`, `npm run lint` | Passed; lint has 384 warnings, zero errors |
| `npm run db:check-drift`, `db:check-contract`, `db:check-custom-objects` | Passed |
| `npm run build` | Passed |
| `npm run test:rls` | Blocked: local Supabase Auth unavailable; 198 tests skipped in failing setup |
| `npm run test:e2e -- --config=/tmp/monservice-gate1-playwright.config.ts --workers=1 --max-failures=1` | Blocked: Chromium installed, but login cannot complete without local Supabase Auth; no authenticated journey validated |

Browser inspection verified anonymous redirects from `/parametres/donnees` and
`/client/quotes` to `/login`. Authenticated browser UX, paramedical practitioner,
patient portal, field-service and quote-to-cash E2E remain unverified. The final Playwright attempt used a temporary config derived from the canonical
config, with port 3039 and reuseExistingServer=false, after a different local app
was found on port 3000. The initial Chromium launch failure was resolved by
installing the locked Playwright headless engine. Gate 1 is not
fully validated until those run on full local Supabase.

`npm audit --omit=dev --json` reported six affected production packages: Next.js
(critical), js-yaml, nanoid, postcss, sharp and source-map-js (high). These are
baseline dependencies, unchanged in this mission. Exploitability review and package
remediation need a separate approved dependency change; the lockfile is unchanged.
Targeted added-line credential/private-key scanning found no matches; this is not
a substitute for a dedicated secret scanner. Semgrep was not installed or run.

The Hub was read and routed, not modified. Its old P0 status should be reconciled
with the reviewed changes later. Existing provider registration/profile-trigger
coordination, Core professional permission granularity, complete DSAR coverage,
provider identity erasure and owner/org continuity decisions remain follow-up work.
