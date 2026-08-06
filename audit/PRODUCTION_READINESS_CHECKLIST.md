# Checklist de mise en production — `monservice`

Légende : ✅ PASS · ❌ FAIL · ⬜ NON TESTÉ · ➖ NON APPLICABLE

**État global : 3 ✅ / 61 ❌ / 27 ⬜ — mise en production interdite.**

---

## Sécurité applicative

| Contrôle | Statut | Note |
|---|---|---|
| Toutes les routes privées exigent une session valide | ❌ | MS-001 |
| Toutes les server actions vérifient l'identité | ❌ | MS-002 |
| Toutes les routes API vérifient l'identité | ❌ | 4/7 sans authentification |
| Autorisation appliquée côté serveur, jamais côté client seul | ❌ | MS-002 |
| Identité issue d'une preuve cryptographique (jamais d'un paramètre) | ❌ | MS-005, MS-006 |
| Isolation multitenant vérifiée par test automatisé | ❌ | Aucun test |
| Row-Level Security activée sur la base | ⬜ | MS-022 — **à vérifier en priorité** |
| Aucune donnée sensible exposée par une API | ❌ | MS-003 |
| Affectation de masse impossible (liste blanche de champs) | ❌ | MS-004 |
| Validation d'entrée sur toutes les surfaces | ❌ | MS-033 |
| Requêtes SQL paramétrées | ✅ | Drizzle ORM |
| Mots de passe hachés (bcrypt/argon2) | ✅ | bcrypt coût 10 |
| Politique de mot de passe appliquée | ❌ | MS-017 |
| Limitation de débit sur l'authentification | ❌ | MS-017 |
| Protection anti-bourrage d'identifiants | ❌ | MS-017 |
| MFA disponible | ❌ | Non implémentée |
| En-têtes de sécurité (CSP, HSTS, nosniff, Referrer-Policy) | ❌ | MS-024 |
| Protection CSRF sur les actions mutatives | ⬜ | Protection Next.js native non vérifiée en conditions réelles |
| Configuration CORS restrictive | ⬜ | Non observable sans déploiement |
| Cookies `Secure`, `HttpOnly`, `SameSite` | ⬜ | Défauts NextAuth probablement corrects, non vérifiés |
| Révocation de session effective | ❌ | JWT sans liste de révocation |
| Aucun secret dans le dépôt ou l'historique | ✅ | Vérifié |
| Secrets distincts entre environnements | ❌ | `NEXTAUTH_SECRET` identique local/prod |
| Rotation des secrets documentée | ❌ | Aucune procédure |
| Analyse de dépendances (`npm audit`) en CI | ❌ | MS-028 |
| SBOM généré | ❌ | Aucun |

## Données et sauvegardes

| Contrôle | Statut | Note |
|---|---|---|
| Base de production identifiée et dédiée | ⬜ | Non vérifiable |
| SQLite interdit en production par le code | ❌ | MS-011 |
| Sauvegardes automatiques configurées | ⬜ | Dépend du plan Supabase |
| **Restauration réellement testée** | ❌ | Jamais réalisée |
| RPO et RTO définis | ❌ | Aucun |
| Rétention et immutabilité des sauvegardes | ❌ | Aucune |
| Clés étrangères et contraintes d'intégrité | ❌ | MS-020 |
| Index sur les colonnes de filtrage | ❌ | MS-020 |
| Migrations réversibles et testées | ❌ | Aucun rollback prévu |
| Schéma code ↔ base cohérent | ❌ | Dérive vérifiée (5 colonnes) |
| Séparation stricte production / développement | ❌ | Base de développement avec données réelles |
| Chiffrement au repos | ⬜ | Fourni par Supabase, non vérifié |

## Paiements et revenus

| Contrôle | Statut | Note |
|---|---|---|
| Signature du webhook vérifiée | ✅ | Correct |
| Idempotence des webhooks | ❌ | MS-014 |
| `subscription.deleted` retire les droits | ❌ | MS-014 |
| `payment_failed` géré (période de grâce, relance) | ❌ | Non traité |
| Prix jamais fixé côté client | ✅ | `priceId` serveur |
| Statut « payée » piloté uniquement par Stripe | ❌ | MS-007 |
| Quotas et droits par plan appliqués | ❌ | MS-019 |
| Facture légale conforme et conservée | ❌ | Suppression libre |
| Séparation clés test / production | ⬜ | Non vérifiable |
| Aucune donnée de carte stockée | ✅ | Stripe Checkout hébergé |
| Journal d'audit des opérations financières | ❌ | Aucun |

## Fiabilité et exploitation

| Contrôle | Statut | Note |
|---|---|---|
| L'application démarre et fonctionne | ❌ | MS-008 |
| Le build de production réussit | ❌ | MS-010 |
| Variables d'environnement validées au démarrage | ❌ | MS-009 |
| Health check / readiness | ❌ | Aucun |
| Déploiement sans interruption et rollback testé | ❌ | Aucun |
| SLI / SLO définis | ❌ | Aucun |
| Alertes avec propriétaire et runbook | ❌ | Aucune |
| Journalisation structurée et centralisée | ❌ | MS-025 |
| Identifiants de corrélation | ❌ | Aucun |
| Métriques et traces | ❌ | Aucune |
| Journal d'audit applicatif | ❌ | Aucun |
| Timeouts sur les appels externes | ❌ | Aucun |
| Retry avec backoff, circuit breaker | ❌ | Aucun |
| Dégradation contrôlée en cas de panne d'un tiers | ❌ | Aucune |
| Runbooks et procédure d'incident | ❌ | Aucun |
| Astreinte et canal d'incident | ❌ | Aucun |
| Page de statut | ❌ | Aucune |
| Version déployée traçable | ❌ | Aucune |

## Conformité

| Contrôle | Statut | Note |
|---|---|---|
| Politique de confidentialité complète | ❌ | 19 lignes |
| CGU et mentions légales | ❌ | 21 et 19 lignes |
| Bandeau de consentement cookies | ❌ | Aucun |
| Registre des traitements | ❌ | Aucun |
| DPA avec les sous-traitants | ⬜ | Non documenté |
| Droit d'accès et portabilité (export) | ❌ | MS-030 |
| Droit d'effacement (suppression réelle) | ❌ | MS-030 |
| Durées de conservation définies et appliquées | ❌ | Aucune |
| Procédure de notification de violation | ❌ | Aucune |
| Minimisation des données | ❌ | `SELECT *` généralisé |
| Signature électronique conforme eIDAS | ❌ | MS-007, MS-032 |

## Qualité et livraison

| Contrôle | Statut | Note |
|---|---|---|
| `tsc --noEmit` sans erreur | ✅ | 0 erreur |
| `eslint` sans erreur | ❌ | 251 erreurs |
| CI exécute lint, typecheck et build | ❌ | MS-028 |
| Tests unitaires significatifs | ❌ | 1 test factice sur 3 |
| Tests d'autorisation et d'isolation | ❌ | Aucun |
| Tests E2E exécutables (seed déterministe) | ❌ | Comptes supposés existants |
| Branches protégées et revue obligatoire | ⬜ | Non vérifiable |
| Environnement de production protégé par approbation | ⬜ | Non vérifiable |
| Changelog et versionnage | ❌ | Aucun |

## Interface, accessibilité, performance

| Contrôle | Statut | Note |
|---|---|---|
| Accessibilité WCAG 2.2 AA (test clavier réel) | ⬜ | Non testé |
| Accessibilité (lecteur d'écran) | ⬜ | Non testé |
| Contrastes vérifiés | ⬜ | Non testé |
| Responsive vérifié sur 8 tailles | ⬜ | Non testé |
| Compatibilité navigateurs | ⬜ | Non testé |
| Core Web Vitals mesurés | ⬜ | Non testé |
| Latence backend p95/p99 mesurée | ⬜ | Non testé |
| Tests de charge réalisés | ⬜ | Non réalisés |
| Pagination sur toutes les listes | ❌ | MS-042 |
| États de chargement, vide et erreur cohérents | ❌ | MS-044, MS-045 |
| `robots.txt`, `sitemap.xml`, métadonnées | ❌ | MS-046 |
| Espaces privés en `noindex` | ❌ | Non configuré |

## Support et produit

| Contrôle | Statut | Note |
|---|---|---|
| Envoi d'e-mails opérationnel (SPF/DKIM/DMARC) | ❌ | MS-015 |
| Réinitialisation de mot de passe opérationnelle | ❌ | MS-016 |
| Notifications opérationnelles | ❌ | MS-018 |
| Relances opérationnelles | ❌ | MS-018 |
| Canal de support et documentation d'aide | ❌ | Aucun |
| Interface d'administration / outil support | ❌ | Aucune |
| Le client peut récupérer toutes ses données | ❌ | MS-030 |
| Le client peut supprimer son compte | ❌ | MS-030 |

---

## Conditions de levée du NO-GO

La mise en production ne pourra être réexaminée que lorsque **l'ensemble** des conditions suivantes sera rempli :

1. Les **12 P0** sont corrigés et **retestés** individuellement.
2. La suite de tests d'isolation multitenant existe, couvre les 12 ressources et **bloque la CI**.
3. Une **restauration de sauvegarde réelle** a été effectuée et documentée.
4. La CI exécute lint, typecheck, build, tests unitaires, tests de sécurité et E2E, tous bloquants.
5. La journalisation structurée et au moins trois alertes opérationnelles sont en place.
6. Un **audit de contre-vérification** confirme la correction des P0 — de préférence par un tiers, l'auteur des corrections n'étant pas le mieux placé pour valider son propre travail.
