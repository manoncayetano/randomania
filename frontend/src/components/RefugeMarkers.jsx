import { CircleMarker, Popup } from 'react-leaflet';

const COULEUR_REFUGE = '#8b5e34';

export default function RefugeMarkers({ refuges }) {
  return refuges.map((r) => (
    <CircleMarker
      key={`refuge-${r.id}`}
      center={[r.latitude, r.longitude]}
      radius={6}
      pathOptions={{ color: '#ffffff', weight: 1.5, fillColor: COULEUR_REFUGE, fillOpacity: 1 }}
    >
      <Popup>
        <div className="text-sm">
          <div className="font-medium">{r.nom}</div>
          {r.altitude != null && <div className="text-gray-600">{r.altitude} m</div>}
          {r.type && <div className="text-xs text-gray-500">{r.type}</div>}
        </div>
      </Popup>
    </CircleMarker>
  ));
}
