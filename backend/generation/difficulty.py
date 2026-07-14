LABELS = [
    (25, "Facile"),
    (45, "Modéré"),
    (60, "Assez difficile"),
    (80, "Difficile"),
    (100, "Très difficile"),
]

# Coefficient de mise à l'échelle de l'IES (kcal/kg, cf generation/ies.py) vers l'indice 1-100.
# Calibré sur les randos déjà en base avec GPX : ~20 kcal/kg (grosse journée alpine, 1500m+ de D+/D-
# sur ~20km) correspond au haut de l'échelle (indice 100).
IES_COEFFICIENT = 5


def label_for(indice: int) -> str:
    for seuil, label in LABELS:
        if indice <= seuil:
            return label
    return LABELS[-1][1]


def compute_indice_difficulte(distance_km: float, denivele_positif: float, ies_kcal_kg: float = None) -> dict:
    if ies_kcal_kg is not None:
        indice = max(1, min(100, round(ies_kcal_kg * IES_COEFFICIENT)))
        return {"indice": indice, "label": label_for(indice)}

    if not distance_km or distance_km <= 0:
        return {"indice": None, "label": None}

    # Effort ~ distance + 1km-equivalent par 100m de D+ (règle classique de rando),
    # combiné à parts égales avec la pente moyenne (%) pour ne pas sous-estimer
    # les randos courtes mais très raides. Coefficients calibrés sur les randos
    # déjà classées facile/moyen/difficile dans la base (médianes ~7/15/30 en
    # effort_km, ~3.7/5.6/6.8% en pente).
    effort_km = distance_km + (denivele_positif or 0) / 100
    pente_pct = (denivele_positif or 0) / (distance_km * 1000) * 100

    indice_effort = effort_km * 2.7
    indice_pente = pente_pct * 9
    indice = round(0.5 * indice_effort + 0.5 * indice_pente)
    indice = max(1, min(100, indice))

    return {"indice": indice, "label": label_for(indice)}
