# Documentation RBAC & Cloisonnement

L'application **MonService** implémente un contrôle d'accès basé sur les rôles (RBAC) pour isoler les espaces de travail des différents types d'utilisateurs. 

## 1. Description des profils (`profileType`)

Chaque utilisateur est rattaché à un profil principal défini par la propriété `profileType` (stockée dans Supabase Auth et les fixtures). 

- **`professional`** : L'utilisateur est membre d'une organisation (agence, freelance, etc.). Il a accès à l'ensemble du CRM (Clients, Deals, Factures, Tâches, etc.) pour gérer son activité. Les membres au sein d'une organisation peuvent avoir des rôles spécifiques (`admin`, `member`), mais leur profil global reste `professional`.
- **`client`** : L'utilisateur est un client invité ou ayant un accès limité. Il a uniquement accès à son propre portail client pour consulter ses factures, signer des devis, et interagir avec ses prestataires via la messagerie.

## 2. Matrice des permissions

| Espace / Route | Accessible par `professional` | Accessible par `client` | Commentaire |
| --- | --- | --- | --- |
| `/dashboard/*` | ✅ Oui | ❌ Non | Espace de gestion CRM, redirige vers `/forbidden` si un client tente d'y accéder. |
| `/clients`, `/deals`, etc. | ✅ Oui | ❌ Non | Toutes les sous-routes CRM sont protégées. |
| `/client/dashboard` | ❌ Non | ✅ Oui | Portail client, redirige vers `/forbidden` si un professionnel tente d'y accéder. |
| `/api/deals/sign` | ✅ Oui | ✅ Oui | API utilisée par les deux types d'utilisateurs. |
| `/profile` | ✅ Oui | ❌ Non | Remplacé par `/client/profile` pour les clients. |

## 3. Mécanismes de Sécurité

### A. Le Middleware (`src/proxy.ts`)
Le routeur intercepte toutes les requêtes entrantes avant même qu'elles n'atteignent l'application Next.js. Il extrait le JWT de Supabase, lit le `profileType` et bloque les chemins non autorisés par une redirection 307 vers `/forbidden`. 

### B. Les Layouts Serveurs
Les fichiers `src/app/(dashboard)/layout.tsx` et `src/app/client/layout.tsx` vérifient l'identité de l'utilisateur côté serveur avec `supabase.auth.getUser()`. Si un utilisateur parvient à contourner le middleware, le serveur refusera de faire le rendu de la page.

### C. Le Hook `useRole` & le composant `<RoleGate>`
- **`useRole()`** : Renvoie le profil courant de manière synchrone depuis le `AuthContext`.
- **`<RoleGate>`** : Un composant d'interface qui encapsule du contenu et ne l'affiche que si l'utilisateur possède l'un des rôles listés dans la prop `allowedRoles`.

## 4. Ajouter un nouveau rôle

Pour ajouter un nouveau rôle (par exemple `super_admin`) :
1. Mettez à jour le type TypeScript `ProfileType` dans `src/lib/data/interfaces.ts`.
2. Mettez à jour la matrice du `proxy.ts` pour définir quelles routes sont autorisées pour `super_admin`.
3. Utilisez `<RoleGate allowedRoles={['super_admin']}>` pour afficher des boutons d'administration globale dans l'UI.
4. Mettez à jour les layouts côté serveur pour accepter ce rôle.
5. Complétez cette documentation.
