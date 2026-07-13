import math
import xml.etree.ElementTree as ET
from pathlib import Path


def _haversine_m(lat1, lon1, lat2, lon2):
    r = 6371000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def parse_gpx(file_path: Path) -> dict:
    tree = ET.parse(file_path)
    root = tree.getroot()

    points = []
    profile = []
    cumulative_m = 0.0
    prev = None

    for el in root.iter():
        if not (el.tag.endswith("trkpt") or el.tag.endswith("rtept")):
            continue
        lat, lon = el.get("lat"), el.get("lon")
        if not (lat and lon):
            continue
        lat, lon = float(lat), float(lon)

        ele = None
        for child in el:
            if child.tag.endswith("ele") and child.text:
                try:
                    ele = float(child.text)
                except ValueError:
                    ele = None
                break

        if prev is not None:
            cumulative_m += _haversine_m(prev[0], prev[1], lat, lon)
        prev = (lat, lon)

        points.append([lat, lon])
        profile.append({
            "distance_km": round(cumulative_m / 1000, 3),
            "elevation": round(ele) if ele is not None else None,
            "lat": lat,
            "lon": lon,
        })

    return {"points": points, "profile": profile}


def parse_gpx_points(file_path: Path) -> list[list[float]]:
    return parse_gpx(file_path)["points"]
