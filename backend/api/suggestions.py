from typing import List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from api.search import ParcoursOut, _filtered_parcours, _to_parcours_out
from db.database import get_db
from generation.chain_finder import _candidats_pour_jour, build_chains
from generation.prompt_parser import parse_prompt

router = APIRouter()


class SuggestionIn(BaseModel):
    prompt: str
    chainage_strict: Optional[bool] = None


class JourCritereOut(BaseModel):
    duree_max_h: Optional[float] = None
    niveau: Optional[List[str]] = None


class InterpretationOut(BaseModel):
    nombre_jours: int
    jours: List[JourCritereOut]
    chainage_strict: bool


class ChaineOut(BaseModel):
    etapes: List[ParcoursOut]
    distance_totale_km: float
    denivele_positif_total: int


class SuggestionOut(BaseModel):
    interpretation: InterpretationOut
    chaines: List[ChaineOut]


@router.post("/suggestions/enchainement", response_model=SuggestionOut)
def suggerer_enchainement(body: SuggestionIn, db: Session = Depends(get_db)):
    analyse = parse_prompt(body.prompt)
    chainage_strict = body.chainage_strict if body.chainage_strict is not None else analyse["chainage_strict_suggere"]

    candidats_par_jour = []
    for critere in analyse["jours"]:
        candidats = _filtered_parcours(
            db, zone=None, q=None, niveau=critere["niveau"],
            distance_min=None, distance_max=None,
            denivele_positif_min=None, denivele_positif_max=None,
            denivele_negatif_min=None, denivele_negatif_max=None,
            tags=None, favoris_de=None,
        )
        candidats_par_jour.append(_candidats_pour_jour(candidats, critere["duree_max_h"], chainage_strict))

    chaines_parcours = build_chains(candidats_par_jour, chainage_strict)

    chaines_out = []
    for chaine in chaines_parcours:
        etapes = [_to_parcours_out(p) for p in chaine]
        distance_totale = round(sum((p.distance_km or 0) for p in chaine), 1)
        denivele_total = round(sum((p.denivele_positif or 0) for p in chaine))
        chaines_out.append(ChaineOut(etapes=etapes, distance_totale_km=distance_totale, denivele_positif_total=denivele_total))

    return SuggestionOut(
        interpretation=InterpretationOut(
            nombre_jours=analyse["nombre_jours"],
            jours=[JourCritereOut(**j) for j in analyse["jours"]],
            chainage_strict=chainage_strict,
        ),
        chaines=chaines_out,
    )
