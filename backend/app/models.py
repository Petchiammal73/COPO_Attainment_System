from sqlalchemy import JSON, Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.database import Base  # ✅ Fixed import

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
    subject_code = Column(String(20), nullable=False)
    subject_name = Column(String(200), nullable=False)
    academic_year = Column(String(10), nullable=False)
    semester = Column(Integer, nullable=False)
    regulation = Column(String(10), nullable=False)
    course_type = Column(String(20), nullable=False)
    number_of_cos = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

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

class COPOPSOMatrix(Base):
    __tablename__ = "copo_pso_matrices"
    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(String, index=True)
    matrix = Column(JSON)  # 5×15: [[0,1,2,...], [1,0,3,...]]
    created_at = Column(DateTime, default=func.now())
