import { useEffect, useRef, useState } from 'react';
import {
  createAmelioration,
  deleteAmelioration,
  deleteAmeliorationImage,
  listAmeliorations,
  listDemandeursAmeliorations,
  updateAmelioration,
  uploadAmeliorationImage,
} from '../api/client';

const STATUTS = ['nouveau', 'en_cours', 'termine'];
const STATUT_LABELS = { nouveau: 'Nouveau', en_cours: 'En cours', termine: 'Terminé' };
const STATUT_COLORS = {
  nouveau: 'bg-blue-50 text-blue-700',
  en_cours: 'bg-amber-50 text-amber-700',
  termine: 'bg-emerald-50 text-emerald-700',
};

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

function AmeliorationForm({ initial, onSubmit, onCancel }) {
  const [titre, setTitre] = useState(initial?.titre ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');

  function handleSubmit(e) {
    e.preventDefault();
    if (!titre.trim()) return;
    onSubmit(titre.trim(), description.trim());
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
      <input
        type="text"
        required
        value={titre}
        onChange={(e) => setTitre(e.target.value)}
        placeholder="Titre de la demande"
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none"
      />
      <textarea
        rows={3}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optionnel)"
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none"
      />
      <div className="flex gap-2">
        <button type="submit" className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white">
          Enregistrer
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600">
          Annuler
        </button>
      </div>
    </form>
  );
}

function ImageAttachment({ item, onChange }) {
  const fileInputRef = useRef(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setEnvoiEnCours(true);
    try {
      await uploadAmeliorationImage(item.id, file);
      onChange();
    } finally {
      setEnvoiEnCours(false);
      e.target.value = '';
    }
  }

  async function handleDelete() {
    await deleteAmeliorationImage(item.id);
    onChange();
  }

  return (
    <div className="mt-3">
      {item.image_path && (
        <div className="mb-2">
          <img
            src={item.image_path}
            alt=""
            className="max-h-48 rounded-lg border border-gray-200 object-contain"
          />
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />
      <div className="flex items-center gap-3 text-xs">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={envoiEnCours}
          className="text-[var(--color-accent-dark)] underline disabled:opacity-50"
        >
          {envoiEnCours ? 'Envoi...' : item.image_path ? "Remplacer l'image" : '+ Ajouter une image'}
        </button>
        {item.image_path && (
          <button type="button" onClick={handleDelete} className="text-red-600 underline">
            Supprimer l'image
          </button>
        )}
      </div>
    </div>
  );
}

export default function Ameliorations() {
  const [items, setItems] = useState(null);
  const [demandeursDisponibles, setDemandeursDisponibles] = useState([]);
  const [statutsFiltre, setStatutsFiltre] = useState([]);
  const [demandeursFiltre, setDemandeursFiltre] = useState([]);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);

  function load() {
    listAmeliorations(statutsFiltre, demandeursFiltre)
      .then(setItems)
      .catch(() => setItems([]));
  }

  useEffect(load, [statutsFiltre, demandeursFiltre]);
  useEffect(() => {
    listDemandeursAmeliorations().then(setDemandeursDisponibles).catch(() => setDemandeursDisponibles([]));
  }, []);

  async function handleCreate(titre, description) {
    await createAmelioration(titre, description || undefined);
    setCreating(false);
    load();
  }

  async function handleUpdate(id, titre, description) {
    await updateAmelioration(id, { titre, description: description || null });
    setEditingId(null);
    load();
  }

  async function handleStatutChange(id, statut) {
    await updateAmelioration(id, { statut });
    load();
  }

  async function handleDelete(id) {
    await deleteAmelioration(id);
    load();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-medium text-gray-900">Demandes d'amélioration</h1>

      <div className="mb-6 space-y-4 rounded-xl border border-gray-200 bg-white p-4">
        <div>
          <div className="mb-1 text-sm text-gray-600">Statut</div>
          <div className="flex flex-wrap gap-2">
            {STATUTS.map((s) => (
              <Pill
                key={s}
                label={STATUT_LABELS[s]}
                active={statutsFiltre.includes(s)}
                onClick={() => setStatutsFiltre(toggleValue(statutsFiltre, s))}
              />
            ))}
          </div>
          {statutsFiltre.length === 0 && (
            <p className="mt-1 text-xs text-gray-400">Aucun filtre : affiche uniquement Nouveau + En cours.</p>
          )}
        </div>

        {demandeursDisponibles.length > 0 && (
          <div>
            <div className="mb-1 text-sm text-gray-600">Demandé par</div>
            <div className="flex flex-wrap gap-2">
              {demandeursDisponibles.map((d) => (
                <Pill
                  key={d}
                  label={d}
                  active={demandeursFiltre.includes(d)}
                  onClick={() => setDemandeursFiltre(toggleValue(demandeursFiltre, d))}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {!creating && (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="mb-6 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-accent-dark)]"
        >
          + Nouvelle demande
        </button>
      )}
      {creating && (
        <div className="mb-6">
          <AmeliorationForm onSubmit={handleCreate} onCancel={() => setCreating(false)} />
        </div>
      )}

      {items == null && <p className="text-sm text-gray-500">Chargement...</p>}
      {items && items.length === 0 && <p className="text-sm text-gray-500">Aucune demande pour ces critères.</p>}

      <div className="space-y-3">
        {items?.map((item) =>
          editingId === item.id ? (
            <AmeliorationForm
              key={item.id}
              initial={item}
              onSubmit={(titre, description) => handleUpdate(item.id, titre, description)}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <div key={item.id} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium text-gray-900">{item.titre}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUT_COLORS[item.statut]}`}>
                      {STATUT_LABELS[item.statut]}
                    </span>
                  </div>
                  {item.description && <p className="mt-1 text-sm text-gray-600">{item.description}</p>}
                  <p className="mt-2 text-xs text-gray-400">
                    Demandé par {item.demandeur} — {item.date_creation?.slice(0, 10)}
                  </p>
                </div>
              </div>

              <ImageAttachment item={item} onChange={load} />

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {STATUTS.filter((s) => s !== item.statut).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleStatutChange(item.id, s)}
                    className="rounded-lg border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:border-[var(--color-accent)]"
                  >
                    Marquer {STATUT_LABELS[s].toLowerCase()}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setEditingId(item.id)}
                  className="rounded-lg border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:border-[var(--color-accent)]"
                >
                  Modifier
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  className="text-xs text-red-600 underline"
                >
                  Supprimer
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
