# Demarrage Rapide — Clean Africa Primes de Performance

## Prerequis

- **Node.js** v18+ installe (`node -v` pour verifier)
- **npm** v9+ (`npm -v`)
- **Git** pour cloner le projet

---

## Installation

```bash
# 1. Cloner le projet
git clone https://github.com/Phontonic01/payement-primes-performance.git

# 2. Entrer dans le dossier
cd payement-primes-performance

# 3. Installer les dependances
npm install
```

---

## Lancer en mode developpement

```bash
npm run dev
```

L'application demarre sur **http://localhost:3000**

---

## Construire pour la production

```bash
# Build
npm run build

# Previsualiser le build
npm run preview
```

Les fichiers de production sont generes dans le dossier `dist/`.

---

## Se connecter

A l'ouverture, la **page d'accueil** s'affiche. Cliquer sur **"Commencer"** ou **"Se connecter"**.

Sur la page de connexion :

1. **Nom d'utilisateur** : entrer n'importe quel nom (ex: "Admin DAF")
2. **Selectionner le profil** dans le menu deroulant :

| Profil | Ce que vous pouvez faire |
|--------|------------------------|
| **DAF** | Tout voir + gestion agents, parametres, validation, rapports |
| **COLLECTE** | Saisie tonnage + bouclage circuit |
| **GEO** | Validation GPS des bouclages |
| **LOGISTIQUE** | Saisie entretien vehicule |
| **QHSE** | Checklist terrain + alcootest |

3. Cliquer sur **"Se connecter"**

> Le mot de passe n'est pas verifie en phase test. N'importe quelle combinaison fonctionne.

---

## Ordre de test recommande

### Etape 1 — DAF : Ajouter les agents

1. Se connecter en **DAF**
2. Aller dans **DAF > Utilisateurs**
3. Cliquer **"Nouvel Agent"** et ajouter quelques agents :

| Nom | Matricule | Fonction | Profil | Zone |
|-----|-----------|----------|--------|------|
| Medza Ondo Scheila | 2823 | Chauffeur PL | CHAUFFEUR | PK8 |
| Mamfoumbi Muriella | 2948 | Chauffeur PL | CHAUFFEUR | Libreville |
| Mbatsi Davy | 0946 | Ripeur | EQUIPIER | Owendo |

4. Se deconnecter (bouton rouge en bas de la sidebar)

### Etape 2 — COLLECTE : Saisir le tonnage

1. Se connecter en **COLLECTE**
2. Aller dans **Collecte > Saisie Tonnage**
3. Selectionner un agent, un vehicule du parc (ex: BOM N°484), entrer tonnage et rotations
4. Verifier le score estime en bas du formulaire
5. Enregistrer
6. Aller dans **Collecte > Bouclage Circuit** et declarer OUI/NON pour les agents

### Etape 3 — GEO : Valider les bouclages

1. Se connecter en **GEO**
2. Aller dans **GEO > File de Validation**
3. Les bouclages declares par Collecte apparaissent ici
4. Cliquer **"Analyser"** sur un bouclage
5. Choisir : Confirmer (100%) / Partiel (50%) / Refuser (0%)
6. Verifier l'impact sur le Dashboard

### Etape 4 — LOGISTIQUE : Saisir l'entretien

1. Se connecter en **LOGISTIQUE**
2. Aller dans **Logistique > Entretien Vehicule**
3. Selectionner un agent et un vehicule du parc
4. Evaluer les 4 criteres (curseurs 0-10)
5. Enregistrer

### Etape 5 — QHSE : Checklist + Alcootest

1. Se connecter en **QHSE**
2. Aller dans **QHSE > Check-list Terrain**
3. Cocher les EPI et la conformite vehicule
4. Enregistrer
5. Aller dans **QHSE > Test Alcoolemie**
6. Tester un resultat negatif ET un positif (pour voir l'impact)

### Etape 6 — Verifier la propagation

1. Se connecter en **DAF** (ou n'importe quel profil)
2. Aller sur le **Dashboard** : les KPIs, graphiques et classement se mettent a jour
3. Aller dans **Recherche Agent** : taper un matricule pour voir la fiche complete avec les 4 axes et la prime calculee

---

## Donnees et persistance

- Les donnees sont **sauvegardees dans le navigateur** (localStorage)
- Elles survivent au refresh et a la fermeture du navigateur
- Pour **tout remettre a zero** : ouvrir la console du navigateur (F12) et taper :
  ```js
  localStorage.clear()
  location.reload()
  ```

---

## Structure des fichiers cles

```
src/
├── stores/
│   ├── agents.js       ← Liste des agents (DAF > Utilisateurs)
│   ├── saisies.js      ← Toutes les saisies (tonnage, bouclage, entretien, QHSE)
│   ├── primes.js       ← Moteur de calcul des primes
│   ├── vehicules.js    ← 99 vehicules PL du parc
│   ├── geo.js          ← Decisions GEO (autorite terrain)
│   └── auth.js         ← Connexion par profil
├── views/
│   ├── collecte/       ← Tonnage, Bouclage, Historique
│   ├── geo/            ← Tableau de Bord, Validation, Historique GPS
│   ├── logistique/     ← Entretien, Equipements, Historique
│   ├── qhse/           ← Checklist, Alcootest, Collecte Selective
│   ├── daf/            ← Budget, Users, Params, Consolidation, Validation, Rapports
│   ├── DashboardView   ← KPIs et graphiques
│   └── RechercheAgent  ← Fiche individuelle
├── plugins/
│   └── piniaPersist.js ← Sauvegarde localStorage automatique
└── docs/               ← Guides par service (vous etes ici)
```

---

## Techno

- **Vue 3** + Composition API (`<script setup>`)
- **Vite 8** (bundler)
- **Tailwind CSS 4** (styles)
- **Pinia** (state management)
- **Chart.js** (graphiques)
- **jsPDF** (export PDF)
- **Lucide** (icones)
