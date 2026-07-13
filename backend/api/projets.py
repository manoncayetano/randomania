from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from api.auth import get_current_username
from api.search import ElevationPointOut, ParcoursOut, _gpx_points_for, _gpx_profile_for, _to_parcours_out
from db.database import get_db
from db.models import Parcours, Projet, ProjetEtape
from generation.overlap import compute_overlap_aware_stats

router = APIRouter()


class ProjetIn(BaseModel):
    nom: str


class ProjetRenameIn(BaseModel):
    nom: str


class EtapeIn(BaseModel):
    parcours_id: int
    jour: Optional[int] = None
    notes: Optional[str] = None


class EtapeUpdateIn(BaseModel):
    jour: Optional[int] = None
    notes: Optional[str] = None
    ordre: Optional[int] = None


class EtapeParcoursOut(ParcoursOut):
    gpx_points: List[List[float]] = []
    gpx_profile: List[ElevationPointOut] = []


class EtapeOut(BaseModel):
    id: int
    ordre: int
    jour: Optional[int] = None
    notes: Optional[str] = None
    parcours: EtapeParcoursOut


def _etape_parcours_out(p: Parcours) -> EtapeParcoursOut:
    return EtapeParcoursOut(
        **_to_parcours_out(p).model_dump(),
        gpx_points=_gpx_points_for(p),
        gpx_profile=_gpx_profile_for(p),
    )


class ProjetSummaryOut(BaseModel):
    id: int
    nom: str
    utilisateur: str
    date_creation: Optional[str] = None
    nombre_etapes: int
    distance_totale_km: float
    denivele_positif_total: int


class ProjetDetailOut(BaseModel):
    id: int
    nom: str
    utilisateur: str
    date_creation: Optional[str] = None
    etapes: List[EtapeOut]


def _summarize(projet: Projet) -> ProjetSummaryOut:
    distance_totale = sum((e.parcours.distance_km or 0) for e in projet.etapes)
    denivele_total = sum((e.parcours.denivele_positif or 0) for e in projet.etapes)
    return ProjetSummaryOut(
        id=projet.id,
        nom=projet.nom,
        utilisateur=projet.utilisateur,
        date_creation=projet.date_creation,
        nombre_etapes=len(projet.etapes),
        distance_totale_km=round(distance_totale, 1),
        denivele_positif_total=round(denivele_total),
    )


@router.get("/projets", response_model=List[ProjetSummaryOut])
def list_projets(db: Session = Depends(get_db), utilisateur: str = Depends(get_current_username)):
    projets = db.query(Projet).filter(Projet.utilisateur == utilisateur).order_by(Projet.id.desc()).all()
    return [_summarize(p) for p in projets]


@router.post("/projets", status_code=201, response_model=ProjetSummaryOut)
def create_projet(body: ProjetIn, db: Session = Depends(get_db), utilisateur: str = Depends(get_current_username)):
    projet = Projet(nom=body.nom, utilisateur=utilisateur)
    db.add(projet)
    db.commit()
    db.refresh(projet)
    return _summarize(projet)


@router.get("/projets/{projet_id}", response_model=ProjetDetailOut)
def get_projet(projet_id: int, db: Session = Depends(get_db)):
    projet = db.query(Projet).filter(Projet.id == projet_id).first()
    if projet is None:
        raise HTTPException(status_code=404, detail="Projet introuvable")

    etapes = [
        EtapeOut(
            id=e.id,
            ordre=e.ordre,
            jour=e.jour,
            notes=e.notes,
            parcours=_etape_parcours_out(e.parcours),
        )
        for e in projet.etapes
    ]
    return ProjetDetailOut(
        id=projet.id,
        nom=projet.nom,
        utilisateur=projet.utilisateur,
        date_creation=projet.date_creation,
        etapes=etapes,
    )


class StatsChevauchementIn(BaseModel):
    etape_ids: List[int]


@router.post("/projets/{projet_id}/stats-chevauchement")
def stats_chevauchement(projet_id: int, body: StatsChevauchementIn, db: Session = Depends(get_db)):
    projet = db.query(Projet).filter(Projet.id == projet_id).first()
    if projet is None:
        raise HTTPException(status_code=404, detail="Projet introuvable")

    etape_ids = set(body.etape_ids)
    hikes = []
    for e in projet.etapes:
        if e.id not in etape_ids:
            continue
        p = e.parcours
        hikes.append({
            "id": e.id,
            "profile": _gpx_profile_for(p),
            "distance_km": p.distance_km,
            "denivele_positif": p.denivele_positif,
            "denivele_negatif": p.denivele_negatif,
            "duree_marche_min": p.duree_marche_min,
            "duree_marche_max": p.duree_marche_max,
        })
    return compute_overlap_aware_stats(hikes)


@router.put("/projets/{projet_id}", response_model=ProjetSummaryOut)
def rename_projet(projet_id: int, body: ProjetRenameIn, db: Session = Depends(get_db)):
    projet = db.query(Projet).filter(Projet.id == projet_id).first()
    if projet is None:
        raise HTTPException(status_code=404, detail="Projet introuvable")
    projet.nom = body.nom
    db.commit()
    return _summarize(projet)


@router.delete("/projets/{projet_id}")
def delete_projet(projet_id: int, db: Session = Depends(get_db)):
    projet = db.query(Projet).filter(Projet.id == projet_id).first()
    if projet is None:
        raise HTTPException(status_code=404, detail="Projet introuvable")
    db.delete(projet)
    db.commit()
    return {"status": "ok"}


@router.post("/projets/{projet_id}/etapes", status_code=201, response_model=EtapeOut)
def add_etape(projet_id: int, body: EtapeIn, db: Session = Depends(get_db)):
    projet = db.query(Projet).filter(Projet.id == projet_id).first()
    if projet is None:
        raise HTTPException(status_code=404, detail="Projet introuvable")

    parcours = db.query(Parcours).filter(Parcours.id == body.parcours_id).first()
    if parcours is None:
        raise HTTPException(status_code=404, detail="Parcours introuvable")

    max_ordre = max((e.ordre for e in projet.etapes), default=-1)
    etape = ProjetEtape(
        projet_id=projet_id,
        parcours_id=body.parcours_id,
        ordre=max_ordre + 1,
        jour=body.jour,
        notes=body.notes,
    )
    db.add(etape)
    db.commit()
    db.refresh(etape)
    return EtapeOut(id=etape.id, ordre=etape.ordre, jour=etape.jour, notes=etape.notes, parcours=_etape_parcours_out(parcours))


@router.put("/projets/{projet_id}/etapes/{etape_id}", response_model=EtapeOut)
def update_etape(projet_id: int, etape_id: int, body: EtapeUpdateIn, db: Session = Depends(get_db)):
    etape = (
        db.query(ProjetEtape)
        .filter(ProjetEtape.id == etape_id, ProjetEtape.projet_id == projet_id)
        .first()
    )
    if etape is None:
        raise HTTPException(status_code=404, detail="Étape introuvable")

    if body.jour is not None:
        etape.jour = body.jour
    if body.notes is not None:
        etape.notes = body.notes
    if body.ordre is not None:
        etape.ordre = body.ordre

    db.commit()
    db.refresh(etape)
    return EtapeOut(
        id=etape.id, ordre=etape.ordre, jour=etape.jour, notes=etape.notes,
        parcours=_etape_parcours_out(etape.parcours),
    )


@router.delete("/projets/{projet_id}/etapes/{etape_id}")
def remove_etape(projet_id: int, etape_id: int, db: Session = Depends(get_db)):
    etape = (
        db.query(ProjetEtape)
        .filter(ProjetEtape.id == etape_id, ProjetEtape.projet_id == projet_id)
        .first()
    )
    if etape is None:
        raise HTTPException(status_code=404, detail="Étape introuvable")
    db.delete(etape)
    db.commit()
    return {"status": "ok"}
