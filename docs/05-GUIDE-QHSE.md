# Guide Service QHSE (Qualite, Hygiene, Securite, Environnement)

## Role

Le service QHSE evalue le **respect des consignes de securite** sur le terrain : port des EPI, conformite vehicule, alcootests et respect des procedures. Ces donnees alimentent l'axe Securite de la prime (10%).

---

## Acces

- **Profil de connexion** : QHSE
- **Modules accessibles** : Checklist Terrain, Test Alcoolemie, Collecte Selective, Historique QHSE, Dashboard, Recherche Agent

---

## Fonctionnalites

### 1. Checklist Terrain (QHSE > Check-list Terrain)

**Objectif** : Evaluer le respect des consignes de securite par les agents sur le terrain.

**Etapes :**
1. **Selectionner la date** de controle
2. **Selectionner l'agent** controle

3. **Cocher les Equipements de Protection Individuelle (EPI) :**
   - Port des bottes de securite
   - Port des gilets reflechissants
   - Port des gants

4. **Cocher la conformite vehicule / documents :**
   - Extincteur valide
   - Girophare fonctionnel
   - Assurance a jour
   - Visite technique a jour
   - Permis de conduire valide
   - Carte grise presente

5. Le **score /5** est calcule automatiquement :
   - EPI (3 items) = max 2 points
   - Vehicule/Documents (6 items) = max 3 points
   - Total = sur 5 points

6. Ajouter des **observations** si necessaire

7. Cliquer sur **"Enregistrer la checklist"**

**Bareme :**
| Score /5 | Appreciation | Couleur |
|---------|-------------|---------|
| 4 a 5 | Conforme | Vert |
| 2.5 a 3.9 | A ameliorer | Orange |
| 0 a 2.4 | Non conforme | Rouge |

> **La checklist est sauvegardee dans le store QHSE** et se retrouve dans la Recherche Agent, le Dashboard et la vue GEO.

---

### 2. Test Alcoolemie (QHSE > Test Alcoolemie)

**Objectif** : Enregistrer les resultats des controles d'alcoolemie inopines.

**Etapes :**
1. Selectionner la **date et l'heure** du controle
2. Selectionner l'**agent controle**
3. Choisir le **resultat** :
   - **Negatif (0 g/l)** — Conforme, aucune penalite
   - **Positif (> 0 g/l)** — **PENALITE TOTALE** : score QHSE = 0%
4. Si positif, saisir le **taux releve** (en g/l)
5. Cliquer sur **"Enregistrer Alcootest"**

> **ATTENTION** : Un alcootest positif met le score QHSE a **0%** pour tout le mois. C'est la penalite la plus severe du systeme.

**Impact :**
- Alcootest negatif → score QHSE depend uniquement de la checklist
- Alcootest positif → score QHSE = **0%** (quel que soit le score checklist)

---

### 3. Collecte Selective (QHSE > Tonnage TRI)

**Objectif** : Peser les dechets tries (plastiques, cartons, autres recyclables).

**Etapes :**
1. Selectionner date et agent
2. Selectionner la zone / circuit
3. Saisir les pesees en kg :
   - Plastiques (PET/HDPE)
   - Cartons / Papiers
   - Autres recyclables
4. Le **total** est calcule automatiquement
5. Cliquer sur **"Enregistrer la pesee"**

> La collecte selective debloque un **bonus** hors bareme standard.

---

### 4. Historique QHSE (QHSE > Historique)

Tableau de toutes les evaluations QHSE :
- Date (dd/mm/yyyy), agent, type (Checklist / Alcootest)
- Resultat / Score
- Impact / Penalite
- Etat (Modifiable / Cloture)

Les donnees sont lues depuis le store saisies en temps reel.

---

## Impact sur la prime

### Score QHSE composite

Le score QHSE est calcule a partir de plusieurs criteres :

| Critere | Impact |
|---------|--------|
| **Checklist /5** | Convertie en % (ex: 4/5 = 80%) |
| **Alcootest positif** | Score QHSE = **0%** (penalite totale) |
| **EPI non conforme** | -20% sur le score QHSE |
| **Quart d'heure securite manque** | -10% sur le score QHSE |

### Poids dans la prime

| Score QHSE | Contribution (axe 10%) |
|-----------|----------------------|
| 100% | +10 points |
| 80% | +8 points |
| 0% (alcootest positif) | **0 point** |

**Exemple concret :**
- Checklist 5/5, alcootest negatif, EPI conforme → QHSE = 100% → **+10 pts**
- Checklist 4/5, alcootest negatif, EPI non conforme → QHSE = (80% - 20%) = 60% → **+6 pts**
- Checklist 5/5 MAIS alcootest positif → QHSE = **0%** → **0 pt** (le 5/5 est annule)

---

## Correspondance avec la checklist papier (PDBLC.QHSE.03)

L'application numerise la checklist papier du terrain :

| Checklist papier | Equivalent dans l'application |
|-----------------|-------------------------------|
| Port EPI (Chauffeur, Ripeur 1, Ripeur 2) | Cases a cocher EPI (bottes, gilets, gants) |
| Identification (quart d'heure, positionnement, balisage...) | Score checklist /5 |
| Test Alcoolemie Inopine | Module Alcootest (Positif/Negatif) |
| Observations | Champ observations libre |
