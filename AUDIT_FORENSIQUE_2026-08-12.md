# AUDIT FORENSIQUE — MonService

**Dépôt** : `Soufianeerd/monservice` · **Branche** : `main`
**HEAD audité** : `115800cb4daa9b9a861355f8f7b3a546ece1a367` — *feat: complete multi-country CRM roadmap (Prompts 1-10)*
**Date de l'audit** : 12 août 2026 · **Arbre de travail** : propre (`git status` vide)
**Environnement de vérification** : Node v22.22.3, npm 10.9.8, Linux x64, `npm ci` depuis `package-lock.json` (985 paquets)

> ⚠️ **Voir l'ADDENDUM en fin de document.** Des sondes exécutées contre la base Supabase déployée
> (rôle `anon`, PostgREST) **infirment MS-130 et MS-131** et **révèlent une désynchronisation
> base ↔ schéma** qui reclasse MS-105, MS-106 et MS-118. L'ordre du plan de correction est modifié.

---

## A. VERDICT EXÉCUTIF

| Domaine | Score /100 | Justification en une ligne |
|---|---:|---|
| Produit (fonctionnel réel) | **34** | 80 pages existent ; les fonctions vendables (équipe, i18n, e-invoicing, audit trail, MFA) sont des coquilles |
| Sécurité applicative | **28** | 3 IDOR prouvés, RBAC désactivé en commentaire, MFA non appliqué, secret TOTP en clair, mutation par GET |
| Architecture | **58** | Socle de session excellent ; contourné par 6 appels non scopés et une couche « services » incohérente |
| UX / UI | **41** | 51 `alert()` natifs, 4 « (Simulation) », pas de page tarifs, pas de drag & drop pipeline |
| Accessibilité | **35** | Pas d'audit axe, 51 dialogues bloquants, 34 `aria-*` pour 80 pages, aucune vérification clavier/contraste |
| Conformité (FR/DE/BE/LU) | **19** | XRechnung 2.2 (obsolète), Factur-X = ZIP+UBL (invalide), Peppol = `api.peppol.example`, anonymisation = no-op |
| Tests | **22** | 160 tests dont ~40 % tautologiques, 2 E2E conformité en `skip`, 0 test d'isolation multi-tenant |
| DevOps / CI | **12** | CI **rouge par construction** : `npm run lint` plante (exit 2), `npm run typecheck` échoue (6 erreurs) |
| Stripe | **37** | Webhook correct ; Connect non implémenté alors que promis ; carte uniquement ; downgrade sauvage |
| E-mail (Resend) | **44** | Envoi réel implémenté ; domaine sandbox par défaut, aucun webhook, aucune gestion de bounce |
| Positionnement commercial | **26** | Aucune preuve de différenciation ; la promesse « multi-pays » n'est pas implémentée |
| Production readiness | **15** | Voir B |

**Score composite pondéré : 29/100.**

---

## B. VERDICT GLOBAL

# `NON DÉPLOYABLE`

**Justification.** Trois blocages indépendants, chacun suffisant à lui seul :

1. **La CI ne peut pas passer sur ce commit.** `npm run lint` termine en **exit 2** (erreur fatale ESLint) et `npm run typecheck` remonte **6 erreurs TS**. Ces deux commandes sont les étapes 2 et 3 de `.github/workflows/test.yml`. Aucun build vert n'a donc pu valider ce commit.
2. **Trois IDOR inter-tenants prouvés** sur des routes de facturation, dont une qui **déclenche une transmission légale de facture** pour le compte d'une autre entreprise.
3. **Les montants monétaires sont stockés en `real` (float4)**. Une facture de 1 234 567,89 € est relue à 1 234 567,875 €. Un document comptable qui doit rester exact pendant 8 à 10 ans ne peut pas être stocké dans ce type.

Aucun de ces trois points ne relève de la configuration externe. Ils sont dans le code, à ce commit, et vérifiés par exécution.

> Le score « conformité 19/100 » n'autorise **aucune** affirmation commerciale de conformité (ni RGPD, ni e-invoicing, ni eIDAS, ni archivage probant) en l'état.

---

## C. TOP ANOMALIES PROUVÉES

| ID | Sév. | Domaine | Fichier / route | Problème | Impact | Preuve | Correctif |
|---|---|---|---|---|---|---|---|
| **MS-101** | **P0** | Multi-tenant | `src/app/api/invoices/[id]/download/route.ts:16-22` | `TODO: Verify user authentication` + `invoiceService.getById(id)` **non scopé** | Tout utilisateur authentifié télécharge le XML/ZIP de **n'importe quelle** facture de **n'importe quelle** organisation | Commentaire ligne 19-21 : *« use getById which bypasses org check but might be insecure »* | `requireSession()` → `findById(id, ctx.organizationId)` ; ou vérif. `clientId`/`recipientUserId` pour l'espace client |
| **MS-102** | **P0** | Multi-tenant | `src/app/api/invoices/[id]/send/route.ts:11-14` | `TODO: Add authorization checks` — aucune session | Tout utilisateur **déclenche l'émission** (Peppol/PDP/e-mail) d'une facture d'un tiers → transmission légale usurpée + fuite au client final | Fichier complet = 21 lignes, aucun import d'auth | `requireProfessional()` + scoping org avant `DeliveryService` |
| **MS-103** | **P0** | Multi-tenant / Stockage | `storage.service.ts:8-9` + `einvoice.service.ts:55` | Chemin `einvoices/{YYYY}/{M}/ubl_{number}.xml`, `upsert: true`, **aucun `organizationId`** | Deux organisations émettant `F-2026-0001` le même mois → **écrasement mutuel de la facture légale**, puis `download` sert le document de l'autre entreprise | Numérotation par org (`invoices_org_number_unique`) + format `F-{year}-{seq}` ⇒ collision certaine dès 2 clients | Préfixer par `organizationId`, `upsert: false`, nom = `{orgId}/{invoiceId}` |
| **MS-104** | **P0** | Finance / DB | `schema.ts:182-184, 234-237` | Montants en `real` (float4, ~7 chiffres significatifs) | Perte de centimes irréversible sur documents comptables scellés 8–10 ans | `node -e` : `1234567.89 → 1234567.875` (Δ **−0,015 €**) ; `99999.99 → 99999.9921875` | `numeric(14,2)` ou entier centimes + migration de reprise |
| **MS-105** | **P0** | Conformité | `retention.service.ts:51-76` | `anonymizeDocument()` **n'anonymise rien** : écrit `updatedAt`, puis insère `archivedDocuments{anonymized:true}` | Le produit **inscrit en base la preuve d'un contrôle inexistant** | Commentaire ligne 59 : *« Pour l'exemple, on log dans archivedDocuments que c'est anonymisé »* | Implémenter ou **retirer** la fonctionnalité et la mention |
| **MS-106** | **P0** | Sécurité | `api/retention/check/route.ts:5-20` | **`GET` qui mute** : anonymise en boucle tous les documents expirés, `requireSession()` seul (aucun rôle) | CSRF trivial (`<img src=…>`) → destruction de données ; tout membre déclenche l'irréversible | Méthode `GET`, `for (const doc of expired) await anonymizeDocument(...)`, aucun `POST`/token/dry-run | Passer en `POST` + `CRON_SECRET` + rôle admin + mode simulation |
| **MS-107** | **P0** | Sécurité | `api/admin/audit/route.ts:16` · `export/route.ts` | `// await rbac.require(session.userId, …, 'audit:view');` **commenté** | **Aucun RBAC n'est appliqué dans toute l'application** ; export d'audit ouvert à tout membre | Seuls appelants de `RBACService` ; les 2 ont le contrôle en commentaire | Activer, seeder rôles/permissions, tester |
| **MS-108** | **P0** | Sécurité | `mfa.service.ts` + `api/auth/mfa/*` | `mfaEnabled` **n'est lu par aucun chemin d'authentification** ; `mfaSecret` en **clair** ; `DELETE` désactive le MFA **sans ré-authentification** | Le MFA est purement décoratif ; désactivation par simple session volée | `grep mfaEnabled` → uniquement `MFASettings.tsx` et la page réglages | Utiliser le MFA Supabase (AAL2) ou chiffrer le secret + gate de session + codes de secours |
| **MS-109** | **P0** | Conformité | `xml-builder.ts:111` | `CustomizationID` = `xrechnung_2.2` | **XRechnung 3.0.2 est la version en vigueur (mai 2026)** → rejet par le validateur KoSIT et les portails DE | Recherche web ci-dessous | `…kosit:standard:xrechnung_3.0` + mise à jour des règles BR-DE |
| **MS-110** | **P0** | Conformité | `einvoice.service.ts:130-143` | « Factur-X » = **ZIP** contenant un **UBL** + un PDF factice de 63 octets | Factur-X/ZUGFeRD exige un **PDF/A-3 avec XML CII embarqué**. Le format produit n'est pas Factur-X | `mockPdfBuffer = Buffer.from('%PDF-1.4…%%EOF')`, `zip.file('factur-x.xml', xml)` où `xml` = UBL | Générer CII (UN/CEFACT) + PDF/A-3 (ZUGFeRD 2.5) ou déléguer à une lib certifiée |
| **MS-111** | **P0** | Conformité | `peppol.adapter.ts:17` · `pdp.adapter.ts:16` | Endpoints par défaut `https://api.peppol.example/send` et une URL Chorus Pro inexistante ; aucun AS4, SMP/SML, MLR/IMR | **Peppol et PDP sont ABSENTS.** Les utilisateurs belges sont en infraction **depuis le 1er janvier 2026** (sanctions appliquées depuis le 1er avril 2026 : 1 500/3 000/5 000 €) | Domaine `.example` réservé (RFC 2606) | Contrat avec un Access Point Peppol certifié + Plateforme Agréée immatriculée (FR) |
| **MS-112** | **P0** | Stripe | `payment.ts:10-35` vs `GUIDE_UTILISATEUR.md:62` | Le guide promet Stripe **Connect** ; le code crée un Checkout **sans** `transfer_data`, `on_behalf_of`, `application_fee_amount`, ni `stripeAccount` | **L'argent des clients finaux arrive sur le compte Stripe de MonService, pas sur celui du professionnel** → encaissement pour compte de tiers non encadré (PSD2), violation probable des CGU Stripe | `grep transfer_data\|on_behalf_of` → 0 résultat | Implémenter destination charges / separate charges & transfers, ou retirer la promesse |
| **MS-113** | **P0** | DevOps | `.eslintrc.json` + `package.json` | ESLint **8.57.1** avec `eslint-config-next@16.2.11` (flat config, ESLint 9 requis) | `npx eslint .` → `TypeError: Converting circular structure to JSON`, **exit 2**. Aucun lint n'a jamais tourné | Sortie complète capturée | Migrer vers `eslint.config.mjs` + ESLint 9 |
| **MS-114** | **P0** | DevOps | `.gitignore:/drizzle` | **0 migration versionnée** (`git ls-files drizzle` → vide) alors que `npm run db:migrate` cible `drizzle/postgres/0001_audit_p0_fixes.sql` | Dépôt **non reproductible** : un clone frais ne peut ni créer ni migrer la base. Les 7 politiques RLS ne sont pas dans le dépôt | `git ls-files drizzle \| wc -l` = 0 ; 26 fichiers présents sur disque uniquement | Retirer `/drizzle` du `.gitignore`, committer, ajouter un test de migration en CI |
| **MS-115** | **P0** | i18n / Produit | `src/i18n.ts` + `public/locales/{fr,de,nl,en}` | **`useTranslations`/`getTranslations` : 0 fichier** | 28 fichiers de traduction chargés et **jamais consommés**. Toute l'UI est en français codé en dur. La promesse « multi-pays FR/DE/BE/LU » n'existe pas dans l'interface | `grep -rl "useTranslations\|getTranslations" src \| wc -l` = **0** | Câbler next-intl page par page, ou retirer la promesse |
| **MS-116** | **P0** | Audit trail | `audit.service.ts` | `auditService.log()` **n'est appelé par aucun code métier** | La table `audit_logs` est **toujours vide** ; `/admin/audit-logs` et `/api/admin/audit` renvoient une liste vide en permanence. 17 événements partent en `console.info` uniquement (perdus à la rotation Netlify) | Seuls `new AuditService()` : les 2 routes de lecture | Écrire en base sur chaque mutation, table append-only (`REVOKE UPDATE, DELETE`) |
| **MS-117** | **P1** | Conformité | `tax.service.ts:36-46` | B2C transfrontalier : **toujours le taux du fournisseur** (`// OSS is a future enhancement`) | Facture FR→consommateur DE à 20 % au lieu de 19 % dès dépassement du seuil OSS de **10 000 €** (services TBE : dès le 1er euro) | Ligne 38 explicite | Implémenter OSS : seuil, taux destination, `vatCode` par pays |
| **MS-118** | **P1** | Conformité | `tax.service.ts:47-56` | `catch` → **taux 20 % par défaut** pour tout pays inconnu, `console.warn` seul | Fournisseur DE sans profil facture 20 % au lieu de 19 %. Erreur fiscale silencieuse | `rate: 20, // Default generic fallback` | Échouer bruyamment ; interdire l'émission sans profil pays valide |
| **MS-119** | **P1** | Conformité | `compliance.service.ts:7-19` | `getComplianceProfile(country)` **ignore la date** ; `InvoiceTaxData.transactionDate` n'est jamais utilisé ; `ORDER BY effectiveFrom DESC LIMIT 1` prend un profil **futur** | Le profil FR a `effectiveFrom: 2026-09-01` : toute facture antérieure reçoit des règles non encore en vigueur. Refacturation/avoir historique impossible | Fixture ligne 6 ; signature du service | `getComplianceProfile(country, atDate)` + `effectiveFrom <= atDate` |
| **MS-120** | **P1** | Conformité | `retention.service.ts:34-37` | `issueDate + N ans`, **sans** report à la fin de l'année civile | §147(4) AO / §14b UStG : le délai court à compter du **31 décembre** de l'année d'émission. Facture du 01/01/2023 → expiration calculée 11 mois trop tôt ⇒ suppression prématurée de pièce comptable | Code + recherche web | `new Date(year+N, 11, 31)` |
| **MS-121** | **P1** | Conformité | `country-retention.ts:7` | `case 'DE': return 8; // Sometimes 10 in Germany …, **but prompt says 8**` | **La règle légale a été fixée d'après un prompt, pas d'après la loi.** Contradiction avec la fixture (`DE: retentionYears: 10`) et avec `BE: 7` (fixture) vs `BE: 10` (code) | Commentaire textuel | Source unique, sourcée, datée, testée |
| **MS-122** | **P1** | Facture | `invoice.service.ts:151-176` | `generateNumber` : `ORDER BY number DESC` sur **texte**, `parseInt+1`, **hors transaction, sans verrou** | (a) double-clic ⇒ deux `F-2026-0005` ⇒ violation d'unicité ⇒ **500 utilisateur** ; (b) à 10 000 factures, `'F-2026-10000' < 'F-2026-9999'` ⇒ **collision de séquence**. Numérotation continue exigée (art. 242 nonies A CGI, §14 UStG) | Code + tri lexicographique | Séquence PostgreSQL par (org, type, année) dans la transaction de création |
| **MS-123** | **P1** | Conformité | `invoice.service.ts:178-205` + `xml-builder.ts` | `calculateTotals` **n'arrondit pas** à 2 décimales | Preuve exécutée : `taxAmount = 260.81174999999996` → émis tel quel dans `<cbc:TaxAmount>` ⇒ **rejet Schematron EN 16931 (BR-DEC-\*, max 2 décimales)** | `node -e` ci-dessous | Arrondi bancaire à 2 décimales, par ligne puis au total |
| **MS-124** | **P1** | Conformité | `xml-builder.ts` (intégral) | UBL non conforme EN 16931 : `InvoiceTypeCode` **avant** `ID`/`IssueDate` (ordre XSD violé) ; **`DocumentCurrencyCode` (BT-5) absent** ; pas de `TaxSubtotal` (BG-23) ; pas de `PaymentMeans`/IBAN ; pas de `BuyerReference` (BT-10, **obligatoire XRechnung**) ; codes TVA limités à `S`/`Z` (pas de `AE` autoliquidation, `K` intracom., `G` export) ; `currencyID: 'EUR'` et `unitCode: 'EA'` codés en dur | **Aucun XML généré ne passe une validation XSD, a fortiori Schematron.** L'autoliquidation est structurellement impossible à exprimer | Lecture intégrale du builder | Réécrire sur une bibliothèque EN 16931 éprouvée + validation Schematron en CI |
| **MS-125** | **P1** | RGPD | `gdpr.actions.ts:166-216` | Suppression de compte : **`auth.users` n'est pas supprimé** (admis l.223-227) ; les `clients` sont **supprimés** alors que `invoices.clientId` y pointe encore | (a) art. 17 non satisfait : e-mail conservé indéfiniment chez Supabase ; (b) **les factures conservées perdent les mentions obligatoires** (identité du client, art. 226 dir. 2006/112/CE) ⇒ pièces comptables invalides ; (c) références orphelines | Code + commentaire | Suppression `auth.users` via `service_role` ; dénormaliser les mentions légales sur la facture **avant** suppression |
| **MS-126** | **P1** | RGPD | `dsar.service.ts` | DSAR = **table de tickets** sans automatisation ; aucun mécanisme pour qu'un **client final** exerce ses droits sur les données détenues par le professionnel | Le sous-traitant (MonService) n'outille pas le responsable de traitement (le professionnel) pour répondre sous 30 jours | Service = 50 lignes CRUD | Workflow d'export/effacement par `clients.id` + horloge de délai + notifications |
| **MS-127** | **P1** | Tests | `__tests__/e2e/compliance.spec.ts:6,19` | Les **2 seuls** tests E2E de conformité sont `test.skip` | `npm run test:e2e:compliance` (étape CI dédiée) **passe en testant zéro chose** | `grep "\.skip"` | Retirer les `skip` ou retirer l'étape CI |
| **MS-128** | **P1** | Tests | `delivery.service.test.ts` | Les 4 tests n'atteignent **que la branche de simulation** (`NODE_ENV === 'test'`) | La sortie du run le prouve : `[Peppol] Sending invoice F-2026-0001`, `[Email] Simulating email…`. **Le chemin HTTP réel n'est jamais testé** | Sortie vitest capturée | Injecter le transport, tester avec `msw`/nock |
| **MS-129** | **P1** | Tests | `retention.service.test.ts:44-49` · `audit.service.test.ts:29-33` · `user.service.test.ts` | Assertions tautologiques : `expect(db.update).toHaveBeenCalled()` | Le test « should anonymize expired documents » **passe sur une fonction qui n'anonymise rien** (MS-105). Un test vert masque un placeholder | Code des tests | Asserter l'état final, pas l'appel du mock |
| **MS-130** | **P1** | Sécurité | `0002_supabase_auth_migration.sql` | **13 des 26 tables sans RLS** : `audit_logs`, `consent_events`, `data_subject_requests`, `breach_notifications`, `processing_activities`, `archived_documents`, `legal_entities`, `roles`, `permissions`, `role_permissions`, `user_roles`, `retention_policies`, `country_compliance_profiles` | La clé `publishable` est dans le bundle JS ⇒ lecture directe via PostgREST des registres RGPD, notifications de violation, entités légales (TVA/IBAN) de **toutes** les organisations | Migration : boucle sur 7 tables + 6 politiques nommées | RLS + politique sur **toutes** les tables ; test d'intégration anon/authenticated |
| **MS-131** | **P1** | Sécurité | `users_self_access` (RLS) + `mfaSecret` | La politique autorise `organization_id = current_organization_id()` en SELECT sur `users`, qui contient `mfa_secret` **en clair** | Lecture du secret TOTP d'un collègue via PostgREST ⇒ **contournement complet du 2FA** | Migration l.247-251 + `schema.ts` | Ne jamais exposer `mfa_secret` : colonne chiffrée + vue restreinte |
| **MS-132** | **P1** | Stripe | `webhook/route.ts:90-101, 121-131` | `customer.subscription.updated` ⇒ `subscription.metadata?.tier ?? '**free**'` ; `invoice.payment_failed` ⇒ tier **immédiatement `free`** | Toute mise à jour d'abonnement sans métadonnées **rétrograde le client en gratuit** ; un premier échec de prélèvement coupe le service avant la relance Stripe | Code | Lire le `price.id` de l'abonnement, pas les métadonnées ; conserver le tier en `past_due` |
| **MS-133** | **P1** | Stripe | `payment.ts:11` · `billing.ts:19` | `payment_method_types: ['card']` uniquement | Pas de **Bancontact** (BE), SEPA DD, iDEAL, giropay. Inadapté aux marchés visés | Code | `automatic_payment_methods: { enabled: true }` |
| **MS-134** | **P1** | E-mail | `email/index.ts:47` · `email.adapter.ts:10,19,41` | Expéditeur par défaut **`onboarding@resend.dev`** (bac à sable Resend : n'envoie qu'au propriétaire du compte) ; `re_mock_key` en repli ; destinataire de repli **`client@example.com`** ; expéditeur codé en dur `factures@monservice.com` | En production sans `EMAIL_FROM` : **aucun e-mail ne part**. `EMAIL_FROM` n'est ni validé dans `env.ts` ni présent dans `.env.example`. Une facture peut partir à `client@example.com` | Code | Rendre `EMAIL_FROM` obligatoire dans `env.ts`, échouer si absent, supprimer les replis |
| **MS-135** | **P1** | Produit | `plans.ts:57` (`teamMembers`) | Les plans facturent un quota `teamMembers` alors qu'**aucune table `organization_members` ni `invitations` n'existe** | Fonctionnalité **vendue et inexistante** (pratique commerciale trompeuse). Un `users.organizationId` unique, pas de rôles | `grep -n "invitation\|members" schema.ts` → 0 | Retirer du plan ou implémenter |
| **MS-136** | **P1** | Produit | Routes | **Aucune page de tarifs** (`/pricing`, `/tarifs`) | `plans.ts:10-12` affirme *« La page de tarifs et les contrôles serveur le consomment tous les deux »* — **la page n'existe pas**. Un SaaS sans page de prix ne convertit pas | `git ls-files src/app \| grep -i pricing` → vide | Créer la page depuis `PLANS` |
| **MS-137** | **P1** | SEO | `src/app/layout.tsx:41-45` | `hrefLang` vers `/fr`, `/de`, `/nl`, `/en` — **routes inexistantes** (i18n par cookie, pas de segment `[locale]`) | 5 balises alternates pointant vers des 404 ⇒ signal SEO négatif. Pas de `metadataBase`, pas d'OpenGraph, pas de JSON-LD ; 12 pages sur 80 ont un `metadata` | Code + liste des routes | Retirer les hreflang ou router par locale |
| **MS-138** | **P2** | Sécurité | `src/middleware/rate-limit.ts` | Fichier **jamais importé** | Aucune limitation de débit applicative (signature, DSAR, envoi de facture, `retention/check`) | `grep -rn rateLimit src` → 1 seule occurrence (la définition) | Câbler dans `proxy.ts` ou au niveau edge |
| **MS-139** | **P2** | UX | 51 occurrences | `alert(...)` natifs, dont 4 libellés **« (Simulation) »** exposés à l'utilisateur | `InvoiceDetail.tsx:38` *« Document envoyé par email avec succès ! (Simulation) »*, `:46` conversion devis→facture simulée, `AdvancedReports.tsx:90` PDF simulé | Code | Remplacer par `react-hot-toast` (déjà installé) et implémenter les actions |
| **MS-140** | **P2** | UX | `KanbanBoard.tsx:36` | *« Simulating drag and drop with simple buttons for now »* | Le pipeline CRM — cœur du produit — n'a pas de glisser-déposer, contrairement à Pipedrive/HubSpot | Commentaire | `dnd-kit` + accessibilité clavier |
| **MS-141** | **P2** | Conformité | 5 composants `src/components/settings/*` | `PrivacyRegister`, `ConsentManager`, `DSARManager`, `BreachManager`, `ReminderSettings` affichent des **`// Mock data`** | Les 5 écrans RGPD montrent des données fictives. `PrivacyRegister.tsx:14` : *« For now we mock the API response to demonstrate the UI »* | Code | Brancher sur les services réels |
| **MS-142** | **P2** | Conformité | `vat-validator.ts:66-76` | En développement, VIES renvoie `valid: true`, `name: 'MOCK COMPANY INC'` | Tout numéro de TVA est valide en dev ⇒ l'autoliquidation est testée sur un mock permissif ; aucun test du chemin VIES réel (indisponibilité, `MS_MAX_CONCURRENT_REQ`, timeout) | Code | Mock explicite injecté, pas conditionné par `NODE_ENV` |
| **MS-143** | **P2** | Qualité | `tsc --noEmit` | 6 erreurs : accès à `determineFormat` privé (×4, `compliance/einvoice.test.ts`), `db.set`/`db.where` inexistants (`dsar`, `privacy`) | Les tests **ne compilent pas** ; `npm test` échoue à la première étape | Sortie tsc capturée | Corriger ; rendre le typecheck bloquant |
| **MS-144** | **P2** | Dépôt | Racine | 14 scripts jetables versionnés (`fix_lint.js`, `fix_entities.js`, `test-db2.js`, `test-db3.js`, `drop-tables.js`, `sync-users.js`, …), `monservice.db` **suivi par git**, `database.sqlite` de 118 Ko présent | Bruit, risque de fuite, `drop-tables.js` exécutable par erreur | `git ls-files` | Supprimer / déplacer dans `scripts/` non versionné |
| **MS-145** | **P2** | Stripe | `index.ts:18` | `apiVersion = '2025-01-27.acacia' as Stripe.LatestApiVersion` — **cast forcé** avec `stripe@^22.3.2` | Le `as` masque une incompatibilité de version d'API ; comportements divergents silencieux | Code | Aligner sur la version épinglée par le SDK, sans cast |
| **MS-146** | **P3** | Stripe | Tout `src/lib/stripe/**` | Aucune **clé d'idempotence** sur les écritures Stripe | Double `POST /api/stripe/checkout` ⇒ deux sessions, deux abonnements possibles | `grep idempotency` → 0 | `{ idempotencyKey }` sur chaque création |
| **MS-147** | **P3** | Observabilité | Global | Aucun Sentry/OTel/APM ; `console.*` uniquement ; aucun alerting sur webhook, cron, e-mail ou paiement en échec | Une facture non transmise ou un webhook en 500 passe inaperçu | `grep -rn "sentry\|opentelemetry"` → 0 | Sentry + alertes sur `[audit]`/`[stripe]` |

---

## D. INVENTAIRE DES FONCTIONNALITÉS — STATUT RÉEL

Légende : ✅ PROUVÉ FONCTIONNEL · 🟡 IMPLÉMENTÉ NON VALIDÉ · 🟠 PARTIEL · ⛔ PLACEHOLDER/MOCK · ❌ ABSENT · 🔒 BLOQUÉ CONFIG EXTERNE · ❔ NON VÉRIFIABLE

### Socle
| Fonction | Statut | Preuve |
|---|---|---|
| Barrière périmétrique (`proxy.ts`) | ✅ | 18 tests `proxy-public-routes` verts ; build affiche `ƒ Proxy (Middleware)` |
| Contexte de session serveur (`requireSession`, `requireProfessional`) | ✅ | `getUser()` (pas `getSession()`), 8 tests `supabase-auth` verts, `cache()` par requête |
| Cloisonnement client/professionnel | ✅ | `(dashboard)/layout.tsx:14`, `client/layout.tsx:12` — côté serveur |
| Validation des variables d'env | 🟠 | `env.ts` valide 9 variables ; **manquent** `RESEND_API_KEY`, `EMAIL_FROM`, `SUPABASE_SERVICE_ROLE_KEY`, `PEPPOL_*`, `PDP_*`, `DATABASE_POOL_MAX` |
| En-têtes de sécurité | 🟡 | `next.config.ts` : CSP/HSTS/XFO/nosniff définis, mais CSP avec `unsafe-inline` + `unsafe-eval` ⇒ protection XSS quasi nulle |
| Limitation de débit | ❌ | `rate-limit.ts` jamais importé (MS-138) |
| RBAC / rôles / permissions | ⛔ | Tables + service existent, **les 2 appels sont commentés** (MS-107) |
| Équipe / invitations / membres | ❌ | Aucune table (MS-135) |
| MFA | ⛔ | Jamais appliqué, secret en clair, désactivation sans ré-auth (MS-108) |
| Journal d'audit | ⛔ | `auditService.log()` sans aucun appelant (MS-116) |
| i18n (FR/DE/NL/EN) | ⛔ | 0 usage de `useTranslations` (MS-115) |

### CRM
| Fonction | Statut | Preuve |
|---|---|---|
| Clients (CRUD + scoping) | 🟡 | `client.service.ts` scopé par org ; **aucun test d'isolation** |
| Contacts, Produits, Tâches, Calendrier | 🟡 | Services + pages présents ; non testés |
| Deals / pipeline | 🟠 | Kanban **sans drag & drop** (MS-140) ; pas de scoring, pas de prévisions |
| Recherche | 🟡 | `search.service.ts` présent, non testé |
| Rapports | 🟠 | `AdvancedReports.tsx:90` export PDF = `alert('… (Simulation)')` |
| Marketplace / demandes | 🟡 | Routes + RLS `requests` présentes ; `client_id = auth.uid()` alors que `requests.clientId` pointe vers `users.id` — cohérent ici, mais **incohérent avec `invoices.clientId`** qui pointe vers `clients.id` |
| Messagerie interne | 🟡 | RLS participants ; pas de pièces jointes, pas de temps réel |
| Modèles de message | 🟠 | `message-template.actions.ts:21` : `// TODO(P1) : implémenter` |

### Facturation
| Fonction | Statut | Preuve |
|---|---|---|
| Devis / factures CRUD | 🟠 | Fonctionnel mais montants en float (MS-104), numérotation fragile (MS-122) |
| Numérotation légale continue | ⛔ | Non garantie sous concurrence, collision à 10 000 (MS-122) |
| Calcul TVA domestique | 🟡 | 4 tests verts sur mock à taux unique |
| Autoliquidation intracom. B2B | 🟠 | Logique présente ; VIES mocké en dev (MS-142) ; **inexprimable en UBL** faute de code `AE` (MS-124) |
| TVA B2C transfrontalière / OSS | ❌ | `// OSS is a future enhancement` (MS-117) |
| Export hors UE, taux réduits, franchise en base, §19 UStG | ❌ | `determineVatTreatment` ne renvoie jamais que `vatStandard` |
| Avoirs / notes de crédit | ❌ | `type` ∈ {`invoice`,`quote`} uniquement |
| UBL EN 16931 | ⛔ | Non valide XSD ni Schematron (MS-124) |
| Factur-X / ZUGFeRD | ⛔ | ZIP+UBL+PDF factice (MS-110) |
| XRechnung | ⛔ | Version 2.2 obsolète, Leitweg-ID absente (MS-109) |
| Peppol BIS / réseau Peppol | ❌ | `api.peppol.example` (MS-111) |
| PDP / Plateforme Agréée (FR) | ❌ | URL Chorus Pro fictive ; **la terminologie officielle est désormais « Plateforme Agréée (PA) »** |
| **Réception** de factures électroniques | ❌ | **Aucun canal entrant.** Obligatoire pour tous en FR au **1ᵉʳ septembre 2026** (dans 20 jours) |
| Génération PDF de facture | ❌ | `download/route.ts:48` → `'Format non supporté'` ; `@react-pdf/renderer` installé, non utilisé sur ce chemin |
| Relances automatiques | 🟡 | `reminder.service.ts` + cron `x-cron-secret` ; jamais testé de bout en bout |
| Archivage probant (NF Z42-013 / GoBD) | ⛔ | `exportArchive` = ZIP de JSON ; ni WORM, ni horodatage, ni chaîne d'empreintes |
| Rétention légale | ⛔ | Calcul faux (MS-120), sources contradictoires (MS-121), anonymisation no-op (MS-105) |

### Paiement & abonnement
| Fonction | Statut | Preuve |
|---|---|---|
| Checkout abonnement | 🔒 | Code correct, `requireSession`, métadonnées serveur ; **dépend des Price IDs Dashboard** |
| Webhook Stripe (signature + idempotence) | ✅ | `constructEvent` sur corps brut, registre `stripe_events`, libération sur échec |
| Événements couverts | 🟠 | 4 seulement. **Manquent** `invoice.paid`, `invoice.payment_succeeded`, `charge.refunded`, `checkout.session.expired`, `customer.subscription.trial_will_end` |
| Downgrade / past_due | ⛔ | Rétrogradation abusive (MS-132) |
| Customer Portal | 🟡 | `createBillingPortalSession` existe ; 🔒 configuration Dashboard requise |
| Paiement de facture par le client | 🟠 | Fonctionne… **vers le compte de MonService** (MS-112) |
| Stripe Connect | ⛔ | `stripeAccountId` stocké, onboarding présent, **aucun flux de fonds** (MS-112) |
| Quotas par plan | ✅ | `quota.ts` contrôle côté serveur à l'écriture — un des rares contrôles réellement appliqués |
| Essai gratuit, prorata, remboursement, réactivation | ❌ | Aucun code |
| TVA sur l'abonnement MonService | 🔒 + ❌ | Pas d'`automatic_tax` ; MonService vend en B2B transfrontalier FR/DE/BE/LU |

### RGPD
| Fonction | Statut | Preuve |
|---|---|---|
| Export de mes données (art. 15/20) | ✅ | `exportMyDataAction` — JSON réel, scopé session |
| Aperçu avant suppression | ✅ | `getAccountDeletionPreviewAction` |
| Suppression de compte (art. 17) | 🟠 | `auth.users` conservé ; factures rendues invalides (MS-125) |
| Consentements | ⛔ | UI mockée (MS-141) ; table `consent_events` sans RLS |
| Registre des traitements | ⛔ | `PrivacyRegister.tsx:14` mock assumé |
| Notification de violation | ⛔ | `BreachManager.tsx:17` mock |
| DSAR | 🟠 | Table de tickets, aucune automatisation, pas d'accès pour le client final (MS-126) |
| Cookies / bannière de consentement | ❌ | Page `/cookies` informative ; **aucun mécanisme de consentement** |
| DPA / sous-traitants / transferts hors UE | ❔ | Aucun document dans le dépôt ; Supabase/Stripe/Resend sont des sous-traitants non documentés |

### Signature électronique
| Fonction | Statut | Preuve |
|---|---|---|
| Signature simple (SES) | 🟡 | `signature` (base64), `signatureIp`, `signedAt`, `userAgent`, immuabilité (`409` si déjà signé) — plausiblement **SES valide** au sens eIDAS |
| Signature avancée (AES) | ❌ | Pas de lien univoque au signataire sous son contrôle exclusif, pas de certificat |
| Signature qualifiée (QES) | ❌ | Aucun QTSP |
| PAdES / XAdES / CAdES | ❌ | Aucune occurrence |
| Horodatage qualifié | ❌ | `new Date().toISOString()` côté serveur |
| Piste d'audit de la signature | ⛔ | Uniquement `console.info('[audit] deal.signed')` — **la preuve disparaît** (MS-116) |
| Intégrité du document signé | ❌ | Aucun hachage du document au moment de la signature |

> **Conclusion eIDAS.** MonService peut légitimement annoncer une **signature électronique simple**. Toute mention de « signature sécurisée », « certifiée », « conforme eIDAS » (au sens AES/QES) ou « valeur probante » serait **infondée**. En l'état, la preuve n'est même pas conservée de façon durable, ce qui affaiblit aussi la SES en cas de contestation.

### IA / AI Act
| Fonction | Statut | Preuve |
|---|---|---|
| Tout système d'IA (LLM, scoring, classification, OCR, recommandation, agent) | ❌ **ABSENT** | `grep -rniE "openai\|anthropic\|claude\|gpt\|llm\|mistral\|embedding\|scoring\|predict\|recommend" src` → **0 résultat** |

**Analyse AI Act (règlement UE 2024/1689).** MonService ne met en œuvre **aucun** système d'IA. Il n'est donc ni fournisseur ni déployeur, et **aucune obligation ne s'applique** — y compris les obligations de transparence de l'**article 50, applicables depuis le 2 août 2026** (il y a 10 jours). Corollaire : toute mention d'« IA » dans un support commercial serait une **allégation sans objet**. Si une fonction d'IA est ajoutée, l'article 50 s'applique immédiatement ; les obligations « haut risque » Annexe III ont été **reportées au 2 décembre 2027** par le Digital Omnibus (accord provisoire du 7 mai 2026, adoption formelle pendante).

---

## E. MATRICE DES ROUTES (extraits critiques — 80 pages + 20 routes API inventoriées)

### Routes API — 20/20
| Route | Auth | Scoping org | Rôle | Vérifié | État |
|---|---|---|---|---|---|
| `POST /api/stripe/webhook` | Signature Stripe | n/a | n/a | ✅ | Correct |
| `POST /api/stripe/checkout` | `requireSession` | métadonnées serveur | ❌ aucun | ✅ | Correct (🔒 Price IDs) |
| `POST /api/stripe/create-payment` | `requireSession` | ✅ émetteur **ou** destinataire | ❌ | ⚠️ | `isRecipient = invoice.clientId === ctx.userId` compare un **`clients.id`** à un **`users.id`** ⇒ condition probablement toujours fausse ⇒ le client final ne peut pas payer |
| `POST /api/stripe/connect/onboarding` | `requireOrganization` | ✅ | ❌ | 🟡 | Flux de fonds absent (MS-112) |
| **`GET /api/invoices/[id]/download`** | **❌ AUCUNE** | **❌** | ❌ | ✅ | **MS-101 — P0** |
| **`POST /api/invoices/[id]/send`** | **❌ AUCUNE** | **❌** | ❌ | ✅ | **MS-102 — P0** |
| `GET /api/invoices/[id]/delivery-status` | ❌ | ❌ | ❌ | ✅ | IDOR lecture — P1 |
| `POST /api/quotes/sign` | `requireSession` | ⚠️ | plan | ⚠️ | `getById` non scopé puis contrôle ; `users … limit(1)` **sans `ORDER BY`** ⇒ plan du signataire non déterministe |
| `POST /api/deals/sign` | `requireOrganization` | ✅ | plan | ✅ | Le plus propre du lot |
| **`GET /api/retention/check`** | `requireSession` | ✅ | **❌** | ✅ | **MS-106 — P0 : GET mutant** |
| `GET /api/retention/export` | ❔ | ❔ | ❔ | 🟡 | À contrôler |
| `GET /api/reminders/check` | `CRON_SECRET` **ou** session | ✅ | ❌ | ✅ | Correct ; 🔒 `CRON_SECRET` + planificateur Netlify absent de `netlify.toml` |
| `GET /api/admin/audit` | `requireSession` | ✅ | **commenté** | ✅ | MS-107 |
| `GET /api/admin/audit/export` | `requireSession` | ✅ | **aucun** | ✅ | MS-107 |
| `POST/DELETE /api/auth/mfa` | `requireSession` | n/a | ❌ | ✅ | MS-108 |
| `POST /api/auth/mfa/verify` | `requireSession` | n/a | ❌ | ✅ | Pas d'anti-rejeu du code TOTP |
| `POST /api/privacy/consent` · `/dsar` · `/breach` | ❔ | ❔ | ❔ | 🟡 | UI mockée en amont (MS-141) |
| `GET /api/auth/callback` | public (Supabase) | n/a | n/a | 🟡 | Vérifier la validation de `next`/`redirect_to` (open redirect) |

### Pages — synthèse
- **Publiques (13)** : `/`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/forbidden`, `/demo`, `/conditions`, `/confidentialite`, `/mentions-legales`, `/cookies`, `/pro/[slug]`, `/devis/[id]/sign`.
  - ⚠️ `/cookies` **n'est pas** dans `PUBLIC_EXACT` de `proxy.ts:25-38` ⇒ **page légale inaccessible sans connexion**.
  - ⚠️ `/devis/[id]/sign` **n'est pas** public ⇒ un client non connecté ne peut pas signer un devis. Le parcours de signature externe est cassé.
- **Professionnel (≈52)** : protégées par `(dashboard)/layout.tsx` ✅
- **Client final (11)** : protégées par `client/layout.tsx` ✅
- **Admin (1)** : `/admin/audit-logs` — **hors de tout layout protégé**, `src/app/admin/` n'a pas de `layout.tsx`. Protection = `proxy.ts` (authentifié) uniquement, **aucun contrôle de rôle**. Affiche par ailleurs une table toujours vide (MS-116).

---

## F. MATRICE UTILISATEURS / RÔLES — ÉTAT RÉEL

| Action | Owner | Admin | Manager | Member | Client | Public |
|---|---|---|---|---|---|---|
| **Réalité mesurée** | — | — | — | — | — | — |

**Il n'existe que deux rôles effectifs : `profileType ∈ {professional, client}`.** Les tables `roles`, `permissions`, `role_permissions`, `user_roles` existent, `RBACService` est implémenté et testé (3 tests), et **aucun appel n'est actif** (MS-107). Aucune migration de seed n'est versionnée (MS-114).

| Action | professional | client | anonyme |
|---|:--:|:--:|:--:|
| CRUD clients/contacts/deals/produits/tâches (sa propre org) | ✅ | ⛔ redirigé | ⛔ |
| Créer devis/facture (quota appliqué) | ✅ | ⛔ | ⛔ |
| **Télécharger le XML d'une facture d'une autre org** | **⚠️ OUI** | **⚠️ OUI** | ⛔ |
| **Émettre (Peppol/PDP/e-mail) la facture d'une autre org** | **⚠️ OUI** | **⚠️ OUI** | ⛔ |
| Exporter le journal d'audit de son org | ✅ (sans rôle) | ⛔ | ⛔ |
| **Déclencher l'anonymisation de masse** | **⚠️ OUI, tout membre** | ⛔ | ⛔ |
| Payer une facture reçue | ✅ | ⚠️ voir `create-payment` | ⛔ |
| Signer un devis reçu | ✅ | ⚠️ `/devis/[id]/sign` non public | ⛔ |
| Exporter / supprimer ses données | ✅ | ✅ (partiel) | ⛔ |
| Voir un profil pro public | ✅ | ✅ | ✅ |

---

## G. MATRICE CONFORMITÉ — FR / DE / BE / LU / UE

| Exigence | Réalité vérifiée en droit (12/08/2026) | MonService | Statut |
|---|---|---|---|
| **FR — réception e-facture** | **Obligatoire pour tous les assujettis au 1ᵉʳ sept. 2026** (décret + arrêté du 27 juillet 2026) | Aucun canal entrant | ❌ **Non conforme dans 20 jours** |
| **FR — émission GE/ETI** | 1ᵉʳ sept. 2026 | — | ❌ |
| **FR — émission PME/TPE** | 1ᵉʳ sept. 2027, **report annoncé au 1ᵉʳ sept. 2028** sous réserve de décret | — | ❌ (délai) |
| **FR — Plateforme Agréée** | Terminologie officielle : **« Plateforme Agréée (PA) »**, immatriculée par l'État ; transit obligatoire | `pdp.adapter.ts` → URL fictive | ❌ |
| **FR — format** | Factur-X / CII / UBL EN 16931 | « Factur-X » = ZIP+UBL+PDF factice | ⛔ |
| **FR — conservation** | 10 ans (art. L123-22 C. com.) ; 6 ans fiscal (L102 B LPF) | 10 ans, **calcul faux** | 🟠 |
| **FR — archivage probant** | NF Z42-013 revendiquée par la fixture | ZIP de JSON | ⛔ |
| **DE — réception** | **Obligatoire depuis le 1ᵉʳ janv. 2025** (§14 UStG, Wachstumschancengesetz) | Absent | ❌ |
| **DE — émission** | 1ᵉʳ janv. 2027 (CA > 800 k€) · 1ᵉʳ janv. 2028 (≤ 800 k€) ; exemption §19 UStG (≤ 25 k€/100 k€) : réception seulement | Non modélisé | ❌ |
| **DE — formats** | XRechnung **3.0.2** (courant, mai 2026) ou ZUGFeRD ≥ 2.0.1 (**2.5** publiée le 20 mai 2026) | `xrechnung_2.2` | ⛔ **MS-109** |
| **DE — Leitweg-ID (BT-10)** | Obligatoire, rejet du portail sans elle | Absente du builder | ⛔ |
| **DE — conservation factures** | **8 ans** depuis le 1ᵉʳ janv. 2025 (BEG IV : §14b UStG + §147 AO) ; délai courant **à la fin de l'année civile** | Code 8 ans (« *but prompt says 8* »), fixture 10 ans, calcul sans report d'année | 🟠 contradictoire |
| **DE — GoBD** | Format structuré d'origine à conserver | Fichier stocké, mais chemin collisionnable (MS-103) | ⛔ |
| **BE — B2B e-invoicing** | **En vigueur depuis le 1ᵉʳ janv. 2026.** Peppol BIS Billing 3.0 (UBL 2.1), réseau Peppol obligatoire. Tolérance jusqu'au 31 mars 2026, **sanctions progressives depuis le 1ᵉʳ avril 2026 : 1 500 / 3 000 / 5 000 €** | `api.peppol.example`, fixture `einvoiceFormat: 'UBL'` | ❌ **Exposition à sanction immédiate** |
| **BE — e-reporting** | Janvier 2028 | Absent | ❌ (délai) |
| **BE — conservation** | 10 ans | Code 10, **fixture 7** | 🟠 contradictoire |
| **LU — B2G** | Obligatoire (loi 16/05/2019 mod. 13/12/2021), Peppol BIS 3.0, échelonné mai 2022 / oct. 2022 / mars 2023 | Fixture `einvoiceMandatory: false` ; `determineFormat` → **XRechnung** (format allemand) | ⛔ **Erreur de format** |
| **LU — B2B** | **Projet de loi seulement** (Conseil de gouvernement, 17 juillet 2026). Réception 1ᵉʳ janv. 2028 ; émission GE/ME 1ᵉʳ juil. 2028 ; reste 1ᵉʳ janv. 2029 ; modèle Peppol 4 coins | Non modélisé | ❌ (délai) |
| **UE — EN 16931** | Norme socle | XML non valide XSD (MS-124) | ⛔ |
| **UE — TVA taux standard** | FR 20 · DE 19 · BE 21 · LU 17 | Fixture conforme | ✅ |
| **UE — OSS / seuil 10 000 €** | Vente à distance intracom. + services TBE | `// future enhancement` | ❌ **MS-117** |
| **UE — autoliquidation (art. 44/196)** | Code TVA `AE` + mention obligatoire | Codes `S`/`Z` seulement | ⛔ |
| **UE — exonération export (art. 146)** | — | Retombe sur « domestic 20 % » | ❌ |
| **UE — mentions obligatoires (art. 226)** | Identité complète des parties | Détruites à la suppression de compte (MS-125) | ⛔ |
| **UE — ViDA** | Digital Reporting Requirements transfrontalier au **1ᵉʳ juillet 2030** | Non anticipé | ❌ (délai) |
| **UE — eIDAS / eIDAS 2 (2024/1183)** | SES / AES / QES ; seule la QES vaut signature manuscrite dans les 27 ; portefeuille EUDI dans chaque État membre **avant fin décembre 2026** | SES plausible, preuve non persistée | 🟠 |
| **UE — AI Act (2024/1689)** | Art. 50 transparence **applicable depuis le 2 août 2026** ; Annexe III haut risque reporté au 2 déc. 2027 | **Aucune IA** | n/a (hors périmètre) |
| **UE — RGPD** | Art. 15/17/20/30/33/35 | Export ✅ ; effacement 🟠 ; registre/violation/consentement ⛔ ; 13 tables sans RLS | ⛔ |

---

## H. MATRICE STRIPE

| Élément | Code | `env.ts` | `.env.example` | Dashboard | Webhook | Testé | Statut |
|---|---|---|---|---|---|---|---|
| `STRIPE_SECRET_KEY` | ✅ lazy | ✅ `sk_` optionnel | ✅ | 🔒 | — | ❌ | 🔒 |
| `STRIPE_WEBHOOK_SECRET` | ✅ | ✅ `whsec_` | ✅ | 🔒 | ✅ | ❌ | 🔒 |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ❌ **inutilisé** | ❌ | ✅ | 🔒 | — | ❌ | Variable morte |
| Price IDs (starter/pro/business) | ✅ | ✅ | ✅ | 🔒 | — | ❌ | 🔒 |
| Checkout abonnement | ✅ | — | — | 🔒 | ✅ | ❌ | 🔒 |
| Customer Portal | ✅ `billing.ts:51` | — | — | 🔒 **à activer** | — | ❌ | 🔒 |
| Vérification de signature | ✅ corps brut | — | — | — | ✅ | ❌ | ✅ code |
| Idempotence événements | ✅ `stripe_events` | — | — | — | ✅ | ❌ | 🟡 course SELECT→INSERT rattrapée par `catch` |
| Anti-rejeu | ✅ (tolérance 300 s de `constructEvent`) | — | — | — | ✅ | ❌ | ✅ |
| `checkout.session.completed` | ✅ | — | — | 🔒 | ✅ | ❌ | 🟡 |
| `customer.subscription.updated/deleted` | ✅ | — | — | 🔒 | ✅ | ❌ | ⚠️ MS-132 |
| `invoice.payment_failed` | ✅ | — | — | 🔒 | ✅ | ❌ | ⚠️ MS-132 |
| `invoice.paid`, `charge.refunded`, `checkout.session.expired`, `trial_will_end` | ❌ | — | — | — | ❌ | ❌ | ❌ |
| Prorata / upgrade / downgrade / réactivation / essai | ❌ | — | — | — | — | ❌ | ❌ |
| Remboursement | ❌ | — | — | — | ❌ | ❌ | ❌ |
| SCA / 3-D Secure | Délégué à Checkout | — | — | 🔒 | — | ❌ | 🔒 |
| Moyens de paiement | ⚠️ `['card']` | — | — | 🔒 | — | ❌ | ❌ MS-133 |
| Devises | ⚠️ `'eur'` en dur | — | — | — | — | ❌ | ❌ |
| TVA (`automatic_tax`) | ❌ | — | — | 🔒 | — | ❌ | ❌ |
| **Stripe Connect** | ⛔ onboarding seul | ❌ | ❌ | 🔒 | ❌ | ❌ | ⛔ **MS-112** |
| Clés d'idempotence API | ❌ | — | — | — | — | ❌ | ❌ MS-146 |

**À contrôler dans le Dashboard Stripe** (`BLOQUÉ PAR CONFIGURATION EXTERNE`) : existence et cohérence des 3 produits/tarifs vs `PLANS`, devises, activation du Customer Portal, activation Connect + type de comptes, branding, business profile, coordonnées et politique de remboursement (exigées pour la validation du compte), endpoint webhook **production** + secret distinct du test, bascule clés live, `automatic_tax` + Stripe Tax, moyens de paiement par pays (Bancontact BE, SEPA DD, giropay/Sofort DE), e-mails automatiques, facturation Stripe pour l'abonnement MonService.

---

## I. MATRICE RESEND

| Élément | Code | `env.ts` | `.env.example` | DNS | Webhook | Testé | Statut |
|---|---|---|---|---|---|---|---|
| `RESEND_API_KEY` | ✅ | **❌ non validée** | ✅ (marquée *« NON IMPLÉMENTÉ »* — **faux**, l'envoi est implémenté) | — | — | ❌ | 🟡 doc contradictoire |
| `EMAIL_FROM` | ✅ | **❌** | **❌ absente** | — | — | ❌ | ⚠️ MS-134 |
| Expéditeur par défaut | ⚠️ `onboarding@resend.dev` (bac à sable) | — | — | ❌ | — | ❌ | ⛔ prod |
| Second expéditeur codé en dur | ⚠️ `factures@monservice.com` (`email.adapter.ts:41`) | — | — | 🔒 | — | ❌ | Incohérent |
| Repli clé | ⚠️ `re_mock_key` | — | — | — | — | ❌ | ⛔ |
| Destinataire de repli | ⚠️ **`client@example.com`** | — | — | — | — | ❌ | ⛔ P1 |
| Mode dégradé explicite | ✅ `{sent:false, skipped:true}` | — | — | — | — | ❌ | ✅ bonne pratique |
| Versions HTML + texte | ✅ `htmlToText()` | — | — | — | — | ❌ | ✅ |
| Mentions légales en pied | ✅ via `legalService` | — | — | — | — | ❌ | ✅ |
| Timeout | ✅ 10 s | — | — | — | — | ❌ | ✅ |
| Pièces jointes | ✅ base64 | — | — | — | — | ❌ | 🟡 |
| SPF / DKIM / DMARC / sous-domaine | — | — | — | 🔒 **non vérifiable** | — | ❌ | 🔒 |
| **Webhooks Resend** (`delivered`, `bounced`, `complained`, `delayed`, `opened`, `clicked`) | **❌ AUCUN** | — | — | — | ❌ | ❌ | ❌ |
| Gestion des bounces / suppression list | ❌ | — | — | — | — | ❌ | ❌ |
| Désabonnement marketing / `List-Unsubscribe` | ❌ | — | — | — | — | ❌ | ❌ |
| Distinction transactionnel / marketing | ❌ | — | — | — | — | ❌ | ❌ |
| i18n des e-mails | ⚠️ `email.adapter.ts:20` : `const language = 'fr'; // TODO` | — | — | — | — | ❌ | ⛔ |
| Confidentialité des logs | ✅ e-mails loggués, pas de contenu | — | — | — | — | ❌ | 🟡 (adresses = données perso en logs) |

**À contrôler dans Resend + DNS** : domaine d'envoi vérifié (statut *verified*), enregistrements SPF (`include:amazonses.com`), DKIM (3 CNAME), DMARC (`p=quarantine` minimum), sous-domaine dédié (`mail.` ou `send.`), reply-to, réputation, endpoint webhook + secret de signature, liste de suppression.

> **Rappel MS-041.** Un `200 OK` de `POST /emails` signifie « accepté par Resend », pas « délivré ». Sans webhook, MonService **ne peut pas savoir** qu'une facture n'a pas été reçue. Pour un produit de facturation, c'est un défaut fonctionnel majeur.

---

## J. BENCHMARK CONCURRENTIEL (août 2026)

| Fonction | MonService | Odoo | HubSpot | Salesforce | Zoho CRM | Pipedrive | Axonaut | Sellsy | Teamleader | Freshsales | Dynamics 365 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Contacts / entreprises | 🟡 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Pipeline drag & drop | ⛔ boutons | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Lead scoring | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | 🟡 | 🟡 | ✅ | ✅ |
| Automatisations / workflows | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | ✅ | ✅ | ✅ | ✅ |
| E-mail tracking / séquences | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | ✅ | ✅ | ✅ | ✅ |
| Téléphonie / VoIP | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | 🟡 | 🟡 | ✅ | ✅ |
| Devis + signature | 🟡 SES | ✅ | ✅ | ✅ | ✅ | 🟡 | ✅ | ✅ | ✅ | 🟡 | ✅ |
| Facturation | 🟠 float | ✅ | 🟡 | 🟡 | ✅ | 🟡 | ✅ | ✅ | ✅ | 🟡 | ✅ |
| **E-invoicing FR (PA/PDP)** | ❌ | ✅ | ❌ | 🟡 | 🟡 | ❌ | ✅ | ✅ | 🟡 | ❌ | ✅ |
| **E-invoicing BE (Peppol, obligatoire)** | ❌ | ✅ | ❌ | 🟡 | 🟡 | ❌ | 🟡 | 🟡 | ✅ | ❌ | ✅ |
| **XRechnung / ZUGFeRD DE** | ⛔ v2.2 | ✅ | ❌ | 🟡 | 🟡 | ❌ | 🟡 | 🟡 | 🟡 | ❌ | ✅ |
| Paiement en ligne | 🟠 mauvais compte | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Portail client | 🟡 | ✅ | ✅ | ✅ | ✅ | 🟡 | ✅ | ✅ | ✅ | 🟡 | ✅ |
| Tickets / support | ❌ | ✅ | ✅ | ✅ | ✅ | 🟡 | ❌ | 🟡 | ✅ | ✅ | ✅ |
| Reporting / dashboards | 🟠 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| API publique | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Webhooks sortants | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Marketplace / intégrations | 🟡 interne | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | 🟡 | ✅ | ✅ | ✅ |
| IA | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | 🟡 | 🟡 | ✅ | ✅ |
| Mobile natif | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Champs personnalisés | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Permissions granulaires | ⛔ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Multi-utilisateur / équipe | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Import / export | 🟠 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Multilingue UI | ⛔ FR en dur | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | 🟡 | ✅ | ✅ | ✅ |

**Lecture.** MonService ne dépasse aucun concurrent sur aucune ligne. Sur les trois lignes qui pourraient constituer un avantage — e-invoicing FR, BE et DE — MonService est **en dessous** d'Axonaut, Sellsy, Teamleader et Odoo, qui livrent aujourd'hui du Peppol réel.

---

## K. VALEUR AJOUTÉE — ÉVALUATION HONNÊTE

**Hypothèse à tester :** *« CRM/gestion commerciale européen tout-en-un, simple pour indépendants, agences, consultants et PME, combinant CRM + devis + factures + paiements + conformité européenne multi-pays. »*

### Verdict : **hypothèse NON défendable en l'état.**

Le seul pilier différenciant de cette proposition est la **conformité européenne multi-pays**. C'est précisément le pilier le plus faible du produit :

| Pilier de la promesse | Réalité | Défendable ? |
|---|---|---|
| « tout-en-un » | Pas d'équipe, pas d'API, pas de webhooks, pas de champs personnalisés, pas de mobile, pas de tickets | ❌ |
| « simple » | Crédible — l'arborescence `/facturation`, `/agenda`, `/parametres` est plus lisible qu'Odoo | 🟡 **seul actif réel** |
| « CRM » | Pipeline sans drag & drop, sans automatisation, sans scoring | ❌ |
| « devis + factures » | Fonctionne, mais montants en float et numérotation non légale | ❌ |
| « paiements » | Argent sur le mauvais compte | ❌ |
| « conformité européenne multi-pays » | UI 100 % française, XRechnung obsolète, Peppol absent, anonymisation factice | ❌ |

### Ce qui a réellement de la valeur dans ce dépôt
1. **`src/lib/auth/session.ts`** — le socle d'identité est de très bonne qualité : `getUser()` et non `getSession()`, `cache()` par requête, refus explicite de deviner un profil manquant, doctrine documentée. C'est un actif réutilisable.
2. **`src/lib/billing/quota.ts`** — quotas appliqués côté serveur à l'écriture. Rare et correct.
3. **`api/stripe/webhook`** — signature + idempotence + libération sur échec. Correct.
4. **`src/proxy.ts`** — commentaire `MS-001` sur le préfixe `'/'` : la classe de bug est documentée et testée (18 tests). Bonne hygiène.
5. **La discipline de commentaires « anomalie MS-xxx »** — le code explique *pourquoi*. C'est un vrai différenciateur de maintenabilité.

### La seule fenêtre stratégique réelle
Le 1ᵉʳ septembre 2026 (dans 20 jours), **toutes** les entreprises françaises assujetties doivent pouvoir **recevoir** une facture électronique ; la Belgique sanctionne déjà. Des centaines de milliers de TPE/indépendants FR n'ont aucune solution. Un produit qui ferait **une seule chose parfaitement** — recevoir, valider et archiver des factures électroniques conformes via une Plateforme Agréée, pour un indépendant français — aurait un marché immédiat.

MonService a construit 80 pages de CRM et **zéro capacité de réception**. La priorité est inversée par rapport à la seule opportunité défendable.

### Coûts et frictions non chiffrés dans le projet
- Access Point Peppol certifié : coût récurrent + par document.
- Plateforme Agréée FR : immatriculation ou revente.
- QTSP pour AES/QES : coût par signature.
- Coût de sortie (switching cost) actuel : **nul** — pas d'API, pas d'intégrations, pas de données propriétaires. Rien ne retient un client.

---

## L. DETTE TECHNIQUE

**P0 — bloquants absolus (18)** : MS-101 → MS-116 (IDOR ×3, float monétaire, anonymisation factice, GET mutant, RBAC désactivé, MFA décoratif, XRechnung obsolète, Factur-X invalide, Peppol/PDP absents, Connect absent, lint cassé, migrations non versionnées, i18n morte, audit trail vide).

**P1 — majeurs (21)** : MS-117 → MS-137 (OSS, repli 20 %, profil pays non daté, rétention mal calculée, sources légales contradictoires, numérotation, arrondis, UBL non conforme, RGPD effacement, DSAR, E2E skip, tests tautologiques, 13 tables sans RLS, `mfa_secret` lisible, downgrade Stripe, moyens de paiement, Resend, `teamMembers` fantôme, page tarifs, hreflang).

**P2 — importants (10)** : MS-138 → MS-147, plus :
- `src/app/actions/dashboard.ts` **et** `dashboard.actions.ts`, `notification.ts` **et** `notification.actions.ts` — doublons de modules.
- `client.actions.ts:15` : `TODO(P2) : retirer ces paramètres`.
- `mentions-legales/page.tsx:3` : `// Mock implementation for now` sur la géolocalisation.
- `einvoice-templates.ts:4` : interface « étendue temporairement ».
- `vitest.config.ts` en CJS avec syntaxe ESM (avertissement Vite à chaque run).
- `database.sqlite` (118 Ko) et `monservice.db` présents alors que SQLite est officiellement abandonné.
- `assertFeature` importé et non utilisé dans `quotes/sign/route.ts` (le lint l'aurait vu — s'il fonctionnait).

**P3 — améliorations** : CSP à base de nonces, pooling `max: 1` (goulot en serverless), pas de pagination sur les listes (`findAll(organizationId)` sans `LIMIT` → dégradation linéaire), pas d'index sur `invoices.status`/`dueDate` (utilisés par les relances), `orderBy(sql\`... DESC\`)` sur du texte pour les logs d'audit.

---

## M. DETTE PRODUIT — pour devenir compétitif

**Indispensable avant toute vente**
1. Multi-utilisateur : `organization_members` + `invitations` + RBAC activé (aujourd'hui facturé, inexistant).
2. Page de tarifs + tunnel d'abonnement complet.
3. Drag & drop du pipeline (attente de base, y compris chez Pipedrive gratuit).
4. Génération PDF réelle des devis et factures (`@react-pdf/renderer` est déjà installé).
5. Suppression des 51 `alert()` et des 4 « (Simulation) » visibles utilisateur.
6. Réception de factures électroniques (la seule urgence réglementaire).

**Nécessaire pour la parité**
7. API publique + webhooks sortants + clés d'API.
8. Champs personnalisés.
9. Import CSV/Excel avec mapping et prévisualisation.
10. Automatisations simples (déclencheur → action).
11. Séquences d'e-mails et suivi d'ouverture.
12. Application mobile ou PWA installable.
13. Avoirs / notes de crédit (bloquant légal, pas seulement produit).

**Différenciant possible**
14. Multi-pays réel : UI DE/NL, formats et règles fiscales par pays, validation Schematron visible dans l'interface.
15. Tableau de bord de conformité : « êtes-vous prêt pour le 1ᵉʳ septembre 2026 ? » avec statut par obligation.

---

## N. DETTE CONFORMITÉ — ce qui interdit toute affirmation commerciale

Aucune des mentions suivantes ne peut être employée aujourd'hui :

| Mention interdite | Ce qui manque |
|---|---|
| « Conforme à la facturation électronique » | Peppol réel, Plateforme Agréée immatriculée, XRechnung 3.0.2, Factur-X en PDF/A-3 + CII, validation Schematron, canal de réception |
| « Peppol opérationnel » | Access Point certifié, AS4, recherche SMP/SML, accusés MLR/IMR, gestion d'erreur, test bout en bout. Aujourd'hui : `api.peppol.example` |
| « Conforme RGPD » | Registre réel (non mocké), preuve de consentement, notification de violation, effacement complet (`auth.users`), RLS sur les 13 tables manquantes, DPA sous-traitants, journal d'audit persistant |
| « Signature électronique sécurisée / certifiée / eIDAS » | AES ou QES via QTSP, PAdES/XAdES, horodatage qualifié, empreinte du document, preuve conservée |
| « Archivage à valeur probante / NF Z42-013 / GoBD » | WORM, chaîne d'empreintes, horodatage, journal d'intégrité, restitution auditée |
| « MFA / 2FA » | Application du second facteur à l'authentification, secret chiffré, codes de secours |
| « Multi-pays / multilingue » | Un seul appel à `useTranslations` |
| « Conformité TVA européenne » | OSS, taux réduits, export, franchise en base, §19 UStG, profils datés |
| « Journal d'audit / traçabilité » | Un appel à `auditService.log()` |
| « Paiement pour le compte du professionnel » | Stripe Connect avec flux de fonds |
| « Conforme AI Act » | Sans objet : aucune IA. À ne pas mentionner du tout |

---

## O. TESTS MANQUANTS

**Unitaires**
- Isolation multi-tenant : pour chacun des 12 services, `orgA` ne lit/écrit/supprime jamais une ressource de `orgB`.
- `tax.service` : BE 21 %, DE 19 %, LU 17 %, taux réduits, B2C > seuil OSS, B2C services TBE, export hors UE, franchise en base FR, §19 UStG, profil manquant (doit **échouer**, pas retomber sur 20 %).
- `retention` : report à la fin de l'année civile, DE 8 ans, BE 10 ans, `anonymizeDocument` **doit prouver l'effacement des PII**.
- `invoice.service` : arrondis à 2 décimales, séquence sous concurrence, `real` → `numeric`.
- `rbac` : matrice complète avec la vraie base (pas des mocks fabriqués).

**Intégration (base réelle, pas de mock de `db`)**
- Migrations rejouables de zéro (impossible aujourd'hui : MS-114).
- RLS : requête PostgREST en `anon` et en `authenticated` sur les 26 tables.
- Webhook Stripe : rejeu, désordre, signature invalide, deux Checkout concurrents.
- Suppression de compte : état final de `auth.users`, `clients`, `invoices`.
- Collision de stockage : deux orgs, même numéro de facture, même mois.

**E2E**
- Retirer les 2 `test.skip` de `compliance.spec.ts`.
- Seed versionné (les comptes `client@monservice.com` / `freelance@monservice.com` de `rbac.spec.ts` n'existent nulle part → ces tests échouent en CI).
- Parcours client complet **non connecté** : réception du devis → `/devis/[id]/sign` (aujourd'hui non public) → signature → paiement.
- Supprimer les assertions molles (`.catch(() => {})`, `if (await isVisible())`, `expect(url).not.toBe(...)`).

**Sécurité**
- Tests IDOR automatisés sur les 20 routes API (`orgA` → ressource `orgB` ⇒ 403/404).
- CSRF sur tous les mutateurs.
- Open redirect sur `/auth/callback`.
- Brute force / rate limiting.
- Enumération d'utilisateurs sur `/register` et `/forgot-password`.

**Conformité**
- Validation **XSD + Schematron** EN 16931 / Peppol BIS / XRechnung 3.0.2 en CI sur des factures générées (le seul test qui prouverait quoi que ce soit sur l'e-invoicing).
- Comparaison des XML produits aux 4 fixtures `fr/de/be/lu-invoice.json`.

**Accessibilité**
- `@axe-core/playwright` sur les 20 pages principales, WCAG 2.2 AA.
- Navigation clavier seule : `Tab`/`Shift+Tab`/`Enter`/`Escape`, focus visible, pièges de focus dans les modales.
- Zoom 200 % et 400 %, contrastes, hiérarchie des titres, ordre de lecture.

---

## P. PLAN DE CORRECTION — ordre imposé par les dépendances

### Vague 0 — Rendre le dépôt auditable (1–2 jours) — *rien d'autre n'est fiable avant*
1. Retirer `/drizzle` du `.gitignore`, committer les 26 migrations (**MS-114**).
2. Migrer ESLint 9 + flat config ; `npx eslint .` doit rendre 0 (**MS-113**).
3. Corriger les 6 erreurs TS (**MS-143**).
4. Rendre `lint` et `typecheck` bloquants ; ajouter `DATABASE_URL` aux steps CI ; obtenir **le premier build vert**.
5. Supprimer les 14 scripts jetables, `database.sqlite`, `monservice.db` (**MS-144**).

### Vague 1 — Colmater les fuites de données (3–5 jours)
6. `MS-101`, `MS-102`, `MS-103` (IDOR + collision de stockage) + tests IDOR sur les 20 routes.
7. `MS-106` : `GET /api/retention/check` → `POST` + `CRON_SECRET` + rôle + dry-run.
8. `MS-130` : RLS sur les 13 tables restantes + test PostgREST anon/authenticated.
9. `MS-131` : retirer `mfa_secret` de la portée de la politique `users`, chiffrer la colonne.
10. `MS-107` : activer le RBAC, seeder rôles/permissions dans une migration versionnée.
11. `MS-108` : MFA — appliquer ou **retirer l'écran** et la mention.

### Vague 2 — Intégrité financière (5–8 jours) — *dépend de la vague 0 pour la migration*
12. `MS-104` : `real` → `numeric(14,2)` (ou centimes), migration de reprise, recalcul.
13. `MS-123` : arrondi bancaire à 2 décimales par ligne puis au total.
14. `MS-122` : séquences PostgreSQL par (org, type, année), dans la transaction.
15. `MS-112` : Stripe Connect avec flux de fonds réel, **ou** retirer la promesse du guide.
16. `MS-132`, `MS-133`, `MS-146` : downgrade, moyens de paiement, idempotence.

### Vague 3 — Vérité de la conformité (2–4 semaines)
17. **Décision produit préalable** : soit livrer l'e-invoicing pour de vrai, soit retirer **toutes** les mentions (section N). Ne pas laisser l'ambiguïté.
18. `MS-105` : implémenter l'anonymisation ou supprimer la fonction et la table `archivedDocuments`. *Ne jamais écrire `anonymized: true` sans anonymiser.*
19. `MS-120`, `MS-121`, `MS-119` : source légale unique, datée, sourcée ; profils pays historisés.
20. `MS-124`, `MS-109`, `MS-110` : réécrire la génération sur une bibliothèque EN 16931, XRechnung 3.0.2, Factur-X = PDF/A-3 + CII ; **validation Schematron en CI**.
21. `MS-111` : contractualiser un Access Point Peppol certifié et une Plateforme Agréée FR. **Livrer la réception avant l'émission.**
22. `MS-117`, `MS-118` : OSS + échec bruyant si profil pays absent.
23. `MS-125`, `MS-126` : effacement complet (`auth.users` via `service_role`), dénormaliser les mentions légales sur la facture avant suppression, workflow DSAR pour le client final.
24. `MS-141` : brancher les 5 écrans RGPD ou les retirer.
25. `MS-116` : journal d'audit persistant, append-only (`REVOKE UPDATE, DELETE`), sur chaque mutation.

### Vague 4 — Produit vendable (4–8 semaines)
26. `MS-115` : câbler next-intl ; DE et NL réellement disponibles.
27. `MS-135` : équipe + invitations (aujourd'hui facturé).
28. `MS-136` : page de tarifs.
29. `MS-137` : SEO — `metadataBase`, OpenGraph, JSON-LD, retirer les hreflang morts.
30. `MS-139`, `MS-140` : toasts au lieu d'`alert()`, drag & drop, PDF réel.
31. Audit d'accessibilité axe + corrections WCAG 2.2 AA.
32. `MS-147` : Sentry + alertes webhook/cron/e-mail/paiement.

### Vague 5 — Différenciation
33. API publique + webhooks + champs personnalisés + import.
34. Tableau de bord de conformité par pays.

---

## Réserves de méthode — ce que cet audit N'A PAS pu vérifier

Marqué `BLOQUÉ PAR CONFIGURATION EXTERNE` ou `NON VÉRIFIABLE`, avec la vérification exacte à faire :

| Sujet | Vérification requise | Où |
|---|---|---|
| État réel de la base déployée | `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public' ORDER BY rowsecurity;` puis `SELECT * FROM pg_policies WHERE schemaname='public';` | SQL Editor Supabase |
| Exposition PostgREST des 13 tables sans RLS | `curl "$SUPABASE_URL/rest/v1/audit_logs?select=*" -H "apikey: <publishable>"` — **si ça renvoie des lignes, c'est une violation de données notifiable sous 72 h** | Terminal |
| Types de colonnes réellement déployés | `SELECT column_name, data_type, numeric_precision FROM information_schema.columns WHERE table_name='invoices';` | Supabase |
| Politiques du bucket `einvoices` | Storage → Policies | Dashboard Supabase |
| Domaine Resend, SPF/DKIM/DMARC | Statut *verified* + `dig TXT`/`dig CNAME` | Resend + DNS |
| Produits, tarifs, webhook prod, Connect, Stripe Tax | Voir la liste en fin de section H | Dashboard Stripe |
| Variables d'environnement de production | Présence de `EMAIL_FROM`, `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, absence de secret en `NEXT_PUBLIC_*` | Netlify → Environment |
| Planificateur des relances | `netlify.toml` **ne définit aucun cron** ; `/api/reminders/check` n'est donc jamais appelé automatiquement | Netlify → Functions/Scheduled |
| Secrets dans l'historique Git | `git log --all -p -- .env* \| grep -iE "sk_live\|whsec_\|re_\|service_role"` (non exécuté sur l'historique complet) | Local |
| Accessibilité mesurée | `@axe-core/playwright` sur 20 pages | CI |
| Performance réelle, N+1, listes à 10 000 lignes | Base peuplée requise | Préproduction |
| `/api/retention/export`, `/api/privacy/*` | Lecture ligne à ligne non effectuée | Code |

---

## Sources

**Facturation électronique**
- [Calendrier facturation électronique 2026-2027 — Cegid](https://www.cegid.com/fr/facture-electronique-obligatoire/calendrier-facture-electronique/)
- [Facturation électronique : décret et arrêté du 27 juillet 2026 — Compta Online](https://www.compta-online.com/facturation-electronique-ao5562)
- [Calendrier facture électronique — Pennylane](https://www.pennylane.com/fr/fiches-pratiques/facture-electronique/facturation-electronique-dates-cles-et-calendrier)
- [Belgium's mandatory e-invoicing from 1 January 2026 — EY](https://www.ey.com/en_gl/technical/tax-alerts/belgium-s-mandatory-e-invoicing-to-apply-from-1-january-2026)
- [eInvoicing in Belgium — Commission européenne](https://ec.europa.eu/digital-building-blocks/sites/spaces/DIGITAL/pages/467108877/eInvoicing+in+Belgium)
- [Belgium B2B e-invoicing mandate 2026 — Avalara](https://www.avalara.com/blog/en/europe/2025/07/belgium-e-invoicing-mandate-2026-updates.html)
- [eInvoicing in Germany — Commission européenne](https://ec.europa.eu/digital-building-blocks/sites/spaces/DIGITAL/pages/467108886/eInvoicing+in+Germany)
- [Germany B2B e-Invoicing Mandate — EDICOM](https://edicomgroup.com/blog/germany-b2b-electronic-invoice)
- [Luxembourg's e-invoicing mandate takes shape — KPMG Luxembourg](https://kpmg.com/lu/en/insights/regulatory-updates/luxembourgs-b2b-e-invoicing-mandate-takes-shape.html)
- [Luxembourg formalises mandatory B2B e-invoicing over Peppol — VATupdate](https://www.vatupdate.com/2026/07/23/luxembourg-formalises-mandatory-b2b-e-invoicing-over-a-peppol-four-corner-network/)

**Formats**
- [Neue Version Standard XRechnung 3.0.1 — E-Rechnung Bund](https://e-rechnung-bund.de/en/new-version-xrechnung-standard-3-0-1-available/)
- [Versionen und Bundles der XRechnung — XStandards Einkauf](https://xeinkauf.de/xrechnung/versionen-und-bundles/)
- [KoSIT Validator Error Codes: BR-DE XRechnung Validation](https://www.invoice-converter.com/en/blog/kosit-validator-error-codes)

**Conservation**
- [§ 147 AO — dejure.org](https://dejure.org/gesetze/AO/147.html)
- [Steuerrechtliche Aufbewahrungsfristen — IHK Berlin](https://www.ihk.de/berlin/service-und-beratung/recht-und-steuern/steuern-und-finanzen/download/aufbewahrungsfristen-4405822)
- [Aufbewahrungsfrist für Buchungsbelege von zehn auf acht Jahre reduziert — BBS Baden](https://bbsbaden.de/news-details/aufbewahrungsfrist-f%C3%BCr-buchungsbelege-von-zehn-auf-acht-jahre-reduziert)

**eIDAS**
- [Regulation (EU) 2024/1183 — Wikipedia](https://en.wikipedia.org/wiki/Regulation_(EU)_2024/1183)
- [eIDAS 2: key legal changes for EU businesses — Signaturit](https://www.signaturit.com/blog/eidas-2-regulation/)
- [What is eIDAS 2? — Entrust](https://www.entrust.com/resources/learn/eidas-2)

**AI Act**
- [AI Act — Commission européenne](https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai)
- [EU AI Act summary, mise à jour janvier 2026 — SIG](https://www.softwareimprovementgroup.com/blog/eu-ai-act-summary/)
- [EU AI Act 2026: deadlines, rules & what applies now — Law & More](https://lawandmore.eu/eu-artificial-intelligence-act-ai-act/)

---

**Audit terminé.**

Périmètre couvert : dépôt figé au HEAD, 473 fichiers suivis inventoriés, 80 pages et 20 routes API cartographiées, `npm ci` + `typecheck` + `lint` + `test:security` + `test:unit` + `test:compliance` + `next build` exécutés et résultats rapportés, placeholders/mocks/`skip` recensés, 18 variables d'environnement inventoriées, Stripe / Resend / Supabase / base / multi-tenant / RBAC / MFA / RGPD / e-invoicing / TVA / rétention / signature / SEO / i18n / observabilité audités, AI Act et eIDAS instruits, conformité FR/DE/BE/LU vérifiée sur sources publiées, benchmark 2026 établi, 47 anomalies prouvées et classées, plan de correction ordonné par dépendances.

**« Audit terminé » ne veut pas dire « produit terminé ».** Le verdict reste `NON DÉPLOYABLE`. Il ne pourra évoluer qu'après les vagues 0 à 2, et une affirmation de conformité ne sera possible qu'après la vague 3 avec validation Schematron en CI et un Access Point Peppol contractualisé.

---
---

# ADDENDUM — Vérification contre la base déployée

**Méthode.** Requêtes PostgREST sur `https://leydfjctaxohovcmcgea.supabase.co` avec la clé `publishable`
(rôle `anon`), en `HEAD` + `Prefer: count=exact` et en `select=<colonne>` pour le sondage de schéma.
Aucune donnée personnelle extraite. Une tentative d'écriture avec charge vide (`{}`) a servi à
distinguer un refus de **permission** (`42501`) d'un refus de **validation** (`23502`), sans rien écrire.

## 1. RÉTRACTATIONS

| ID | Statut initial | Statut corrigé | Preuve |
|---|---|---|---|
| **MS-130** — 13 tables sans RLS, lecture inter-tenant via PostgREST | P1, « violation potentiellement notifiable » | **INFIRMÉE** | `POST /rest/v1/{clients,audit_logs,consent_events}` → `42501 new row violates row-level security policy` (HTTP 401). Les lectures `anon` ne renvoient aucune ligne. La RLS est active **y compris** sur les tables que la migration `0002` ne couvrait pas |
| **MS-131** — `mfa_secret` lisible par un membre de la même organisation | P1 | **SANS OBJET** | `select=mfa_secret` → `42703 column users.mfa_secret does not exist` |

**Aucune notification au titre de l'article 33 du RGPD n'est requise.** La conclusion initiale reposait
sur la lecture du fichier de migration ; la base réelle est plus protégée que ce fichier.

## 2. NOUVELLE ANOMALIE — désynchronisation base ↔ schéma

**MS-148 — P0.** `src/lib/db/schema.ts` déclare 26 tables ; la base déployée n'en expose pas 7, et
5 colonnes déclarées sont absentes. Codes `PGRST205` et `42703` — définitifs, indépendants de la RLS.

| Absent en production | Conséquence |
|---|---|
| `archived_documents`, `roles`, `permissions`, `role_permissions`, `user_roles`, `processing_activities`, `breach_notifications`, `retention_policies` | `retention/check` → 500 sur l'insert ; RBAC inopérant même décommenté ; `/api/privacy/breach` → 500 ; le registre des traitements n'a pas de table (ce qui **explique** les mocks de MS-141) |
| `users.mfa_enabled`, `users.mfa_secret` | **`/parametres/securite` → 500** (`db.select({mfaEnabled})`), `POST`/`DELETE /api/auth/mfa` et `/verify` → 500 |
| `organizations.vat_number` | `invoices.supplier_vat_id` sans source → mention obligatoire absente sur **chaque** facture (art. 242 nonies A CGI, art. 226 dir. 2006/112/CE) |
| `clients.vat_number`, `clients.client_type`, `clients.language` | `customerVatId` et `customerType` sans source → **la branche B2B de `determineVatTreatment` est inatteignable** → l'autoliquidation intracommunautaire ne peut jamais se déclencher |

À l'inverse, `invoices` est intégralement migrée : les 20 colonnes e-invoicing / rétention / TVA /
signature testées existent toutes.

## 3. RECLASSEMENTS

| ID | Avant | Après | Raison |
|---|---|---|---|
| **MS-105** anonymisation factice | P0 « écrit une fausse preuve de contrôle » | **P0 — fonction en erreur 500** | `archived_documents` absente ⇒ l'insert lève `42P01`. Aucune fausse preuve ne peut être écrite |
| **MS-106** `GET` mutant / CSRF destructif | P0 « destruction de masse » | **P1 — route en erreur 500** | Même cause : la boucle échoue au premier document. Le correctif de 5 minutes n'est plus urgent |
| **MS-118** repli TVA à 20 % | P1 théorique | **P0 — probablement le seul chemin exécuté** | Voir §4 |
| **MS-107** RBAC commenté | P0 | **P0, bloqué par MS-148** | Les tables de rôles n'existent pas : décommenter provoquerait un 500 |

## 4. À TRANCHER AUJOURD'HUI — non concluant par PostgREST

`country_compliance_profiles` existe mais renvoie 0 ligne à `anon`. **Impossible de conclure** :
l'application lit via Drizzle avec le rôle propriétaire, qui contourne la RLS. Si la table est vide,
`getComplianceProfile()` lève systématiquement et `taxService` applique **20 % à toutes les factures,
tous pays confondus** (BE : sous-collecte de 1 pt ; DE : sur-collecte de 1 pt ; LU : sur-collecte de
3 pts — TVA indûment perçue), avec un simple `console.warn`.

Indépendamment de cette table, l'absence de `clients.client_type` produit le même résultat par un
autre chemin : `customerType` nul ⇒ branche B2C ⇒ taux du fournisseur.

Trois requêtes tranchent, dans le SQL Editor Supabase :

```sql
-- (a) Le repli 20 % est-il le seul chemin exécuté ?
SELECT country, vat_standard, effective_from FROM public.country_compliance_profiles;

-- (b) Les 12 colonnes monétaires sont-elles encore en `real` ? (MS-104, non vérifiable via PostgREST)
SELECT table_name, column_name, data_type, numeric_precision, numeric_scale
FROM information_schema.columns
WHERE table_schema='public'
  AND column_name IN ('total_ht','tax_amount','total_ttc','vat_rate',
                      'unit_price','tax_rate','quantity','value')
ORDER BY table_name, column_name;

-- (c) Y a-t-il des données de production ? Détermine la charge de reprise de la vague 2.
SELECT count(*) AS factures,
       count(*) FILTER (WHERE status <> 'draft') AS emises
FROM public.invoices;

-- (d) Contrôle de l'état RLS réel, pour archiver la rétractation §1
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname='public' ORDER BY rowsecurity, tablename;
```

## 5. PLAN DE CORRECTION RÉVISÉ

La réconciliation base ↔ schéma remonte en vague 0 : les vagues 1 et 2 supposent toutes deux une base
conforme au code.

| | Contenu | Durée |
|---|---|---|
| **Aujourd'hui** | Les 4 requêtes du §4. Plus aucune urgence destructive (MS-106 reclassée) | 15 min |
| **Vague 0** | `.gitignore` + migrations versionnées · **diff schéma↔base + migration de rattrapage (MS-148)** · ESLint 9 · 6 erreurs TS · build vert | 3 j |
| **Vague 0bis** | Seeder `country_compliance_profiles` · faire **échouer** `taxService` au lieu du repli 20 % (MS-118) · ajouter `client_type`/`vat_number` sur `clients` et `organizations` | 2 j |
| **Vague 1** | 3 IDOR (MS-101/102) · collision `einvoices/` (MS-103) · RBAC (après vague 0) · MFA : réparer ou retirer l'écran | 4 j |
| **Vague 2** | 12 colonnes `real→numeric` · arrondi bancaire · compteurs de numérotation par (org, type, année) | 1 à 5 j selon (c) |

**Total : ~13 jours-personne**, ~10 si la base est vierge.

**Garde-fou à ajouter en CI** : rejouer les migrations depuis une base vide et comparer au schéma
Drizzle. Sans ce test, l'écart MS-148 réapparaîtra — c'est un symptôme de `/drizzle` non versionné
(MS-114), pas une négligence ponctuelle.

## 6. CE QUE CET ADDENDUM NE CHANGE PAS

Le verdict `NON DÉPLOYABLE` et les constats vérifiés par exécution locale sont inchangés : CI rouge
(MS-113, MS-143), 3 IDOR (MS-101/102/103), montants en `real` dans le schéma source (MS-104, type
déployé à confirmer par la requête (b)), XRechnung 2.2 (MS-109), Factur-X non conforme (MS-110),
Peppol/PDP absents (MS-111), Stripe Connect absent (MS-112), i18n morte (MS-115), journal d'audit
jamais écrit (MS-116), OSS absent (MS-117), et l'ensemble de la section N.
