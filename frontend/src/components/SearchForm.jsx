import { useEffect, useState } from 'react';
import { countParcours, listTags, listUtilisateurs } from '../api/client';
import { useUser } from '../context/UserContext';
import ZoneMapSelector from './ZoneMapSelector';

const NIVEAUX = ['facile', 'moyen', 'difficile'];
const DIFFICULTE_LABELS = ['Facile', 'Modéré', 'Assez difficile', 'Difficile', 'Très difficile'];
const DEBOUNCE_MS = 350;

function toggleValue(list, value) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function PillToggle({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'rounded-full border px-3 py-1 text-sm font-medium transition ' +
        (active
          ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-white'
          : 'border-gray-300 bg-white text-gray-600 hover:border-[var(--color-accent)]')
      }
    >
      {label}
    </button>
  );
}

function OuiNonToggle({ label, value, onChange }) {
  return (
    <div>
      <div className="mb-1 text-sm text-gray-600">{label}</div>
      <div className="flex gap-2">
        <PillToggle label="Oui" active={value === true} onClick={() => onChange(value === true ? null : true)} />
        <PillToggle label="Non" active={value === false} onClick={() => onChange(value === false ? null : false)} />
      </div>
    </div>
  );
}

export default function SearchForm({ onSearch, initialValues = {} }) {
  const { utilisateur } = useUser();
  const [zoneSelection, setZoneSelection] = useState(
    initialValues.zone_lat != null && initialValues.zone_lon != null
      ? { lat: initialValues.zone_lat, lon: initialValues.zone_lon, rayonKm: initialValues.zone_rayon_km ?? 15 }
      : null
  );
  const [zoneCarteOuverte, setZoneCarteOuverte] = useState(false);
  const [q, setQ] = useState(initialValues.q ?? '');
  const [niveaux, setNiveaux] = useState(initialValues.niveau ?? []);
  const [distanceMin, setDistanceMin] = useState(initialValues.distance_min ?? '');
  const [distanceMax, setDistanceMax] = useState(initialValues.distance_max ?? '');
  const [deniveleMin, setDeniveleMin] = useState(initialValues.denivele_positif_min ?? '');
  const [deniveleMax, setDeniveleMax] = useState(initialValues.denivele_positif_max ?? '');
  const [deniveleNegMin, setDeniveleNegMin] = useState(initialValues.denivele_negatif_min ?? '');
  const [deniveleNegMax, setDeniveleNegMax] = useState(initialValues.denivele_negatif_max ?? '');
  const [indiceDifficulteLabels, setIndiceDifficulteLabels] = useState(initialValues.indice_difficulte_labels ?? []);
  const [tempsMin, setTempsMin] = useState(initialValues.temps_min ?? '');
  const [tempsMax, setTempsMax] = useState(initialValues.temps_max ?? '');
  const [selectedTags, setSelectedTags] = useState(initialValues.tags ?? []);
  const [favorisDe, setFavorisDe] = useState(initialValues.favoris_de ?? []);
  const [aGpx, setAGpx] = useState(initialValues.a_gpx ?? null);
  const [aLien, setALien] = useState(initialValues.a_lien ?? null);
  const [filtresAvancesOuverts, setFiltresAvancesOuverts] = useState(false);
  const [availableTags, setAvailableTags] = useState([]);
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [resultCount, setResultCount] = useState(null);
  const [countLoading, setCountLoading] = useState(false);

  useEffect(() => {
    listTags().then(setAvailableTags).catch(() => setAvailableTags([]));
    listUtilisateurs().then(setUtilisateurs).catch(() => setUtilisateurs([]));
  }, []);

  const criteres = {
    zone_lat: zoneSelection?.lat,
    zone_lon: zoneSelection?.lon,
    zone_rayon_km: zoneSelection?.rayonKm,
    q: q || undefined,
    niveau: niveaux.length ? niveaux : undefined,
    distance_min: distanceMin || undefined,
    distance_max: distanceMax || undefined,
    denivele_positif_min: deniveleMin || undefined,
    denivele_positif_max: deniveleMax || undefined,
    denivele_negatif_min: deniveleNegMin || undefined,
    denivele_negatif_max: deniveleNegMax || undefined,
    indice_difficulte_labels: indiceDifficulteLabels.length ? indiceDifficulteLabels : undefined,
    temps_min: tempsMin || undefined,
    temps_max: tempsMax || undefined,
    tags: selectedTags.length ? selectedTags : undefined,
    favoris_de: favorisDe.length ? favorisDe : undefined,
    a_gpx: aGpx === null ? undefined : aGpx,
    a_lien: aLien === null ? undefined : aLien,
  };
  const criteresKey = JSON.stringify(criteres);

  useEffect(() => {
    const controller = new AbortController();
    setCountLoading(true);
    const timer = setTimeout(() => {
      countParcours(criteres, controller.signal)
        .then(setResultCount)
        .catch((err) => {
          if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
            setResultCount(null);
          }
        })
        .finally(() => setCountLoading(false));
      onSearch(criteres);
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [criteresKey]);

  function handleSubmit(e) {
    e.preventDefault();
    onSearch(criteres);
  }

  function handleReset() {
    setZoneSelection(null);
    setQ('');
    setNiveaux([]);
    setDistanceMin('');
    setDistanceMax('');
    setDeniveleMin('');
    setDeniveleMax('');
    setDeniveleNegMin('');
    setDeniveleNegMax('');
    setIndiceDifficulteLabels([]);
    setTempsMin('');
    setTempsMax('');
    setSelectedTags([]);
    setFavorisDe([]);
    setAGpx(null);
    setALien(null);
  }

  const autresUtilisateurs = utilisateurs.filter((u) => u !== utilisateur);

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1 text-sm text-gray-600">
          Mot-clé
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ex : lac bleu"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none"
          />
        </label>

        <div className="flex flex-col gap-1 text-sm text-gray-600">
          Distance (km)
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              placeholder="min"
              value={distanceMin}
              onChange={(e) => setDistanceMin(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none"
            />
            <input
              type="number"
              min="0"
              placeholder="max"
              value={distanceMax}
              onChange={(e) => setDistanceMax(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1 text-sm text-gray-600">
          Dénivelé positif (m)
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              placeholder="min"
              value={deniveleMin}
              onChange={(e) => setDeniveleMin(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none"
            />
            <input
              type="number"
              min="0"
              placeholder="max"
              value={deniveleMax}
              onChange={(e) => setDeniveleMax(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1 text-sm text-gray-600">
          Dénivelé négatif (m)
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              placeholder="min"
              value={deniveleNegMin}
              onChange={(e) => setDeniveleNegMin(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none"
            />
            <input
              type="number"
              min="0"
              placeholder="max"
              value={deniveleNegMax}
              onChange={(e) => setDeniveleNegMax(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1 text-sm text-gray-600">
          Temps de trajet depuis Sénas (min)
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              placeholder="min"
              value={tempsMin}
              onChange={(e) => setTempsMin(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none"
            />
            <input
              type="number"
              min="0"
              placeholder="max"
              value={tempsMax}
              onChange={(e) => setTempsMax(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-center gap-2 text-sm text-gray-600">
          <span>Zone géographique</span>
          <button
            type="button"
            onClick={() => setZoneCarteOuverte((v) => !v)}
            className="text-sm font-medium text-[var(--color-accent-dark)] underline"
          >
            {zoneCarteOuverte ? 'Masquer la carte' : 'Sélectionner une zone sur la carte'}
          </button>
          {zoneSelection && !zoneCarteOuverte && (
            <span className="text-xs text-gray-500">
              Rayon {zoneSelection.rayonKm} km autour de ({zoneSelection.lat.toFixed(3)}, {zoneSelection.lon.toFixed(3)})
            </span>
          )}
        </div>
        {zoneCarteOuverte && <ZoneMapSelector value={zoneSelection} onChange={setZoneSelection} />}
      </div>

      <div>
        <div className="mb-1 text-sm text-gray-600">Niveau</div>
        <div className="flex flex-wrap gap-2">
          {NIVEAUX.map((n) => (
            <PillToggle
              key={n}
              label={n}
              active={niveaux.includes(n)}
              onClick={() => setNiveaux(toggleValue(niveaux, n))}
            />
          ))}
        </div>
      </div>

      <div>
        <div className="mb-1 text-sm text-gray-600">Indice de difficulté</div>
        <div className="flex flex-wrap gap-2">
          {DIFFICULTE_LABELS.map((label) => (
            <PillToggle
              key={label}
              label={label}
              active={indiceDifficulteLabels.includes(label)}
              onClick={() => setIndiceDifficulteLabels(toggleValue(indiceDifficulteLabels, label))}
            />
          ))}
        </div>
      </div>

      {utilisateur && (
        <div>
          <div className="mb-1 text-sm text-gray-600">Favoris</div>
          <div className="flex flex-wrap gap-2">
            <PillToggle
              label="Mes favoris"
              active={favorisDe.includes(utilisateur)}
              onClick={() => setFavorisDe(toggleValue(favorisDe, utilisateur))}
            />
            {autresUtilisateurs.map((u) => (
              <PillToggle
                key={u}
                label={`Favoris de ${u}`}
                active={favorisDe.includes(u)}
                onClick={() => setFavorisDe(toggleValue(favorisDe, u))}
              />
            ))}
          </div>
        </div>
      )}

      {availableTags.length > 0 && (
        <div>
          <div className="mb-1 text-sm text-gray-600">Tags</div>
          <div className="flex flex-wrap gap-2">
            {availableTags.map((tag) => (
              <PillToggle
                key={tag}
                label={tag}
                active={selectedTags.includes(tag)}
                onClick={() => setSelectedTags(toggleValue(selectedTags, tag))}
              />
            ))}
          </div>
        </div>
      )}

      <div>
        <button
          type="button"
          onClick={() => setFiltresAvancesOuverts((v) => !v)}
          className="text-sm font-medium text-[var(--color-accent-dark)] underline"
        >
          {filtresAvancesOuverts ? 'Masquer les filtres avancés' : 'Filtres avancés'}
        </button>
        {filtresAvancesOuverts && (
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <OuiNonToggle label="GPX importé" value={aGpx} onChange={setAGpx} />
            <OuiNonToggle label="Lien externe (ex Visorando)" value={aLien} onChange={setALien} />
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          className="rounded-lg bg-[var(--color-accent)] px-5 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-accent-dark)]"
        >
          Rechercher
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-medium text-gray-600 transition hover:border-[var(--color-accent)]"
        >
          Réinitialiser
        </button>
        <span className="text-sm text-gray-500">
          {countLoading
            ? 'Calcul en cours...'
            : resultCount !== null
              ? `${resultCount} résultat${resultCount !== 1 ? 's' : ''} potentiel${resultCount !== 1 ? 's' : ''}`
              : ''}
        </span>
      </div>
    </form>
  );
}
