# Audit intégral du SaaS `monservice` — état de préparation à la production

**Résumé exécutif** — 6 août 2026

---

## 1. Verdict

# 🔴 NO-GO

`monservice` **ne doit pas être mis en production ni vendu à des clients réels en l'état.**

Ce n'est pas un verdict de prudence. L'audit a établi **12 anomalies P0 vérifiées** dont au moins six permettent, sans aucun compte et sans aucune compétence particulière, de :

- lire l'intégralité de la base utilisateurs (emails + hachages de mots de passe) ;
- lire, modifier et supprimer les données de **n'importe quelle organisation cliente** ;
- prendre le contrôle de n'importe quel compte ;
- marquer n'importe quelle facture comme « payée » sans paiement ;
- apposer une signature électronique sur n'importe quel devis.

Par ailleurs, l'application **n'est pas fonctionnelle** : l'authentification est scindée entre deux fournisseurs incompatibles (NextAuth et Supabase Auth), ce qui provoque une boucle de redirection après connexion. Le produit ne peut donc ni être exploité ni être sécurisé sans une reprise structurelle.

---

## 2. Périmètre et méthode

| | |
|---|---|
| **Produit** | `monservice` — CRM SaaS B2B/B2C + marketplace + facturation |
| **Dépôt** | `github.com/Soufianeerd/monservice` (HEAD `0dad655`) |
| **Stack** | Next.js 16.2.11 (App Router, Turbopack), React 19, TypeScript, Drizzle ORM, SQLite/PostgreSQL, NextAuth + Supabase Auth, Stripe, Netlify |
| **Date** | 6 août 2026 |
| **Niveau d'accès** | **White-box** (code source complet, base SQLite locale, configuration, historique Git) |
| **Modes non réalisés** | Black-box et grey-box : aucune URL de production accessible, aucun compte de test fourni, aucun environnement isolé disponible |
| **Volume analysé** | 226 fichiers source, 12 tables, 62 routes frontend, 7 routes API, ~80 server actions |

**Toutes les conclusions marquées `VÉRIFIÉ` reposent sur une lecture directe du code et/ou une exécution d'outil (tsc, eslint, inspection SQLite).** Aucune exploitation active n'a été menée : aucune URL publique n'était disponible et l'audit s'est tenu strictement au périmètre autorisé.

---

## 3. Chiffres

| Sévérité | Nombre | Dont vérifiées |
|---|---|---|
| **P0 — bloquant immédiat** | **12** | 12 |
| **P1 — à corriger avant lancement** | **21** | 20 |
| **P2 — à corriger rapidement** | **14** | 13 |
| **P3 — amélioration** | **8** | 8 |
| **Total** | **55** | 53 |

### Score global : **17 / 100**

Le score est volontairement écrasé par les défauts critiques : il ne s'agit pas d'une moyenne. Détail par domaine dans `AUDIT_FULL_REPORT.md` §8.

| Domaine | Score |
|---|---|
| Sécurité applicative | 2/100 |
| Isolation multitenant | 0/100 |
| Authentification / autorisation | 3/100 |
| Paiements & revenus | 12/100 |
| Fiabilité & exploitation | 8/100 |
| Observabilité | 5/100 |
| Conformité RGPD | 10/100 |
| Base de données | 20/100 |
| Tests | 15/100 |
| Qualité du code | 25/100 |
| UI / cohérence visuelle | 55/100 |
| Maturité produit | 20/100 |

---

## 4. Les 12 blocages P0

| ID | Titre | Impact en une phrase |
|---|---|---|
| **MS-001** | Contrôle d'accès du middleware entièrement inopérant | La route `/` dans la liste blanche rend `startsWith()` toujours vrai : **aucune page n'est protégée**. |
| **MS-002** | ~80 server actions sans aucune vérification de session | Chaque action est un endpoint POST public appelable directement. |
| **MS-003** | Dump complet de la base utilisateurs | `getAllUsersAction()` renvoie tous les comptes **avec les hachages bcrypt**. |
| **MS-004** | Prise de contrôle de n'importe quel compte | `updateUserProfileAction(id, data)` accepte un id arbitraire et un objet non filtré. |
| **MS-005** | Isolation multitenant inexistante | L'`organizationId` est un **paramètre fourni par le client**, jamais dérivé de la session. |
| **MS-006** | Identité dérivée d'un cookie non signé | Le repli `cookies().get('session')` permet d'usurper n'importe quel `userId`. |
| **MS-007** | Fraude au paiement et à la signature | `markAsPaidAction` et `updateSignatureAction` sont publics et sans contrôle. |
| **MS-008** | Authentification scindée NextAuth / Supabase | Boucle de redirection après connexion : **l'application est inutilisable**. |
| **MS-009** | Variable Supabase incohérente entre environnements | `ANON_KEY` attendu, `PUBLISHABLE_KEY` fourni en prod → erreur 500 systématique. |
| **MS-010** | Client Stripe instancié au chargement du module | `new Stripe('')` lève une exception → **le build Netlify échoue**. |
| **MS-011** | Aucune stratégie de sauvegarde ni de restauration | SQLite sur système de fichiers éphémère : perte de données totale possible. |
| **MS-012** | Détournement de compte Stripe Connect | `/api/stripe/connect/onboarding` accepte un `organizationId` arbitraire sans authentification. |

---

## 5. Les 21 P1 (extrait des plus structurants)

- **MS-013** `/api/reminders/check` non authentifié — déclenchement d'envois et énumération d'organisations.
- **MS-014** Webhook Stripe sans idempotence ; `customer.subscription.deleted` non traité → **les droits payants ne sont jamais retirés**.
- **MS-015** Le service d'e-mail est une **simulation** (`console.log`) : aucun e-mail n'a jamais été envoyé.
- **MS-016** La réinitialisation de mot de passe est un **écran factice** (`?token=dummy-token`).
- **MS-017** Aucune politique de mot de passe, aucun rate limiting, aucune protection anti-bourrage d'identifiants.
- **MS-018** `notificationService` et `reminderService` sont des **classes vides** alors que l'interface les expose.
- **MS-019** Les quotas des plans tarifaires (50 clients, 10 devis/mois) ne sont **jamais appliqués**.
- **MS-020** Schéma sans clés étrangères, sans index, suppressions en cascade manuelles et non transactionnelles.
- **MS-022** Aucune Row-Level Security Supabase alors que la clé anonyme est exposée côté navigateur.
- **MS-028** La CI n'exécute **ni lint, ni typecheck, ni build** ; 251 erreurs ESLint sont présentes.

Liste intégrale : `AUDIT_FINDINGS.csv`.

---

## 6. Points forts (il y en a)

Il serait malhonnête de ne relever que des défauts. Trois éléments sont réellement bien faits :

1. **La signature du webhook Stripe est correctement vérifiée** (`stripe.webhooks.constructEvent`) — c'est la faute la plus fréquente dans les SaaS jeunes, elle n'est pas commise ici.
2. **Les mots de passe sont hachés avec bcrypt** (coût 10) et jamais stockés en clair ; `verifyPassword` utilise bien `bcrypt.compare`.
3. **La couche service contient déjà l'amorce du bon modèle** : `clientService.create/update/delete` vérifie `user.organizationId !== data.organizationId`. Le raisonnement de sécurité existe — il est simplement contourné parce que le `userId` est fourni par l'appelant au lieu d'être lu depuis la session. **Corriger ce point unique répare mécaniquement une grande partie des P0.**
4. Aucun secret n'a été trouvé dans l'historique Git (`.env*` correctement ignoré).
5. Le typage TypeScript compile sans erreur (`tsc --noEmit` : 0 erreur) et la structure App Router est cohérente et lisible.

---

## 7. Recommandation de lancement

**Ne pas lancer.** Ne pas ouvrir d'inscription publique. Ne pas connecter Stripe en mode `live`. Ne pas migrer de données réelles.

Le produit est, en termes de maturité, à un stade de **prototype fonctionnel avancé** présenté comme un SaaS commercialisable. L'écart entre les deux est d'environ **6 à 10 semaines de travail** pour une personne expérimentée, dont l'essentiel est structurel et non cosmétique.

### Actions immédiates (avant toute autre chose)

| # | Action | Pourquoi maintenant |
|---|---|---|
| 1 | **Ne pas déployer, ne pas rendre publique l'URL Netlify** | Toute mise en ligne expose immédiatement MS-001 à MS-007. |
| 2 | **Trancher : NextAuth *ou* Supabase Auth** | Rien d'autre ne peut être corrigé tant que l'identité est double (MS-008). |
| 3 | **Créer un helper serveur unique `requireSession()`** renvoyant `{ userId, organizationId, profileType }` | C'est la pièce manquante qui rend MS-002 à MS-007 réparables en série. |
| 4 | **Réécrire les ~80 server actions** pour supprimer tous les paramètres `userId` / `organizationId` | Tant qu'ils sont des paramètres, l'isolation est décorative. |
| 5 | **Supprimer `getAllUsersAction` et `getUserByEmailAction`** | Deux lignes qui exposent toute la base utilisateurs. |
| 6 | **Corriger `proxy.ts`** (retirer `'/'` de la liste blanche, comparaison exacte) | Une ligne, remet en service toute la barrière périmétrique. |
| 7 | **Choisir une base de production réelle (PostgreSQL/Supabase) + sauvegardes vérifiées** | SQLite sur Netlify n'a aucune persistance garantie. |

Ces sept actions ne rendent pas le produit vendable ; elles le rendent **auditables à nouveau**. Le plan complet, séquencé sur 90 jours, figure dans `REMEDIATION_BACKLOG.md`.

---

## 8. Limites de cet audit

Elles sont importantes et doivent être lues avant toute décision fondée sur ce rapport.

| Limite | Conséquence |
|---|---|
| **Aucune URL de production ni de préproduction fournie** | Aucun test black-box, aucune mesure de performance réelle, aucun en-tête HTTP observé, aucune vérification TLS/DNS/CDN. |
| **Aucun compte de test fourni** | Aucun test grey-box : la matrice RBAC est **déduite du code**, non observée. |
| **Aucun accès au projet Supabase, Netlify ou Stripe** | RLS, politiques de stockage, variables d'environnement réelles, configuration des webhooks : `NON TESTÉ`. |
| **`next build` non exécutable dans l'environnement d'audit** | Binaires natifs (`lightningcss`, `rolldown`) absents pour l'architecture du bac à sable → statut `BLOQUÉ`. Conclusions de build issues de l'analyse statique. |
| **`vitest` non exécutable** (même cause) | Couverture de test estimée par lecture, non mesurée. |
| **Aucun test d'accessibilité réel** (lecteur d'écran, clavier) | Le score UI/UX est une **revue de code**, pas une évaluation WCAG. Ne peut servir de base à une déclaration de conformité. |
| **Aucune donnée de production observée** | La cartographie RGPD est théorique. |

**Aucune vérification automatisée présentée ici ne constitue une certification juridique ou réglementaire.** L'absence de preuve de vulnérabilité sur un contrôle non testé n'est pas une preuve de conformité.

---

*Rapport détaillé : `AUDIT_FULL_REPORT.md` — Registre : `AUDIT_FINDINGS.csv` / `.json` — Remédiation : `REMEDIATION_BACKLOG.md`*
