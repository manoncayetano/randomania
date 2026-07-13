import { useState } from 'react';
import { addTag, removeTag, updateParcours } from '../api/client';

const NIVEAUX = ['facile', 'moyen', 'difficile'];

export default function EditParcoursForm({ parcours, onSaved }) {
  const [open, setOpen] = useState(false);
  const [fields, setFields] = useState({
    nom: parcours.nom ?? '',
    zone: parcours.zone ?? '',
    niveau: parcours.niveau ?? '',
    distance_km: parcours.distance_km ?? '',
    denivele_positif: parcours.denivele_positif ?? '',
    denivele_negatif: parcours.denivele_negatif ?? '',
    duree_jours: parcours.duree_jours ?? '',
    duree_marche_min: parcours.duree_marche_min ?? '',
    duree_marche_max: parcours.duree_marche_max ?? '',
  });
  const [nouveauTag, setNouveauTag] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  function set(field, value) {
    setFields((f) => ({ ...f, [field]: value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const payload = {};
      for (const [key, value] of Object.entries(fields)) {
        if (value === '') continue;
        payload[key] = ['nom', 'zone', 'niveau'].includes(key) ? value : Number(value);
      }
      await updateParcours(parcours.id, payload);
      setOpen(false);
      onSaved?.();
    } catch (err) {
      setError(err.response?.data?.detail || "Échec de l'enregistrement.");
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  async function handleAddTag(e) {
    e.preventDefault();
    if (!nouveauTag.trim()) return;
    await addTag(parcours.id, nouveauTag.trim());
    setNouveauTag('');
    onSaved?.();
  }

  async function handleRemoveTag(tag) {
    await removeTag(parcours.id, tag);
    onSaved?.();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-gray-300 px-3 py-1 text-sm text-gray-600 hover:border-[var(--color-accent)]"
      >
        Modifier
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <form onSubmit={handleSave} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm text-gray-600 sm:col-span-2 lg:col-span-3">
          Nom
          <input
            type="text"
            value={fields.nom}
            onChange={(e) => set('nom', e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-gray-600">
          Zone
          <input
            type="text"
            value={fields.zone}
            onChange={(e) => set('zone', e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-gray-600">
          Niveau
          <select
            value={fields.niveau}
            onChange={(e) => set('niveau', e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none"
          >
            <option value="">—</option>
            {NIVEAUX.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-gray-600">
          Nombre de jours
          <input
            type="number"
            min="1"
            value={fields.duree_jours}
            onChange={(e) => set('duree_jours', e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-gray-600">
          Distance (km)
          <input
            type="number"
            step="0.01"
            min="0"
            value={fields.distance_km}
            onChange={(e) => set('distance_km', e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-gray-600">
          Dénivelé positif (m)
          <input
            type="number"
            min="0"
            value={fields.denivele_positif}
            onChange={(e) => set('denivele_positif', e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-gray-600">
          Dénivelé négatif (m)
          <input
            type="number"
            min="0"
            value={fields.denivele_negatif}
            onChange={(e) => set('denivele_negatif', e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-gray-600">
          Durée de marche min (h)
          <input
            type="number"
            step="0.01"
            min="0"
            value={fields.duree_marche_min}
            onChange={(e) => set('duree_marche_min', e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-gray-600">
          Durée de marche max (h)
          <input
            type="number"
            step="0.01"
            min="0"
            value={fields.duree_marche_max}
            onChange={(e) => set('duree_marche_max', e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none"
          />
        </label>

        <div className="sm:col-span-2 lg:col-span-3">
          <div className="mb-1 text-sm text-gray-600">Tags</div>
          <div className="flex flex-wrap gap-2">
            {(parcours.tags || []).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-[var(--color-tag-bg)] px-3 py-1 text-xs font-medium text-[var(--color-tag-text)]"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="text-[var(--color-tag-text)] hover:text-red-600"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={nouveauTag}
              onChange={(e) => setNouveauTag(e.target.value)}
              placeholder="Ajouter un tag"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none"
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="rounded-lg border border-gray-300 px-3 py-1 text-sm text-gray-600 hover:border-[var(--color-accent)]"
            >
              Ajouter
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 sm:col-span-2 lg:col-span-3">{error}</p>}

        <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Enregistrer
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600"
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}
