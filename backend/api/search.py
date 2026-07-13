from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from api.auth import get_current_username
from db.database import DATA_DIR, get_db
from db.models import Avis, Favori, Parcours, ParcoursTag, Photo, Realisation, Restriction, Tag
from generation.difficulty import compute_indice_difficulte
from generation.geo import haversine_km
from generation.gpx import parse_gpx

router = APIRouter()

THUMBNAIL_MARKER = "/images/thumbnail/t-"


def _upscale_photo_url(url: Optional[str], size: str) -> Optional[str]:
    if not url or THUMBNAIL_MARKER not in url:
        return url
    if size == "medium":
        return url.replace(THUMBNAIL_MARKER, "/images/inter/m-")
    if size == "original":
        return url.replace(THUMBNAIL_MARKER, "/images/original/")
    return url


class ParcoursOut(BaseModel):
    id: int
    nom: str
    zone: Optional[str] = None
    niveau: Optional[str] = None
    distance_km: Optional[float] = None
    denivele_positif: Optional[int] = None
    denivele_negatif: Optional[int] = None
    duree_jours: Optional[int] = None
    duree_marche_min: Optional[float] = None
    duree_marche_max: Optional[float] = None
    origine: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    tags: List[str] = []
    photo: Optional[str] = None
    est_favori: bool = False
    nombre_favoris: int = 0
    est_realisee: bool = False
    date_realisation: Optional[str] = None
    indice_difficulte: Optional[int] = None
    indice_difficulte_label: Optional[str] = None
    distance_depuis_km: Optional[float] = None
    temps_voiture_min: Optional[float] = None
    url_source: Optional[str] = None

    class Config:
        from_attributes = True


class AvisOut(BaseModel):
    id: int
    texte: Optional[str] = None
    note: Optional[float] = None
    source: Optional[str] = None
    date_avis: Optional[str] = None

    class Config:
        from_attributes = True


class RestrictionOut(BaseModel):
    id: int
    zone: Optional[str] = None
    type: Optional[str] = None
    description: Optional[str] = None
    source: Optional[str] = None
    date_maj: Optional[str] = None

    class Config:
        from_attributes = True


class PhotoOut(BaseModel):
    id: int
    url: str


class ElevationPointOut(BaseModel):
    distance_km: float
    elevation: Optional[float] = None
    lat: float
    lon: float


class ParcoursDetailOut(ParcoursOut):
    gpx_path: Optional[str] = None
    gpx_points: List[List[float]] = []
    gpx_profile: List[ElevationPointOut] = []
    cover_photo_id: Optional[int] = None
    photos: List[PhotoOut] = []
    avis: List[AvisOut] = []
    restrictions: List[RestrictionOut] = []


def _gpx_points_for(p: Parcours) -> List[List[float]]:
    if p.gpx_path and p.gpx_path.startswith("/media/gpx/"):
        try:
            parsed = parse_gpx(DATA_DIR / "gpx" / p.gpx_path[len("/media/gpx/"):])
            return parsed["points"]
        except Exception:
            return []
    return []


def _gpx_profile_for(p: Parcours) -> List[dict]:
    if p.gpx_path and p.gpx_path.startswith("/media/gpx/"):
        try:
            parsed = parse_gpx(DATA_DIR / "gpx" / p.gpx_path[len("/media/gpx/"):])
            return parsed["profile"]
        except Exception:
            return []
    return []


def _cover_photo_url(p: Parcours, size: str) -> Optional[str]:
    if p.cover_photo_id:
        cover = next((photo for photo in p.photos if photo.id == p.cover_photo_id), None)
        if cover:
            return _upscale_photo_url(cover.url_ou_chemin, size)
    if p.photos:
        return _upscale_photo_url(p.photos[0].url_ou_chemin, size)
    return None


def _to_parcours_out(
    p: Parcours,
    favori_ids: Optional[set] = None,
    realisations: Optional[dict] = None,
    favori_counts: Optional[dict] = None,
) -> ParcoursOut:
    difficulte = compute_indice_difficulte(p.distance_km, p.denivele_positif)
    realisation = (realisations or {}).get(p.id)
    return ParcoursOut(
        id=p.id,
        nom=p.nom,
        zone=p.zone,
        niveau=p.niveau,
        distance_km=p.distance_km,
        denivele_positif=p.denivele_positif,
        denivele_negatif=p.denivele_negatif,
        duree_jours=p.duree_jours,
        duree_marche_min=p.duree_marche_min,
        duree_marche_max=p.duree_marche_max,
        origine=p.origine,
        latitude=p.latitude,
        longitude=p.longitude,
        tags=[pt.tag.nom for pt in p.parcours_tags],
        photo=_cover_photo_url(p, "medium"),
        est_favori=bool(favori_ids) and p.id in favori_ids,
        nombre_favoris=(favori_counts or {}).get(p.id, len(p.favoris)),
        est_realisee=realisation is not None,
        date_realisation=realisation,
        indice_difficulte=difficulte["indice"],
        indice_difficulte_label=difficulte["label"],
        temps_voiture_min=p.temps_voiture_min,
        url_source=p.url_source,
    )


def _filtered_parcours(
    db: Session,
    zone: Optional[str],
    q: Optional[str],
    niveau: Optional[List[str]],
    distance_min: Optional[float],
    distance_max: Optional[float],
    denivele_positif_min: Optional[int],
    denivele_positif_max: Optional[int],
    denivele_negatif_min: Optional[int],
    denivele_negatif_max: Optional[int],
    tags: Optional[List[str]],
    favoris_de: Optional[List[str]],
    indice_difficulte_labels: Optional[List[str]] = None,
    temps_min: Optional[float] = None,
    temps_max: Optional[float] = None,
    a_gpx: Optional[bool] = None,
    a_lien: Optional[bool] = None,
) -> List[Parcours]:
    query = db.query(Parcours)

    if zone:
        query = query.filter(func.unaccent(Parcours.zone).ilike(func.unaccent(f"%{zone}%")))
    if q:
        query = query.filter(func.unaccent(Parcours.nom).ilike(func.unaccent(f"%{q}%")))
    if niveau:
        query = query.filter(Parcours.niveau.in_(niveau))
    if distance_min is not None:
        query = query.filter(Parcours.distance_km >= distance_min)
    if distance_max is not None:
        query = query.filter(Parcours.distance_km <= distance_max)
    if denivele_positif_min is not None:
        query = query.filter(Parcours.denivele_positif >= denivele_positif_min)
    if denivele_positif_max is not None:
        query = query.filter(Parcours.denivele_positif <= denivele_positif_max)
    if denivele_negatif_min is not None:
        query = query.filter(Parcours.denivele_negatif >= denivele_negatif_min)
    if denivele_negatif_max is not None:
        query = query.filter(Parcours.denivele_negatif <= denivele_negatif_max)
    if temps_min is not None:
        query = query.filter(Parcours.temps_voiture_min >= temps_min)
    if temps_max is not None:
        query = query.filter(Parcours.temps_voiture_min <= temps_max)
    if a_gpx is not None:
        query = query.filter(Parcours.gpx_path.isnot(None) if a_gpx else Parcours.gpx_path.is_(None))
    if a_lien is not None:
        query = query.filter(Parcours.url_source.isnot(None) if a_lien else Parcours.url_source.is_(None))
    if favoris_de:
        query = query.join(Favori, Favori.parcours_id == Parcours.id).filter(
            Favori.utilisateur.in_(favoris_de)
        ).distinct()

    results = query.all()

    if tags:
        tags_set = set(tags)
        results = [p for p in results if tags_set.issubset({pt.tag.nom for pt in p.parcours_tags})]

    if indice_difficulte_labels:
        labels_set = set(indice_difficulte_labels)
        results = [
            p for p in results
            if compute_indice_difficulte(p.distance_km, p.denivele_positif)["label"] in labels_set
        ]

    return results


@router.get("/parcours/count")
def count_parcours(
    zone: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    niveau: Optional[List[str]] = Query(None),
    distance_min: Optional[float] = Query(None, ge=0),
    distance_max: Optional[float] = Query(None, ge=0),
    denivele_positif_min: Optional[int] = Query(None, ge=0),
    denivele_positif_max: Optional[int] = Query(None, ge=0),
    denivele_negatif_min: Optional[int] = Query(None, ge=0),
    denivele_negatif_max: Optional[int] = Query(None, ge=0),
    tags: Optional[List[str]] = Query(None),
    favoris_de: Optional[List[str]] = Query(None),
    indice_difficulte_labels: Optional[List[str]] = Query(None),
    temps_min: Optional[float] = Query(None, ge=0),
    temps_max: Optional[float] = Query(None, ge=0),
    a_gpx: Optional[bool] = Query(None, description="True : uniquement les randos avec un GPX importé, False : sans GPX"),
    a_lien: Optional[bool] = Query(None, description="True : uniquement les randos avec un lien externe (ex Visorando), False : sans lien"),
    db: Session = Depends(get_db),
):
    results = _filtered_parcours(
        db, zone, q, niveau, distance_min, distance_max,
        denivele_positif_min, denivele_positif_max,
        denivele_negatif_min, denivele_negatif_max,
        tags, favoris_de, indice_difficulte_labels,
        temps_min, temps_max, a_gpx, a_lien,
    )
    return {"count": len(results)}


@router.get("/parcours", response_model=List[ParcoursOut])
def search_parcours(
    zone: Optional[str] = Query(None, description="Filtre par zone (recherche partielle)"),
    q: Optional[str] = Query(None, description="Recherche par mot-clé dans le nom (ex : lac bleu)"),
    niveau: Optional[List[str]] = Query(None, description="Un ou plusieurs niveaux : facile / moyen / difficile"),
    distance_min: Optional[float] = Query(None, ge=0),
    distance_max: Optional[float] = Query(None, ge=0),
    denivele_positif_min: Optional[int] = Query(None, ge=0),
    denivele_positif_max: Optional[int] = Query(None, ge=0),
    denivele_negatif_min: Optional[int] = Query(None, ge=0),
    denivele_negatif_max: Optional[int] = Query(None, ge=0),
    tags: Optional[List[str]] = Query(None, description="Un ou plusieurs tags requis (toutes les randos doivent avoir tous les tags sélectionnés)"),
    favoris_de: Optional[List[str]] = Query(None, description="Ne montrer que les favoris d'un ou plusieurs utilisateurs"),
    indice_difficulte_labels: Optional[List[str]] = Query(None, description="Un ou plusieurs niveaux de difficulté : Facile, Modéré, Assez difficile, Difficile, Très difficile"),
    temps_min: Optional[float] = Query(None, ge=0, description="Temps de trajet en voiture minimum depuis Sénas (min)"),
    temps_max: Optional[float] = Query(None, ge=0, description="Temps de trajet en voiture maximum depuis Sénas (min)"),
    a_gpx: Optional[bool] = Query(None, description="True : uniquement les randos avec un GPX importé, False : sans GPX"),
    a_lien: Optional[bool] = Query(None, description="True : uniquement les randos avec un lien externe (ex Visorando), False : sans lien"),
    db: Session = Depends(get_db),
    utilisateur: str = Depends(get_current_username),
):
    results = _filtered_parcours(
        db, zone, q, niveau, distance_min, distance_max,
        denivele_positif_min, denivele_positif_max,
        denivele_negatif_min, denivele_negatif_max,
        tags, favoris_de, indice_difficulte_labels,
        temps_min, temps_max, a_gpx, a_lien,
    )

    favori_ids = {
        r[0] for r in db.query(Favori.parcours_id).filter(Favori.utilisateur == utilisateur).all()
    }
    realisations = {
        r.parcours_id: r.date_realisation
        for r in db.query(Realisation).filter(Realisation.utilisateur == utilisateur).all()
    }

    return [_to_parcours_out(p, favori_ids, realisations) for p in results]


@router.get("/parcours/{parcours_id}", response_model=ParcoursDetailOut)
def get_parcours(parcours_id: int, db: Session = Depends(get_db), utilisateur: str = Depends(get_current_username)):
    p = db.query(Parcours).filter(Parcours.id == parcours_id).first()
    if p is None:
        raise HTTPException(status_code=404, detail="Parcours introuvable")

    est_favori = (
        db.query(Favori)
        .filter(Favori.parcours_id == parcours_id, Favori.utilisateur == utilisateur)
        .first()
        is not None
    )
    favori_ids = {parcours_id} if est_favori else set()

    realisation = (
        db.query(Realisation)
        .filter(Realisation.parcours_id == parcours_id, Realisation.utilisateur == utilisateur)
        .first()
    )
    realisations = {parcours_id: realisation.date_realisation} if realisation else {}

    gpx_points, gpx_profile = [], []
    if p.gpx_path and p.gpx_path.startswith("/media/gpx/"):
        try:
            parsed = parse_gpx(DATA_DIR / "gpx" / p.gpx_path[len("/media/gpx/"):])
            gpx_points, gpx_profile = parsed["points"], parsed["profile"]
        except Exception:
            gpx_points, gpx_profile = [], []

    base = _to_parcours_out(p, favori_ids, realisations)
    return ParcoursDetailOut(
        **base.model_dump(),
        gpx_path=p.gpx_path,
        gpx_points=gpx_points,
        gpx_profile=gpx_profile,
        cover_photo_id=p.cover_photo_id,
        photos=[
            PhotoOut(id=photo.id, url=_upscale_photo_url(photo.url_ou_chemin, "original"))
            for photo in p.photos
        ],
        avis=[AvisOut.model_validate(a) for a in p.avis],
        restrictions=[RestrictionOut.model_validate(r) for r in p.restrictions],
    )


class ParcoursUpdateIn(BaseModel):
    nom: Optional[str] = None
    zone: Optional[str] = None
    niveau: Optional[str] = None
    distance_km: Optional[float] = None
    denivele_positif: Optional[int] = None
    denivele_negatif: Optional[int] = None
    duree_jours: Optional[int] = None
    duree_marche_min: Optional[float] = None
    duree_marche_max: Optional[float] = None


NIVEAUX_VALIDES = {"facile", "moyen", "difficile"}


@router.put("/parcours/{parcours_id}", response_model=ParcoursDetailOut)
def update_parcours(
    parcours_id: int,
    body: ParcoursUpdateIn,
    db: Session = Depends(get_db),
    utilisateur: str = Depends(get_current_username),
):
    p = db.query(Parcours).filter(Parcours.id == parcours_id).first()
    if p is None:
        raise HTTPException(status_code=404, detail="Parcours introuvable")

    updates = body.model_dump(exclude_unset=True)
    if "niveau" in updates and updates["niveau"] is not None and updates["niveau"] not in NIVEAUX_VALIDES:
        raise HTTPException(status_code=400, detail="Niveau invalide (facile, moyen, difficile)")
    if "nom" in updates and not (updates["nom"] or "").strip():
        raise HTTPException(status_code=400, detail="Le nom ne peut pas être vide")

    for field, value in updates.items():
        setattr(p, field, value)
    db.commit()

    return get_parcours(parcours_id, db, utilisateur)


@router.get("/parcours/{parcours_id}/proches", response_model=List[ParcoursOut])
def parcours_proches(
    parcours_id: int,
    rayon_km: float = Query(20, gt=0, le=200),
    zone: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    niveau: Optional[List[str]] = Query(None),
    distance_min: Optional[float] = Query(None, ge=0),
    distance_max: Optional[float] = Query(None, ge=0),
    denivele_positif_min: Optional[int] = Query(None, ge=0),
    denivele_positif_max: Optional[int] = Query(None, ge=0),
    denivele_negatif_min: Optional[int] = Query(None, ge=0),
    denivele_negatif_max: Optional[int] = Query(None, ge=0),
    tags: Optional[List[str]] = Query(None),
    indice_difficulte_labels: Optional[List[str]] = Query(None),
    db: Session = Depends(get_db),
    utilisateur: str = Depends(get_current_username),
):
    reference = db.query(Parcours).filter(Parcours.id == parcours_id).first()
    if reference is None:
        raise HTTPException(status_code=404, detail="Parcours introuvable")
    if reference.latitude is None or reference.longitude is None:
        raise HTTPException(status_code=400, detail="Ce parcours n'a pas de coordonnées GPS")

    candidates = _filtered_parcours(
        db, zone, q, niveau, distance_min, distance_max,
        denivele_positif_min, denivele_positif_max,
        denivele_negatif_min, denivele_negatif_max,
        tags, None, indice_difficulte_labels,
    )

    favori_ids = {
        r[0] for r in db.query(Favori.parcours_id).filter(Favori.utilisateur == utilisateur).all()
    }
    realisations = {
        r.parcours_id: r.date_realisation
        for r in db.query(Realisation).filter(Realisation.utilisateur == utilisateur).all()
    }

    proches = []
    for p in candidates:
        if p.id == parcours_id or p.latitude is None or p.longitude is None:
            continue
        distance = haversine_km(reference.latitude, reference.longitude, p.latitude, p.longitude)
        if distance <= rayon_km:
            out = _to_parcours_out(p, favori_ids, realisations)
            out.distance_depuis_km = round(distance, 1)
            proches.append(out)

    proches.sort(key=lambda po: po.distance_depuis_km)
    return proches
