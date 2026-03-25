# Guide Dashboard & Recherche Agent

## Modules communs a tous les services

Le **Dashboard** et la **Recherche Agent** sont accessibles a tous les profils (Collecte, GEO, Logistique, QHSE, DAF).

---

## 1. Tableau de Bord (Dashboard)

### Vue d'ensemble

Le Dashboard affiche en temps reel les performances du mois en cours, calculees a partir des saisies de tous les services.

### KPIs

| Indicateur | Description |
|-----------|------------|
| **Score moyen global** | Moyenne des scores de tous les agents evalues |
| **Saisies Collecte** | Nombre de tonnages enregistres ce mois |
| **Bouclages declares** | Nombre de circuits declares par le service Collecte |
| **Budget primes (est.)** | Estimation du budget total des primes en XAF |

### Top Agents

Classement des 5 meilleurs agents par score global, avec :
- Barre de progression coloree
- Vehicule et zone
- Tendance (hausse/baisse)

### Taux de completion par service

Barres de progression montrant le pourcentage de saisies effectuees par chaque service :
- **Collecte** : tonnages saisis / nombre d'agents
- **Geolocalisation** : bouclages valides
- **Logistique** : fiches entretien saisies
- **QHSE** : checklists remplies

### Graphiques

- **Performance par axe** : barres horizontales (Tonnage, Bouclage, Entretien, QHSE)
- **Distribution des primes** : camembert (0 XAF / 1-25K / 25K-50K)

### Etats vides

- **Pas d'agents** : le Dashboard invite a aller dans DAF > Utilisateurs
- **Pas de saisies** : un bandeau orange indique que les agents sont enregistres mais aucune donnee n'a ete saisie

---

## 2. Recherche Agent

### Objectif

Consulter la fiche de performance complete d'un agent pour un mois donne.

### Utilisation

1. **Rechercher** par matricule (ex: 2823) ou par nom (ex: "Medza")
2. **Selectionner la date** — le systeme utilise le mois de cette date

### Informations affichees

**Profil agent :**
- Nom, matricule, role, zone
- Statut de presence (present/absent pour la date selectionnee)
- Nombre de jours presents dans le mois

**Les 4 axes de performance :**

| Axe | Poids | Ce qui est affiche |
|-----|-------|-------------------|
| **Tonnage** | 50% | Score %, tonnage moyen, rotations, type vehicule |
| **Bouclage** | 25% | Score %, nombre de circuits evalues |
| **Entretien** | 15% | Score %, note /10 (ou N/A pour les ripeurs) |
| **QHSE** | 10% | Score %, alcootest, checklist /5, EPI |

Chaque axe affiche :
- Le score brut (%)
- Une barre de progression coloree
- Le score pondere (contribution en points)

**Decomposition du score global :**
- 4 barres empilees montrant la contribution de chaque axe
- Score global final (%)

**Prime de performance :**
- Montant en XAF
- Plafond applicable
- Si non eligible : raison affichee (score < 60% ou presence insuffisante)

**Export PDF** : bouton pour telecharger la fiche individuelle de l'agent.

### Si aucune donnee

Si l'agent existe mais qu'aucune saisie n'a ete faite pour le mois selectionne, un message indique :
> "Aucune donnee de performance n'a ete saisie pour cet agent sur le mois selectionne."

---

## Format des dates

Toutes les dates sont affichees au format **dd/mm/yyyy** (ex: 18/03/2026).

Les champs de saisie de date utilisent le format natif du navigateur.

---

## Persistance des donnees

Les donnees saisies sont **sauvegardees dans le navigateur** (localStorage). Elles survivent au refresh de la page et a la fermeture du navigateur.

> **Attention** : Si vous videz le cache/stockage du navigateur, les donnees seront perdues. Pour un usage en production, une base de donnees serveur sera necessaire.
