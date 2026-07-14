import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import RefugeMarkers from './RefugeMarkers';
import { useRefuges } from '../hooks/useRefuges';

const COULEUR_REFUGE = '#8b5e34';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

function FitToTrack({ points }) {
  const map = useMap();

  useEffect(() => {
    if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points), { padding: [20, 20] });
    }
  }, [map, points]);

  return null;
}

export default function ParcoursMap({ parcours, hoverPoint, heightClass = 'h-[171px] sm:h-[213px]' }) {
  const [afficherRefuges, setAfficherRefuges] = useState(false);
  const [afficherRando, setAfficherRando] = useState(false);
  const { refuges, loading: refugesEnCours } = useRefuges(afficherRefuges);

  const points = parcours.gpx_points || [];

  if (points.length === 0 && (parcours.latitude == null || parcours.longitude == null)) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-400">
        Tracé non disponible pour ce parcours
      </div>
    );
  }

  const center = points.length > 0 ? points[0] : [parcours.latitude, parcours.longitude];

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200">
      <div className={heightClass}>
        <MapContainer center={center} zoom={13} className="h-full w-full">
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {afficherRando && (
            <TileLayer
              attribution='&copy; <a href="https://waymarkedtrails.org">Waymarked Trails</a>'
              url="https://tile.waymarkedtrails.org/hiking/{z}/{x}/{y}.png"
            />
          )}
          {points.length > 1 ? (
            <>
              <Polyline positions={points} pathOptions={{ color: '#1d9e75', weight: 4 }} />
              <FitToTrack points={points} />
            </>
          ) : (
            <Marker position={center} />
          )}

          {hoverPoint && (
            <CircleMarker
              center={[hoverPoint.lat, hoverPoint.lon]}
              radius={8}
              pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#0f6e56', fillOpacity: 1 }}
            />
          )}

          {afficherRefuges && <RefugeMarkers refuges={refuges} />}
        </MapContainer>
      </div>

      <div className="flex flex-wrap items-center gap-x-1 gap-y-1 border-t border-gray-200 bg-white px-2 py-2">
        <button
          type="button"
          onClick={() => setAfficherRefuges((v) => !v)}
          title={afficherRefuges ? 'Cliquer pour masquer les refuges' : 'Cliquer pour afficher les refuges'}
          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs transition ${
            afficherRefuges ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-400 hover:bg-gray-50'
          }`}
        >
          <span
            className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: COULEUR_REFUGE, opacity: afficherRefuges ? 1 : 0.3 }}
          />
          {refugesEnCours ? 'Chargement des refuges...' : 'Afficher les refuges'}
        </button>

        <button
          type="button"
          onClick={() => setAfficherRando((v) => !v)}
          title={afficherRando ? 'Cliquer pour masquer les sentiers balisés' : 'Cliquer pour afficher les sentiers balisés (OSM Rando)'}
          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs transition ${
            afficherRando ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-400 hover:bg-gray-50'
          }`}
        >
          <span
            className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: '#e0301e', opacity: afficherRando ? 1 : 0.3 }}
          />
          OSM Rando
        </button>
      </div>
    </div>
  );
}
