from typing import List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from scraping.visorando import import_from_url, run_by_location

router = APIRouter()

NIVEAUX_VALIDES = {"facile", "moyen", "difficile"}


class ImportIn(BaseModel):
    url: str


@router.post("/import")
def import_rando(body: ImportIn):
    if "visorando.com/randonnee-" not in body.url:
        raise HTTPException(status_code=400, detail="Seules les URLs de fiche Visorando sont supportées pour l'instant")

    try:
        parcours_id = import_from_url(body.url)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Échec de l'import : {exc}")

    return {"parcours_id": parcours_id}


class ImportZoneIn(BaseModel):
    lieu: str
    rayon_km: float
    niveaux: List[str] = ["facile", "moyen"]


@router.post("/import/zone")
def import_zone(body: ImportZoneIn):
    if not body.lieu.strip():
        raise HTTPException(status_code=400, detail="Le lieu est obligatoire")
    if body.rayon_km <= 0 or body.rayon_km > 200:
        raise HTTPException(status_code=400, detail="Le rayon doit être entre 1 et 200 km")
    niveaux = [n for n in body.niveaux if n in NIVEAUX_VALIDES]
    if not niveaux:
        raise HTTPException(status_code=400, detail="Au moins un niveau valide est requis")

    try:
        result = run_by_location(body.lieu.strip(), body.rayon_km, tuple(niveaux))
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Échec de l'import : {exc}")

    return result
