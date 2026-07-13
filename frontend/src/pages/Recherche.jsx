import { useRef, useState } from 'react';
import SearchForm from '../components/SearchForm';
import ParcoursCard from '../components/ParcoursCard';
import ResultsMap from '../components/ResultsMap';
import { searchParcours } from '../api/client';

export default function Recherche() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [vue, setVue] = useState('liste');
  const abortRef = useRef(null);

  async function handleSearch(criteres) {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const data = await searchParcours(criteres, controller.signal);
      setResults(data);
      setLoading(false);
    } catch (err) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return;
      setError('Erreur lors de la recherche. Le serveur backend est-il lancé ?');
      console.error(err);
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-medium text-gray-900">Recherche de parcours</h1>
      </div>

      <SearchForm onSearch={handleSearch} />

      {results && results.length > 0 && (
        <div className="mt-6 flex justify-end">
          <div className="flex rounded-lg border border-gray-300 p-0.5 text-sm">
            <button
              type="button"
              onClick={() => setVue('liste')}
              className={
                'rounded-md px-3 py-1 font-medium transition ' +
                (vue === 'liste' ? 'bg-[var(--color-accent)] text-white' : 'text-gray-600')
              }
            >
              Liste
            </button>
            <button
              type="button"
              onClick={() => setVue('carte')}
              className={
                'rounded-md px-3 py-1 font-medium transition ' +
                (vue === 'carte' ? 'bg-[var(--color-accent)] text-white' : 'text-gray-600')
              }
            >
              Carte
            </button>
          </div>
        </div>
      )}

      <div className="mt-4">
        {loading && !results && <p className="text-sm text-gray-500">Recherche en cours...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && results && results.length === 0 && (
          <p className="text-sm text-gray-500">Aucun parcours trouvé pour ces critères.</p>
        )}

        {results && results.length > 0 && vue === 'liste' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((parcours) => (
              <ParcoursCard key={parcours.id} parcours={parcours} />
            ))}
          </div>
        )}

        {results && results.length > 0 && vue === 'carte' && <ResultsMap parcours={results} />}
      </div>
    </div>
  );
}
