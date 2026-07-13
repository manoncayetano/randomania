import { useRef, useState } from 'react';
import { uploadPhoto } from '../api/client';

export default function PhotoDropzone({ parcoursId, onUploaded }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  async function handleFiles(files) {
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    setUploading(true);
    setError(null);
    try {
      for (const file of imageFiles) {
        await uploadPhoto(parcoursId, file);
      }
      onUploaded?.();
    } catch (err) {
      setError("Échec de l'envoi de la photo.");
      console.error(err);
    } finally {
      setUploading(false);
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
      className={
        'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center text-sm transition ' +
        (dragging
          ? 'border-[var(--color-accent)] bg-[var(--color-tag-bg)] text-[var(--color-accent-dark)]'
          : 'border-gray-300 text-gray-500 hover:border-[var(--color-accent)]')
      }
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {uploading ? 'Envoi en cours...' : 'Glisser-déposer une photo ici, ou cliquer pour en choisir une'}
      {error && <p className="mt-1 text-red-600">{error}</p>}
    </div>
  );
}
