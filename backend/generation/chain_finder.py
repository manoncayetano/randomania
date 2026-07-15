import statistics
from typing import List, Optional, Set

from db.models import Parcours
from generation.geo import haversine_km

SEUIL_CHAINAGE_KM = 15.0
MAX_CANDIDATS_PAR_JOUR = 30
MAX_CHAINES_BRUTES = 60
MAX_RESULTATS = 15


def _note_moyenne(p: Parcours) -> float:
    notes = [a.note for a in p.avis if a.note is not None]
    return statistics.mean(notes) if notes else 0


def _tags_du_parcours(p: Parcours) -> Set[str]:
    return {pt.tag.nom for pt in p.parcours_tags}


def _nb_tags_correspondants(p: Parcours, tags_souhaites: Optional[List[str]]) -> int:
    if not tags_souhaites:
        return 0
    return len(_tags_du_parcours(p) & set(tags_souhaites))


def _score_qualite(p: Parcours, tags_souhaites: Optional[List[str]]):
    """Priorise les randos qui correspondent aux envies décrites dans le texte, puis
    déjà favorites/bien notées par la famille, puis proches de la maison — plutôt
    qu'un simple ordre d'id arbitraire (peu pertinent)."""
    return (
        -_nb_tags_correspondants(p, tags_souhaites),
        -len(p.favoris),
        -_note_moyenne(p),
        p.temps_voiture_min if p.temps_voiture_min is not None else 9999,
        p.id,
    )


def raisons_pour(p: Parcours, tags_souhaites: Optional[List[str]] = None) -> List[str]:
    """Petites explications affichées avec chaque proposition, pour que le choix soit
    compréhensible plutôt qu'une boîte noire."""
    raisons = []
    tags_matches = _tags_du_parcours(p) & set(tags_souhaites or [])
    if tags_matches:
        raisons.append("Correspond à : " + ", ".join(sorted(tags_matches)))
    if len(p.favoris) > 0:
        raisons.append("Favorite")
    note = _note_moyenne(p)
    if note >= 4:
        raisons.append(f"Bien notée ({note:.1f}/5)")
    if p.temps_voiture_min is not None and p.temps_voiture_min <= 60:
        raisons.append(f"À {round(p.temps_voiture_min)} min de chez vous")
    return raisons


def _candidats_pour_jour(
    candidats: List[Parcours],
    duree_max_h: Optional[float],
    chainage_strict: bool,
    tags_souhaites: Optional[List[str]] = None,
):
    resultats = candidats
    if duree_max_h is not None:
        resultats = [
            p for p in resultats
            if p.duree_marche_max is None or p.duree_marche_max <= duree_max_h + 0.5
        ]
    if chainage_strict:
        resultats = [p for p in resultats if p.latitude is not None and p.longitude is not None]
    resultats = sorted(resultats, key=lambda p: _score_qualite(p, tags_souhaites))
    return resultats[:MAX_CANDIDATS_PAR_JOUR]


def _chainable(precedent: Parcours, suivant: Parcours, chainage_strict: bool) -> bool:
    if chainage_strict:
        if precedent.latitude is None or suivant.latitude is None:
            return False
        distance = haversine_km(precedent.latitude, precedent.longitude, suivant.latitude, suivant.longitude)
        return distance <= SEUIL_CHAINAGE_KM
    if precedent.zone and suivant.zone:
        a, b = precedent.zone.lower(), suivant.zone.lower()
        return a == b or a in b or b in a
    return True


def _construire_chaines_brutes(
    candidats_par_jour: List[List[Parcours]],
    chainage_strict: bool,
    combos_existantes: Optional[Set[frozenset]] = None,
) -> List[List[Parcours]]:
    resultats: List[List[Parcours]] = []
    combos_existantes = combos_existantes or set()

    def recurse(jour_idx: int, chaine: List[Parcours]):
        if len(resultats) >= MAX_CHAINES_BRUTES:
            return
        if jour_idx == len(candidats_par_jour):
            if frozenset(p.id for p in chaine) not in combos_existantes:
                resultats.append(list(chaine))
            return
        for p in candidats_par_jour[jour_idx]:
            if any(existante.id == p.id for existante in chaine):
                continue  # la même rando ne peut pas servir deux jours dans un même enchaînement
            if chaine and not _chainable(chaine[-1], p, chainage_strict):
                continue
            chaine.append(p)
            recurse(jour_idx + 1, chaine)
            chaine.pop()
            if len(resultats) >= MAX_CHAINES_BRUTES:
                return

    recurse(0, [])
    return resultats


def _selectionner_chaines_diversifiees(chaines_brutes: List[List[Parcours]]) -> List[List[Parcours]]:
    """Parmi toutes les combinaisons trouvées, choisit les MAX_RESULTATS qui réutilisent
    le moins possible les mêmes randos d'une proposition à l'autre, plutôt que de garder
    les premières trouvées (qui partagent souvent la même rando du jour 1)."""
    restantes = list(chaines_brutes)
    usage: dict = {}
    selection: List[List[Parcours]] = []

    while restantes and len(selection) < MAX_RESULTATS:
        restantes.sort(key=lambda chaine: sum(usage.get(p.id, 0) for p in chaine))
        meilleure = restantes.pop(0)
        selection.append(meilleure)
        for p in meilleure:
            usage[p.id] = usage.get(p.id, 0) + 1

    return selection


def build_chains(
    candidats_par_jour: List[List[Parcours]],
    chainage_strict: bool,
    combos_existantes: Optional[Set[frozenset]] = None,
) -> List[List[Parcours]]:
    chaines_brutes = _construire_chaines_brutes(candidats_par_jour, chainage_strict, combos_existantes)
    return _selectionner_chaines_diversifiees(chaines_brutes)
