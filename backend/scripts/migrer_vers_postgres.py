"""
Copie toutes les données de la base SQLite locale (data/rando.db) vers la base
Postgres désignée par DATABASE_URL, table par table, en respectant l'ordre des clés
étrangères. À exécuter une seule fois, après avoir :
  1. créé le projet Supabase (Postgres + bucket Storage),
  2. exécuté backend/scripts/postgres_setup.sql dans l'éditeur SQL Supabase,
  3. défini DATABASE_URL (et si besoin SUPABASE_*) dans backend/.env.

Les sessions utilisateur (sessions_utilisateur) ne sont volontairement pas copiées :
tout le monde devra simplement se reconnecter une fois sur la nouvelle base.

Usage :
    cd backend
    python scripts/migrer_vers_postgres.py
"""
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv

load_dotenv()

from sqlalchemy import create_engine, text

from db import models  # noqa: F401 - enregistre les tables sur Base.metadata
from db.database import Base, DB_PATH

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    print("DATABASE_URL n'est pas définie (voir backend/.env.example). Rien à faire.")
    sys.exit(1)

if not DB_PATH.exists():
    print(f"Aucune base SQLite trouvée à {DB_PATH}. Rien à migrer.")
    sys.exit(1)

TABLES_A_IGNORER = {"sessions_utilisateur"}

# parcours.cover_photo_id référence photos.id, et photos.parcours_id référence
# parcours.id : cycle de clés étrangères que sorted_tables ne peut pas résoudre.
# On insère donc les parcours avec cover_photo_id vidé, puis on le restaure une
# fois que les photos existent.
TABLE_AVEC_CYCLE = "parcours"
COLONNE_CYCLE = "cover_photo_id"

source_engine = create_engine(f"sqlite:///{DB_PATH}")
cible_engine = create_engine(DATABASE_URL)

print(f"Source  : {DB_PATH}")
print(f"Cible   : {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else DATABASE_URL}")
print()

Base.metadata.create_all(bind=cible_engine)

with source_engine.connect() as source_conn, cible_engine.begin() as cible_conn:
    cover_photo_ids_a_restaurer = {}

    for table in Base.metadata.sorted_tables:
        if table.name in TABLES_A_IGNORER:
            print(f"  {table.name:<25} ignorée")
            continue

        lignes = [dict(row._mapping) for row in source_conn.execute(table.select())]
        if not lignes:
            print(f"  {table.name:<25} 0 ligne")
            continue

        if table.name == TABLE_AVEC_CYCLE:
            for ligne in lignes:
                if ligne.get(COLONNE_CYCLE) is not None:
                    cover_photo_ids_a_restaurer[ligne["id"]] = ligne[COLONNE_CYCLE]
                    ligne[COLONNE_CYCLE] = None

        cible_conn.execute(table.insert(), lignes)
        print(f"  {table.name:<25} {len(lignes)} ligne(s) copiée(s)")

        pk_cols = [c.name for c in table.primary_key.columns]
        if len(pk_cols) == 1 and pk_cols[0] == "id":
            cible_conn.execute(text(
                f"SELECT setval(pg_get_serial_sequence('{table.name}', 'id'), "
                f"COALESCE((SELECT MAX(id) FROM {table.name}), 1))"
            ))

    if cover_photo_ids_a_restaurer:
        parcours_table = Base.metadata.tables[TABLE_AVEC_CYCLE]
        for parcours_id, photo_id in cover_photo_ids_a_restaurer.items():
            cible_conn.execute(
                parcours_table.update()
                .where(parcours_table.c.id == parcours_id)
                .values(**{COLONNE_CYCLE: photo_id})
            )
        print(f"  {TABLE_AVEC_CYCLE + '.' + COLONNE_CYCLE:<25} {len(cover_photo_ids_a_restaurer)} valeur(s) restaurée(s)")

print()
print("Terminé. Pense à migrer aussi les fichiers déjà uploadés (photos/GPX/images de")
print("demandes) vers Supabase Storage : voir backend/scripts/migrer_fichiers_vers_supabase.py")
