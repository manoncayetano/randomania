import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { deleteGpx, getParcours } from '../api/client';
import ParcoursMap from '../components/ParcoursMap';
import TagBadge from '../components/TagBadge';
import RestrictionAlert from '../components/RestrictionAlert';
import FavoriButton from '../components/FavoriButton';
import RealisationButton from '../components/RealisationButton';
import DifficultyBadge from '../components/DifficultyBadge';
import PhotoCarousel from '../components/PhotoCarousel';
import UploadDropzone from '../components/UploadDropzone';
import ElevationProfile from '../components/ElevationProfile';
import AjouterAuProjet from '../components/AjouterAuProjet';
import EditParcoursForm from '../components/EditParcoursForm';

function AvisSummary({ avis }) {
  const notes = avis.map((a) => a.note).filter((n) => n != null);
  if (notes.length === 0) return null;
  const moyenne = notes.reduce((a, b) => a + b, 0) / notes.length;

  return (
    <div className="mt-3 flex items-center gap-2 text-sm">
      <span className="font-medium text-[var(--color-accent-dark)]">{moyenne.toFixed(1)} / 5</span>
      <span className="text-gray-500">
        sur {notes.length} avis{avis.length > notes.length ? ` (${avis.length} au total)` : ''}
      </span>
    </div>
  );
}

export default function FicheParcours() {
  const { id } = useParams();
  const [parcours, setParcours] = useState(null);
  const [error, setError] = useState(null);
  const [hoverPoint, setHoverPoint] = useState(null);

  const load = useCallback(() => {
    getParcours(id)
      .then(setParcours)
      .catch((err) => {
        setError('Parcours introuvable.');
        console.error(err);
      });
  }, [id]);

  useEffect(() => {
    setParcours(null);
    setError(null);
    load();
  }, [load]);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-sm text-red-600">{error}</p>
        <Link to="/recherche" className="text-sm text-[var(--color-accent-dark)] underline">
          Retour à la recherche
        </Link>
      </div>
    );
  }

  if (!parcours) {
    return <div className="mx-auto max-w-3xl px-4 py-8 text-sm text-gray-500">Chargement...</div>;
  }

  const heroPhoto =
    parcours.photos?.find((p) => p.id === parcours.cover_photo_id) || parcours.photos?.[0];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link to="/recherche" className="text-sm text-[var(--color-accent-dark)] underline">
        ← Retour à la recherche
      </Link>

      <div className="mt-2 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-medium text-gray-900">{parcours.nom}</h1>
            <FavoriButton parcoursId={parcours.id} initialFavori={parcours.est_favori} />
            {parcours.nombre_favoris > 0 && (
              <span className="text-sm text-gray-500">
                {parcours.nombre_favoris} favori{parcours.nombre_favoris > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <p className="text-gray-500">{parcours.zone}</p>

          {parcours.url_source && (
            <a
              href={parcours.url_source}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-sm text-[var(--color-accent-dark)] underline"
            >
              Voir la fiche sur Visorando ↗
            </a>
          )}
        </div>

        <UploadDropzone
          parcoursId={parcours.id}
          heroPhotoUrl={heroPhoto?.url}
          alt={parcours.nom}
          onUploaded={load}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-medium text-[var(--color-accent-dark)]">
        <span>{parcours.distance_km} km</span>
        <span>
          +{parcours.denivele_positif} m / -{parcours.denivele_negatif} m
        </span>
        <span>
          {parcours.duree_marche_min}–{parcours.duree_marche_max} h
        </span>
        {parcours.duree_jours > 1 && <span>{parcours.duree_jours} jours</span>}
        <DifficultyBadge indice={parcours.indice_difficulte} label={parcours.indice_difficulte_label} />
      </div>

      <AvisSummary avis={parcours.avis || []} />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <RealisationButton
          parcoursId={parcours.id}
          initialRealisee={parcours.est_realisee}
          initialDate={parcours.date_realisation}
        />
        <AjouterAuProjet parcoursId={parcours.id} />
        {parcours.latitude != null && (
          <Link
            to={`/parcours/${parcours.id}/autour`}
            className="rounded-lg border border-gray-300 px-3 py-1 text-sm text-gray-600 hover:border-[var(--color-accent)]"
          >
            Randos autour
          </Link>
        )}
      </div>

      <div className="mt-4">
        <EditParcoursForm parcours={parcours} onSaved={load} />
      </div>

      {parcours.photos?.length > 0 && (
        <div className="mt-6">
          <PhotoCarousel
            photos={parcours.photos || []}
            coverPhotoId={parcours.cover_photo_id}
            parcoursId={parcours.id}
            onChange={load}
          />
        </div>
      )}

      <div className="mt-6 space-y-3">
        <div className="space-y-3">
          <ParcoursMap parcours={parcours} hoverPoint={hoverPoint} />
          <ElevationProfile profile={parcours.gpx_profile} onHover={setHoverPoint} />
          {parcours.gpx_path && (
            <button
              type="button"
              onClick={async () => {
                await deleteGpx(parcours.id);
                load();
              }}
              className="text-xs text-red-600 underline"
            >
              Supprimer le tracé GPX
            </button>
          )}
        </div>
      </div>

      {parcours.tags?.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {parcours.tags.map((tag) => (
            <TagBadge key={tag} label={tag} />
          ))}
        </div>
      )}

      {parcours.restrictions?.length > 0 && (
        <div className="mt-6 space-y-3">
          <h2 className="text-lg font-medium text-gray-900">Restrictions</h2>
          {parcours.restrictions.map((r) => (
            <RestrictionAlert key={r.id} restriction={r} />
          ))}
        </div>
      )}

      {parcours.avis?.length > 0 && (
        <div className="mt-6 space-y-3">
          <h2 className="text-lg font-medium text-gray-900">Avis</h2>
          {parcours.avis.map((a) => (
            <div key={a.id} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>{a.source}</span>
                {a.note != null && <span className="font-medium text-[var(--color-accent-dark)]">{a.note}/5</span>}
              </div>
              <p className="mt-1 text-sm text-gray-700">{a.texte}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
