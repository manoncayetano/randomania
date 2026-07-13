import { useRef, useState } from 'react';
import { uploadGpx, uploadPhoto } from '../api/client';

export default function UploadDropzone({ parcoursId, heroPhotoUrl, alt, onUploaded }) {
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  async function handleFiles(files) {
    const list = Array.from(files);
    if (list.length === 0) return;

    setBusy(true);
    setError(null);
    try {
      for (const file of list) {
        if (file.name.toLowerCase().endsWith('.gpx')) {
          await uploadGpx(parcoursId, file);
        } else if (file.type.startsWith('image/')) {
          await uploadPhoto(parcoursId, file);
        } else {
          setError('Format non reconnu (photo ou .gpx uniquement).');
        }
      }
      onUploaded?.();
    } catch (err) {
      setError(err.response?.data?.detail || "Échec de l'envoi du fichier.");
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      title="Glisser-déposer une photo ou un fichier .gpx, ou cliquer pour choisir"
      className={
        'relative h-24 w-32 shrink-0 cursor-pointer overflow-hidden rounded-xl border-2 border-dashed transition sm:h-28 sm:w-40 ' +
        (dragging
          ? 'border-[var(--color-accent)] bg-[var(--color-tag-bg)]'
          : 'border-gray-300 hover:border-[var(--color-accent)]')
      }
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.gpx"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {heroPhotoUrl && (
        <img src={heroPhotoUrl} alt={alt} className="absolute inset-0 h-full w-full object-cover" />
      )}

      <div
        className={
          'absolute inset-0 flex items-center justify-center p-1 text-center text-[10px] font-medium leading-tight transition ' +
          (heroPhotoUrl ? 'text-transparent hover:bg-black/45 hover:text-white' : 'bg-gray-50 text-gray-400')
        }
      >
        {busy ? 'Envoi...' : 'Glisser photo ou GPX'}
      </div>

      {error && (
        <div className="absolute inset-x-0 bottom-0 bg-red-600/90 px-1 py-0.5 text-[9px] leading-tight text-white">
          {error}
        </div>
      )}
    </div>
  );
}
