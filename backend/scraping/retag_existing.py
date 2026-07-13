from db.database import SessionLocal
from db.models import Parcours, ParcoursTag, Tag
from scraping.tag_detector import detect_tags


def retag_existing():
    db = SessionLocal()
    added = 0
    try:
        parcours_list = db.query(Parcours).filter(Parcours.origine == "scraping").all()
        for p in parcours_list:
            text = " ".join(
                [a.texte or "" for a in p.avis]
                + [r.description or "" for r in p.restrictions]
            )
            if not text.strip():
                continue

            existing_tags = {pt.tag.nom for pt in p.parcours_tags}
            for tag_nom in detect_tags(text):
                if tag_nom in existing_tags:
                    continue
                tag = db.query(Tag).filter(Tag.nom == tag_nom).first()
                if tag is None:
                    tag = Tag(nom=tag_nom)
                    db.add(tag)
                    db.flush()
                db.add(ParcoursTag(parcours_id=p.id, tag_id=tag.id, source="auto_texte"))
                existing_tags.add(tag_nom)
                added += 1
        db.commit()
    finally:
        db.close()

    print(f"{added} nouveaux tags ajoutés sur {len(parcours_list)} parcours.")
    return added


if __name__ == "__main__":
    retag_existing()
