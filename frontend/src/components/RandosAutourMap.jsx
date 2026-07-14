import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, useMap } from 'react-leaflet';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getParcours } from '../api/client';
import DifficultyBadge from './DifficultyBadge';

const COULEUR_REFERENCE = '#1d9e75';
// Fixed categorical order (never reassigned by rank) — see dataviz skill palette.
const TRACE_COLORS = [
  '#2a78d6', // blue
  '#1baf7a', // aqua
  '#eda100', // yellow
  '#008300', // green
  '#4a3aa7', // violet
  '#e34948', // red
  '#e87ba4', // magenta
  '#eb6834', // orange
];

function FitBounds({ allPoints }) {
  const map = useMap();

  useEffect(() => {
    if (allPoints.length === 0) return;
    if (allPoints.length === 1) {
      map.setView(allPoints[0], 12);
      return;
    }
    map.fitBounds(L.latLngBounds(allPoints), { padding: [30, 30] });
  }, [map, allPoints]);

  return null;
}

export default function RandosAutourMap({ reference, results }) {
  const [extraTracks, setExtraTracks] = useState({});
  const [loadingIds, setLoadingIds] = useState(() => new Set());
  const colorCounter = useRef(0);

  const referencePoints = reference.gpx_points?.length > 1 ? reference.gpx_points : null;
  const referencePoint =
    !referencePoints && reference.latitude != null ? [reference.latitude, reference.longitude] : null;

  const autresResultats = results.filter(
    (p) => p.id !== reference.id && p.latitude != null && p.longitude != null
  );

  async function handleClickResultat(p) {
    if (extraTracks[p.id]) {
      setExtraTracks((prev) => {
        const next = { ...prev };
        delete next[p.id];
        return next;
      });
      return;
    }

    setLoadingIds((prev) => new Set(prev).add(p.id));
    try {
      const detail = await getParcours(p.id);
      const color = TRACE_COLORS[colorCounter.current % TRACE_COLORS.length];
      colorCounter.current += 1;
      setExtraTracks((prev) => ({
        ...prev,
        [p.id]: {
          nom: p.nom,
          points: detail.gpx_points?.length > 1 ? detail.gpx_points : null,
          point: [p.latitude, p.longitude],
          color,
        },
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(p.id);
        return next;
      });
    }
  }

  const allPoints = [
    ...(referencePoints || (referencePoint ? [referencePoint] : [])),
    ...Object.values(extraTracks).flatMap((t) => t.points || (t.point ? [t.point] : [])),
  ];

  if (allPoints.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-400">
        Aucune coordonnée disponible pour afficher la carte
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200">
      <div style={{ height: '24rem' }}>
        <MapContainer center={allPoints[0]} zoom={11} className="h-full w-full">
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds allPoints={allPoints} />

          {referencePoints && (
            <Polyline positions={referencePoints} pathOptions={{ color: COULEUR_REFERENCE, weight: 4 }} />
          )}
          {(referencePoints || referencePoint) && (
            <CircleMarker
              center={referencePoints ? referencePoints[0] : referencePoint}
              radius={9}
              pathOptions={{ color: '#ffffff', weight: 2, fillColor: COULEUR_REFERENCE, fillOpacity: 1 }}
            >
              <Popup>
                <div className="text-sm font-medium">{reference.nom} (rando actuelle)</div>
              </Popup>
            </CircleMarker>
          )}

          {autresResultats.flatMap((p) => {
            const extra = extraTracks[p.id];
            const popup = (
              <Popup>
                <div className="text-sm">
                  <Link to={`/parcours/${p.id}`} className="font-medium underline">
                    {p.nom}
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[var(--color-accent-dark)]">
                    <span>{p.distance_km} km</span>
                    <span>+{p.denivele_positif} m / -{p.denivele_negatif} m</span>
                    <span>{p.duree_marche_min}–{p.duree_marche_max} h</span>
                  </div>
                  <div className="mt-1">
                    <DifficultyBadge indice={p.indice_difficulte} label={p.indice_difficulte_label} compact />
                  </div>
                  <div className="mt-1 text-gray-500">
                    {extra ? 'Cliquer pour retirer le tracé' : loadingIds.has(p.id) ? 'Chargement...' : 'Cliquer pour afficher le tracé GPX'}
                  </div>
                </div>
              </Popup>
            );

            if (extra) {
              const elements = [];
              if (extra.points) {
                elements.push(
                  <Polyline key={`line-${p.id}`} positions={extra.points} pathOptions={{ color: extra.color, weight: 4 }} />
                );
              }
              elements.push(
                <CircleMarker
                  key={`pt-${p.id}`}
                  center={extra.points ? extra.points[0] : extra.point}
                  radius={8}
                  pathOptions={{ color: '#ffffff', weight: 2, fillColor: extra.color, fillOpacity: 1 }}
                  eventHandlers={{ click: () => handleClickResultat(p) }}
                >
                  {popup}
                </CircleMarker>
              );
              return elements;
            }

            return [
              <CircleMarker
                key={`pt-${p.id}`}
                center={[p.latitude, p.longitude]}
                radius={6}
                pathOptions={{ color: '#ffffff', weight: 1.5, fillColor: '#9ca3af', fillOpacity: 0.9 }}
                eventHandlers={{ click: () => handleClickResultat(p) }}
              >
                {popup}
              </CircleMarker>,
            ];
          })}
        </MapContainer>
      </div>

      <div className="flex flex-wrap items-center gap-x-1 gap-y-1 border-t border-gray-200 bg-white px-2 py-2 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-gray-700">
          <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: COULEUR_REFERENCE }} />
          {reference.nom} (actuelle)
        </span>
        {Object.entries(extraTracks).map(([id, t]) => (
          <button
            key={id}
            type="button"
            onClick={() =>
              setExtraTracks((prev) => {
                const next = { ...prev };
                delete next[id];
                return next;
              })
            }
            title="Cliquer pour retirer ce tracé"
            className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-gray-700 hover:bg-gray-100"
          >
            <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: t.color }} />
            {t.nom}
            <span className="text-gray-400">×</span>
          </button>
        ))}
        {Object.keys(extraTracks).length === 0 && (
          <span className="px-2 py-1 text-gray-400">Clique un point sur la carte pour afficher son tracé GPX</span>
        )}
      </div>
    </div>
  );
}
