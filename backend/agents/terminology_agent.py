from backend.utils.openai_tool import GetOpenAI
import asyncio
import functools
import hashlib
import json
from typing import List, Dict, Optional

class TerminologyAgent:
    def __init__(self):
        self.openai_tool = GetOpenAI()
        self.cache = {}

        self.terminology_map = {
            "肚子疼": "腹痛",
            "肚子痛": "腹痛",
            "拉肚子": "腹泻",
            "发烧": "发热",
            "发烧了": "发热",
            "发高烧": "高热",
            "烧": "发热",
            "吐": "呕吐",
            "拉稀": "腹泻",
            "不想吃饭": "纳差",
            "没胃口": "纳差",
            "心慌": "心悸",
            "喉咙痛": "咽痛",
            "嗓子疼": "咽痛",
            "头疼": "头痛",
            "肚胀": "腹胀",
            "拉不出": "便秘",
            "拉不出来": "便秘",
            "睡不着": "失眠",
            "没力气": "乏力",
            "没劲": "乏力",
            "好几天": "数天",
            "很多天": "数天",
            "并且": "伴",
            "还有": "伴",
            "同时": "伴",
            "精神很差": "精神萎靡",
            "精神不好": "精神萎靡",
            "天旋地转": "眩晕",
            "想吐": "恶心",
            "反胃": "恶心",
            "感冒了": "上呼吸道感染",
            "挂水": "输液",
        }

        self.valid_terms = [
            "发热", "高热", "腹痛", "呕吐", "腹泻", "精神差", "精神萎靡",
            "伴", "伴有", "乏力", "心悸", "咽痛", "眩晕", "头晕",
            "纳差", "咳嗽", "咳痰", "胸闷", "气短", "恶心", "便秘",
            "失眠", "头痛", "腹胀", "黄痰", "白痰", "咯血", "呼吸困难",
            "上呼吸道感染", "输液"
        ]

        self.check_prompt = """
你是一名医学术语规范性检查专家。请对以下文本进行逐句检查，识别口语化表达并提供规范化建议。

【术语库】：
{terminology_map}

【重要原则】：
1. 识别文中所有的口语词汇（如“发烧”、“肚子疼”、“拉肚子”等），并根据建议替换为规范术语。
2. 即使句子很短（如“发烧。”），只要包含口语词汇，也必须识别并返回。
3. "头晕" 是规范术语，不要改成"眩晕"。
4. "精神差" 是规范术语，不要改成"精神萎靡"。

【待检查文本】：
{text}

【任务要求】：
1. 按中文标点符号（，。；、！？）将文本分句
2. 记录每个句子在原文中的【精确位置】（start, end）
3. 逐句检查是否包含口语化表达
4. 如果句子规范，不要返回该句
5. 如果句子包含口语化，返回：
   - original: 原句
   - suggestion: 修正后的完整句子（只替换口语词，保留所有其他内容）
   - start: 句子在原文中的起始字符索引（从0开始）
   - end: 句子在原文中的结束字符索引（不包含标点）

【返回格式】（严格 JSON）：
{{
  "issues": [
    {{
      "original": "发烧",
      "suggestion": "发热",
      "start": 0,
      "end": 2
    }}
  ]
}}

如果文本完全规范，返回：
{{
  "issues": []
}}
"""

    def _compute_hash(self, text: str) -> str:
        return hashlib.md5(text.encode('utf-8')).hexdigest()

    async def check_terminology(self, text: str) -> List[Dict]:
        if not text or not text.strip():
            return []
        
        print(f"[Terminology] Checking text: '{text}' (length: {len(text)})")

        text_hash = self._compute_hash(text)
        if text_hash in self.cache:
            print(f"[Cache Hit] {text_hash[:8]}")
            return self.cache[text_hash]
        
        try:

            terminology_str = "\n".join([f"- {k} → {v}" for k, v in self.terminology_map.items()])
            valid_terms_str = "、".join(self.valid_terms)
            
            prompt = self.check_prompt.format(
                terminology_map=terminology_str,
                valid_terms=valid_terms_str,
                text=text
            )

            loop = asyncio.get_running_loop()
            success, response = await loop.run_in_executor(
                None,
                functools.partial(
                    self.openai_tool.get_respons,
                    input_msg=prompt,
                    model="gpt-3.5-turbo"
                )
            )
            
            if not success:
                print(f"LLM Error: {response}")
                return []

            try:

                response = response.strip()
                if "```json" in response:
                    response = response.split("```json")[1].split("```")[0].strip()
                elif "```" in response:
                    response = response.split("```")[1].split("```")[0].strip()
                
                data = json.loads(response)
                issues = data.get("issues", [])
                
                print(f"[Terminology] LLM returned {len(issues)} issues")

                issues = self._repair_positions(text, issues)

                self.cache[text_hash] = issues
                
                return issues
                
            except json.JSONDecodeError as e:
                print(f"JSON Parse Error: {e}")
                print(f"Response: {response}")
                return []
                
        except Exception as e:
            print(f"Terminology Check Error: {e}")
            return []
    
    def _repair_positions(self, text: str, issues: List[Dict]) -> List[Dict]:

        repaired = []
        
        for issue in issues:
            original = issue.get("original", "")
            suggestion = issue.get("suggestion", "")
            start = issue.get("start", 0)
            end = issue.get("end", len(text))
            
            if not original or not suggestion:
                continue
            

            if original == suggestion:
                continue
            
            if start >= 0 and end <= len(text):
                if text[start:end] == original:
                    repaired.append(issue)
                    continue
            

            pos = text.find(original)
            if pos != -1:
                issue["start"] = pos
                issue["end"] = pos + len(original)
                repaired.append(issue)
                continue
            

            print(f"[Position Repair Failed] Original: {original}")
        
        return repaired

    async def correct_text(self, text: str) -> str:

        if not text:
            return text
            
        issues = await self.check_terminology(text)

        issues.sort(key=lambda x: x["start"], reverse=True)
        
        corrected_text = list(text)
        for issue in issues:
            start = issue["start"]
            end = issue["end"]
            suggestion = issue["suggestion"]

            if start < 0 or end > len(text) or start >= end:
                continue

            corrected_text[start:end] = list(suggestion)
            
        return "".join(corrected_text)

terminology_agent = TerminologyAgent()
