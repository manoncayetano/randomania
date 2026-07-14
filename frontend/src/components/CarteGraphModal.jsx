import ParcoursMap from './ParcoursMap';
import ElevationProfile from './ElevationProfile';

export default function CarteGraphModal({ parcours, hoverPoint, onHover, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-[95vh] w-full max-w-6xl overflow-y-auto rounded-xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">Carte et graphique dénivelé</h2>
          <button type="button" onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700">
            Fermer
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ParcoursMap parcours={parcours} hoverPoint={hoverPoint} heightClass="h-[45vh]" />
          <ElevationProfile profile={parcours.gpx_profile} onHover={onHover} heightClass="h-[45vh]" />
        </div>
      </div>
    </div>
  );
}
