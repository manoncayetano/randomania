import os
import unicodedata
from pathlib import Path

from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)
DB_PATH = DATA_DIR / "rando.db"

DATABASE_URL = os.environ.get("DATABASE_URL")


def _strip_accents(value):
    if value is None:
        return None
    normalized = unicodedata.normalize("NFKD", value)
    return "".join(c for c in normalized if not unicodedata.combining(c))


if DATABASE_URL:
    # Postgres (ex : Supabase) — l'extension "unaccent" native doit être créée une fois
    # via backend/scripts/postgres_setup.sql, pas besoin d'enregistrer de fonction ici.
    engine = create_engine(DATABASE_URL)
else:
    engine = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False})

    @event.listens_for(engine, "connect")
    def _register_unaccent(dbapi_connection, connection_record):
        dbapi_connection.create_function("unaccent", 1, _strip_accents)


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
