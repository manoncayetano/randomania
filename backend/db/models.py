from sqlalchemy import (
    CheckConstraint,
    Column,
    Float,
    ForeignKey,
    Integer,
    Text,
    UniqueConstraint,
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from db.database import Base


class Parcours(Base):
    __tablename__ = "parcours"

    id = Column(Integer, primary_key=True, autoincrement=True)
    nom = Column(Text, nullable=False)
    zone = Column(Text)
    niveau = Column(Text)
    distance_km = Column(Float)
    denivele_positif = Column(Integer)
    denivele_negatif = Column(Integer)
    duree_jours = Column(Integer)
    duree_marche_min = Column(Float)
    duree_marche_max = Column(Float)
    origine = Column(Text)
    url_source = Column(Text)
    date_ajout = Column(Text, server_default=func.current_timestamp())
    date_maj = Column(Text)
    gpx_path = Column(Text)
    cover_photo_id = Column(Integer, ForeignKey("photos.id"))
    latitude = Column(Float)
    longitude = Column(Float)
    temps_voiture_min = Column(Float)
    ies_kcal_kg = Column(Float)

    photos = relationship("Photo", back_populates="parcours", cascade="all, delete-orphan", foreign_keys="Photo.parcours_id")
    avis = relationship("Avis", back_populates="parcours", cascade="all, delete-orphan")
    restrictions = relationship("Restriction", back_populates="parcours", cascade="all, delete-orphan")
    parcours_tags = relationship("ParcoursTag", back_populates="parcours", cascade="all, delete-orphan")
    favoris = relationship("Favori", back_populates="parcours", cascade="all, delete-orphan")
    realisations = relationship("Realisation", back_populates="parcours", cascade="all, delete-orphan")
    cover_photo = relationship("Photo", foreign_keys=[cover_photo_id], post_update=True)

    __table_args__ = (
        CheckConstraint("niveau IN ('facile', 'moyen', 'difficile')", name="ck_parcours_niveau"),
        CheckConstraint("origine IN ('scraping', 'genere', 'manuel')", name="ck_parcours_origine"),
    )


class Photo(Base):
    __tablename__ = "photos"

    id = Column(Integer, primary_key=True, autoincrement=True)
    parcours_id = Column(Integer, ForeignKey("parcours.id"))
    url_ou_chemin = Column(Text, nullable=False)

    parcours = relationship("Parcours", back_populates="photos", foreign_keys=[parcours_id])


class Avis(Base):
    __tablename__ = "avis"

    id = Column(Integer, primary_key=True, autoincrement=True)
    parcours_id = Column(Integer, ForeignKey("parcours.id"))
    texte = Column(Text)
    note = Column(Float)
    source = Column(Text)
    date_avis = Column(Text)

    parcours = relationship("Parcours", back_populates="avis")


class Tag(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, autoincrement=True)
    nom = Column(Text, unique=True, nullable=False)

    parcours_tags = relationship("ParcoursTag", back_populates="tag", cascade="all, delete-orphan")


class ParcoursTag(Base):
    __tablename__ = "parcours_tags"

    parcours_id = Column(Integer, ForeignKey("parcours.id"), primary_key=True)
    tag_id = Column(Integer, ForeignKey("tags.id"), primary_key=True)
    source = Column(Text)

    parcours = relationship("Parcours", back_populates="parcours_tags")
    tag = relationship("Tag", back_populates="parcours_tags")

    __table_args__ = (
        CheckConstraint("source IN ('auto_texte', 'auto_geo', 'manuel')", name="ck_parcours_tags_source"),
    )


class Restriction(Base):
    __tablename__ = "restrictions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    parcours_id = Column(Integer, ForeignKey("parcours.id"))
    zone = Column(Text)
    type = Column(Text)
    description = Column(Text)
    source = Column(Text)
    date_maj = Column(Text, server_default=func.current_timestamp())

    parcours = relationship("Parcours", back_populates="restrictions")

    __table_args__ = (
        CheckConstraint(
            "type IN ('bivouac', 'camping', 'acces_massif', 'chasse', 'arrete_municipal', 'reserve_naturelle')",
            name="ck_restrictions_type",
        ),
    )


class Favori(Base):
    __tablename__ = "favoris"

    id = Column(Integer, primary_key=True, autoincrement=True)
    parcours_id = Column(Integer, ForeignKey("parcours.id"))
    utilisateur = Column(Text, nullable=False)
    date_ajout = Column(Text, server_default=func.current_timestamp())

    parcours = relationship("Parcours", back_populates="favoris")

    __table_args__ = (
        UniqueConstraint("parcours_id", "utilisateur", name="uq_favoris_parcours_utilisateur"),
    )


class Realisation(Base):
    __tablename__ = "realisations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    parcours_id = Column(Integer, ForeignKey("parcours.id"))
    utilisateur = Column(Text, nullable=False)
    date_realisation = Column(Text)
    date_ajout = Column(Text, server_default=func.current_timestamp())

    parcours = relationship("Parcours", back_populates="realisations")

    __table_args__ = (
        UniqueConstraint("parcours_id", "utilisateur", name="uq_realisations_parcours_utilisateur"),
    )


class Projet(Base):
    __tablename__ = "projets"

    id = Column(Integer, primary_key=True, autoincrement=True)
    nom = Column(Text, nullable=False)
    utilisateur = Column(Text, nullable=False)
    date_creation = Column(Text, server_default=func.current_timestamp())

    etapes = relationship(
        "ProjetEtape",
        back_populates="projet",
        cascade="all, delete-orphan",
        order_by="ProjetEtape.ordre",
    )


class ProjetEtape(Base):
    __tablename__ = "projet_etapes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    projet_id = Column(Integer, ForeignKey("projets.id"))
    parcours_id = Column(Integer, ForeignKey("parcours.id"))
    ordre = Column(Integer, nullable=False, default=0)
    jour = Column(Integer)
    notes = Column(Text)

    projet = relationship("Projet", back_populates="etapes")
    parcours = relationship("Parcours")


class Refuge(Base):
    __tablename__ = "refuges"

    id = Column(Integer, primary_key=True, autoincrement=True)
    nom = Column(Text, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    altitude = Column(Integer)
    type = Column(Text)
    osm_id = Column(Text, unique=True)


class Utilisateur(Base):
    __tablename__ = "utilisateurs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    identifiant = Column(Text, unique=True, nullable=False)
    nom_affichage = Column(Text, nullable=False)
    mot_de_passe_hash = Column(Text, nullable=False)
    date_creation = Column(Text, server_default=func.current_timestamp())

    sessions = relationship("SessionUtilisateur", back_populates="utilisateur", cascade="all, delete-orphan")


class SessionUtilisateur(Base):
    __tablename__ = "sessions_utilisateur"

    id = Column(Integer, primary_key=True, autoincrement=True)
    utilisateur_id = Column(Integer, ForeignKey("utilisateurs.id"), nullable=False)
    token_hash = Column(Text, unique=True, nullable=False)
    date_creation = Column(Text, server_default=func.current_timestamp())
    date_expiration = Column(Text, nullable=False)

    utilisateur = relationship("Utilisateur", back_populates="sessions")


class Amelioration(Base):
    __tablename__ = "ameliorations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    titre = Column(Text, nullable=False)
    description = Column(Text)
    statut = Column(Text, nullable=False, default="nouveau")
    demandeur = Column(Text, nullable=False)
    image_path = Column(Text)
    date_creation = Column(Text, server_default=func.current_timestamp())
    date_maj = Column(Text)

    __table_args__ = (
        CheckConstraint("statut IN ('nouveau', 'en_cours', 'termine')", name="ck_ameliorations_statut"),
    )
