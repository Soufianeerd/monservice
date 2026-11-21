# Invitation des clients à leur espace (migrations 0017–0018)

Date : 10 novembre 2026 — branche de validation `migration-validation` uniquement.

## Problème
Le portail client (devis, factures, interventions, équipements) repose sur
`clients.user_id`. Aucun parcours de l'application ne renseignait ce champ :
seul le seed le faisait. En réel, un client ne voyait donc rien. Par ailleurs,
le rôle runtime pouvait modifier `clients.user_id`, ce qui aurait permis à un
professionnel de rattacher n'importe quel compte à une fiche.

## Parcours
1. Fiche client (`/clients/[id]`) → panneau « Espace client » → e-mail → « Inviter à son espace ».
   Un lien à usage unique (14 jours) est créé, envoyé par Resend si configuré, et affiché pour être copié.
2. Le client ouvre `/invitation/portail?token=…` (page publique) : connexion (retour automatique via `callbackUrl`) ou création de compte.
3. Connecté avec **le compte de l'adresse invitée**, il accepte → la fiche est reliée → `/client/dashboard`.
4. Le professionnel peut retirer l'invitation en attente ou l'accès déjà accordé.

## Sécurité (base = autorité)
- `client_portal_invitations` : RLS professionnelle de l'organisation ; aucun accès client ni anonyme ; jamais de DELETE ; seule la révocation est modifiable ; auteur et dates imposés par trigger ; une seule invitation en attente par fiche ; expiration bornée à 30 jours.
- Le jeton n'est jamais stocké : empreinte SHA-256 uniquement.
- `accept_client_portal_invitation` (SECURITY DEFINER) : compte client actif, e-mail du compte = e-mail invité, invitation en attente non expirée, fiche libre ou déjà reliée à ce compte.
- `unlink_client_portal_account` : professionnel de l'organisation de la fiche uniquement.
- 0018 `trg_protect_client_portal_link` : le rôle runtime ne peut plus modifier `clients.user_id` (l'INSERT de fiche par le portail patient V1 n'est pas touché).

## Correctif associé
`ProtectedLayout` confondait `/clients/...` (CRM) avec l'espace client `/client/...`
(`startsWith('/client')`) et renvoyait le professionnel au tableau de bord dès
l'ouverture d'une fiche client. Remplacé par `isClientAreaPath`.

## Preuves (exécutées le 10/11/2026 sur `migration-validation`)
- `tests/integration/client-portal-invitations.integration.test.ts` : 8/8 (anonyme, inter-tenant, client non invité, mauvais e-mail, usage unique, fiche déjà reliée, détournement direct de `user_id`, retrait).
- Non-régression : field-service-client-portal 7/7, core-billing 24/24, core-privacy 19/19, core-tenant-immutability 58/58, neon-runtime-boundaries 8/8, patient-portal-billing-communication 47/47.
- `db:check-contract` (63 tables), `db:check-custom-objects`, `db:check-drift` (19 migrations) : OK.
- Unitaires : 793/793. E2E `client-portal-invitation.spec.ts` (rejoué 2 fois), `professional-journey`, `client`, `client-journey` : OK.

## Limite connue
Après une **création** de compte, le client doit rouvrir le lien de l'e-mail (le
formulaire d'inscription ne gère pas encore `callbackUrl`).
