from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import List, Optional,Dict


class UserCreate(BaseModel):
    faculty_code: str
    name: str
    department: str
    mobile: str
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    faculty_code: str
    name: str
    department: str
    mobile: str
    email: str
    created_at: datetime

    class Config:
        from_attributes = True

class User(UserResponse):
    pass

class Token(BaseModel):
    access_token: str
    token_type: str


# --- SUBJECT SCHEMAS ---
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

class SubjectUpdate(SubjectBase):
    subject_code: Optional[str] = None
    subject_name: Optional[str] = None
    academic_year: Optional[str] = None
    semester: Optional[int] = None
    regulation: Optional[str] = None
    course_type: Optional[str] = None
    number_of_cos: Optional[int] = None

from pydantic import BaseModel
from typing import List, Dict, Any


# shared shape for CO attainments
class COAttainmentItem(BaseModel):
    co: str
    percentage: float


# for saving / reading direct summary
class DirectSummaryCreate(BaseModel):
    subject_id: str
    co_attainments: List[COAttainmentItem]


class DirectSummaryResponse(BaseModel):
    subject_id: str
    co_attainments: List[COAttainmentItem]
    created_at: str


# for indirect summary
class IndirectSummaryCreate(BaseModel):
    subject_id: str
    co_attainments: List[COAttainmentItem]


class IndirectSummaryResponse(BaseModel):
    subject_id: str
    co_attainments: List[COAttainmentItem]
    created_at: str


# for CO → PO/PSO mapping matrix
class COPOPSOMatrixCreate(BaseModel):
    subject_id: str
    matrix: List[List[int]]  # 5×15


class COPOPSOMatrixResponse(BaseModel):
    subject_id: str
    matrix: List[List[int]]
    created_at: str
