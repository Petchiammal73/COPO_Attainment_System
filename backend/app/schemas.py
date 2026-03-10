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
    course_code:str
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
    course_code:Optional[str]=None
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



# Final Attainment Schemas
class FinalAttainmentBase(BaseModel):
    subject_id: str
    direct_percentages: List[float]  # [75.2, 82.1, 68.5, 91.3, 77.8]
    indirect_percentages: List[float]  # [65.0, 72.3, 58.9, 85.1, 70.2]
    final_percentages: List[float]    # [73.16, 80.08, 66.72, 89.84, 76.36]
    final_levels: List[int]           # [2, 3, 2, 3, 3]

class FinalAttainmentCreate(FinalAttainmentBase):
    pass

class FinalAttainmentResponse(FinalAttainmentBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# for CO → PO/PSO mapping matrix
class COPOPSOMatrixCreate(BaseModel):
    subject_id: str
    matrix: List[List[int]]  # 5×15


class COPOPSOMatrixResponse(BaseModel):
    subject_id: str
    matrix: List[List[int]]
    created_at: str

# Add these schemas at the bottom of schemas.py

class POPSOAttainmentCreate(BaseModel):
    subject_id: int
    direct_attainment: Dict[str, float]  # {"PO1": 2.1, "PO2": 1.8, ...}
    indirect_attainment: Dict[str, float]
    final_attainment: Dict[str, float]

class POPSOAttainmentResponse(POPSOAttainmentCreate):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class IndirectAnalysisResponse(BaseModel):
    success: bool
    final_table: List[Dict[str, Any]] 
    message: str = "" # List of course rows

class CourseFinalAttainmentCreate(BaseModel):
    course_id: int

    po1: float = 0
    po2: float = 0
    po3: float = 0
    po4: float = 0
    po5: float = 0
    po6: float = 0
    po7: float = 0
    po8: float = 0
    po9: float = 0
    po10: float = 0
    po11: float = 0
    po12: float = 0

    pso1: float = 0
    pso2: float = 0
    pso3: float = 0

class CourseFinalAttainmentResponse(CourseFinalAttainmentCreate):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class DirectCourseAverageResponse(BaseModel):
    success: bool
    final_table: List[Dict[str, Any]]
    message: str

