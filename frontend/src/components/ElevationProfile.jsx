import { useRef, useState } from 'react';

const WIDTH = 400;
const HEIGHT = 160;
const PAD_LEFT = 34;
const PAD_RIGHT = 10;
const PAD_TOP = 14;
const PAD_BOTTOM = 22;

function niceStep(range, targetTicks = 4) {
  const rough = range / targetTicks || 1;
  const mag = 10 ** Math.floor(Math.log10(rough));
  const norm = rough / mag;
  const step = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10;
  return step * mag;
}

export default function ElevationProfile({ profile, onHover, heightClass = 'h-40' }) {
  const svgRef = useRef(null);
  const [hoverIndex, setHoverIndex] = useState(null);

  const validProfile = (profile || []).filter((p) => p.elevation != null);
  if (validProfile.length < 2) return null;

  const distances = validProfile.map((p) => p.distance_km);
  const elevations = validProfile.map((p) => p.elevation);
  const minEle = Math.min(...elevations);
  const maxEle = Math.max(...elevations);
  const maxDist = distances[distances.length - 1] || 1;

  let deniveleP = 0;
  let deniveleN = 0;
  let peakIndex = 0;
  for (let i = 1; i < elevations.length; i++) {
    const delta = elevations[i] - elevations[i - 1];
    if (delta > 0) deniveleP += delta;
    else deniveleN += -delta;
    if (elevations[i] > elevations[peakIndex]) peakIndex = i;
  }

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
  for (let km = 0; km <= maxDist; km += Math.max(1, Math.ceil(maxDist / 6))) {
    kmMarks.push(km);
  }

  const eleStep = niceStep(maxEle - minEle || 1);
  const eleMarks = [];
  for (let ele = Math.ceil(minEle / eleStep) * eleStep; ele <= maxEle; ele += eleStep) {
    eleMarks.push(Math.round(ele));
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
  const peak = validProfile[peakIndex];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3">
      <p className="mb-1 text-sm font-medium text-gray-700">
        Dénivelé : +{Math.round(deniveleP)} m / -{Math.round(deniveleN)} m
      </p>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        className={`${heightClass} w-full`}
        onMouseMove={handleMove}
        onMouseLeave={() => setHover(null)}
      >
        {eleMarks.map((ele) => (
          <g key={ele}>
            <line
              x1={PAD_LEFT}
              x2={WIDTH - PAD_RIGHT}
              y1={y(ele)}
              y2={y(ele)}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
            <text x={PAD_LEFT - 5} y={y(ele)} dy="3" fontSize="9" fill="#9ca3af" textAnchor="end">
              {ele}
            </text>
          </g>
        ))}

        <path d={areaPath} fill="var(--color-accent)" opacity="0.1" stroke="none" />
        <path d={linePath} fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        <circle cx={x(peak.distance_km)} cy={y(peak.elevation)} r="3" fill="var(--color-accent)" />
        <text x={x(peak.distance_km)} y={y(peak.elevation) - 7} fontSize="9" fill="#6b7280" textAnchor="middle">
          {Math.round(peak.elevation)} m
        </text>

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
              r="4"
              fill="var(--color-accent-dark)"
              stroke="#ffffff"
              strokeWidth="2"
            />
          </>
        )}
      </svg>

      <div className="mt-1 h-5 text-center text-xs text-gray-600">
        {hover ? `km ${hover.distance_km.toFixed(2)} — ${Math.round(hover.elevation)} m` : ' '}
      </div>
    </div>
  );
}
