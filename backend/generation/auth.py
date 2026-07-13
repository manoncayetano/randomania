import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt

SESSION_COOKIE_NAME = "session_token"
SESSION_DURATION_DAYS = 30


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


def generate_session_token() -> str:
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    # Le token en clair ne transite jamais que dans le cookie httponly : on ne stocke que son
    # hash en base, pour qu'une fuite de la base ne permette pas de rejouer une session.
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def new_session_expiration() -> str:
    return (datetime.now(timezone.utc) + timedelta(days=SESSION_DURATION_DAYS)).isoformat()


def is_expired(date_expiration_iso: str) -> bool:
    expiration = datetime.fromisoformat(date_expiration_iso)
    if expiration.tzinfo is None:
        expiration = expiration.replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc) > expiration
