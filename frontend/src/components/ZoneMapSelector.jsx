import { MapContainer, TileLayer, Circle, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

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

export default function ZoneMapSelector({ value, onChange }) {
  const rayonKm = value?.rayonKm ?? RAYON_DEFAUT_KM;
  const centre = value ? [value.lat, value.lon] : CENTRE_PAR_DEFAUT;

  function handleMapClick(lat, lon) {
    onChange({ lat, lon, rayonKm });
  }

  function handleRayonChange(nouveauRayon) {
    if (value) onChange({ ...value, rayonKm: nouveauRayon });
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500">Clique sur la carte pour placer le centre de la zone, puis ajuste le rayon.</p>
      <div className="overflow-hidden rounded-lg border border-gray-300" style={{ height: '18rem' }}>
        <MapContainer center={centre} zoom={value ? 9 : 7} className="h-full w-full">
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClicSurCarte onClick={handleMapClick} />
          {value && (
            <>
              <Marker position={centre} />
              <Circle
                center={centre}
                radius={rayonKm * 1000}
                pathOptions={{ color: 'var(--color-accent)', fillOpacity: 0.1 }}
              />
            </>
          )}
        </MapContainer>
      </div>

      {value && (
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
          <button
            type="button"
            onClick={() => onChange(null)}
            className="shrink-0 text-sm text-red-600 underline"
          >
            Effacer la zone
          </button>
        </div>
      )}
    </div>
  );
}
