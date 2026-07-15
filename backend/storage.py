"""
Abstraction de stockage des fichiers (photos, GPX, images des demandes d'amélioration).

Par défaut (aucune variable Supabase définie) : écrit sur le disque local, comme avant,
et retourne un chemin "/media/..." servi par les montages StaticFiles de main.py.

Si SUPABASE_URL et SUPABASE_SERVICE_KEY sont définies : envoie le fichier au bucket
Supabase Storage désigné et retourne l'URL publique du fichier — plus rien n'est
écrit sur le disque local dans ce mode (utile en hébergement sans disque persistant).
"""
import os

import httpx

from db.database import DATA_DIR

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")
SUPABASE_BUCKET = os.environ.get("SUPABASE_BUCKET", "randomania")

MODE_SUPABASE = bool(SUPABASE_URL and SUPABASE_SERVICE_KEY)

CONTENT_TYPES = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gpx": "application/gpx+xml",
}


def guess_content_type(ext: str) -> str:
    return CONTENT_TYPES.get(ext.lower(), "application/octet-stream")


def _object_path(dossier: str, filename: str) -> str:
    return f"{dossier}/{filename}"


def save_file(dossier: str, filename: str, contenu: bytes, content_type: str = "application/octet-stream") -> str:
    """Enregistre le fichier et retourne l'URL/chemin à stocker en base."""
    if MODE_SUPABASE:
        chemin = _object_path(dossier, filename)
        reponse = httpx.post(
            f"{SUPABASE_URL}/storage/v1/object/{SUPABASE_BUCKET}/{chemin}",
            headers={
                "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                "apikey": SUPABASE_SERVICE_KEY,
                "Content-Type": content_type,
            },
            content=contenu,
            timeout=30,
        )
        reponse.raise_for_status()
        return f"{SUPABASE_URL}/storage/v1/object/public/{SUPABASE_BUCKET}/{chemin}"

    local_dir = DATA_DIR / dossier
    local_dir.mkdir(parents=True, exist_ok=True)
    (local_dir / filename).write_bytes(contenu)
    return f"/media/{dossier}/{filename}"


def delete_file(url_ou_chemin: str, dossier: str) -> None:
    """Supprime un fichier précédemment enregistré via save_file.
    dossier : le même premier argument que celui passé à save_file (ex : "photos")."""
    if not url_ou_chemin:
        return

    if MODE_SUPABASE:
        prefixe_public = f"{SUPABASE_URL}/storage/v1/object/public/{SUPABASE_BUCKET}/"
        if not url_ou_chemin.startswith(prefixe_public):
            return
        chemin = url_ou_chemin[len(prefixe_public):]
        httpx.delete(
            f"{SUPABASE_URL}/storage/v1/object/{SUPABASE_BUCKET}/{chemin}",
            headers={
                "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                "apikey": SUPABASE_SERVICE_KEY,
            },
            timeout=30,
        )
        return

    prefixe_local = f"/media/{dossier}/"
    if url_ou_chemin.startswith(prefixe_local):
        relatif = url_ou_chemin[len(prefixe_local):]
        (DATA_DIR / dossier / relatif).unlink(missing_ok=True)


def read_file(url_ou_chemin: str, dossier: str) -> bytes:
    """Relit un fichier précédemment enregistré via save_file, quel que soit le mode
    dans lequel il a été enregistré (URL distante Supabase/externe, ou chemin local)."""
    if url_ou_chemin.startswith("http://") or url_ou_chemin.startswith("https://"):
        reponse = httpx.get(url_ou_chemin, timeout=30)
        reponse.raise_for_status()
        return reponse.content

    prefixe_local = f"/media/{dossier}/"
    if url_ou_chemin.startswith(prefixe_local):
        relatif = url_ou_chemin[len(prefixe_local):]
        return (DATA_DIR / dossier / relatif).read_bytes()

    raise FileNotFoundError(url_ou_chemin)
