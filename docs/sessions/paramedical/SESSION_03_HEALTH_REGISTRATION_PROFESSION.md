# Session 03 — Health Registration / Profession Selection

## 1. Résumé exécutif
Cette session connecte le modèle de données de profession paramédicale (créé lors des sessions 01/02) au formulaire d'inscription. Un professionnel du secteur Santé doit désormais obligatoirement sélectionner sa profession paramédicale lors de son inscription.

## 2. HEAD initial
`45415ca662f570af884a85a05c9ca99a5531cddf`

## 3. Contexte
La base de données était prête (champ `organizations.profession` nullable, contraintes SQL pour garantir l'intégrité). L'UI permettait de sélectionner le profil (`client` ou `professional`) et le secteur (`health`, `artisan`, etc.), mais pas encore le métier spécifique.

## 4. État RegisterForm avant
`RegisterForm` demandait le nom de l'entreprise et le secteur, mais manquait la liste des professions pour le secteur de la santé. Le payload ignorait toute validation de `profession`.

## 5. Architecture retenue
- Validation métier Zod en profondeur sur le schéma partagé.
- Réutilisation de la liste officielle `PARAMEDICAL_PROFESSION_CODES` définie dans `src/lib/workspaces/paramedical/professions.ts` pour garantir la source de vérité.

## 6. Source de vérité professions
Les données de professions sont récupérées de `PARAMEDICAL_PROFESSIONS` pour alimenter l'interface utilisateur. Seul le `code` est envoyé au serveur, pas le libellé.

## 7. UI conditionnelle health
Si l'utilisateur sélectionne `professional` puis `health`, une nouvelle section "Votre profession paramédicale" apparaît, avec un layout harmonisé (grille de boutons).

## 8. Nettoyage profession lors changement secteur
Si l'utilisateur passe de `health` à un autre secteur, la `profession` enregistrée en mémoire est immédiatement vidée.

## 9. Validation client
Ajout du contrôle en étape 3 empêchant de passer à l'étape 4 si la profession est vide alors que le secteur `health` est sélectionné.

## 10. Validation Zod serveur (registerSchema)
Utilisation d'un `superRefine` pour appliquer les règles strictes. `.strict()` reste actif.

## 11. Contrat client/professional
- Client : ne peut pas avoir de `orgName`, `sector` ni de `profession`.
- Professional `health` : `orgName`, `sector` requis. `profession` requise parmi les 7 codes.
- Professional autre : `orgName`, `sector` requis. `profession` interdite.

## 12. Persistance organizations.profession
`src/app/actions/auth.ts` insère `input.profession ?? null` dans `tx.insert(organizations)`.

## 13. Absence de profession par défaut
Aucune profession n'est sélectionnée par défaut. L'utilisateur doit faire un choix délibéré.

## 14. Compatibilité organisations existantes
Les anciennes organisations ne sont pas affectées. Le serveur rejette seulement les nouvelles inscriptions frauduleuses.

## 15. DB/migrations
Aucune migration supplémentaire. La DB était déjà prête.

## 16. RLS/GRANTS
Inchagés, ils couvrent déjà le périmètre.

## 17. Supabase Auth metadata
La profession n'est pas injectée dans `raw_user_meta_data`, seul le modèle applicatif gère la source de vérité de l'entreprise.

## 18. Fichiers créés
- `__tests__/unit/security/register-schema.test.ts`
- `docs/sessions/paramedical/SESSION_03_HEALTH_REGISTRATION_PROFESSION.md`

## 19. Fichiers modifiés
- `src/components/auth/RegisterForm.tsx`
- `src/app/actions/auth.ts`
- `src/lib/validation/schemas.ts`
- `docs/sessions/paramedical/SESSION_02B_PROFESSION_CONSTRAINT_FINALIZATION.md`
- `docs/sessions/paramedical/README.md`

## 20. Tests ajoutés
15 nouveaux tests ont été ajoutés pour `registerSchema`.

## 21. Résultats
La validation est stricte de bout en bout et les composants UI reflètent les options paramédicales.

## 22. Security tests
Validés avec succès (15/15 tests sur le schéma `registerSchema`).

## 23. DB constraint tests
Déjà configuré et validé sur 10 cas de contrainte en CI.

## 24. Workspace tests
Toujours 20/20.

## 25. Supabase production
Inchangée.

## 26. Dette restante
- Tests complets UI (react-testing-library) si besoin ultérieur, focalisation sur la validation Zod.

## 27. Handoff Session 04
La Session 04 (Onboarding conditionnel) peut démarrer, s'appuyant sur cette base pour personnaliser le flux du nouvel inscrit en fonction de sa profession.
