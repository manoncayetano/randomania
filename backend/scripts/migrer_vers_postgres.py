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

from db.database import Base, DB_PATH

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    print("DATABASE_URL n'est pas définie (voir backend/.env.example). Rien à faire.")
    sys.exit(1)

if not DB_PATH.exists():
    print(f"Aucune base SQLite trouvée à {DB_PATH}. Rien à migrer.")
    sys.exit(1)

TABLES_A_IGNORER = {"sessions_utilisateur"}

source_engine = create_engine(f"sqlite:///{DB_PATH}")
cible_engine = create_engine(DATABASE_URL)

print(f"Source  : {DB_PATH}")
print(f"Cible   : {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else DATABASE_URL}")
print()

Base.metadata.create_all(bind=cible_engine)

with source_engine.connect() as source_conn, cible_engine.begin() as cible_conn:
    for table in Base.metadata.sorted_tables:
        if table.name in TABLES_A_IGNORER:
            print(f"  {table.name:<25} ignorée")
            continue

        lignes = [dict(row._mapping) for row in source_conn.execute(table.select())]
        if not lignes:
            print(f"  {table.name:<25} 0 ligne")
            continue

        cible_conn.execute(table.insert(), lignes)
        print(f"  {table.name:<25} {len(lignes)} ligne(s) copiée(s)")

        pk_cols = [c.name for c in table.primary_key.columns]
        if len(pk_cols) == 1 and pk_cols[0] == "id":
            cible_conn.execute(text(
                f"SELECT setval(pg_get_serial_sequence('{table.name}', 'id'), "
                f"COALESCE((SELECT MAX(id) FROM {table.name}), 1))"
            ))

print()
print("Terminé. Pense à migrer aussi les fichiers déjà uploadés (photos/GPX/images de")
print("demandes) vers Supabase Storage : voir backend/scripts/migrer_fichiers_vers_supabase.py")
