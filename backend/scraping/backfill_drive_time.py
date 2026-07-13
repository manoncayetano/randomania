import time

from db.database import SessionLocal
from db.models import Parcours
from generation.routing import drive_time_minutes


def backfill_drive_time(delay: float = 1.0, limit=None):
    db = SessionLocal()
    try:
        query = db.query(Parcours).filter(
            Parcours.latitude.isnot(None),
            Parcours.longitude.isnot(None),
            Parcours.temps_voiture_min.is_(None),
        )
        if limit:
            query = query.limit(limit)
        targets = [(p.id, p.latitude, p.longitude) for p in query.all()]
    finally:
        db.close()

    print(f"{len(targets)} randos sans temps de trajet à calculer.")

    updated, errors = 0, 0
    for i, (parcours_id, lat, lon) in enumerate(targets, start=1):
        try:
            minutes = drive_time_minutes(lat, lon)
        except Exception as exc:
            print(f"[{i}/{len(targets)}] Échec id={parcours_id} : {exc}")
            errors += 1
            time.sleep(delay)
            continue

        if minutes is not None:
            db = SessionLocal()
            try:
                p = db.query(Parcours).filter(Parcours.id == parcours_id).first()
                if p:
                    p.temps_voiture_min = minutes
                    db.commit()
                    updated += 1
            finally:
                db.close()

        if i % 25 == 0:
            print(f"[{i}/{len(targets)}] traités...")
        time.sleep(delay)

    print(f"Terminé : {updated} temps de trajet ajoutés, {errors} erreurs.")
    return updated, errors


if __name__ == "__main__":
    backfill_drive_time()
