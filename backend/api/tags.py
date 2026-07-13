from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db.database import get_db
from db.models import Parcours, ParcoursTag, Tag

router = APIRouter()


class TagIn(BaseModel):
    tag: str


@router.get("/tags", response_model=List[str])
def list_tags(db: Session = Depends(get_db)):
    tags = db.query(Tag).order_by(Tag.nom).all()
    return [t.nom for t in tags]


@router.post("/parcours/{parcours_id}/tags", status_code=201)
def add_tag(parcours_id: int, body: TagIn, db: Session = Depends(get_db)):
    parcours = db.query(Parcours).filter(Parcours.id == parcours_id).first()
    if parcours is None:
        raise HTTPException(status_code=404, detail="Parcours introuvable")

    nom = body.tag.strip().lower()
    if not nom:
        raise HTTPException(status_code=400, detail="Nom de tag vide")

    tag = db.query(Tag).filter(Tag.nom == nom).first()
    if tag is None:
        tag = Tag(nom=nom)
        db.add(tag)
        db.flush()

    existing = (
        db.query(ParcoursTag)
        .filter(ParcoursTag.parcours_id == parcours_id, ParcoursTag.tag_id == tag.id)
        .first()
    )
    if existing is None:
        db.add(ParcoursTag(parcours_id=parcours_id, tag_id=tag.id, source="manuel"))
        db.commit()

    return {"status": "ok"}


@router.delete("/parcours/{parcours_id}/tags/{tag_nom}")
def remove_tag(parcours_id: int, tag_nom: str, db: Session = Depends(get_db)):
    tag = db.query(Tag).filter(Tag.nom == tag_nom).first()
    if tag is not None:
        db.query(ParcoursTag).filter(
            ParcoursTag.parcours_id == parcours_id, ParcoursTag.tag_id == tag.id
        ).delete()
        db.commit()
    return {"status": "ok"}
