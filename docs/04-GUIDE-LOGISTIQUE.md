# Guide Service Logistique

## Role

Le service Logistique evalue l'**etat d'entretien des vehicules** et le **respect du materiel** par les chauffeurs. La note d'entretien alimente l'axe Entretien de la prime (15%).

---

## Acces

- **Profil de connexion** : LOGISTIQUE
- **Modules accessibles** : Saisie Entretien, Suivi Equipements, Historique Entretiens, Dashboard, Recherche Agent

---

## Fonctionnalites

### 1. Saisie Fiche Entretien (Logistique > Entretien Vehicule)

**Objectif** : Evaluer l'etat du vehicule attribue a un chauffeur apres sa tournee.

**Etapes :**
1. **Selectionner la date** d'evaluation
2. **Selectionner l'agent** (chauffeur evalue)
3. **Selectionner le vehicule du parc** — Dropdown avec les 99 vehicules PL, groupes par type (BOM, Plateaux, Movi, Bennes). Seuls les vehicules operationnels sont affiches.

4. **Evaluer 4 criteres** (curseur de 0 a 10 pour chaque) :
   - **Etat des pneus** — Usure, pression, gonflage
   - **Niveaux (Huile, Eau)** — Verifications moteur
   - **Proprete du vehicule** — Cabine, benne, outillage
   - **Etat mecanique general** — Freins, eclairage, direction

5. Le **score moyen /10** est calcule automatiquement en temps reel

6. Ajouter des **observations** si necessaire (pannes, signalements)

7. Cliquer sur **"Enregistrer la fiche"**

**Bareme de notation :**
| Note /10 | Appreciation | Couleur |
|---------|-------------|---------|
| 7 a 10 | Bon etat | Vert |
| 5 a 6.9 | Acceptable | Orange |
| 0 a 4.9 | Insuffisant | Rouge |

---

### 2. Suivi Equipements (Logistique > Suivi Materiel)

**Vue d'ensemble du parc automobile :**

Le tableau affiche les 99 vehicules PL avec :
- N° Parc
- Type (BOM, Plateaux, Movi, Bennes)
- Marque
- Immatriculation
- Etat (Operationnel / Panne / Standby / HS / Accidente)

**KPIs dynamiques :**
- Nombre de vehicules operationnels sur le total
- Nombre en panne / standby
- Nombre HS / accidentes

**Restitution des petits equipements :**
- Formulaire pour enregistrer la restitution du materiel (pelles, fourches, rateaux, balais, brouettes, seaux)
- Chaque equipement : sorti / restitue / etat (Bon / Use / Casse)
- Score de restitution calcule automatiquement

---

### 3. Historique Entretiens (Logistique > Historique)

Tableau de toutes les fiches d'entretien saisies :
- Date (dd/mm/yyyy), chauffeur, vehicule, score moyen, observations
- **Filtre par chauffeur**
- **Score moyen global** affiche en bas du tableau
- **Correction** possible avec motif obligatoire

---

## Impact sur la prime

| Ce que vous saisissez | Conversion | Poids |
|----------------------|-----------|-------|
| Note d'entretien /10 | Note /10 x 10 = % | **15%** |

**Exemple concret :**
- Note entretien = 8/10 → Score Entretien = 80%
- Contribution a la prime : 80% x 15% = **12 points sur 100**
- Note entretien = 4/10 → Score Entretien = 40%
- Contribution : 40% x 15% = **6 points sur 100** (perte de 6 points)

> **Pour les Ripeurs/Equipiers** : La note d'entretien n'est pas applicable (ils ne sont pas responsables du vehicule). Le score est automatiquement mis a 100% pour eux.

---

## Vehicules du parc

Le service dispose de **99 vehicules PL** :
- **50 BOM** : principalement HONGYAN IVECO KING KAN 340 + 4 MAN TGS + 1 MERCEDES
- **27 Plateaux** : ISUZU NPR 71H + SML SAMRAT TIPPER + DAIHATSU DELTA
- **13 Movi** : IVECO TRAKKER 380 + DONG FENG KIN LAND 260
- **8 Bennes** : IVECO + DONG FENG bennes bascule
- **1 Balayeuse** : HOWO ROAD SWEEPER
