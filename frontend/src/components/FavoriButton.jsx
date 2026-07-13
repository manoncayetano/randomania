import { useState } from 'react';
import { addFavori, removeFavori } from '../api/client';
import { useUser } from '../context/UserContext';

export default function FavoriButton({ parcoursId, initialFavori = false, className = '' }) {
  const { utilisateur } = useUser();
  const [favori, setFavori] = useState(initialFavori);
  const [busy, setBusy] = useState(false);

  if (!utilisateur) return null;

  async function toggle(e) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    const next = !favori;
    setFavori(next);
    try {
      if (next) {
        await addFavori(parcoursId);
      } else {
        await removeFavori(parcoursId);
      }
    } catch (err) {
      setFavori(!next);
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={favori ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      className={
        'flex h-8 w-8 items-center justify-center rounded-full text-lg transition ' +
        (favori ? 'bg-[var(--color-accent)] text-white' : 'bg-white/90 text-gray-400 hover:text-[var(--color-accent)]') +
        ' ' + className
      }
    >
      {favori ? '★' : '☆'}
    </button>
  );
}
