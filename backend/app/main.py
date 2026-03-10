from fastapi import FastAPI, Depends, HTTPException, status, APIRouter, Form, File, UploadFile
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import pandas as pd
import io
import numpy as np

import app.models as models
import app.crud as crud
import app.schemas as schemas
from app.database import engine, Base, get_db
from app.core.security import verify_password, create_access_token, verify_token

app = FastAPI(title="NBA Analytics API", version="3.3.0 - DECIMAL PRECISION")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8080", "http://127.0.0.1:8080", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["GET","POST","PUT","DELETE","OPTIONS"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")

@app.get("/")
def root():
    return {"message": "NBA Analytics v3.3 - DECIMAL PRECISION (1.3 = 1.3)"}

# ===============================
# AUTH & SUBJECTS (UNCHANGED)
# ===============================
@app.post("/auth/register", response_model=schemas.Token)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    if crud.get_user_by_email(db, email=user.email): raise HTTPException(400, detail="Email exists")
    if crud.get_user_by_faculty_code(db, faculty_code=user.faculty_code): raise HTTPException(400, detail="Faculty code exists")
    user_obj = crud.create_user(db=db, user=user)
    return {"access_token": create_access_token(data={"sub": user.email}), "token_type": "bearer"}

@app.post("/auth/token")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = crud.get_user_by_email(db, email=form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    return {"access_token": create_access_token(data={"sub": user.email}), "token_type": "bearer"}

@app.get("/users/me", response_model=schemas.UserResponse)
def read_users_me(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    email = verify_token(token)
    if not email: raise HTTPException(401, detail="Invalid token")
    user = crud.get_user_by_email(db, email=email)
    if not user: raise HTTPException(404, detail="User not found")
    return user

@app.post("/subjects/", response_model=schemas.Subject)
def create_subject(subject: schemas.SubjectCreate, current_user: schemas.User = Depends(crud.get_current_user), db: Session = Depends(get_db)):
    return crud.create_subject(db, subject, current_user.id)

@app.get("/subjects/", response_model=List[schemas.Subject])
def get_subjects(current_user: schemas.User = Depends(crud.get_current_user), db: Session = Depends(get_db)):
    return crud.get_faculty_subjects(db, current_user.id)

@app.delete("/subjects/{subject_id}")
def delete_subject(subject_id: int, current_user: schemas.User = Depends(crud.get_current_user), db: Session = Depends(get_db)):
    subject = crud.delete_subject(db, subject_id, current_user.id)
    if not subject: raise HTTPException(404, detail="Subject not found")
    return {"message": "Subject deleted"}

@app.put("/subjects/{subject_id}", response_model=schemas.Subject)
def update_subject(subject_id: int, subject: schemas.SubjectCreate, current_user: schemas.User = Depends(crud.get_current_user), db: Session = Depends(get_db)):
    db_subject = crud.get_subject(db, subject_id)
    if not db_subject: raise HTTPException(404, detail="Subject not found")
    if db_subject.faculty_id != current_user.id: raise HTTPException(403, detail="Unauthorized")
    for key, value in subject.dict().items(): setattr(db_subject, key, value)
    db.commit(); db.refresh(db_subject)
    return db_subject

Base.metadata.create_all(bind=engine)

# ===============================
# ANALYTICS ROUTER
# ===============================
analytics_router = APIRouter(prefix="/analytics", tags=["analytics"])

PO_PSO = ["PO1", "PO2", "PO3", "PO4", "PO5", "PO6", "PO7", "PO8", "PO9", "PO10", "PO11", "PO12", "PSO1", "PSO2", "PSO3"]

def safe_get_crud(func, *args, **kwargs):
    """Safe CRUD wrapper"""
    try:
        return func(*args, **kwargs)
    except Exception as e:
        print(f"CRUD ERROR: {e}")
        return None

# 🔥 FIXED: NO ROUNDING - KEEP DECIMALS
def matrix_course_po_print(matrix: list, course_code: str):
    """DECIMAL PRECISION - NO ROUNDING (1.3 = 1.3)"""
    print(f"\n📚 COURSE: {course_code}")
    
    if not matrix or len(matrix) == 0:
        print("   ❌ EMPTY MATRIX → ALL 2.0")
        return {po: 2.0 for po in PO_PSO}
    
    print(f"   Matrix rows: {len(matrix)}")
    print(f"   RAW FIRST ROW: {matrix[0][:8]}")
    
    result = {}
    for col_idx, po in enumerate(PO_PSO):
        col_values = []
        for row_idx, row in enumerate(matrix):
            try:
                if col_idx < len(row) and row[col_idx] is not None:
                    raw_val = float(row[col_idx])
                    # 🔥 FIX tiny values but KEEP DECIMALS
                    fixed_val = raw_val * 20 if raw_val < 0.5 else raw_val
                    if 0 <= fixed_val <= 3:
                        col_values.append(fixed_val)
            except:
                continue
        
        if col_values:
            avg = np.mean(col_values)  # 🔥 NO ROUNDING
            result[po] = float(avg)    # 🔥 KEEP DECIMAL
            print(f"     {po}: RAW=[{col_values[:3]}] → AVG={avg:.3f}")
        else:
            result[po] = 2.0
            print(f"     {po}: NO DATA → 2.000")
    
    print(f"   🎯 FINAL: {course_code} → {dict(list(result.items())[:6])}...")
    return result

def calculate_likert_percent(col_data: pd.Series) -> float:
    """Survey → % scale (Keep 1 decimal)"""
    if len(col_data) == 0: return 75.0
    counts = col_data.value_counts().reindex([1,2,3,4,5], fill_value=0)
    weighted = sum(i * counts[i] for i in range(1,6))
    return round((weighted / (len(col_data) * 5)) * 100, 1)

# 🔥 SAFE ENDPOINTS (UNCHANGED)
@analytics_router.get("/direct-summary/{subject_id}", response_model=schemas.DirectSummaryResponse)
def get_direct_summary(subject_id: str, db: Session = Depends(get_db)):
    result = safe_get_crud(crud.get_direct_summary, db, subject_id)
    if not result:
        return schemas.DirectSummaryResponse(subject_id=subject_id, co_attainments=[], average_attainment=0.0)
    return result

@analytics_router.get("/indirect-summary/{subject_id}", response_model=schemas.IndirectSummaryResponse)
def get_indirect_summary(subject_id: str, db: Session = Depends(get_db)):
    result = safe_get_crud(crud.get_indirect_summary, db, subject_id)
    if not result:
        return schemas.IndirectSummaryResponse(subject_id=subject_id, po_attainments={}, pso_attainments={})
    return result

@analytics_router.get("/copo-pso-matrix/{subject_id}", response_model=schemas.COPOPSOMatrixResponse)
def get_copo_pso_matrix(subject_id: str, db: Session = Depends(get_db)):
    result = safe_get_crud(crud.get_copo_pso_matrix, db, subject_id)
    if not result:
        return schemas.COPOPSOMatrixResponse(subject_id=subject_id, matrix=[], course_code="")
    return result

@analytics_router.post("/direct-summary", response_model=schemas.DirectSummaryResponse)
def save_direct_summary(data: schemas.DirectSummaryCreate, db: Session = Depends(get_db)):
    return crud.upsert_direct_summary(db, data)

@analytics_router.post("/indirect-summary", response_model=schemas.IndirectSummaryResponse)
def save_indirect_summary(data: schemas.IndirectSummaryCreate, db: Session = Depends(get_db)):
    return crud.upsert_indirect_summary(db, data)

@analytics_router.post("/copo-pso-matrix", response_model=schemas.COPOPSOMatrixResponse)
def save_copo_pso_matrix(data: schemas.COPOPSOMatrixCreate, db: Session = Depends(get_db)):
    return crud.upsert_copo_pso_matrix(db, data)


@analytics_router.post("/final-attainment", response_model=schemas.FinalAttainmentResponse)
def save_final_attainment(
    data: schemas.FinalAttainmentCreate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(crud.get_current_user)
):

    # 1️⃣ Save CO final attainment
    result = crud.upsert_final_attainment(db, data)

    co_levels = data.final_levels

    # 2️⃣ Fetch CO-PO-PSO matrix
    matrix_data = crud.get_copo_pso_matrix(db, int(data.subject_id))

    if not matrix_data:
        raise HTTPException(status_code=404, detail="CO-PO-PSO matrix not found")

    matrix = matrix_data.matrix

    print("CO Levels:", co_levels)
    print("Matrix:", matrix)

    # 3️⃣ Initialize accumulators
    po_values = [0.0] * 12
    po_weights = [0.0] * 12

    pso_values = [0.0] * 3
    pso_weights = [0.0] * 3

    # 4️⃣ Calculate PO and PSO attainment
    for i, row in enumerate(matrix):

        if i >= len(co_levels):
            break

        co_level = float(co_levels[i])

        # ---- PO Calculation ----
        for j in range(12):

            weight = float(row[j]) if j < len(row) else 0

            if weight > 0:
                po_values[j] += co_level * weight
                po_weights[j] += weight

        # ---- PSO Calculation ----
        for j in range(3):

            idx = 12 + j
            weight = float(row[idx]) if idx < len(row) else 0

            if weight > 0:
                pso_values[j] += co_level * weight
                pso_weights[j] += weight

    # 5️⃣ Compute final PO levels
    po_levels = []

    for i in range(12):

        if po_weights[i] == 0:
            po_levels.append(0)

        else:
            po_levels.append(round(po_values[i] / po_weights[i], 2))

    # 6️⃣ Compute final PSO levels
    pso_levels = []

    for i in range(3):

        if pso_weights[i] == 0:
            pso_levels.append(0)

        else:
            pso_levels.append(round(pso_values[i] / pso_weights[i], 2))

    print("Final PO Levels:", po_levels)
    print("Final PSO Levels:", pso_levels)

    # 7️⃣ Save to database
    course_data = schemas.CourseFinalAttainmentCreate(

        course_id=int(data.subject_id),

        po1=po_levels[0],
        po2=po_levels[1],
        po3=po_levels[2],
        po4=po_levels[3],
        po5=po_levels[4],
        po6=po_levels[5],
        po7=po_levels[6],
        po8=po_levels[7],
        po9=po_levels[8],
        po10=po_levels[9],
        po11=po_levels[10],
        po12=po_levels[11],

        pso1=pso_levels[0],
        pso2=pso_levels[1],
        pso3=pso_levels[2]
    )

    crud.save_course_final_attainment(db, course_data)

    return result

# 🔥 MAIN ENDPOINT - DECIMAL PRECISION EVERYWHERE
@analytics_router.post("/indirect/analysis")
async def indirect_analysis(
    subject_ids: str = Form(...),
    exit_survey: UploadFile = File(...),
    alumni_survey: UploadFile = File(...),
    employer_survey: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(crud.get_current_user)
):
    print("\n" + "="*100)
    print("🚀 NBA INDIRECT ANALYSIS - FULL DECIMAL PRECISION (NO ROUNDING)")
    print("="*100)
    
    try:
        # 1. SUBJECTS
        subject_ids_list = [int(sid.strip()) for sid in subject_ids.split(",")]
        subjects = db.query(models.Subject).filter(
            models.Subject.id.in_(subject_ids_list),
            models.Subject.faculty_id == current_user.id
        ).all()
        
        print(f"\n📋 INPUT: {len(subjects)} subjects: {[f'{s.course_code}-{s.subject_code}' for s in subjects]}")
        
        # 2. DIRECT ATTAINMENT (Decimals)
        print("\n🔥 STEP 1: DIRECT ATTAINMENT (FROM FINAL COURSE ATTAINMENT TABLE)")
        course_data = []
        all_direct = {po: [] for po in PO_PSO}

        for subject in subjects:
            course_code = f"{subject.course_code}-{subject.subject_code}"

            # 🔥 FETCH STORED FINAL ATTAINMENT FROM DATABASE
            attainment = crud.get_course_final_attainment(db, subject.id)
            direct_values = {
                "PO1": float(getattr(attainment, "po1", 0) if attainment else 0),
                "PO2": float(getattr(attainment, "po2", 0) if attainment else 0),
                "PO3": float(getattr(attainment, "po3", 0) if attainment else 0),
                "PO4": float(getattr(attainment, "po4", 0) if attainment else 0),
                "PO5": float(getattr(attainment, "po5", 0) if attainment else 0),
                "PO6": float(getattr(attainment, "po6", 0) if attainment else 0),
                "PO7": float(getattr(attainment, "po7", 0) if attainment else 0),
                "PO8": float(getattr(attainment, "po8", 0) if attainment else 0),
                "PO9": float(getattr(attainment, "po9", 0) if attainment else 0),
                "PO10": float(getattr(attainment, "po10", 0) if attainment else 0),
                "PO11": float(getattr(attainment, "po11", 0) if attainment else 0),
                "PO12": float(getattr(attainment, "po12", 0) if attainment else 0),
                "PSO1": float(getattr(attainment, "pso1", 0) if attainment else 0),
                "PSO2": float(getattr(attainment, "pso2", 0) if attainment else 0),
                "PSO3": float(getattr(attainment, "pso3", 0) if attainment else 0),
            }

            print(f"📚 COURSE: {course_code}")
            print(f"   DIRECT FROM DB: {dict(list(direct_values.items())[:12])}")

            course_data.append({
                "courseCode": course_code,
                "direct": direct_values
            })

            for po in PO_PSO:
                all_direct[po].append(direct_values[po])
        
        # 🔥 PROGRAM AVERAGE DIRECT (FULL PRECISION - NO ROUNDING)
        avg_direct = {po: float(np.mean(all_direct[po])) for po in PO_PSO}
        print("📊 Program Direct (EXACT):", {po: avg_direct[po] for po in PO_PSO[:3]})
        
        # 3. INDIRECT SURVEYS
        print("\n🔥 STEP 2: INDIRECT SURVEYS")
        exit_df = pd.read_csv(io.BytesIO(await exit_survey.read()))
        alumni_df = pd.read_csv(io.BytesIO(await alumni_survey.read()))
        employer_df = pd.read_csv(io.BytesIO(await employer_survey.read()))
        
        column_mapping = {
            "Q1_PO1":"PO1", "Q2_PO2":"PO2", "Q3_PO3":"PO3", "Q4_PO4":"PO4", "Q5_PO5":"PO5",
            "Q6_PO6":"PO6", "Q7_PO7":"PO7", "Q8_PO8":"PO8", "Q9_PO9":"PO9", "Q10_PO10":"PO10",
            "Q11_PO11":"PO11", "Q12_PO12":"PO12", "Q13_PSO1":"PSO1", "Q14_PSO2":"PSO2", "Q15_PSO3":"PSO3"
        }
        
        # Exit Survey
        exit_attain = {po: 75.0 for po in PO_PSO}
        for col, po in column_mapping.items():
            if col in exit_df.columns:
                data = pd.to_numeric(exit_df[col], errors='coerce').dropna()
                if len(data) > 0:
                    exit_attain[po] = calculate_likert_percent(data)
        
        # Alumni/Employer
        alumni_po_raw = pd.to_numeric(alumni_df.get("Q1_PO_Rating", pd.Series([])), errors='coerce').dropna()
        alumni_pso_raw = pd.to_numeric(alumni_df.get("Q2_PSO_Rating", pd.Series([])), errors='coerce').dropna()
        employer_po_raw = pd.to_numeric(employer_df.get("Q1_PO_Rating", pd.Series([])), errors='coerce').dropna()
        employer_pso_raw = pd.to_numeric(employer_df.get("Q2_PSO_Rating", pd.Series([])), errors='coerce').dropna()
        
        alumni_po = calculate_likert_percent(alumni_po_raw) if len(alumni_po_raw) > 0 else 75.0
        alumni_pso = calculate_likert_percent(alumni_pso_raw) if len(alumni_pso_raw) > 0 else 75.0
        employer_po = calculate_likert_percent(employer_po_raw) if len(employer_po_raw) > 0 else 75.0
        employer_pso = calculate_likert_percent(employer_pso_raw) if len(employer_pso_raw) > 0 else 75.0
        
        print(f"📈 Surveys: Exit PO1={exit_attain['PO1']:.1f}%, Alumni PO={alumni_po:.1f}%, Employer PO={employer_po:.1f}%")
        
        # 🔥 INDIRECT (0-3 scale, decimals)
        print("\n⚖️ STEP 3: INDIRECT (Decimals 0-3)")
        indirect_attain = {}
        for po in PO_PSO[:12]:
            raw_score = (0.5 * exit_attain[po] + 0.25 * alumni_po + 0.25 * employer_po) / 100 * 3
            indirect_attain[po] = float(raw_score)
        for pso in PO_PSO[12:]:
            raw_score = (0.5 * exit_attain[pso] + 0.25 * alumni_pso + 0.25 * employer_pso) / 100 * 3
            indirect_attain[pso] = float(raw_score)
        
        # 🔥 FINAL ATTAINMENT (FULL PRECISION)
        print("\n🎯 STEP 4: FINAL ATTAINMENT (NO ROUNDING)")
        final_attain = {}
        for po in PO_PSO:
            final_attain[po] = avg_direct[po] * 0.8 + indirect_attain[po] * 0.2
            print(f"   {po}: {avg_direct[po]}×0.8 + {indirect_attain[po]}×0.2 = {final_attain[po]}")
        
        # 🔥 BUILD TABLE - ALL FLOATS, FULL PRECISION
        print("\n🔥 STEP 5: FINAL TABLE (Full Decimal Precision)")
        final_table = []
        for course in course_data:
            direct_vals = course['direct']
            row = {
                "courseCode": course['courseCode'],
                "cos": ["CO1","CO2","CO3","CO4","CO5"],
                "direct": {po: float(direct_vals[po]) for po in PO_PSO},
                "indirect": {po: float(indirect_attain[po]) for po in PO_PSO},
                "direct80": {po: float(direct_vals[po] * 0.8) for po in PO_PSO},
                "indirect20": {po: float(indirect_attain[po] * 0.2) for po in PO_PSO},
                "final": {po: float(direct_vals[po] * 0.8 + indirect_attain[po] * 0.2) for po in PO_PSO}
            }
            final_table.append(row)
        
        # Summary rows - FULL PRECISION FLOATS
        final_table.extend([
            {"courseCode": "Direct", 
             "direct": {po: float(avg_direct[po]) for po in PO_PSO}, 
             "indirect": {}, "direct80": {}, "indirect20": {}, "final": {}},
            {"courseCode": "Indirect", 
             "direct": {}, 
             "indirect": {po: float(indirect_attain[po]) for po in PO_PSO}, 
             "direct80": {}, "indirect20": {}, "final": {}},
            {"courseCode": "Direct (80%)", 
             "direct": {}, "indirect": {}, 
             "direct80": {po: float(avg_direct[po] * 0.8) for po in PO_PSO}, 
             "indirect20": {}, "final": {}},
            {"courseCode": "Indirect (20%)", 
             "direct": {}, "indirect": {}, "direct80": {},
             "indirect20": {po: float(indirect_attain[po] * 0.2) for po in PO_PSO}, 
             "final": {}},
            {"courseCode": "FINAL ATTAINMENT", 
             "direct": {}, "indirect": {}, "direct80": {}, "indirect20": {}, 
             "final": {po: float(final_attain[po]) for po in PO_PSO}}
        ])
        
        # 🔥 FINAL SUMMARY - FULL PRECISION
        print("\n✅ FULL PRECISION VALUES → PO1 Direct={}, Indirect={}, Final={}".format(
            avg_direct['PO1'], indirect_attain['PO1'], final_attain['PO1']))
        print(f"PO1 Direct exact: {avg_direct['PO1']}")
        
        return {"success": True, "final_table": final_table}
        
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(500, detail=str(e))


@analytics_router.post("/direct/course-average")
async def direct_course_average_analysis(
    subject_ids: str = Form(...),
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(crud.get_current_user)
):
    """DECIMAL AVERAGES across courses"""
    print(f"\n🎯 DIRECT COURSE AVERAGE - Subjects: {subject_ids}")
    
    try:
        subject_ids_list = [int(sid.strip()) for sid in subject_ids.split(",")]
        courses = db.query(models.Subject).filter(
            models.Subject.id.in_(subject_ids_list),
            models.Subject.faculty_id == current_user.id
        ).all()
        
        course_attainments = []
        all_po_values = {po: [] for po in PO_PSO}
        
        for course in courses:
            attainment = crud.get_course_final_attainment(db, course.id)
            final_po = {
                "PO1": float(getattr(attainment, 'po1', 0) if attainment else 0),
                "PO2": float(getattr(attainment, 'po2', 0) if attainment else 0),
                "PO3": float(getattr(attainment, 'po3', 0) if attainment else 0),
                "PO4": float(getattr(attainment, 'po4', 0) if attainment else 0),
                "PO5": float(getattr(attainment, 'po5', 0) if attainment else 0),
                "PO6": float(getattr(attainment, 'po6', 0) if attainment else 0),
                "PO7": float(getattr(attainment, 'po7', 0) if attainment else 0),
                "PO8": float(getattr(attainment, 'po8', 0) if attainment else 0),
                "PO9": float(getattr(attainment, 'po9', 0) if attainment else 0),
                "PO10": float(getattr(attainment, 'po10', 0) if attainment else 0),
                "PO11": float(getattr(attainment, 'po11', 0) if attainment else 0),
                "PO12": float(getattr(attainment, 'po12', 0) if attainment else 0),
                "PSO1": float(getattr(attainment, 'pso1', 0) if attainment else 0),
                "PSO2": float(getattr(attainment, 'pso2', 0) if attainment else 0),
                "PSO3": float(getattr(attainment, 'pso3', 0) if attainment else 0),
            }
            
            course_data = {
                "courseCode": f"{course.course_code}-{course.subject_code}",
                "direct": final_po,
                "final": final_po.copy()
            }
            
            course_attainments.append(course_data)
            for po in PO_PSO:
                all_po_values[po].append(final_po[po])
        
        # 🔥 DECIMAL PROGRAM AVERAGE
        program_averages = {po: float(np.mean(all_po_values[po])) for po in PO_PSO}
        
        final_table = course_attainments.copy()
        final_table.append({
            "courseCode": "PROGRAM AVERAGE",
            "direct": program_averages,
            "final": program_averages,
            "indirect": {},
            "direct80": {},
            "indirect20": {},
            "cos": []
        })
        
        return schemas.DirectCourseAverageResponse(
            success=True,
            final_table=final_table,
            message=f"Decimal average of {len(courses)} courses"
        )
        
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(500, detail=f"Analysis failed: {str(e)}")

app.include_router(analytics_router)
