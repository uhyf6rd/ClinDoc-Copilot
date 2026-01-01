from backend.utils.openai_tool import GetOpenAI
import json
import asyncio
import functools

class CompletionAgent:
    def __init__(self):
        # Use Custom Tool
        self.openai_tool = GetOpenAI()
        
        # --- Completion Prompt (From Cursor Context) ---
        self.complete_prompt = """
你是一个电子病历自动补全助手。医生正在填写【{field_name}】。
当前已输入内容如下：
"{full_text}"

请根据上下文，预测接下来可能输入的 3-10 个字。
只要预测接下来的内容，不要重复已有的内容。
如果当前句子完整且无需补充，返回空字符串。

返回格式：仅返回补全的文本片段。
"""

    async def generate_draft(self, summary: str, field_id: str) -> str:
        """
        Generates a full draft for an empty field based on the summary.
        Uses field-specific prompts from prompts.py
        """
        from backend.utils.completion_prompts import FIELD_PROMPTS
        
        # Get field-specific prompt template
        prompt_template = FIELD_PROMPTS.get(field_id)
        if not prompt_template:
            print(f"Warning: No prompt found for field '{field_id}'")
            return ""
        
        try:
            # Format prompt with summary
            prompt_text = prompt_template.format(summary=summary)
            
            # Offload blocking I/O to thread pool
            import time
            start_time = time.time()
            loop = asyncio.get_running_loop()
            success, res = await loop.run_in_executor(
                None, 
                functools.partial(self.openai_tool.get_respons, prompt_text, model="gpt-3.5-turbo")
            )
            duration = time.time() - start_time
            
            if success:
                print(f"[Profiling] Draft Generation Time ({field_id}): {duration:.4f}s")
                draft = res.strip()
                # Post-process: Apply Terminology Correction
                from backend.agents.terminology_agent import terminology_agent
                draft = await terminology_agent.correct_text(draft)
                return draft
            return ""
        except Exception as e:
            print(f"Draft Error: {e}")
            return ""
 
    async def generate_suggestions(self, summary: str, field_id: str) -> list:
        """
        Generates AI inferred suggestions for specific fields (diagnosis, orders).
        """
        from backend.utils.completion_prompts import FIELD_PROMPTS
        
        # Map fields to their inferred prompts
        inference_key = f"inferred_{field_id}"
        prompt_template = FIELD_PROMPTS.get(inference_key)
        
        if not prompt_template:
            return []
            
        try:
            prompt_text = prompt_template.format(summary=summary)
            
            # Offload blocking I/O to thread pool
            loop = asyncio.get_running_loop()
            success, res = await loop.run_in_executor(
                None, 
                functools.partial(self.openai_tool.get_respons, prompt_text, model="gpt-3.5-turbo")
            )
            
            if success:
                # Parse lines into list
                lines = [line.strip() for line in res.strip().split('\n') if line.strip()]
                # Basic cleanup (remove leading bullets)
                clean_lines = []
                for l in lines:
                    # Remove "- ", "1. ", etc.
                    import re
                    l = re.sub(r'^[\-\*•\d\.]+\s*', '', l)
                    if l: clean_lines.append(l)
                return clean_lines
            return []
        except Exception as e:
            print(f"Suggestion Error: {e}")
            return []

    async def complete_text(self, field_id: str, current_text: str) -> str:
        """
        Completes the text based on current cursor context.
        """
        if not current_text:
            return ""
            
        try:
            prompt_text = self.complete_prompt.format(
                field_name=field_id,
                full_text=current_text
            )
            
            # Offload blocking I/O to thread pool
            import time
            start_time = time.time()
            loop = asyncio.get_running_loop()
            success, res = await loop.run_in_executor(
                None,
                functools.partial(self.openai_tool.get_respons, prompt_text, model="gpt-3.5-turbo")
            )
            duration = time.time() - start_time
            
            if not success:
               return ""
            
            print(f"[Profiling] Completion Time ({field_id}): {duration:.4f}s")

            # Post-processing: remove leading spaces usage if model adds them
            completion = res.replace(current_text, "").strip()
            
            # Simple heuristic: if model repeats input, discard
            if completion.startswith(current_text):
                completion = completion[len(current_text):]
                
            return completion
        except Exception as e:
            print(f"Completion Error: {e}")
            return ""

completion_agent = CompletionAgent()
