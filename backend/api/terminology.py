from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from backend.agents.terminology_agent import terminology_agent

router = APIRouter()

class TerminologyCheckRequest(BaseModel):
    text: str

class TerminologyIssue(BaseModel):
    original: str
    suggestion: str
    start: int
    end: int

class TerminologyCheckResponse(BaseModel):
    issues: List[TerminologyIssue]

@router.post("/terminology/check", response_model=TerminologyCheckResponse)
async def check_terminology(req: TerminologyCheckRequest):
    try:
        issues = await terminology_agent.check_terminology(req.text)
        return TerminologyCheckResponse(issues=issues)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
