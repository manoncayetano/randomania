-- À exécuter une seule fois dans l'éditeur SQL de Supabase (Database > SQL Editor),
-- avant de lancer migrer_vers_postgres.py.
-- Nécessaire pour que les recherches insensibles aux accents (ex: "ecrins" trouve
-- "Écrins") fonctionnent comme sur SQLite.
CREATE EXTENSION IF NOT EXISTS unaccent;
