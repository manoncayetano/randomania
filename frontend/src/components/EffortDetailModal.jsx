import { useEffect, useState } from 'react';
import { getEffortDetail } from '../api/client';

function Barre({ pct, couleur }) {
  return (
    <div className="h-3 flex-1 overflow-hidden rounded-full bg-gray-100">
      <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, backgroundColor: couleur }} />
    </div>
  );
}

export default function EffortDetailModal({ parcoursId, indice, label, onClose }) {
  const [effort, setEffort] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getEffortDetail(parcoursId)
      .then(setEffort)
      .catch(() => setError("Impossible de calculer le détail de l'effort pour ce tracé."));
  }, [parcoursId]);

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">Détail de l'effort</h2>
          <button type="button" onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700">
            Fermer
          </button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {!error && !effort && <p className="text-sm text-gray-500">Calcul en cours...</p>}

        {effort && (
          <div className="space-y-5">
            <div className="rounded-lg bg-[var(--color-tag-bg)] p-3 text-sm">
              <p className="font-medium text-[var(--color-accent-dark)]">
                {label} — {indice}/100 <span className="font-normal text-gray-500">({effort.ies_kcal_kg} kcal/kg)</span>
              </p>
              <p className="mt-1 text-gray-600">
                {effort.distance_km} km · +{effort.denivele_positif} m / -{effort.denivele_negatif} m
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Coût énergétique réel calculé segment par segment (modèle de Minetti), indépendant du poids.
              </p>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-gray-700">Répartition de l'effort par tranche de pente</p>
              <div className="mb-1 flex items-center gap-2 text-xs text-gray-500">
                <span className="w-24 shrink-0" />
                <span className="flex-1">% distance</span>
                <span className="flex-1">% énergie</span>
              </div>
              <div className="space-y-1.5">
                {effort.repartition.map((r) => (
                  <div key={r.label} className="flex items-center gap-2 text-xs text-gray-600">
                    <span className="w-24 shrink-0">{r.label}</span>
                    <Barre pct={r.pct_distance} couleur="#94a3b8" />
                    <Barre pct={r.pct_energie} couleur="var(--color-accent)" />
                    <span className="w-24 shrink-0 text-right text-[11px]">
                      {r.pct_distance}% / {r.pct_energie}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-gray-700">Segments les plus raides</p>
              <div className="space-y-1">
                {effort.segments_raides.map((s, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-gray-50 px-2 py-1 text-xs text-gray-600">
                    <span>
                      {s.debut_km} → {s.fin_km} km ({s.longueur_m} m)
                    </span>
                    <span className={`font-medium ${s.pente_pct < 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                      {s.pente_pct > 0 ? '+' : ''}{s.pente_pct}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
