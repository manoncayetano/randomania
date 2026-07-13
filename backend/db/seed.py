from db.database import SessionLocal
from db.init_db import init_db
from db.models import Parcours, ParcoursTag, Tag

TAGS = ["forêt", "cours d'eau", "lac", "cascade", "faune", "point de vue"]

PARCOURS = [
    {
        "nom": "Tour du Lac de l'Eychauda",
        "zone": "Massif des Écrins",
        "niveau": "moyen",
        "distance_km": 12.5,
        "denivele_positif": 850,
        "denivele_negatif": 850,
        "duree_jours": 1,
        "duree_marche_min": 4.5,
        "duree_marche_max": 6.0,
        "origine": "manuel",
        "tags": ["lac", "point de vue", "faune"],
    },
    {
        "nom": "Refuge du Pré de la Chaumette",
        "zone": "Massif des Écrins",
        "niveau": "moyen",
        "distance_km": 14.0,
        "denivele_positif": 700,
        "denivele_negatif": 200,
        "duree_jours": 1,
        "duree_marche_min": 5.0,
        "duree_marche_max": 6.5,
        "origine": "manuel",
        "tags": ["cours d'eau", "forêt", "point de vue"],
    },
    {
        "nom": "GR54 - Étape La Bérarde / Refuge du Carrelet",
        "zone": "Massif des Écrins",
        "niveau": "difficile",
        "distance_km": 8.0,
        "denivele_positif": 550,
        "denivele_negatif": 100,
        "duree_jours": 1,
        "duree_marche_min": 3.0,
        "duree_marche_max": 4.0,
        "origine": "manuel",
        "tags": ["cours d'eau", "point de vue"],
    },
    {
        "nom": "Cascade de la Pissoire",
        "zone": "Vercors",
        "niveau": "facile",
        "distance_km": 6.0,
        "denivele_positif": 300,
        "denivele_negatif": 300,
        "duree_jours": 1,
        "duree_marche_min": 2.0,
        "duree_marche_max": 3.0,
        "origine": "manuel",
        "tags": ["cascade", "forêt", "cours d'eau"],
    },
    {
        "nom": "Traversée du Vercors - Grands Goulets",
        "zone": "Vercors",
        "niveau": "difficile",
        "distance_km": 18.0,
        "denivele_positif": 1200,
        "denivele_negatif": 1400,
        "duree_jours": 2,
        "duree_marche_min": 6.0,
        "duree_marche_max": 8.0,
        "origine": "manuel",
        "tags": ["forêt", "point de vue", "cours d'eau"],
    },
    {
        "nom": "Balade des Hauts Plateaux du Vercors",
        "zone": "Vercors",
        "niveau": "facile",
        "distance_km": 9.5,
        "denivele_positif": 400,
        "denivele_negatif": 400,
        "duree_jours": 1,
        "duree_marche_min": 3.0,
        "duree_marche_max": 4.0,
        "origine": "manuel",
        "tags": ["faune", "point de vue", "forêt"],
    },
    {
        "nom": "Tour de la Vanoise - Étape Pralognan / Refuge de Péclet-Polset",
        "zone": "Vanoise",
        "niveau": "moyen",
        "distance_km": 11.0,
        "denivele_positif": 900,
        "denivele_negatif": 100,
        "duree_jours": 1,
        "duree_marche_min": 4.0,
        "duree_marche_max": 5.5,
        "origine": "manuel",
        "tags": ["cours d'eau", "lac", "faune"],
    },
    {
        "nom": "Lac Blanc et Lac de Grenairon",
        "zone": "Vanoise",
        "niveau": "facile",
        "distance_km": 7.5,
        "denivele_positif": 450,
        "denivele_negatif": 450,
        "duree_jours": 1,
        "duree_marche_min": 3.0,
        "duree_marche_max": 4.0,
        "origine": "manuel",
        "tags": ["lac", "point de vue"],
    },
]


def seed():
    init_db()
    db = SessionLocal()
    try:
        if db.query(Parcours).count() > 0:
            print("La base contient déjà des données, seed ignoré.")
            return

        tags_by_nom = {}
        for nom in TAGS:
            tag = Tag(nom=nom)
            db.add(tag)
            tags_by_nom[nom] = tag
        db.flush()

        for data in PARCOURS:
            tag_noms = data.pop("tags")
            parcours = Parcours(**data)
            db.add(parcours)
            db.flush()
            for nom in tag_noms:
                db.add(ParcoursTag(parcours_id=parcours.id, tag_id=tags_by_nom[nom].id, source="manuel"))

        db.commit()
        print(f"{len(PARCOURS)} parcours et {len(TAGS)} tags insérés.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
