from pathlib import Path

from fastapi import Depends, FastAPI
from fastapi.staticfiles import StaticFiles

from api.ameliorations import router as ameliorations_router
from api.auth import get_current_user
from api.auth import router as auth_router
from api.favoris import router as favoris_router
from api.gpx import router as gpx_router
from api.import_rando import router as import_router
from api.outils import router as outils_router
from api.photos import router as photos_router
from api.projets import router as projets_router
from api.realisations import router as realisations_router
from api.refuges import router as refuges_router
from api.search import router as search_router
from api.suggestions import router as suggestions_router
from api.tags import router as tags_router

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
(DATA_DIR / "photos").mkdir(parents=True, exist_ok=True)
(DATA_DIR / "gpx").mkdir(parents=True, exist_ok=True)
(DATA_DIR / "ameliorations").mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Rando App API", version="0.1.0")

# /auth/login n'exige pas de session ; tout le reste de l'API exige une session valide.
app.include_router(auth_router)

_authenticated = [Depends(get_current_user)]
app.include_router(search_router, dependencies=_authenticated)
app.include_router(tags_router, dependencies=_authenticated)
app.include_router(favoris_router, dependencies=_authenticated)
app.include_router(outils_router, dependencies=_authenticated)
app.include_router(realisations_router, dependencies=_authenticated)
app.include_router(photos_router, dependencies=_authenticated)
app.include_router(import_router, dependencies=_authenticated)
app.include_router(gpx_router, dependencies=_authenticated)
app.include_router(projets_router, dependencies=_authenticated)
app.include_router(refuges_router, dependencies=_authenticated)
app.include_router(suggestions_router, dependencies=_authenticated)
app.include_router(ameliorations_router, dependencies=_authenticated)

app.mount("/media/photos", StaticFiles(directory=str(DATA_DIR / "photos")), name="photos")
app.mount("/media/gpx", StaticFiles(directory=str(DATA_DIR / "gpx")), name="gpx")
app.mount("/media/ameliorations", StaticFiles(directory=str(DATA_DIR / "ameliorations")), name="ameliorations")


@app.get("/")
def root():
    return {"status": "ok", "service": "rando-app-api"}
