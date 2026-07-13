from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from api.auth import get_current_username
from db.database import get_db
from db.models import Favori, Parcours

router = APIRouter()


@router.post("/parcours/{parcours_id}/favoris", status_code=201)
def add_favori(
    parcours_id: int,
    db: Session = Depends(get_db),
    utilisateur: str = Depends(get_current_username),
):
    parcours = db.query(Parcours).filter(Parcours.id == parcours_id).first()
    if parcours is None:
        raise HTTPException(status_code=404, detail="Parcours introuvable")

    existing = (
        db.query(Favori)
        .filter(Favori.parcours_id == parcours_id, Favori.utilisateur == utilisateur)
        .first()
    )
    if existing is None:
        db.add(Favori(parcours_id=parcours_id, utilisateur=utilisateur))
        db.commit()
    return {"status": "ok"}


@router.delete("/parcours/{parcours_id}/favoris")
def remove_favori(
    parcours_id: int,
    db: Session = Depends(get_db),
    utilisateur: str = Depends(get_current_username),
):
    db.query(Favori).filter(
        Favori.parcours_id == parcours_id, Favori.utilisateur == utilisateur
    ).delete()
    db.commit()
    return {"status": "ok"}
