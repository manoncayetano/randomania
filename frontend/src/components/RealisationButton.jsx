import { useState } from 'react';
import { addRealisation, removeRealisation } from '../api/client';
import { useUser } from '../context/UserContext';

export default function RealisationButton({ parcoursId, initialRealisee = false, initialDate = null }) {
  const { utilisateur } = useUser();
  const [realisee, setRealisee] = useState(initialRealisee);
  const [date, setDate] = useState(initialDate || '');
  const [busy, setBusy] = useState(false);

  if (!utilisateur) return null;

  async function toggle() {
    if (busy) return;
    setBusy(true);
    const next = !realisee;
    setRealisee(next);
    try {
      if (next) {
        const today = new Date().toISOString().slice(0, 10);
        setDate(today);
        await addRealisation(parcoursId, today);
      } else {
        await removeRealisation(parcoursId);
      }
    } catch (err) {
      setRealisee(!next);
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  async function updateDate(e) {
    const value = e.target.value;
    setDate(value);
    try {
      await addRealisation(parcoursId, value);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={toggle}
        className={
          'rounded-full border px-3 py-1 text-sm font-medium transition ' +
          (realisee
            ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-white'
            : 'border-gray-300 bg-white text-gray-600 hover:border-[var(--color-accent)]')
        }
      >
        {realisee ? 'Réalisée ✓' : 'Marquer comme réalisée'}
      </button>
      {realisee && (
        <input
          type="date"
          value={date}
          onChange={updateDate}
          className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
        />
      )}
    </div>
  );
}
