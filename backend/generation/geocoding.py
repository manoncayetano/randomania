import math
from typing import Optional, Tuple

import requests

USER_AGENT = "rando-app-personal/1.0 (usage personnel non commercial)"


def geocode(lieu: str) -> Optional[Tuple[float, float, str]]:
    """Géocode un nom de lieu via Nominatim (OpenStreetMap). Retourne (lat, lon, nom_affiche) ou None."""
    r = requests.get(
        "https://nominatim.openstreetmap.org/search",
        params={"q": lieu, "format": "json", "limit": 1},
        headers={"User-Agent": USER_AGENT},
        timeout=15,
    )
    r.raise_for_status()
    results = r.json()
    if not results:
        return None
    return float(results[0]["lat"]), float(results[0]["lon"]), results[0]["display_name"]


def bbox_from_center(lat: float, lon: float, rayon_km: float) -> tuple[float, float, float, float]:
    """Bbox approximative (min_lon, max_lon, min_lat, max_lat) autour d'un point, pour un rayon donné en km."""
    lat_delta = rayon_km / 111.32
    lon_delta = rayon_km / (111.32 * math.cos(math.radians(lat)))
    return (lon - lon_delta, lon + lon_delta, lat - lat_delta, lat + lat_delta)
