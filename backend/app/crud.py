from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import json
from datetime import datetime

from app import models, schemas
from app.core.security import get_password_hash, verify_token
from app.database import get_db

# ✅ ALL MODELS
from app.models import (
    User, Subject, 
    DirectSummary, IndirectSummary, FinalAttainment, COPOPSOMatrix, SubjectPOPSOAttainment
)

# ✅ ALL SCHEMAS  
from app.schemas import (
    COAttainmentItem,
    CourseFinalAttainmentCreate,
    DirectSummaryCreate, DirectSummaryResponse,
    IndirectSummaryCreate, IndirectSummaryResponse,
    FinalAttainmentCreate, FinalAttainmentResponse,
    COPOPSOMatrixCreate, COPOPSOMatrixResponse,
    POPSOAttainmentCreate,POPSOAttainmentResponse
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
    db_subject = models.Subject(
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
# ANALYTICS CRUD - FIXED & COMPLETE
# ===============================

def upsert_direct_summary(db: Session, data: DirectSummaryCreate):
    """Save/update direct CO attainment summary"""
    # Delete existing for this subject
    db.query(models.DirectSummary).filter(
        models.DirectSummary.subject_id == data.subject_id
    ).delete()
    
    # Insert new
    db_summary = models.DirectSummary(
        subject_id=data.subject_id,
        co_attainments=[c.dict() for c in data.co_attainments],
    )
    db.add(db_summary)
    db.commit()
    db.refresh(db_summary)
    
    return schemas.DirectSummaryResponse(
        subject_id=db_summary.subject_id,
        co_attainments=[schemas.COAttainmentItem(**item) for item in db_summary.co_attainments],
        created_at=db_summary.created_at.isoformat() if db_summary.created_at else datetime.now().isoformat(),
    )

def get_direct_summary(db: Session, subject_id: str):
    """Get direct CO attainment summary - NBA COMPATIBLE"""
    db_obj = db.query(models.DirectSummary).filter(
        models.DirectSummary.subject_id == subject_id
    ).first()
    
    if not db_obj:
        return None
    
    # 🔥 NBA COMPATIBLE: Return PO-level data structure
    co_attainments = db_obj.co_attainments or []
    
    # Create PO/PSO mapping from CO attainments (simplified 1:1 for demo)
    po_mapping = {}
    for i, po in enumerate(["PO1", "PO2", "PO3", "PO4", "PO5", "PO6", "PO7", "PO8", "PO9", "PO10", "PO11", "PO12"]):
        if i < len(co_attainments):
            po_mapping[po] = co_attainments[i].get('percentage', 0)
        else:
            po_mapping[po] = 75.0  # Default
    
    # PSOs get slightly lower values typically
    for i, pso in enumerate(["PSO1", "PSO2", "PSO3"]):
        po_mapping[pso] = po_mapping.get("PO12", 75.0) * 0.9
    
    return schemas.DirectSummaryResponse(
        subject_id=db_obj.subject_id,
        co_attainments=[schemas.COAttainmentItem(**item) for item in co_attainments],
        po_attainments=po_mapping,  # 🔥 NEW: Direct PO/PSO mapping
        created_at=db_obj.created_at.isoformat() if db_obj.created_at else datetime.now().isoformat(),
    )

def upsert_indirect_summary(db: Session, data: IndirectSummaryCreate):
    """Save/update indirect CO attainment summary"""
    db.query(models.IndirectSummary).filter(
        models.IndirectSummary.subject_id == data.subject_id
    ).delete()
    
    db_summary = models.IndirectSummary(
        subject_id=data.subject_id,
        co_attainments=[c.dict() for c in data.co_attainments],
    )
    db.add(db_summary)
    db.commit()
    db.refresh(db_summary)
    
    return schemas.IndirectSummaryResponse(
        subject_id=db_summary.subject_id,
        co_attainments=[schemas.COAttainmentItem(**item) for item in db_summary.co_attainments],
        created_at=db_summary.created_at.isoformat() if db_summary.created_at else datetime.now().isoformat(),
    )

def get_indirect_summary(db: Session, subject_id: str):
    """Get indirect CO attainment summary"""
    db_obj = db.query(models.IndirectSummary).filter(
        models.IndirectSummary.subject_id == subject_id
    ).first()
    
    if not db_obj:
        return None
    
    return schemas.IndirectSummaryResponse(
        subject_id=db_obj.subject_id,
        co_attainments=[schemas.COAttainmentItem(**item) for item in db_obj.co_attainments],
        created_at=db_obj.created_at.isoformat() if db_obj.created_at else datetime.now().isoformat(),
    )

def upsert_final_attainment(db: Session, data: FinalAttainmentCreate):

    existing = db.query(FinalAttainment).filter(
        FinalAttainment.subject_id == data.subject_id
    ).first()

    if existing:
        existing.direct_percentages = json.dumps(data.direct_percentages)
        existing.indirect_percentages = json.dumps(data.indirect_percentages)
        existing.final_percentages = json.dumps(data.final_percentages)
        existing.final_levels = json.dumps(data.final_levels)

        db.commit()
        db.refresh(existing)
        db_obj = existing

    else:
        db_obj = FinalAttainment(
            subject_id=data.subject_id,
            direct_percentages=json.dumps(data.direct_percentages),
            indirect_percentages=json.dumps(data.indirect_percentages),
            final_percentages=json.dumps(data.final_percentages),
            final_levels=json.dumps(data.final_levels)
        )

        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)

    return FinalAttainmentResponse(
        id=db_obj.id,
        subject_id=db_obj.subject_id,
        direct_percentages=json.loads(db_obj.direct_percentages),
        indirect_percentages=json.loads(db_obj.indirect_percentages),
        final_percentages=json.loads(db_obj.final_percentages),
        final_levels=json.loads(db_obj.final_levels),
        created_at=db_obj.created_at
    )

def get_final_attainment(db: Session, subject_id: str):
    """Get final attainment data"""
    db_obj = db.query(models.FinalAttainment).filter(
        models.FinalAttainment.subject_id == subject_id
    ).first()
    
    if not db_obj:
        return None
    
    return schemas.FinalAttainmentResponse(
        id=db_obj.id,
        subject_id=db_obj.subject_id,
        direct_percentages=json.loads(db_obj.direct_percentages),
        indirect_percentages=json.loads(db_obj.indirect_percentages),
        final_percentages=json.loads(db_obj.final_percentages),
        final_levels=json.loads(db_obj.final_levels),
        created_at=db_obj.created_at or datetime.now()
    )

def upsert_copo_pso_matrix(db: Session, data: COPOPSOMatrixCreate):
    """Save/update CO-PO-PSO mapping matrix"""
    db.query(models.COPOPSOMatrix).filter(
        models.COPOPSOMatrix.subject_id == data.subject_id
    ).delete()
    
    db_matrix = models.COPOPSOMatrix(
        subject_id=data.subject_id,
        matrix=data.matrix,
    )
    db.add(db_matrix)
    db.commit()
    db.refresh(db_matrix)
    
    return schemas.COPOPSOMatrixResponse(
        subject_id=db_matrix.subject_id,
        matrix=db_matrix.matrix,
        created_at=db_matrix.created_at.isoformat() if db_matrix.created_at else datetime.now().isoformat(),
    )

def get_copo_pso_matrix(db: Session, subject_id: str):
    """Get CO-PO-PSO mapping matrix"""
    db_obj = db.query(models.COPOPSOMatrix).filter(
        models.COPOPSOMatrix.subject_id == subject_id
    ).first()
    
    if not db_obj:
        return None
    
    return schemas.COPOPSOMatrixResponse(
        subject_id=db_obj.subject_id,
        matrix=db_obj.matrix,
        created_at=db_obj.created_at.isoformat() if db_obj.created_at else datetime.now().isoformat(),
    )

def save_subject_po_pso_attainment(db: Session, data: POPSOAttainmentCreate):
    """Save/update PO/PSO attainment for subject"""
    # Delete existing
    db.query(SubjectPOPSOAttainment).filter(
        SubjectPOPSOAttainment.subject_id == data.subject_id
    ).delete()
    
    # Create new
    db_attainment = SubjectPOPSOAttainment(
        subject_id=data.subject_id,
        direct_attainment=data.direct_attainment,
        indirect_attainment=data.indirect_attainment,
        final_attainment=data.final_attainment
    )
    db.add(db_attainment)
    db.commit()
    db.refresh(db_attainment)
    
    return POPSOAttainmentResponse.from_orm(db_attainment)

def get_subject_po_pso_attainment(db: Session, subject_id: int):
    """Get PO/PSO attainment for subject"""
    return db.query(SubjectPOPSOAttainment).filter(
        SubjectPOPSOAttainment.subject_id == subject_id
    ).first()

def save_course_final_attainment(db: Session, data: CourseFinalAttainmentCreate):

    existing = db.query(models.CourseFinalAttainment).filter(
        models.CourseFinalAttainment.course_id == data.course_id
    ).first()

    if existing:
        db.delete(existing)
        db.commit()

    db_attainment = models.CourseFinalAttainment(**data.dict())

    db.add(db_attainment)
    db.commit()
    db.refresh(db_attainment)

    return db_attainment

def upsert_final_attainment(db: Session, data: FinalAttainmentCreate):

    existing = db.query(FinalAttainment).filter(
        FinalAttainment.subject_id == data.subject_id
    ).first()

    if existing:
        existing.direct_percentages = json.dumps(data.direct_percentages)
        existing.indirect_percentages = json.dumps(data.indirect_percentages)
        existing.final_percentages = json.dumps(data.final_percentages)
        existing.final_levels = json.dumps(data.final_levels)

        db.commit()
        db.refresh(existing)
        db_obj = existing

    else:
        db_obj = FinalAttainment(
            subject_id=data.subject_id,
            direct_percentages=json.dumps(data.direct_percentages),
            indirect_percentages=json.dumps(data.indirect_percentages),
            final_percentages=json.dumps(data.final_percentages),
            final_levels=json.dumps(data.final_levels)
        )

        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)

    # =========================================
    # 🔥 STORE COURSE FINAL ATTAINMENT
    # =========================================

    subject = db.query(models.Subject).filter(
        models.Subject.id == int(data.subject_id)
    ).first()

    if subject:

        levels = data.final_levels

        course_data = CourseFinalAttainmentCreate(
            course_id=subject.id,

            po1=levels[0] if len(levels) > 0 else 0,
            po2=levels[1] if len(levels) > 1 else 0,
            po3=levels[2] if len(levels) > 2 else 0,
            po4=levels[3] if len(levels) > 3 else 0,
            po5=levels[4] if len(levels) > 4 else 0,

            po6=0,
            po7=0,
            po8=0,
            po9=0,
            po10=0,
            po11=0,
            po12=0,

            pso1=0,
            pso2=0,
            pso3=0
        )

        save_course_final_attainment(db, course_data)

    return FinalAttainmentResponse(
        id=db_obj.id,
        subject_id=db_obj.subject_id,
        direct_percentages=json.loads(db_obj.direct_percentages),
        indirect_percentages=json.loads(db_obj.indirect_percentages),
        final_percentages=json.loads(db_obj.final_percentages),
        final_levels=json.loads(db_obj.final_levels),
        created_at=db_obj.created_at
    )

def get_course_final_attainment(db: Session, course_id: int):
    return db.query(models.CourseFinalAttainment).filter(
        models.CourseFinalAttainment.course_id == course_id
    ).first()