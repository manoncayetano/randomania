import io
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy.orm import Session

import storage
from db.database import get_db
from db.models import Parcours
from generation.gpx import parse_gpx, parse_gpx_points
from generation.ies import compute_effort

router = APIRouter()


@router.post("/parcours/{parcours_id}/gpx", status_code=201)
async def upload_gpx(parcours_id: int, file: UploadFile, db: Session = Depends(get_db)):
    parcours = db.query(Parcours).filter(Parcours.id == parcours_id).first()
    if parcours is None:
        raise HTTPException(status_code=404, detail="Parcours introuvable")

    if not (file.filename or "").lower().endswith(".gpx"):
        raise HTTPException(status_code=400, detail="Le fichier doit être au format .gpx")

    content = await file.read()

    try:
        points = parse_gpx_points(io.BytesIO(content))
    except Exception:
        raise HTTPException(status_code=400, detail="Fichier GPX invalide ou illisible")

    if not points:
        raise HTTPException(status_code=400, detail="Aucun tracé trouvé dans ce fichier GPX")

    try:
        effort = compute_effort(parse_gpx(io.BytesIO(content))["profile"])
    except Exception:
        effort = None

    filename = f"{uuid.uuid4().hex}.gpx"
    old_path = parcours.gpx_path
    dossier = f"gpx/{parcours_id}"
    url = storage.save_file(dossier, filename, content, storage.guess_content_type(".gpx"))

    parcours.gpx_path = url
    parcours.ies_kcal_kg = effort["ies_kcal_kg"] if effort else None
    db.commit()

    storage.delete_file(old_path, dossier)

    return {"gpx_path": parcours.gpx_path, "points": len(points)}


@router.delete("/parcours/{parcours_id}/gpx")
def delete_gpx(parcours_id: int, db: Session = Depends(get_db)):
    parcours = db.query(Parcours).filter(Parcours.id == parcours_id).first()
    if parcours is None:
        raise HTTPException(status_code=404, detail="Parcours introuvable")

    storage.delete_file(parcours.gpx_path, f"gpx/{parcours_id}")

    parcours.gpx_path = None
    parcours.ies_kcal_kg = None
    db.commit()
    return {"status": "ok"}


@router.get("/parcours/{parcours_id}/effort")
def get_effort(parcours_id: int, db: Session = Depends(get_db)):
    parcours = db.query(Parcours).filter(Parcours.id == parcours_id).first()
    if parcours is None:
        raise HTTPException(status_code=404, detail="Parcours introuvable")
    if not parcours.gpx_path:
        raise HTTPException(status_code=400, detail="Ce parcours n'a pas de GPX")

    try:
        content = storage.read_file(parcours.gpx_path, f"gpx/{parcours_id}")
        profile = parse_gpx(io.BytesIO(content))["profile"]
    except Exception:
        raise HTTPException(status_code=400, detail="Fichier GPX illisible")

    effort = compute_effort(profile)
    if effort is None:
        raise HTTPException(status_code=400, detail="Pas assez de points avec altitude dans ce GPX")
    return effort
