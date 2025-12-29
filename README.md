# ClinDoc-Copilot

**Enhancing Efficiency and Clinical Expression Normalization in Chinese Outpatient Settings**

---

## Overview

ClinDoc-Copilot is a research prototype system designed to assist clinicians in generating structured medical records during outpatient consultations. The system integrates real-time speech recognition, large language model (LLM) inference, and rule-based constraints to produce draft clinical documentation that conforms to standard medical record formats.

This project is developed for **research and educational purposes only**. It is not intended for clinical deployment and should not be used for actual patient care.
![Comparison of Different HCI Mode in Chinese Clinical Documantation](assets/small.png)


### Motivation

Clinical documentation remains a significant burden for healthcare providers, often consuming substantial time during patient encounters. This project explores the feasibility of using LLM-based approaches to reduce documentation overhead while maintaining compliance with medical record standards.


### Key Contributions

- A modular architecture combining ASR, LLM, and template-based generation
- Real-time "ghost text" suggestions integrated with browser-based input fields
- Multi-agent coordination for different documentation modules (chief complaint, history of present illness, diagnosis, treatment plan)
- Terminology normalization and compliance checking mechanisms

---

## Features

| Component | Description |
|-----------|-------------|
| **Speech-to-Text** | Real-time transcription using SenseVoice ASR model via WebSocket streaming |
| **Ghost Text Suggestions** | Inline text completions triggered by keyboard input, similar to code completion interfaces |
| **Module-Specific Generation** | Separate prompt pipelines for chief complaint, present illness history, past medical history, physical examination, diagnosis, and treatment plan |
| **Terminology Normalization** | Detection and suggestion of standardized medical terms from colloquial expressions |
| **Compliance Checking** | Validation of generated content against conversation context to identify potential inconsistencies |
| **RAG Integration** | Retrieval-augmented generation using medical record templates and terminology databases |

---
![Overview of the ClinDoc Copilot Components](assets/components.png)



## System Architecture

![System Architecture](assets/system_architecture.png)
### Technology Stack

- **Frontend**: Chrome Extension (Manifest V3), vanilla JavaScript
- **Backend**: Python 3.10+, FastAPI, WebSocket
- **ASR**: SenseVoice (FunASR)
- **LLM**: OpenAI-compatible API (GPT-4o or equivalent)
- **Vector Database**: ChromaDB
- **Embedding**: OpenAI text-embedding or local alternatives

---

## Example

### Ghost Text Suggestion

When the clinician speaks: *"患者说头疼三天了，还有点发烧"* (Patient reports headache for three days with fever)

The system generates a suggestion for the "Chief Complaint" field:

```
头痛3天，伴发热
```

### Terminology Normalization

| Input (Colloquial) | Suggested (Standard) |
|--------------------|----------------------|
| 肚子疼 | 腹痛 |
| 拉肚子 | 腹泻 |
| 心口窝疼 | 胸骨后疼痛 |

---

![Overview of the ClinDoc Copilot Workflow](assets/main.png)


## Installation & Usage

### Prerequisites

- Python 3.10+
- Chrome browser
- OpenAI API key (or compatible endpoint)

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env to add your API key

# Start server
python server.py
```

### Extension Setup

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `extension/` folder
4. Click the extension icon to open the sidepanel

### Verification

Open `backend/test-copilot-full.html` in Chrome to verify the system is functioning correctly.

---

## Data & Compliance Statement

### Data Sources

- All demonstration data in this repository is **synthetic or fully de-identified**
- No real patient data is included or required for system operation
- Medical terminology databases are derived from publicly available standards

### Intended Use

This system is a **research prototype** developed for:

- Academic research in medical informatics and NLP
- Educational demonstrations of LLM applications in healthcare
- Exploration of human-AI collaboration in clinical workflows

### Limitations & Disclaimers

- This system is **NOT** a certified medical device
- It should **NOT** be used for actual clinical decision-making or patient care
- Generated content requires review and validation by qualified healthcare professionals
- The authors make no claims regarding clinical accuracy or safety
- Users are responsible for compliance with applicable regulations in their jurisdiction

### Ethical Considerations

- LLM-generated medical content may contain errors or hallucinations
- The system is designed to assist, not replace, clinical judgment
- Deployment in real clinical settings would require extensive validation and regulatory approval

---

## Citation

If you use this project in your research, please cite:

```bibtex
@software{clindoc_copilot_2024,
  title = {ClinDoc-Copilot: A Research Prototype for LLM-Assisted Clinical Documentation},
  author = {[Author Names]},
  year = {2024},
  url = {https://github.com/[username]/ClinDoc-Copilot}
}
```

---

## License

This project is licensed under the [MIT License](LICENSE).

---

## Acknowledgments

- [FunASR](https://github.com/alibaba-damo-academy/FunASR) for the SenseVoice ASR model
- [LangChain](https://github.com/langchain-ai/langchain) for LLM orchestration utilities
- [ChromaDB](https://github.com/chroma-core/chroma) for vector storage

---

**Note**: This is an active research project. APIs and interfaces may change without notice.
