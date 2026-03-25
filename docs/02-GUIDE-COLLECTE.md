# Guide Service Collecte

## Role

Le service Collecte saisit les donnees de **tonnage journalier** et declare le **bouclage des circuits** pour chaque chauffeur et ripeur. Ces donnees alimentent directement le calcul de la prime (axe Tonnage = 50% et axe Bouclage = 25%).

---

## Acces

- **Profil de connexion** : COLLECTE
- **Modules accessibles** : Saisie Tonnage, Bouclage Circuit, Historique, Dashboard, Recherche Agent

---

## Fonctionnalites

### 1. Saisie Tonnage (Collecte > Saisie Tonnage)

**Objectif** : Enregistrer le tonnage collecte et le nombre de rotations pour chaque agent, chaque jour.

**Etapes :**
1. **Selectionner l'agent** — Taper le matricule (ex: 2823) ou le nom dans le champ de recherche
2. **Selectionner la date** du releve
3. **Selectionner le vehicule du parc** — Le dropdown affiche tous les vehicules operationnels, groupes par type :
   - **BOM** (50 vehicules) — Benne a Ordures Menageres
   - **Plateaux** (27 vehicules) — ISUZU NPR, SML SAMRAT
   - **Movi** (13 vehicules) — IVECO, DONG FENG
   - **Bennes** (8 vehicules) — Benne bascule

   > **Le type de vehicule est determine automatiquement** par le N° de parc selectionne. Pas besoin de le choisir manuellement.

4. **Saisir le tonnage total** (en tonnes) — Ex : 8.5
5. **Saisir le nombre de rotations** — Ex : 2

**Estimation du score :**

Un panneau colore s'affiche en temps reel avec le score estime selon le bareme :

| Type | Passable (50%) | Bien (75%) | Excellent (100%) |
|------|---------------|-----------|-----------------|
| **BOM** | 7t / rotation | 8-10t / rotation | >=11t / rotation |
| **Plateaux** | 2 rotations (2.5t) | 3 rotations | >=4 rot. ou cumul >7.5t |
| **Bennes** | 7t x 2 rotations | — | 7t x >2 rotations |
| **Movi** | 4 rotations | — | >4 rotations |

6. Cliquer sur **"Enregistrer le tonnage"**

> **Les donnees sont persistees** — elles ne sont pas perdues au refresh de la page.

---

### 2. Declaration Bouclage (Collecte > Bouclage Circuit)

**Objectif** : Declarer si chaque agent a boucle (termine) son circuit de collecte ou non.

**Fonctionnement :**
- La page affiche tous les agents de type CHAUFFEUR/EQUIPIER
- Pour chaque agent, deux boutons : **OUI** (circuit boucle) ou **NON** (circuit non boucle)
- Apres declaration, le statut passe a **"En attente GEO"**
- Le bouton **"Corriger"** permet d'annuler et re-declarer tant que la GEO n'a pas valide

> **Important** : La declaration du service Collecte n'est pas definitive. C'est le **service Geolocalisation** qui fait autorite. Si la GEO refuse un bouclage declare OUI, le score tombe a 0% sur l'axe Bouclage.

---

### 3. Historique des Saisies (Collecte > Historique)

**Objectif** : Consulter et corriger les saisies de tonnage.

**Fonctionnalites :**
- Tableau de toutes les saisies avec : date (dd/mm/yyyy), agent, vehicule, tonnage, score, statut bouclage
- **Filtre par agent** (matricule ou nom)
- **Correction** : bouton "Corriger" sur chaque ligne — necessite un motif obligatoire
- Le score est recalcule automatiquement apres correction

> Les alertes GEO s'affichent en haut de la page si le service Geolocalisation a invalide un bouclage.

---

## Impact sur la prime

| Ce que vous saisissez | Axe impacte | Poids |
|----------------------|------------|-------|
| Tonnage + Rotations | **Tonnage** | 50% |
| Declaration bouclage | **Bouclage** | 25% |

**Exemple concret :**
- Agent sur BOM, 22 tonnes, 2 rotations → moyenne 11t/rot → Score Tonnage = **100%**
- Bouclage declare OUI, valide par GEO → Score Bouclage = **100%**
- Contribution a la prime : (100% x 50%) + (100% x 25%) = **75 points sur 100**
