const COLORS = {
  Facile: 'bg-emerald-50 text-emerald-700',
  Modéré: 'bg-lime-50 text-lime-700',
  'Assez difficile': 'bg-amber-50 text-amber-700',
  Difficile: 'bg-orange-50 text-orange-700',
  'Très difficile': 'bg-red-50 text-red-700',
};

export default function DifficultyBadge({ indice, label, compact = false }) {
  if (indice == null) return null;
  const colorClass = COLORS[label] || 'bg-gray-100 text-gray-700';

  if (compact) {
    return (
      <span
        title={label}
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}
      >
        {indice}/100
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${colorClass}`}>
      Indice de difficulté : {label} {indice}/100
    </span>
  );
}
