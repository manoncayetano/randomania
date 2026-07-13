from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from scraping.visorando import import_from_url

router = APIRouter()


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
