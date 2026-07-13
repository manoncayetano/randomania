import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db.database import get_db
from db.models import Parcours, Photo

router = APIRouter()

PHOTOS_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "photos"
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


class CoverIn(BaseModel):
    photo_id: int


@router.post("/parcours/{parcours_id}/photos", status_code=201)
async def upload_photo(parcours_id: int, file: UploadFile, db: Session = Depends(get_db)):
    parcours = db.query(Parcours).filter(Parcours.id == parcours_id).first()
    if parcours is None:
        raise HTTPException(status_code=404, detail="Parcours introuvable")

    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Format d'image non supporté (jpg, png, webp)")

    parcours_dir = PHOTOS_DIR / str(parcours_id)
    parcours_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4().hex}{ext}"
    dest = parcours_dir / filename

    content = await file.read()
    dest.write_bytes(content)

    photo = Photo(parcours_id=parcours_id, url_ou_chemin=f"/media/photos/{parcours_id}/{filename}")
    db.add(photo)
    db.commit()
    db.refresh(photo)

    if parcours.cover_photo_id is None:
        parcours.cover_photo_id = photo.id
        db.commit()

    return {"id": photo.id, "url": photo.url_ou_chemin}


@router.put("/parcours/{parcours_id}/cover")
def set_cover(parcours_id: int, body: CoverIn, db: Session = Depends(get_db)):
    parcours = db.query(Parcours).filter(Parcours.id == parcours_id).first()
    if parcours is None:
        raise HTTPException(status_code=404, detail="Parcours introuvable")

    photo = db.query(Photo).filter(Photo.id == body.photo_id, Photo.parcours_id == parcours_id).first()
    if photo is None:
        raise HTTPException(status_code=404, detail="Photo introuvable pour ce parcours")

    parcours.cover_photo_id = photo.id
    db.commit()
    return {"status": "ok"}


@router.delete("/photos/{photo_id}")
def delete_photo(photo_id: int, db: Session = Depends(get_db)):
    photo = db.query(Photo).filter(Photo.id == photo_id).first()
    if photo is None:
        raise HTTPException(status_code=404, detail="Photo introuvable")

    parcours = db.query(Parcours).filter(Parcours.id == photo.parcours_id).first()
    if parcours and parcours.cover_photo_id == photo.id:
        parcours.cover_photo_id = None

    if photo.url_ou_chemin.startswith("/media/photos/"):
        relative = photo.url_ou_chemin[len("/media/photos/"):]
        (PHOTOS_DIR / relative).unlink(missing_ok=True)

    db.delete(photo)
    db.commit()
    return {"status": "ok"}
