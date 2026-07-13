import { useState } from 'react';
import { deletePhoto, setCoverPhoto } from '../api/client';

export default function PhotoCarousel({ photos, coverPhotoId, parcoursId, onChange }) {
  const [index, setIndex] = useState(0);

  if (!photos || photos.length === 0) return null;
  const current = photos[Math.min(index, photos.length - 1)];

  function prev() {
    setIndex((i) => (i - 1 + photos.length) % photos.length);
  }

  function next() {
    setIndex((i) => (i + 1) % photos.length);
  }

  async function makeCover() {
    await setCoverPhoto(parcoursId, current.id);
    onChange?.();
  }

  async function remove() {
    await deletePhoto(current.id);
    setIndex(0);
    onChange?.();
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="relative">
        <img src={current.url} alt="" className="h-64 w-full object-cover sm:h-80" />

        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={next}
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow"
            >
              ›
            </button>
          </>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 p-3">
        <div className="flex gap-1">
          {photos.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setIndex(i)}
              className={
                'h-2 w-2 rounded-full ' + (i === index ? 'bg-[var(--color-accent)]' : 'bg-gray-300')
              }
            />
          ))}
        </div>

        {parcoursId && (
          <div className="flex gap-2 text-sm">
            <button
              type="button"
              onClick={makeCover}
              disabled={current.id === coverPhotoId}
              className="text-[var(--color-accent-dark)] underline disabled:text-gray-400 disabled:no-underline"
            >
              {current.id === coverPhotoId ? 'Photo de couverture' : 'Définir comme couverture'}
            </button>
            <button type="button" onClick={remove} className="text-red-600 underline">
              Supprimer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
