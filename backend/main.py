from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from backend.api import records, chat, audio, agent, terminology
import logging
import os

app = FastAPI(title="Med Copilot Backend")

class EndpointLogFilter(logging.Filter):
    def __init__(self):
        super().__init__()
        self.status_counts = 0
        self.transcribe_counts = 0
        self.draft_counts = 0

    def filter(self, record: logging.LogRecord) -> bool:
        log_msg = record.getMessage()

        if "/api/status" in log_msg:
            self.status_counts += 1
            return self.status_counts % 5 == 1 

        if "/api/audio/transcribe" in log_msg:
            self.transcribe_counts += 1
            return self.transcribe_counts % 10 == 1 

        if "/api/agent/draft" in log_msg:
            self.draft_counts += 1
            return self.draft_counts % 10 == 1 
        return True

import subprocess
import sys

agent_process = None

@app.on_event("startup")
async def startup_event():

    logger = logging.getLogger("uvicorn.access")
    logger.addFilter(EndpointLogFilter())

    global agent_process
    try:

        print("Starting Agent Service subprocess (module: backend.agent_service)...")
        agent_process = subprocess.Popen([sys.executable, "-m", "backend.agent_service"])
    except Exception as e:
        print(f"Failed to start Agent Service: {e}")

@app.on_event("shutdown")
async def shutdown_event():
    global agent_process
    if agent_process:
        print("Terminating Agent Service subprocess...")
        agent_process.terminate()
        agent_process.wait()

origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(records.router, prefix="/api/records", tags=["records"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(audio.router, prefix="/api/audio", tags=["audio"])
app.include_router(terminology.router, prefix="/api", tags=["terminology"])

@app.get("/api/status")
def health_check():
    return {"status": "ok"}

frontend_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")
if not os.path.exists(frontend_path):
    os.makedirs(frontend_path)

app.mount("/static", StaticFiles(directory=frontend_path), name="static")

@app.get("/")
def read_root():
    return FileResponse(os.path.join(frontend_path, "index.html"))

