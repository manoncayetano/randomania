import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getParcours, getParcoursProches, listTags } from '../api/client';
import ParcoursCard from '../components/ParcoursCard';
import RandosAutourMap from '../components/RandosAutourMap';

const NIVEAUX = ['facile', 'moyen', 'difficile'];
const DIFFICULTE_LABELS = ['Facile', 'Modéré', 'Assez difficile', 'Difficile', 'Très difficile'];

function toggleValue(list, value) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function Pill({ label, active, onClick }) {
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

export default function RandosAutour() {
  const { id } = useParams();
  const [reference, setReference] = useState(null);
  const [rayonKm, setRayonKm] = useState(20);
  const [niveaux, setNiveaux] = useState([]);
  const [difficultes, setDifficultes] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [vue, setVue] = useState('liste');

  useEffect(() => {
    getParcours(id).then(setReference).catch(() => setError("Parcours de référence introuvable."));
    listTags().then(setAvailableTags).catch(() => setAvailableTags([]));
  }, [id]);

  useEffect(() => {
    if (!reference) return;
    const criteres = {
      niveau: niveaux.length ? niveaux : undefined,
      tags: selectedTags.length ? selectedTags : undefined,
      indice_difficulte_labels: difficultes.length ? difficultes : undefined,
    };
    const timer = setTimeout(() => {
      getParcoursProches(id, criteres, rayonKm)
        .then(setResults)
        .catch(() => setError('Erreur lors de la recherche des randos proches.'));
    }, 300);
    return () => clearTimeout(timer);
  }, [reference, id, rayonKm, niveaux, difficultes, selectedTags]);

  if (error) {
    return <div className="mx-auto max-w-5xl px-4 py-8 text-sm text-red-600">{error}</div>;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link to={`/parcours/${id}`} className="text-sm text-[var(--color-accent-dark)] underline">
        ← Retour à la fiche
      </Link>

      <h1 className="mt-2 mb-1 text-2xl font-medium text-gray-900">
        Randos autour de {reference ? reference.nom : '...'}
      </h1>
      {reference && <p className="mb-6 text-sm text-gray-500">{reference.zone}</p>}

      <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
        <label className="flex flex-col gap-1 text-sm text-gray-600">
          Rayon : {rayonKm} km
          <input
            type="range"
            min="1"
            max="100"
            value={rayonKm}
            onChange={(e) => setRayonKm(Number(e.target.value))}
          />
        </label>

        <div>
          <div className="mb-1 text-sm text-gray-600">Niveau</div>
          <div className="flex flex-wrap gap-2">
            {NIVEAUX.map((n) => (
              <Pill key={n} label={n} active={niveaux.includes(n)} onClick={() => setNiveaux(toggleValue(niveaux, n))} />
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1 text-sm text-gray-600">Indice de difficulté</div>
          <div className="flex flex-wrap gap-2">
            {DIFFICULTE_LABELS.map((label) => (
              <Pill
                key={label}
                label={label}
                active={difficultes.includes(label)}
                onClick={() => setDifficultes(toggleValue(difficultes, label))}
              />
            ))}
          </div>
        </div>

        {availableTags.length > 0 && (
          <div>
            <div className="mb-1 text-sm text-gray-600">Tags</div>
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => (
                <Pill
                  key={tag}
                  label={tag}
                  active={selectedTags.includes(tag)}
                  onClick={() => setSelectedTags(toggleValue(selectedTags, tag))}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-6">
        {results == null && <p className="text-sm text-gray-500">Recherche en cours...</p>}
        {results && results.length === 0 && (
          <p className="text-sm text-gray-500">Aucune rando trouvée dans ce rayon avec ces critères.</p>
        )}
        {results && results.length > 0 && (
          <>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm text-gray-500">{results.length} rando(s) trouvée(s)</p>
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

            {vue === 'liste' && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {results.map((p) => (
                  <ParcoursCard key={p.id} parcours={p} />
                ))}
              </div>
            )}

            {vue === 'carte' && reference && <RandosAutourMap reference={reference} results={results} />}
          </>
        )}
      </div>
    </div>
  );
}
