from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from api.auth import get_current_username
from db.database import get_db
from db.models import Parcours, Realisation

router = APIRouter()


class RealisationIn(BaseModel):
    date_realisation: Optional[str] = None


@router.post("/parcours/{parcours_id}/realisations", status_code=201)
def add_realisation(
    parcours_id: int,
    body: RealisationIn,
    db: Session = Depends(get_db),
    utilisateur: str = Depends(get_current_username),
):
    parcours = db.query(Parcours).filter(Parcours.id == parcours_id).first()
    if parcours is None:
        raise HTTPException(status_code=404, detail="Parcours introuvable")

    existing = (
        db.query(Realisation)
        .filter(Realisation.parcours_id == parcours_id, Realisation.utilisateur == utilisateur)
        .first()
    )
    if existing is None:
        db.add(Realisation(
            parcours_id=parcours_id,
            utilisateur=utilisateur,
            date_realisation=body.date_realisation,
        ))
        db.commit()
    elif body.date_realisation:
        existing.date_realisation = body.date_realisation
        db.commit()
    return {"status": "ok"}


@router.delete("/parcours/{parcours_id}/realisations")
def remove_realisation(
    parcours_id: int,
    db: Session = Depends(get_db),
    utilisateur: str = Depends(get_current_username),
):
    db.query(Realisation).filter(
        Realisation.parcours_id == parcours_id, Realisation.utilisateur == utilisateur
    ).delete()
    db.commit()
    return {"status": "ok"}
