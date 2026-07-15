import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

import storage
from api.auth import get_current_username
from db.database import get_db
from db.models import Amelioration

router = APIRouter()

STATUTS_VALIDES = {"nouveau", "en_cours", "termine"}
EXTENSIONS_AUTORISEES = {".jpg", ".jpeg", ".png", ".webp"}


class AmeliorationIn(BaseModel):
    titre: str
    description: Optional[str] = None


class AmeliorationUpdateIn(BaseModel):
    titre: Optional[str] = None
    description: Optional[str] = None
    statut: Optional[str] = None


class AmeliorationOut(BaseModel):
    id: int
    titre: str
    description: Optional[str] = None
    statut: str
    demandeur: str
    image_path: Optional[str] = None
    date_creation: Optional[str] = None
    date_maj: Optional[str] = None

    class Config:
        from_attributes = True


@router.get("/ameliorations", response_model=List[AmeliorationOut])
def list_ameliorations(
    statuts: Optional[List[str]] = Query(None),
    demandeurs: Optional[List[str]] = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(Amelioration)
    if statuts:
        query = query.filter(Amelioration.statut.in_(statuts))
    else:
        query = query.filter(Amelioration.statut != "termine")
    if demandeurs:
        query = query.filter(Amelioration.demandeur.in_(demandeurs))
    return query.order_by(Amelioration.date_creation.desc()).all()


@router.get("/ameliorations/demandeurs", response_model=List[str])
def list_demandeurs(db: Session = Depends(get_db)):
    rows = db.query(Amelioration.demandeur).distinct().order_by(Amelioration.demandeur).all()
    return [r[0] for r in rows]


@router.post("/ameliorations", status_code=201, response_model=AmeliorationOut)
def create_amelioration(
    body: AmeliorationIn,
    db: Session = Depends(get_db),
    utilisateur: str = Depends(get_current_username),
):
    if not body.titre.strip():
        raise HTTPException(status_code=400, detail="Le titre ne peut pas être vide")
    amelioration = Amelioration(
        titre=body.titre.strip(),
        description=body.description,
        statut="nouveau",
        demandeur=utilisateur,
    )
    db.add(amelioration)
    db.commit()
    db.refresh(amelioration)
    return amelioration


@router.put("/ameliorations/{amelioration_id}", response_model=AmeliorationOut)
def update_amelioration(amelioration_id: int, body: AmeliorationUpdateIn, db: Session = Depends(get_db)):
    amelioration = db.query(Amelioration).filter(Amelioration.id == amelioration_id).first()
    if amelioration is None:
        raise HTTPException(status_code=404, detail="Demande introuvable")

    updates = body.model_dump(exclude_unset=True)
    if "statut" in updates and updates["statut"] not in STATUTS_VALIDES:
        raise HTTPException(status_code=400, detail="Statut invalide (nouveau, en_cours, termine)")
    if "titre" in updates and not (updates["titre"] or "").strip():
        raise HTTPException(status_code=400, detail="Le titre ne peut pas être vide")

    for field, value in updates.items():
        setattr(amelioration, field, value)
    amelioration.date_maj = datetime.now(timezone.utc).isoformat()
    db.commit()
    db.refresh(amelioration)
    return amelioration


@router.delete("/ameliorations/{amelioration_id}")
def delete_amelioration(amelioration_id: int, db: Session = Depends(get_db)):
    amelioration = db.query(Amelioration).filter(Amelioration.id == amelioration_id).first()
    if amelioration is None:
        raise HTTPException(status_code=404, detail="Demande introuvable")
    storage.delete_file(amelioration.image_path, f"ameliorations/{amelioration_id}")
    db.delete(amelioration)
    db.commit()
    return {"status": "ok"}


@router.post("/ameliorations/{amelioration_id}/image", response_model=AmeliorationOut)
async def upload_image(amelioration_id: int, file: UploadFile, db: Session = Depends(get_db)):
    amelioration = db.query(Amelioration).filter(Amelioration.id == amelioration_id).first()
    if amelioration is None:
        raise HTTPException(status_code=404, detail="Demande introuvable")

    ext = Path(file.filename or "").suffix.lower()
    if ext not in EXTENSIONS_AUTORISEES:
        raise HTTPException(status_code=400, detail="Format d'image non supporté (jpg, png, webp)")

    dossier = f"ameliorations/{amelioration_id}"
    filename = f"{uuid.uuid4().hex}{ext}"
    contenu = await file.read()
    url = storage.save_file(dossier, filename, contenu, storage.guess_content_type(ext))

    storage.delete_file(amelioration.image_path, dossier)

    amelioration.image_path = url
    amelioration.date_maj = datetime.now(timezone.utc).isoformat()
    db.commit()
    db.refresh(amelioration)
    return amelioration


@router.delete("/ameliorations/{amelioration_id}/image", response_model=AmeliorationOut)
def delete_image(amelioration_id: int, db: Session = Depends(get_db)):
    amelioration = db.query(Amelioration).filter(Amelioration.id == amelioration_id).first()
    if amelioration is None:
        raise HTTPException(status_code=404, detail="Demande introuvable")

    storage.delete_file(amelioration.image_path, f"ameliorations/{amelioration_id}")

    amelioration.image_path = None
    amelioration.date_maj = datetime.now(timezone.utc).isoformat()
    db.commit()
    db.refresh(amelioration)
    return amelioration
