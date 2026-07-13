import { useRef, useState } from 'react';
import { buildTracks, haversineKm, pointsForTrack, routeLengthKm } from '../utils/projetTracks';

const WIDTH = 400;
const HEIGHT = 107;
const PAD_LEFT = 8;
const PAD_RIGHT = 8;
const PAD_TOP = 12;
const PAD_BOTTOM = 24;

function liaisonLengthKm(t, next, liaisons) {
  const liaisonPts = liaisons[`${t.etape.id}-${next.etape.id}`];
  if (liaisonPts && liaisonPts.length > 1) return routeLengthKm(liaisonPts);
  const a = pointsForTrack(t);
  const b = pointsForTrack(next);
  if (a.length === 0 || b.length === 0) return 0;
  return haversineKm(a[a.length - 1][0], a[a.length - 1][1], b[0][0], b[0][1]);
}

// Concatène les profils GPX réels de chaque rando affichée, séparés par des segments
// "estimés" (interpolation linéaire) sur les liaisons routières où l'on n'a pas de données d'altitude.
function buildCombinedProfile(tracksVisibles, liaisons) {
  let offsetKm = 0;
  const points = [];

  tracksVisibles.forEach((t, i) => {
    const profil = (t.profile || []).filter((p) => p.elevation != null);
    if (profil.length > 0) {
      const startDist = profil[0].distance_km;
      profil.forEach((p) => {
        points.push({
          distance_km: offsetKm + (p.distance_km - startDist),
          elevation: p.elevation,
          lat: p.lat,
          lon: p.lon,
          estime: false,
          etapeNom: t.etape.parcours.nom,
        });
      });
      offsetKm += profil[profil.length - 1].distance_km - startDist;
    }

    if (i < tracksVisibles.length - 1) {
      const next = tracksVisibles[i + 1];
      const nextProfil = (next.profile || []).filter((p) => p.elevation != null);
      if (profil.length > 0 && nextProfil.length > 0) {
        const liaisonKm = liaisonLengthKm(t, next, liaisons);
        const finLoc = profil[profil.length - 1];
        const debutLoc = nextProfil[0];
        points.push({
          distance_km: offsetKm,
          elevation: finLoc.elevation,
          lat: finLoc.lat,
          lon: finLoc.lon,
          estime: true,
          etapeNom: null,
        });
        offsetKm += liaisonKm;
        points.push({
          distance_km: offsetKm,
          elevation: debutLoc.elevation,
          lat: debutLoc.lat,
          lon: debutLoc.lon,
          estime: true,
          etapeNom: null,
        });
      }
    }
  });

  return points;
}

export default function ProjetElevationProfile({ etapes, masquees, liaisons, onHover }) {
  const svgRef = useRef(null);
  const [hoverIndex, setHoverIndex] = useState(null);

  const tracks = buildTracks(etapes);
  const tracksVisibles = tracks.filter((t) => !masquees.has(t.etape.id));
  const combined = buildCombinedProfile(tracksVisibles, liaisons);

  if (combined.length < 2) return null;

  const distances = combined.map((p) => p.distance_km);
  const elevations = combined.map((p) => p.elevation);
  const minEle = Math.min(...elevations);
  const maxEle = Math.max(...elevations);
  const maxDist = distances[distances.length - 1] || 1;

  const plotW = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM;

  const x = (km) => PAD_LEFT + (km / maxDist) * plotW;
  const y = (ele) => {
    if (maxEle === minEle) return PAD_TOP + plotH / 2;
    return PAD_TOP + plotH - ((ele - minEle) / (maxEle - minEle)) * plotH;
  };

  // Segmente le tracé en tronçons contigus réel/estimé (le point de jonction est partagé
  // entre les deux tronçons pour que le trait reste visuellement continu).
  const runs = [];
  let current = [combined[0]];
  for (let i = 1; i < combined.length; i++) {
    current.push(combined[i]);
    if (combined[i].estime !== combined[i - 1].estime) {
      runs.push({ estime: combined[i - 1].estime, points: current });
      current = [combined[i]];
    }
  }
  runs.push({ estime: current[0].estime, points: current });
  const hasEstime = runs.some((r) => r.estime);

  const kmMarks = [];
  for (let km = 0; km <= maxDist; km += Math.max(1, Math.ceil(maxDist / 8))) {
    kmMarks.push(km);
  }

  function setHover(index) {
    setHoverIndex(index);
    onHover?.(index != null ? combined[index] : null);
  }

  function handleMove(e) {
    const rect = svgRef.current.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * WIDTH;
    const km = ((relX - PAD_LEFT) / plotW) * maxDist;
    let closest = 0;
    let bestDiff = Infinity;
    for (let i = 0; i < distances.length; i++) {
      const diff = Math.abs(distances[i] - km);
      if (diff < bestDiff) {
        bestDiff = diff;
        closest = i;
      }
    }
    setHover(closest);
  }

  const hover = hoverIndex != null ? combined[hoverIndex] : null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3">
      <p className="mb-1 text-sm font-medium text-gray-700">Dénivelé du trajet global</p>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        className="h-32 w-full"
        onMouseMove={handleMove}
        onMouseLeave={() => setHover(null)}
      >
        {runs.map((run, i) => {
          const linePath = run.points
            .map((p, j) => `${j === 0 ? 'M' : 'L'} ${x(p.distance_km)} ${y(p.elevation)}`)
            .join(' ');
          if (!run.estime) {
            const last = run.points[run.points.length - 1];
            const first = run.points[0];
            const areaPath = `${linePath} L ${x(last.distance_km)} ${PAD_TOP + plotH} L ${x(first.distance_km)} ${PAD_TOP + plotH} Z`;
            return (
              <g key={i}>
                <path d={areaPath} fill="var(--color-accent)" opacity="0.15" stroke="none" />
                <path d={linePath} fill="none" stroke="var(--color-accent)" strokeWidth="2" />
              </g>
            );
          }
          return <path key={i} d={linePath} fill="none" stroke="#9ca3af" strokeWidth="2" strokeDasharray="4,3" />;
        })}

        {kmMarks.map((km) => (
          <text key={km} x={x(km)} y={HEIGHT - 6} fontSize="9" fill="#9ca3af" textAnchor="middle">
            {km}km
          </text>
        ))}

        {hover && (
          <>
            <line
              x1={x(hover.distance_km)}
              x2={x(hover.distance_km)}
              y1={PAD_TOP}
              y2={PAD_TOP + plotH}
              stroke="#6b7280"
              strokeWidth="1"
              strokeDasharray="3,3"
            />
            <circle
              cx={x(hover.distance_km)}
              cy={y(hover.elevation)}
              r="3.5"
              fill={hover.estime ? '#6b7280' : 'var(--color-accent-dark)'}
            />
          </>
        )}
      </svg>

      <div className="mt-1 h-5 text-center text-xs text-gray-600">
        {hover
          ? `km ${hover.distance_km.toFixed(2)} — ${Math.round(hover.elevation)} m${
              hover.estime ? ' (liaison routière, estimé)' : hover.etapeNom ? ` — ${hover.etapeNom}` : ''
            }`
          : ' '}
      </div>
      {hasEstime && (
        <p className="mt-1 text-xs text-gray-400">
          Pointillé gris : liaison routière entre deux randos — dénivelé estimé par interpolation, pas de données GPX réelles.
        </p>
      )}
    </div>
  );
}
