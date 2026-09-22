# MonSERVICE — Field Services & BTP Operating System Blueprint
**Version :** 1.0.0 (Session 16 Multi-Vertical Foundation)  
**Status :** Approved Product Specification & Architectural Blueprint  
**Scope :** BTP, Artisans, Métiers Techniques, Maintenance, Automobile, Réparation, Paysage, Fabrication Artisanale

---

## 1. Executive Summary & Vision

**MonSERVICE** est un **Business Operating System métier adaptatif multi-vertical**. 

Contrairement aux logiciels verticaux rigides ou aux CRMs génériques déconnectés du terrain, MonSERVICE combine un **Core d'entreprise robuste** (gestion commerciale, facturation, conformité, sécurité hermétique) avec des **Workspaces adaptatifs et contextualisés** pour chaque famille de métier.

Après le gel de la verticale **Paramédicale V1**, la session 16 inaugure la fondation de la verticale **Field Services / BTP & Métiers Techniques**, englobant :
- Le bâtiment, gros œuvre et second œuvre (BTP)
- L'architecture, la maîtrise d'œuvre et les bureaux d'études
- L'installation, la maintenance et le dépannage multi-technique
- L'automobile, la mécanique et la carrosserie
- La réparation d'appareils électroniques et électroménagers
- L'aménagement paysager et les extérieurs
- La fabrication artisanale et sur-mesure
- Le commerce artisanal et les prestations techniques de proximité.

---

## 2. Core Common Foundation (Le Noyau Commun)

MonSERVICE repose sur une couche transversale commune à toutes les verticales :
1. **Identité, Authentification & Sécurité** : Supabase Auth, gestion des sessions sécurisées serveur, MFA TOTP, RLS hermétique PostgreSQL.
2. **Multi-Tenant & Cloisonnement** : Organisation serveur obligatoire (`organizationId`), politique du moindre privilège, isolation stricte par tenant.
3. **CRM & Répertoire Contacts** : Fiches clients, multi-contacts, adresses, historique unifié.
4. **Pipeline Commercial** : Leads, opportunités d'affaires (`deals`), étapes d'avancement, prévisionnel de chiffre d'affaires.
5. **Devis & Facturation** : Moteur de calcul HT/TVA/TTC, acomptes, remises, génération PDF, archivage légal, conformité fiscale.
6. **Paiements & Trésorerie** : Intégration Stripe (Connect & Checkout), suivi des règlements, échéanciers.
7. **Planning & Organisation** : Agenda calendaire, gestion des disponibilités, tâches et rappels.
8. **Messagerie & Communications** : Échanges sécurisés, modèles de messages, notifications.
9. **Conformité & RGPD** : Registre des activités, gestion des demandes DSAR, déclarations de violations, consentements et durées de conservation.

---

## 3. Field Service Shared Modules (Modules Partagés Terrain)

Les modules transversaux partagés par l'ensemble des métiers de terrain (introduits dès les Sessions 17+) :
- **Chantiers & Interventions (Jobs & Work Orders)** : Suivi opérationnel des missions sur site ou en atelier.
- **Sites & Géolocalisation** : Multi-adresses clients, repérage cartographique, contraintes d'accès terrain.
- **Planning d'Équipe & Affectations** : Attribution des interventions aux techniciens et chefs d'équipe.
- **Preuves Terrain & Photos Avant/Après** : Horodatage certifié, géolocalisation, stockage sécurisé des photos de réalisations.
- **Rapports d'Intervention & Signatures** : Émargement électronique sur smartphone/tablette à la fin des travaux.
- **Gestion des Temps** : Saisie des heures passées par collaborateur sur chaque chantier.
- **Matériaux & Approvisionnements** : Consommation de pièces, matières premières et fournitures.
- **Portail Client** : Espace en ligne sécurisé pour signature des devis, validation des acomptes et suivi d'avancement.

---

## 4. Customer Acquisition & Local Visibility (Acquisition & Visibilité Locale)

Pour développer le carnet de commandes des artisans :
- **Mini-site vitrine professionnel & Fiche Google Business Profile intégrée**
- **Référencement local (Local SEO)** optimisé par zone géographique d'intervention et spécialité
- **Portfolio numérique dynamique** (galerie photos avant/après classées par catégorie de travaux)
- **Catalogue de prestations & grille tarifaire indicative**
- **Formulaire de demande de devis & prise de rendez-vous en ligne 24/7**
- **Formulaires interactifs de qualification de besoin** (photos du problème déposées par le prospect).

---

## 5. Trust & Credibility Layer (Confiance & Attestations Légales)

Garantir la crédibilité institutionnelle et rassurer le maître d'ouvrage :
- **Coffre-fort d'assurances & qualifications** : Garantie décennale, Responsabilité Civile Professionnelle (RC Pro), attestations URSSAF.
- **Labels & Certifications officielles** : RGE (Reconnu Garant de l'Environnement), Qualibat, Qualifelec, Qualipac, Qualibois, Certibiocide, Artisan d'Art.
- **Collecte automatisée d'avis clients vérifiés** après chaque fin de chantier.
- **Badge de vérification d'entreprise** attestant de l'immatriculation SIRENE et des assurances valides.

---

## 6. Unified Client Record (Le Dossier Client Unifié à 360°)

Chaque fiche client constitue le dossier d'historique complet :
- **Contacts & Décisionnaires** : Particulier, syndic, architecte, gestionnaire de patrimoine.
- **Sites & Adresses d'intervention** : Domicile, résidence secondaire, immeuble, atelier.
- **Équipements & Biens rattachés (Customer Assets)** : Chaudière, véhicule, toiture, installation électrique, smartphone.
- **Historique chronologique continu** : Appels, emails, devis émis, chantiers réalisés, factures, encaissements, photos, garanties en cours.

---

## 7. Sales & Opportunities Pipeline (Gestion Commerciale)

- **Suivi des demandes entrantes (Leads)** depuis le site internet, téléphone ou recommandations.
- **Pipeline Kanban visuel** : *Prise de contact → Visite technique / Diagnostic → Devis envoyé → Négociation → Devis accepté / Acompte payé → En cours de planification → Perdu (avec motif)*.
- **Relances automatisées des devis en attente** par email ou SMS avec proposition de créneau d'échange.

---

## 8. Advanced Quoting Engine (Moteur de Devis Avancé BTP)

- **Décomposition précise des coûts** : Fournitures, matériaux, main-d'œuvre qualifiée, matériel en location, frais de déplacement.
- **Unités de métrés professionnelles** : Mètres carrés ($m^2$), mètres linéaires ($ml$), mètres cubes ($m^3$), forfaits, heures, unités.
- **Bibliothèques d'ouvrages & tarifs fournisseurs** intégrables.
- **Variantes et options chiffrées** (ex: *Option carrelage grand format*, *Option domotique*).
- **Gestion des taux de TVA réduits** (TVA 5,5 % rénovation énergétique, TVA 10 % amélioration de l'habitat, TVA 20 % standard).
- **Signature électronique sécurisée du devis + Paiement en ligne immédiat de l'acompte**.

---

## 9. Construction Project Management (Gestion de Chantier BTP)

- **Fiche chantier structurée** : Adresse, chef de chantier, budget initial vs consommé, dates prévisionnelles et réelles.
- **Découpage en lots techniques & sous-traitance** (gros œuvre, électricité, plomberie, menuiserie, finitions).
- **Plans & Documents techniques** : Plans d'architecte, permis de construire, schémas électriques, fiches techniques fabricants.
- **Journal de bord & météo du chantier** : Notes journalières et photos de l'avancement.

---

## 10. Advanced BTP — Situations de Travaux & Réserves

- **Factures de situations d'avancement** : Émissions successives au pourcentage d'avancement par lot ($20\,\%$, $50\,\%$, $80\,\%$, solde $100\,\%$).
- **Retenues de garantie légales ($5\,\%$)** et cautions bancaires substitutives.
- **Procès-verbal de réception de travaux (PV de réception)** : Sans réserve ou avec réserves détaillées.
- **Gestion et levée des réserves** avec photos justificatives.

---

## 11. Architecture & Master of Works / MOE

- **Missions de maîtrise d'œuvre (loi MOP ou marché privé)** : ESQ, APS, APD, PRO, ACT, VISA, DET, AOR.
- **Dossiers de Consultation des Entreprises (DCE)** : CCTP, CCAP, DPGF, DQE, Actes d'engagement.
- **Analyse des offres et passation des marchés de travaux**.
- **Comptes rendus de chantier hebdomadaires normés** diffusés automatiquement à toutes les entreprises du groupement.

---

## 12. Field Interventions & Dispatch (Dépannage & Interventions Rapides)

- **Traitement des urgences & dépannages** : Fuite d'eau, panne de chauffage, serrure bloquée, court-circuit.
- **Dispatching géolocalisé** : Affectation au technicien le plus proche et qualifié.
- **Validation mobile** : Rapport d'intervention immédiat + signature client sur l'écran + émission automatique de la facture.

---

## 13. Mobile-First Field UX (Expérience Terrain Mobile)

- Interface ultra-réactive pour smartphones et tablettes iOS / Android.
- Consultation du planning de la journée et guidage GPS en un clic (Waze / Google Maps / Apple Maps).
- Prise de photos haute résolution avec annotations directes.
- Fonctionnement résilient avec synchronisation automatique dès retour du réseau.

---

## 14. Automotive & Mobility (Garage & Centre Automobile)

- **Fiche Véhicule** : Immatriculation (SIV), numéro de série (VIN), marque, modèle, motorisation, kilométrage.
- **Ordre de Réparation (OR)** : État des lieux d'entrée, symptômes signalés, travaux autorisés par le client.
- **Barèmes de temps constructeur & chiffrage des pièces détachées**.
- **Rappel automatique des révisions & contrôles techniques** selon l'échéance et le kilométrage estimé.

---

## 15. Device & Electronics Repair (Réparation d'Appareils & Téléphonie)

- **Dossier de prise en charge d'appareil** : Type (smartphone, PC, tablette, électroménager), marque, modèle, n° de série / IMEI, accessoires déposés, code de déverrouillage, état visuel initial (rayures, chocs).
- **Workflow de réparation normé** :  
  `Reçu en atelier` $\rightarrow$ `Diagnostic en cours` $\rightarrow$ `Attente accord client (devis)` $\rightarrow$ `Attente pièce détachée` $\rightarrow$ `En réparation` $\rightarrow$ `En test de validation` $\rightarrow$ `Prêt à restituer` $\rightarrow$ `Restitué & Garanti`.
- **Garantie sur pièces et main-d'œuvre** enregistrée et traçable.

---

## 16. Inventory & Stock Management (Stocks & Fournitures)

- **Gestion des références, consommables et outillage**.
- **Multi-emplacements** : Dépôt central, atelier, véhicules d'intervention (stock embarqué).
- **Seuils d'alerte et réapprovisionnement automatique**.
- **Valorisation du stock (PMP)** et traçabilité des mouvements d'entrée/sortie.

---

## 17. Purchasing & Supplier Management (Achats & Fournisseurs)

- Répertoire des fournisseurs et négociants (Point.P, Rexel, CEDEO, Richardson, etc.).
- Bons de commande fournisseurs avec imputation directe sur un chantier ou intervention.
- Rapprochement factures fournisseurs vs bons de livraison.

---

## 18. Fleet & Equipment (Flotte de Véhicules & Gros Outillage)

- Suivi des utilitaires : Kilométrage, date du contrôle technique, entretien mécanique, assurance.
- Attribution des véhicules aux techniciens et affectation du gros outillage (échafaudages, carotteuses, caméras d'inspection).

---

## 19. Team Management & Subcontracting (Équipes & Sous-Traitance)

- Gestion des ouvriers, apprentis, conducteurs de travaux et sous-traitants.
- Suivi des habilitations obligatoires (CACES, Habilitation électrique B1/B2/BR, Travail en hauteur, SS4 amiante).
- Planning des congés, absences et heures supplémentaires.

---

## 20. Skills Matching Engine (Adéquation Compétences / Missions)

- Algorithme d'affectation automatique d'une intervention selon les certifications exigées (ex: *Qualigaz* pour une intervention gaz, *RGE* pour pose de pompe à chaleur).

---

## 21. Billing & Financial Flows (Facturation & Règlements)

- Factures d'acomptes, factures de situations d'avancement, factures de solde, avoirs partiels ou totaux.
- Liens de paiement CB Stripe et QR Codes de paiement sur facture.
- Préparation à la **Facturation Électronique obligatoire (Factur-X / PDP / PPF)**.

---

## 22. Profitability & Margin Analysis (Rentabilité en Temps Réel)

- Calcul de marge analytique pour chaque chantier et intervention :  
  $$\text{Marge Brute} = \text{CA HT} - (\text{Achats Matériaux} + \text{Sous-Traitance} + \text{Coût Main-d'Œuvre} + \text{Déplacements})$$
- Tableaux de bord de rentabilité par activité, par client et par technicien.

---

## 23. After-Sales & Warranty (SAV & Garanties)

- Gestion des demandes d'intervention sous garantie (garantie de parfait achèvement 1 an, garantie biennale 2 ans, garantie décennale 10 ans).
- Traçabilité des pièces remplacées et historique d'intervention.

---

## 24. Recurring Maintenance Contracts (Contrats d'Entretien Récurrents)

- Gestion des contrats annuels (chaudières, climatisation, adoucisseurs, portails automatiques, toitures).
- Génération automatique des tournées d'entretien et facturation périodique automatisée.

---

## 25. Dedicated Customer Portal (Portail Client Terrain)

- Espace web sécurisé dédié au client / maître d'ouvrage :
  - Consultation et signature électronique des devis
  - Règlement des acomptes par carte bancaire
  - Visualisation des photos d'avancement du chantier
  - Téléchargement des factures et attestations de garantie
  - Demande d'intervention ou de SAV.

---

## 26. Omnichannel Communication (Communication Omnicanale)

- Centralisation des échanges : SMS de confirmation d'arrivée du technicien, rappels automatiques, emails transactionnels, messages portail.

---

## 27. Reviews & Reputation Automation (Gestion de la Réputation)

- Envoi automatique d'un SMS/Email de satisfaction dès la clôture de l'intervention.
- Lien direct vers la fiche Google Business Profile de l'artisan pour les clients satisfaits.

---

## 28. Retention & Re-engagement (Fidélisation & Relances Périodiques)

- Détection intelligente des relances de maintenance :
  - *Chaudière entretenue il y a 11 mois $\rightarrow$ proposition de rendez-vous d'entretien annuel*
  - *Véhicule révisé il y a 1 an ou +15 000 km $\rightarrow$ alerte révision*
  - *Aménagement paysager $\rightarrow$ proposition d'élagage automnal ou taille de printemps*.

---

## 29. Document Vault & Expiry Management (Gestion Documentaire Légale)

- Archivage sécurisé avec alertes d'expiration automatique pour les assurances décennales, certificats d'étalonnage et qualifications RGE.

---

## 30. Executive Dashboard & KPIs (Tableau de Bord de Direction)

- Indicateurs clés en temps réel : Chiffre d'affaires facturé vs encaissé, devis en attente de validation, volume de chantiers actifs, taux de marge moyen, factures impayées.

---

## 31. AI Business Architecture (Intelligence Artificielle Métier)

- L'IA dans MonSERVICE n'est pas un simple chatbot, mais un **moteur d'assistance opérationnelle connecté au graphe métier** :
  - Génération de descriptifs de devis à partir de notes vocales de chantier
  - Détection des anomalies de marge ou dépassements budgétaires
  - Résumé automatique des comptes rendus de réunion de chantier.

---

## 32. Automation Engine (Moteur d'Automatisations Métier)

- *Déclencheur : Devis signé* $\rightarrow$ *Création de la facture d'acompte + Réservation du créneau chantier + Notification client*.
- *Déclencheur : Chantier clôturé* $\rightarrow$ *Émission de la facture de solde + Envoi de la demande d'avis client + Enregistrement de la garantie*.

---

## 33. Specialized Module Matrix (Matrice par Métier)

| Famille / Métier | Workflow Principal | Modèle d'Actif Client | Modules Cœur Actifs | Modules Spécialisés Futurs |
| :--- | :--- | :--- | :--- | :--- |
| **Maçon / BTP** | Projet (Chantier) | Propriété / Ouvrage | CRM, Devis, Factures, Agenda | Lots, Métrés $m^2/m^3$, Situations, Sous-traitance |
| **Plombier / Chauffagiste** | Projet & Intervention | Équipement Bâtiment | CRM, Devis, Factures, Agenda | Équipements chaudières, Contrats entretien, Dépannage |
| **Électricien / HVAC** | Projet & Intervention | Équipement Bâtiment | CRM, Devis, Factures, Agenda | Schémas, Habilitations, Climatisation, Fluides |
| **Architecte / Maître d'œuvre** | Projet (Mission MOE) | Propriété / Projet | CRM, Devis/Honoraires, Factures | Phases ESQ/PRO/DET, DCE, DPGF, Comptes rendus |
| **Garage Automobile** | Ordre de Réparation (OR) | Véhicule (VIN/Immat) | CRM, Devis, Factures, Agenda | Fiche véhicule, Diagnostic, Pièces, Kilométrage |
| **Réparateur Téléphone / PC** | Dossier Réparation | Appareil (IMEI/Série) | CRM, Devis, Factures, Agenda | Statuts réparation atelier, Pièces, Tests, Garantie |
| **Paysagiste** | Projet & Intervention | Propriété / Site | CRM, Devis, Factures, Agenda | Tournées d'entretien, Saisons, Matériel espaces verts |
| **Fabricant Artisan / Atelier** | Projet / Commande | Produit Sur-Mesure | CRM, Devis, Factures, Agenda | Fiches de débit, Matières, Planning atelier, Pose |
| **Artisan Commerçant** | Commande Commerce | Produit Fini | CRM, Devis, Factures, Agenda | Catalogue produits, Commandes, Retrait atelier |
| **Services Techniques** | Intervention | Non Spécifié | CRM, Devis, Factures, Agenda | Rapports terrain, Signatures, Prestations de service |

---

## 34. Product Release Roadmap (Découpage par Version)

### MVP (Sessions 16–18)
- Architecture multi-verticale, registre exhaustif des métiers (Session 16).
- Gestion des Chantiers & Interventions, dispatching, fiches terrain, photos, signatures (Session 17).
- Cycle complet Lead-to-Cash BTP : Devis chiffré $\rightarrow$ Acompte $\rightarrow$ Exécution $\rightarrow$ Facturation $\rightarrow$ Paiement (Session 18).

### V2 (Session 19)
- Gestion des stocks, consommables et matières premières.
- Fournisseurs, bons de commande d'achats et réapprovisionnements.
- Flotte utilitaires et outillage.
- Contrats d'entretien récurrents, SAV et garanties.
- Portail client terrain et suivi des marges en temps réel.

### V3 (Session 20+)
- Situations de travaux avancées et retenues de garantie BTP.
- Gestion complète des marchés publics et DCE pour l'Architecture/MOE.
- Module atelier garage & réparation électronique avancé.
- Optimisation intelligente des tournées et Facturation Électronique obligatoire.

### Version Premium & Entreprise
- Multi-agences et multi-dépôts.
- Moteur d'automatisations personnalisées sans code.
- Assistant IA connecté au Business Graph.
- Connecteurs API experts (comptabilité, négoce matériaux, SIG).

---

## 35. Key Differentiators (Les Différenciateurs Stratégiques)

1. **Workspace Adaptatif par Métier** : Vocabulaire, métriques et interfaces ajustés précisément à la profession de l'artisan sans surcharger l'écran de fonctionnalités inutiles.
2. **Cycle Zéro Ressaisie (Zero Re-Entry)** : Une information saisie lors du premier appel prospect alimente automatiquement le devis, l'intervention, la commande fournisseur, la facture et la garantie.
3. **Expérience Terrain Mobile-First** : Conçu pour être utilisé avec des gants de chantier ou d'une seule main sur smartphone.
4. **Historique Client à 360° Centré sur les Actifs** : Connaissance exacte de l'historique de la chaudière, du véhicule ou du bâtiment.
5. **Rentabilité Analytique Native** : L'artisan sait en direct s'il gagne ou perd de l'argent sur chaque chantier.
6. **Un Seul Graphe d'Entreprise Unifié (Business Graph)** : CRM, exécution terrain, finance et fidélisation interconnectés au sein d'une base de données unique.

---

## 36. The Zero Re-Entry Lifecycle

```
[Demande Prospect / Lead]
          │
          ▼
[Fiche Client + Site d'intervention + Actif rattaché]
          │
          ▼
[Devis chiffré détaillé]
          │ (Signature électronique + Acompte en ligne)
          ▼
[Chantier / Intervention planifié + Affectation technicien]
          │ (Photos avant/après + Temps saisis + Matériaux consommés)
          ▼
[Rapport d'intervention validé par signature client sur mobile]
          │
          ▼
[Facture générée automatiquement déduisant l'acompte]
          │ (Paiement Stripe / Virement / Factur-X)
          ▼
[Enregistrement de la Garantie & Certificats légaux]
          │
          ▼
[Demande d'avis Google automatisée + Relance d'entretien à J+330]
```

---

## 37. Business Graph Architecture (Graphe de Données)

Le modèle relationnel unifié de MonSERVICE relie les entités suivantes :
`Organization` $\rightarrow$ `User` $\rightarrow$ `Client` $\rightarrow$ `Contact` $\rightarrow$ `Site / Address` $\rightarrow$ `Asset` $\rightarrow$ `Opportunity / Deal` $\rightarrow$ `Quote` $\rightarrow$ `Job / Chantier` $\rightarrow$ `Intervention` $\rightarrow$ `TimeEntry` $\rightarrow$ `Supplier` $\rightarrow$ `PurchaseOrder` $\rightarrow$ `Invoice` $\rightarrow$ `Payment` $\rightarrow$ `Document` $\rightarrow$ `Message` $\rightarrow$ `Warranty` $\rightarrow$ `Review`.

---

## 38. Security, Isolation & API Contract

1. **Autorité Serveur Stricte** : `organizationId` et rôles RBAC toujours extraits de la session utilisateur vérifiée, jamais des paramètres d'URL ou du corps de requête.
2. **Cloisonnement RLS PostgreSQL** : Chaque ligne de table appartient à `organization_id` avec politique de sécurité au niveau de la ligne.
3. **Secrets Isolés** : Aucune clé secrète dans le bundle client (`process.env.NEXT_PUBLIC_*` strictement réservé aux URLs publiques).
4. **Intégrations Externes Hermétiques** : Toute API tierce future (Stripe, GPS/Maps, SMS, Facturation Électronique) s'exécutera exclusivement via des handlers serveur avec validation Zod, signatures cryptographiques et idempotence.
