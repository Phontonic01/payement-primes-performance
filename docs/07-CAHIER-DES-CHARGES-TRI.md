# Cahier des Charges — Service TRI & Valorisation de Déchets

## Référence
- **Source** : Mail de spécification des critères d'attribution de la prime de rendement
- **Service** : TRI et valorisation de déchets
- **Date d'intégration** : 25 mars 2026
- **Statut** : Validé — intégré dans le moteur de calcul

---

## 1. Principe général

La prime de rendement du service TRI est octroyée **par équipe d'arrondissement**.

**Stratégie retenue** : affecter **1 Canter + 1 BOM par zone**. Les Canters chargent les BOM de leur zone afin de :
- Maximiser le temps de collecte
- Éviter les passages multiples au pont bascule et à la base
- Maximiser le temps de travail effectif

---

## 2. Barème BOM + CANTER (par tonnage collecté)

Le tonnage est mesuré pour l'**ensemble de l'équipe** (Canter + BOM combinés) sur la zone.

| Tonnage collecté | % de la prime |
|------------------|---------------|
| ≥ 1,2 tonne      | **100%**      |
| ≥ 1,0 tonne      | **75%**       |
| ≥ 800 kg (0,8t)  | **50%**       |
| < 800 kg          | **0%**        |

---

## 3. Barème MOVI (par nombre de bennes levées)

Les Movis ont un barème différent basé sur le nombre de bennes levées par jour.

| Bennes levées | % de la prime |
|---------------|---------------|
| ≥ 5 bennes    | **100%**      |
| ≥ 4 bennes    | **75%**       |
| ≥ 3 bennes    | **50%**       |
| < 3 bennes    | **0%**        |

---

## 4. Calcul du montant

```
Montant prime = pourcentage_bareme × plafond_TRI
```

- **Plafond TRI** : 25 000 XAF (modifiable uniquement par note de service officielle)
- La prime est attribuée à **chaque membre de l'équipe** (chauffeur Canter, chauffeur BOM, ripeurs)

---

## 5. Différences avec le service Collecte

| Critère | Collecte | TRI |
|---------|----------|-----|
| **Mode de calcul** | Score pondéré 4 axes (T+B+E+Q) | Barème direct à paliers |
| **Unité de saisie** | Par agent / par jour | Par équipe / par zone / par jour |
| **Axes évalués** | Tonnage, Bouclage, Entretien, QHSE | Tonnage uniquement (ou bennes levées) |
| **Seuil minimum** | 60% de score global | 800 kg ou 3 bennes |
| **Plafond** | 50 000 XAF | 25 000 XAF |

---

## 6. Implémentation technique

### Store `primes.js`
- `configTri` : configuration des seuils et plafond TRI
- `calculerPrimeTri(typeEquipement, valeur)` : retourne `{ pourcentage, montant, eligible, palier }`

### Vue `tri/CollecteSelectiveView.vue`
- Sélection de la zone/arrondissement
- Choix du type d'équipement (BOM+Canter ou Movi)
- Saisie du tonnage ou du nombre de bennes
- Simulation en temps réel du montant de la prime

### Points d'attention
- La saisie est **par équipe de zone**, pas par agent individuel
- Le plafond TRI est distinct du plafond Collecte
- Les paramètres TRI sont modifiables uniquement via note de service officielle (même mécanisme que les paramètres Collecte dans DafParamsView)
