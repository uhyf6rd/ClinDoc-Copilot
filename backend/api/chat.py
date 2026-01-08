from fastapi import APIRouter
from backend.models import ChatMessage
from backend.utils.openai_tool import GetOpenAI
from typing import List

router = APIRouter()
openai_tool = GetOpenAI()

@router.post("/message", response_model=ChatMessage)
def chat(message: ChatMessage):
    success, response_text = openai_tool.get_respons(message.content)
    
    if not success:
        response_text = f"AI 服务异常: {response_text}"
    
    return ChatMessage(role="assistant", content=response_text)
