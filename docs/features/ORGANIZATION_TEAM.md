# Équipe d'une organisation (migration 0019)

## Usage
- **Paramètres > Équipe** (cabinet : « Comptes utilisateurs ») : liste des membres, invitation par e-mail, rôle, retrait.
- Rôles : **Administrateur** (gère l'équipe) et **Membre** (accès aux clients, devis, factures, interventions de l'organisation).
- Le premier professionnel de l'organisation est administrateur tant qu'aucun administrateur n'a été désigné ; ses droits sont inscrits en base à la première opération d'équipe.
- Nombre d'utilisateurs : limite du plan (`teamMembers`), invitations en attente comprises. Avec `LAUNCH_INCLUDED_PLAN=pro` : 5.

## Parcours de l'invité
1. Lien reçu par e-mail (`/invitation/equipe?token=…`, 7 jours, usage unique). Si l'e-mail ne part pas, l'administrateur copie le lien affiché.
2. Sans compte : « Créer mon compte » → inscription limitée à l'adresse invitée, sans création d'entreprise.
3. Avec compte : connexion → la finalisation propose « Rejoindre … », ou la page du lien propose « Rejoindre l'équipe ».
4. Condition : compte professionnel, adresse vérifiée identique à l'adresse invitée, aucune autre organisation.

Un compte n'appartient qu'à une organisation. Un professionnel déjà installé dans son propre espace doit être invité sur une autre adresse.

## Retrait
Le membre retiré garde son rattachement historique (ses rapports, ordres de travail et rendez-vous restent attribués) mais `current_account_is_active()` le refuse dans toutes les politiques. À la connexion, il voit « Accès retiré ». Une nouvelle invitation de la même organisation le réintègre.

## Garanties en base
- `organization_invitations` : RLS réservée aux administrateurs de l'organisation ; auteur et horodatage imposés ; jamais modifiée sauf révocation définitive, jamais supprimée ; jeton jamais stocké (empreinte SHA-256).
- Rattachement uniquement par `accept_organization_invitation` ; `users.organization_id` reste immuable pour le rôle runtime.
- Jamais d'organisation sans administrateur ; un administrateur ne se retire pas lui-même.
- `organization_member_removals` : aucun accès runtime.

## Tests
- `tests/integration/organization-team.integration.test.ts` (CI, Neon, rôle runtime réel).
- `e2e/organization-team.spec.ts` : invitation, rattachement, retrait dans le navigateur.
- `__tests__/unit/services/team-invitation.test.ts`.
