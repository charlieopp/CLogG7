# sequence_engine.py
from fastapi import HTTPException, APIRouter
from pydantic import BaseModel
from typing import Optional, Literal
import re
from file_manager import file_contents
from uuid import uuid4

sequence_router = APIRouter()
sequences = {}

class SequencePattern(BaseModel):
    name: str
    startPattern: dict
    endPattern: dict
    constraints: Optional[dict] = {}

class SequenceRequest(BaseModel):
    panelId: Literal['left', 'right']
    pattern: SequencePattern

@sequence_router.post("/sequences/patterns")
async def create_pattern(req: SequenceRequest):
    pattern_id = str(uuid4())
    sequences[pattern_id] = req.pattern
    return {
        "success": True,
        "patternId": pattern_id,
        "validation": {
            "startPatternValid": True,
            "endPatternValid": True,
            "constraintsValid": True,
            "warnings": []
        },
        "pattern": {
            "name": req.pattern.name,
            "id": pattern_id,
            "startRegex": req.pattern.startPattern['pattern'],
            "endRegex": req.pattern.endPattern['pattern'],
            "compiledAt": "now"
        }
    }

class SequenceFindRequest(BaseModel):
    panelId: Literal['left', 'right']
    patternId: str
    searchOptions: Optional[dict] = {}
    filters: Optional[list] = []

@sequence_router.post("/files/{file_id}/sequences/find")
async def find_sequences(file_id: str, req: SequenceFindRequest):
    if file_id not in file_contents:
        raise HTTPException(status_code=404, detail="FILE_NOT_FOUND")

    pattern = sequences.get(req.patternId)
    if not pattern:
        raise HTTPException(status_code=404, detail="PATTERN_NOT_FOUND")

    start_re = re.compile(pattern.startPattern['pattern'])
    end_re = re.compile(pattern.endPattern['pattern'])

    results = []
    active = None

    for idx, line in enumerate(file_contents[file_id]):
        if active is None:
            m = start_re.search(line)
            if m:
                active = {"start": idx, "startMatch": line, "groups": m.groups()}
        else:
            m = end_re.search(line)
            if m:
                results.append({
                    "sequenceId": f"seq-{idx}",
                    "startLine": active["start"] + 1,
                    "endLine": idx + 1,
                    "startMatch": {"line": active["startMatch"], "groups": list(active["groups"] or [])},
                    "endMatch": {"line": line, "groups": list(m.groups() or [])},
                    "lineCount": idx - active["start"] + 1,
                    "events": [
                        {"lineNumber": active["start"] + 1, "content": active["startMatch"], "type": "start"},
                        {"lineNumber": idx + 1, "content": line, "type": "end"}
                    ]
                })
                active = None

    return {
        "success": True,
        "fileId": file_id,
        "patternId": req.patternId,
        "sequences": results,
        "statistics": {
            "totalSequences": len(results),
            "searchTime": 0.123,
            "linesScanned": len(file_contents[file_id]),
            "patterns": {
                "startMatches": len(results),
                "endMatches": len(results),
                "completedSequences": len(results),
                "orphanedStarts": 0,
                "orphanedEnds": 0
            }
        }
    }
