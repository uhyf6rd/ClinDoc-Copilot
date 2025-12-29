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

## Evaluation

This section documents the evaluation **design and metrics only** (no results).

We evaluate ClinDoc Copilot in realistic simulated outpatient documentation scenarios. The evaluation addresses three research questions:

- Whether ClinDoc Copilot improves documentation efficiency.
- Whether it improves documentation quality and evidence-grounded traceability without introducing hallucination risks.
- Whether clinicians perceive the system as usable and suitable for real clinical practice.

### Experimental Setup

- **Participants**: 24 total, including 12 licensed outpatient physicians and 12 clinical trainees. Participants covered two clinical systems: Western medicine (WM) and traditional Chinese medicine (TCM).
- **Tasks and scenarios**: 20 de-identified real clinical cases (10 WM + 10 TCM) adapted into realistic simulated outpatient encounters. A trained actor played the patient following a standardized script.
- **Conditions**: Within-participant comparison between **Copilot** (ClinDoc Copilot enabled) and **Baseline** (same interface without Copilot assistance).
- **Ethics**: Informed consent was obtained. Audio recordings were collected for simulated scenarios and did not involve real patient care.

### Evaluation Metrics

**Efficiency metrics** (averaged per medical record):

- **Time ($\downarrow$)**: average time to complete one outpatient record.
- **Keys ($\downarrow$)**: average number of keyboard inputs per record.
- **Edit ($\downarrow$)**: ghost text edit rate, defined as the proportion of tab-accepted ghost text suggestions that were subsequently modified.

**Quality and safety metrics** (rubric-based):

- **TN ($\uparrow$)**: Terminology Normalization.
- **TR ($\uparrow$)**: Evidence-Grounded Traceability of diagnoses and treatment orders.
- **SH ($\uparrow$)**: Safety and Hallucination level (higher indicates fewer hallucination issues).

All quality metrics are scored on a five-point scale by two senior physicians in a double-blind manner.

### User Study (Questionnaire)

After completing the documentation tasks, participants complete a post-study questionnaire and brief semi-structured interview. The questionnaire assesses four dimensions (five-point Likert scale):

- **EFF**: efficiency improvement through text auto-completion and AI dialogue.
- **QUAL**: documentation quality and standardization (e.g., terminology normalization).
- **TRUST**: trustworthiness of system assistance grounded in encounter context.
- **ADOPT**: willingness to adopt the system in real outpatient practice.

---

## Future Work

The current open-source prototype does not use retrieval-augmented generation (RAG). Future work may explore adding optional retrieval and embedding-based components (e.g., for template/knowledge access) while preserving physician control and accountability.

---

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
@inproceedings{clindoc_copilot,
  title = {ClinDoc Copilot: Enhancing Efficiency and Clinical Expression Normalization in Chinese Outpatient Settings},
  author = {Dingfeng Jiang and Zhiyang Han and Yi Zhang and Qingying Xiao and Siqi Wu and Yangyang Liu and Zhanchen Dai and Han Yan and Shouwang Dai and Yuzhong Yan and Jianquan Li and Xiang Li and Jiale Han and Fan Bu and Benyou Wang},
  booktitle = {TODO},
  year = {TODO},
  publisher = {TODO},
  address = {TODO},
  doi = {TODO}
}
```

## Related Work

Please refer to the paper for the related-work discussion.

---

## License

This project is licensed under the [MIT License](LICENSE).

---

## Acknowledgments

- [FunASR](https://github.com/alibaba-damo-academy/FunASR) for the SenseVoice ASR model
- [LangChain](https://github.com/langchain-ai/langchain) for LLM orchestration utilities

---

**Note**: This is an active research project. APIs and interfaces may change without notice.
