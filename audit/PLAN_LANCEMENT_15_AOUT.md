# Plan de lancement — 6 → 15 août 2026

**9 jours.** Ce plan vise un objectif atteignable, pas l'objectif idéal.

---

## 1. Le seul cadrage qui tient en 9 jours

Vous ne pouvez pas ouvrir une inscription publique le 15 août. Vous pouvez en revanche **encaisser vos premiers clients**, ce qui est probablement le vrai objectif.

### Lancement restreint — 5 à 10 clients pilotes

| | Lancement public | **Lancement restreint** |
|---|---|---|
| Inscription | ouverte à tous | sur invitation, vous créez les comptes |
| Volume | inconnu | 5-10 comptes que vous connaissez |
| Paiement | Stripe live, self-service | Stripe live, ou facturation manuelle |
| Un bug de sécurité | touche des inconnus, incident RGPD | vous appelez le client, vous corrigez |
| Une perte de données | fatale pour la réputation | rattrapable |
| Charge de support | imprévisible | vous répondez au téléphone |

**Ce n'est pas une version au rabais.** C'est la façon dont se lance la majorité des SaaS B2B : des clients pilotes, tarif réduit ou offert les premiers mois, en échange de retours. Vous encaissez, vous validez le produit, et vous ouvrez publiquement en septembre avec un logiciel éprouvé.

Le risque du lancement public est concret : sans RLS vérifiée, sans sauvegarde restaurée et sans qu'aucun parcours n'ait jamais tourné, une fuite de données entre clients vous expose à une notification CNIL sous 72 h et à une réputation abîmée avant même d'avoir commencé.

---

## 2. Les 4 verrous non négociables

Quel que soit le format retenu, ces quatre points doivent être levés. Sans eux, ne facturez personne.

| # | Verrou | Pourquoi | Qui | Durée |
|---|---|---|---|---|
| **V1** | **RLS Supabase vérifiée** | Votre clé publique est dans le bundle. Sans RLS, n'importe qui lit toute la base depuis son navigateur | Vous | 2 h |
| **V2** | **Sauvegarde + une restauration testée** | Une sauvegarde jamais restaurée n'est pas une sauvegarde. Perdre les factures de vos clients est irrattrapable | Vous | 3 h |
| **V3** | **Domaine e-mail vérifié (SPF/DKIM)** | Sans ça : pas de réinitialisation de mot de passe, pas d'envoi de facture. **DNS = commencez aujourd'hui**, la propagation prend jusqu'à 48 h | Vous | 1 h + attente |
| **V4** | **Un parcours complet testé de bout en bout** | Rien n'a jamais tourné. Inscription → client → devis → facture → paiement | Vous | 4 h |

**V3 est le plus urgent** : c'est le seul qui dépend d'une attente externe. Créez le compte Resend et posez les enregistrements DNS **avant ce soir**.

---

## 3. Planning jour par jour

### Jeudi 6 (aujourd'hui) — débloquer l'attente DNS

- [ ] Compte Resend, ajout du domaine, **enregistrements DNS SPF + DKIM posés** ← en premier
- [ ] `DATABASE_URL` complétée dans `.env.local` (Supabase → Settings → Database → URI)
- [ ] `rm -rf node_modules package-lock.json && npm install`
- [ ] `npm run typecheck && npm run build` — doit passer

### Vendredi 7 — base de données (V1 + V2)

- [ ] Sauvegarde manuelle depuis Supabase **avant toute migration**
- [ ] `psql "$DATABASE_URL" -f drizzle/postgres/0001_audit_p0_fixes.sql`
- [ ] `psql "$DATABASE_URL" -f drizzle/postgres/0002_supabase_auth_migration.sql`
- [ ] **Test d'étanchéité RLS** (voir §4) — bloquant
- [ ] **Restauration de la sauvegarde sur un projet Supabase de test** — bloquant

### Samedi 8 — le produit tourne enfin

- [ ] `npm run dev`, puis **le parcours complet** : inscription pro → connexion → client → devis → facture → e-mail reçu → paiement Stripe test
- [ ] Parcours client : compte client → demande → devis reçu → paiement
- [ ] Mot de passe oublié → e-mail → nouveau mot de passe → connexion
- [ ] Noter tout ce qui casse. Il y aura des choses.

### Dimanche 9 — correction de ce qui a cassé

Aucune tâche planifiée : c'est la marge. Elle sera consommée.

### Lundi 10 — isolation et légal

- [ ] **Test croisé** : deux comptes, deux organisations, vérifier qu'aucune donnée ne fuit (menus déroulants, recherche, PDF, URL directes)
- [ ] Compléter les `[CROCHETS]` des mentions légales : raison sociale, SIREN, adresse, directeur de publication
- [ ] Compléter CGU/CGV et politique de confidentialité
- [ ] **Faire relire par un juriste** — comptez 300-800 € pour une relecture de CGV SaaS, c'est un investissement, pas une dépense

### Mardi 11 — Stripe en conditions réelles

- [ ] Produits et tarifs créés dans Stripe **live**
- [ ] Webhook live configuré vers `/api/stripe/webhook`, secret renseigné
- [ ] Test : abonnement → droits accordés → **résiliation → droits retirés** (c'était MS-014)
- [ ] Test : paiement de facture → statut `paid` mis à jour
- [ ] Vérifier qu'un compte Free bute bien sur les quotas

### Mercredi 12 — déploiement

- [ ] Variables d'environnement Netlify complètes (voir `.env.example`)
- [ ] Déploiement en préproduction, reprise du parcours complet **sur l'URL déployée**
- [ ] Vérifier les en-têtes de sécurité : [securityheaders.com](https://securityheaders.com)
- [ ] Test sur mobile réel — aucun test responsive n'a été fait

### Jeudi 13 — préparation opérationnelle

- [ ] Adresse de support et modèles de réponse
- [ ] Comment vous saurez qu'il y a un problème ? Au minimum : alerte Netlify sur les erreurs de fonction, e-mail sur les échecs de webhook Stripe
- [ ] Procédure de restauration écrite, imprimée. Le jour où vous en aurez besoin, vous serez stressé
- [ ] Créer les comptes des clients pilotes

### Vendredi 14 — répétition générale

- [ ] Parcours complet en production, avec un vrai paiement de 1 € que vous remboursez
- [ ] Checklist `PRODUCTION_READINESS_CHECKLIST.md` : cocher ce qui est réellement fait
- [ ] Décision **GO / NO-GO** à froid, le soir

### Vendredi 15 — ouverture aux pilotes

Un client à la fois. Vous les appelez. Vous regardez les journaux.

---

## 4. Le test qui décide de tout

Dans un navigateur, **déconnecté** :

```
https://leydfjctaxohovcmcgea.supabase.co/rest/v1/clients?select=*&apikey=sb_publishable_JmVhCzJkbwHYXm75BTeRxQ__uRjdMtS
```

**Attendu : `[]`**

Si des données apparaissent, arrêtez tout et corrigez avant de continuer. Répétez pour `users`, `invoices`, `deals`, `messages`, `organizations`.

Ce test prend deux minutes et c'est le plus important de la liste.

---

## 5. Ce qui a été corrigé aujourd'hui

| Anomalie | État |
|---|---|
| MS-015 — e-mails simulés | ✅ Intégration Resend réelle, gabarits devis/facture/relance. **Le mode dégradé est visible** : sans clé, l'échec est journalisé au lieu d'un faux succès |
| MS-018 — notifications et relances vides | ✅ Notifications dérivées des données (factures en retard, échéances, tâches) ; relances à J+7/J+15/J+30 avec plafond anti-emballement |
| MS-019 — quotas jamais appliqués | ✅ `plans.ts` source de vérité unique, `assertQuota` / `assertFeature` branchés sur clients, produits, devis, factures, signature, modèles |
| MS-030 — RGPD non exerçable | ✅ Export JSON complet, suppression de compte avec anonymisation comptable, écran dédié |
| MS-046 — SEO et indexation | ✅ `robots.ts`, `sitemap.ts`, `noindex` sur les espaces privés |
| MS-048 — textes légaux squelettiques | ⚠️ Rédigés et structurés, **crochets à compléter + relecture juridique** |

`tsc` : 0 erreur. ESLint : 251 → 80 erreurs depuis le début.

### Nouveaux fichiers

`lib/billing/plans.ts` · `lib/billing/quota.ts` · `lib/email/templates.ts` · `app/actions/email.actions.ts` · `app/actions/gdpr.actions.ts` · `app/(dashboard)/parametres/donnees/page.tsx` · `app/robots.ts` · `app/sitemap.ts`

### Variables à ajouter

```bash
RESEND_API_KEY=re_...
EMAIL_FROM="MonService <contact@votredomaine.fr>"   # domaine vérifié chez Resend
```

---

## 6. Ce qui reste ouvert le 15 août

À assumer consciemment, pas à ignorer :

| Point | Risque en lancement restreint |
|---|---|
| Aucun test automatisé de bout en bout | Moyen — vos tests manuels le compensent partiellement |
| Observabilité limitée (journaux `console`) | **Élevé** — vous découvrirez les pannes par vos clients |
| Accessibilité non testée | Faible commercialement, mais l'European Accessibility Act s'applique depuis juin 2025 |
| Performance non mesurée | Faible à ce volume |
| Pas d'interface d'administration ni d'outil support | Moyen — vous ferez les corrections en SQL |
| 80 erreurs ESLint (`any` dans les services) | Faible — dette technique |
| Signature électronique de valeur probante limitée | Moyen — à mentionner à vos clients pilotes |
| Pas de MFA | Faible à ce stade |

---

## 7. Une remarque, une seule

Votre produit a un vrai périmètre fonctionnel : CRM, devis, factures, marketplace, paiement. Ce qui manquait n'était pas les fonctionnalités mais les fondations — et l'essentiel est maintenant en place.

Le piège, à 9 jours, serait de traiter les 4 verrous comme des formalités. Ils ne le sont pas : **V1** protège les données de vos clients, **V2** protège votre entreprise, **V3** conditionne le fonctionnement du produit, **V4** est la première fois que ce logiciel tournera vraiment.

Si vous deviez n'en faire qu'un seul : **V2**. Une faille se corrige, une perte de données ne se rattrape pas.
