# -*- coding: utf-8 -*-
"""
Medical Record Field Prompts
专业医学病历字段的 Prompt 模板
强调：简洁、正式、准确
"""

# 主诉 (Chief Complaint)
PROMPT_MAIN_COMPLAINT = """
根据【对话总结】提取主诉。

【对话总结】：
{summary}

要求：
1. 格式：症状 + 时长（如"咳嗽、咳痰3天"）
2. 仅提取患者主要症状及发生时间
3. 不超过20字
4. 如无明确主诉，返回空字符串
5. **禁止**有多余空行，单行输出
6. **严禁**捏造对话中未提及的内容，如果对话中未提及主诉，直接返回空字符串

输出：
"""

# 现病史 (History of Present Illness)
PROMPT_HISTORY_PRESENT_ILLNESS = """
根据【对话总结】提取现病史。

【对话总结】：
{summary}

严格要求：
1. **仅记录**：起病时间、主要症状、伴随症状、症状演变过程
2. **严禁包含**：体格检查结果（如体温、听诊所见）、诊断、治疗方案、医嘱、用药建议
3. 使用规范医学术语，避免口语化
4. 如无相关信息，返回空字符串
5. 示例格式："患者X天前无明显诱因出现咳嗽，伴黄痰，无发热、胸闷。"
6. **禁止**有多余空行，紧凑段落输出
7. **严禁**捏造对话中未提及的内容，必须根据对话事实总结

输出：
"""

# 既往史 (Past History)
PROMPT_PAST_HISTORY = """
根据【对话总结】提取既往史。

【对话总结】：
{summary}

要求：
1. 仅提取既往疾病、手术史、药物过敏史
2. 格式：疾病名 + 时间（如"高血压病史5年"）
3. 如患者明确否认，记录"否认特殊既往史"
4. 如无相关信息，返回空字符串
5. **禁止**有多余空行，紧凑输出
6. **严禁**捏造对话中未提及的内容，必须根据对话事实总结

输出：
"""

# 体格检查 (Physical Examination)
PROMPT_PHYSICAL_EXAM = """
根据【对话总结】提取体格检查结果。

【对话总结】：
{summary}

严格要求：
1. **只记录实际测量/检查的项目**，未提及的项目完全不写
2. 生命体征格式示例："T 36.5℃"（如只测了体温，只写体温）
3. 体征描述：只写阳性或异常体征，正常体征可简化或不写
4. **禁止**出现"未提及"、"未查"等字样
5. 不要有多余空行
6. **重点**：严禁将患者自述的“既往体温”、“在家测量的体温”等历史信息写入此处。此处只记录医生当前进行的体格检查结果。
7. 如无任何医生进行的检查结果，返回空字符串
8. **严禁**捏造对话中未提及的内容，必须根据对话事实总结

输出：
"""

# 辅助检查 (Auxiliary Examination)
PROMPT_AUXILIARY_EXAM = """
根据【对话总结】提取辅助检查结果。

【对话总结】：
{summary}

要求：
1. 仅记录实际完成的检查（血常规、影像学等）
2. 格式：检查项目 + 结果（如"胸片：未见明显异常"）
3. 如无检查结果，返回 "无"
4. **严禁**捏造对话中未提及的内容，必须根据对话事实总结

输出：
"""

# 诊断 (Diagnosis) - Strict Extraction
PROMPT_DIAGNOSIS = """
根据【对话总结】提取医生明确提及的诊断。

【对话总结】：
{summary}

严格要求：
1. **仅提取对话中医生明确下达的诊断**
2. 如果医生只是“怀疑”、“考虑”，或者根本没提诊断，**直接返回空字符串**
3. 严禁进行自动推断
4. 格式：序号 + 诊断名

输出：
"""

# 医嘱 (Orders) - Strict Extraction
PROMPT_ORDERS = """
根据【对话总结】提取医生明确提及的医嘱。

【对话总结】：
{summary}

严格要求：
1. **提取内容**：药物处方、检查项目、生活建议、注意事项等。
2. **包含已开具的**：即使总结说是“医生开具了...”，也应作为医嘱提取。
3. 如果医生完全没提任何建议或处理，才返回空字符串。
4. 格式：序号 + 医嘱内容（**必须从1开始编号**）

输出：
"""

# AI 推断-诊断 (Inferred Diagnosis)
PROMPT_INFERRED_DIAGNOSIS = """
作为AI医疗助手，请根据【对话总结】推断可能的诊断。

【对话总结】：
{summary}

要求：
1. 根据症状和病史，列出最可能的诊断建议
2. 如果医生已提及，也可以包含在内作为确认
3. 输出格式：纯文本列表，每行一个诊断
4. 不要输出序号，不要Markdown，只输出诊断名称
5. 限制3-5个建议

输出：
"""

# AI 推断-医嘱 (Inferred Orders)
PROMPT_INFERRED_ORDERS = """
作为AI医疗助手，请根据【对话总结】和可能的诊断，推断建议的医嘱。

【对话总结】：
{summary}

要求：
1. 给出常规的检查、用药或建议。
2. **包含确认项**：如果总结中医生已经开了药，请务必将其列入建议列表。
3. 输出格式：纯文本列表，每行一条建议
4. 不要输出序号，不要Markdown
5. 限制3-5条建议

输出：
"""

# 映射字典
FIELD_PROMPTS = {
    "main_complaint": PROMPT_MAIN_COMPLAINT,
    "history_present_illness": PROMPT_HISTORY_PRESENT_ILLNESS,
    "past_history": PROMPT_PAST_HISTORY,
    "physical_exam": PROMPT_PHYSICAL_EXAM,
    "auxiliary_exam": PROMPT_AUXILIARY_EXAM,
    "diagnosis": PROMPT_DIAGNOSIS,
    "orders": PROMPT_ORDERS,
    "inferred_diagnosis": PROMPT_INFERRED_DIAGNOSIS,
    "inferred_orders": PROMPT_INFERRED_ORDERS,
}
