export default function TagBadge({ label }) {
  return (
    <span className="inline-block rounded-full bg-[var(--color-tag-bg)] px-3 py-1 text-xs font-medium text-[var(--color-tag-text)]">
      {label}
    </span>
  );
}
