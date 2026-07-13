import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createProjet, listProjets } from '../api/client';

export default function Projets() {
  const [projets, setProjets] = useState(null);
  const [nom, setNom] = useState('');

  function load() {
    listProjets().then(setProjets).catch(() => setProjets([]));
  }

  useEffect(load, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!nom.trim()) return;
    await createProjet(nom.trim());
    setNom('');
    load();
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-medium text-gray-900">Mes projets d'enchaînement</h1>

      <form onSubmit={handleCreate} className="mb-6 flex gap-2">
        <input
          type="text"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          placeholder="ex : Trek Écrins 2.5 jours"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none"
        />
        <button type="submit" className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white">
          Créer
        </button>
      </form>

      {projets == null && <p className="text-sm text-gray-500">Chargement...</p>}
      {projets && projets.length === 0 && <p className="text-sm text-gray-500">Aucun projet pour l'instant.</p>}

      <div className="space-y-3">
        {projets?.map((p) => (
          <Link
            key={p.id}
            to={`/projets/${p.id}`}
            className="block rounded-xl border border-gray-200 bg-white p-4 transition hover:shadow-md"
          >
            <h3 className="font-medium text-gray-900">{p.nom}</h3>
            <div className="mt-1 flex gap-4 text-sm text-[var(--color-accent-dark)]">
              <span>{p.nombre_etapes} étape{p.nombre_etapes !== 1 ? 's' : ''}</span>
              <span>{p.distance_totale_km} km</span>
              <span>+{p.denivele_positif_total} m</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
