import { useEffect, useState } from 'react';
import { calculerIndiceDifficulte } from '../api/client';
import DifficultyBadge from './DifficultyBadge';

export default function DifficultyCalculator() {
  const [distance, setDistance] = useState('');
  const [denivele, setDenivele] = useState('');
  const [resultat, setResultat] = useState(null);

  useEffect(() => {
    const d = parseFloat(distance);
    const dp = parseFloat(denivele);
    if (!d || d <= 0 || isNaN(dp) || dp < 0) {
      setResultat(null);
      return;
    }
    const timer = setTimeout(() => {
      calculerIndiceDifficulte(d, dp)
        .then(setResultat)
        .catch(() => setResultat(null));
    }, 300);
    return () => clearTimeout(timer);
  }, [distance, denivele]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h2 className="mb-3 text-base font-medium text-gray-900">Calculateur d'indice de difficulté</h2>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm text-gray-600">
          Distance (km)
          <input
            type="number"
            min="0"
            step="0.01"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            placeholder="ex : 5.96"
            className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-gray-600">
          Dénivelé + (m)
          <input
            type="number"
            min="0"
            value={denivele}
            onChange={(e) => setDenivele(e.target.value)}
            placeholder="ex : 564"
            className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none"
          />
        </label>
        {resultat?.indice != null && (
          <DifficultyBadge indice={resultat.indice} label={resultat.label} />
        )}
      </div>
    </div>
  );
}
