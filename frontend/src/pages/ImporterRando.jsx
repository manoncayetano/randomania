import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { importRando } from '../api/client';

export default function ImporterRando() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

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

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
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
  );
}
