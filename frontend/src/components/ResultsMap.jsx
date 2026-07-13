import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Link } from 'react-router-dom';
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

function FitBounds({ points }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 11);
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [30, 30] });
  }, [map, points]);

  return null;
}

export default function ResultsMap({ parcours }) {
  const [afficherRefuges, setAfficherRefuges] = useState(false);
  const { refuges, loading: refugesEnCours } = useRefuges(afficherRefuges);

  const avecCoordonnees = parcours.filter((p) => p.latitude != null && p.longitude != null);
  const points = avecCoordonnees.map((p) => [p.latitude, p.longitude]);

  if (avecCoordonnees.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-400">
        Aucune coordonnée disponible pour ces résultats
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200">
      {avecCoordonnees.length < parcours.length && (
        <div className="bg-amber-50 px-3 py-1 text-xs text-amber-700">
          {parcours.length - avecCoordonnees.length} résultat(s) sans coordonnées non affiché(s) sur la carte
        </div>
      )}
      <div style={{ height: '32rem' }}>
        <MapContainer center={points[0]} zoom={9} className="h-full w-full">
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds points={points} />
          {avecCoordonnees.map((p) => (
            <Marker key={p.id} position={[p.latitude, p.longitude]}>
              <Popup>
                <div className="text-sm">
                  <Link to={`/parcours/${p.id}`} className="font-medium text-[var(--color-accent-dark)] underline">
                    {p.nom}
                  </Link>
                  <div className="mt-1 text-gray-600">
                    {p.distance_km} km · +{p.denivele_positif} m
                  </div>
                  {p.indice_difficulte_label && (
                    <div className="text-gray-500">{p.indice_difficulte_label} · {p.indice_difficulte}/100</div>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}

          {afficherRefuges && <RefugeMarkers refuges={refuges} />}
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
      </div>
    </div>
  );
}
