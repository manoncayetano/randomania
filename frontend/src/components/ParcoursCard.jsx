import { Link } from 'react-router-dom';
import TagBadge from './TagBadge';
import FavoriButton from './FavoriButton';
import DifficultyBadge from './DifficultyBadge';
import AjouterAuProjet from './AjouterAuProjet';

function formatTemps(minutes) {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m} min`;
}

function sourceLabel(url) {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    if (host.includes('visorando')) return 'Visorando';
    if (host.includes('paysdesecrins')) return 'Pays des Écrins';
    return host;
  } catch {
    return null;
  }
}

export default function ParcoursCard({ parcours }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white transition hover:shadow-md">
      <div className="absolute right-2 top-2 z-10 flex items-center gap-1">
        {parcours.nombre_favoris > 0 && (
          <span className="rounded-full bg-white/90 px-2 py-1 text-xs font-medium text-gray-600 shadow">
            {parcours.nombre_favoris}
          </span>
        )}
        <FavoriButton parcoursId={parcours.id} initialFavori={parcours.est_favori} className="shadow" />
      </div>

      <Link to={`/parcours/${parcours.id}`} className="block">
        {parcours.photo && (
          <img
            src={parcours.photo}
            alt={parcours.nom}
            loading="lazy"
            className="h-40 w-full object-cover"
          />
        )}

        <div className="p-4 pb-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-medium text-gray-900">{parcours.nom}</h3>
            {parcours.est_realisee && (
              <span className="shrink-0 text-[var(--color-accent-dark)]" title="Déjà réalisée">
                ✓
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {parcours.zone}
            {parcours.distance_depuis_km != null && (
              <span className="ml-2 text-[var(--color-accent-dark)]">· à {parcours.distance_depuis_km} km</span>
            )}
            {parcours.temps_voiture_min != null && (
              <span className="ml-2 text-[var(--color-accent-dark)]">· {formatTemps(parcours.temps_voiture_min)} de Sénas</span>
            )}
          </p>

          {parcours.url_source && (
            <span
              className="mt-1 inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500"
              title={`Fiche disponible sur un site externe : ${sourceLabel(parcours.url_source)}`}
            >
              ↗ {sourceLabel(parcours.url_source)}
            </span>
          )}

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm font-medium text-[var(--color-accent-dark)]">
            <span>{parcours.distance_km} km</span>
            <span>+{parcours.denivele_positif} m / -{parcours.denivele_negatif} m</span>
            <span>
              {parcours.duree_marche_min}–{parcours.duree_marche_max} h
            </span>
            {parcours.duree_jours > 1 && <span>{parcours.duree_jours} jours</span>}
          </div>

          <div className="mt-2 flex items-center gap-2">
            {parcours.niveau && (
              <span className="text-xs uppercase tracking-wide text-gray-400">{parcours.niveau}</span>
            )}
            <DifficultyBadge indice={parcours.indice_difficulte} label={parcours.indice_difficulte_label} compact />
          </div>

          {parcours.tags?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {parcours.tags.map((tag) => (
                <TagBadge key={tag} label={tag} />
              ))}
            </div>
          )}
        </div>
      </Link>

      <div className="p-4 pt-3">
        <AjouterAuProjet parcoursId={parcours.id} />
      </div>
    </div>
  );
}
