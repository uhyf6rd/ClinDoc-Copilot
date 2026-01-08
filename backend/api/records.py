from fastapi import APIRouter, HTTPException
from backend.models import MedicalRecord
from typing import List
import json
import os

router = APIRouter()

SAVED_DIR = "backend/data/output"
MEDICAL_CASES_FILE = "backend/data/source/medical.json"

if not os.path.exists(SAVED_DIR):
    os.makedirs(SAVED_DIR)

@router.get("/cases", response_model=List[dict])
def get_experimental_cases():
    if not os.path.exists(MEDICAL_CASES_FILE):
        return []
    try:
        with open(MEDICAL_CASES_FILE, "r", encoding="utf-8") as f:
            cases = json.load(f)
            return [{"id": c.get("id"), "gender": c.get("gender"), "age": c.get("age")} for c in cases]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/")
def save_record(record: MedicalRecord):
    import datetime
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"record_{timestamp}.json"
    filepath = os.path.join(SAVED_DIR, filename)
    
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(record.dict(), f, indent=4, ensure_ascii=False)
    
    return {"status": "success", "filename": filename}
