import { useRef, useState } from 'react';

const WIDTH = 400;
const HEIGHT = 107;
const PAD_LEFT = 8;
const PAD_RIGHT = 8;
const PAD_TOP = 12;
const PAD_BOTTOM = 24;

export default function ElevationProfile({ profile, onHover }) {
  const svgRef = useRef(null);
  const [hoverIndex, setHoverIndex] = useState(null);

  const validProfile = (profile || []).filter((p) => p.elevation != null);
  if (validProfile.length < 2) return null;

  const distances = validProfile.map((p) => p.distance_km);
  const elevations = validProfile.map((p) => p.elevation);
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

  const linePath = validProfile
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(p.distance_km)} ${y(p.elevation)}`)
    .join(' ');
  const areaPath = `${linePath} L ${x(maxDist)} ${PAD_TOP + plotH} L ${x(0)} ${PAD_TOP + plotH} Z`;

  const kmMarks = [];
  for (let km = 0; km <= maxDist; km += Math.max(1, Math.ceil(maxDist / 8))) {
    kmMarks.push(km);
  }

  function setHover(index) {
    setHoverIndex(index);
    onHover?.(index != null ? validProfile[index] : null);
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

  const hover = hoverIndex != null ? validProfile[hoverIndex] : null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        className="h-32 w-full"
        onMouseMove={handleMove}
        onMouseLeave={() => setHover(null)}
      >
        <path d={areaPath} fill="var(--color-accent)" opacity="0.15" stroke="none" />
        <path d={linePath} fill="none" stroke="var(--color-accent)" strokeWidth="2" />

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
            <circle cx={x(hover.distance_km)} cy={y(hover.elevation)} r="3.5" fill="var(--color-accent-dark)" />
          </>
        )}
      </svg>

      <div className="mt-1 h-5 text-center text-xs text-gray-600">
        {hover ? `km ${hover.distance_km.toFixed(2)} — ${Math.round(hover.elevation)} m` : ' '}
      </div>
    </div>
  );
}
