import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy.orm import Session

from db.database import DATA_DIR, get_db
from db.models import Parcours
from generation.gpx import parse_gpx_points

router = APIRouter()

GPX_DIR = DATA_DIR / "gpx"


@router.post("/parcours/{parcours_id}/gpx", status_code=201)
async def upload_gpx(parcours_id: int, file: UploadFile, db: Session = Depends(get_db)):
    parcours = db.query(Parcours).filter(Parcours.id == parcours_id).first()
    if parcours is None:
        raise HTTPException(status_code=404, detail="Parcours introuvable")

    if not (file.filename or "").lower().endswith(".gpx"):
        raise HTTPException(status_code=400, detail="Le fichier doit être au format .gpx")

    parcours_dir = GPX_DIR / str(parcours_id)
    parcours_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4().hex}.gpx"
    dest = parcours_dir / filename

    content = await file.read()
    dest.write_bytes(content)

    try:
        points = parse_gpx_points(dest)
    except Exception:
        dest.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail="Fichier GPX invalide ou illisible")

    if not points:
        dest.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail="Aucun tracé trouvé dans ce fichier GPX")

    old_path = parcours.gpx_path
    parcours.gpx_path = f"/media/gpx/{parcours_id}/{filename}"
    db.commit()

    if old_path and old_path.startswith("/media/gpx/"):
        (GPX_DIR / old_path[len("/media/gpx/"):]).unlink(missing_ok=True)

    return {"gpx_path": parcours.gpx_path, "points": len(points)}


@router.delete("/parcours/{parcours_id}/gpx")
def delete_gpx(parcours_id: int, db: Session = Depends(get_db)):
    parcours = db.query(Parcours).filter(Parcours.id == parcours_id).first()
    if parcours is None:
        raise HTTPException(status_code=404, detail="Parcours introuvable")

    if parcours.gpx_path and parcours.gpx_path.startswith("/media/gpx/"):
        (GPX_DIR / parcours.gpx_path[len("/media/gpx/"):]).unlink(missing_ok=True)

    parcours.gpx_path = None
    db.commit()
    return {"status": "ok"}
