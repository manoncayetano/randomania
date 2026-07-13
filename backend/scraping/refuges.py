import requests

from db.database import SessionLocal
from db.models import Refuge

USER_AGENT = "rando-app-personal/1.0 (usage personnel non commercial)"

# Bbox couvrant le Parc national des Écrins (lon_min, lon_max, lat_min, lat_max),
# où se trouvent ~94% des randos de la base.
BBOX_ECRINS = (5.7, 6.7, 44.35, 45.25)


def fetch_refuges(bbox):
    min_lon, max_lon, min_lat, max_lat = bbox
    query = f"""
    [out:json][timeout:60];
    (
      node["tourism"="alpine_hut"]({min_lat},{min_lon},{max_lat},{max_lon});
      node["tourism"="wilderness_hut"]({min_lat},{min_lon},{max_lat},{max_lon});
    );
    out body;
    """
    r = requests.post(
        "https://overpass-api.de/api/interpreter",
        data={"data": query},
        headers={"User-Agent": USER_AGENT},
        timeout=60,
    )
    r.raise_for_status()
    return r.json()["elements"]


def import_refuges(bbox=BBOX_ECRINS):
    elements = fetch_refuges(bbox)
    print(f"{len(elements)} refuges trouvés sur OpenStreetMap dans cette zone.")

    db = SessionLocal()
    added, skipped = 0, 0
    try:
        for el in elements:
            osm_id = f"node/{el['id']}"
            existing = db.query(Refuge).filter(Refuge.osm_id == osm_id).first()
            if existing:
                skipped += 1
                continue

            tags = el.get("tags", {})
            nom = tags.get("name") or tags.get("name:fr") or "Refuge"
            altitude = None
            if tags.get("ele"):
                try:
                    altitude = round(float(tags["ele"]))
                except ValueError:
                    altitude = None
            type_ = "gardé" if tags.get("tourism") == "alpine_hut" else "non gardé"

            db.add(Refuge(
                nom=nom,
                latitude=el["lat"],
                longitude=el["lon"],
                altitude=altitude,
                type=type_,
                osm_id=osm_id,
            ))
            added += 1
        db.commit()
    finally:
        db.close()

    print(f"Terminé : {added} refuges ajoutés, {skipped} déjà présents.")
    return added, skipped


if __name__ == "__main__":
    import_refuges()
