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
    """
    检查文本中的术语规范性
    
    请求：
    {
      "text": "患者肚子疼3天，伴发烧"
    }
    
    响应：
    {
      "issues": [
        {
          "original": "肚子疼3天",
          "suggestion": "腹痛3天",
          "start": 2,
          "end": 7
        },
        {
          "original": "发烧",
          "suggestion": "发热",
          "start": 9,
          "end": 11
        }
      ]
    }
    """
    try:
        issues = await terminology_agent.check_terminology(req.text)
        return TerminologyCheckResponse(issues=issues)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
