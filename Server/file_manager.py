# file_manager.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from uuid import uuid4
from typing import Optional, Literal
import os
from datetime import datetime

file_manager_router = APIRouter()

class FileLoadRequest(BaseModel):
    panelId: Literal['left', 'right']
    filePath: str
    options: Optional[dict] = {}

files = {}
file_contents = {}
file_metadata = {}
file_index = {}

@file_manager_router.post("/load")
async def load_file(req: FileLoadRequest):
    if not os.path.isfile(req.filePath):
        raise HTTPException(status_code=404, detail=f"File not found: {req.filePath}")

    try:
        encoding = req.options.get("encoding", "utf-8")
        tailLines = req.options.get("tailLines", None)
        with open(req.filePath, encoding=encoding) as f:
            lines = f.readlines()
        file_id = str(uuid4())
        content = lines[-tailLines:] if tailLines else lines
        file_contents[file_id] = content
        file_metadata[file_id] = {
            "filePath": req.filePath,
            "fileName": os.path.basename(req.filePath),
            "fileSize": os.path.getsize(req.filePath),
            "lineCount": len(lines),
            "lastModified": datetime.utcfromtimestamp(os.path.getmtime(req.filePath)).isoformat(),
            "encoding": encoding
        }
        return {"success": True, "panelId": req.panelId, "fileId": file_id, "metadata": file_metadata[file_id]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@file_manager_router.get("/{file_id}/content")
async def get_content(file_id: str, startLine: int = 1, endLine: Optional[int] = None, maxLines: Optional[int] = None):
    if file_id not in file_contents:
        raise HTTPException(status_code=404, detail="FILE_NOT_FOUND")

    lines = file_contents[file_id]
    total = len(lines)
    start = max(startLine - 1, 0)
    end = min(endLine, total) if endLine else total
    slice_ = lines[start:end]
    if maxLines:
        slice_ = slice_[:maxLines]

    return {
        "success": True,
        "fileId": file_id,
        "metadata": file_metadata[file_id],
        "content": {
            "lines": slice_,
            "totalLines": total,
            "range": {"start": start + 1, "end": start + len(slice_)},
            "truncated": len(slice_) < (end - start)
        }
    }
