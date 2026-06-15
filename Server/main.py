from fastapi import FastAPI, WebSocket, WebSocketDisconnect, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from file_manager import file_metadata, file_contents, load_file
from filter_engine import apply_filters
from tail_manager import start_tail, get_tail_updates, stop_tail, tail_sessions
from sequence_engine import create_pattern, find_sequences, sequences
from file_browser import browse_files, get_file_type_settings, update_file_type_settings, validate_file_path, get_default_log_directory, FileBrowserRequest
from pydantic import BaseModel
from typing import Dict, Any
import json
import asyncio
import subprocess
import uvicorn

SYSTEMD_SERVICE_NAME = "clogg7-backend"

async def _run_systemctl(action: str):
    # Give the websocket response time to reach the client before the
    # process is stopped/restarted by systemd.
    await asyncio.sleep(0.5)
    subprocess.Popen(["sudo", "systemctl", action, SYSTEMD_SERVICE_NAME])

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.websocket("/api/ws")
async def websocket_handler(ws: WebSocket):
    await ws.accept()
    try:
        while True:
            msg = await ws.receive_text()
            try:
                data = json.loads(msg)
                msg_type = data.get("type")

                # FILE LOAD
                if msg_type == "load_file":
                    resp = await load_file_from_ws(data)
                    resp["type"] = "load_file_result"
                    await ws.send_json(resp)

                # FILE CONTENT
                elif msg_type == "get_content":
                    resp = await get_content_from_ws(data)
                    resp["type"] = "get_content_result"
                    await ws.send_json(resp)

                # FILTER
                elif msg_type == "filter":
                    from filter_engine import FilterRequest
                    req = FilterRequest(
                        panelId=data.get("panelId", "left"),
                        filters=data.get("filters", []),
                        expression=data.get("expression"),
                        options=data.get("options", {})
                    )
                    resp = await apply_filters(data["fileId"], req)
                    resp["type"] = "filter_result"
                    await ws.send_json(resp)

                # TAIL
                elif msg_type == "tail_start":
                    resp = await start_tail(data["fileId"], data)
                    resp["type"] = "tail_start_result"
                    await ws.send_json(resp)
                elif msg_type == "tail_poll":
                    resp = await get_tail_updates(data["fileId"], data["tailId"])
                    resp["type"] = "tail_update"
                    await ws.send_json(resp)
                elif msg_type == "tail_stop":
                    resp = await stop_tail(data["fileId"], data["tailId"])
                    resp["type"] = "tail_stop_result"
                    await ws.send_json(resp)

                # SEQUENCES
                elif msg_type == "create_sequence":
                    class Req(BaseModel): pattern: Any; panelId: str
                    req = Req(**data)
                    resp = await create_pattern(req)
                    resp["type"] = "create_sequence_result"
                    await ws.send_json(resp)
                elif msg_type == "find_sequence":
                    class Req(BaseModel): patternId: str; panelId: str; searchOptions: Any = {}; filters: Any = []
                    req = Req(**data)
                    resp = await find_sequences(data["fileId"], req)
                    resp["type"] = "find_sequence_result"
                    await ws.send_json(resp)

                # FILE BROWSING
                elif msg_type == "browse_files":
                    req = FileBrowserRequest(**data)
                    resp = await browse_files(req)
                    resp_dict = resp.dict()
                    resp_dict["type"] = "browse_files_result"
                    if data.get("requestId"):
                        resp_dict["requestId"] = data["requestId"]
                    await ws.send_json(resp_dict)
                
                elif msg_type == "get_file_types":
                    resp = await get_file_type_settings()
                    resp["type"] = "get_file_types_result"
                    if data.get("requestId"):
                        resp["requestId"] = data["requestId"]
                    await ws.send_json(resp)
                
                elif msg_type == "update_file_types":
                    extensions = data.get("extensions", [])
                    resp = await update_file_type_settings(extensions)
                    resp["type"] = "update_file_types_result"
                    if data.get("requestId"):
                        resp["requestId"] = data["requestId"]
                    await ws.send_json(resp)
                
                elif msg_type == "get_default_path":
                    resp = {"type": "get_default_path_result", "success": True, "path": get_default_log_directory()}
                    if data.get("requestId"):
                        resp["requestId"] = data["requestId"]
                    await ws.send_json(resp)

                elif msg_type == "validate_file":
                    file_path = data.get("filePath", "")
                    resp = await validate_file_path(file_path)
                    resp["type"] = "validate_file_result"
                    if data.get("requestId"):
                        resp["requestId"] = data["requestId"]
                    await ws.send_json(resp)

                # SERVER CONTROL
                elif msg_type == "server_control":
                    action = data.get("action")
                    if action in ("stop", "restart"):
                        resp = {"type": "server_control_result", "success": True, "action": action}
                        if data.get("requestId"):
                            resp["requestId"] = data["requestId"]
                        await ws.send_json(resp)
                        asyncio.create_task(_run_systemctl(action))
                    else:
                        resp = {"type": "error", "message": f"Unknown server_control action: {action}"}
                        if data.get("requestId"):
                            resp["requestId"] = data["requestId"]
                        await ws.send_json(resp)

                # HEALTH CHECK
                elif msg_type == "ping":
                    import time
                    resp = {"type": "pong", "timestamp": data.get("timestamp"), "server_time": int(time.time() * 1000)}
                    if data.get("requestId"):
                        resp["requestId"] = data["requestId"]
                    await ws.send_json(resp)

                else:
                    await ws.send_json({"type": "error", "message": f"Unknown command type: {msg_type}"})

            except Exception as e:
                await ws.send_json({"type": "error", "message": str(e)})

    except WebSocketDisconnect:
        pass

# WRAPPERS FOR REST-LIKE HANDLERS TO WORK WITH RAW DICT
class FileLoadRequest(BaseModel):
    panelId: str
    filePath: str
    options: Dict[str, Any] = {}

async def load_file_from_ws(data):
    req = FileLoadRequest(**data)
    return await load_file(req)

class ContentRequest(BaseModel):
    fileId: str
    startLine: int = 1
    endLine: int = None
    maxLines: int = None

async def get_content_from_ws(data):
    from file_manager import get_content
    req = ContentRequest(**data)
    return await get_content(req.fileId, req.startLine, req.endLine, req.maxLines)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8847, reload=False)
