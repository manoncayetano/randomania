import { Link } from 'react-router-dom';
import DifficultyCalculator from '../components/DifficultyCalculator';

export default function Home() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="text-3xl font-medium text-gray-900">Randonnées</h1>
      <p className="mt-2 text-gray-500">
        Trouve un parcours existant selon tes critères, ou reviens plus tard pour en générer un.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          to="/recherche"
          className="inline-block rounded-lg bg-[var(--color-accent)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-accent-dark)]"
        >
          Rechercher un parcours
        </Link>
        <Link
          to="/importer"
          className="inline-block rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:border-[var(--color-accent)]"
        >
          Importer une rando
        </Link>
      </div>

      <div className="mt-10 text-left">
        <DifficultyCalculator />
      </div>
    </div>
  );
}
