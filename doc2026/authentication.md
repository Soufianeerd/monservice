# Documentation - Authentification et Sécurité (Supabase)

## Architecture
Le système d'authentification a été migré de `localStorage` vers **Supabase Auth**.
- **AuthContext.tsx** : Fournit le contexte utilisateur, gère la connexion, l'inscription et la déconnexion.
- **userService.ts** : Service dédié aux appels API Supabase pour récupérer ou mettre à jour le profil utilisateur dans la table `users`.
- **Middleware (proxy.ts / server.ts)** : Vérifie le token de session, protège les routes (`/dashboard`, `/client/dashboard`) et configure des cookies `HttpOnly`, `secure` et `sameSite: lax`.

## Flux de Connexion (Login)
1. L'utilisateur saisit son email et son mot de passe dans `LoginForm.tsx`.
2. `AuthContext.login` appelle `supabase.auth.signInWithPassword`.
3. Un cookie HTTP-Only est généré et stocké.
4. Le contexte de session est mis à jour.
5. Redirection selon le profil de l'utilisateur (`/dashboard` pour pro, `/client/dashboard` pour client).

## Nettoyage des anciennes données
Les anciens mock-ups (localStorage) sont purgés via `cleanupLocalStorage()` appelé lors de la connexion/déconnexion, supprimant tout résidu de `monservice_data_*` obsolète concernant la session.

## Tests Unitaires
Les tests unitaires pour l'authentification sont localisés dans `__tests__/auth/auth.test.tsx` et valident les cas de succès et d'échecs (erreurs réseau, mots de passe erronés).
