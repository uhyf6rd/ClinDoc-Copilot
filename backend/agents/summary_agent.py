from backend.utils.openai_tool import GetOpenAI
import asyncio
import functools

class DialogueSummaryAgent:
    def __init__(self):
        self.openai_tool = GetOpenAI()
        
        self.prompt_template = """
你是一名专业的医疗助手，正在协助医生记录病历。
你的任务是根据最新的对话内容，更新当前的问诊总结。

【当前总结】：
{current_summary}

【新增对话片段】：
{new_dialogue}

**指令**：
1. 识别【新增对话片段】中的关键医疗信息（如症状、病史、诊断、用药）。
2. 将这些新信息整合进【当前总结】中。
3. 保持总结简洁、专业（使用医学术语）。
4. 如果新增对话没有包含任何医疗信息（例如寒暄、噪音），请原样返回【当前总结】，仅当有新信息时才修改。
5. **直接返回更新后的总结内容**，不要包含"【当前总结】："、"总结："等任何标题或前缀，只输出纯文本内容。
"""

    async def summarize(self, current_summary: str, new_dialogue: str) -> str:
        if not new_dialogue or not new_dialogue.strip():
            return current_summary
            
        try:
            if not current_summary:
                current_summary = "暂无总结。"
            prompt_text = self.prompt_template.format(
                current_summary=current_summary,
                new_dialogue=new_dialogue
            )
            import time
            start_time = time.time()
            loop = asyncio.get_running_loop()
            success, out_msg = await loop.run_in_executor(
                None,
                functools.partial(self.openai_tool.get_respons, input_msg=prompt_text, model="gpt-3.5-turbo")
            )
            duration = time.time() - start_time
            
            if success:
                print(f"[Profiling] Summary Agent Time: {duration:.4f}s")
                return out_msg.strip()
            else:
                print(f"总结 Agent API 错误: {out_msg}")
                return current_summary
                
        except Exception as e:
            print(f"总结 Agent 错误: {e}")
            return current_summary
summary_agent = DialogueSummaryAgent()
