import { useRef, useState } from 'react';
import { deleteGpx, uploadGpx } from '../api/client';

export default function GpxDropzone({ parcoursId, hasGpx, onChange }) {
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  async function handleFiles(files) {
    const file = Array.from(files).find((f) => f.name.toLowerCase().endsWith('.gpx'));
    if (!file) {
      setError('Le fichier doit être au format .gpx');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await uploadGpx(parcoursId, file);
      onChange?.();
    } catch (err) {
      setError(err.response?.data?.detail || "Échec de l'import du GPX.");
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(e) {
    e.stopPropagation();
    setBusy(true);
    try {
      await deleteGpx(parcoursId);
      onChange?.();
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      className={
        'flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed p-4 text-center text-sm transition ' +
        (dragging
          ? 'border-[var(--color-accent)] bg-[var(--color-tag-bg)] text-[var(--color-accent-dark)]'
          : 'border-gray-300 text-gray-500 hover:border-[var(--color-accent)]')
      }
    >
      <input
        ref={inputRef}
        type="file"
        accept=".gpx"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {busy
        ? 'Traitement en cours...'
        : hasGpx
          ? 'Tracé GPX importé — glisser-déposer pour remplacer'
          : 'Glisser-déposer un fichier .gpx ici, ou cliquer pour en choisir un'}
      {hasGpx && !busy && (
        <button type="button" onClick={handleDelete} className="text-red-600 underline">
          Supprimer le tracé
        </button>
      )}
      {error && <p className="text-red-600">{error}</p>}
    </div>
  );
}
