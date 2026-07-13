from db import models
from db.database import Base, engine


def init_db():
    Base.metadata.create_all(bind=engine)
    print(f"Base initialisée : {engine.url}")


if __name__ == "__main__":
    init_db()
