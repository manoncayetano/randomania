import re
import time
from typing import Optional

import requests
from bs4 import BeautifulSoup

from db.database import SessionLocal
from db.models import Avis, Parcours, ParcoursTag, Photo, Restriction, Tag
from scraping.tag_detector import detect_tags

USER_AGENT = "Mozilla/5.0 (compatible; rando-app-personal/1.0; usage personnel non commercial)"
NIVEAU_MAP = {"Facile": "facile", "Moyenne": "moyen", "Difficile": "difficile", "Très difficile": "difficile"}
DIFFICULTY_RANGE = {"facile": (1, 1), "moyen": (2, 2), "difficile": (3, 5)}

RESTRICTION_KEYWORDS = ["réglementation", "parc national", "réserve naturelle", "interdit", "arrêté",
                        "bivouac", "chasse", "protégé", "natura 2000", "zone naturelle sensible", "biotope"]
RESTRICTION_TYPE_KEYWORDS = [
    ("bivouac", "bivouac"),
    ("camping", "camping"),
    ("chasse", "chasse"),
    ("arrêté", "arrete_municipal"),
    ("réserve naturelle", "reserve_naturelle"),
]


def get_overpass_bbox(park_name: str) -> tuple[float, float, float, float]:
    query = f"""
    [out:json][timeout:60];
    (rel["boundary"="national_park"]["name"="{park_name}"];>>;);
    out bb;
    """
    r = requests.get(
        "https://overpass-api.de/api/interpreter",
        params={"data": query},
        headers={"User-Agent": USER_AGENT},
        timeout=60,
    )
    r.raise_for_status()
    data = r.json()
    lats, lons = [], []
    for el in data["elements"]:
        if "lat" in el:
            lats.append(el["lat"])
            lons.append(el["lon"])
        if "bounds" in el:
            b = el["bounds"]
            lats += [b["minlat"], b["maxlat"]]
            lons += [b["minlon"], b["maxlon"]]
    if not lats:
        raise ValueError(f"Aucune géométrie trouvée pour le parc : {park_name}")
    return min(lons), max(lons), min(lats), max(lats)


def fetch_listing(bbox, min_difficulty=1, max_difficulty=2, limit=1000):
    min_lon, max_lon, min_lat, max_lat = bbox
    params = {
        "component": "rando",
        "task": "searchCircuitV2Ajax",
        "geolocation": 0,
        "metaData": "",
        "minDuration": 0,
        "maxDuration": 744,
        "minDistance": 0,
        "maxDistance": 50,
        "minDifficulty": min_difficulty,
        "maxDifficulty": max_difficulty,
        "minElevation": 0,
        "maxElevation": 3000,
        "filterType": "duration",
        "retourDepart": 0,
        "bbox": f"{min_lon},{max_lon},{min_lat},{max_lat}",
        "limit": limit,
        "w": 572,
        "h": 630,
    }
    r = requests.get("https://www.visorando.com/", params=params, headers={"User-Agent": USER_AGENT}, timeout=30)
    r.raise_for_status()
    return [item["html"] for item in r.json()]


def _clean_spaces(text: str) -> str:
    return text.replace("\xa0", " ").replace(" ", " ").replace(" ", " ")


def parse_duration_to_hours(text: str) -> Optional[float]:
    match = re.search(r"(\d+)\s*h(?:\D*(\d+))?", _clean_spaces(text))
    if not match:
        return None
    hours = int(match.group(1))
    minutes = int(match.group(2)) if match.group(2) else 0
    return round(hours + minutes / 60, 2)


def parse_number(text: str) -> Optional[float]:
    cleaned_text = _clean_spaces(text)
    match = re.search(r"([\d\s]+(?:,\d+)?)", cleaned_text)
    if not match:
        return None
    cleaned = match.group(1).replace(" ", "").replace(",", ".")
    return float(cleaned)


def parse_item(html: str) -> dict:
    soup = BeautifulSoup(html, "html.parser")
    root = soup.find("div", attrs={"data-rando-id": True})
    rando_id = root["data-rando-id"]
    link = root.find("a")
    url_source = link["href"]
    nom = root.find("h3").get_text(strip=True)

    data = {"rando_id": rando_id, "nom": nom, "url_source": url_source}

    tags_list = root.find("div", class_="tags-list")
    for tag_span in tags_list.find_all("span", class_="tag"):
        img = tag_span.find("img")
        label = img.get("title") if img else None
        value_span = tag_span.find("span")
        value_text = value_span.get_text(strip=True) if value_span else ""
        if label == "Distance":
            data["distance_km"] = parse_number(value_text)
        elif label == "Dénivelé positif":
            data["denivele_positif"] = int(parse_number(value_text) or 0)
        elif label == "Dénivelé négatif":
            data["denivele_negatif"] = int(parse_number(value_text) or 0)
        elif label == "Durée":
            data["duree_h"] = parse_duration_to_hours(value_text)
        elif img and img.get("alt") == "▲":
            data["niveau"] = NIVEAU_MAP.get(img.get("title"))

    excerpt = root.find("p", class_="excerpt-2")
    data["description"] = excerpt.get_text(strip=True) if excerpt else ""

    thumb = root.find("img", class_="radius--md")
    data["thumbnail"] = thumb["src"] if thumb else None

    return data


def save_hike(db, zone_label: str, data: dict) -> bool:
    existing = db.query(Parcours).filter(Parcours.url_source == data["url_source"]).first()
    if existing:
        return False

    parcours = Parcours(
        nom=data["nom"],
        zone=zone_label,
        niveau=data.get("niveau"),
        distance_km=data.get("distance_km"),
        denivele_positif=data.get("denivele_positif"),
        denivele_negatif=data.get("denivele_negatif"),
        duree_jours=1,
        duree_marche_min=data.get("duree_h"),
        duree_marche_max=data.get("duree_h"),
        origine="scraping",
        url_source=data["url_source"],
    )
    db.add(parcours)
    db.flush()

    if data.get("thumbnail"):
        db.add(Photo(parcours_id=parcours.id, url_ou_chemin=data["thumbnail"]))

    for tag_nom in detect_tags(data.get("description", "")):
        tag = db.query(Tag).filter(Tag.nom == tag_nom).first()
        if tag is None:
            tag = Tag(nom=tag_nom)
            db.add(tag)
            db.flush()
        db.add(ParcoursTag(parcours_id=parcours.id, tag_id=tag.id, source="auto_texte"))

    return True


def run(
    park_name="Parc national des Écrins",
    zone_label="Parc national des Écrins",
    niveaux=("facile", "moyen"),
    delay=1.0,
    bbox=None,
):
    if bbox is None:
        bbox = get_overpass_bbox(park_name)
    print(f"Bbox {park_name} : {bbox}")

    difficulties = [DIFFICULTY_RANGE[n] for n in niveaux]
    min_diff = min(d[0] for d in difficulties)
    max_diff = max(d[1] for d in difficulties)

    time.sleep(delay)
    items_html = fetch_listing(bbox, min_diff, max_diff)
    print(f"{len(items_html)} randonnées récupérées depuis Visorando (niveau {'/'.join(niveaux)})")

    db = SessionLocal()
    added = 0
    skipped = 0
    try:
        for html in items_html:
            data = parse_item(html)
            if data.get("niveau") not in niveaux:
                continue
            if save_hike(db, zone_label, data):
                added += 1
            else:
                skipped += 1
        db.commit()
    finally:
        db.close()

    print(f"{added} parcours ajoutés, {skipped} déjà présents (doublons ignorés).")
    return added, skipped


def run_by_location(lieu: str, rayon_km: float, niveaux=("facile", "moyen")) -> dict:
    """Importe les randonnées Visorando dans un rayon (km) autour d'un lieu donné (ex : 'Sénas, 13560')."""
    from generation.geocoding import bbox_from_center, geocode

    geo = geocode(lieu)
    if geo is None:
        raise ValueError(f"Lieu introuvable : {lieu}")
    lat, lon, nom_affiche = geo
    bbox = bbox_from_center(lat, lon, rayon_km)

    difficulties = [DIFFICULTY_RANGE[n] for n in niveaux]
    min_diff = min(d[0] for d in difficulties)
    max_diff = max(d[1] for d in difficulties)

    items_html = fetch_listing(bbox, min_diff, max_diff)

    db = SessionLocal()
    added, skipped = 0, 0
    try:
        for html in items_html:
            data = parse_item(html)
            if data.get("niveau") not in niveaux:
                continue
            if save_hike(db, lieu, data):
                added += 1
            else:
                skipped += 1
        db.commit()
    finally:
        db.close()

    return {
        "lieu": lieu,
        "lieu_trouve": nom_affiche,
        "latitude": lat,
        "longitude": lon,
        "rayon_km": rayon_km,
        "trouvees": len(items_html),
        "ajoutees": added,
        "deja_presentes": skipped,
    }


def fetch_detail_page(url: str) -> str:
    r = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=30)
    r.raise_for_status()
    return r.text


def parse_detail_page(html: str, max_avis: int = 5) -> dict:
    soup = BeautifulSoup(html, "html.parser")
    data = {"date_maj": None, "avis": [], "restriction": None}

    maj_block = soup.select_one('[data-tippy-content="Date de dernière mise à jour de la randonnée"] time')
    if maj_block and maj_block.get("datetime"):
        data["date_maj"] = maj_block["datetime"][:10]

    for topic in soup.select("#topics-rando > div.topic")[:max_avis]:
        time_el = topic.select_one("time")
        date_avis = time_el["datetime"][:10] if time_el and time_el.get("datetime") else None

        note_el = topic.select_one(".topic-text p strong")
        note = None
        if note_el and "Note globale" in note_el.get_text():
            spans = note_el.find_parent("p").find_all("span")
            if spans:
                try:
                    note = float(spans[0].get_text(strip=True))
                except ValueError:
                    note = None

        paragraphs = topic.select(".topic-text > p")
        texte = None
        if paragraphs:
            last = paragraphs[-1]
            if not last.find("strong"):
                texte = last.get_text(strip=True)

        if texte:
            data["avis"].append({"note": note, "texte": texte, "date_avis": date_avis})

    for section in soup.select("section"):
        header = section.find("h2")
        if not header or header.get_text(strip=True) != "Informations pratiques":
            continue
        article = section.find("article")
        text = article.get_text(" ", strip=True) if article else ""
        lowered = text.lower()
        if any(kw in lowered for kw in RESTRICTION_KEYWORDS):
            restriction_type = "acces_massif"
            for kw, type_value in RESTRICTION_TYPE_KEYWORDS:
                if kw in lowered:
                    restriction_type = type_value
                    break
            data["restriction"] = {"type": restriction_type, "description": text}
        break

    return data


def enrich_details(delay: float = 1.5, only_missing: bool = True, limit: Optional[int] = None):
    db = SessionLocal()
    try:
        query = db.query(Parcours).filter(Parcours.origine == "scraping", Parcours.url_source.isnot(None))
        if only_missing:
            query = query.filter(~Parcours.avis.any())
        if limit:
            query = query.limit(limit)
        parcours_list = query.all()
        parcours_ids = [p.id for p in parcours_list]
    finally:
        db.close()

    print(f"{len(parcours_ids)} fiches à enrichir (avis + infos pratiques).")

    enriched = 0
    errors = 0
    for i, parcours_id in enumerate(parcours_ids, start=1):
        db = SessionLocal()
        try:
            parcours = db.query(Parcours).filter(Parcours.id == parcours_id).first()
            if parcours is None:
                continue
            try:
                html = fetch_detail_page(parcours.url_source)
                detail = parse_detail_page(html)
            except Exception as exc:
                print(f"[{i}/{len(parcours_ids)}] Échec {parcours.url_source} : {exc}")
                errors += 1
                continue

            if detail["date_maj"]:
                parcours.date_maj = detail["date_maj"]

            for avis_data in detail["avis"]:
                db.add(Avis(
                    parcours_id=parcours.id,
                    texte=avis_data["texte"],
                    note=avis_data["note"],
                    source="visorando",
                    date_avis=avis_data["date_avis"],
                ))

            if detail["restriction"]:
                db.add(Restriction(
                    parcours_id=parcours.id,
                    zone=parcours.zone,
                    type=detail["restriction"]["type"],
                    description=detail["restriction"]["description"],
                    source="visorando",
                    date_maj=detail["date_maj"],
                ))

            db.commit()
            enriched += 1
            if i % 25 == 0:
                print(f"[{i}/{len(parcours_ids)}] traités...")
        finally:
            db.close()

        time.sleep(delay)

    print(f"Terminé : {enriched} fiches enrichies, {errors} erreurs.")
    return enriched, errors


def parse_full_fiche(html: str) -> dict:
    soup = BeautifulSoup(html, "html.parser")
    data = {"photos": []}

    h1 = soup.find("h1")
    data["nom"] = h1.get_text(strip=True) if h1 else None

    metrics = {}
    for li in soup.select(".vr-walk-datasheet li"):
        dataset = li.find(class_="vr-walk-datasheet--dataset")
        if not dataset:
            continue
        strong = dataset.find("strong")
        if not strong:
            continue
        label = strong.get_text(strip=True).replace("\xa0", " ").rstrip(":").strip()
        strong.extract()
        metrics[label] = dataset.get_text(" ", strip=True)

    if "Distance" in metrics:
        data["distance_km"] = parse_number(metrics["Distance"])
    if "Dénivelé positif" in metrics:
        data["denivele_positif"] = int(parse_number(metrics["Dénivelé positif"]) or 0)
    if "Dénivelé négatif" in metrics:
        data["denivele_negatif"] = int(parse_number(metrics["Dénivelé négatif"]) or 0)
    duree_text = metrics.get("Durée moyenne") or metrics.get("Durée selon l’auteur")
    if duree_text:
        data["duree_h"] = parse_duration_to_hours(duree_text)
    if "Difficulté" in metrics:
        data["niveau"] = NIVEAU_MAP.get(metrics["Difficulté"])
    if "Régions" in metrics:
        data["zone"] = re.sub(r"\s+,", ",", metrics["Régions"])
    if "Départ/Arrivée" in metrics:
        coord_match = re.search(r"([NS])\s*([\d.]+).*?([EW])\s*([\d.]+)", metrics["Départ/Arrivée"])
        if coord_match:
            ns, lat, ew, lon = coord_match.groups()
            data["latitude"] = float(lat) * (1 if ns == "N" else -1)
            data["longitude"] = float(lon) * (1 if ew == "E" else -1)

    for section in soup.select("section"):
        header = section.find("h2")
        if header and header.get_text(strip=True) == "Photos":
            for img in section.find_all("img"):
                if img.get("src"):
                    data["photos"].append(img["src"])
            break

    return data


def import_from_url(url: str, zone_override: Optional[str] = None) -> int:
    html = fetch_detail_page(url)
    full = parse_full_fiche(html)
    detail = parse_detail_page(html, max_avis=10)

    db = SessionLocal()
    try:
        parcours = db.query(Parcours).filter(Parcours.url_source == url).first()
        is_new = parcours is None
        if is_new:
            parcours = Parcours(url_source=url, origine="scraping")
            db.add(parcours)

        parcours.nom = full.get("nom") or parcours.nom
        parcours.zone = zone_override or full.get("zone") or parcours.zone
        parcours.niveau = full.get("niveau") or parcours.niveau
        parcours.distance_km = full.get("distance_km") or parcours.distance_km
        parcours.denivele_positif = full.get("denivele_positif") or parcours.denivele_positif
        parcours.denivele_negatif = full.get("denivele_negatif") or parcours.denivele_negatif
        parcours.duree_jours = parcours.duree_jours or 1
        parcours.duree_marche_min = full.get("duree_h") or parcours.duree_marche_min
        parcours.duree_marche_max = full.get("duree_h") or parcours.duree_marche_max
        parcours.latitude = full.get("latitude") or parcours.latitude
        parcours.longitude = full.get("longitude") or parcours.longitude
        if detail["date_maj"]:
            parcours.date_maj = detail["date_maj"]
        db.flush()

        existing_photo_urls = {p.url_ou_chemin for p in parcours.photos}
        for photo_url in full.get("photos", []):
            if photo_url not in existing_photo_urls:
                db.add(Photo(parcours_id=parcours.id, url_ou_chemin=photo_url))

        existing_avis_keys = {(a.date_avis, a.texte) for a in parcours.avis}
        for avis_data in detail["avis"]:
            key = (avis_data["date_avis"], avis_data["texte"])
            if key not in existing_avis_keys:
                db.add(Avis(
                    parcours_id=parcours.id,
                    texte=avis_data["texte"],
                    note=avis_data["note"],
                    source="visorando",
                    date_avis=avis_data["date_avis"],
                ))

        if detail["restriction"]:
            db.add(Restriction(
                parcours_id=parcours.id,
                zone=parcours.zone,
                type=detail["restriction"]["type"],
                description=detail["restriction"]["description"],
                source="visorando",
                date_maj=detail["date_maj"],
            ))

        text_for_tags = " ".join(
            [a["texte"] for a in detail["avis"]]
            + ([detail["restriction"]["description"]] if detail["restriction"] else [])
        )
        existing_tag_names = {pt.tag.nom for pt in parcours.parcours_tags}
        for tag_nom in detect_tags(text_for_tags):
            if tag_nom in existing_tag_names:
                continue
            tag = db.query(Tag).filter(Tag.nom == tag_nom).first()
            if tag is None:
                tag = Tag(nom=tag_nom)
                db.add(tag)
                db.flush()
            db.add(ParcoursTag(parcours_id=parcours.id, tag_id=tag.id, source="auto_texte"))

        db.commit()
        parcours_id = parcours.id
    finally:
        db.close()

    return parcours_id


def backfill_coordinates(delay: float = 1.0, limit: Optional[int] = None):
    db = SessionLocal()
    try:
        query = db.query(Parcours).filter(
            Parcours.origine == "scraping",
            Parcours.url_source.isnot(None),
            Parcours.latitude.is_(None),
        )
        if limit:
            query = query.limit(limit)
        targets = [(p.id, p.url_source) for p in query.all()]
    finally:
        db.close()

    print(f"{len(targets)} fiches sans coordonnées à compléter.")

    updated, errors = 0, 0
    for i, (parcours_id, url) in enumerate(targets, start=1):
        try:
            html = fetch_detail_page(url)
            full = parse_full_fiche(html)
        except Exception as exc:
            print(f"[{i}/{len(targets)}] Échec {url} : {exc}")
            errors += 1
            time.sleep(delay)
            continue

        if full.get("latitude") is not None:
            db = SessionLocal()
            try:
                p = db.query(Parcours).filter(Parcours.id == parcours_id).first()
                if p:
                    p.latitude = full["latitude"]
                    p.longitude = full["longitude"]
                    db.commit()
                    updated += 1
            finally:
                db.close()

        if i % 25 == 0:
            print(f"[{i}/{len(targets)}] traités...")
        time.sleep(delay)

    print(f"Terminé : {updated} coordonnées ajoutées, {errors} erreurs.")
    return updated, errors


if __name__ == "__main__":
    run()
