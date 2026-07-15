import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

export default function OutilsMenu() {
  const [ouvert, setOuvert] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOuvert(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOuvert((v) => !v)}
        className="text-sm text-gray-500 hover:text-[var(--color-accent-dark)]"
      >
        Outils
      </button>
      {ouvert && (
        <div className="absolute left-0 top-full z-10 mt-2 w-64 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          <Link
            to="/outils/calculateur-difficulte"
            onClick={() => setOuvert(false)}
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-[var(--color-tag-bg)] hover:text-[var(--color-accent-dark)]"
          >
            Calculateur d'indice de difficulté
          </Link>
        </div>
      )}
    </div>
  );
}
