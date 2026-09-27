# SESSION 18 — ESTIMATES, QUOTES & LEAD-TO-CASH FIELD SERVICE

## 🎯 1. Résumé Exécutif & Mission

La **Session 18** transforme le moteur de facturation existant de **MonSERVICE** en véritable moteur de chiffrage professionnel **Lead-to-Cash** adapté aux métiers **Field Service / BTP / Artisans / Métiers Techniques**, tout en préservant le workspace générique et en maintenant le gel de conformité du portail paramédical (Paramedical V1).

### Principe Cardinal : ZERO RE-ENTRY
Une information déjà saisie en amont n'est plus jamais ressaisie manuellement dans les étapes aval :
```text
Client CRM
  └── Site d'intervention
        └── Deal / Opportunité commerciale
              └── Devis détaillé (Lots / Tranches / Lignes / TVA / Remises / Options)
                    └── Envoi & Consultation Client
                          └── Signature Électronique & Acceptation
                                └── Facture d'Acompte (Ventilation multi-TVA)
                                      └── Paiement Acompte Stripe
                                            └── Ordre de Travail / Chantier (Session 17)
                                                  └── Facture Finale (Acompte déduit)
                                                        └── Clôture Comptable
```

---

## 🏛️ 2. Architecture & Choix de Conception

### 2.1 Dissolution de la Dualité « Deal vs Devis »
Historiquement, deux concepts concurrents de devis coexistaient :
- `invoices.type = 'quote'` (le document comptable canonique)
- `Deal` CRM (détourné en pseudo-devis via `QuotePDF.tsx`, `/api/deals/sign`, etc.)

**Décision d'architecture appliquée :**
- `Deal` reste strictement l'opportunité dans le pipeline CRM.
- `Invoice[type='quote']` est l'unique devis légal et commercial canonique.
- `QuotePDF.tsx` reçoit désormais le document quote canonique et son DTO sécurisé.
- `/api/deals/sign` est déprécié (retourne HTTP 410 Gone avec redirection vers `/api/quotes/sign`).
- Les anciennes colonnes `deals.signature` et `signed_at` restent conservées en base pour préserver l'historique sans jamais être réutilisées.

### 2.2 Autorité Serveur Absolue & Moteur de Calcul Déterministe
Le navigateur n'est plus l'autorité des calculs (correction du bug legacy où `discount` calculé côté client était ignoré côté serveur) :
- Moteur unique pur et testé : `src/lib/services/billing-calculator.ts`.
- Quantités décimales précises (`numeric(14,3)`) pour les métrés BTP (`0.5 h`, `1.25 m²`, `2.375 m³`).
- Gestion multi-taux de TVA (notamment 5.5 %, 10 %, 20 % pour les travaux en France).
- Remises en pourcentage (`0..100 %`) appliquées au net HT avant calcul de TVA.
- Calcul d'acompte serveur selon le mode (`none`, `percentage`, `fixed`).
- Ventilation proportionnelle de la TVA d'acompte préservant la distribution fiscale d'origine.
- Calcul déterministe du reste à payer : `amountDue = totalTTC - prepaidAmount`.

### 2.3 Numérotation Atomique Concurrente
Remplacement de l'algorithme `SELECT max + 1` vulnérable aux race conditions par la table d'allocation atomique `billing_document_sequences` :
- Clé composite unique `(organization_id, document_type, year)`.
- Requête transactionnelle atomique avec `ON CONFLICT DO UPDATE SET last_sequence = last_sequence + 1 RETURNING last_sequence`.
- Garantit l'absence totale de doublons de numérotation (`D-YYYY-XXXX` et `F-YYYY-XXXX`) même en cas de créations simultanées massives.

### 2.4 Confidentialité & DTO Client Strict
Les coûts d'achat internes (`unitCost`), marges brutes (`marginHT`) et taux de rentabilité (`marginRate`) :
- Sont calculés et visibles uniquement par le professionnel.
- Ne sont **jamais** exposés dans les DTOs du portail client (`src/lib/data/dto/client-billing.dto.ts`).
- Ne figurent **jamais** sur les PDF générés pour les clients (`QuotePDF.tsx`).

---

## 🗄️ 3. Migration Canonique 0021 (`drizzle/postgres/0021_field_service_estimates_quotes.sql`)

### 3.1 Nouvelles Tables
1. **`billing_document_sequences`** :
   - `id`, `organization_id`, `document_type`, `year`, `last_sequence`, `updated_at`.
   - Index unique composite `(organization_id, document_type, year)`.
   - Clé étrangère vers `organizations(id)` avec cascade.
2. **`invoice_sections`** :
   - Regroupement en lots, tranches, sections, options et variantes.
   - `id`, `organization_id`, `invoice_id`, `parent_section_id`, `kind`, `title`, `description`, `position`, `is_optional`, `option_group_key`, `is_selected`, `created_at`, `updated_at`.
   - Contraintes FK composites tenant-safe vers `invoices(id, organization_id)` et auto-référence `(parent_section_id, organization_id)`.

### 3.2 Colonnes Ajoutées à `invoices`
- Traçabilité & CRM : `created_by_user_id`, `deal_id`, `site_id`, `work_order_id`, `source_quote_id`.
- Métadonnées Devis : `title`, `valid_until`.
- Acceptation / Rejet : `accepted_at`, `accepted_by_user_id`, `rejected_at`, `rejected_by_user_id`.
- Versionnage : `revision_number`, `supersedes_document_id`.
- Typologie & Acomptes : `invoice_subtype` (`standard`, `deposit`, `final`), `deposit_mode` (`none`, `percentage`, `fixed`), `deposit_rate`, `deposit_fixed_amount`, `deposit_amount`, `prepaid_amount`, `amount_due`.

### 3.3 Enrichissement de `invoice_lines`
- `quantity numeric(14,3)` : Support complet des métrés décimaux.
- `organization_id text NOT NULL` : Backfill sécurisé depuis les factures parentes, contrainte NOT NULL et FK composite `(invoice_id, organization_id)`.
- `section_id text` : Rattachement au lot/tranche avec FK composite `(section_id, organization_id)`.
- Métadonnées métier : `line_type` (`service`, `labor`, `material`, `equipment`, `travel`, `subcontracting`, `other`), `unit_code` (`unit`, `hour`, `day`, `meter`, `linear_meter`, `square_meter`, `cubic_meter`, `kilogram`, `liter`, `package`, `fixed_price`), `position`, `discount_rate`, `unit_cost`, `tax_amount`.

### 3.4 Clé Étrangère Work Order $\rightarrow$ Devis
- Ajout de `source_quote_id` dans `field_service_work_orders`.
- Clé étrangère composite `field_service_work_orders_source_quote_tenant_fk` reliant `(source_quote_id, organization_id)` à `invoices(id, organization_id)`.

### 3.5 Triggers & Garde-Fous DB
- **`enforce_invoice_invariants()`** :
  - Interdit le hard-delete des documents non brouillons.
  - Verrouille les montants financiers, le mode d'acompte et la signature d'un devis accepté.
  - Interdit de repasser un devis accepté en brouillon.
  - Respecte `session_replication_role = 'replica'` pour les opérations de maintenance/migrations.
- **`enforce_invoice_child_immutability()`** :
  - Interdit l'ajout, la modification ou la suppression de lignes et de sections sur un document finalisé/accepté/payé.

---

## ⚙️ 4. Services Métier & Server Actions

### 4.1 `quote.service.ts`
- `createDraftQuote(data, sections, lines, userId)` : Création transactionnelle complète (numéro atomique, sections, lignes avec typage et unités, totaux serveur).
- `updateDraftQuote(quoteId, data, sections, lines, organizationId)` : Mise à jour transactionnelle avec vérification de l'état brouillon.
- `deleteDraftQuote(quoteId, organizationId)` : Suppression contrôlée réservée aux brouillons.
- `sendQuote(quoteId, organizationId, userId)` : Transition `draft -> sent` avec horodatage d'envoi.
- `markQuoteViewed(quoteId, clientId, userId)` : Transition client `sent -> viewed`.
- `acceptQuote(quoteId, input, userId)` : Acceptation atomique avec enregistrement de la signature électronique, horodatage, mise à jour du Deal CRM lié en `won` et calcul figé de l'acompte.
- `rejectQuote(quoteId, input, userId)` : Rejet explicite avec motif optionnel et horodatage.
- `createQuoteRevision(quoteId, organizationId, userId)` : Duplication en version `N+1` liant `supersedes_document_id` et passant l'ancien devis à l'état `superseded`.
- `createDepositInvoiceFromQuote(quoteId, organizationId, userId)` : Génération idempotente de la facture d'acompte (`invoice_subtype = 'deposit'`) ventilée proportionnellement par taux de TVA.
- `convertQuoteToInvoice(quoteId, organizationId, userId)` : Conversion du devis accepté en facture finale déduisant l'ensemble des acomptes déjà payés (`prepaidAmount`) pour fixer le `amountDue` exact.
- `createWorkOrderFromAcceptedQuote(quoteId, organizationId, userId, input)` : Transition directe vers les opérations Session 17 en créant un chantier/intervention prérempli sans aucune ressaisie.

### 4.2 Autorité des Server Actions (`invoice.actions.ts`)
- Validation Zod `.strict()` via `src/lib/validation/quote.schemas.ts`.
- Dérivation obligatoire de `organizationId` et `userId` depuis la session serveur (`requireProfessional()` ou `requireFieldServiceContext()`).
- Aucun champ sensible injecté par le navigateur n'est accepté (les totaux, remises et statuts sont calculés et validés par le serveur).

---

## 💳 5. Paiements Stripe & Facturation Électronique

- **Stripe (`/api/stripe/create-payment`)** :
  - Rejette strictement les documents `type === 'quote'`.
  - Pour une facture d'acompte ou une facture finale, le montant soumis à Stripe correspond exactement à `amountDue` (après déduction d'acompte éventuel).
  - Validation du webhook et idempotence préservée.
- **Facturation Électronique Factur-X (`einvoice.service.ts`)** :
  - Génération différée à l'émission définitive pour ne pas figer un document brouillon.
  - Limitation documentée : l'implémentation actuelle utilise un profil Factur-X standard et ne constitue pas une certification légale PDP.

---

## 📱 6. Expérience Utilisateur & Responsive Mobile

- Route `/facturation/devis` : Vue complète avec filtres, badges d'état clairs (Brouillon, Envoyé, Vu, Accepté, Refusé, Périmé).
- Route `/facturation/devis/nouveau` : Éditeur de devis complet BTP / Field Service avec ajout de lots, tranches, sélection de type de ligne, métrés décimaux, remises et acomptes configurables.
- Mode Mobile (390x844) : Interface fluide, contrôles adaptés au tactile sur chantier, cartes empilées sans scrolling horizontal cassé.

---

## 🧪 7. Matrice de Preuves & Résultats de Validation

| Suite de Tests | Description | Résultat |
|---|---|---|
| `db:check-drift` | Détection de dérive schéma Drizzle / Postgres | ✅ 0 dérive (57 tables) |
| `db:check-contract` | Contrat PostgreSQL (57 tables, FKs composites, types, contraintes) | ✅ Conforme |
| `db:check-custom-objects` | Fonctions triggers, RLS et GRANTS PostgreSQL | ✅ Conforme |
| `npm run typecheck` | Vérification stricte TypeScript (`tsc --noEmit`) | ✅ 0 erreur |
| `npm run lint` | Analyse ESLint globale | ✅ 0 erreur (398 warnings legacy) |
| `billing-calculator.test.ts` | Calculs de lignes, décimales, remises, multi-TVA (5.5, 10, 20), acomptes | ✅ 12/12 passants |
| `invoice.service.test.ts` | Isolation tenant, calculs et allocation atomique | ✅ 3/3 passants |
| `test:unit` | Ensemble des 14 suites unitaires de services | ✅ 51/51 passants |
| `billing-document-db-constraints.integration.test.ts` | FK composites, rejet cross-tenant, CHECK constraints, immutabilité, concurrence atomique | ✅ 8/8 passants |
| `billing-document-rls.integration.test.ts` | Isolation RLS multi-tenant, permissions Pro A vs B, Client A vs B, Anon | ✅ Conforme |
| `field-service-quote-to-cash.spec.ts` | E2E Lead-to-Cash Playwright (Desktop + Mobile 390x844) | ✅ Conforme |
| **Audit Zéro Cast Menteur** | `grep -En "as any\|as never\|as unknown as\|@ts-ignore"` sur les fichiers modifiés | ✅ **0 occurrence** |

---

## 🔮 8. Périmètre & Limitations Futures

- **Session 19 (Customer Assets & Équipements)** : Gestion des équipements installés, QR codes, fiches machines et historique de maintenance sur les sites clients.
- **Session 20 (Fournisseurs, Achats & Stocks)** : Gestion complète des catalogues fournisseurs, bons de commande, mouvements de stock et valorisation FIFO.
- **Situations de travaux avancées (20 / 50 / 80 / 100 %)** : Les situations d'avancement BTP multi-étapes et retenues de garantie feront l'objet d'une extension dédiée du moteur de facturation.
