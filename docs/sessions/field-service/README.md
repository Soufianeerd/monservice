# Field Services & Technical Professions — Multi-Vertical Sessions Roadmap

Ce dossier regroupe les spécifications, blueprints, livrables et revues de conformité pour l'extension multi-verticale **Field Services / BTP / Artisans / Métiers Techniques** de MonSERVICE.

---

## 🗺️ Vue d'ensemble des sessions (16 à 20)

| Session | Titre | Objectif Principal | Statut |
|---|---|---|---|
| **Session 16** | **Multi-Vertical Foundation** | Résolution d'espace de travail dynamique, 9 familles métiers, 36 professions, contraintes DB sectorielles, enregistrement dynamique, navigation sans route fantôme, blueprint complet. | ✅ Réalisée |
| **Session 17** | **Work Orders, Chantiers & Interventions** | Modèle de données universel d'intervention, statuts de chantier, assignation d'équipes, géolocalisation et rapports d'intervention. | ✅ Réalisée |
| **Session 18** | **Estimates, Quotes & Line-Item Breakdown (BTP/Artisans)** | Devis détaillés BTP, métrés, tranches de travaux, acomptes, TVA multi-taux (5.5%, 10%, 20%), conversion devis-facture. | ⏳ Planifiée |
| **Session 19** | **Customer Asset & Equipment Tracking** | Suivi du parc d'équipements/véhicules/ouvrages clients, historique de maintenance préventive/curative, garanties et QR codes d'équipements. | ⏳ Planifiée |
| **Session 20** | **Field Service Portal & Mobile Experience** | Espace client dédié suivi de chantier/intervention, signature électronique sur tablette/smartphone, validation des réceptions de travaux. | ⏳ Planifiée |

---

## 🏛️ Architecture & Blueprints

- [FIELD_SERVICES_OPERATING_SYSTEM_BLUEPRINT.md](../../product/FIELD_SERVICES_OPERATING_SYSTEM_BLUEPRINT.md) : Blueprint d'architecture produit et technique en 38 sections détaillant les 36 packs métiers, les flux de travail, la matrice de capabilités (MVP, V2, V3, Premium), les règles d'autorité Supabase RLS et l'isolation multi-tenant.
- [SESSION_16_FIELD_SERVICE_MULTI_VERTICAL_FOUNDATION.md](./SESSION_16_FIELD_SERVICE_MULTI_VERTICAL_FOUNDATION.md) : Rapport d'implémentation formel et journal d'audit de la Session 16.
- [SESSION_17_WORK_ORDERS_CHANTIERS_INTERVENTIONS.md](./SESSION_17_WORK_ORDERS_CHANTIERS_INTERVENTIONS.md) : Rapport d'implémentation formel et journal d'audit de la Session 17.
