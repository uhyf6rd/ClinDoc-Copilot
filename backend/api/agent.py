from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.agents.summary_agent import summary_agent

router = APIRouter()

class SummaryRequest(BaseModel):
    current_summary: str
    new_text: str

class SummaryResponse(BaseModel):
    updated_summary: str

@router.post("/summary", response_model=SummaryResponse)
async def update_summary(request: SummaryRequest):
    # ... existing code ...
    try:
        updated_text = await summary_agent.summarize(
            current_summary=request.current_summary,
            new_dialogue=request.new_text
        )
        return SummaryResponse(updated_summary=updated_text)
    except Exception as e:
        print(f"API Error: {e}")
        return SummaryResponse(updated_summary=request.current_summary)

# --- Completion / Ghost Text Endpoints ---

from backend.agents.completion_agent import completion_agent

class DraftRequest(BaseModel):
    summary: str
    field_id: str

class CompletionRequest(BaseModel):
    field_id: str
    current_text: str

@router.post("/draft")
async def generate_draft(req: DraftRequest):
    # 1. Generate Strict Draft (based on Doctor's explicit words)
    draft_text = await completion_agent.generate_draft(req.summary, req.field_id)
    
    response = {"draft": draft_text, "suggestions": []}
    
    # 2. If applicable, generate AI suggestions (Inference)
    if req.field_id in ["diagnosis", "orders"]:
        suggestions = await completion_agent.generate_suggestions(req.summary, req.field_id)
        response["suggestions"] = suggestions
        
    return response

@router.post("/complete")
async def complete_text(req: CompletionRequest):
    text = await completion_agent.complete_text(req.field_id, req.current_text)
    return {"completion": text}
