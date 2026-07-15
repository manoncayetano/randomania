import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

import storage
from db.database import get_db
from db.models import Parcours, Photo

router = APIRouter()

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

    filename = f"{uuid.uuid4().hex}{ext}"
    content = await file.read()
    url = storage.save_file(f"photos/{parcours_id}", filename, content, storage.guess_content_type(ext))

    photo = Photo(parcours_id=parcours_id, url_ou_chemin=url)
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

    storage.delete_file(photo.url_ou_chemin, f"photos/{photo.parcours_id}")

    db.delete(photo)
    db.commit()
    return {"status": "ok"}
