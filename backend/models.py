from pydantic import BaseModel
from typing import List, Optional

class UsageMetrics(BaseModel):
    total_duration_seconds: int = 0
    ghost_text_count: int = 0
    ghost_text_chars: int = 0
    manual_input_chars: int = 0
    deleted_chars: int = 0
    total_chars: int = 0

class MedicalRecord(BaseModel):
    gender: str = ""
    age: str = ""
    main_complaint: str = ""
    history_present_illness: str = ""
    past_history: str = ""
    physical_exam: str = ""
    auxiliary_exam: str = ""
    diagnosis: str = ""
    orders: str = ""
    metrics: UsageMetrics = UsageMetrics()
    
class ChatMessage(BaseModel):
    role: str 
    content: str
