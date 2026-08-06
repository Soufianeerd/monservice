# Audit d'architecture — `monservice`

---

## 1. Style architectural

**Monolithe modulaire Next.js App Router**, déployé en fonctions serverless sur Netlify, avec une base relationnelle managée.

Ce choix est **pertinent** pour un SaaS à ce stade : simple à opérer, coût faible, bonne cohésion. Le problème n'est pas le style architectural — il est dans l'exécution.

### Découpage en couches

```
app/(routes)          → composants React (serveur et client)
app/actions/          → Server Actions   ← COUCHE DÉFAILLANTE
lib/services/         → logique métier + accès données
lib/db/               → schéma Drizzle + connexion
lib/data/interfaces/  → contrats de types
```

Le découpage est **correct dans son intention**. La couche `actions` devrait être la frontière de confiance — le point où l'on établit l'identité, valide les entrées et applique les autorisations. Elle a été implémentée comme un **passe-plat sans logique**, ce qui laisse le système sans frontière du tout.

C'est une erreur de conception unique, répétée ~80 fois. La bonne nouvelle : elle est **systématique**, donc corrigeable de manière systématique.

---

## 2. Défauts architecturaux majeurs

### 2.1 Double système d'identité (MS-008)

Deux fournisseurs d'authentification coexistent sans passerelle : NextAuth (login, middleware, contexte client) et Supabase Auth (layouts serveur, routes de signature). Aucune session Supabase n'est jamais créée. Résultat : boucle de redirection et endpoints en 401 permanent.

**Cause** : trois basculements successifs dans l'historique Git (`4ee7edf` Supabase → `7c09746` retour local → `abcb59b` NextAuth) sans reprise complète des fichiers.

**Leçon** : un changement de fournisseur d'identité doit être traité comme une migration à part entière, avec un inventaire exhaustif des points d'appel.

### 2.2 Double système de base de données dans un seul schéma

```ts
const isPg = process.env.DATABASE_URL?.startsWith('postgres');
const sqliteTable: typeof sqliteTableCore = isPg ? (pgTable as any) : sqliteTableCore;
```

Le schéma se réécrit à l'import selon une variable d'environnement, avec des `as any` sur chaque helper — ce qui **désactive la vérification de types précisément là où elle serait la plus utile**. Le typage est mensonger : le compilateur croit voir du SQLite, l'exécution utilise PostgreSQL.

Conséquences vérifiées : `result.changes` inexistant côté PostgreSQL (MS-021), différences de typage booléen, et impossibilité de garantir que ce qui est testé en local correspond à ce qui s'exécute en production.

**Recommandation** : **une seule base dans tous les environnements** — PostgreSQL via Docker en local. Le coût de mise en place (une heure) est très inférieur au coût des divergences.

### 2.3 Identité transportée en paramètre

C'est le défaut le plus structurant. Le motif suivant est présent partout :

```ts
findAllAction(organizationId)  →  clientService.findAll(organizationId)  →  WHERE organization_id = ?
```

L'identité et le locataire sont **des données**, pas un **contexte**. Dès lors qu'ils sont des paramètres, ils sont sous le contrôle de l'appelant, et l'appelant est le navigateur.

**Le contexte d'exécution ne doit jamais franchir la frontière client → serveur en tant que donnée.** Il doit être reconstruit côté serveur à partir d'une preuve cryptographique (le JWT de session).

### 2.4 Absence de contexte de requête

Aucun `AsyncLocalStorage`, aucun conteneur de requête, aucun identifiant de corrélation. Conséquences : impossible de tracer une requête à travers les couches, impossible d'attribuer une action à un utilisateur dans les journaux, impossible d'enquêter après incident.

---

## 3. Évaluation ISO/IEC 25010:2023

| Caractéristique | Note | Commentaire |
|---|---|---|
| **Aptitude fonctionnelle** | Faible | Plusieurs fonctionnalités affichées sont vides (e-mail, notifications, relances, réinitialisation, quotas) |
| **Performance** | Non mesurée | Pas de pagination, recherche en mémoire, aucune indexation |
| **Compatibilité** | Faible | Double SGBD, trois versions d'API Stripe |
| **Utilisabilité** | Moyenne | Parcours cohérents, mais états d'erreur et retours utilisateur lacunaires |
| **Fiabilité** | Très faible | Application non fonctionnelle, aucune sauvegarde, aucune tolérance aux pannes |
| **Sécurité** | Très faible | Aucune frontière de confiance opérationnelle |
| **Maintenabilité** | Moyenne | Structure lisible et modulaire, mais `any` généralisé et duplications |
| **Portabilité** | Faible | Couplage aux variables d'environnement, binaires natifs, configuration Netlify erronée |

---

## 4. Points d'architecture réussis

Il faut les nommer, car ils constituent la base sur laquelle reconstruire :

1. **Le découpage en couches est le bon.** Routes → actions → services → données. Il ne manque « que » le contenu de la couche `actions`.
2. **La couche service contient déjà le bon raisonnement de sécurité.** `if (user.organizationId !== organizationId) throw new AppError(..., 403)` est exactement ce qu'il faut ; seule la source du `userId` est erronée. Corriger cette source répare une grande partie du système.
3. **Drizzle ORM avec requêtes paramétrées** : aucune injection SQL identifiée.
4. **`server-only`** est correctement utilisé sur `lib/db/server.ts` et `organization.service.ts` : le code serveur ne peut pas fuiter dans le bundle client. À généraliser.
5. **Vérification de la signature du webhook Stripe** : faite correctement, alors que c'est l'erreur la plus fréquente.
6. **Le typage TypeScript compile sans erreur** et les interfaces de données sont explicitement définies dans `lib/data/interfaces/`.

---

## 5. Architecture cible recommandée

```
┌──────────────────────────────────────────────────────────────┐
│  Navigateur                                                  │
└───────────────────────────┬──────────────────────────────────┘
                            │ HTTPS + cookie de session signé
┌───────────────────────────▼──────────────────────────────────┐
│  proxy.ts — barrière périmétrique                            │
│  liste blanche exacte · contrôle profileType par segment     │
└───────────────────────────┬──────────────────────────────────┘
┌───────────────────────────▼──────────────────────────────────┐
│  Couche actions — FRONTIÈRE DE CONFIANCE                     │
│  1. requireSession()  → { userId, organizationId, role }     │
│  2. schema.parse(input) (zod .strict())                      │
│  3. autorisation (rôle, plan, quota)                         │
│  4. appel service avec un contexte de confiance              │
│  5. journalisation d'audit                                   │
└───────────────────────────┬──────────────────────────────────┘
┌───────────────────────────▼──────────────────────────────────┐
│  Couche services — métier pur, contexte reçu, jamais deviné  │
└───────────────────────────┬──────────────────────────────────┘
┌───────────────────────────▼──────────────────────────────────┐
│  PostgreSQL — FK · index · transactions · RLS par tenant     │
└──────────────────────────────────────────────────────────────┘
```

**Trois couches de défense pour l'isolation multitenant**, au lieu d'une aujourd'hui contournable :

1. Contexte serveur (`requireOrganization()`) — empêche l'attaque triviale.
2. Filtre SQL applicatif (`WHERE organization_id = ?`) — déjà présent, à conserver.
3. Row-Level Security PostgreSQL — filet de sécurité si les deux premières échouent.

### Signature d'action cible

```ts
'use server';
import { requireOrganization } from '@/lib/auth/require-session';
import { createClientSchema } from '@/lib/validation/schemas';
import { clientService } from '@/lib/services/client.service';
import { audit } from '@/lib/audit';

export async function createClientAction(raw: unknown) {
  const ctx = await requireOrganization();      // identité prouvée
  const data = createClientSchema.parse(raw);   // entrée validée, champs inconnus rejetés
  await assertQuota(ctx, 'clients');            // droits du plan
  const client = await clientService.create(ctx, data);
  await audit(ctx, 'client.created', client.id);
  return client;
}
```

Aucun `organizationId` ni `userId` en paramètre. Aucun `any`. Une seule façon d'entrer dans le système.

---

## 6. Dette technique prioritaire

| Dette | Coût de correction | Coût de non-correction |
|---|---|---|
| Actions sans contexte de sécurité | L (~80 fichiers) | Impossible de mettre en production |
| Double système d'identité | M | Produit non fonctionnel |
| Double système de base de données | M | Divergences local/production imprévisibles |
| `any` généralisé | M (largement résolu par la réécriture des actions) | Aucune sécurité de type sur la surface d'API |
| Absence de tests d'autorisation | M | Toute régression de sécurité passera inaperçue |
| Fonctionnalités fantômes (e-mail, notifications, relances) | M | Promesse commerciale non tenue, support saturé |
