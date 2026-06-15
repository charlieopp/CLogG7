# tail_manager.py
from fastapi import HTTPException, APIRouter
from pydantic import BaseModel
from typing import Literal
from file_manager import file_contents
import uuid


tail_router = APIRouter()
tail_sessions = {}

class TailStartRequest(BaseModel):
    panelId: Literal['left', 'right']

@tail_router.post("/{file_id}/tail/start")
async def start_tail(file_id: str, req: TailStartRequest):
    if file_id not in file_contents:
        raise HTTPException(status_code=404, detail="FILE_NOT_FOUND")
    tail_id = str(uuid.uuid4())
    tail_sessions[tail_id] = {
        "file_id": file_id,
        "panelId": req.panelId,
        "lastLine": len(file_contents[file_id])
    }
    return {
        "success": True,
        "fileId": file_id,
        "panelId": req.panelId,
        "tailId": tail_id,
        "filteredContent": {
            "lines": [],
            "statistics": {
                "totalLines": len(file_contents[file_id]),
                "filteredLines": 0,
                "filterMatches": {}
            },
            "processingTime": 0.001
        }
    }

@tail_router.get("/{file_id}/tail/{tail_id}/updates")
async def get_tail_updates(file_id: str, tail_id: str):
    if tail_id not in tail_sessions:
        raise HTTPException(status_code=404, detail="TAIL_SESSION_NOT_FOUND")

    session = tail_sessions[tail_id]
    last_index = session["lastLine"]
    content = file_contents[file_id]
    new_lines = content[last_index:]
    session["lastLine"] = len(content)

    return {
        "success": True,
        "fileId": file_id,
        "tailId": tail_id,
        "panelId": session["panelId"],
        "lines": new_lines
    }

@tail_router.delete("/{file_id}/tail/{tail_id}")
async def stop_tail(file_id: str, tail_id: str):
    if tail_id in tail_sessions:
        del tail_sessions[tail_id]
    return {
        "success": True,
        "tailId": tail_id,
        "stopped": True
    }
