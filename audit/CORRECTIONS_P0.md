# Corrections des anomalies P0 — journal de modification

**Date** : 6 août 2026 · **Périmètre** : les 12 anomalies P0 de `AUDIT_FULL_REPORT.md`
**Décisions retenues** : NextAuth partout · PostgreSQL partout

---

## 1. Ce qui a été corrigé

| ID | Anomalie | Correction | Statut |
|---|---|---|---|
| **MS-001** | Middleware inopérant (`'/'` en préfixe) | `proxy.ts` réécrit : liste blanche par égalité stricte + préfixes explicites + cloisonnement `client` / `professional` par segment | ✅ |
| **MS-002** | ~80 actions sans session | Helper `requireSession` / `requireOrganization` / `requireProfessional` créé et appliqué aux **19 fichiers d'actions** | ✅ |
| **MS-003** | Dump utilisateurs + hachages | Projection `safeUserColumns` sans `password` ; `getUserByEmailAction` et `createUserAction` supprimées ; `getAllUsersAction` restreinte aux membres de l'organisation | ✅ |
| **MS-004** | Prise de contrôle de compte | `profileUpdateSchema.strict()` + liste blanche serveur ; identifiant cible issu de la session | ✅ |
| **MS-005** | Isolation multitenant nulle | `organizationId` provient de la session dans toutes les actions ; index ajoutés ; RLS documentée | ✅ (code) |
| **MS-006** | Cookie `session` non signé | Les 12 occurrences supprimées ; test structurel de non-régression | ✅ |
| **MS-007** | Fraude paiement / signature | `markAsPaidAction` et `updateSignatureAction` retirées ; paiement piloté par le webhook avec contrôle de montant ; signature avec IP, horodatage serveur et auteur | ✅ |
| **MS-008** | Auth scindée NextAuth/Supabase | Les 4 fichiers Supabase Auth migrés vers `getSessionContext()` ; boucle de redirection supprimée | ✅ |
| **MS-009** | Variable Supabase incohérente | Normalisation sur `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` + `src/lib/env.ts` (validation zod au démarrage) | ✅ |
| **MS-010** | Build cassé par Stripe | `getStripe()` paresseux ; repli `sk_test_mock` supprimé ; version d'API unifiée | ✅ |
| **MS-011** | Aucune persistance garantie | SQLite retiré du code ; `db/server.ts` échoue explicitement si `DATABASE_URL` n'est pas PostgreSQL | ⚠️ partiel — les **sauvegardes restent à configurer et à tester** |
| **MS-012** | Détournement Stripe Connect | `requireProfessional()` ; `organizationId` issu de la session ; colonnes manquantes ajoutées ; `setStripeAccount()` isolée | ✅ |

**Bonus traités au passage** (P1) : MS-014 (idempotence webhook + `subscription.deleted`), MS-017 (politique de mot de passe), MS-020/MS-021 (index, transaction, `result.changes`), MS-023 (`netlify.toml`), MS-024 (en-têtes de sécurité), MS-026/MS-027 (IDOR marketplace et messagerie), MS-028 (CI), MS-029 (test factice remplacé), MS-034 (`role` codé en dur).

---

## 2. Fichiers créés

| Fichier | Rôle |
|---|---|
| `src/lib/auth/session.ts` | **Pièce maîtresse.** `requireSession`, `requireOrganization`, `requireProfessional`, `getSessionContext` |
| `src/lib/auth/options.ts` | Configuration NextAuth, extraite de la route (une route ne doit exporter que des handlers) |
| `src/lib/env.ts` | Validation zod des variables d'environnement au démarrage |
| `src/lib/errors.ts` | `AppError` sans dépendance client (`error-handler.ts` importait `react-hot-toast` côté serveur) |
| `src/lib/utils/api-response.ts` | `toErrorResponse` — jamais de stack trace exposée au client |
| `src/lib/utils/request-info.ts` | IP et user-agent, pour la traçabilité des actions sensibles |
| `src/lib/services/stripe-event.service.ts` | Registre d'idempotence du webhook |
| `drizzle/postgres/0001_audit_p0_fixes.sql` | Migration : colonnes manquantes, `stripe_events`, index |
| `__tests__/unit/security/*.test.ts` | 3 suites de non-régression sur les P0 |

## 3. Fichiers modifiés (24)

`src/proxy.ts` · `src/app/(dashboard)/layout.tsx` · `src/app/client/layout.tsx` · les **19 fichiers** de `src/app/actions/` · `src/app/api/**/route.ts` (7 routes) · `user.service.ts` · `invoice.service.ts` · `client.service.ts` · `message.service.ts` · `organization.service.ts` · `reminder.service.ts` · `db/schema.ts` · `db/server.ts` · `lib/stripe/*` (4 fichiers) · `validation/schemas.ts` · `next.config.ts` · `netlify.toml` · `drizzle.config.ts` · `eslint.config.mjs` · `package.json` · `.env.example` · `.github/workflows/test.yml`

---

## 4. Le motif de correction, en une image

**Avant** — l'identité est une donnée transmise par le navigateur :

```ts
export async function findAllAction(organizationId?: any) {
  return await clientService.findAll(organizationId);   // ← valeur du client
}
```

**Après** — l'identité est reconstruite côté serveur à partir du JWT signé :

```ts
export async function findAllAction(_legacyOrganizationId?: unknown) {
  const { organizationId } = await requireProfessional();   // ← session
  return clientService.findAll(organizationId);
}
```

> **Pourquoi le paramètre a été conservé** : il existe environ 120 sites d'appel. Changer les signatures aurait imposé de modifier autant de composants sans pouvoir exécuter l'application pour vérifier. Le paramètre est donc **accepté et ignoré** — la sécurité est identique, le risque de régression bien moindre. Le nettoyage est inscrit en P2 dans le backlog.

---

## 5. Vérifications effectuées

| Contrôle | Résultat |
|---|---|
| `tsc --noEmit` | ✅ **0 erreur** |
| `eslint .` | ⚠️ **90 erreurs** (contre 251 avant, **−64 %**). Le reliquat est du `any` dans les services — P1, hors périmètre P0 |
| Cookie `session` résiduel dans les actions | ✅ **0 occurrence** (19/19 fichiers) |
| Fichiers d'actions établissant la session | ✅ **19/19** |
| Actions dangereuses retirées | ✅ **4/4** |
| Routes API authentifiées | ✅ **8/8** |
| Logique du middleware | ✅ 5/5 routes privées protégées, 4/4 publiques accessibles |

**`vitest` et `next build` n'ont pas pu être exécutés** dans l'environnement d'audit : les binaires natifs (`@rolldown/binding`, `lightningcss`) correspondent à l'architecture de votre machine, pas à celle du bac à sable. Les assertions des trois suites de tests ont donc été **vérifiées manuellement**, mais **vous devez lancer les tests et le build vous-même** — voir §6.

---

## 6. À faire avant de déployer — dans cet ordre

### Étape 1 — Base de données

```bash
# 1. Vérifier la RLS Supabase (PRIORITÉ ABSOLUE, potentiel P0 supplémentaire)
psql "$DATABASE_URL" -c "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public';"
# Si rowsecurity = false sur des tables de données clients → à traiter immédiatement

# 2. Appliquer la migration
psql "$DATABASE_URL" -f drizzle/postgres/0001_audit_p0_fixes.sql
```

Si l'index unique sur `(organization_id, number)` échoue, des doublons de numéros de facture existent déjà — les identifier et les corriger avant de rejouer.

### Étape 2 — Variables d'environnement

```bash
# Nouveau secret NextAuth, DIFFÉRENT entre local et production
openssl rand -base64 32   # → NEXTAUTH_SECRET local
openssl rand -base64 32   # → NEXTAUTH_SECRET Netlify (valeur différente)
openssl rand -hex 32      # → CRON_SECRET
```

L'ancien `NEXTAUTH_SECRET` était **identique** dans `.env.local` et `.env.production` : il doit être considéré comme compromis. Sa rotation déconnectera toutes les sessions en cours — c'est normal et souhaitable.

Dans Netlify, vérifier la présence de : `DATABASE_URL` (PostgreSQL), `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

### Étape 3 — Vérifications locales

```bash
rm -rf node_modules package-lock.json && npm install   # better-sqlite3 retiré
npm run typecheck        # doit passer
npm run test:unit
npm run test:security    # doit passer — non-régression P0
npm run build            # doit passer MÊME sans clé Stripe
```

### Étape 4 — Tests manuels indispensables

Aucun de ces parcours n'a pu être exécuté ici :

1. Inscription d'un professionnel → **vérifier qu'il n'y a plus de boucle de redirection** (c'était MS-008)
2. Connexion → `/dashboard` accessible
3. Connexion d'un client → `/client/dashboard`, et `/dashboard` renvoie vers `/forbidden`
4. Création, modification et suppression d'un client
5. Création d'un devis, puis signature
6. Déconnexion, puis accès direct à `/clients` → redirection vers `/login`
7. **Test croisé** : avec deux comptes de deux organisations différentes, vérifier qu'aucune donnée ne fuit

Le point 7 est le plus important : c'est la validation de MS-005.

---

## 7. Ce qui n'est toujours PAS corrigé

Le verdict **NO-GO reste valable**. Les P0 sont traités dans le code, mais il reste :

| Anomalie | Pourquoi ce n'est pas fait |
|---|---|
| **MS-011 (partiel)** | Sauvegardes et **restauration réelle** : nécessite un accès à Supabase. C'est un P0 encore ouvert. |
| **MS-022** | Row-Level Security : à activer et vérifier dans Supabase. Possible P0 supplémentaire. |
| **MS-015** | Aucun e-mail n'est envoyé : le service est une simulation. Nécessite un fournisseur (Resend, Postmark…) et la configuration SPF/DKIM/DMARC. |
| **MS-016** | Réinitialisation de mot de passe : dépend de MS-015. Un utilisateur qui perd son mot de passe reste bloqué. |
| **MS-018** | Notifications et relances : services vides. |
| **MS-019** | Quotas des plans : jamais appliqués. |
| **MS-025** | Observabilité : les journaux `[audit]` ajoutés sont un premier pas, mais restent des `console.*` non centralisés. |
| **MS-030/031** | RGPD : export, suppression de compte, consentement, textes juridiques. |
| **MS-033** | 90 erreurs ESLint restantes (`any` dans les services). |
| Accessibilité, responsive, performance | Non testés — non scorés. |

**Conditions de levée du NO-GO** : voir `PRODUCTION_READINESS_CHECKLIST.md` §« Conditions de levée ». La plus importante reste une **contre-vérification par un tiers** : je ne suis pas bien placé pour valider mes propres corrections.

---

## 8. Deux points de vigilance sur mon travail

1. **Aucune de ces corrections n'a été exécutée.** Ni build, ni test, ni démarrage de l'application. Le typage passe, la logique est vérifiée par lecture — ce n'est pas la même chose qu'un logiciel qui tourne. Attendez-vous à un ou deux ajustements au premier lancement.

2. **`db.transaction()` dans `deleteWithCascade`** est nouveau et n'a jamais été exécuté contre PostgreSQL avec le pooler Supabase. Si vous utilisez le pooler en mode *transaction* (port 6543), les transactions explicites peuvent se comporter différemment. À tester en priorité ; en cas de problème, utiliser la connexion directe (port 5432) pour ce chemin.
