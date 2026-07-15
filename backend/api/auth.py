import os
from typing import List, Optional

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from db.database import get_db
from db.models import SessionUtilisateur, Utilisateur
from generation.auth import (
    SESSION_COOKIE_NAME,
    SESSION_DURATION_DAYS,
    generate_session_token,
    hash_token,
    is_expired,
    new_session_expiration,
    verify_password,
)

router = APIRouter()

# En production derrière HTTPS, définir COOKIE_SECURE=true dans l'environnement du serveur.
COOKIE_SECURE = os.environ.get("COOKIE_SECURE", "false").lower() == "true"


class LoginIn(BaseModel):
    identifiant: str
    mot_de_passe: str


class UtilisateurOut(BaseModel):
    identifiant: str
    nom_affichage: str


def get_current_user(
    session_token: Optional[str] = Cookie(default=None, alias=SESSION_COOKIE_NAME),
    db: Session = Depends(get_db),
) -> Utilisateur:
    if not session_token:
        raise HTTPException(status_code=401, detail="Non authentifié")

    token_hash = hash_token(session_token)
    session = db.query(SessionUtilisateur).filter(SessionUtilisateur.token_hash == token_hash).first()
    if session is None:
        raise HTTPException(status_code=401, detail="Session invalide")

    if is_expired(session.date_expiration):
        db.delete(session)
        db.commit()
        raise HTTPException(status_code=401, detail="Session expirée")

    utilisateur = db.query(Utilisateur).filter(Utilisateur.id == session.utilisateur_id).first()
    if utilisateur is None:
        raise HTTPException(status_code=401, detail="Utilisateur introuvable")
    return utilisateur


def get_current_username(utilisateur: Utilisateur = Depends(get_current_user)) -> str:
    # Nom utilisé comme clé dans les tables favoris/réalisations/projets (compatibilité avec les données existantes).
    return utilisateur.nom_affichage


def _set_session_cookie(response: Response, token: str):
    # SameSite=None est nécessaire dès que le frontend et le backend sont sur des
    # domaines différents (ex : Vercel + Render) — mais exige Secure=True, d'où le lien
    # avec COOKIE_SECURE. En local (même origine via le proxy Vite), "lax" suffit.
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="none" if COOKIE_SECURE else "lax",
        secure=COOKIE_SECURE,
        max_age=SESSION_DURATION_DAYS * 24 * 3600,
        path="/",
    )


@router.post("/auth/login", response_model=UtilisateurOut)
def login(body: LoginIn, response: Response, db: Session = Depends(get_db)):
    identifiant_normalise = body.identifiant.strip().lower()
    utilisateur = db.query(Utilisateur).filter(func.lower(Utilisateur.identifiant) == identifiant_normalise).first()
    if utilisateur is None or not verify_password(body.mot_de_passe, utilisateur.mot_de_passe_hash):
        raise HTTPException(status_code=401, detail="Identifiant ou mot de passe incorrect")

    token = generate_session_token()
    db.add(SessionUtilisateur(
        utilisateur_id=utilisateur.id,
        token_hash=hash_token(token),
        date_expiration=new_session_expiration(),
    ))
    db.commit()

    _set_session_cookie(response, token)
    return UtilisateurOut(identifiant=utilisateur.identifiant, nom_affichage=utilisateur.nom_affichage)


@router.post("/auth/logout")
def logout(
    response: Response,
    session_token: Optional[str] = Cookie(default=None, alias=SESSION_COOKIE_NAME),
    db: Session = Depends(get_db),
):
    if session_token:
        token_hash = hash_token(session_token)
        db.query(SessionUtilisateur).filter(SessionUtilisateur.token_hash == token_hash).delete()
        db.commit()
    response.delete_cookie(SESSION_COOKIE_NAME, path="/")
    return {"status": "ok"}


@router.get("/auth/me", response_model=UtilisateurOut)
def me(utilisateur: Utilisateur = Depends(get_current_user)):
    return UtilisateurOut(identifiant=utilisateur.identifiant, nom_affichage=utilisateur.nom_affichage)


@router.get("/utilisateurs", response_model=List[str])
def list_utilisateurs(db: Session = Depends(get_db), _utilisateur: Utilisateur = Depends(get_current_user)):
    rows = db.query(Utilisateur.nom_affichage).order_by(Utilisateur.nom_affichage).all()
    return [r[0] for r in rows]
