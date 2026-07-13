export function buildTracks(etapes) {
  return etapes.map((etape) => {
    const points = etape.parcours.gpx_points || [];
    const profile = etape.parcours.gpx_profile || [];
    const hasTrack = points.length > 1;
    const hasPoint = etape.parcours.latitude != null && etape.parcours.longitude != null;
    return {
      etape,
      points: hasTrack ? points : [],
      profile: hasTrack ? profile : [],
      point: !hasTrack && hasPoint ? [etape.parcours.latitude, etape.parcours.longitude] : null,
    };
  });
}

export function pointsForTrack(t) {
  return t.points.length > 0 ? t.points : t.point ? [t.point] : [];
}

export function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function routeLengthKm(points) {
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += haversineKm(points[i][0], points[i][1], points[i + 1][0], points[i + 1][1]);
  }
  return total;
}
