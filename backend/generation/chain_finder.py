from typing import List, Optional

from db.models import Parcours
from generation.geo import haversine_km

SEUIL_CHAINAGE_KM = 15.0
MAX_CANDIDATS_PAR_JOUR = 30
MAX_RESULTATS = 15


def _candidats_pour_jour(candidats: List[Parcours], duree_max_h: Optional[float], chainage_strict: bool):
    resultats = candidats
    if duree_max_h is not None:
        resultats = [
            p for p in resultats
            if p.duree_marche_max is None or p.duree_marche_max <= duree_max_h + 0.5
        ]
    if chainage_strict:
        resultats = [p for p in resultats if p.latitude is not None and p.longitude is not None]
    resultats = sorted(resultats, key=lambda p: p.id)
    return resultats[:MAX_CANDIDATS_PAR_JOUR]


def _chainable(precedent: Parcours, suivant: Parcours, chainage_strict: bool) -> bool:
    if chainage_strict:
        if precedent.latitude is None or suivant.latitude is None:
            return False
        distance = haversine_km(precedent.latitude, precedent.longitude, suivant.latitude, suivant.longitude)
        return distance <= SEUIL_CHAINAGE_KM
    if precedent.zone and suivant.zone:
        return precedent.zone == suivant.zone
    return True


def build_chains(candidats_par_jour: List[List[Parcours]], chainage_strict: bool) -> List[List[Parcours]]:
    resultats: List[List[Parcours]] = []

    def recurse(jour_idx: int, chaine: List[Parcours]):
        if len(resultats) >= MAX_RESULTATS:
            return
        if jour_idx == len(candidats_par_jour):
            resultats.append(list(chaine))
            return
        for p in candidats_par_jour[jour_idx]:
            if chaine and not _chainable(chaine[-1], p, chainage_strict):
                continue
            chaine.append(p)
            recurse(jour_idx + 1, chaine)
            chaine.pop()
            if len(resultats) >= MAX_RESULTATS:
                return

    recurse(0, [])
    return resultats
