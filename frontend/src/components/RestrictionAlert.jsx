export default function RestrictionAlert({ restriction }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div className="text-sm font-medium text-amber-800">{restriction.type}</div>
      <p className="mt-1 text-sm text-amber-900">{restriction.description}</p>
      <p className="mt-2 text-xs text-amber-700">
        Mis à jour le {restriction.date_maj ?? 'date inconnue'} — à vérifier sur place / sur le site source avant de
        partir. Cette information n'est pas garantie à 100%.
      </p>
    </div>
  );
}
