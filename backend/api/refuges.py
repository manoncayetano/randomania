from typing import List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db.database import get_db
from db.models import Refuge

router = APIRouter()


class RefugeOut(BaseModel):
    id: int
    nom: str
    latitude: float
    longitude: float
    altitude: Optional[int] = None
    type: Optional[str] = None

    class Config:
        from_attributes = True


@router.get("/refuges", response_model=List[RefugeOut])
def list_refuges(db: Session = Depends(get_db)):
    return db.query(Refuge).all()
