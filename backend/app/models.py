from sqlalchemy import JSON, Column, Integer, String, Boolean, DateTime, ForeignKey, Float
from sqlalchemy.sql import func
from app.database import Base  # ✅ Fixed import
from sqlalchemy.orm import relationship
import datetime


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    faculty_code = Column(String(20), unique=True, index=True)
    name = Column(String(100), nullable=False)
    department = Column(String(100), nullable=False)
    mobile = Column(String(15), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    faculty_id = Column(Integer, nullable=False)
    course_code=Column(String(20),nullable=False)
    subject_code = Column(String(20), nullable=False)
    subject_name = Column(String(200), nullable=False)
    academic_year = Column(String(10), nullable=False)
    semester = Column(Integer, nullable=False)
    regulation = Column(String(10), nullable=False)
    course_type = Column(String(20), nullable=False)
    number_of_cos = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    po_pso_attainment = relationship("SubjectPOPSOAttainment", uselist=False, back_populates="subject")

# Analytics models
class DirectSummary(Base):
    __tablename__ = "direct_summaries"
    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(String, index=True)
    co_attainments = Column(JSON)  # list of dict: [{"co": "CO1", "percentage": 85.0}]
    created_at = Column(DateTime, default=func.now())

class IndirectSummary(Base):
    __tablename__ = "indirect_summaries"
    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(String, index=True)
    co_attainments = Column(JSON)
    created_at = Column(DateTime, default=func.now())

class FinalAttainment(Base):
    __tablename__ = "final_attainments"
    
    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(String, index=True)
    direct_percentages = Column(String)  # JSON string: "[75.2, 82.1, 68.5]"
    indirect_percentages = Column(String)
    final_percentages = Column(String)
    final_levels = Column(String)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class COPOPSOMatrix(Base):
    __tablename__ = "copo_pso_matrices"
    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(String, index=True)
    matrix = Column(JSON)  # 5×15: [[0,1,2,...], [1,0,3,...]]
    created_at = Column(DateTime, default=func.now())

class SubjectPOPSOAttainment(Base):
    __tablename__ = "subject_po_pso_attainments"
    
    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), index=True)
    subject = relationship("Subject", back_populates="po_pso_attainment")
    direct_attainment = Column(JSON)  # {"PO1": 2.1, "PO2": 1.8, ..., "PSO3": 2.5}
    indirect_attainment = Column(JSON)
    final_attainment = Column(JSON)
    created_at = Column(DateTime, default=func.now())

class CourseFinalAttainment(Base):
    __tablename__ = "course_final_attainment"
    
    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("subjects.id"), index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 🔥 PO1-PO12, PSO1-PSO3 (WHOLE NUMBERS 0-3)
    po1 = Column(Integer, default=0)
    po2 = Column(Integer, default=0)
    po3 = Column(Integer, default=0)
    po4 = Column(Integer, default=0)
    po5 = Column(Integer, default=0)
    po6 = Column(Integer, default=0)
    po7 = Column(Integer, default=0)
    po8 = Column(Integer, default=0)
    po9 = Column(Integer, default=0)
    po10 = Column(Integer, default=0)
    po11 = Column(Integer, default=0)
    po12 = Column(Integer, default=0)
    pso1 = Column(Integer, default=0)
    pso2 = Column(Integer, default=0)
    pso3 = Column(Integer, default=0)
    
    course = relationship("Subject", back_populates="course_final_attainment")

# Add to Subject model relationship
Subject.course_final_attainment = relationship("CourseFinalAttainment", uselist=False, back_populates="course")
