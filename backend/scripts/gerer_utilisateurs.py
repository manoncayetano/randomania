"""Petit outil en ligne de commande pour créer ou réinitialiser un compte utilisateur.

Usage :
    python scripts/gerer_utilisateurs.py creer <identifiant> <nom_affichage> <mot_de_passe>
    python scripts/gerer_utilisateurs.py mot-de-passe <identifiant> <nouveau_mot_de_passe>
    python scripts/gerer_utilisateurs.py lister
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from db.database import SessionLocal
from db.models import Utilisateur
from generation.auth import hash_password


def creer(identifiant: str, nom_affichage: str, mot_de_passe: str):
    db = SessionLocal()
    try:
        if db.query(Utilisateur).filter(Utilisateur.identifiant == identifiant).first():
            print(f"Le compte '{identifiant}' existe déjà.")
            return
        db.add(Utilisateur(
            identifiant=identifiant,
            nom_affichage=nom_affichage,
            mot_de_passe_hash=hash_password(mot_de_passe),
        ))
        db.commit()
        print(f"Compte '{identifiant}' ({nom_affichage}) créé.")
    finally:
        db.close()


def changer_mot_de_passe(identifiant: str, nouveau_mot_de_passe: str):
    db = SessionLocal()
    try:
        utilisateur = db.query(Utilisateur).filter(Utilisateur.identifiant == identifiant).first()
        if utilisateur is None:
            print(f"Compte '{identifiant}' introuvable.")
            return
        utilisateur.mot_de_passe_hash = hash_password(nouveau_mot_de_passe)
        db.commit()
        print(f"Mot de passe mis à jour pour '{identifiant}'.")
    finally:
        db.close()


def lister():
    db = SessionLocal()
    try:
        for u in db.query(Utilisateur).order_by(Utilisateur.id).all():
            print(f"{u.id}\t{u.identifiant}\t{u.nom_affichage}\t(créé le {u.date_creation})")
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    action = sys.argv[1]
    if action == "creer" and len(sys.argv) == 5:
        creer(sys.argv[2], sys.argv[3], sys.argv[4])
    elif action == "mot-de-passe" and len(sys.argv) == 4:
        changer_mot_de_passe(sys.argv[2], sys.argv[3])
    elif action == "lister":
        lister()
    else:
        print(__doc__)
        sys.exit(1)
