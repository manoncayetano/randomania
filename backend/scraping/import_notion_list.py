import time

from db.database import SessionLocal
from db.models import Favori, Parcours, ParcoursTag, Tag
from scraping.visorando import import_from_url

VISORANDO_URLS = [
    "https://visorando.com/randonnee-oulles-du-diable-cascade-du-buchardet-et/",
    "https://www.visorando.com/randonnee-cascade-d-ars-et-etang-de-guzet/",
    "https://www.visorando.com/randonnee-la-roque-sur-ceze-et-les-cascades-du-sau/",
    "https://www.visorando.com/randonnee-les-cabanes-d-ansabere/",
    "https://www.visorando.com/randonnee-le-cirque-de-gavarnie-par-le-plateau-de-/",
    "https://www.visorando.com/randonnee-le-cirque-de-gavarnie-par-les-vires/",
    "https://www.visorando.com/randonnee-lac-des-confins-et-plan-lachat/",
    "https://www.visorando.com/randonnee-le-plateau-des-lacs-depuis-poursollet/",
    "https://www.visorando.com/randonnee-le-rocher-du-vent/",
    "https://www.visorando.com/randonnee-lac-de-gaube-a-cauterets-1731m/",
    "https://www.visorando.com/randonnee-la-cascade-d-ars-2/",
    "https://www.visorando.com/randonnee-la-boucle-des-canalettes/",
    "https://www.visorando.com/randonnee-le-pont-de-tuve-les-gorges-de-la-siagne-/",
    "https://www.visorando.com/randonnee-lac-graveirette/",
    "https://www.visorando.com/randonnee-lacs-des-millefonts-col-du-barn/",
    "https://www.visorando.com/randonnee-lac-autier/",
    "https://www.visorando.com/randonnee-portes-de-l-enfer-et-cascade-du-pissoun/",
    "https://www.visorando.com/randonnee-fortins-de-pelousette-et-du-mont-des-fou/",
    "https://www.visorando.com/randonnee-lac-vert-de-fontanalba-et-voie-sacree/",
    "https://www.visorando.com/randonnee-refuge-de-valmasque/",
    "https://www.visorando.com/randonnee-tete-de-meric/",
    "https://www.visorando.com/randonnee-canyon-des-gueulards/",
    "https://www.visorando.com/randonnee-les-ocres-de-mormoiron/",
    "https://www.visorando.com/randonnee-le-circuit-de-bauduen/",
    "https://www.visorando.com/randonnee-le-rocher-des-deux-trous/",
    "https://www.visorando.com/randonnee-les-dentelles-de-montmirail-a-partir-de-/",
    "https://www.visorando.com/randonnee-combe-de-vaumale-combe-de-lioux/",
    "https://www.visorando.com/randonnee-col-de-la-cayolle-lacs-de-la-petite-cayo/",
    "https://www.visorando.com/randonnee-la-grotte-de-mueron-et-les-gorges-du-bla/",
    "https://www.visorando.com/randonnee-les-caisses-et-les-cretes-au-dessus-de-m/",
    "https://www.visorando.com/randonnee-le-lac-sainte-anne-en-circuit/",
]

MANUAL_ENTRIES = [
    {
        "nom": "Plateau d'Emparis et ses lacs (Lac Noir et Lac Lérié)",
        "zone": "Isère",
        "niveau": "difficile",
        "distance_km": 17.0,
        "denivele_positif": 1000,
        "url_source": "https://www.oisans.com/equipement/le-plateau-demparis-et-ses-lacs-lac-noir-et-lac-lerie/",
    },
    {
        "nom": "Lac de Montagnon",
        "zone": "Pyrénées",
        "niveau": "difficile",
        "distance_km": 12.0,
        "denivele_positif": 1130,
        "url_source": "https://www.alltrails.com/fr/randonnee/france/pyrenees-atlantiques/lac-du-montagnon",
    },
]

EXISTING_URLS = ["https://www.visorando.com/randonnee-lac-bleu-lac-lauzon/"]

UTILISATEUR = "Manon"


def run():
    db = SessionLocal()
    try:
        parcours_ids = [
            p.id for p in db.query(Parcours).filter(Parcours.url_source.in_(EXISTING_URLS)).all()
        ]
    finally:
        db.close()

    print(f"{len(parcours_ids)} randos déjà en base réutilisées directement.")

    imported, failed = 0, []
    for i, url in enumerate(VISORANDO_URLS, start=1):
        try:
            parcours_id = import_from_url(url)
            parcours_ids.append(parcours_id)
            imported += 1
            print(f"[{i}/{len(VISORANDO_URLS)}] OK : {url}")
        except Exception as exc:
            failed.append((url, str(exc)))
            print(f"[{i}/{len(VISORANDO_URLS)}] ÉCHEC : {url} -> {exc}")
        time.sleep(1.2)

    db = SessionLocal()
    try:
        for entry in MANUAL_ENTRIES:
            existing = db.query(Parcours).filter(Parcours.url_source == entry["url_source"]).first()
            if existing:
                parcours_ids.append(existing.id)
                continue
            p = Parcours(
                nom=entry["nom"],
                zone=entry["zone"],
                niveau=entry["niveau"],
                distance_km=entry["distance_km"],
                denivele_positif=entry["denivele_positif"],
                duree_jours=1,
                origine="manuel",
                url_source=entry["url_source"],
            )
            db.add(p)
            db.flush()
            parcours_ids.append(p.id)
        db.commit()
    finally:
        db.close()

    db = SessionLocal()
    try:
        added_favoris = 0
        for pid in parcours_ids:
            existing = (
                db.query(Favori)
                .filter(Favori.parcours_id == pid, Favori.utilisateur == UTILISATEUR)
                .first()
            )
            if existing is None:
                db.add(Favori(parcours_id=pid, utilisateur=UTILISATEUR))
                added_favoris += 1
        db.commit()
    finally:
        db.close()

    print(f"Terminé : {imported} randos importées, {len(failed)} échecs, {added_favoris} favoris ajoutés pour {UTILISATEUR}.")
    if failed:
        print("Échecs :")
        for url, err in failed:
            print(" -", url, ":", err)

    return parcours_ids, failed


if __name__ == "__main__":
    run()
