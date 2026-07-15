import { TileLayer } from 'react-leaflet';

const COULEUR_RANDO = '#e0301e';

export function OsmRandoTileLayer({ actif }) {
  if (!actif) return null;
  return (
    <TileLayer
      attribution='&copy; <a href="https://waymarkedtrails.org">Waymarked Trails</a>'
      url="https://tile.waymarkedtrails.org/hiking/{z}/{x}/{y}.png"
    />
  );
}

export function OsmRandoToggleButton({ actif, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={actif ? 'Cliquer pour masquer les sentiers balisés' : 'Cliquer pour afficher les sentiers balisés (OSM Rando)'}
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs transition ${
        actif ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-400 hover:bg-gray-50'
      }`}
    >
      <span
        className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: COULEUR_RANDO, opacity: actif ? 1 : 0.3 }}
      />
      OSM Rando
    </button>
  );
}
