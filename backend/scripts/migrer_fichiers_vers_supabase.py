"""
Envoie les fichiers déjà stockés localement (data/photos, data/gpx, data/ameliorations)
vers Supabase Storage, et met à jour les lignes correspondantes en base avec les
nouvelles URLs. Ne touche pas aux photos dont l'URL pointe déjà vers un site externe
(ex : Visorando) — celles-ci n'ont jamais été téléchargées localement.

À exécuter APRÈS migrer_vers_postgres.py (la base cible doit déjà contenir les
données), avec SUPABASE_URL/SUPABASE_SERVICE_KEY définies dans backend/.env.

Usage :
    cd backend
    python scripts/migrer_fichiers_vers_supabase.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv

load_dotenv()

import storage
from db.database import DATA_DIR, SessionLocal
from db.models import Amelioration, Parcours, Photo

if not storage.MODE_SUPABASE:
    print("SUPABASE_URL/SUPABASE_SERVICE_KEY ne sont pas définies (voir backend/.env.example).")
    sys.exit(1)


def _migrer(chemin_relatif: str) -> str | None:
    """Lit le fichier local dont le chemin (relatif à DATA_DIR, ex: 'photos/181/xxx.jpg')
    correspond à une URL '/media/...' en base, et l'envoie sur Supabase Storage.
    Retourne la nouvelle URL, ou None si le fichier est introuvable."""
    fichier_local = DATA_DIR / chemin_relatif
    if not fichier_local.exists():
        print(f"    fichier introuvable, ignoré : {fichier_local}")
        return None
    dossier = str(Path(chemin_relatif).parent).replace("\\", "/")
    filename = fichier_local.name
    return storage.save_file(dossier, filename, fichier_local.read_bytes(), storage.guess_content_type(fichier_local.suffix))


db = SessionLocal()

print("Photos...")
for photo in db.query(Photo).filter(Photo.url_ou_chemin.like("/media/photos/%")).all():
    nouvelle_url = _migrer(photo.url_ou_chemin[len("/media/"):])
    if nouvelle_url:
        photo.url_ou_chemin = nouvelle_url
        print(f"  photo {photo.id} -> {nouvelle_url}")

print("GPX...")
for parcours in db.query(Parcours).filter(Parcours.gpx_path.like("/media/gpx/%")).all():
    nouvelle_url = _migrer(parcours.gpx_path[len("/media/"):])
    if nouvelle_url:
        parcours.gpx_path = nouvelle_url
        print(f"  parcours {parcours.id} -> {nouvelle_url}")

print("Images des demandes d'amélioration...")
for amelioration in db.query(Amelioration).filter(Amelioration.image_path.like("/media/ameliorations/%")).all():
    nouvelle_url = _migrer(amelioration.image_path[len("/media/"):])
    if nouvelle_url:
        amelioration.image_path = nouvelle_url
        print(f"  amélioration {amelioration.id} -> {nouvelle_url}")

db.commit()
print()
print("Terminé.")
