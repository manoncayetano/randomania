# Spécifications techniques — Application de randonnée personnelle

## Contexte du projet

Application web responsive (desktop + mobile), à usage **strictement personnel** (deux utilisateurs : toi et ta fille), non destinée à être publiée ou commercialisée. Pas de gestion de comptes multi-utilisateurs complexe, pas de scalabilité à prévoir, pas de modération.

Objectif : trouver ou générer des parcours de randonnée selon des critères précis, avec une base de données locale qui s'enrichit au fil du temps via scraping et saisie manuelle.

---

## 1. Fonctionnalités

### 1.1 Génération de parcours par critères
Entrées utilisateur :
- Zone géographique (ex : massif des Écrins)
- Niveau (facile / moyen / difficile)
- Distance totale (km)
- Nombre de jours
- Dénivelé positif et/ou négatif (m)
- Durée de marche par jour (min / max en heures)

Sortie : un ou plusieurs parcours construits à partir de données de sentiers réels (OSM), avec calcul d'itinéraire et estimation de temps de marche.

### 1.2 Recherche de randos existantes
Recherche dans la base de données locale (alimentée par scraping incrémental) selon les mêmes critères que la génération, plus :
- Tags (voir 1.4)
- Présence d'avis récents

### 1.3 Fiche de parcours complète
Pour chaque parcours (généré ou trouvé), afficher :
- Carte interactive avec le tracé (Leaflet)
- Distance totale
- Temps de parcours estimé
- Dénivelé positif / négatif
- Photos
- Avis récupérés (avec note, texte, source, date)
- Tags
- Restrictions / réglementation en vigueur (voir 1.5)

### 1.4 Tags
Tags possibles : forêt, cours d'eau, lac, cascade, faune, point de vue, etc. (liste extensible).

Trois sources de tags :
1. **Auto-détection depuis texte scrapé** : recherche de mots-clés dans les descriptions
2. **Auto-détection géographique** : croisement du tracé GPX avec les données OSM (`natural=water`, `waterway=stream`, `natural=wood`...)
3. **Manuel** : ajout par l'utilisateur après avoir fait la randonnée (carnet vécu)

### 1.5 Restrictions et réglementation
Informations sur : bivouac autorisé/interdit, accès massif, arrêtés de fermeture temporaire (chasse, éboulement, incendie), zones réglementées (parcs nationaux, réserves naturelles).

**Règle impérative** : toujours afficher la date de mise à jour de l'info et un avertissement invitant à vérifier sur place / sur le site source avant de partir. Ne jamais présenter une info de restriction comme garantie à 100%.

### 1.6 Base de données persistante alimentée par scraping incrémental
Principe central du projet :
- Le scraping n'est **pas** déclenché à chaque recherche utilisateur
- La recherche interroge **d'abord** la base locale
- Si résultats insuffisants → scraping ciblé sur la zone/les critères manquants, qui vient enrichir la base pour les recherches futures
- Les parcours générés (fonctionnalité 1.1) sont également sauvegardés dans la base avec un flag d'origine

---

## 2. Stack technique

| Composant | Choix | Justification |
|---|---|---|
| Backend | Python + FastAPI | Léger, rapide, bien maîtrisé par Claude Code |
| Base de données | SQLite | Fichier unique, zéro config, suffisant pour usage perso |
| Frontend | React + Tailwind CSS | Bon rendu responsive, écosystème riche |
| Carte interactive | Leaflet.js (via react-leaflet) | Léger, gratuit, fond de carte OSM/IGN |
| Scraping | Python (BeautifulSoup / Playwright selon les sites) | Modules indépendants, exécution manuelle ou périodique |
| Génération de parcours | OSM (Overpass API) + moteur de calcul d'itinéraire (OpenRouteService ou GraphHopper) | Données de sentiers réelles + calcul dénivelé/temps |
| Altimétrie | IGN RGE ALTI ou SRTM | Précision du dénivelé |

---

## 3. Structure du projet

```
rando-app/
├── backend/
│   ├── api/                    # endpoints FastAPI
│   │   ├── search.py            # recherche par critères
│   │   ├── generate.py          # génération de parcours
│   │   ├── parcours.py          # CRUD fiches parcours
│   │   └── tags.py               # gestion des tags
│   ├── db/
│   │   ├── models.py             # modèles SQLAlchemy
│   │   └── schema.sql            # schéma de référence
│   ├── scraping/
│   │   ├── visorando.py
│   │   ├── osm_routes.py
│   │   ├── restrictions_parcs.py
│   │   └── tag_detector.py       # détection auto de tags
│   └── generation/
│       ├── osm_network.py        # récupération réseau de sentiers
│       └── route_builder.py      # construction de parcours selon critères
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── SearchForm.jsx
│   │   │   ├── ParcoursCard.jsx
│   │   │   ├── ParcoursMap.jsx
│   │   │   ├── TagBadge.jsx
│   │   │   └── RestrictionAlert.jsx
│   │   └── pages/
│   │       ├── Home.jsx
│   │       ├── Recherche.jsx
│   │       └── FicheParcours.jsx
└── data/
    └── rando.db                  # base SQLite
```

---

## 4. Schéma de base de données

```sql
CREATE TABLE parcours (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    zone TEXT,
    niveau TEXT CHECK(niveau IN ('facile', 'moyen', 'difficile')),
    distance_km REAL,
    denivele_positif INTEGER,
    denivele_negatif INTEGER,
    duree_jours INTEGER,
    duree_marche_min REAL,
    duree_marche_max REAL,
    origine TEXT CHECK(origine IN ('scraping', 'genere', 'manuel')),
    url_source TEXT,
    date_ajout TEXT DEFAULT CURRENT_TIMESTAMP,
    date_maj TEXT,
    gpx_path TEXT
);

CREATE TABLE photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parcours_id INTEGER REFERENCES parcours(id),
    url_ou_chemin TEXT NOT NULL
);

CREATE TABLE avis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parcours_id INTEGER REFERENCES parcours(id),
    texte TEXT,
    note REAL,
    source TEXT,
    date_avis TEXT
);

CREATE TABLE tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT UNIQUE NOT NULL
);

CREATE TABLE parcours_tags (
    parcours_id INTEGER REFERENCES parcours(id),
    tag_id INTEGER REFERENCES tags(id),
    source TEXT CHECK(source IN ('auto_texte', 'auto_geo', 'manuel')),
    PRIMARY KEY (parcours_id, tag_id)
);

CREATE TABLE restrictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parcours_id INTEGER REFERENCES parcours(id),
    zone TEXT,
    type TEXT CHECK(type IN ('bivouac', 'camping', 'acces_massif', 'chasse', 'arrete_municipal', 'reserve_naturelle')),
    description TEXT,
    source TEXT,
    date_maj TEXT DEFAULT CURRENT_TIMESTAMP
);
```

---

## 5. Endpoints API (FastAPI)

| Méthode | Route | Description |
|---|---|---|
| GET | `/parcours` | Liste / recherche avec filtres (zone, niveau, distance, dénivelé, jours, tags) |
| GET | `/parcours/{id}` | Fiche complète d'un parcours |
| POST | `/parcours` | Ajout manuel d'un parcours |
| POST | `/parcours/{id}/tags` | Ajout d'un tag manuel |
| POST | `/parcours/{id}/avis` | Ajout d'un avis manuel |
| POST | `/generate` | Génération d'un parcours selon critères (zone, niveau, distance, dénivelé, jours, durée min/max) |
| POST | `/scraping/run` | Déclenche un scraping ciblé (zone, source) pour enrichir la base |
| GET | `/restrictions` | Restrictions actives pour une zone donnée |

---

## 6. Direction visuelle — "Outdoor moderne"

- **Palette** : fond clair (blanc / gris très clair), accent principal vert teal (`#1D9E75` / `#0F6E56` pour le texte sur fond clair)
- **Cartes** : fond blanc, bordures fines (0.5px, gris clair), coins arrondis (12px)
- **Tracé GPX sur carte** : ligne verte vive sur fond de carte clair (OSM/IGN)
- **Badges de tags** : fond vert très clair (`#E1F5EE`), texte vert foncé (`#085041`), forme pilule
- **Typographie** : sans-serif, nette, deux graisses seulement (normal / medium), pas de fioritures
- **Icônes** : style outline simple (type Tabler icons) — montagne, goutte d'eau, horloge, route
- **Infos clés** (distance, dénivelé, durée) : mises en avant en vert sur la fiche parcours, alignées horizontalement
- **Responsive** : cartes empilées verticalement sur mobile, grille sur desktop

---

## 7. Roadmap de développement suggérée

1. **Étape 1** — Base SQLite + jeu de données minimal (parcours saisis à la main) + endpoint de recherche simple
2. **Étape 2** — Frontend : formulaire de critères + affichage carte/fiche parcours
3. **Étape 3** — Scraping automatisé (Visorando, OSM) pour enrichir la base
4. **Étape 4** — Génération de parcours à partir d'OSM + calcul d'itinéraire
5. **Étape 5** — Tags (auto + manuel), avis, restrictions

---

## 8. Points d'attention

- **Restrictions/réglementation** : données volatiles, toujours afficher la date de mise à jour et un avertissement de vérification sur place
- **Avis** : scraping fragile (structure HTML changeante, contenu parfois en JS dynamique) — traiter en priorité 2 après les données structurées (distance, dénivelé, tracé)
- **Usage strictement personnel** : pas de scraping à grande échelle, pas de distribution de l'outil, pas de système de comptes complexe
