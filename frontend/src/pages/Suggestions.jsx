import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addEtape, createProjet, suggererEnchainement } from '../api/client';
import DifficultyBadge from '../components/DifficultyBadge';

const NIVEAU_LABELS = { facile: 'facile', moyen: 'moyen', difficile: 'difficile' };

function decrireJour(jour, index) {
  const parts = [];
  if (jour.niveau?.length) parts.push(jour.niveau.map((n) => NIVEAU_LABELS[n] || n).join('/'));
  if (jour.duree_max_h) parts.push(`≤ ${jour.duree_max_h} h`);
  return `Jour ${index + 1} : ${parts.length ? parts.join(', ') : 'aucun critère précis'}`;
}

export default function Suggestions() {
  const [prompt, setPrompt] = useState('');
  const [chainageStrict, setChainageStrict] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [creatingIndex, setCreatingIndex] = useState(null);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await suggererEnchainement(prompt.trim(), chainageStrict);
      setResult(data);
      setChainageStrict(data.interpretation.chainage_strict);
    } catch (err) {
      setError(err.response?.data?.detail || 'Échec de la recherche.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreerProjet(chaine, index) {
    setCreatingIndex(index);
    try {
      const nom = `Enchaînement ${chaine.etapes.length} jours - ${chaine.etapes[0].nom}`;
      const projet = await createProjet(nom);
      for (let i = 0; i < chaine.etapes.length; i++) {
        await addEtape(projet.id, chaine.etapes[i].id, i + 1);
      }
      navigate(`/projets/${projet.id}`);
    } catch (err) {
      console.error(err);
      setError("Échec de la création du projet.");
    } finally {
      setCreatingIndex(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-medium text-gray-900">Proposer un enchaînement de randos</h1>
      <p className="mb-6 text-sm text-gray-500">
        Décris ton besoin en une phrase, par exemple : « séjour de 2 jours, jour 1 rando de 3h facile, jour 2
        moyenne, les deux doivent pouvoir s'enchaîner en bivouac ».
      </p>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
        <textarea
          required
          rows={3}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Décris ton projet de rando..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none"
        />

        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={chainageStrict ?? false}
            onChange={(e) => setChainageStrict(e.target.checked)}
          />
          Enchaînement à pied strict (randos très proches géographiquement, pour un bivouac entre les deux)
        </label>

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-[var(--color-accent)] px-5 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-accent-dark)] disabled:opacity-50"
        >
          {loading ? 'Recherche en cours...' : 'Proposer des enchaînements'}
        </button>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>

      {result && (
        <div className="mt-6">
          <div className="mb-4 rounded-lg bg-[var(--color-tag-bg)] p-3 text-sm text-[var(--color-accent-dark)]">
            <p className="font-medium">Ce que j'ai compris :</p>
            {result.interpretation.jours.map((jour, i) => (
              <p key={i}>{decrireJour(jour, i)}</p>
            ))}
            <p className="mt-1">
              Enchaînement : {result.interpretation.chainage_strict ? 'à pied (proximité stricte)' : 'même zone/massif'}
            </p>
          </div>

          {result.chaines.length === 0 && (
            <p className="text-sm text-gray-500">
              Aucun enchaînement trouvé avec ces critères. Essaie d'assouplir la demande (rayon plus large, moins
              de contraintes de durée).
            </p>
          )}

          <div className="space-y-4">
            {result.chaines.map((chaine, index) => (
              <div key={index} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium text-[var(--color-accent-dark)]">
                  <span>{chaine.distance_totale_km} km au total</span>
                  <span>+{chaine.denivele_positif_total} m au total</span>
                </div>
                <div className="space-y-2">
                  {chaine.etapes.map((etape, i) => (
                    <div key={etape.id} className="flex items-center gap-3 rounded-lg border border-gray-100 p-2">
                      <span className="shrink-0 rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                        Jour {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-gray-900">{etape.nom}</p>
                        <div className="flex flex-wrap items-center gap-x-3 text-xs text-gray-500">
                          <span>{etape.distance_km} km</span>
                          <span>+{etape.denivele_positif} m</span>
                          <DifficultyBadge indice={etape.indice_difficulte} label={etape.indice_difficulte_label} compact />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => handleCreerProjet(chaine, index)}
                  disabled={creatingIndex !== null}
                  className="mt-3 rounded-lg border border-gray-300 px-3 py-1 text-sm text-gray-600 transition hover:border-[var(--color-accent)] disabled:opacity-50"
                >
                  {creatingIndex === index ? 'Création...' : 'Créer un projet avec cet enchaînement'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
