# Guide Service Geolocalisation (GEO)

## Role

Le service Geolocalisation est l'**autorite terrain**. Il valide ou invalide les bouclages de circuits en se basant sur les donnees GPS. **Sa decision prevaut** sur les declarations du service Collecte et impacte directement le score de prime des agents.

---

## Acces

- **Profil de connexion** : GEO
- **Modules accessibles** : Tableau de Bord GEO, File de Validation, Historique GPS, Dashboard, Recherche Agent

---

## Fonctionnalites

### 1. Tableau de Bord GEO (GEO > Tableau de Bord)

Vue croisee multi-services qui montre pour chaque bouclage declare :
- **Collecte** : bouclage declare (OUI/NON), tonnage, rotations
- **Donnees GPS** : couverture %, distance, duree, arrets
- **Logistique** : note d'entretien du vehicule
- **QHSE** : checklist, alcootest, EPI

**KPIs affiches :**
- Nombre de bouclages en attente
- Nombre de divergences detectees (incoherences entre services)
- Nombre de bouclages valides
- Couverture GPS moyenne

**Divergences** : Le systeme detecte automatiquement les incoherences. Ex :
- Collecte declare "OUI" mais GPS montre 45% de couverture → divergence
- Alcootest positif + arrets inhabituels → divergence

> Les divergences apparaissent en rouge avec le detail du probleme.

---

### 2. File de Validation (GEO > File de Validation)

Liste de tous les **bouclages en attente** de decision GEO.

Pour chaque bouclage, cliquer sur **"Analyser"** pour ouvrir la page de detail.

---

### 3. Detail et Decision (page Analyser)

Page d'analyse complete qui affiche :

**Colonne gauche :**
- Identite de l'agent (nom, matricule, date, circuit, zone)
- Declarations des autres services (Collecte, Logistique, QHSE)
- **Zone de decision GEO** avec 3 boutons

**Colonne droite :**
- Metriques GPS : couverture %, km parcourus, duree, vitesse, arrets
- Barre de couverture visuelle
- Carte GPS simulee

**Les 3 decisions possibles :**

| Decision | Score Bouclage | Quand l'utiliser |
|----------|---------------|-----------------|
| **Confirmer — Complet (100%)** | 100% | Le GPS confirme que le circuit est integralement couvert |
| **Infirmer — Partiel (50%)** | 50% | Le GPS montre une couverture partielle (zones manquantes) |
| **Infirmer — Refuser (0%)** | 0% | Le circuit n'a pas ete boucle selon le GPS |

**Justification obligatoire** pour les decisions Partiel et Refuse.

> **Impact immediat** : Des que vous validez, le score de l'agent est mis a jour en temps reel sur le Dashboard et la page Recherche Agent.

---

### 4. Historique GPS (GEO > Historique)

Tableau de toutes les decisions GEO rendues avec :
- Date (dd/mm/yyyy), agent, circuit
- Statut (Valide / Partiel / Refuse)
- Justification

---

## Impact sur la prime

| Votre decision | Score Bouclage | Impact sur la prime (axe 25%) |
|---------------|---------------|------------------------------|
| **VALIDE** | 100% | +25 points |
| **PARTIEL** | 50% | +12.5 points |
| **REFUSE** | 0% | 0 point |

**Exemple concret :**
- Un agent a un score Tonnage de 100%, Entretien 100%, QHSE 100%
- Si GEO valide → score global = 100% → prime maximale (50 000 XAF)
- Si GEO refuse → score global = 75% → prime reduite a 37 500 XAF
- Si le score global tombe sous 60% → **pas de prime du tout**

---

## Principe d'autorite

```
Service Collecte declare : "Bouclage OUI"
                    ↓
Service GEO analyse le GPS
                    ↓
   Si GPS confirme → VALIDE (100%)
   Si GPS partiel  → PARTIEL (50%) — le score de prime diminue
   Si GPS contredit → REFUSE (0%) — le score de prime chute
                    ↓
La decision GEO PREVAUT sur la declaration Collecte
Le Dashboard et la Recherche Agent sont mis a jour instantanement
```
