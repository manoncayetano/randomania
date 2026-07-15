import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, useMap } from 'react-leaflet';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { buildTracks, pointsForTrack } from '../utils/projetTracks';
import RefugeMarkers from './RefugeMarkers';
import { useRefuges } from '../hooks/useRefuges';
import { OsmRandoTileLayer, OsmRandoToggleButton } from './OsmRandoLayer';

const COULEUR_GLOBALE = '#000000';
const COULEUR_REFUGE = '#8b5e34';

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

export default function ProjetMap({ etapes, masquees, onToggle, liaisons, liaisonsEnCours, hoverPoint }) {
  const [afficherGlobal, setAfficherGlobal] = useState(true);
  const [afficherRefuges, setAfficherRefuges] = useState(false);
  const [afficherRando, setAfficherRando] = useState(false);
  const { refuges, loading: refugesEnCours } = useRefuges(afficherRefuges);

  const tracks = buildTracks(etapes).map((t, index) => ({
    ...t,
    color: TRACE_COLORS[index % TRACE_COLORS.length],
  }));

  const sansCoordonnees = tracks.filter((t) => t.points.length === 0 && !t.point);
  const toutesLesCoords = tracks.flatMap((t) => (t.points.length > 0 ? t.points : t.point ? [t.point] : []));

  const tracksVisibles = tracks.filter((t) => !masquees.has(t.etape.id));

  if (toutesLesCoords.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-400">
        Aucune coordonnée ou tracé GPX disponible pour ce projet
      </div>
    );
  }

  // Tracé global = tracés réels de chaque rando affichée, reliés par de vrais itinéraires routiers (pas de trait droit).
  const parcoursGlobalPoints = [];
  tracksVisibles.forEach((t, i) => {
    const pts = pointsForTrack(t);
    if (pts.length === 0) return;
    parcoursGlobalPoints.push(...pts);
    if (i < tracksVisibles.length - 1) {
      const next = tracksVisibles[i + 1];
      if (pointsForTrack(next).length > 0) {
        const liaison = liaisons[`${t.etape.id}-${next.etape.id}`];
        if (liaison) parcoursGlobalPoints.push(...liaison);
      }
    }
  });

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200">
      {sansCoordonnees.length > 0 && (
        <div className="bg-amber-50 px-3 py-1 text-xs text-amber-700">
          {sansCoordonnees.length} étape(s) sans coordonnées non affichée(s) sur la carte
        </div>
      )}
      {liaisonsEnCours && (
        <div className="bg-blue-50 px-3 py-1 text-xs text-blue-700">Calcul de l'itinéraire routier entre les randos...</div>
      )}
      <div style={{ height: '18.7rem' }}>
        <MapContainer center={toutesLesCoords[0]} zoom={10} className="h-full w-full">
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <OsmRandoTileLayer actif={afficherRando} />
          <FitBounds allPoints={parcoursGlobalPoints} />

          {!afficherGlobal &&
            tracksVisibles.flatMap((t) => {
              const elements = [];
              const popup = (
                <Popup>
                  <div className="text-sm">
                    <Link to={`/parcours/${t.etape.parcours.id}`} className="font-medium underline">
                      {t.etape.parcours.nom}
                    </Link>
                    <div className="mt-1 text-gray-600">
                      {t.etape.parcours.distance_km} km · +{t.etape.parcours.denivele_positif} m
                    </div>
                  </div>
                </Popup>
              );
              if (t.points.length > 1) {
                elements.push(
                  <Polyline key={`line-${t.etape.id}`} positions={t.points} pathOptions={{ color: t.color, weight: 4 }} />
                );
                elements.push(
                  <CircleMarker
                    key={`start-${t.etape.id}`}
                    center={t.points[0]}
                    radius={7}
                    pathOptions={{ color: '#ffffff', weight: 2, fillColor: t.color, fillOpacity: 1 }}
                  >
                    {popup}
                  </CircleMarker>
                );
              }
              if (t.point) {
                elements.push(
                  <CircleMarker
                    key={`pt-${t.etape.id}`}
                    center={t.point}
                    radius={9}
                    pathOptions={{ color: '#ffffff', weight: 2, fillColor: t.color, fillOpacity: 1 }}
                  >
                    {popup}
                  </CircleMarker>
                );
              }
              return elements;
            })}

          {afficherGlobal && parcoursGlobalPoints.length > 1 && (
            <Polyline positions={parcoursGlobalPoints} pathOptions={{ color: COULEUR_GLOBALE, weight: 4, opacity: 1 }} />
          )}

          {afficherRefuges && <RefugeMarkers refuges={refuges} />}

          {hoverPoint && (
            <CircleMarker
              center={[hoverPoint.lat, hoverPoint.lon]}
              radius={8}
              pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#0f6e56', fillOpacity: 1 }}
            />
          )}
        </MapContainer>
      </div>

      <div className="flex flex-wrap items-center gap-x-1 gap-y-1 border-t border-gray-200 bg-white px-2 py-2 text-xs">
        <button
          type="button"
          onClick={() => setAfficherRefuges((v) => !v)}
          title={afficherRefuges ? 'Cliquer pour masquer les refuges' : 'Cliquer pour afficher les refuges'}
          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 transition ${
            afficherRefuges ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-400 hover:bg-gray-50'
          }`}
        >
          <span
            className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: COULEUR_REFUGE, opacity: afficherRefuges ? 1 : 0.3 }}
          />
          {refugesEnCours ? 'Chargement des refuges...' : 'Refuges'}
        </button>
        <OsmRandoToggleButton actif={afficherRando} onToggle={() => setAfficherRando((v) => !v)} />
        {parcoursGlobalPoints.length > 1 && (
          <button
            type="button"
            onClick={() => setAfficherGlobal((v) => !v)}
            title={afficherGlobal ? 'Cliquer pour masquer le parcours global' : 'Cliquer pour afficher le parcours global'}
            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 transition ${
              afficherGlobal ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-400 hover:bg-gray-50'
            }`}
          >
            <svg width="14" height="10" viewBox="0 0 14 10" className="shrink-0">
              <line
                x1="0" y1="5" x2="14" y2="5"
                stroke={COULEUR_GLOBALE}
                strokeWidth="2.5"
                opacity={afficherGlobal ? 1 : 0.35}
              />
            </svg>
            <span className={afficherGlobal ? '' : 'line-through'}>Parcours global (itinéraire routier)</span>
          </button>
        )}
        {tracks.map((t) => {
          const estMasquee = masquees.has(t.etape.id);
          const sansCoord = t.points.length === 0 && !t.point;
          return (
            <button
              key={t.etape.id}
              type="button"
              onClick={() => onToggle(t.etape.id)}
              disabled={sansCoord}
              title={estMasquee ? 'Cliquer pour afficher ce tracé' : 'Cliquer pour masquer ce tracé'}
              className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 transition ${
                estMasquee ? 'text-gray-400 hover:bg-gray-50' : 'text-gray-700 hover:bg-gray-100'
              } ${sansCoord ? 'cursor-default opacity-50' : 'cursor-pointer'}`}
            >
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: t.color, opacity: estMasquee ? 0.3 : 1 }}
              />
              <span className={estMasquee ? 'line-through' : ''}>{t.etape.parcours.nom}</span>
              {sansCoord && <span className="text-amber-600">(sans coordonnées)</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
