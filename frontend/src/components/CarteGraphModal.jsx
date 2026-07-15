import ParcoursMap from './ParcoursMap';
import ElevationProfile from './ElevationProfile';

export default function CarteGraphModal({ parcours, hoverPoint, onHover, onClose }) {
  return (
    <div className="fixed inset-0 z-[2000] flex flex-col bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 sm:px-6">
        <h2 className="text-lg font-medium text-gray-900">Carte et graphique dénivelé</h2>
        <button type="button" onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700">
          Fermer
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="grid h-full grid-cols-1 gap-4 lg:grid-cols-2">
          <ParcoursMap parcours={parcours} hoverPoint={hoverPoint} heightClass="h-[40vh] lg:h-[calc(100vh-9rem)]" />
          <ElevationProfile profile={parcours.gpx_profile} onHover={onHover} heightClass="h-[40vh] lg:h-[calc(100vh-9rem)]" />
        </div>
      </div>
    </div>
  );
}
