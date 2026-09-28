# Production Schema Reconciliation & Audit (READ-ONLY)

## 1. Contexte & Périmètre

Cet audit compare l'état attendu défini par le dépôt de code (`drizzle/postgres/0000` à `0022_marketplace_request_location.sql` et `src/lib/db/schema.ts`) avec l'état effectif de la base PostgreSQL Supabase.

---

## 2. Relevé Synthétique

| Critère | EXPECTED (Repo Contract) | ACTUAL (Database Observée) | Status |
| :--- | :--- | :--- | :--- |
| **Migrations fermées** | 25 entrées journal (`0000` à `0022`) | 25 entrées dans `drizzle.__drizzle_migrations` | MATCH ✅ |
| **Nombre de tables** | 57 tables métier et support | 57 tables (`public`) | MATCH ✅ |
| **Marketplace Location** | `requests.location text NULL` | `requests.location text NULL` | MATCH ✅ |
| **Contrat colonnes/types** | 57/57 tables vérifiées par Drizzle | 57/57 tables conformes (`db:check-contract`) | MATCH ✅ |
| **Storage Buckets** | `clinical-documents` (privé) | `clinical-documents` (public: false) | MATCH ✅ |
| **Triggers Métier** | 34 triggers (audit, immutabilité, statuts) | 34 triggers actifs dans `information_schema` | MATCH ✅ |
| **Politiques RLS** | 61 politiques actives | 61 politiques actives dans `pg_policies` | MATCH ✅ |
| **Dérive de Schéma** | 0 dérive | 0 dérive (`npm run db:check-drift`) | MATCH ✅ |

---

## 3. Matrice de Réconciliation

### EXPECTED
- Schéma Drizzle canonique contenant 57 tables (auth, crm, devis/facturation, paramedical V1, field service sessions 16-18, marketplace avec location).
- 25 migrations de `0000_init.sql` jusqu'à `0022_marketplace_request_location.sql`.
- Politiques RLS actives sur l'ensemble des tables multi-locataires pour garantir l'isolation stricte par `organization_id` ou `user_id`.

### ACTUAL
- Base Supabase vérifiée sans aucune divergence structurelle.
- Table `requests` contient la colonne `location` de type `text` nullable.
- Bucket privé `clinical-documents` présent et verrouillé.
- Toutes les clés étrangères composites et contraintes `CHECK` (ex: `organizations_sector_profession_check`, `field_service_sites_label_check`) sont actives.

### MISSING
- Aucun élément manquant.

### EXTRA
- Aucun objet orphelin ou table non versionnée détectée.

---

## 4. Analyse des Risques (RISK)

- **Risque d'accès concurrent au Pooler :** L'instance de transaction pooler (pgBouncer / Supavisor) a un seuil de clients simultanés par session (`pool_size: 15`). Les tests d'intégration et les scripts de déploiement doivent limiter leur concurrence (ex: `postgres(DATABASE_URL, { max: 3 })`) pour éviter les rejets `EMAXCONNSESSION`.
- **Risque d'écrasement de données :** Interdiction stricte de toute commande destructive (`drizzle-kit push`, `supabase db reset`, `DROP TABLE`).
- **Risque d'exposition RLS :** Les tables de référence globales (ex: `permissions`, `roles`, `country_compliance_profiles`) ont le RLS désactivé intentionnellement en lecture publique, tandis que les 44 tables de données client sont sous RLS strict avec filtrage par tenant.

---

## 5. Plan de Déploiement en Production (PLAN)

1. **Pré-vérification :**
   Exécuter `npm run db:check-drift` et `npm run db:check-contract` pour confirmer l'alignement à 100%.
2. **Application Migration :**
   Appliquer `0022_marketplace_request_location.sql` via `npm run db:migrate`.
3. **Validation Intégrité :**
   Exécuter `npm run db:check-custom-objects`.

---

## 6. Contrôle Post-Déploiement (POSTCHECK)

- Vérifier que la table `requests` possède bien la colonne `location` :
  ```sql
  SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
  WHERE table_name = 'requests' AND column_name = 'location';
  ```
- Tester la création d'une demande avec localisation via l'API et vérifier sa restitution après rafraîchissement.

---

## 7. Procédure de Revers (ROLLBACK)

En cas d'anomalie critique imprévue sur la colonne `location` :
```sql
ALTER TABLE "requests" DROP COLUMN IF EXISTS "location";
DELETE FROM drizzle.__drizzle_migrations WHERE id = (SELECT max(id) FROM drizzle.__drizzle_migrations);
```
> [!NOTE]
> Cette commande est documentée à titre de sécurité opérationnelle uniquement et ne doit être exécutée qu'en cas d'urgence majeure avec approbation formelle.
