# ClinDoc-Copilot

**Enhancing Efficiency and Clinical Expression Normalization in Chinese Outpatient Settings**

---

## Overview

ClinDoc-Copilot is a research prototype system designed to assist clinicians in generating structured medical records during outpatient consultations. The system integrates real-time speech recognition and large language model (LLM) capabilities to provide writing assistance that conforms to standard medical record formats.

ClinDoc Copilot is a physician-centered, human-in-the-loop assistant. It provides conversation-grounded ghost text completion, inline underline feedback for terminology normalization and evidence-grounded traceability, and an on-demand right-side AI dialogue sidebar. All assistance is non-binding and requires explicit physician action to be incorporated into the medical record.

This project is developed for **research and educational purposes only**. It is not intended for clinical deployment and should not be used for actual patient care.

![Comparison of Different HCI Mode in Chinese Clinical Documentation](assets/small.png)
*Figure 1. Comparison of Different HCI Mode in Chinese Clinical Documentation.*

### Motivation

In Chinese outpatient settings, clinical documentation is a strictly regulated professional activity. Outpatient medical records are legally binding documents subject to routine audits, and physicians bear full legal responsibility for the accuracy, completeness, and clinical validity of documented content.

At the same time, outpatient documentation is completed under time constraints. Physicians must write efficiently while ensuring regulatory compliance and evidence-grounded traceability that links symptoms, examinations, diagnoses, and treatment orders within the record.

Motivated by these challenges, ClinDoc Copilot is designed as a physician-centered, human-in-the-loop assistant that provides real-time, non-binding writing support while keeping physicians as the sole authors and legal owners of medical records.

### Key Contributions

- **Conversation-grounded ghost text + tab completion**: Suggestions are grounded in encounter context and inserted only via explicit physician action.
- **Inline underline feedback**: Yellow underlines support terminology normalization; additional cues prompt review of evidence-grounded compliance for diagnoses and treatment orders.
- **On-demand AI dialogue sidebar**: A right-side advisory interface that is physician-invoked and does not automatically commit content into the medical record.
- **Accountability-first interaction design**: Assistance is optional and non-binding, preserving physician authority and responsibility.

---

## System Architecture

![Overview of the ClinDoc Copilot Components](assets/components.png)
*Figure 2. Overview of the ClinDoc-Copilot Components.*

---

## Features

| Component | Description |
|-----------|-------------|
| **Speech-to-Text (Transcription)** | Audio recording and transcription are used to construct encounter context for assistance |
| **Ghost Text + Tab Completion** | Low-contrast inline preview suggestions that physicians can explicitly accept with Tab |
| **Underline Feedback** | Inline visual cues for terminology normalization and evidence-grounded compliance review |
| **AI Dialogue Sidebar (On-demand)** | Physician-invoked advisory dialogue that does not auto-insert content |

### Medical Record Modules (Implementation)

The open-source prototype implements module-specific assistance for common outpatient record sections (e.g., chief complaint, present illness, diagnosis, and treatment). Exact triggering rules and module prompts should be treated as implementation details and may evolve.

---

## Technology Stack

- **Frontend**: Chrome Extension (Manifest V3), vanilla JavaScript
- **Backend**: Python 3.10+, FastAPI, WebSocket
- **ASR**: SenseVoice (FunASR) with streaming support
- **LLM**: OpenAI-compatible API (GPT-4o or equivalent)
- **Embedding**: (optional) see Future Work

---

## Examples

The main interaction flow is illustrated in the paper figures.

- **Ghost text preview** appears inline as low-contrast text.
- Physicians explicitly **press Tab to accept**; ignored suggestions disappear without affecting the draft.
- **Underline feedback** highlights spans for terminology normalization and prompts review for evidence-grounded traceability.
- The **right-side dialogue sidebar** provides advisory help only when invoked.

### Inline Compliance Markers

ClinDoc Copilot provides underline cues to support:

- **Terminology normalization** (e.g., highlighting colloquial spans for revision)
- **Evidence-grounded compliance review** (prompting review when diagnoses or treatment orders appear insufficiently supported by prior documentation)

![Overview of the ClinDoc Copilot Workflow](assets/main.png)
*Figure 3. Overview of the ClinDoc Copilot Workflow. Black text represents content entered by the physician, while gray text indicates suggested completions provided by ClinDoc Copilot. For readers’ convenience, the illustration is in English.*

---


## Quick Start

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

---

## Acknowledgments

- [FunASR](https://github.com/alibaba-damo-academy/FunASR) for the SenseVoice ASR model
- [LangChain](https://github.com/langchain-ai/langchain) for LLM orchestration utilities

---

**Note**: This is an active research project. APIs and interfaces may change without notice.
