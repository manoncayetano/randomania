import { useEffect, useState } from 'react';
import { getLiaisonsItineraire } from '../api/client';
import { pointsForTrack } from '../utils/projetTracks';

export function useLiaisonsRoutieres(tracksVisibles) {
  const [liaisons, setLiaisons] = useState({});
  const [enCours, setEnCours] = useState(false);

  const gaps = [];
  for (let i = 0; i < tracksVisibles.length - 1; i++) {
    const aPts = pointsForTrack(tracksVisibles[i]);
    const bPts = pointsForTrack(tracksVisibles[i + 1]);
    if (aPts.length === 0 || bPts.length === 0) continue;
    gaps.push({
      key: `${tracksVisibles[i].etape.id}-${tracksVisibles[i + 1].etape.id}`,
      start: aPts[aPts.length - 1],
      end: bPts[0],
    });
  }
  const gapsKey = gaps.map((g) => g.key).join(',');

  useEffect(() => {
    const manquants = gaps.filter((g) => !(g.key in liaisons));
    if (manquants.length === 0) return undefined;

    let annule = false;
    setEnCours(true);
    getLiaisonsItineraire(manquants.map((g) => ({ start: g.start, end: g.end })))
      .then((resultats) => {
        if (annule) return;
        setLiaisons((prev) => {
          const next = { ...prev };
          manquants.forEach((g, i) => {
            next[g.key] = resultats[i] || null;
          });
          return next;
        });
      })
      .catch(() => {
        if (annule) return;
        setLiaisons((prev) => {
          const next = { ...prev };
          manquants.forEach((g) => {
            next[g.key] = null;
          });
          return next;
        });
      })
      .finally(() => {
        if (!annule) setEnCours(false);
      });

    return () => {
      annule = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gapsKey]);

  return { liaisons, enCours };
}
