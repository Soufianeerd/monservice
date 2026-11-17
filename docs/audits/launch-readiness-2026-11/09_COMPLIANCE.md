# 09 — Conformité

Analyse d'un auditeur technique, **pas un avis juridique**. Les points marqués « à faire valider » demandent un juriste ou le texte officiel.

## Blocages réglementaires

| ID | Sujet | Constat | Conséquence |
|---|---|---|---|
| LR-006 | Hébergement de données de santé | L'article L.1111-8 du code de la santé publique impose un hébergeur certifié HDS pour les données de santé confiées par des professionnels [1][2]. Aucune preuve de certification HDS de la chaîne actuelle (Neon, stockage objet, Netlify, Resend) n'a été trouvée ; le rapport de migration le consigne déjà comme non démontré | **Paramédical fermé** tant qu'une chaîne certifiée n'est pas contractualisée de bout en bout |
| LR-008 | Facturation électronique | Depuis le 1er septembre 2026, toute entreprise doit pouvoir **recevoir** des factures électroniques ; l'**émission** devient obligatoire le 1er septembre 2027 pour les PME, TPE et micro-entreprises [3][4]. Elle passe par une plateforme agréée | Pas un blocage du pilote. Blocage commercial à échéance : un outil de facturation non relié à une plateforme agréée ne sera plus conforme pour les factures entre professionnels à partir de septembre 2027 |

## Facturation électronique : écarts

| Exigence | Applicable | État MonService |
|---|---|---|
| Recevoir des factures électroniques | Depuis le 1er septembre 2026, à l'utilisateur via la plateforme de son choix | Hors périmètre du produit ; le dire clairement |
| Émettre au format structuré via une plateforme agréée | 1er septembre 2027 pour les clients visés | `einvoice.service.ts` génère de l'UBL mais n'est appelé nulle part ; aucune connexion |
| Transmission des données de transaction (e-reporting) | Même calendrier que l'émission | Absent |
| Nouvelles mentions obligatoires | Avec l'émission | À vérifier sur les gabarits |

Trajectoire raisonnable : ne pas chercher l'agrément ; s'intégrer à une plateforme agréée par API au premier semestre 2027. D'ici là, afficher sans ambiguïté que MonService produit des factures PDF et que le dépôt électronique arrivera avant l'échéance.

## RGPD

| Point | État | Action |
|---|---|---|
| Registre, consentements, demandes d'accès, rétention, notification de violation | Présents et testés | — |
| Mentions légales, confidentialité, conditions, cookies | Pages présentes (`(legal)/*`) | Relire le contenu : éditeur, hébergeurs réels (Neon Francfort, Netlify, Resend), durées. `/cookies` n'est pas dans la liste des chemins publics de `proxy.ts` : vérifier qu'elle s'ouvre sans session |
| Contrat de sous-traitance avec les clients professionnels | Non trouvé | Rédiger une annexe RGPD aux conditions générales (article 28) |
| Liste des sous-traitants ultérieurs | Non trouvée | Publier : Neon, Netlify, Resend, Stripe, avec pays |
| Transferts hors UE | Netlify, Resend et Stripe sont des sociétés américaines | Vérifier régions et clauses ; à faire valider |
| Bandeau cookies | Composant présent | Si aucun traceur non essentiel, un bandeau n'est pas nécessaire ; vérifier ce qui est déposé |
| Analyse d'impact | Non trouvée | Requise avant tout traitement de données de santé à grande échelle ; à faire valider |
| Promesse « standards bancaires » | Non démontrable | Retirer (LR-028) |

## Santé : ce qui manquerait au-delà de l'hébergement

- Second facteur d'authentification (LR-013).
- Identification des professionnels (RPPS, carte ou e-CPS) et, pour les conventionnés, agrément de télétransmission : hors périmètre actuel.
- Journaux d'accès aux dossiers : présents (audit), durée de conservation à définir.
- Durées de conservation des dossiers : paramétrables ; à aligner sur les règles de chaque profession (à faire valider).

## Facturation et fiscalité

- Numérotation continue protégée en base : vérifié par les tests de contraintes.
- TVA multiple : présente. Franchise en base, attestations de TVA réduite pour travaux, mentions d'assurance décennale : non vérifiés sur les gabarits.
- Les conditions générales de vente de MonService et la facturation de ses propres abonnements restent à écrire avant le passage au payant.

## Accessibilité

Voir `06_UX_ACCESSIBILITY.md` : obligation légale a priori non applicable à une microentreprise vendant à des professionnels, à faire valider.

## Classement

| Nature | Éléments |
|---|---|
| Bloquant pour la verticale santé | Hébergement HDS, analyse d'impact |
| Bloquant pour le passage au payant | Conditions générales, annexe de sous-traitance, liste des sous-traitants |
| À échéance (septembre 2027) | Connexion à une plateforme agréée |
| Recommandé | Second facteur, CSP à nonces, accessibilité |

## Sources

1. Agence du numérique en santé, certification HDS — https://esante.gouv.fr/produits-services/hds
2. Agence du numérique en santé, FAQ sur l'article L.1111-8, mise à jour le 16 juillet 2026 — https://esante.gouv.fr/faq/quel-est-lobjectif-du-regime-juridique-de-lhebergement-de-donnees-de-sante-fixe-larticle-l1111-8-du-code-de-la-sante-publique
3. Ministère de l'Économie, facturation électronique — https://www.economie.gouv.fr/tout-savoir-sur-la-facturation-%C3%A9lectronique-pour-les-entreprises
4. Ministère de l'Économie, calendrier — https://www.economie.gouv.fr/node/3240685
