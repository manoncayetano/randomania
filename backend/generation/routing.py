import requests

USER_AGENT = "Mozilla/5.0 (compatible; rando-app-personal/1.0; usage personnel non commercial)"

# Sénas (13560) — géocodé une fois via Nominatim, sert de point de référence
# pour le calcul du temps de trajet en voiture jusqu'à chaque randonnée.
HOME_LAT = 43.7446686
HOME_LON = 5.0786240


def drive_time_minutes(dest_lat: float, dest_lon: float, origin_lat: float = HOME_LAT, origin_lon: float = HOME_LON):
    url = f"http://router.project-osrm.org/route/v1/driving/{origin_lon},{origin_lat};{dest_lon},{dest_lat}"
    r = requests.get(url, params={"overview": "false"}, headers={"User-Agent": USER_AGENT}, timeout=20)
    r.raise_for_status()
    data = r.json()
    if data.get("code") != "Ok" or not data.get("routes"):
        return None
    return round(data["routes"][0]["duration"] / 60, 1)


def route_geometry(start_lat: float, start_lon: float, end_lat: float, end_lon: float, profile: str = "driving"):
    """Route routière réelle entre deux points (liaison entre deux randos d'un projet), via OSRM."""
    url = f"http://router.project-osrm.org/route/v1/{profile}/{start_lon},{start_lat};{end_lon},{end_lat}"
    try:
        r = requests.get(
            url,
            params={"overview": "full", "geometries": "geojson"},
            headers={"User-Agent": USER_AGENT},
            timeout=20,
        )
        r.raise_for_status()
        data = r.json()
    except requests.RequestException:
        return None
    if data.get("code") != "Ok" or not data.get("routes"):
        return None
    coords = data["routes"][0]["geometry"]["coordinates"]
    return [[lat, lon] for lon, lat in coords]
