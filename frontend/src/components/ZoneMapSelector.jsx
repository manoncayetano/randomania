import { useState } from 'react';
import { MapContainer, TileLayer, Circle, Marker, Polygon, CircleMarker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import { OsmRandoTileLayer, OsmRandoToggleButton } from './OsmRandoLayer';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const CENTRE_PAR_DEFAUT = [43.7446686, 5.078624]; // Sénas
const RAYON_MIN_KM = 2;
const RAYON_MAX_KM = 60;
const RAYON_DEFAUT_KM = 15;

function ClicSurCarte({ onClick }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function ModeToggle({ mode, onChange }) {
  return (
    <div className="flex gap-2">
      {[
        { value: 'cercle', label: 'Cercle' },
        { value: 'polygone', label: 'Zone libre' },
      ].map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={
            'rounded-full border px-3 py-1 text-xs font-medium transition ' +
            (mode === option.value
              ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-white'
              : 'border-gray-300 bg-white text-gray-600 hover:border-[var(--color-accent)]')
          }
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default function ZoneMapSelector({ value, onChange }) {
  const [mode, setMode] = useState(value?.type ?? 'cercle');
  const [afficherRando, setAfficherRando] = useState(false);

  const rayonKm = value?.type === 'cercle' ? value.rayonKm : RAYON_DEFAUT_KM;
  const centre = value?.type === 'cercle' ? [value.lat, value.lon] : CENTRE_PAR_DEFAUT;
  const points = value?.type === 'polygone' ? value.points : [];

  function handleModeChange(nouveauMode) {
    setMode(nouveauMode);
    onChange(null);
  }

  function handleMapClick(lat, lon) {
    if (mode === 'cercle') {
      onChange({ type: 'cercle', lat, lon, rayonKm });
    } else {
      onChange({ type: 'polygone', points: [...points, [lat, lon]] });
    }
  }

  function handleRayonChange(nouveauRayon) {
    if (value?.type === 'cercle') onChange({ ...value, rayonKm: nouveauRayon });
  }

  function handleRecommencerPolygone() {
    onChange({ type: 'polygone', points: [] });
  }

  function handleAnnulerDernierPoint() {
    onChange({ type: 'polygone', points: points.slice(0, -1) });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <ModeToggle mode={mode} onChange={handleModeChange} />
        <OsmRandoToggleButton actif={afficherRando} onToggle={() => setAfficherRando((v) => !v)} />
      </div>

      <p className="text-xs text-gray-500">
        {mode === 'cercle'
          ? 'Clique sur la carte pour placer le centre de la zone, puis ajuste le rayon.'
          : `Clique sur la carte pour ajouter les points de la zone (${points.length} point${points.length !== 1 ? 's' : ''}).`}
      </p>

      <div className="overflow-hidden rounded-lg border border-gray-300" style={{ height: '34rem' }}>
        <MapContainer center={centre} zoom={value ? 9 : 7} className="h-full w-full">
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <OsmRandoTileLayer actif={afficherRando} />
          <ClicSurCarte onClick={handleMapClick} />

          {mode === 'cercle' && value?.type === 'cercle' && (
            <>
              <Marker position={centre} />
              <Circle
                center={centre}
                radius={rayonKm * 1000}
                pathOptions={{ color: 'var(--color-accent)', fillOpacity: 0.1 }}
              />
            </>
          )}

          {mode === 'polygone' && points.length >= 3 && (
            <Polygon positions={points} pathOptions={{ color: 'var(--color-accent)', fillOpacity: 0.15 }} />
          )}
          {mode === 'polygone' &&
            points.map((p, i) => (
              <CircleMarker
                key={i}
                center={p}
                radius={4}
                pathOptions={{ color: 'var(--color-accent-dark)', fillColor: 'var(--color-accent)', fillOpacity: 1 }}
              />
            ))}
        </MapContainer>
      </div>

      {mode === 'cercle' && value?.type === 'cercle' && (
        <div className="flex items-center gap-3">
          <label className="flex flex-1 items-center gap-2 text-sm text-gray-600">
            Rayon
            <input
              type="range"
              min={RAYON_MIN_KM}
              max={RAYON_MAX_KM}
              value={rayonKm}
              onChange={(e) => handleRayonChange(Number(e.target.value))}
              className="flex-1"
            />
            <span className="w-16 shrink-0 text-right">{rayonKm} km</span>
          </label>
          <button type="button" onClick={() => onChange(null)} className="shrink-0 text-sm text-red-600 underline">
            Effacer la zone
          </button>
        </div>
      )}

      {mode === 'polygone' && points.length > 0 && (
        <div className="flex items-center gap-3 text-sm">
          {points.length < 3 && <span className="text-gray-500">Ajoute au moins 3 points pour former une zone.</span>}
          <button type="button" onClick={handleAnnulerDernierPoint} className="text-gray-600 underline">
            Annuler le dernier point
          </button>
          <button type="button" onClick={handleRecommencerPolygone} className="text-gray-600 underline">
            Recommencer
          </button>
          <button type="button" onClick={() => onChange(null)} className="text-red-600 underline">
            Effacer la zone
          </button>
        </div>
      )}
    </div>
  );
}
