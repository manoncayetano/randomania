import { useEffect, useState } from 'react';
import { listRefuges } from '../api/client';

// Les refuges changent rarement : un cache mémoire partagé évite de refetch à chaque montage de carte.
let cache = null;

export function useRefuges(enabled) {
  const [refuges, setRefuges] = useState(cache || []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || cache) return;
    let annule = false;
    setLoading(true);
    listRefuges()
      .then((data) => {
        cache = data;
        if (!annule) setRefuges(data);
      })
      .finally(() => {
        if (!annule) setLoading(false);
      });
    return () => {
      annule = true;
    };
  }, [enabled]);

  return { refuges: enabled ? refuges : [], loading };
}
