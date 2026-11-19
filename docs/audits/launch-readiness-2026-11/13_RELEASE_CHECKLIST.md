# 13 — Score, registre des problèmes et critères de mise en production

## Score de maturité : 55/100

| Domaine | Poids | Note | Confiance | Justification |
|---|---:|---:|---|---|
| Sécurité et isolation des données | 20 | 14 | Moyenne | Isolation en base exemplaire et testée le 10 nov. ; mais accès client ouverts contre la règle V1, pas de second facteur, limitation de débit non branchée ; aucun test actif |
| Fonctionnalités et parcours métier | 20 | 11 | Moyenne | Cœur devis-facture et terrain testés ; acceptation du devis impossible en V1, pas d'équipe, plafonds gratuits |
| Fiabilité, tests, infrastructure | 15 | 8 | Élevée | 802 tests unitaires verts ; CI rouge depuis 6 jours ; sauvegardes à 6 h ; aucune supervision |
| Conformité | 15 | 8 | Faible | RGPD outillé ; santé bloquée ; facturation électronique absente ; documents contractuels à écrire ; pas d'avis juridique |
| UX et accessibilité | 10 | 5 | **Faible** | Examen statique seulement |
| Valeur et différenciation | 10 | 5 | Faible | Atouts réels sur le terrain, aucune mesure |
| Commercialisation et exploitation | 10 | 4 | Élevée | Pas d'e-mails, pas de site déployé, pas de planificateur, pas de support outillé |

Le score n'annule aucun blocage P0.

## Décision

- **NO-GO** pour une ouverture publique en l'état.
- **GO PILOTE LIMITÉ** (Générique + Terrain, 5 à 10 professionnels invités) dès que les six cases « P0 » ci-dessous sont cochées.
- **NO-GO** pour le paramédical avec données réelles.

## Registre des problèmes

Gravité : C critique, É élevée, M moyenne, F faible. Effort en jours.

| ID | Verticale | Module | Description | Preuve | Impact utilisateur / commercial | Grav. | Effort | Solution | Test de validation | Prio. | Statut |
|---|---|---|---|---|---|---|---|---|---|---|---|
| LR-001 | Toutes | Accès | Accès client/patient ouverts | `RegisterForm.tsx:333`, `src/app/client/` (21 pages), `0009` | Contraire au périmètre V1 ; surface d'attaque et de support | C | 2 | Fermeture base + serveur + interface | Refus action, SQL, routes | P0 | Ouvert |
| LR-002 | Toutes | Devis | Acceptation réservée au compte client | `authorization.ts:40-45`, `quote.service.ts:523` | Chaîne devis-facture bloquée | C | 2 | Acceptation par le professionnel | Parcours sans compte client | P0 | Ouvert |
| LR-003 | Toutes | Plans | Plan gratuit plafonné, sans mise à niveau, jamais testé | `plans.ts:49-68`, `seed-local.ts:963` | Blocage au 11ᵉ devis | C | 0,5 | Droits pilote | Parcours sur compte neuf | P0 | Ouvert |
| LR-004 | Toutes | E-mails | Pas de domaine d'envoi vérifié | Checklist de lancement | Inscription impossible | C | 0,5 + DNS | Domaine, Resend, SMTP | Code reçu sur boîte réelle | P0 | Ouvert |
| LR-005 | Toutes | Base | Rétention 6 h, restauration non testée | `neon-migration.md:76` | Perte de données définitive | C | 0,5 | Plan Neon + exercice | Restauration consignée | P0 | Ouvert |
| LR-006 | Paramédical | Hébergement | HDS non démontré ; pas de télétransmission | `neon-migration.md:403, 452` | Verticale invendable | C | — | Garder fermé | — | P0 (verticale) | Maîtrisé par fermeture |
| LR-034 | Toutes | CI | Rouge depuis le 11 nov., PR non mergée | Runs listés dans `12` | Aucune livraison possible | É | 0,5 | Confirmer `e4c82fc`, scinder le job | Run vert | P0 | Correctif poussé |
| LR-007 | Toutes | Équipe | Pas d'invitation de collaborateur | Aucun code | Agences, cabinets, équipes exclus | É | 3 | Invitation, rôles, retrait | Deux comptes, droits distincts | P1 | Ouvert |
| LR-008 | Générique, BTP | Facturation | Facturation électronique non branchée | `einvoice.service.ts` sans appelant | Non-conformité en sept. 2027 ; argument concurrent dès maintenant | É | 5–8 | Connexion à une plateforme agréée | Dépôt d'une facture test | P1 | Ouvert |
| LR-009 | Toutes | Planification | Aucune tâche planifiée | `netlify.toml` | Relances et rétention inopérantes | M | 0,5 | Fonctions planifiées | Rappel reçu | P1 | Ouvert |
| LR-010 | Toutes | Exploitation | Pas de suivi d'erreurs ni de pages d'erreur | 0 `error.tsx` | Pannes invisibles, pages brutes | É | 1 | Suivi + pages | Alerte sur erreur provoquée | P1 | Ouvert |
| LR-011 | Toutes | Page d'accueil | Tarifs, secteurs et promesses incohérents | `Pricing.tsx`, `Sectors.tsx`, `FAQ.tsx:26` | Conversion, risque juridique | M | 0,5 | Réécriture « pilote » | Relecture | P1 | Ouvert |
| LR-013 | Santé surtout | Authentification | Pas de second facteur | `mfa.service.ts` | Risque sur comptes sensibles | É / M | 2 | Selon prise en charge Neon Auth | Connexion à deux facteurs | P1 santé, P2 | Ouvert |
| LR-014 | Toutes | Authentification | Limitation de débit non branchée | `rate-limit.ts` non importé | Force brute, abus d'inscription | M | 1 | Vérifier Neon Auth, limiter les actions | Test de rafale | P1 | Ouvert |
| LR-028 | Toutes | Communication | « Standards bancaires » | `FAQ.tsx:26` | Promesse non démontrable | M | 0,1 | Faits vérifiables | Relecture | P1 | Ouvert |
| LR-015 | Toutes | En-têtes | CSP `unsafe-inline` / `unsafe-eval` | `next.config.ts` | Défense en profondeur réduite | M | 2 | Nonces | Test CSP | P2 | Connu |
| LR-016 | Toutes | En-têtes | `no-store` incomplet | `next.config.ts` | Mise en cache de pages privées | M | 0,25 | Étendre le motif | Test d'en-têtes | P2 | Ouvert |
| LR-017 | Toutes | Stripe | Route de simulation embarquée | `webhook/simulate/route.ts` | Risque si mauvaise configuration | M | 0,25 | Exclure du build | 404 en production | P2 | Ouvert |
| LR-019 | Toutes | Code | Dette : fichiers géants, casts, lint, code mort, résidus | `01` | Maintenabilité | F | Continu | Par lots | — | P2–P3 | Ouvert |
| LR-020 | — | Dépendances | 2 élevées en développement | `npm audit` | Aucun en exécution | F | 0,25 | Mise à jour | Audit propre | P3 | Ouvert |
| LR-021 | Toutes | Authentification | SDK bêta | `package.json` | Instabilité fournisseur | M | 0,25 | Version figée, veille | Tests d'authentification | P2 | Accepté |
| LR-022 | Toutes | Marketplace | Sans clients connectés, sans objet | Règle V1 | Écran vide | F | 0,1 | Masquer | Navigation | P2 | Ouvert |
| LR-023 | Toutes | Messagerie | Idem | Règle V1 | Écran vide | F | 0,1 | Masquer | Navigation | P2 | Ouvert |
| LR-024 | Santé | Inscription | Fermeture de secteur applicative seulement | `options.ts`, `0009` | Contournement théorique | F | 0,5 | Contrôle en base | Test SQL | P2 | Ouvert |
| LR-025 | Toutes | Données | Comptes importés de type inconnu | Rapport d'import | Comptes clients existants à traiter | M | 0,25 | Comptage en lecture seule | Rapport | P1 | À vérifier |
| LR-026 | Toutes | Performance | Lot client de 1,49 Mo | Build local | Lenteur mobile | M | 1 | Chargement à la demande | Taille du lot | P2 | Ouvert |
| LR-027 | Toutes | Build | Secret lu au chargement du module | `db/server.ts:7` | Builds fragiles | F | 0,5 | Lecture paresseuse | Build sans secret | P2 | Ouvert |
| LR-029 | Toutes | Base | 0014–0018 non rejouées en production | Checklist | Étape de bascule | É | 0,25 | Procédure existante | Trois vérifications | P0 (bascule) | Planifié |
| LR-033 | Toutes | Environnements | Aperçus Netlify sans base | Checklist | Aperçus en échec | F | 0,5 | Branche Neon dédiée | Aperçu vert | P3 | Ouvert |
| LR-035 | — | Secrets | Identifiants de production sur le poste | Fichiers `.env.neon-production*.local` | Fuite en cas de perte du poste | M | 0,25 | Coffre de secrets, disque chiffré | — | P2 | Ouvert |
| LR-036 | Toutes | Support | Pas de console ni de procédure d'incident | — | Support par la base | M | 1 | Procédure d'une page, puis console | — | P2 | Ouvert |
| UX-01…20 | Toutes | Interface | Voir `06_UX_ACCESSIBILITY.md` | Comptages | Adoption | M | Variable | — | Séance de test | P1–P3 | À confirmer |

## Critères de mise en production du pilote

### P0 — obligatoires
- [ ] LR-034 : run CI vert sur le commit à déployer, PR mergée.
- [ ] LR-002 : un devis est accepté par le professionnel et mène à la facture, test à l'appui.
- [ ] LR-001 : inscription « particulier » refusée par l'action et par la base ; `/client/*`, `/invitation/portail`, `/devis/[id]/sign` inaccessibles.
- [ ] LR-003 : un compte neuf déroule le parcours complet sans plafond bloquant.
- [ ] LR-004 : code de vérification et lien de réinitialisation reçus sur une boîte réelle.
- [ ] LR-005 : restauration à un instant donné exercée et consignée.

### Bascule
- [ ] LR-025 : comptes existants comptés par type.
- [ ] LR-029 : migrations rejouées, dérive, contrat et objets vérifiés.
- [ ] Variables Netlify de production installées, préflight au vert.
- [ ] Trois secteurs ouverts aux professionnels (`NEXT_PUBLIC_CLOSED_REGISTRATION_SECTORS` non défini).
- [ ] Feu vert explicite de Soufiane.

### Avant le premier pilote
- [ ] LR-010 : suivi d'erreurs et sonde actifs ; pages d'erreur en place.
- [ ] LR-011, LR-028 : page d'accueil alignée.
- [ ] LR-007 : invitation de collaborateur, ou pilotes limités aux professionnels seuls.
- [ ] Conditions d'utilisation du pilote et information RGPD remises aux pilotes.
- [ ] Séance de test UX et accessibilité tenue, résultats consignés.

### Après ouverture, vérifications en ligne
- [ ] Inscription d'un compte réel consentant, client, devis, acceptation, facture.
- [ ] Refus d'accès entre deux organisations réelles de test.
- [ ] Alerte reçue sur une erreur provoquée.

## Réponses aux 20 questions

1. **De bout en bout ?** Oui sur données de test jusqu'au 10 novembre, avec comptes clients. En V1 sans comptes clients : non, tant que LR-002 est ouvert.
2. **Parcours** : opérationnels — inscription, clients, devis, interventions, équipements, facturation ; cassés en V1 — acceptation du devis ; incomplets — équipe, relances, modèles de messages.
3. **Isolation des organisations** : oui d'après la conception et les tests du 10 novembre ; non rejoué.
4. **Données paramédicales** : cloisonnées techniquement, pas hébergées de façon démontrée conforme.
5. **Risques majeurs** : LR-001, LR-005, LR-013, LR-014, LR-021.
6. **Neon** : architecture prête ; exploitation à compléter (sauvegardes, rejeu des migrations) ; inadaptée aux données de santé en l'état.
7. **Interface intuitive ?** Non évalué avec des utilisateurs ; risques identifiés dans `06`.
8. **Inutile ou trop complexe en V1** : marketplace, messagerie, portails, quatre langues, routes MFA mortes.
9. **Manques essentiels** : acceptation par le professionnel, équipe, e-mails, facturation électronique, import.
10. **Chez les concurrents** : plateforme agréée, équipes, bibliothèque de prix, mobile, paiement en ligne.
11. **Réellement meilleur** : chaîne unique du devis à l'équipement suivi, pour les mainteneurs.
12. **Temps et argent gagnés** : non mesurable aujourd'hui ; protocole dans `08`.
13. **Meilleure verticale immédiate** : Terrain, sous-segment maintenance et dépannage.
14. **Tarification** : hypothèses 19–25 € seul, 49 € pour trois ; à tester.
15. **Contraintes bloquantes** : HDS (santé) ; facturation électronique à septembre 2027.
16. **Minimum avant commercialisation** : les six P0, puis LR-007, LR-010, LR-011.
17. **Peut attendre** : CSP à nonces, dette, mobile, version N, santé.
18. **Risques résiduels** : développeur unique, SDK bêta, positionnement générique.
19. **Premiers payants** : réseau direct, installation accompagnée, un cas chiffré.
20. **Maintenant, pilote ou après corrections ?** Pilote limité, après correction des P0.
