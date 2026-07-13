import time
from typing import List, Optional

from fastapi import APIRouter, Query
from pydantic import BaseModel

from generation.difficulty import compute_indice_difficulte
from generation.routing import route_geometry

router = APIRouter()


@router.get("/outils/indice-difficulte")
def indice_difficulte(distance_km: float = Query(..., gt=0), denivele_positif: float = Query(..., ge=0)):
    return compute_indice_difficulte(distance_km, denivele_positif)


class SegmentIn(BaseModel):
    start: List[float]
    end: List[float]


class LiaisonsIn(BaseModel):
    segments: List[SegmentIn]


@router.post("/outils/liaisons-itineraire")
def liaisons_itineraire(body: LiaisonsIn):
    """Calcule, pour chaque paire de points (fin d'une rando / début de la suivante), un itinéraire
    routier réel (OSRM) au lieu d'un simple trait droit. Retourne None pour un segment si le routage échoue :
    le frontend retombe alors sur une ligne droite entre les deux points."""
    resultats: List[Optional[List[List[float]]]] = []
    for i, seg in enumerate(body.segments):
        if i > 0:
            time.sleep(0.3)
        geo = route_geometry(seg.start[0], seg.start[1], seg.end[0], seg.end[1])
        resultats.append(geo)
    return {"segments": resultats}
