import math
from typing import List, Optional, TypedDict

TOLERANCE_M_DEFAUT = 30.0
CELL_DEG = 0.0004  # ~44 m en latitude — juste un bucket pour réduire les comparaisons, pas la tolérance elle-même


class ProfilPoint(TypedDict, total=False):
    lat: float
    lon: float
    elevation: Optional[float]


class HikeIn(TypedDict, total=False):
    id: int
    profile: List[ProfilPoint]
    distance_km: Optional[float]
    denivele_positif: Optional[int]
    denivele_negatif: Optional[int]
    duree_marche_min: Optional[float]
    duree_marche_max: Optional[float]


def _haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371000.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def _cell_key(lat: float, lon: float):
    return (round(lat / CELL_DEG), round(lon / CELL_DEG))


def _add_to_index(index: dict, lat: float, lon: float):
    index.setdefault(_cell_key(lat, lon), []).append((lat, lon))


def _is_covered(index: dict, lat: float, lon: float, tolerance_m: float) -> bool:
    cy, cx = round(lat / CELL_DEG), round(lon / CELL_DEG)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            for plat, plon in index.get((cy + dy, cx + dx), []):
                if _haversine_m(lat, lon, plat, plon) <= tolerance_m:
                    return True
    return False


def compute_overlap_aware_stats(hikes: List[HikeIn], tolerance_m: float = TOLERANCE_M_DEFAUT) -> dict:
    """Additionne distance/dénivelé/durée sur une liste de randos (dans l'ordre des étapes du
    projet) en ne comptant qu'une seule fois les tronçons de tracé GPX partagés entre plusieurs
    randos (ex : même sentier d'approche). Le tronçon commun est attribué à la première rando
    de la séquence qui l'emprunte. Les randos sans GPX détaillé sont comptées telles quelles
    (impossible de détecter un chevauchement sans tracé)."""
    index: dict = {}
    total_distance_km = 0.0
    total_denivele_pos = 0.0
    total_denivele_neg = 0.0
    total_duree_min = 0.0
    total_duree_max = 0.0
    chevauchement_km_total = 0.0
    details = []

    for hike in hikes:
        profile = hike.get("profile") or []
        distance_declaree = hike.get("distance_km") or 0.0
        duree_min = hike.get("duree_marche_min") or 0.0
        duree_max = hike.get("duree_marche_max") or 0.0

        if len(profile) < 2:
            total_distance_km += distance_declaree
            total_denivele_pos += hike.get("denivele_positif") or 0
            total_denivele_neg += hike.get("denivele_negatif") or 0
            total_duree_min += duree_min
            total_duree_max += duree_max
            details.append({"etape_id": hike["id"], "chevauchement_km": 0.0, "chevauchement_pct": 0.0})
            continue

        distance_couverte_m = 0.0
        distance_non_couverte_m = 0.0
        denivele_pos_non_couvert = 0.0
        denivele_neg_non_couvert = 0.0

        # On ne compare qu'à l'index des randos PRÉCÉDENTES : sinon un aller-retour sur le
        # même sentier se "chevaucherait" avec lui-même (faux positif).
        for i in range(len(profile) - 1):
            p1, p2 = profile[i], profile[i + 1]
            mid_lat = (p1["lat"] + p2["lat"]) / 2
            mid_lon = (p1["lon"] + p2["lon"]) / 2
            seg_len_m = _haversine_m(p1["lat"], p1["lon"], p2["lat"], p2["lon"])

            if _is_covered(index, mid_lat, mid_lon, tolerance_m):
                distance_couverte_m += seg_len_m
            else:
                distance_non_couverte_m += seg_len_m
                if p1.get("elevation") is not None and p2.get("elevation") is not None:
                    delta = p2["elevation"] - p1["elevation"]
                    if delta > 0:
                        denivele_pos_non_couvert += delta
                    else:
                        denivele_neg_non_couvert += -delta

        for point in profile:
            _add_to_index(index, point["lat"], point["lon"])

        gpx_total_m = distance_couverte_m + distance_non_couverte_m
        ratio_non_couvert = (distance_non_couverte_m / gpx_total_m) if gpx_total_m > 0 else 1.0

        total_distance_km += distance_declaree * ratio_non_couvert
        total_denivele_pos += denivele_pos_non_couvert
        total_denivele_neg += denivele_neg_non_couvert
        total_duree_min += duree_min * ratio_non_couvert
        total_duree_max += duree_max * ratio_non_couvert

        chevauchement_km = distance_couverte_m / 1000
        chevauchement_km_total += chevauchement_km
        details.append({
            "etape_id": hike["id"],
            "chevauchement_km": round(chevauchement_km, 2),
            "chevauchement_pct": round((1 - ratio_non_couvert) * 100, 1),
        })

    return {
        "distance_km": round(total_distance_km, 2),
        "denivele_positif": round(total_denivele_pos),
        "denivele_negatif": round(total_denivele_neg),
        "duree_marche_min": round(total_duree_min, 2),
        "duree_marche_max": round(total_duree_max, 2),
        "chevauchement_km_total": round(chevauchement_km_total, 2),
        "details": details,
    }
