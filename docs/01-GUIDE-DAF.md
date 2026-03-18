# Guide DAF — Direction Administrative et Financiere

## Role

La DAF est l'**administrateur** de l'application. Elle supervise l'ensemble du processus de calcul des primes sans effectuer de saisie operationnelle. Son acces est en **lecture seule** sur les modules des autres services.

---

## Acces

- **Profil de connexion** : DAF
- **Acces** : Tous les modules (lecture seule) + modules DAF (ecriture)

---

## Fonctionnalites

### 1. Gestion des Agents (DAF > Utilisateurs)

C'est le **point de depart** — aucun service ne peut travailler tant que les agents ne sont pas enregistres.

**Ajouter un agent :**
1. Cliquer sur **"Nouvel Agent"**
2. Remplir les champs :
   - **Nom & Prenom** (obligatoire) — Ex : Medza Ondo Scheila
   - **Matricule** (obligatoire, unique) — Ex : 2823
   - **Fonction** (obligatoire) — Ex : Chauffeur PL, Ripeur, Eboueur
   - **Profil systeme** — Determine quel module l'agent peut utiliser :
     - `CHAUFFEUR` ou `EQUIPIER` : agents evalues pour la prime
     - `COLLECTE`, `GEO`, `LOGISTIQUE`, `QHSE` : chefs de service
     - `DAF` : administrateur
   - **Zone / Secteur** — Ex : Libreville Centre, PK8, Owendo
   - **Equipe affectee** — Ex : Equipe BOM-01
   - **Vehicule attribue** — Ex : BOM N°484 (KC-012-AA)
3. Cliquer sur **"Ajouter l'agent"**

**Modifier un agent :** Cliquer sur l'icone crayon dans la ligne de l'agent.

**Retirer un agent :** Cliquer sur l'icone rouge (corbeille).

> **Important** : Les champs Fonction, Zone et Equipe sont en saisie libre. Vous entrez ce que vous voulez.

---

### 2. Parametrage des Regles (DAF > Parametres)

Permet de configurer le moteur de calcul des primes **sans intervention technique**.

**Ponderations des 4 axes (total = 100%) :**
- Tonnage : 50% (par defaut)
- Bouclage : 25%
- Entretien : 15%
- QHSE : 10%

> Le systeme verifie que le total fait bien 100%. Si ce n'est pas le cas, l'enregistrement est bloque.

**Seuils d'eligibilite :**
- Score minimum pour prime : 60% (en dessous, pas de prime)
- Presence minimum : 93% (28 jours sur 30)
- Jours ouvres par mois : 30

**Plafonds de prime :**
- Collecte (Chauffeurs + Ripeurs) : 50 000 XAF
- TRI (Chauffeurs + Ripeurs) : 25 000 XAF

> **Les modifications s'appliquent immediatement** sur le Dashboard, la Recherche Agent et la Consolidation.

---

### 3. Consolidation (DAF > Consolidation)

Lance le croisement des donnees des 4 services pour calculer les primes du mois.

1. Selectionner le **mois de traitement**
2. Cliquer sur **"Lancer le Calcul"**
3. Le systeme affiche le nombre d'agents traites

---

### 4. Validation des Primes (DAF > Validation Primes)

Affiche le tableau recapitulatif de tous les agents avec :
- Scores par axe (Tonnage, Bouclage, Entretien, QHSE)
- Score global
- Montant de la prime
- Statut (Brouillon / Valide)

Cliquer sur **"Valider definitivement ce mois"** pour geler les donnees.

---

### 5. Rapports & Export (DAF > Rapports)

Trois types d'export :
- **Fiches individuelles (PDF)** : rapport complet avec detail par agent
- **Recapitulatif (PDF)** : tableau d'une page pour la Direction et la DRH
- **Fichier Comptabilite (CSV/Excel)** : matricules + montants, importable dans Sage

> Le fichier CSV utilise le separateur `;` et l'encodage UTF-8 avec BOM pour une ouverture correcte dans Excel.

---

### 6. Vue Budgetaire (DAF > Budget)

Tableau de bord financier avec le budget estime des primes du mois.

---

### 7. Consultation des autres services

En tant que DAF, vous avez acces a **tous les modules** en lecture seule :
- **Collecte** : Historique des saisies de tonnage
- **Geolocalisation** : Tableau de bord GEO + Historique GPS
- **Logistique** : Historique entretiens + Suivi equipements
- **QHSE** : Historique checklists et alcootests

Un bandeau bleu **"Mode consultation"** s'affiche pour rappeler que vous etes en lecture seule.

---

## Workflow type

```
1. Ajouter les agents (Utilisateurs)
2. Configurer les parametres si besoin (Parametres)
3. Attendre que les services saisissent leurs donnees
4. Consulter le Dashboard (scores en temps reel)
5. Lancer la Consolidation
6. Valider les primes
7. Exporter les rapports (PDF + CSV)
```
