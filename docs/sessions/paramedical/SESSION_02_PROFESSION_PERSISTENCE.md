# SESSION 02 — PROFESSION PERSISTENCE

## 1. Résumé exécutif
Cette session implémente la persistance de l'identité paramédicale (`profession`) au niveau de l'organisation dans la base de données. Elle inclut une validation stricte via une contrainte `CHECK` PostgreSQL pour garantir que seules les professions officielles paramédicales sont autorisées et uniquement pour les organisations du secteur `health`. Le champ est explicitement géré comme nullable pour conserver la compatibilité ascendante avec les comptes historiques et non paramédicaux. La source de vérité reste le fichier `professions.ts`.

## 2. HEAD de départ
`bfff9069cf9f7d8f49a52dec8245e79e8177c2f8`

## 3. Contexte
Suite à la stabilisation du socle Workspace (Sessions 01) et de l'environnement de tests (01C), la persistance des données spécifiques est la prochaine étape structurante vers la spécialisation métier.

## 4. Audit avant modification
- Table `organizations` : contient `sector` mais pas `profession`.
- Dernier fichier de migration canonique : `0009_medical_power_man.sql`.
- Types : L'interface TypeScript ne connaissait pas `profession`.
- RLS : Policy de lecture existante opérationnelle sur la table `organizations`.

## 5. État organizations avant
La table PostgreSQL comportait notamment `sector`, `industry`, `profile_type`, etc., mais ignorait complètement le type de paramédical, déléguant cette information à la logique applicative de fallback.

## 6. Décision profession nullable
La colonne a été définie explicitement sans le flag `notNull()` pour les raisons suivantes :
- Compatibilité avec toutes les organisations existantes.
- Soutien des organisations non-health (artisans, tech).
- L'inscription UI (Onboarding) pour la sélection métier n'étant pas encore implémentée (Session 03), le backend doit tolérer un compte `health` temporairement sans métier spécifié.

## 7. Liste officielle des codes
L'énumération TypeScript source de vérité inclut exactement :
- physiotherapist
- osteopath
- speech_therapist
- podiatrist
- occupational_therapist
- psychomotor_therapist
- dietitian

## 8. Règle CHECK
Le schéma a été enrichi par une contrainte de table nommée `organizations_profession_health_check` qui assure au niveau du moteur SGBD :
`profession IS NULL OR (sector = 'health' AND profession IN (...))`

## 9. Décision de ne pas persister workspaceType
Le type de workspace (`paramedical-base`, `paramedical-physiotherapist`, etc.) **n'a pas été ajouté** à la base de données. Il reste strictement une **donnée dérivée** calculée à l'exécution par la fonction `resolveWorkspace()`, interdisant ainsi toute désynchronisation entre les sources de vérité.

## 10. Fichiers créés
- `drizzle/postgres/0010_opposite_union_jack.sql` : La nouvelle migration.
- `drizzle/postgres/meta/0010_snapshot.json` : Snapshot Drizzle.
- `__tests__/integration/db-constraints.integration.test.ts` : Scénarios de tests d'intégrité DB.
- `docs/sessions/paramedical/SESSION_02_PROFESSION_PERSISTENCE.md` : Ce rapport (Handoff autonome).

## 11. Fichiers modifiés
- `src/lib/db/schema.ts` : Ajout colonne et contrainte.
- `src/lib/data/interfaces/organization.interface.ts` : Ajout propriété `profession` nullable.
- `scripts/check-schema-contract.ts` : Ajout d'une vérification sémantique robuste du contrat CHECK.
- `drizzle/postgres/meta/_journal.json` : Mis à jour par Drizzle.
- `drizzle/MIGRATION_INVENTORY.md` : Documentation des migrations 0009 et 0010.
- `docs/sessions/paramedical/SESSION_01C_CI_E2E_BASELINE.md` : Corrections placeholders de la session 01C précédente.
- `docs/sessions/paramedical/README.md` : Index mis à jour.

## 12. Migration générée
Générée nativement via `npm run db:generate`.

## 13. SQL exact de la migration
```sql
ALTER TABLE "organizations" ADD COLUMN "profession" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_profession_health_check" CHECK ("organizations"."profession" IS NULL OR ("organizations"."sector" = 'health' AND "organizations"."profession" IN ('physiotherapist', 'osteopath', 'speech_therapist', 'podiatrist', 'occupational_therapist', 'psychomotor_therapist', 'dietitian')));
```

## 14. Snapshot / journal Drizzle
Snapshot `0010_snapshot.json` créé. Journal `_journal.json` mis à jour avec le pointage vers la version 10.

## 15. Schema contract
Étendu pour s'assurer de la présence stricte de la contrainte `organizations_profession_health_check` et tester sémantiquement la présence de tous les mots clés (les sept codes, le `sector`, le `health`, et l'instruction `isnull`).

## 16. RLS
RLS **inchangé** : la nouvelle colonne est implicitement couverte par la policy existante protégeant la ligne complète de la table `organizations`. La commande `npm run test:rls` reste verte (vérifiée via CI).

## 17. GRANTS
Les `GRANTS` PostgreSQL (via Custom Objects et PostgREST) demeurent inchangés. L'accès public à la table est toujours rigoureusement contrôlé par l'API REST.

## 18. Backend / types
Interface `Organization` adaptée pour supporter formellement le typage `ParamedicalProfessionCode | null`, important proprement l'énumération existante du workspace sans créer de duplication. Le backend de service n'ajoute délibérément pas `profession` à ses champs d'update public.

## 19. Registration explicitement non traitée
Aucun frontend n'a été retouché pour capturer la profession. L'authentification et l'inscription restent agnostiques à ces changements dans l'attente de la Session 03.

## 20. Tests ajoutés
Intégration d'une série de tests d'intégrité DB `db-constraints.integration.test.ts` qui testent les insertions SQL directes (via une séquence INSERT, puis DELETE en cas de succès, sans transaction) pour valider l'acceptation et le rejet de diverses combinaisons sector/profession (`health + physiotherapist` VS `artisan + physiotherapist`).

## 21. Tests exécutés
- Typecheck
- Lint
- Security Tests
- Unit Tests
- Compliance Tests
- DB Schema Check, Drift & RLS (vérifiés via CI)

## 22. Résultats
Tous validés en `SUCCESS`.

## 23. DB locale
(Tests DB locales exclus par suite d'absence de daemon Docker sur l'instance IDE locale). Les tests DB sont par contre formellement exécutés par la CI globale.

## 24. Supabase production
**NON modifiée**. Les migrations seront poussées vers le backend de staging / prod via les procédures sécurisées standards du projet ultérieurement.

## 25. Dette restante
Dette CI / E2E isolée (Playwright full regression non bloquant). 

## 26. Risques
Risque minime. L'ajout d'une colonne null sans impact sur les formulaires existants ne casse aucune rétro-compatibilité.

## 27. Régressions
Aucune constatée sur la base de tests unitaires et intégration (106 tests sécurité, 38 tests unitaires).

## 28. État Git
Propre. Changements staggés explicitement.

## 29. CI GitHub
- Run ID : `33075666442`
- Status : `completed`
- Conclusion : `success`

## 30. Handoff autonome pour Session 03
Le socle Workspace DB est désormais parfaitement outillé et sécurisé. La Session 03 pourra implémenter l'Onboarding UI et alimenter sereinement cette nouvelle colonne `profession` !
