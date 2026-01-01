from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.api import agent

app = FastAPI(title="Med Copilot Agent Service (Port 8001)")

# CORS Setup
origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include ONLY Agent Router
app.include_router(agent.router, prefix="/api/agent", tags=["agent"])

@app.get("/api/status")
def health_check():
    return {"status": "agent_service_ok"}

if __name__ == "__main__":
    import uvicorn
    # Run on Port 8001
    uvicorn.run(app, host="0.0.0.0", port=8001)
