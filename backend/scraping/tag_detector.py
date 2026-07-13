TAG_KEYWORDS = {
    "forêt": ["forêt", "forestier", "bois", "sapin", "mélèze"],
    "cours d'eau": ["torrent", "rivière", "ruisseau", "gave"],
    "lac": ["lac ", "lacs ", " lac", "étang"],
    "cascade": ["cascade", "chute d'eau"],
    "faune": ["marmotte", "chamois", "bouquetin", "faune", "edelweiss", "vautour", "isard", "mouflon"],
    "point de vue": ["panorama", "point de vue", "vue sur", "belvédère"],
    "sommet": ["sommet", "pic ", "aiguille", "crête", "ascension"],
    "glacier": ["glacier", "névé", "moraine"],
    "refuge": ["refuge", "cabane"],
    "col": ["col de", "col du", "col des"],
    "village": ["village", "hameau"],
    "patrimoine": ["chapelle", "église", "patrimoine", "ruines", "moulin", "four à pain", "oratoire"],
    "neige": ["neige", "raquette", "enneigé"],
}


def detect_tags(text: str) -> list[str]:
    if not text:
        return []
    lowered = text.lower()
    return [tag for tag, keywords in TAG_KEYWORDS.items() if any(kw in lowered for kw in keywords)]
