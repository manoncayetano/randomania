import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  deleteProjet,
  getProjet,
  getStatsChevauchement,
  removeEtape,
  renameProjet,
  updateEtape,
} from '../api/client';
import ProjetMap from '../components/ProjetMap';
import ProjetElevationProfile from '../components/ProjetElevationProfile';
import DifficultyBadge from '../components/DifficultyBadge';
import { useLiaisonsRoutieres } from '../hooks/useLiaisonsRoutieres';
import { buildTracks } from '../utils/projetTracks';

export default function ProjetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [projet, setProjet] = useState(null);
  const [error, setError] = useState(null);
  const [nomDraft, setNomDraft] = useState('');
  const [masquees, setMasquees] = useState(() => new Set());
  const [statsChevauchement, setStatsChevauchement] = useState(null);
  const [statsEnCours, setStatsEnCours] = useState(false);
  const [hoverPoint, setHoverPoint] = useState(null);

  const load = useCallback(() => {
    getProjet(id)
      .then((data) => {
        setProjet(data);
        setNomDraft(data.nom);
      })
      .catch(() => setError('Projet introuvable.'));
  }, [id]);

  useEffect(load, [load]);

  const etapesVisibles = projet ? projet.etapes.filter((e) => !masquees.has(e.id)) : [];
  const etapesVisiblesKey = etapesVisibles.map((e) => e.id).join(',');

  const tracks = projet ? buildTracks(projet.etapes) : [];
  const tracksVisibles = tracks.filter((t) => !masquees.has(t.etape.id));
  const { liaisons, enCours: liaisonsEnCours } = useLiaisonsRoutieres(tracksVisibles);

  useEffect(() => {
    if (!id || etapesVisibles.length === 0) {
      setStatsChevauchement(null);
      return undefined;
    }
    let annule = false;
    setStatsEnCours(true);
    getStatsChevauchement(id, etapesVisibles.map((e) => e.id))
      .then((data) => {
        if (!annule) setStatsChevauchement(data);
      })
      .catch(() => {
        if (!annule) setStatsChevauchement(null);
      })
      .finally(() => {
        if (!annule) setStatsEnCours(false);
      });
    return () => {
      annule = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, etapesVisiblesKey]);

  if (error) return <div className="mx-auto max-w-4xl px-4 py-8 text-sm text-red-600">{error}</div>;
  if (!projet) return <div className="mx-auto max-w-4xl px-4 py-8 text-sm text-gray-500">Chargement...</div>;

  const distanceNaive = etapesVisibles.reduce((sum, e) => sum + (e.parcours.distance_km || 0), 0);
  const deniveleNaive = etapesVisibles.reduce((sum, e) => sum + (e.parcours.denivele_positif || 0), 0);
  const deniveleNegNaive = etapesVisibles.reduce((sum, e) => sum + (e.parcours.denivele_negatif || 0), 0);
  const dureeMinNaive = etapesVisibles.reduce((sum, e) => sum + (e.parcours.duree_marche_min || 0), 0);
  const dureeMaxNaive = etapesVisibles.reduce((sum, e) => sum + (e.parcours.duree_marche_max || 0), 0);
  const jours = [...new Set(etapesVisibles.map((e) => e.jour).filter((j) => j != null))].sort((a, b) => a - b);

  const distanceVisible = statsChevauchement?.distance_km ?? distanceNaive;
  const deniveleVisible = statsChevauchement?.denivele_positif ?? deniveleNaive;
  const deniveleNegVisible = statsChevauchement?.denivele_negatif ?? deniveleNegNaive;
  const dureeMinVisible = statsChevauchement?.duree_marche_min ?? dureeMinNaive;
  const dureeMaxVisible = statsChevauchement?.duree_marche_max ?? dureeMaxNaive;
  const chevauchementKm = statsChevauchement?.chevauchement_km_total ?? 0;

  function handleToggleEtape(etapeId) {
    setMasquees((prev) => {
      const next = new Set(prev);
      if (next.has(etapeId)) {
        next.delete(etapeId);
      } else {
        next.add(etapeId);
      }
      return next;
    });
  }

  async function handleRename() {
    if (nomDraft.trim() && nomDraft !== projet.nom) {
      await renameProjet(id, nomDraft.trim());
      load();
    }
  }

  async function handleDelete() {
    await deleteProjet(id);
    navigate('/projets');
  }

  async function handleRemoveEtape(etapeId) {
    await removeEtape(id, etapeId);
    load();
  }

  async function handleMove(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= projet.etapes.length) return;
    const a = projet.etapes[index];
    const b = projet.etapes[target];
    await Promise.all([
      updateEtape(id, a.id, { ordre: b.ordre }),
      updateEtape(id, b.id, { ordre: a.ordre }),
    ]);
    load();
  }

  async function handleJourChange(etapeId, jour) {
    await updateEtape(id, etapeId, { jour: jour === '' ? null : Number(jour) });
    load();
  }

  async function handleNotesChange(etapeId, notes) {
    await updateEtape(id, etapeId, { notes });
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link to="/projets" className="text-sm text-[var(--color-accent-dark)] underline">
        ← Mes projets
      </Link>

      <div className="mt-2 flex items-center gap-2">
        <input
          type="text"
          value={nomDraft}
          onChange={(e) => setNomDraft(e.target.value)}
          onBlur={handleRename}
          className="flex-1 rounded-lg border border-transparent px-2 py-1 text-2xl font-medium text-gray-900 hover:border-gray-300 focus:border-[var(--color-accent)] focus:outline-none"
        />
        <button type="button" onClick={handleDelete} className="text-sm text-red-600 underline">
          Supprimer le projet
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-[var(--color-accent-dark)]">
        <span>
          {etapesVisibles.length} rando{etapesVisibles.length !== 1 ? 's' : ''} affichée{etapesVisibles.length !== 1 ? 's' : ''}
          {etapesVisibles.length !== projet.etapes.length ? ` sur ${projet.etapes.length}` : ''}
        </span>
        <span>{distanceVisible.toFixed(1)} km</span>
        <span>+{Math.round(deniveleVisible)} m / -{Math.round(deniveleNegVisible)} m</span>
        {(dureeMinVisible > 0 || dureeMaxVisible > 0) && (
          <span>{dureeMinVisible.toFixed(1)}–{dureeMaxVisible.toFixed(1)} h de marche</span>
        )}
        {jours.length > 0 && <span>{jours.length} jour{jours.length !== 1 ? 's' : ''}</span>}
      </div>
      {etapesVisibles.length !== projet.etapes.length && (
        <p className="mt-1 text-xs text-gray-400">
          Calculé sur les randos affichées sur la carte — clique un nom masqué pour le réintégrer.
        </p>
      )}
      {statsEnCours && (
        <p className="mt-1 text-xs text-gray-400">Analyse des tracés GPX pour éviter les doublons...</p>
      )}
      {!statsEnCours && chevauchementKm > 0.05 && (
        <p className="mt-1 text-xs text-gray-400">
          dont ~{chevauchementKm.toFixed(1)} km de tronçons communs entre randos, déduits pour ne pas être comptés deux fois.
        </p>
      )}

      {projet.etapes.length > 0 && (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ProjetMap
            etapes={projet.etapes}
            masquees={masquees}
            onToggle={handleToggleEtape}
            liaisons={liaisons}
            liaisonsEnCours={liaisonsEnCours}
            hoverPoint={hoverPoint}
          />
          <ProjetElevationProfile etapes={projet.etapes} masquees={masquees} liaisons={liaisons} onHover={setHoverPoint} />
        </div>
      )}

      <div className="mt-6 space-y-3">
        {projet.etapes.length === 0 && (
          <p className="text-sm text-gray-500">
            Aucune étape pour l'instant. Ajoute des randos depuis leur fiche ou depuis "Randos autour".
          </p>
        )}

        {projet.etapes.map((etape, index) => (
          <div
            key={etape.id}
            className={`flex gap-3 rounded-xl border border-gray-200 bg-white p-3 ${masquees.has(etape.id) ? 'opacity-50' : ''}`}
          >
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => handleMove(index, -1)}
                disabled={index === 0}
                className="text-gray-400 hover:text-[var(--color-accent-dark)] disabled:opacity-30"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => handleMove(index, 1)}
                disabled={index === projet.etapes.length - 1}
                className="text-gray-400 hover:text-[var(--color-accent-dark)] disabled:opacity-30"
              >
                ▼
              </button>
            </div>

            {etape.parcours.photo && (
              <img src={etape.parcours.photo} alt="" className="h-20 w-24 shrink-0 rounded-lg object-cover" />
            )}

            <div className="min-w-0 flex-1">
              <Link
                to={`/parcours/${etape.parcours.id}`}
                className="font-medium text-gray-900 hover:text-[var(--color-accent-dark)]"
              >
                {etape.parcours.nom}
              </Link>
              {masquees.has(etape.id) && (
                <span className="ml-2 text-xs text-gray-400">(masquée, hors calcul)</span>
              )}
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--color-accent-dark)]">
                <span>{etape.parcours.distance_km} km</span>
                <span>+{etape.parcours.denivele_positif} m</span>
                <DifficultyBadge indice={etape.parcours.indice_difficulte} label={etape.parcours.indice_difficulte_label} />
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-1 text-sm text-gray-600">
                  Jour
                  <input
                    type="number"
                    min="1"
                    defaultValue={etape.jour ?? ''}
                    onBlur={(e) => handleJourChange(etape.id, e.target.value)}
                    className="w-16 rounded-lg border border-gray-300 px-2 py-1 text-sm"
                  />
                </label>
                <input
                  type="text"
                  defaultValue={etape.notes ?? ''}
                  onBlur={(e) => handleNotesChange(etape.id, e.target.value)}
                  placeholder="Notes (bivouac, refuge...)"
                  className="min-w-0 flex-1 rounded-lg border border-gray-300 px-2 py-1 text-sm"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleRemoveEtape(etape.id)}
              className="self-start text-sm text-red-600 underline"
            >
              Retirer
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
