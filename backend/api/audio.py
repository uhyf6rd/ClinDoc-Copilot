from fastapi import APIRouter, UploadFile, File, HTTPException, WebSocket, WebSocketDisconnect
from funasr import AutoModel
import os
import shutil
import tempfile
import uuid
import time
import re
import subprocess

router = APIRouter()

print("Loading SenseVoiceSmall model...")
try:
    asr_model = AutoModel(
        model="iic/SenseVoiceSmall",
        device="cpu",
        disable_update=True
    )
    print("SenseVoiceSmall model loaded successfully.")
except Exception as e:
    print(f"Error loading model: {e}")
    asr_model = None

def get_model():
    return asr_model

def process_audio_file(temp_path: str, filename_for_ext: str):
    model = get_model()
    if not model:
         return {"text": ""}

    processing_path = temp_path

    start_time = time.time()
    try:
        res = model.generate([processing_path], language="zh", use_itn=True, disable_pbar=True)
    except Exception as e:
        print(f"Inference Error: {e}")
        return {"text": ""}
    
    end_time = time.time()
    duration = end_time - start_time

    if os.path.exists(temp_path):
        try: os.remove(temp_path)
        except: pass

    if res and len(res) > 0:
        raw_text = res[0].get("text", "")
        clean_text = re.sub(r'<\|.*?\|>', '', raw_text).strip()
        
        return {"text": clean_text}
    else:
        return {"text": ""}


import asyncio

@router.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    temp_dir = tempfile.gettempdir()
    temp_filename = f"rec_{uuid.uuid4()}{os.path.splitext(file.filename)[1]}"
    temp_path = os.path.join(temp_dir, temp_filename)
    
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, process_audio_file, temp_path, temp_filename)


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    temp_dir = tempfile.gettempdir()
    
    try:
        while True:
            message = await websocket.receive()
            
            if "bytes" in message and message["bytes"]:
                data = message["bytes"]
                if len(data) == 0: continue

                temp_filename = f"ws_{uuid.uuid4()}.webm"
                temp_path = os.path.join(temp_dir, temp_filename)
                with open(temp_path, "wb") as f:
                    f.write(data)
                
                loop = asyncio.get_running_loop()
                result = await loop.run_in_executor(None, process_audio_file, temp_path, temp_filename)

                await websocket.send_json(result)
            
            elif "text" in message and message["text"]:

                if message["text"] == "ping":
                    continue
            
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"WebSocket Error: {e}")

