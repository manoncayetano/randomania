import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { importRando, importZone } from '../api/client';

const NIVEAUX = ['facile', 'moyen', 'difficile'];

function toggleValue(list, value) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export default function ImporterRando() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const [lieu, setLieu] = useState('');
  const [rayonKm, setRayonKm] = useState(40);
  const [niveaux, setNiveaux] = useState(['facile', 'moyen']);
  const [zoneLoading, setZoneLoading] = useState(false);
  const [zoneError, setZoneError] = useState(null);
  const [zoneResult, setZoneResult] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { parcours_id } = await importRando(url.trim());
      navigate(`/parcours/${parcours_id}`);
    } catch (err) {
      setError(err.response?.data?.detail || "Échec de l'import.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitZone(e) {
    e.preventDefault();
    if (!lieu.trim() || niveaux.length === 0) return;
    setZoneLoading(true);
    setZoneError(null);
    setZoneResult(null);
    try {
      const result = await importZone(lieu.trim(), Number(rayonKm), niveaux);
      setZoneResult(result);
    } catch (err) {
      setZoneError(err.response?.data?.detail || "Échec de l'import.");
      console.error(err);
    } finally {
      setZoneLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-8 px-4 py-8">
      <div>
        <h1 className="mb-2 text-2xl font-medium text-gray-900">Importer une randonnée</h1>
        <p className="mb-6 text-sm text-gray-500">
          Colle l'URL d'une fiche Visorando : les infos (distance, dénivelé, durée, niveau, photos, avis) seront
          récupérées automatiquement.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
          <input
            type="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.visorando.com/randonnee-..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-[var(--color-accent)] px-5 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-accent-dark)] disabled:opacity-50"
          >
            {loading ? 'Import en cours...' : 'Importer'}
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      </div>

      <div>
        <h2 className="mb-2 text-xl font-medium text-gray-900">Importer les randonnées autour d'un lieu</h2>
        <p className="mb-6 text-sm text-gray-500">
          Ex : randonnées autour de Sénas, rayon 40 km. Récupère automatiquement toutes les fiches Visorando
          trouvées dans la zone (les randos déjà importées sont ignorées).
        </p>

        <form onSubmit={handleSubmitZone} className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
          <label className="flex flex-col gap-1 text-sm text-gray-600">
            Lieu
            <input
              type="text"
              required
              value={lieu}
              onChange={(e) => setLieu(e.target.value)}
              placeholder="ex : Sénas, 13560"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-gray-600">
            Rayon (km)
            <input
              type="number"
              min="1"
              max="200"
              required
              value={rayonKm}
              onChange={(e) => setRayonKm(e.target.value)}
              className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none"
            />
          </label>

          <div>
            <div className="mb-1 text-sm text-gray-600">Niveau</div>
            <div className="flex flex-wrap gap-2">
              {NIVEAUX.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNiveaux(toggleValue(niveaux, n))}
                  className={
                    'rounded-full border px-3 py-1 text-sm font-medium transition ' +
                    (niveaux.includes(n)
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-white'
                      : 'border-gray-300 bg-white text-gray-600 hover:border-[var(--color-accent)]')
                  }
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={zoneLoading || niveaux.length === 0}
            className="rounded-lg bg-[var(--color-accent)] px-5 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-accent-dark)] disabled:opacity-50"
          >
            {zoneLoading ? 'Import en cours...' : 'Importer la zone'}
          </button>

          {zoneError && <p className="text-sm text-red-600">{zoneError}</p>}

          {zoneResult && (
            <div className="rounded-lg bg-[var(--color-tag-bg)] p-3 text-sm text-[var(--color-accent-dark)]">
              <p>{zoneResult.lieu_trouve}</p>
              <p className="mt-1">
                {zoneResult.trouvees} rando(s) trouvée(s) — {zoneResult.ajoutees} ajoutée(s),{' '}
                {zoneResult.deja_presentes} déjà présente(s)
              </p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
