from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from backend.api import records, chat, audio, agent, terminology
import logging
import os

app = FastAPI(title="Med Copilot Backend")

# Log Suppression Filter
class EndpointLogFilter(logging.Filter):
    def __init__(self):
        super().__init__()
        self.status_counts = 0
        self.transcribe_counts = 0
        self.draft_counts = 0

    def filter(self, record: logging.LogRecord) -> bool:
        # Pass log message to string for checking
        log_msg = record.getMessage()
        
        # Check /api/status (Reduce to 1 in 5)
        if "/api/status" in log_msg:
            self.status_counts += 1
            return self.status_counts % 5 == 1 # Log the 1st, 6th, 11th...

        # Check /api/audio/transcribe (Reduce to 1 in 10)
        if "/api/audio/transcribe" in log_msg:
            self.transcribe_counts += 1
            return self.transcribe_counts % 10 == 1 # Log the 1st, 11th...
        
        # Check /api/agent/draft (Reduce to 1 in 10)
        if "/api/agent/draft" in log_msg:
            self.draft_counts += 1
            return self.draft_counts % 10 == 1 # Log the 1st, 11th...
            
        return True

# Apply Filter on Startup
# Apply Filter and Start Agent Service on Startup
import subprocess
import sys

agent_process = None

@app.on_event("startup")
async def startup_event():
    # 1. Logger Filter
    logger = logging.getLogger("uvicorn.access")
    logger.addFilter(EndpointLogFilter())
    
    # 2. Start Agent Service (Port 8001)
    global agent_process
    try:
        # Use sys.executable to ensure we use the same python environment
        # Run as module (-m) to resolve imports correctly (project root as sys.path)
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

# CORS Setup
origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(records.router, prefix="/api/records", tags=["records"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(audio.router, prefix="/api/audio", tags=["audio"])
app.include_router(terminology.router, prefix="/api", tags=["terminology"])
# Agent Router removed - moved to independent service on Port 8001

@app.get("/api/status")
def health_check():
    return {"status": "ok"}

# Serve Static Files (Frontend)
# We mount the frontend directory to serve assets
frontend_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")
if not os.path.exists(frontend_path):
    os.makedirs(frontend_path)

app.mount("/static", StaticFiles(directory=frontend_path), name="static")

@app.get("/")
def read_root():
    # Return the index.html
    return FileResponse(os.path.join(frontend_path, "index.html"))

