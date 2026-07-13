import { useEffect, useState } from 'react';
import { addEtape, createProjet, listProjets } from '../api/client';
import { useUser } from '../context/UserContext';

export default function AjouterAuProjet({ parcoursId }) {
  const { utilisateur } = useUser();
  const [open, setOpen] = useState(false);
  const [projets, setProjets] = useState([]);
  const [selection, setSelection] = useState('');
  const [nouveauNom, setNouveauNom] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      listProjets().then(setProjets).catch(() => setProjets([]));
    }
  }, [open]);

  if (!utilisateur) return null;

  async function handleAdd(e) {
    e.preventDefault();
    setBusy(true);
    try {
      let projetId = selection;
      if (selection === '__nouveau__') {
        if (!nouveauNom.trim()) return;
        const projet = await createProjet(nouveauNom.trim());
        projetId = projet.id;
      }
      if (!projetId) return;
      await addEtape(projetId, parcoursId);
      setConfirmation('Ajouté !');
      setOpen(false);
      setSelection('');
      setNouveauNom('');
      setTimeout(() => setConfirmation(null), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-gray-300 px-3 py-1 text-sm text-gray-600 hover:border-[var(--color-accent)]"
      >
        {confirmation || '+ Projet'}
      </button>
    );
  }

  return (
    <form
      onSubmit={handleAdd}
      className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-300 p-2 text-sm"
    >
      <select
        value={selection}
        onChange={(e) => setSelection(e.target.value)}
        className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
      >
        <option value="">Choisir un projet</option>
        {projets.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nom}
          </option>
        ))}
        <option value="__nouveau__">+ Nouveau projet...</option>
      </select>
      {selection === '__nouveau__' && (
        <input
          type="text"
          value={nouveauNom}
          onChange={(e) => setNouveauNom(e.target.value)}
          placeholder="Nom du projet"
          className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
        />
      )}
      <button
        type="submit"
        disabled={busy || !selection}
        className="rounded-lg bg-[var(--color-accent)] px-3 py-1 text-sm text-white disabled:opacity-50"
      >
        Ajouter
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-gray-500 underline">
        Annuler
      </button>
    </form>
  );
}
