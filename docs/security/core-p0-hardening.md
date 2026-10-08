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
