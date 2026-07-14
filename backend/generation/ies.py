"""
Indice d'Effort Spécifique (IES) : coût énergétique réel d'une rando à partir de son GPX,
basé sur l'équation de coût de la marche de Minetti et al. (2002).
"""
from bisect import bisect_left, bisect_right

SEGMENT_LONGUEUR_M = 30
DEMI_FENETRE_LISSAGE_M = 25
PENTE_CLAMP = 0.45
JOULES_PAR_KCAL = 4184

TRANCHES_PENTE = [5, 10, 15, 20, 25, None]
TRANCHES_LABELS = ["< 5%", "5-10%", "10-15%", "15-20%", "20-25%", "> 25%"]

NB_SEGMENTS_RAIDES = 8


def _minetti_cout(pente: float) -> float:
    i = max(-PENTE_CLAMP, min(PENTE_CLAMP, pente))
    return (
        155.4 * i**5
        - 30.4 * i**4
        - 43.3 * i**3
        + 46.3 * i**2
        + 19.5 * i
        + 3.6
    )


def _lisser_altitude(profile: list) -> list:
    """Moyenne mobile centrée sur une fenêtre en distance (m), pas en nombre de points,
    pour être cohérent quelle que soit la densité de points GPS du fichier source."""
    distances_m = [p["distance_km"] * 1000 for p in profile]
    elevations = [p["elevation"] for p in profile]
    n = len(profile)
    lissees = []
    for i in range(n):
        borne_min = distances_m[i] - DEMI_FENETRE_LISSAGE_M
        borne_max = distances_m[i] + DEMI_FENETRE_LISSAGE_M
        debut = bisect_left(distances_m, borne_min)
        fin = bisect_right(distances_m, borne_max)
        fenetre = elevations[debut:fin]
        lissees.append(sum(fenetre) / len(fenetre))
    return lissees


def compute_effort(profile: list) -> dict | None:
    """profile : liste de {distance_km, elevation, lat, lon}, triée par distance croissante
    (format retourné par generation.gpx.parse_gpx)."""
    valides = [p for p in profile if p.get("elevation") is not None]
    if len(valides) < 2:
        return None

    altitudes = _lisser_altitude(valides)
    distances_m = [p["distance_km"] * 1000 for p in valides]
    n = len(valides)

    denivele_positif = 0.0
    denivele_negatif = 0.0
    for i in range(1, n):
        delta = altitudes[i] - altitudes[i - 1]
        if delta > 0:
            denivele_positif += delta
        else:
            denivele_negatif += -delta

    segments = []
    debut_idx = 0
    for i in range(1, n):
        d = distances_m[i] - distances_m[debut_idx]
        if d >= SEGMENT_LONGUEUR_M or i == n - 1:
            if d > 0:
                denivele_segment = altitudes[i] - altitudes[debut_idx]
                pente = denivele_segment / d
                cout = _minetti_cout(pente)
                segments.append({
                    "debut_km": distances_m[debut_idx] / 1000,
                    "fin_km": distances_m[i] / 1000,
                    "distance_m": d,
                    "pente": pente,
                    "energie_j_par_kg": cout * d,
                })
            debut_idx = i

    if not segments:
        return None

    distance_totale_m = distances_m[-1]
    energie_totale_j = sum(s["energie_j_par_kg"] for s in segments)
    ies_kcal_kg = energie_totale_j / JOULES_PAR_KCAL

    repartition = []
    borne_precedente = 0
    for seuil, label in zip(TRANCHES_PENTE, TRANCHES_LABELS):
        borne = seuil if seuil is not None else float("inf")
        seg_tranche = [s for s in segments if borne_precedente <= abs(s["pente"]) * 100 < borne]
        dist_tranche = sum(s["distance_m"] for s in seg_tranche)
        energie_tranche = sum(s["energie_j_par_kg"] for s in seg_tranche)
        repartition.append({
            "label": label,
            "pct_distance": round(dist_tranche / distance_totale_m * 100, 1) if distance_totale_m > 0 else 0,
            "pct_energie": round(energie_tranche / energie_totale_j * 100, 1) if energie_totale_j > 0 else 0,
        })
        borne_precedente = borne

    segments_raides = sorted(segments, key=lambda s: abs(s["pente"]), reverse=True)[:NB_SEGMENTS_RAIDES]

    return {
        "distance_km": round(distance_totale_m / 1000, 2),
        "denivele_positif": round(denivele_positif),
        "denivele_negatif": round(denivele_negatif),
        "ies_kcal_kg": round(ies_kcal_kg, 2),
        "repartition": repartition,
        "segments_raides": [
            {
                "debut_km": round(s["debut_km"], 2),
                "fin_km": round(s["fin_km"], 2),
                "longueur_m": round(s["distance_m"]),
                "pente_pct": round(s["pente"] * 100, 1),
            }
            for s in segments_raides
        ],
    }
