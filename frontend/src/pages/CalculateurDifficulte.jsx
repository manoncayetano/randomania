import DifficultyCalculator from '../components/DifficultyCalculator';

export default function CalculateurDifficulte() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-medium text-gray-900">Calculateur d'indice de difficulté</h1>
      <DifficultyCalculator />
    </div>
  );
}
