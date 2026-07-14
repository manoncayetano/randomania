import math


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def point_in_polygon(lat: float, lon: float, polygone: list) -> bool:
    """Ray casting sur (lon, lat) en plan 2D : approximation largement suffisante
    à l'échelle d'une zone de recherche dessinée à la main (quelques dizaines de km)."""
    inside = False
    n = len(polygone)
    j = n - 1
    for i in range(n):
        lat_i, lon_i = polygone[i]
        lat_j, lon_j = polygone[j]
        if (lon_i > lon) != (lon_j > lon):
            lat_intersection = (lat_j - lat_i) * (lon - lon_i) / (lon_j - lon_i) + lat_i
            if lat < lat_intersection:
                inside = not inside
        j = i
    return inside
