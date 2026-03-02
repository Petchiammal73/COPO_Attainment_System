from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime


import app.crud as crud
import app.schemas as schemas
from app.database import engine, Base, get_db  # ← get_db from database.py, remove SessionLocal
from app.core.security import verify_password, create_access_token, verify_token


app = FastAPI(title="NBA Analytics API", version="1.0.0")


# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")


@app.get("/")
def root():
    return {"message": "NBA Analytics API v1.0 - Ready!"}


# Auth endpoints
@app.post("/auth/register", response_model=schemas.Token)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    if crud.get_user_by_email(db, email=user.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    if crud.get_user_by_faculty_code(db, faculty_code=user.faculty_code):
        raise HTTPException(status_code=400, detail="Faculty code already registered")

    user_obj = crud.create_user(db=db, user=user)
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}


@app.post("/auth/token")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = crud.get_user_by_email(db, email=form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/users/me", response_model=schemas.UserResponse)
def read_users_me(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme),
):
    email = verify_token(token)
    if email is None:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = crud.get_user_by_email(db, email=email)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user


# --- SUBJECT MODELS (Pydantic) ---

class SubjectBase(BaseModel):
    subject_code: str
    subject_name: str
    academic_year: str
    semester: int
    regulation: str
    course_type: str
    number_of_cos: int


class SubjectCreate(SubjectBase):
    pass


class Subject(SubjectBase):
    id: int
    faculty_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# --- SUBJECT DATABASE MODEL (SQLAlchemy) ---

Base.metadata.create_all(bind=engine)


# --- SUBJECT ENDPOINTS ---

@app.post("/subjects/", response_model=schemas.Subject)
def create_subject_endpoint(
    subject: schemas.SubjectCreate,
    current_user: schemas.User = Depends(crud.get_current_user),
    db: Session = Depends(get_db),
):
    return crud.create_subject(db, subject, current_user.id)


@app.get("/subjects/", response_model=List[schemas.Subject])
def get_subjects_endpoint(
    current_user: schemas.User = Depends(crud.get_current_user),
    db: Session = Depends(get_db),
):
    return crud.get_faculty_subjects(db, current_user.id)


@app.delete("/subjects/{subject_id}")
def delete_subject_endpoint(
    subject_id: int,
    current_user: schemas.User = Depends(crud.get_current_user),
    db: Session = Depends(get_db),
):
    subject = crud.delete_subject(db, subject_id, current_user.id)
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    return {"message": "Subject deleted successfully"}

@app.put("/subjects/{subject_id}", response_model=schemas.Subject)
def update_subject_endpoint(
    subject_id: int,
    subject: schemas.SubjectCreate,
    current_user: schemas.User = Depends(crud.get_current_user),
    db: Session = Depends(get_db),
):
    db_subject = crud.get_subject(db, subject_id)
    if not db_subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    # Only let the faculty who owns the subject edit it
    if db_subject.faculty_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this subject")

    # Update fields
    update_data = subject.dict()
    for key, value in update_data.items():
        setattr(db_subject, key, value)

    db.commit()
    db.refresh(db_subject)
    return db_subject
# Add this complete router to your main.py (replace the existing one)
# ===============================
# ANALYTICS ROUTER - ADD THIS COMPLETE BLOCK
# ===============================

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.crud import (
    upsert_direct_summary, get_direct_summary,
    upsert_indirect_summary, get_indirect_summary,
    upsert_copo_pso_matrix, get_copo_pso_matrix
)
from app.schemas import (
    DirectSummaryCreate, DirectSummaryResponse,
    IndirectSummaryCreate, IndirectSummaryResponse,
    COPOPSOMatrixCreate, COPOPSOMatrixResponse
)

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.post("/direct-summary", response_model=DirectSummaryResponse)
def save_direct_summary(data: DirectSummaryCreate, db: Session = Depends(get_db)):
    return upsert_direct_summary(db, data)

@router.get("/direct-summary/{subject_id}", response_model=DirectSummaryResponse)
def read_direct_summary(subject_id: str, db: Session = Depends(get_db)):
    db_obj = get_direct_summary(db, subject_id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Direct summary not found")
    return db_obj

@router.post("/indirect-summary", response_model=IndirectSummaryResponse)
def save_indirect_summary(data: IndirectSummaryCreate, db: Session = Depends(get_db)):
    return upsert_indirect_summary(db, data)

@router.get("/indirect-summary/{subject_id}", response_model=IndirectSummaryResponse)
def read_indirect_summary(subject_id: str, db: Session = Depends(get_db)):
    db_obj = get_indirect_summary(db, subject_id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Indirect summary not found")
    return db_obj

@router.post("/copo-pso-matrix", response_model=COPOPSOMatrixResponse)
def save_copo_pso_matrix(data: COPOPSOMatrixCreate, db: Session = Depends(get_db)):
    return upsert_copo_pso_matrix(db, data)

@router.get("/copo-pso-matrix/{subject_id}", response_model=COPOPSOMatrixResponse)  # ← THIS WAS MISSING!
def read_copo_pso_matrix(subject_id: str, db: Session = Depends(get_db)):
    db_obj = get_copo_pso_matrix(db, subject_id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="CO-PO-PSO matrix not found")
    return db_obj

# 🔥 CRITICAL: Include the router
app.include_router(router)
