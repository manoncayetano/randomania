import re

NIVEAU_KEYWORDS = {
    "facile": "facile",
    "moyen": "moyen",
    "moyenne": "moyen",
    "moyennes": "moyen",
    "difficile": "difficile",
    "difficiles": "difficile",
}

JOUR_SUIVANT_KEYWORDS = ["l'autre", "le lendemain", "jour suivant", "ensuite", "puis le", "puis la"]

DUREE_PATTERN = re.compile(r"(\d+)\s*h(?:eures?)?\s*(\d{0,2})")
JOUR_EXPLICITE_PATTERN = re.compile(r"jour\s*(\d+)", re.IGNORECASE)
NOMBRE_JOURS_PATTERN = re.compile(r"(\d+)\s*jours?", re.IGNORECASE)
BIVOUAC_PATTERN = re.compile(r"bivou[ae]?[ck]", re.IGNORECASE)


def _extract_niveau(clause: str):
    lowered = clause.lower()
    trouves = []
    for mot, niveau in NIVEAU_KEYWORDS.items():
        if re.search(rf"\b{mot}\b", lowered) and niveau not in trouves:
            trouves.append(niveau)
    return trouves or None


def _extract_duree_h(clause: str):
    match = DUREE_PATTERN.search(clause)
    if not match:
        return None
    heures = int(match.group(1))
    minutes = int(match.group(2)) if match.group(2) else 0
    return round(heures + minutes / 60, 2)


def parse_prompt(texte: str) -> dict:
    """Analyse une description libre d'un enchaînement de randos (mots-clés simples, sans IA externe)."""
    nb_jours_match = NOMBRE_JOURS_PATTERN.search(texte)
    nombre_jours = int(nb_jours_match.group(1)) if nb_jours_match else None

    bivouac_detecte = bool(BIVOUAC_PATTERN.search(texte))

    clauses = re.split(r"[.,]| et | puis ", texte)
    jours: list[dict] = []
    jour_courant = 0  # index 0-based

    for clause in clauses:
        if not clause.strip():
            continue

        explicite = JOUR_EXPLICITE_PATTERN.search(clause)
        if explicite:
            jour_courant = int(explicite.group(1)) - 1
        elif any(mot in clause.lower() for mot in JOUR_SUIVANT_KEYWORDS):
            jour_courant += 1

        while len(jours) <= jour_courant:
            jours.append({"duree_max_h": None, "niveau": None})

        niveau = _extract_niveau(clause)
        if niveau:
            existants = jours[jour_courant]["niveau"] or []
            jours[jour_courant]["niveau"] = list(dict.fromkeys(existants + niveau))

        duree = _extract_duree_h(clause)
        if duree is not None:
            jours[jour_courant]["duree_max_h"] = duree

    if nombre_jours:
        while len(jours) < nombre_jours:
            jours.append({"duree_max_h": None, "niveau": None})
        jours = jours[:nombre_jours]

    if not jours:
        jours = [{"duree_max_h": None, "niveau": None}]

    return {
        "nombre_jours": len(jours),
        "jours": jours,
        "chainage_strict_suggere": bivouac_detecte,
    }
