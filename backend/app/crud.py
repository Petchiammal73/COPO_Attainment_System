from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app import models, schemas
from app.core.security import get_password_hash, verify_token
from app.database import get_db

# ✅ CORRECT imports - ALL models from app.models
from app.models import (
    User, Subject, 
    DirectSummary, IndirectSummary, COPOPSOMatrix
)

# ✅ CORRECT schemas imports
from app.schemas import (
    COAttainmentItem,
    DirectSummaryCreate, DirectSummaryResponse,
    IndirectSummaryCreate, IndirectSummaryResponse,
    COPOPSOMatrixCreate, COPOPSOMatrixResponse
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")

# ===============================
# USER CRUD
# ===============================
def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def get_user_by_faculty_code(db: Session, faculty_code: str):
    return db.query(models.User).filter(models.User.faculty_code == faculty_code).first()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = get_password_hash(user.password)
    db_user = models.User(
        faculty_code=user.faculty_code,
        name=user.name,
        department=user.department,
        mobile=user.mobile,
        email=user.email,
        hashed_password=hashed_password,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# ===============================
# SUBJECT CRUD
# ===============================
def create_subject(db: Session, subject: schemas.SubjectCreate, faculty_id: int):
    db_subject = models.Subject(  # ✅ Fixed: use models.Subject
        **subject.dict(),
        faculty_id=faculty_id,
    )
    db.add(db_subject)
    db.commit()
    db.refresh(db_subject)
    return db_subject

def get_faculty_subjects(db: Session, faculty_id: int):
    return db.query(models.Subject).filter(models.Subject.faculty_id == faculty_id).all()

def get_subject(db: Session, subject_id: int):
    return db.query(models.Subject).filter(models.Subject.id == subject_id).first()

def delete_subject(db: Session, subject_id: int, faculty_id: int):
    subject = db.query(models.Subject).filter(
        models.Subject.id == subject_id,
        models.Subject.faculty_id == faculty_id,
    ).first()
    if subject:
        db.delete(subject)
        db.commit()
    return subject

# ===============================
# AUTH CRUD
# ===============================
def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme),
):
    email = verify_token(token)
    if email is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing token",
        )
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return user

# ===============================
# ANALYTICS CRUD
# ===============================
def upsert_direct_summary(db: Session, data: DirectSummaryCreate):
    """Save/update direct CO attainment summary"""
    # Delete existing for this subject
    db.query(DirectSummary).filter(
        DirectSummary.subject_id == data.subject_id
    ).delete()
    
    # Insert new
    db_summary = DirectSummary(
        subject_id=data.subject_id,
        co_attainments=[c.dict() for c in data.co_attainments],
    )
    db.add(db_summary)
    db.commit()
    db.refresh(db_summary)
    
    return DirectSummaryResponse(
        subject_id=db_summary.subject_id,
        co_attainments=[COAttainmentItem(**item) for item in db_summary.co_attainments],
        created_at=db_summary.created_at.isoformat(),
    )

def get_direct_summary(db: Session, subject_id: str):
    """Get direct CO attainment summary"""
    db_obj = db.query(DirectSummary).filter(
        DirectSummary.subject_id == subject_id
    ).first()
    if not db_obj:
        return None
    
    return DirectSummaryResponse(
        subject_id=db_obj.subject_id,
        co_attainments=[COAttainmentItem(**item) for item in db_obj.co_attainments],
        created_at=db_obj.created_at.isoformat(),
    )

def upsert_indirect_summary(db: Session, data: IndirectSummaryCreate):
    """Save/update indirect CO attainment summary"""
    db.query(IndirectSummary).filter(
        IndirectSummary.subject_id == data.subject_id
    ).delete()
    
    db_summary = IndirectSummary(
        subject_id=data.subject_id,
        co_attainments=[c.dict() for c in data.co_attainments],
    )
    db.add(db_summary)
    db.commit()
    db.refresh(db_summary)
    
    return IndirectSummaryResponse(
        subject_id=db_summary.subject_id,
        co_attainments=[COAttainmentItem(**item) for item in db_summary.co_attainments],
        created_at=db_summary.created_at.isoformat(),
    )

def get_indirect_summary(db: Session, subject_id: str):
    """Get indirect CO attainment summary"""
    db_obj = db.query(IndirectSummary).filter(
        IndirectSummary.subject_id == subject_id
    ).first()
    if not db_obj:
        return None
    
    return IndirectSummaryResponse(
        subject_id=db_obj.subject_id,
        co_attainments=[COAttainmentItem(**item) for item in db_obj.co_attainments],
        created_at=db_obj.created_at.isoformat(),
    )

def upsert_copo_pso_matrix(db: Session, data: COPOPSOMatrixCreate):
    """Save/update CO-PO-PSO mapping matrix"""
    db.query(COPOPSOMatrix).filter(
        COPOPSOMatrix.subject_id == data.subject_id
    ).delete()
    
    db_matrix = COPOPSOMatrix(
        subject_id=data.subject_id,
        matrix=data.matrix,
    )
    db.add(db_matrix)
    db.commit()
    db.refresh(db_matrix)
    
    return COPOPSOMatrixResponse(
        subject_id=db_matrix.subject_id,
        matrix=db_matrix.matrix,
        created_at=db_matrix.created_at.isoformat(),
    )

def get_copo_pso_matrix(db: Session, subject_id: str):
    """Get CO-PO-PSO mapping matrix"""
    db_obj = db.query(COPOPSOMatrix).filter(
        COPOPSOMatrix.subject_id == subject_id
    ).first()
    if not db_obj:
        return None
    
    return COPOPSOMatrixResponse(
        subject_id=db_obj.subject_id,
        matrix=db_obj.matrix,
        created_at=db_obj.created_at.isoformat(),
    )
